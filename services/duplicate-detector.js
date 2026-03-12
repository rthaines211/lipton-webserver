/**
 * Duplicate Detector Service
 *
 * Two-layer duplicate detection for exhibit files:
 * Layer 1: SHA-256 hash comparison (instant, exact matches)
 * Layer 2: Visual similarity via dHash pre-filter + pixel comparison (images and PDF pages)
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
const MAX_CANDIDATE_PAIRS = 500;

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
     * Compute a 64-bit difference hash (dHash) for an image.
     * Resizes to 9x8 grayscale, compares adjacent pixels horizontally.
     * @param {Buffer} buffer - Image file contents
     * @returns {Promise<BigInt|null>} 64-bit hash as BigInt, or null on failure
     */
    static async computeDHash(buffer) {
        try {
            const { data } = await sharp(buffer)
                .resize(9, 8, { fit: 'fill' })
                .grayscale()
                .raw()
                .toBuffer({ resolveWithObject: true });

            let hash = 0n;
            for (let row = 0; row < 8; row++) {
                for (let col = 0; col < 8; col++) {
                    const left = data[row * 9 + col];
                    const right = data[row * 9 + col + 1];
                    if (left > right) {
                        hash |= 1n << BigInt(row * 8 + col);
                    }
                }
            }
            return hash;
        } catch (err) {
            logger.warn(`dHash computation failed: ${err.message}`);
            return null;
        }
    }

    /**
     * Compute hamming distance between two 64-bit dHash values.
     * @param {BigInt} hash1
     * @param {BigInt} hash2
     * @returns {number} Number of differing bits (0-64)
     */
    static hammingDistance(hash1, hash2) {
        let xor = hash1 ^ hash2;
        let count = 0;
        while (xor) {
            count++;
            xor &= xor - 1n;
        }
        return count;
    }

    /**
     * Render all pages of a PDF to PNG buffers via MuPDF WASM.
     * @param {Buffer} buffer - PDF file contents
     * @returns {Promise<Array<{pageNum: number, buffer: Buffer}>>} PNG buffers per page, or empty array on failure
     */
    static async renderPdfPages(buffer) {
        try {
            const mupdf = await import('mupdf');
            const doc = mupdf.default.Document.openDocument(buffer, 'application/pdf');
            const pageCount = doc.countPages();
            const pages = [];

            for (let i = 0; i < pageCount; i++) {
                try {
                    const page = doc.loadPage(i);
                    const pixmap = page.toPixmap(
                        [0.5, 0, 0, 0.5, 0, 0],
                        mupdf.default.ColorSpace.DeviceRGB,
                        false,
                        true
                    );
                    const pngBuffer = Buffer.from(pixmap.asPNG());
                    pages.push({ pageNum: i + 1, buffer: pngBuffer });
                } catch (pageErr) {
                    logger.warn(`PDF page ${i + 1} render failed: ${pageErr.message}`);
                }
            }

            return pages;
        } catch (err) {
            logger.warn(`PDF render failed: ${err.message}`);
            return [];
        }
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
     * Supports both images and PDF pages via two-pass memory strategy.
     * @param {Array<{name: string, buffer: Buffer, type: string}>} files
     * @param {Set<string>} alreadyMatchedPairs - Pair keys to skip
     * @param {Function} [onPairProgress] - Optional callback (pairNum, totalPairs)
     * @param {Function} [onRenderProgress] - Optional callback (fileNum, totalFiles)
     * @returns {Promise<{matches: Array<Object>, likelyMatches: Array<Object>}>}
     */
    static async findVisualMatches(files, alreadyMatchedPairs = new Set(), onPairProgress, onRenderProgress) {
        const matches = [];
        const likelyMatches = [];
        const IMAGE_TYPES_SET = new Set(['png', 'jpg', 'jpeg', 'tiff', 'heic']);
        const PDF_TYPES_SET = new Set(['pdf']);
        const { processWithConcurrency } = require('../utils/concurrency');
        const HAMMING_THRESHOLD = 15;

        // --- Pass 1: Expand files to visual entries and compute dHash ---
        // Each entry: { sourceIndex, page, hash }
        // sourceIndex = index in original files array, page = null for images or 1-based for PDFs
        const visualEntries = [];
        let renderedFiles = 0;
        const totalFilesToRender = files.length;

        await processWithConcurrency(
            files.map((f, idx) => ({ file: f, idx })),
            async ({ file, idx }) => {
                if (IMAGE_TYPES_SET.has(file.type)) {
                    const hash = await DuplicateDetector.computeDHash(file.buffer);
                    visualEntries.push({ sourceIndex: idx, page: null, hash });
                } else if (PDF_TYPES_SET.has(file.type)) {
                    const pages = await DuplicateDetector.renderPdfPages(file.buffer);
                    for (const { pageNum, buffer: pngBuf } of pages) {
                        const hash = await DuplicateDetector.computeDHash(pngBuf);
                        // pngBuf is NOT stored — only the hash is kept (memory optimization)
                        visualEntries.push({ sourceIndex: idx, page: pageNum, hash });
                    }
                }
                renderedFiles++;
                if (onRenderProgress) {
                    onRenderProgress(renderedFiles, totalFilesToRender);
                }
            },
            4
        );

        if (visualEntries.length < 2) return { matches, likelyMatches };

        // --- Hamming distance filter ---
        const candidatePairs = [];
        for (let a = 0; a < visualEntries.length; a++) {
            for (let b = a + 1; b < visualEntries.length; b++) {
                const ea = visualEntries[a];
                const eb = visualEntries[b];

                // Skip same-file pairs (pages within the same PDF)
                if (ea.sourceIndex === eb.sourceIndex) continue;

                // Skip already matched pairs (use original file names)
                const pairKey = `${files[ea.sourceIndex].name}|${files[eb.sourceIndex].name}`;
                if (alreadyMatchedPairs.has(pairKey)) continue;

                // Null hash = include as candidate (safe fallback)
                if (ea.hash === null || eb.hash === null) {
                    candidatePairs.push({ a, b });
                    continue;
                }

                if (DuplicateDetector.hammingDistance(ea.hash, eb.hash) <= HAMMING_THRESHOLD) {
                    candidatePairs.push({ a, b });
                }
            }
        }

        // --- Cap candidate pairs to prevent combinatorial explosion ---
        if (candidatePairs.length > MAX_CANDIDATE_PAIRS) {
            logger.warn(`Visual duplicate candidate pairs (${candidatePairs.length}) exceeds cap (${MAX_CANDIDATE_PAIRS}), truncating`);
            candidatePairs.length = MAX_CANDIDATE_PAIRS;
        }

        // --- Pass 2: Re-render and pixel compare candidates ---
        const totalPairs = candidatePairs.length;
        let completedPairs = 0;

        // Helper: get PNG buffer for a visual entry (re-render if PDF page)
        // Note: MuPDF objects are NOT manually destroyed — FinalizationRegistry handles cleanup.
        // Manual .destroy() causes double-free crashes in WASM (null function signature mismatch).
        const getBuffer = async (entry) => {
            if (entry.page === null) {
                return files[entry.sourceIndex].buffer; // image: use directly
            }
            // PDF page: re-render just this page
            const mupdf = await import('mupdf');
            const doc = mupdf.default.Document.openDocument(
                files[entry.sourceIndex].buffer, 'application/pdf'
            );
            const page = doc.loadPage(entry.page - 1); // 0-indexed
            const pixmap = page.toPixmap(
                [0.5, 0, 0, 0.5, 0, 0],
                mupdf.default.ColorSpace.DeviceRGB, false, true
            );
            return Buffer.from(pixmap.asPNG());
        };

        // Build details string with page info
        const detailStr = (similarity, ea, eb) => {
            const pct = Math.round(similarity * 100);
            const name1 = files[ea.sourceIndex].name;
            const name2 = files[eb.sourceIndex].name;
            const p1 = ea.page ? ` p.${ea.page}` : '';
            const p2 = eb.page ? ` p.${eb.page}` : '';
            if (p1 || p2) {
                return `Visual similarity: ${pct}% (${name1}${p1} vs ${name2}${p2})`;
            }
            return `Visual similarity: ${pct}%`;
        };

        await processWithConcurrency(candidatePairs, async ({ a, b }) => {
            const ea = visualEntries[a];
            const eb = visualEntries[b];

            completedPairs++;
            if (onPairProgress && totalPairs > 0) {
                onPairProgress(completedPairs, totalPairs);
            }

            try {
                const [buf1, buf2] = await Promise.all([getBuffer(ea), getBuffer(eb)]);
                const similarity = await DuplicateDetector.computeVisualSimilarity(buf1, buf2);

                if (similarity >= VISUAL_MATCH_THRESHOLD) {
                    matches.push({
                        file1: files[ea.sourceIndex].name,
                        file2: files[eb.sourceIndex].name,
                        page1: ea.page,
                        page2: eb.page,
                        matchType: 'VISUAL_MATCH',
                        confidence: Math.round(similarity * 100),
                        layer: 2,
                        details: detailStr(similarity, ea, eb),
                    });
                } else if (similarity >= VISUAL_MAYBE_LOW) {
                    likelyMatches.push({
                        file1: files[ea.sourceIndex].name,
                        file2: files[eb.sourceIndex].name,
                        page1: ea.page,
                        page2: eb.page,
                        matchType: 'LIKELY_MATCH',
                        confidence: Math.round(similarity * 100),
                        layer: 2,
                        details: detailStr(similarity, ea, eb),
                    });
                }
            } catch (err) {
                logger.warn(`Visual comparison failed for ${files[ea.sourceIndex].name} vs ${files[eb.sourceIndex].name}: ${err.message}`);
            }
        }, 4);

        return { matches, likelyMatches };
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
     * Run the full two-layer duplicate detection pipeline.
     *
     * Layer 1: Exact hash comparison (0-10%)
     * Layer 2: Visual similarity with PDF pages (10-90%)
     *
     * @param {Array<{name: string, buffer: Buffer, type: string}>} files
     * @param {Function} [onProgress] - Optional callback (subPercent, message) where subPercent is 0-100
     * @returns {Promise<{duplicates: Array<Object>}>}
     */
    static async detectDuplicates(files, onProgress) {
        if (files.length < 2) return { duplicates: [] };

        const allDuplicates = [];
        const progressFn = onProgress || (() => {});

        // Layer 1: Exact hash matching (0-10%)
        progressFn(0, `Checking exact hashes: ${files.length} files`);
        const exactDupes = DuplicateDetector.findExactDuplicates(files);
        allDuplicates.push(...exactDupes);
        progressFn(10, `Hash check complete: ${exactDupes.length} exact match(es)`);

        const matchedPairs = new Set(exactDupes.map(d => `${d.file1}|${d.file2}`));

        // Layer 2: Visual similarity with PDF pages (10-90%)
        const { matches: visualMatches, likelyMatches } = await DuplicateDetector.findVisualMatches(
            files,
            matchedPairs,
            (pairNum, totalPairs) => {
                const subPct = 30 + Math.round((pairNum / totalPairs) * 60);
                progressFn(subPct, `Visual comparison: pair ${pairNum} of ${totalPairs}`);
            },
            (fileNum, totalFiles) => {
                const subPct = 10 + Math.round((fileNum / totalFiles) * 20);
                progressFn(subPct, `Rendering pages: file ${fileNum} of ${totalFiles}`);
            }
        );
        allDuplicates.push(...visualMatches);
        allDuplicates.push(...likelyMatches);
        progressFn(90, `Visual check complete: ${visualMatches.length} match(es), ${likelyMatches.length} likely`);

        progressFn(100, `Duplicate scan complete: ${allDuplicates.length} total match(es)`);

        return { duplicates: allDuplicates };
    }
}

module.exports = DuplicateDetector;
