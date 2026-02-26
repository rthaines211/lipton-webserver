# Exhibit Collector Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a standalone Exhibit Collector form that collects PDF/image attachments for exhibits A-Z, detects duplicates via layered hash/visual/OCR pipeline, and outputs a single Bates-stamped combined PDF with separator pages.

**Architecture:** Server-side processing with Express routes handling chunked file uploads via `multer`, a multi-step pipeline (`sharp` + `pdf-lib` + `tesseract.js`) for image conversion, duplicate detection, and PDF assembly, and SSE for real-time progress. Frontend is a vanilla HTML/CSS/JS form in `forms/exhibits/` matching the Lipton Legal design shell.

**Tech Stack:** Node.js/Express, `pdf-lib` (existing), `sharp`, `multer`, `tesseract.js`, vanilla HTML/CSS/JS, SSE (existing infrastructure)

---

## Task 1: Install New Dependencies

**Files:**
- Modify: `package.json`

**Step 1: Install sharp, multer, and tesseract.js**

Run:
```bash
cd "/Users/ryanhaines/Projects/Lipton Webserver"
npm install sharp multer tesseract.js
```

Expected: 3 packages added to `dependencies` in `package.json`

**Step 2: Verify installation**

Run:
```bash
node -e "const sharp = require('sharp'); const multer = require('multer'); const Tesseract = require('tesseract.js'); console.log('All dependencies loaded successfully');"
```

Expected: `All dependencies loaded successfully`

**Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "feat: add sharp, multer, and tesseract.js for exhibit collector"
```

---

## Task 2: PDF Page Builder Service

Builds separator pages and converts images to PDF pages. This is the foundational service with no dependencies on other new code.

**Files:**
- Create: `services/pdf-page-builder.js`
- Create: `tests/services/pdf-page-builder.test.js`

**Step 1: Write the failing tests**

Create `tests/services/pdf-page-builder.test.js`:

```javascript
const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');
const PdfPageBuilder = require('../../services/pdf-page-builder');

describe('PdfPageBuilder', () => {
    describe('createSeparatorPage', () => {
        it('should create a US Letter PDF with exhibit letter centered', async () => {
            const pdfBytes = await PdfPageBuilder.createSeparatorPage('A');
            const pdf = await PDFDocument.load(pdfBytes);
            const page = pdf.getPages()[0];

            expect(pdf.getPageCount()).toBe(1);
            // US Letter: 612 x 792 points
            expect(page.getWidth()).toBe(612);
            expect(page.getHeight()).toBe(792);
        });

        it('should throw for invalid exhibit letter', async () => {
            await expect(PdfPageBuilder.createSeparatorPage('1'))
                .rejects.toThrow('Invalid exhibit letter');
            await expect(PdfPageBuilder.createSeparatorPage('AB'))
                .rejects.toThrow('Invalid exhibit letter');
        });
    });

    describe('imageToPdfPage', () => {
        it('should convert a PNG buffer to a single-page PDF', async () => {
            // Create a small test PNG with sharp
            const sharp = require('sharp');
            const pngBuffer = await sharp({
                create: { width: 200, height: 300, channels: 3, background: { r: 255, g: 0, b: 0 } }
            }).png().toBuffer();

            const pdfBytes = await PdfPageBuilder.imageToPdfPage(pngBuffer, 'png');
            const pdf = await PDFDocument.load(pdfBytes);

            expect(pdf.getPageCount()).toBe(1);
            const page = pdf.getPages()[0];
            // Should be US Letter
            expect(page.getWidth()).toBe(612);
            expect(page.getHeight()).toBe(792);
        });

        it('should convert a JPEG buffer to a single-page PDF', async () => {
            const sharp = require('sharp');
            const jpgBuffer = await sharp({
                create: { width: 400, height: 200, channels: 3, background: { r: 0, g: 0, b: 255 } }
            }).jpeg().toBuffer();

            const pdfBytes = await PdfPageBuilder.imageToPdfPage(jpgBuffer, 'jpg');
            const pdf = await PDFDocument.load(pdfBytes);

            expect(pdf.getPageCount()).toBe(1);
        });
    });

    describe('addBatesStamp', () => {
        it('should add a Bates stamp to an existing PDF page', async () => {
            // Create a blank PDF
            const doc = await PDFDocument.create();
            doc.addPage([612, 792]);
            const pdfBytes = await doc.save();

            const stampedBytes = await PdfPageBuilder.addBatesStamp(pdfBytes, 0, 'EX-A-001');
            const stampedDoc = await PDFDocument.load(stampedBytes);

            // Should still be 1 page
            expect(stampedDoc.getPageCount()).toBe(1);
            // We can't easily assert the visual stamp, but we verify no crash
        });

        it('should format Bates number with zero-padding', () => {
            expect(PdfPageBuilder.formatBatesNumber('A', 1, 3)).toBe('EX-A-001');
            expect(PdfPageBuilder.formatBatesNumber('B', 42, 3)).toBe('EX-B-042');
            expect(PdfPageBuilder.formatBatesNumber('C', 1000, 4)).toBe('EX-C-1000');
        });

        it('should auto-expand padding when number exceeds digit count', () => {
            expect(PdfPageBuilder.formatBatesNumber('A', 1000, 3)).toBe('EX-A-1000');
        });
    });
});
```

**Step 2: Run tests to verify they fail**

Run: `npx jest tests/services/pdf-page-builder.test.js --verbose`
Expected: FAIL - `Cannot find module '../../services/pdf-page-builder'`

**Step 3: Write the implementation**

Create `services/pdf-page-builder.js`:

```javascript
/**
 * PDF Page Builder Service
 *
 * Creates separator pages, converts images to PDF pages, and applies Bates stamps.
 * Used by the Exhibit Collector pipeline.
 *
 * @module services/pdf-page-builder
 */

const { PDFDocument, StandardFonts, rgb, degrees } = require('pdf-lib');
const sharp = require('sharp');

// US Letter dimensions in points (72 points per inch)
const PAGE_WIDTH = 612;   // 8.5 inches
const PAGE_HEIGHT = 792;  // 11 inches
const MARGIN = 54;        // 0.75 inches

class PdfPageBuilder {
    /**
     * Create an exhibit separator page with centered letter.
     *
     * @param {string} letter - Single uppercase letter A-Z
     * @returns {Promise<Uint8Array>} PDF bytes for the separator page
     */
    static async createSeparatorPage(letter) {
        if (!/^[A-Z]$/i.test(letter)) {
            throw new Error(`Invalid exhibit letter: "${letter}". Must be a single letter A-Z.`);
        }
        letter = letter.toUpperCase();

        const doc = await PDFDocument.create();
        const page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
        const font = await doc.embedFont(StandardFonts.HelveticaBold);

        const text = `EXHIBIT ${letter}`;
        const fontSize = 48;
        const textWidth = font.widthOfTextAtSize(text, fontSize);
        const textHeight = font.heightAtSize(fontSize);
        const x = (PAGE_WIDTH - textWidth) / 2;
        const y = (PAGE_HEIGHT - textHeight) / 2;

        // Draw text
        page.drawText(text, {
            x,
            y,
            size: fontSize,
            font,
            color: rgb(0, 0, 0),
        });

        // Draw horizontal rules (2 inches = 144 points wide, centered)
        const ruleWidth = 144;
        const ruleX = (PAGE_WIDTH - ruleWidth) / 2;
        const ruleThickness = 1.5;

        // Rule above text
        page.drawLine({
            start: { x: ruleX, y: y + textHeight + 20 },
            end: { x: ruleX + ruleWidth, y: y + textHeight + 20 },
            thickness: ruleThickness,
            color: rgb(0, 0, 0),
        });

        // Rule below text
        page.drawLine({
            start: { x: ruleX, y: y - 20 },
            end: { x: ruleX + ruleWidth, y: y - 20 },
            thickness: ruleThickness,
            color: rgb(0, 0, 0),
        });

        return doc.save();
    }

    /**
     * Convert an image buffer to a single-page US Letter PDF.
     * Image is centered on the page within margins, aspect ratio preserved.
     *
     * @param {Buffer} imageBuffer - Raw image data
     * @param {string} format - Image format: 'png', 'jpg', 'jpeg', 'tiff', 'heic'
     * @returns {Promise<Uint8Array>} PDF bytes
     */
    static async imageToPdfPage(imageBuffer, format) {
        // Normalize format and convert exotic formats to PNG
        const normalizedFormat = format.toLowerCase().replace('jpeg', 'jpg');
        let pngBuffer;

        if (['tiff', 'heic'].includes(normalizedFormat)) {
            pngBuffer = await sharp(imageBuffer).toColorspace('srgb').png().toBuffer();
        } else if (normalizedFormat === 'png') {
            pngBuffer = await sharp(imageBuffer).toColorspace('srgb').png().toBuffer();
        } else {
            // JPG - keep as JPG for embedding
            pngBuffer = null;
        }

        const doc = await PDFDocument.create();
        const page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);

        // Get image dimensions
        const metadata = await sharp(imageBuffer).metadata();
        const imgWidth = metadata.width;
        const imgHeight = metadata.height;

        // Calculate scaled dimensions to fit within margins
        const maxWidth = PAGE_WIDTH - (MARGIN * 2);   // 504 points (7 inches)
        const maxHeight = PAGE_HEIGHT - (MARGIN * 2);  // 684 points (9.5 inches)

        const scaleX = maxWidth / imgWidth;
        const scaleY = maxHeight / imgHeight;
        const scale = Math.min(scaleX, scaleY, 1); // Don't upscale

        const scaledWidth = imgWidth * scale;
        const scaledHeight = imgHeight * scale;

        // Center on page
        const x = (PAGE_WIDTH - scaledWidth) / 2;
        const y = (PAGE_HEIGHT - scaledHeight) / 2;

        // Embed image
        let image;
        if (pngBuffer) {
            image = await doc.embedPng(pngBuffer);
        } else {
            image = await doc.embedJpg(imageBuffer);
        }

        page.drawImage(image, {
            x,
            y,
            width: scaledWidth,
            height: scaledHeight,
        });

        return doc.save();
    }

    /**
     * Add a Bates stamp to a specific page of a PDF.
     *
     * @param {Uint8Array|Buffer} pdfBytes - PDF document bytes
     * @param {number} pageIndex - Zero-based page index to stamp
     * @param {string} batesNumber - The Bates number string (e.g., "EX-A-001")
     * @returns {Promise<Uint8Array>} Modified PDF bytes
     */
    static async addBatesStamp(pdfBytes, pageIndex, batesNumber) {
        const doc = await PDFDocument.load(pdfBytes);
        const page = doc.getPages()[pageIndex];
        const font = await doc.embedFont(StandardFonts.Helvetica);

        const fontSize = 9;
        const textWidth = font.widthOfTextAtSize(batesNumber, fontSize);
        const textHeight = font.heightAtSize(fontSize);
        const padding = 4;

        // Position: bottom-right, 0.5 inches (36 points) from edges
        const x = page.getWidth() - 36 - textWidth - padding;
        const y = 36;

        // White background rectangle with gray border
        page.drawRectangle({
            x: x - padding,
            y: y - padding,
            width: textWidth + (padding * 2),
            height: textHeight + (padding * 2),
            color: rgb(1, 1, 1),
            borderColor: rgb(0.7, 0.7, 0.7),
            borderWidth: 0.5,
        });

        // Bates number text
        page.drawText(batesNumber, {
            x,
            y,
            size: fontSize,
            font,
            color: rgb(0, 0, 0),
        });

        return doc.save();
    }

    /**
     * Format a Bates number string.
     *
     * @param {string} letter - Exhibit letter (A-Z)
     * @param {number} number - Page number within exhibit
     * @param {number} padDigits - Minimum digits for zero-padding (default 3)
     * @returns {string} Formatted Bates number (e.g., "EX-A-001")
     */
    static formatBatesNumber(letter, number, padDigits = 3) {
        const numStr = String(number);
        const padded = numStr.length >= padDigits ? numStr : numStr.padStart(padDigits, '0');
        return `EX-${letter.toUpperCase()}-${padded}`;
    }
}

module.exports = PdfPageBuilder;
```

**Step 4: Run tests to verify they pass**

Run: `npx jest tests/services/pdf-page-builder.test.js --verbose`
Expected: All 7 tests PASS

**Step 5: Commit**

```bash
git add services/pdf-page-builder.js tests/services/pdf-page-builder.test.js
git commit -m "feat: add PDF page builder service for exhibit collector

Creates separator pages, converts images to PDF pages, and applies
Bates stamps. Foundation service for the exhibit processing pipeline."
```

---

## Task 3: Duplicate Detector Service

Three-layer duplicate detection: SHA-256 hash, visual similarity via sharp, OCR text comparison via tesseract.js.

**Files:**
- Create: `services/duplicate-detector.js`
- Create: `tests/services/duplicate-detector.test.js`

**Step 1: Write the failing tests**

Create `tests/services/duplicate-detector.test.js`:

```javascript
const path = require('path');
const crypto = require('crypto');
const DuplicateDetector = require('../../services/duplicate-detector');

describe('DuplicateDetector', () => {
    describe('Layer 1: hashFile', () => {
        it('should return SHA-256 hash of a buffer', () => {
            const buffer = Buffer.from('hello world');
            const hash = DuplicateDetector.hashFile(buffer);
            const expected = crypto.createHash('sha256').update(buffer).digest('hex');
            expect(hash).toBe(expected);
        });

        it('should return identical hashes for identical buffers', () => {
            const buf1 = Buffer.from('same content');
            const buf2 = Buffer.from('same content');
            expect(DuplicateDetector.hashFile(buf1)).toBe(DuplicateDetector.hashFile(buf2));
        });

        it('should return different hashes for different buffers', () => {
            const buf1 = Buffer.from('content A');
            const buf2 = Buffer.from('content B');
            expect(DuplicateDetector.hashFile(buf1)).not.toBe(DuplicateDetector.hashFile(buf2));
        });
    });

    describe('Layer 1: findExactDuplicates', () => {
        it('should detect exact duplicates in a file list', () => {
            const files = [
                { name: 'file1.pdf', buffer: Buffer.from('content A') },
                { name: 'file2.pdf', buffer: Buffer.from('content B') },
                { name: 'file3.pdf', buffer: Buffer.from('content A') }, // dupe of file1
            ];
            const dupes = DuplicateDetector.findExactDuplicates(files);

            expect(dupes).toHaveLength(1);
            expect(dupes[0].file1).toBe('file1.pdf');
            expect(dupes[0].file2).toBe('file3.pdf');
            expect(dupes[0].matchType).toBe('EXACT_DUPLICATE');
            expect(dupes[0].confidence).toBe(100);
        });

        it('should return empty array when no duplicates', () => {
            const files = [
                { name: 'file1.pdf', buffer: Buffer.from('unique A') },
                { name: 'file2.pdf', buffer: Buffer.from('unique B') },
            ];
            expect(DuplicateDetector.findExactDuplicates(files)).toHaveLength(0);
        });
    });

    describe('Layer 2: computeVisualSimilarity', () => {
        it('should return 1.0 for identical images', async () => {
            const sharp = require('sharp');
            const img = await sharp({
                create: { width: 100, height: 100, channels: 3, background: { r: 255, g: 0, b: 0 } }
            }).png().toBuffer();

            const similarity = await DuplicateDetector.computeVisualSimilarity(img, img);
            expect(similarity).toBeCloseTo(1.0, 1);
        });

        it('should return low similarity for very different images', async () => {
            const sharp = require('sharp');
            const red = await sharp({
                create: { width: 100, height: 100, channels: 3, background: { r: 255, g: 0, b: 0 } }
            }).png().toBuffer();
            const blue = await sharp({
                create: { width: 100, height: 100, channels: 3, background: { r: 0, g: 0, b: 255 } }
            }).png().toBuffer();

            const similarity = await DuplicateDetector.computeVisualSimilarity(red, blue);
            expect(similarity).toBeLessThan(0.85);
        });
    });

    describe('jaccardSimilarity', () => {
        it('should return 1.0 for identical text', () => {
            expect(DuplicateDetector.jaccardSimilarity('hello world', 'hello world')).toBe(1.0);
        });

        it('should return 0.0 for completely different text', () => {
            expect(DuplicateDetector.jaccardSimilarity('aaa bbb', 'ccc ddd')).toBe(0.0);
        });

        it('should return partial similarity for overlapping text', () => {
            const sim = DuplicateDetector.jaccardSimilarity('the quick brown fox', 'the quick red fox');
            expect(sim).toBeGreaterThan(0.5);
            expect(sim).toBeLessThan(1.0);
        });
    });

    describe('detectDuplicates (full pipeline)', () => {
        it('should return empty results for a single file', async () => {
            const files = [
                { name: 'only.pdf', buffer: Buffer.from('solo content'), type: 'pdf' },
            ];
            const result = await DuplicateDetector.detectDuplicates(files);
            expect(result.duplicates).toHaveLength(0);
        });

        it('should catch exact duplicates at layer 1 without running deeper layers', async () => {
            const content = Buffer.from('identical bytes');
            const files = [
                { name: 'a.pdf', buffer: content, type: 'pdf' },
                { name: 'b.pdf', buffer: Buffer.from(content), type: 'pdf' },
            ];
            const result = await DuplicateDetector.detectDuplicates(files);

            expect(result.duplicates).toHaveLength(1);
            expect(result.duplicates[0].matchType).toBe('EXACT_DUPLICATE');
            expect(result.duplicates[0].layer).toBe(1);
        });
    });
});
```

**Step 2: Run tests to verify they fail**

Run: `npx jest tests/services/duplicate-detector.test.js --verbose`
Expected: FAIL - `Cannot find module '../../services/duplicate-detector'`

**Step 3: Write the implementation**

Create `services/duplicate-detector.js`:

```javascript
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

// Thumbnail size for visual comparison
const THUMB_SIZE = 64;

// Thresholds
const VISUAL_MATCH_THRESHOLD = 0.85;
const VISUAL_MAYBE_LOW = 0.60;
const OCR_MATCH_THRESHOLD = 0.80;

class DuplicateDetector {
    /**
     * Compute SHA-256 hash of a buffer.
     * @param {Buffer} buffer
     * @returns {string} Hex hash
     */
    static hashFile(buffer) {
        return crypto.createHash('sha256').update(buffer).digest('hex');
    }

    /**
     * Layer 1: Find exact duplicates by file hash.
     * @param {Array<{name: string, buffer: Buffer}>} files
     * @returns {Array<Object>} Duplicate pairs
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
     * Layer 2: Compute visual similarity between two image/PDF buffers.
     * Converts first page to 64x64 grayscale thumbnail, compares pixel data.
     *
     * @param {Buffer} buffer1
     * @param {Buffer} buffer2
     * @returns {Promise<number>} Similarity score 0.0-1.0
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

        // Compute normalized pixel difference
        let totalDiff = 0;
        const pixelCount = thumb1.length;

        for (let i = 0; i < pixelCount; i++) {
            totalDiff += Math.abs(thumb1[i] - thumb2[i]);
        }

        const avgDiff = totalDiff / pixelCount / 255;
        return 1.0 - avgDiff;
    }

    /**
     * Layer 2: Find visually similar pairs.
     * @param {Array<{name: string, buffer: Buffer}>} files
     * @param {Set<string>} alreadyMatchedPairs - Pair keys to skip (from Layer 1)
     * @returns {Promise<{matches: Array<Object>, maybePairs: Array<Object>}>}
     */
    static async findVisualMatches(files, alreadyMatchedPairs = new Set()) {
        const matches = [];
        const maybePairs = [];

        for (let i = 0; i < files.length; i++) {
            for (let j = i + 1; j < files.length; j++) {
                const pairKey = `${files[i].name}|${files[j].name}`;
                if (alreadyMatchedPairs.has(pairKey)) continue;

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
                        maybePairs.push({
                            file1Index: i,
                            file2Index: j,
                            similarity,
                        });
                    }
                } catch (err) {
                    logger.warn(`Visual comparison failed for ${files[i].name} vs ${files[j].name}: ${err.message}`);
                }
            }
        }

        return { matches, maybePairs };
    }

    /**
     * Layer 3: OCR-based text comparison for "maybe" pairs.
     * Only called for pairs with 60-85% visual similarity.
     *
     * @param {Array<{name: string, buffer: Buffer}>} files
     * @param {Array<Object>} maybePairs - Pairs from Layer 2 to check
     * @returns {Promise<Array<Object>>} Content matches
     */
    static async findContentMatches(files, maybePairs) {
        if (maybePairs.length === 0) return [];

        // Lazy-load tesseract to avoid startup cost when not needed
        const Tesseract = require('tesseract.js');
        const matches = [];

        for (const pair of maybePairs) {
            try {
                const [result1, result2] = await Promise.all([
                    Tesseract.recognize(files[pair.file1Index].buffer),
                    Tesseract.recognize(files[pair.file2Index].buffer),
                ]);

                const text1 = result1.data.text;
                const text2 = result2.data.text;
                const similarity = DuplicateDetector.jaccardSimilarity(text1, text2);

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
                // Gracefully skip - Layer 3 failure is non-fatal
            }
        }

        return matches;
    }

    /**
     * Compute Jaccard similarity between two text strings.
     * Based on word-set overlap.
     *
     * @param {string} text1
     * @param {string} text2
     * @returns {number} Similarity 0.0-1.0
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
     * @param {Array<{name: string, buffer: Buffer, type: string}>} files
     * @param {Function} [onProgress] - Progress callback: (layer, message) => void
     * @returns {Promise<{duplicates: Array<Object>}>}
     */
    static async detectDuplicates(files, onProgress) {
        if (files.length < 2) return { duplicates: [] };

        const allDuplicates = [];

        // Layer 1: Hash comparison
        if (onProgress) onProgress(1, 'Checking for exact duplicates...');
        const exactDupes = DuplicateDetector.findExactDuplicates(files);
        allDuplicates.push(...exactDupes);

        // Build set of already-matched pairs to skip in Layer 2
        const matchedPairs = new Set(exactDupes.map(d => `${d.file1}|${d.file2}`));

        // Layer 2: Visual similarity
        if (onProgress) onProgress(2, 'Analyzing visual similarity...');
        const { matches: visualMatches, maybePairs } = await DuplicateDetector.findVisualMatches(files, matchedPairs);
        allDuplicates.push(...visualMatches);

        // Layer 3: OCR text comparison (only for "maybe" pairs)
        if (maybePairs.length > 0) {
            if (onProgress) onProgress(3, `Running OCR on ${maybePairs.length} candidate pair(s)...`);
            const contentMatches = await DuplicateDetector.findContentMatches(files, maybePairs);
            allDuplicates.push(...contentMatches);
        }

        return { duplicates: allDuplicates };
    }
}

module.exports = DuplicateDetector;
```

**Step 4: Run tests to verify they pass**

Run: `npx jest tests/services/duplicate-detector.test.js --verbose`
Expected: All 9 tests PASS (OCR tests may be slow first run due to tesseract model download)

**Step 5: Commit**

```bash
git add services/duplicate-detector.js tests/services/duplicate-detector.test.js
git commit -m "feat: add three-layer duplicate detector for exhibit collector

SHA-256 hash matching, visual similarity via sharp thumbnails,
and OCR text comparison via tesseract.js for the 'maybe' zone."
```

---

## Task 4: Exhibit Processor Service

Orchestrates the full pipeline: validation, duplicate detection, image conversion, PDF assembly, Bates stamping, and final merge.

**Files:**
- Create: `services/exhibit-processor.js`
- Create: `tests/services/exhibit-processor.test.js`

**Step 1: Write the failing tests**

Create `tests/services/exhibit-processor.test.js`:

```javascript
const path = require('path');
const fs = require('fs');
const os = require('os');
const { PDFDocument } = require('pdf-lib');
const ExhibitProcessor = require('../../services/exhibit-processor');

describe('ExhibitProcessor', () => {
    let tempDir;

    beforeEach(() => {
        tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'exhibit-test-'));
    });

    afterEach(() => {
        fs.rmSync(tempDir, { recursive: true, force: true });
    });

    describe('validateExhibits', () => {
        it('should pass for valid exhibits with files', () => {
            const exhibits = {
                A: [{ name: 'doc.pdf', type: 'pdf', buffer: Buffer.from('pdf') }],
            };
            expect(() => ExhibitProcessor.validateExhibits(exhibits)).not.toThrow();
        });

        it('should throw when no exhibits have files', () => {
            expect(() => ExhibitProcessor.validateExhibits({}))
                .toThrow('At least one exhibit must have files');
        });

        it('should throw for unsupported file types', () => {
            const exhibits = {
                A: [{ name: 'doc.exe', type: 'exe', buffer: Buffer.from('bad') }],
            };
            expect(() => ExhibitProcessor.validateExhibits(exhibits))
                .toThrow('Unsupported file type');
        });
    });

    describe('getActiveExhibits', () => {
        it('should return only exhibits with files, sorted A-Z', () => {
            const exhibits = {
                C: [{ name: 'c.pdf' }],
                A: [{ name: 'a.pdf' }],
                B: [],
            };
            const active = ExhibitProcessor.getActiveExhibits(exhibits);
            expect(active).toEqual(['A', 'C']);
        });
    });

    describe('determinePadding', () => {
        it('should use 3 digits for under 1000 pages', () => {
            expect(ExhibitProcessor.determinePadding(50)).toBe(3);
            expect(ExhibitProcessor.determinePadding(999)).toBe(3);
        });

        it('should use 4 digits for 1000+ pages', () => {
            expect(ExhibitProcessor.determinePadding(1000)).toBe(4);
            expect(ExhibitProcessor.determinePadding(5000)).toBe(4);
        });
    });

    describe('generateOutputFilename', () => {
        it('should sanitize case name into filename', () => {
            expect(ExhibitProcessor.generateOutputFilename('Smith v. Jones'))
                .toBe('Smith_v._Jones_Exhibits.pdf');
        });

        it('should use fallback when no case name', () => {
            const filename = ExhibitProcessor.generateOutputFilename('');
            expect(filename).toMatch(/^Exhibit_Package_\d+\.pdf$/);
        });

        it('should strip unsafe characters', () => {
            expect(ExhibitProcessor.generateOutputFilename('Case/Name:Bad<>'))
                .toBe('CaseNameBad_Exhibits.pdf');
        });
    });
});
```

**Step 2: Run tests to verify they fail**

Run: `npx jest tests/services/exhibit-processor.test.js --verbose`
Expected: FAIL - `Cannot find module '../../services/exhibit-processor'`

**Step 3: Write the implementation**

Create `services/exhibit-processor.js`:

```javascript
/**
 * Exhibit Processor Service
 *
 * Orchestrates the full exhibit package generation pipeline:
 * 1. Validation
 * 2. Duplicate detection
 * 3. Image processing / PDF page conversion
 * 4. PDF assembly with separator pages
 * 5. Bates stamping
 * 6. Final merge
 *
 * @module services/exhibit-processor
 */

const { PDFDocument } = require('pdf-lib');
const path = require('path');
const fs = require('fs');
const PdfPageBuilder = require('./pdf-page-builder');
const DuplicateDetector = require('./duplicate-detector');
const logger = require('../monitoring/logger');

const SUPPORTED_TYPES = new Set(['pdf', 'png', 'jpg', 'jpeg', 'tiff', 'heic']);
const IMAGE_TYPES = new Set(['png', 'jpg', 'jpeg', 'tiff', 'heic']);

class ExhibitProcessor {
    /**
     * Validate that exhibits have at least one file and all types are supported.
     * @param {Object<string, Array>} exhibits - Map of letter → file array
     */
    static validateExhibits(exhibits) {
        const letters = Object.keys(exhibits);
        const activeLetters = letters.filter(l => exhibits[l] && exhibits[l].length > 0);

        if (activeLetters.length === 0) {
            throw new Error('At least one exhibit must have files');
        }

        for (const letter of activeLetters) {
            for (const file of exhibits[letter]) {
                const ext = file.type.toLowerCase();
                if (!SUPPORTED_TYPES.has(ext)) {
                    throw new Error(`Unsupported file type: "${ext}" in Exhibit ${letter} (${file.name})`);
                }
            }
        }
    }

    /**
     * Get sorted list of exhibit letters that have files.
     * @param {Object<string, Array>} exhibits
     * @returns {string[]} Sorted active letters
     */
    static getActiveExhibits(exhibits) {
        return Object.keys(exhibits)
            .filter(l => exhibits[l] && exhibits[l].length > 0)
            .sort();
    }

    /**
     * Determine zero-padding digit count based on max page count.
     * @param {number} maxPages
     * @returns {number} Pad digits (3 or 4)
     */
    static determinePadding(maxPages) {
        return maxPages >= 1000 ? 4 : 3;
    }

    /**
     * Generate a safe output filename from case name.
     * @param {string} caseName
     * @returns {string} Sanitized filename
     */
    static generateOutputFilename(caseName) {
        if (!caseName || caseName.trim().length === 0) {
            return `Exhibit_Package_${Date.now()}.pdf`;
        }
        const sanitized = caseName.replace(/[<>:"/\\|?*]/g, '').replace(/\s+/g, '_');
        return `${sanitized}_Exhibits.pdf`;
    }

    /**
     * Run the full exhibit processing pipeline.
     *
     * @param {Object} params
     * @param {string} params.caseName - Case name for output filename
     * @param {Object<string, Array<{name, type, buffer}>>} params.exhibits - Exhibit files
     * @param {string} params.outputDir - Directory to write final PDF
     * @param {Function} [params.onProgress] - Progress callback: (percent, message) => void
     * @returns {Promise<{outputPath: string, filename: string, duplicates: Object|null}>}
     */
    static async process({ caseName, exhibits, outputDir, onProgress }) {
        const progress = onProgress || (() => {});

        // Step 1: Validate
        progress(5, 'Validating exhibits...');
        ExhibitProcessor.validateExhibits(exhibits);
        const activeLetters = ExhibitProcessor.getActiveExhibits(exhibits);

        // Step 2: Duplicate detection per exhibit
        progress(10, 'Checking for duplicates...');
        const duplicateReport = {};
        let hasDuplicates = false;

        for (let i = 0; i < activeLetters.length; i++) {
            const letter = activeLetters[i];
            const pct = 10 + Math.round((i / activeLetters.length) * 20);
            progress(pct, `Scanning Exhibit ${letter} for duplicates...`);

            const result = await DuplicateDetector.detectDuplicates(exhibits[letter]);
            if (result.duplicates.length > 0) {
                duplicateReport[letter] = result.duplicates;
                hasDuplicates = true;
            }
        }

        // If duplicates found, return them for user resolution (pipeline pauses)
        if (hasDuplicates) {
            return { duplicates: duplicateReport, paused: true };
        }

        // Step 3-5: Build the PDF
        return ExhibitProcessor._buildPdf({ caseName, exhibits, activeLetters, outputDir, progress });
    }

    /**
     * Resume processing after duplicate resolution.
     *
     * @param {Object} params - Same as process(), with resolved exhibits
     * @returns {Promise<{outputPath: string, filename: string}>}
     */
    static async resume({ caseName, exhibits, outputDir, onProgress }) {
        const progress = onProgress || (() => {});
        const activeLetters = ExhibitProcessor.getActiveExhibits(exhibits);

        progress(30, 'Resuming after duplicate resolution...');
        return ExhibitProcessor._buildPdf({ caseName, exhibits, activeLetters, outputDir, progress });
    }

    /**
     * Internal: Build the final combined PDF.
     * @private
     */
    static async _buildPdf({ caseName, exhibits, activeLetters, outputDir, progress }) {
        const finalDoc = await PDFDocument.create();

        // Count total pages for padding calculation
        let estimatedPages = 0;
        for (const letter of activeLetters) {
            estimatedPages += exhibits[letter].length * 2; // rough estimate
        }
        const padDigits = ExhibitProcessor.determinePadding(estimatedPages);

        for (let li = 0; li < activeLetters.length; li++) {
            const letter = activeLetters[li];
            const files = exhibits[letter];
            const basePct = 30 + Math.round((li / activeLetters.length) * 50);
            progress(basePct, `Processing Exhibit ${letter}...`);

            // Add separator page
            const separatorBytes = await PdfPageBuilder.createSeparatorPage(letter);
            const separatorDoc = await PDFDocument.load(separatorBytes);
            const [separatorPage] = await finalDoc.copyPages(separatorDoc, [0]);
            finalDoc.addPage(separatorPage);

            // Process each file in the exhibit
            let pageNum = 1;
            for (const file of files) {
                const ext = file.type.toLowerCase();
                let fileDoc;

                if (IMAGE_TYPES.has(ext)) {
                    // Convert image to PDF page
                    const pagePdfBytes = await PdfPageBuilder.imageToPdfPage(file.buffer, ext);
                    fileDoc = await PDFDocument.load(pagePdfBytes);
                } else {
                    // PDF - load directly
                    fileDoc = await PDFDocument.load(file.buffer, { ignoreEncryption: true });
                }

                // Copy all pages from this file
                const pageIndices = fileDoc.getPageIndices();
                const copiedPages = await finalDoc.copyPages(fileDoc, pageIndices);

                for (const page of copiedPages) {
                    finalDoc.addPage(page);

                    // Apply Bates stamp to the page we just added
                    const currentPageIndex = finalDoc.getPageCount() - 1;
                    const batesNum = PdfPageBuilder.formatBatesNumber(letter, pageNum, padDigits);

                    // We stamp in a second pass after all pages are assembled
                    // Store stamp info for now
                    pageNum++;
                }
            }
        }

        progress(85, 'Applying Bates stamps...');

        // Second pass: apply Bates stamps
        // We need to track which pages are separators vs content
        let stampPageIndex = 0;
        for (const letter of activeLetters) {
            stampPageIndex++; // Skip separator page
            let pageNum = 1;

            for (const file of exhibits[letter]) {
                const ext = file.type.toLowerCase();
                let pageCount;

                if (IMAGE_TYPES.has(ext)) {
                    pageCount = 1;
                } else {
                    const tempDoc = await PDFDocument.load(file.buffer, { ignoreEncryption: true });
                    pageCount = tempDoc.getPageCount();
                }

                for (let p = 0; p < pageCount; p++) {
                    const batesNum = PdfPageBuilder.formatBatesNumber(letter, pageNum, padDigits);
                    const page = finalDoc.getPages()[stampPageIndex];
                    const font = await finalDoc.embedFont('Helvetica');

                    const fontSize = 9;
                    const textWidth = font.widthOfTextAtSize(batesNum, fontSize);
                    const textHeight = font.heightAtSize(fontSize);
                    const padding = 4;

                    const x = page.getWidth() - 36 - textWidth - padding;
                    const y = 36;

                    // White background
                    const { rgb: pdfRgb } = require('pdf-lib');
                    page.drawRectangle({
                        x: x - padding,
                        y: y - padding,
                        width: textWidth + (padding * 2),
                        height: textHeight + (padding * 2),
                        color: pdfRgb(1, 1, 1),
                        borderColor: pdfRgb(0.7, 0.7, 0.7),
                        borderWidth: 0.5,
                    });

                    page.drawText(batesNum, {
                        x, y,
                        size: fontSize,
                        font,
                        color: pdfRgb(0, 0, 0),
                    });

                    pageNum++;
                    stampPageIndex++;
                }
            }
        }

        // Save final PDF
        progress(95, 'Saving exhibit package...');
        const filename = ExhibitProcessor.generateOutputFilename(caseName);
        const outputPath = path.join(outputDir, filename);

        const pdfBytes = await finalDoc.save();
        fs.writeFileSync(outputPath, pdfBytes);

        progress(100, 'Complete!');
        return { outputPath, filename };
    }
}

module.exports = ExhibitProcessor;
```

**Step 4: Run tests to verify they pass**

Run: `npx jest tests/services/exhibit-processor.test.js --verbose`
Expected: All 7 tests PASS

**Step 5: Commit**

```bash
git add services/exhibit-processor.js tests/services/exhibit-processor.test.js
git commit -m "feat: add exhibit processor service for pipeline orchestration

Validates exhibits, runs duplicate detection, converts images to PDF
pages, assembles with separator pages, applies Bates stamps, and
merges into single output PDF."
```

---

## Task 5: Exhibits API Route

Express router with upload, generate, resolve, stream (SSE), download, and cleanup endpoints.

**Files:**
- Create: `routes/exhibits.js`
- Modify: `server.js` (mount route + add password auth + multer config)

**Step 1: Create the route file**

Create `routes/exhibits.js`:

```javascript
/**
 * Exhibit Collector Routes
 *
 * Handles file uploads, exhibit package generation, duplicate resolution,
 * SSE progress streaming, and file downloads.
 *
 * @module routes/exhibits
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const ExhibitProcessor = require('../services/exhibit-processor');
const logger = require('../monitoring/logger');
const { asyncHandler } = require('../middleware/error-handler');

// Temp directory for uploads
const UPLOAD_BASE = path.join(require('os').tmpdir(), 'exhibits');
const CLEANUP_TTL = 60 * 60 * 1000; // 1 hour

// In-memory job state
const sessions = new Map(); // sessionId → { exhibits, caseName, description }
const jobs = new Map();     // jobId → { status, progress, message, duplicates, outputPath, sseClients }

// Ensure upload base directory exists
if (!fs.existsSync(UPLOAD_BASE)) {
    fs.mkdirSync(UPLOAD_BASE, { recursive: true });
}

// Multer storage config: store in session-scoped directories
const storage = multer.memoryStorage();
const upload = multer({
    storage,
    limits: { fileSize: 100 * 1024 * 1024 }, // 100MB per file
    fileFilter: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
        const allowed = ['pdf', 'png', 'jpg', 'jpeg', 'tiff', 'tif', 'heic'];
        if (allowed.includes(ext)) {
            cb(null, true);
        } else {
            cb(new Error(`Unsupported file type: .${ext}`));
        }
    },
});

/**
 * Helper: get or create a session
 */
function getSession(sessionId) {
    if (!sessions.has(sessionId)) {
        sessions.set(sessionId, {
            exhibits: {},
            caseName: '',
            description: '',
            createdAt: Date.now(),
        });
    }
    return sessions.get(sessionId);
}

/**
 * Helper: broadcast SSE event to job subscribers
 */
function broadcastJobEvent(jobId, event, data) {
    const job = jobs.get(jobId);
    if (!job || !job.sseClients) return;
    for (const res of job.sseClients) {
        res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    }
}

/**
 * POST /api/exhibits/upload
 * Upload files to a specific exhibit letter within a session.
 *
 * Body (multipart):
 * - sessionId: string
 * - letter: string (A-Z)
 * - files: file(s)
 */
router.post('/upload', upload.array('files', 50), asyncHandler(async (req, res) => {
    const { sessionId, letter } = req.body;

    if (!sessionId) {
        return res.status(400).json({ success: false, error: 'sessionId is required' });
    }
    if (!letter || !/^[A-Z]$/i.test(letter)) {
        return res.status(400).json({ success: false, error: 'letter must be A-Z' });
    }

    const session = getSession(sessionId);
    const upperLetter = letter.toUpperCase();

    if (!session.exhibits[upperLetter]) {
        session.exhibits[upperLetter] = [];
    }

    const uploadedFiles = [];
    for (const file of req.files) {
        const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
        const fileEntry = {
            name: file.originalname,
            type: ext === 'tif' ? 'tiff' : ext,
            buffer: file.buffer,
            size: file.size,
        };
        session.exhibits[upperLetter].push(fileEntry);
        uploadedFiles.push({ name: file.originalname, size: file.size, type: ext });
    }

    logger.info(`Uploaded ${uploadedFiles.length} file(s) to Exhibit ${upperLetter}`, { sessionId });

    res.json({
        success: true,
        exhibit: upperLetter,
        filesUploaded: uploadedFiles,
        totalFilesInExhibit: session.exhibits[upperLetter].length,
    });
}));

/**
 * POST /api/exhibits/generate
 * Start exhibit package generation.
 *
 * Body (JSON):
 * - sessionId: string
 * - caseName: string (optional)
 */
router.post('/generate', asyncHandler(async (req, res) => {
    const { sessionId, caseName } = req.body;

    if (!sessionId || !sessions.has(sessionId)) {
        return res.status(400).json({ success: false, error: 'Invalid or missing sessionId' });
    }

    const session = sessions.get(sessionId);
    session.caseName = caseName || '';

    // Create job
    const jobId = crypto.randomUUID();
    const outputDir = path.join(UPLOAD_BASE, sessionId);
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    jobs.set(jobId, {
        sessionId,
        status: 'processing',
        progress: 0,
        message: 'Starting...',
        duplicates: null,
        outputPath: null,
        filename: null,
        sseClients: [],
    });

    // Send jobId immediately
    res.json({ success: true, jobId });

    // Run pipeline in background
    ExhibitProcessor.process({
        caseName: session.caseName,
        exhibits: session.exhibits,
        outputDir,
        onProgress: (pct, msg) => {
            const job = jobs.get(jobId);
            if (job) {
                job.progress = pct;
                job.message = msg;
                broadcastJobEvent(jobId, 'progress', { progress: pct, message: msg });
            }
        },
    }).then(result => {
        const job = jobs.get(jobId);
        if (!job) return;

        if (result.paused && result.duplicates) {
            job.status = 'awaiting_resolution';
            job.duplicates = result.duplicates;
            broadcastJobEvent(jobId, 'duplicates', { duplicates: result.duplicates });
        } else {
            job.status = 'completed';
            job.outputPath = result.outputPath;
            job.filename = result.filename;
            broadcastJobEvent(jobId, 'complete', { filename: result.filename });
        }
    }).catch(err => {
        logger.error('Exhibit processing failed', { jobId, error: err.message, stack: err.stack });
        const job = jobs.get(jobId);
        if (job) {
            job.status = 'failed';
            job.message = err.message;
            broadcastJobEvent(jobId, 'error', { error: err.message });
        }
    });
}));

/**
 * POST /api/exhibits/jobs/:jobId/resolve
 * Submit duplicate resolution decisions and resume pipeline.
 *
 * Body (JSON):
 * - resolutions: { [exhibit]: [{ file1, file2, action: 'keep_both'|'remove_file1'|'remove_file2' }] }
 */
router.post('/jobs/:jobId/resolve', asyncHandler(async (req, res) => {
    const { jobId } = req.params;
    const { resolutions } = req.body;
    const job = jobs.get(jobId);

    if (!job) {
        return res.status(404).json({ success: false, error: 'Job not found' });
    }
    if (job.status !== 'awaiting_resolution') {
        return res.status(400).json({ success: false, error: 'Job is not awaiting resolution' });
    }

    const session = sessions.get(job.sessionId);
    if (!session) {
        return res.status(400).json({ success: false, error: 'Session expired' });
    }

    // Apply resolutions: remove files the user chose to discard
    if (resolutions) {
        for (const [letter, pairs] of Object.entries(resolutions)) {
            const filesToRemove = new Set();
            for (const pair of pairs) {
                if (pair.action === 'remove_file1') filesToRemove.add(pair.file1);
                if (pair.action === 'remove_file2') filesToRemove.add(pair.file2);
            }
            if (filesToRemove.size > 0 && session.exhibits[letter]) {
                session.exhibits[letter] = session.exhibits[letter].filter(
                    f => !filesToRemove.has(f.name)
                );
            }
        }
    }

    job.status = 'processing';
    job.duplicates = null;
    res.json({ success: true, message: 'Resuming pipeline...' });

    // Resume pipeline
    const outputDir = path.join(UPLOAD_BASE, job.sessionId);
    ExhibitProcessor.resume({
        caseName: session.caseName,
        exhibits: session.exhibits,
        outputDir,
        onProgress: (pct, msg) => {
            job.progress = pct;
            job.message = msg;
            broadcastJobEvent(jobId, 'progress', { progress: pct, message: msg });
        },
    }).then(result => {
        job.status = 'completed';
        job.outputPath = result.outputPath;
        job.filename = result.filename;
        broadcastJobEvent(jobId, 'complete', { filename: result.filename });
    }).catch(err => {
        logger.error('Exhibit resume failed', { jobId, error: err.message });
        job.status = 'failed';
        job.message = err.message;
        broadcastJobEvent(jobId, 'error', { error: err.message });
    });
}));

/**
 * GET /api/exhibits/jobs/:jobId/stream
 * SSE stream for real-time progress updates.
 */
router.get('/jobs/:jobId/stream', (req, res) => {
    const { jobId } = req.params;
    const job = jobs.get(jobId);

    if (!job) {
        return res.status(404).json({ success: false, error: 'Job not found' });
    }

    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
    });

    // Send current state immediately
    res.write(`event: progress\ndata: ${JSON.stringify({ progress: job.progress, message: job.message })}\n\n`);

    if (job.status === 'completed') {
        res.write(`event: complete\ndata: ${JSON.stringify({ filename: job.filename })}\n\n`);
    } else if (job.status === 'awaiting_resolution') {
        res.write(`event: duplicates\ndata: ${JSON.stringify({ duplicates: job.duplicates })}\n\n`);
    } else if (job.status === 'failed') {
        res.write(`event: error\ndata: ${JSON.stringify({ error: job.message })}\n\n`);
    }

    // Register for future events
    job.sseClients.push(res);

    req.on('close', () => {
        const idx = job.sseClients.indexOf(res);
        if (idx !== -1) job.sseClients.splice(idx, 1);
    });
});

/**
 * GET /api/exhibits/jobs/:jobId/download
 * Download the generated exhibit package PDF.
 */
router.get('/jobs/:jobId/download', asyncHandler(async (req, res) => {
    const { jobId } = req.params;
    const job = jobs.get(jobId);

    if (!job) {
        return res.status(404).json({ success: false, error: 'Job not found' });
    }
    if (job.status !== 'completed' || !job.outputPath) {
        return res.status(400).json({ success: false, error: 'PDF not ready yet' });
    }

    res.download(job.outputPath, job.filename);
}));

/**
 * DELETE /api/exhibits/sessions/:sessionId
 * Clean up temp files for a session.
 */
router.delete('/sessions/:sessionId', asyncHandler(async (req, res) => {
    const { sessionId } = req.params;

    // Remove session data
    sessions.delete(sessionId);

    // Remove temp directory
    const sessionDir = path.join(UPLOAD_BASE, sessionId);
    if (fs.existsSync(sessionDir)) {
        fs.rmSync(sessionDir, { recursive: true, force: true });
    }

    // Clean up related jobs
    for (const [jobId, job] of jobs.entries()) {
        if (job.sessionId === sessionId) {
            jobs.delete(jobId);
        }
    }

    res.json({ success: true, message: 'Session cleaned up' });
}));

// Periodic cleanup of expired sessions (1 hour TTL)
setInterval(() => {
    const now = Date.now();
    for (const [sessionId, session] of sessions.entries()) {
        if (now - session.createdAt > CLEANUP_TTL) {
            sessions.delete(sessionId);
            const sessionDir = path.join(UPLOAD_BASE, sessionId);
            if (fs.existsSync(sessionDir)) {
                fs.rmSync(sessionDir, { recursive: true, force: true });
            }
            logger.info(`Cleaned up expired exhibit session: ${sessionId}`);
        }
    }
}, 10 * 60 * 1000); // Check every 10 minutes

module.exports = router;
```

**Step 2: Mount the route in server.js**

Add these lines to `server.js`. Find the section where routes are mounted (around line 444-475):

After the line `app.use('/forms', express.static(path.join(__dirname, 'forms')));` (line 444), add:

```javascript
// Password-protect exhibit collector form
app.use('/forms/exhibits', createPasswordAuth('exhibits'));
```

After the line `app.use('/api', contingencyRoutes);` (line 465), add:

```javascript
// Exhibit collector routes
const exhibitRoutes = require('./routes/exhibits');
app.use('/api/exhibits', exhibitRoutes);
```

Also, near line 93, add the require:

After `const contingencyRoutes = require('./routes/contingency');`:

*(No additional require needed - it's inlined at mount point for consistency with how pdfRoutes is done at line 447.)*

And update the root redirect in the hostname check (around line 406-427) to handle exhibits domain when needed in the future.

**Step 3: Add EXHIBITS_FORM_PASSWORD to env config**

Check `config/env-validator.js` and add `EXHIBITS_FORM_PASSWORD` as an optional variable (same pattern as existing passwords).

**Step 4: Run the server to verify no startup errors**

Run: `npm run dev` (then Ctrl+C after confirming startup)
Expected: No errors, server starts on port 3000

**Step 5: Commit**

```bash
git add routes/exhibits.js server.js
git commit -m "feat: add exhibit collector API routes and mount in server

Upload, generate, duplicate resolve, SSE progress stream, download,
and session cleanup endpoints. Password-protected at /forms/exhibits."
```

---

## Task 6: Frontend - HTML Shell & Styles

The main form page matching the Lipton Legal design language.

**Files:**
- Create: `forms/exhibits/index.html`
- Create: `forms/exhibits/styles.css`

**Step 1: Create the HTML page**

Create `forms/exhibits/index.html` - this is the Lipton shell with exhibit-specific interior. Build it following the exact same structure as `forms/agreement/index.html` (navy gradient header, logo, accent bar, white card container) but with the exhibit grid interior.

The HTML should include:
- Same `<head>` with Merriweather + Open Sans fonts, Font Awesome
- Link to `styles.css` and shared SSE scripts
- Header matching agreement form (logo + "Exhibit Collector" title + subtitle)
- Case Info section (case name input, description textarea)
- Exhibit Grid: 26 collapsible cards A-Z with drag-drop zones
- Generate button section
- Progress overlay modal (matching existing pattern)
- Duplicate resolution modal
- Script tags loading the JS modules from `js/` directory

**Step 2: Create the stylesheet**

Create `forms/exhibits/styles.css` - use the same CSS variables and base styles from `forms/agreement/styles.css` (`:root` with `--primary-navy`, `--secondary-teal`, etc.) plus exhibit-specific styles for:
- `.exhibit-card` - collapsible card with letter badge
- `.exhibit-card.active` - expanded state with teal left border
- `.drop-zone` - drag-and-drop area with dashed border
- `.file-list` - uploaded file rows with thumbnails
- `.duplicate-badge` - red/amber warning badges
- `.duplicate-modal` - side-by-side comparison cards
- `.letter-badge` - circular navy badge with exhibit letter

**Step 3: Verify the page loads**

Run: `npm run dev`
Navigate to: `http://localhost:3000/forms/exhibits/`
Expected: Page renders with Lipton header, exhibit cards visible

**Step 4: Commit**

```bash
git add forms/exhibits/index.html forms/exhibits/styles.css
git commit -m "feat: add exhibit collector HTML page and styles

Lipton Legal shell design with exhibit grid interior. 26 collapsible
exhibit cards A-Z with drag-drop zones and case info section."
```

---

## Task 7: Frontend - Exhibit Manager JS

Client-side logic for managing exhibit cards, file state, and drag-and-drop.

**Files:**
- Create: `forms/exhibits/js/exhibit-manager.js`

**Step 1: Create the exhibit manager**

Create `forms/exhibits/js/exhibit-manager.js` - this module handles:
- Initializing 26 exhibit card elements (A-Z)
- Expand/collapse card toggle
- Drag-and-drop file handling on each card's drop zone
- File input change handler
- Adding files to the exhibit's file list (with thumbnail preview, size, remove button)
- File count badge updates on card headers
- Active/inactive card styling
- `getExhibitData()` method that returns the current state of all exhibits
- Session ID generation (UUID)

Key patterns to follow from the existing codebase:
- Vanilla JS, no frameworks
- Class-based or IIFE module pattern
- DOM manipulation with `document.createElement`
- Event delegation where possible

**Step 2: Verify drag-and-drop works**

Run: `npm run dev`
Navigate to: `http://localhost:3000/forms/exhibits/`
Test: Drag a PDF onto an exhibit card, verify it appears in the file list
Expected: File shows with name, size, thumbnail (for images), and remove button

**Step 3: Commit**

```bash
git add forms/exhibits/js/exhibit-manager.js
git commit -m "feat: add exhibit manager JS for card state and drag-drop

Manages 26 exhibit cards with expand/collapse, drag-and-drop uploads,
file list rendering, thumbnails, and active card tracking."
```

---

## Task 8: Frontend - File Upload JS

Handles uploading files from the client to the server via the `/api/exhibits/upload` endpoint.

**Files:**
- Create: `forms/exhibits/js/file-upload.js`

**Step 1: Create the file upload module**

Create `forms/exhibits/js/file-upload.js` - this module handles:
- `uploadFiles(sessionId, letter, files)` - POST multipart to `/api/exhibits/upload`
- FormData construction with `sessionId`, `letter`, and file array
- Progress tracking per upload
- Error handling with retry
- Returns the server response (files uploaded, total count)

**Step 2: Verify upload works end-to-end**

Run: `npm run dev`
Test: Upload a file to Exhibit A, check server logs for "Uploaded 1 file(s) to Exhibit A"
Expected: Server receives file, responds with success

**Step 3: Commit**

```bash
git add forms/exhibits/js/file-upload.js
git commit -m "feat: add file upload JS for exhibit collector

Uploads files per exhibit letter via multipart POST with session
tracking, progress events, and error retry."
```

---

## Task 9: Frontend - Duplicate UI JS

Renders the duplicate resolution modal when the server detects duplicates.

**Files:**
- Create: `forms/exhibits/js/duplicate-ui.js`

**Step 1: Create the duplicate UI module**

Create `forms/exhibits/js/duplicate-ui.js` - this module handles:
- `showDuplicateModal(duplicateReport)` - renders the modal with all flagged pairs
- Side-by-side file cards with thumbnail previews
- Match type badge (red for EXACT_DUPLICATE, amber for VISUAL_MATCH/CONTENT_MATCH)
- Confidence percentage display
- Three action buttons per pair: Keep Both, Remove File 1, Remove File 2
- "Continue with [X] files" button
- `getResolutions()` - returns the user's decisions in the format expected by `/resolve`
- Amber badges injected into exhibit cards for flagged files

**Step 2: Commit**

```bash
git add forms/exhibits/js/duplicate-ui.js
git commit -m "feat: add duplicate resolution UI for exhibit collector

Side-by-side duplicate comparison modal with match type badges,
confidence scores, and keep/remove actions per pair."
```

---

## Task 10: Frontend - Form Submission JS

Ties everything together: submit handler, SSE progress connection, download trigger.

**Files:**
- Create: `forms/exhibits/js/form-submission.js`

**Step 1: Create the form submission module**

Create `forms/exhibits/js/form-submission.js` - this module handles:
- "Generate Exhibit Package" button click handler
- Uploads all files per exhibit letter (sequential per letter to avoid overwhelming server)
- Calls `POST /api/exhibits/generate` with sessionId and caseName
- Opens SSE connection to `/api/exhibits/jobs/{jobId}/stream`
- Progress overlay updates (percent bar + message text, matching existing modal pattern)
- Handles `duplicates` SSE event → shows duplicate modal
- On duplicate resolution → calls `POST /api/exhibits/jobs/{jobId}/resolve`
- Handles `complete` SSE event → triggers download via `/api/exhibits/jobs/{jobId}/download`
- Handles `error` SSE event → shows error in progress overlay
- Reuses shared SSE patterns from `forms/shared/js/sse-client.js` where possible

**Step 2: Full end-to-end test**

Run: `npm run dev`
Test:
1. Open `http://localhost:3000/forms/exhibits/`
2. Enter case name "Test Case"
3. Upload a PDF to Exhibit A
4. Upload an image to Exhibit B
5. Click "Generate Exhibit Package"
6. Verify progress overlay appears
7. Verify PDF downloads with Bates stamps and separator pages

Expected: `Test_Case_Exhibits.pdf` downloads with separator pages and Bates stamped content

**Step 3: Commit**

```bash
git add forms/exhibits/js/form-submission.js
git commit -m "feat: add form submission handler for exhibit collector

Orchestrates upload, generation, SSE progress, duplicate resolution,
and download. Completes the full end-to-end user flow."
```

---

## Task 11: Integration Testing

End-to-end test verifying the full pipeline works.

**Files:**
- Create: `tests/services/exhibit-integration.test.js`

**Step 1: Write integration test**

Create `tests/services/exhibit-integration.test.js`:

```javascript
const path = require('path');
const fs = require('fs');
const os = require('os');
const sharp = require('sharp');
const { PDFDocument } = require('pdf-lib');
const ExhibitProcessor = require('../../services/exhibit-processor');

describe('Exhibit Processor Integration', () => {
    let tempDir;

    beforeEach(() => {
        tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'exhibit-int-'));
    });

    afterEach(() => {
        fs.rmSync(tempDir, { recursive: true, force: true });
    });

    it('should generate a complete exhibit package from mixed file types', async () => {
        // Create test files
        const pngBuffer = await sharp({
            create: { width: 800, height: 600, channels: 3, background: { r: 200, g: 200, b: 200 } }
        }).png().toBuffer();

        const pdfDoc = await PDFDocument.create();
        pdfDoc.addPage([612, 792]);
        const pdfBuffer = Buffer.from(await pdfDoc.save());

        const exhibits = {
            A: [
                { name: 'photo.png', type: 'png', buffer: pngBuffer },
                { name: 'document.pdf', type: 'pdf', buffer: pdfBuffer },
            ],
            B: [
                { name: 'another.png', type: 'png', buffer: pngBuffer },
            ],
        };

        const progressMessages = [];
        const result = await ExhibitProcessor.process({
            caseName: 'Test Case',
            exhibits,
            outputDir: tempDir,
            onProgress: (pct, msg) => progressMessages.push({ pct, msg }),
        });

        // Should complete without duplicates
        expect(result.outputPath).toBeDefined();
        expect(result.filename).toBe('Test_Case_Exhibits.pdf');
        expect(fs.existsSync(result.outputPath)).toBe(true);

        // Verify PDF structure
        const outputBytes = fs.readFileSync(result.outputPath);
        const outputDoc = await PDFDocument.load(outputBytes);

        // Expected: separator A + photo + document + separator B + another = 5 pages
        expect(outputDoc.getPageCount()).toBe(5);

        // Verify progress was reported
        expect(progressMessages.length).toBeGreaterThan(0);
        expect(progressMessages[progressMessages.length - 1].pct).toBe(100);
    }, 30000); // 30s timeout for processing

    it('should detect exact duplicates and pause', async () => {
        const content = Buffer.from('identical pdf content');
        const exhibits = {
            A: [
                { name: 'original.pdf', type: 'pdf', buffer: content },
                { name: 'copy.pdf', type: 'pdf', buffer: Buffer.from(content) },
            ],
        };

        const result = await ExhibitProcessor.process({
            caseName: 'Dupe Test',
            exhibits,
            outputDir: tempDir,
        });

        expect(result.paused).toBe(true);
        expect(result.duplicates).toBeDefined();
        expect(result.duplicates.A).toHaveLength(1);
        expect(result.duplicates.A[0].matchType).toBe('EXACT_DUPLICATE');
    });
});
```

**Step 2: Run integration tests**

Run: `npx jest tests/services/exhibit-integration.test.js --verbose --timeout=30000`
Expected: All tests PASS

**Step 3: Commit**

```bash
git add tests/services/exhibit-integration.test.js
git commit -m "test: add integration tests for exhibit processor pipeline

Verifies complete package generation from mixed file types and
duplicate detection pause behavior."
```

---

## Task 12: Wire Up Server & Final Polish

Final server.js modifications, env config, and any remaining wiring.

**Files:**
- Modify: `server.js` (if not already done in Task 5)
- Modify: `config/env-validator.js` (add EXHIBITS_FORM_PASSWORD)

**Step 1: Verify all routes are mounted**

Check `server.js` has:
- `require('./routes/exhibits')` and `app.use('/api/exhibits', exhibitRoutes)`
- Password auth for `/forms/exhibits`
- Static serving already covered by `app.use('/forms', express.static(...))`

**Step 2: Add env variable for exhibits password**

In `config/env-validator.js`, add `EXHIBITS_FORM_PASSWORD` to the optional variables list (following the pattern of `AGREEMENT_FORM_PASSWORD`).

**Step 3: Run full test suite**

Run: `npm test`
Expected: All existing tests still pass, new tests pass

**Step 4: Final commit**

```bash
git add -A
git commit -m "feat: complete exhibit collector wiring and env config

Final server integration, environment variable setup, and polish."
```

---

## Summary of Files Created/Modified

### New Files (12)
| File | Purpose |
|------|---------|
| `services/pdf-page-builder.js` | Separator pages, image-to-PDF, Bates stamps |
| `services/duplicate-detector.js` | Three-layer duplicate detection |
| `services/exhibit-processor.js` | Pipeline orchestration |
| `routes/exhibits.js` | API endpoints |
| `forms/exhibits/index.html` | Frontend page |
| `forms/exhibits/styles.css` | Exhibit-specific styles |
| `forms/exhibits/js/exhibit-manager.js` | Card state, drag-drop |
| `forms/exhibits/js/file-upload.js` | File upload to server |
| `forms/exhibits/js/duplicate-ui.js` | Duplicate resolution modal |
| `forms/exhibits/js/form-submission.js` | Submit + SSE + download |
| `tests/services/pdf-page-builder.test.js` | Unit tests |
| `tests/services/duplicate-detector.test.js` | Unit tests |
| `tests/services/exhibit-processor.test.js` | Unit tests |
| `tests/services/exhibit-integration.test.js` | Integration tests |

### Modified Files (2)
| File | Change |
|------|--------|
| `server.js` | Mount exhibit routes, add password auth |
| `config/env-validator.js` | Add EXHIBITS_FORM_PASSWORD |

### New Dependencies (3)
| Package | Purpose |
|---------|---------|
| `sharp` | Image processing |
| `multer` | File uploads |
| `tesseract.js` | OCR |
