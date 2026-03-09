/**
 * Duplicate Detector Service
 *
 * Three-layer duplicate detection for exhibit files:
 * Layer 1: SHA-256 hash comparison (instant, exact matches)
 * Layer 2: Visual similarity via sharp thumbnails (fast, visual matches)
 * Layer 3: OCR text comparison via tesseract.js (selective, content matches)
 *
 * @module services/duplicate-detector
 */

const crypto = require('crypto');
const sharp = require('sharp');
const logger = require('../monitoring/logger');

const THUMB_SIZE = 64;
const VISUAL_MATCH_THRESHOLD = 0.95;
const VISUAL_MAYBE_LOW = 0.80;
const OCR_MATCH_THRESHOLD = 0.80;

class DuplicateDetector {
    /**
     * Compute SHA-256 hash of a buffer.
     * @param {Buffer} buffer - File contents
     * @returns {string} Hex-encoded SHA-256 hash
     */
    static hashFile(buffer) {
        return crypto.createHash('sha256').update(buffer).digest('hex');
    }

    /**
     * Find exact duplicates by comparing SHA-256 hashes.
     * @param {Array<{name: string, buffer: Buffer}>} files
     * @returns {Array<Object>} Array of duplicate match objects
     */
    static findExactDuplicates(files) {
        const hashMap = new Map();
        const duplicates = [];

        for (const file of files) {
            const hash = DuplicateDetector.hashFile(file.buffer);
            if (hashMap.has(hash)) {
                duplicates.push({
                    file1: hashMap.get(hash).name,
                    file2: file.name,
                    matchType: 'EXACT_DUPLICATE',
                    confidence: 100,
                    layer: 1,
                    details: 'Identical file content (SHA-256 match)',
                });
            } else {
                hashMap.set(hash, file);
            }
        }

        return duplicates;
    }

    /**
     * Compute visual similarity between two image buffers.
     * Resizes both to 64x64 grayscale thumbnails and compares pixel values.
     * @param {Buffer} buffer1 - First image buffer
     * @param {Buffer} buffer2 - Second image buffer
     * @returns {Promise<number>} Similarity score between 0.0 and 1.0
     */
    static async computeVisualSimilarity(buffer1, buffer2) {
        const toThumb = async (buf) => {
            return sharp(buf)
                .resize(THUMB_SIZE, THUMB_SIZE, { fit: 'fill' })
                .grayscale()
                .raw()
                .toBuffer();
        };

        const [thumb1, thumb2] = await Promise.all([toThumb(buffer1), toThumb(buffer2)]);

        let totalDiff = 0;
        const pixelCount = thumb1.length;
        for (let i = 0; i < pixelCount; i++) {
            totalDiff += Math.abs(thumb1[i] - thumb2[i]);
        }

        return 1.0 - (totalDiff / pixelCount / 255);
    }

    /**
     * Find visual matches among files using thumbnail comparison.
     * @param {Array<{name: string, buffer: Buffer}>} files
     * @param {Set<string>} alreadyMatchedPairs - Pair keys to skip
     * @param {Function} [onPairProgress] - Optional callback (pairNum, totalPairs)
     * @returns {Promise<{matches: Array<Object>, maybePairs: Array<Object>}>}
     */
    static async findVisualMatches(files, alreadyMatchedPairs = new Set(), onPairProgress) {
        const matches = [];
        const maybePairs = [];
        const IMAGE_TYPES_SET = new Set(['png', 'jpg', 'jpeg', 'tiff', 'heic']);
        const { processWithConcurrency } = require('../utils/concurrency');

        // Collect all eligible pairs
        const pairs = [];
        for (let i = 0; i < files.length; i++) {
            for (let j = i + 1; j < files.length; j++) {
                const pairKey = `${files[i].name}|${files[j].name}`;
                if (alreadyMatchedPairs.has(pairKey)) continue;
                if (!IMAGE_TYPES_SET.has(files[i].type) || !IMAGE_TYPES_SET.has(files[j].type)) continue;
                pairs.push({ i, j });
            }
        }

        const totalPairs = pairs.length;
        let completedPairs = 0;

        await processWithConcurrency(pairs, async (pair) => {
            const { i, j } = pair;
            completedPairs++;
            if (onPairProgress && totalPairs > 0) {
                onPairProgress(completedPairs, totalPairs);
            }

            try {
                const similarity = await DuplicateDetector.computeVisualSimilarity(
                    files[i].buffer, files[j].buffer
                );

                if (similarity >= VISUAL_MATCH_THRESHOLD) {
                    matches.push({
                        file1: files[i].name,
                        file2: files[j].name,
                        matchType: 'VISUAL_MATCH',
                        confidence: Math.round(similarity * 100),
                        layer: 2,
                        details: `Visual similarity: ${Math.round(similarity * 100)}%`,
                    });
                } else if (similarity >= VISUAL_MAYBE_LOW) {
                    maybePairs.push({ file1Index: i, file2Index: j, similarity });
                }
            } catch (err) {
                logger.warn(`Visual comparison failed for ${files[i].name} vs ${files[j].name}: ${err.message}`);
            }
        }, 4);

        return { matches, maybePairs };
    }

    /**
     * Find content matches using OCR text comparison for "maybe" pairs.
     * @param {Array<{name: string, buffer: Buffer}>} files
     * @param {Array<Object>} maybePairs - Pairs from visual layer needing deeper check
     * @param {Function} [onPairProgress] - Optional callback (pairNum, totalPairs)
     * @returns {Promise<Array<Object>>} Array of content match objects
     */
    static async findContentMatches(files, maybePairs, onPairProgress) {
        if (maybePairs.length === 0) return [];

        const Tesseract = require('tesseract.js');
        const { processWithConcurrency } = require('../utils/concurrency');
        const matches = [];
        let completedPairs = 0;

        await processWithConcurrency(maybePairs, async (pair) => {
            completedPairs++;
            if (onPairProgress) {
                onPairProgress(completedPairs, maybePairs.length);
            }

            try {
                const [result1, result2] = await Promise.all([
                    Tesseract.recognize(files[pair.file1Index].buffer),
                    Tesseract.recognize(files[pair.file2Index].buffer),
                ]);

                const similarity = DuplicateDetector.jaccardSimilarity(result1.data.text, result2.data.text);

                if (similarity >= OCR_MATCH_THRESHOLD) {
                    matches.push({
                        file1: files[pair.file1Index].name,
                        file2: files[pair.file2Index].name,
                        matchType: 'CONTENT_MATCH',
                        confidence: Math.round(similarity * 100),
                        layer: 3,
                        details: `OCR text similarity: ${Math.round(similarity * 100)}%`,
                    });
                }
            } catch (err) {
                logger.warn(`OCR comparison failed for pair: ${err.message}`);
            }
        }, 2);

        return matches;
    }

    /**
     * Compute Jaccard similarity between two text strings.
     * Splits on whitespace and compares word sets.
     * @param {string} text1
     * @param {string} text2
     * @returns {number} Similarity score between 0.0 and 1.0
     */
    static jaccardSimilarity(text1, text2) {
        const words1 = new Set(text1.toLowerCase().split(/\s+/).filter(w => w.length > 0));
        const words2 = new Set(text2.toLowerCase().split(/\s+/).filter(w => w.length > 0));

        if (words1.size === 0 && words2.size === 0) return 1.0;
        if (words1.size === 0 || words2.size === 0) return 0.0;

        let intersection = 0;
        for (const word of words1) {
            if (words2.has(word)) intersection++;
        }

        const union = words1.size + words2.size - intersection;
        return union === 0 ? 0 : intersection / union;
    }

    /**
     * Run the full three-layer duplicate detection pipeline.
     *
     * Layer 1: Exact hash comparison (~0-10% of dup phase)
     * Layer 2: Visual similarity via thumbnails (~10-70% of dup phase)
     * Layer 3: OCR text comparison for "maybe" zone pairs (~70-100% of dup phase)
     *
     * @param {Array<{name: string, buffer: Buffer, type: string}>} files
     * @param {Function} [onProgress] - Optional callback (subPercent, message) where subPercent is 0-100
     * @returns {Promise<{duplicates: Array<Object>}>}
     */
    static async detectDuplicates(files, onProgress) {
        if (files.length < 2) return { duplicates: [] };

        const allDuplicates = [];
        const progressFn = onProgress || (() => {});

        // Layer 1: Exact hash matching (~0-10% of dup phase)
        progressFn(0, `Checking exact hashes: ${files.length} files`);
        const exactDupes = DuplicateDetector.findExactDuplicates(files);
        allDuplicates.push(...exactDupes);
        progressFn(10, `Hash check complete: ${exactDupes.length} exact match(es)`);

        const matchedPairs = new Set(exactDupes.map(d => `${d.file1}|${d.file2}`));

        // Layer 2: Visual similarity (~10-70% of dup phase)
        const { matches: visualMatches, maybePairs } = await DuplicateDetector.findVisualMatches(
            files,
            matchedPairs,
            (pairNum, totalPairs) => {
                const subPct = 10 + Math.round((pairNum / totalPairs) * 60);
                progressFn(subPct, `Visual comparison: pair ${pairNum} of ${totalPairs}`);
            }
        );
        allDuplicates.push(...visualMatches);
        progressFn(70, `Visual check complete: ${visualMatches.length} match(es)`);

        // Layer 3: OCR text comparison (~70-100% of dup phase)
        if (maybePairs.length > 0) {
            const contentMatches = await DuplicateDetector.findContentMatches(
                files,
                maybePairs,
                (pairNum, totalPairs) => {
                    const subPct = 70 + Math.round((pairNum / totalPairs) * 30);
                    progressFn(subPct, `OCR analysis: pair ${pairNum} of ${maybePairs.length}`);
                }
            );
            allDuplicates.push(...contentMatches);
        }
        progressFn(100, `Duplicate scan complete: ${allDuplicates.length} total match(es)`);

        return { duplicates: allDuplicates };
    }
}

module.exports = DuplicateDetector;
