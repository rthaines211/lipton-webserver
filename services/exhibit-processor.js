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

const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');
const path = require('path');
const fs = require('fs');
const PdfPageBuilder = require('./pdf-page-builder');
const DuplicateDetector = require('./duplicate-detector');
const logger = require('../monitoring/logger');

const SUPPORTED_TYPES = new Set(['pdf', 'png', 'jpg', 'jpeg', 'tiff', 'heic']);
const IMAGE_TYPES = new Set(['png', 'jpg', 'jpeg', 'tiff', 'heic']);

class ExhibitProcessor {
    /**
     * Validate that exhibits contain at least one file and all file types are supported.
     * @param {Object<string, Array<{name: string, type: string, buffer: Buffer}>>} exhibits
     * @throws {Error} If no exhibits have files or an unsupported file type is found
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
     * Return only exhibit letters that have files, sorted alphabetically.
     * @param {Object<string, Array>} exhibits
     * @returns {string[]} Sorted array of active exhibit letters
     */
    static getActiveExhibits(exhibits) {
        return Object.keys(exhibits)
            .filter(l => exhibits[l] && exhibits[l].length > 0)
            .sort();
    }

    /**
     * Determine the zero-padding digit count based on estimated total pages.
     * @param {number} maxPages - Estimated total page count
     * @returns {number} Number of digits to use for Bates number padding
     */
    static determinePadding(maxPages) {
        return maxPages >= 1000 ? 4 : 3;
    }

    /**
     * Generate a sanitized output filename from the case name.
     * @param {string} caseName - Case name to use in the filename
     * @returns {string} Sanitized filename with .pdf extension
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
     * @param {Object} params
     * @param {string} params.caseName - Case name for the output filename
     * @param {Object<string, Array<{name: string, type: string, buffer: Buffer}>>} params.exhibits
     * @param {string} params.outputDir - Directory to write the final PDF
     * @param {Function} [params.onProgress] - Progress callback: (percent, message) => void
     * @returns {Promise<{outputPath: string, filename: string}|{duplicates: Object, paused: boolean}>}
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

        if (hasDuplicates) {
            return { duplicates: duplicateReport, paused: true };
        }

        return ExhibitProcessor._buildPdf({ caseName, exhibits, activeLetters, outputDir, progress });
    }

    /**
     * Resume processing after duplicate resolution.
     * @param {Object} params
     * @param {string} params.caseName
     * @param {Object<string, Array<{name: string, type: string, buffer: Buffer}>>} params.exhibits
     * @param {string} params.outputDir
     * @param {Function} [params.onProgress]
     * @returns {Promise<{outputPath: string, filename: string}>}
     */
    static async resume({ caseName, exhibits, outputDir, onProgress }) {
        const progress = onProgress || (() => {});
        const activeLetters = ExhibitProcessor.getActiveExhibits(exhibits);
        progress(30, 'Resuming after duplicate resolution...');
        return ExhibitProcessor._buildPdf({ caseName, exhibits, activeLetters, outputDir, progress });
    }

    /**
     * Build the final combined PDF with separator pages and Bates stamps.
     * @private
     * @param {Object} params
     * @param {string} params.caseName
     * @param {Object<string, Array<{name: string, type: string, buffer: Buffer}>>} params.exhibits
     * @param {string[]} params.activeLetters
     * @param {string} params.outputDir
     * @param {Function} params.progress
     * @returns {Promise<{outputPath: string, filename: string}>}
     */
    static async _buildPdf({ caseName, exhibits, activeLetters, outputDir, progress }) {
        const finalDoc = await PDFDocument.create();

        // Estimate total pages for padding
        let estimatedPages = 0;
        for (const letter of activeLetters) {
            estimatedPages += exhibits[letter].length * 2;
        }
        const padDigits = ExhibitProcessor.determinePadding(estimatedPages);

        // Track page metadata for Bates stamping in second pass
        // Each entry: { type: 'separator' | 'content', letter, pageNum }
        const pageMetadata = [];

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
            pageMetadata.push({ type: 'separator' });

            // Process each file
            let pageNum = 1;
            for (const file of files) {
                const ext = file.type.toLowerCase();
                let fileDoc;

                if (IMAGE_TYPES.has(ext)) {
                    const pagePdfBytes = await PdfPageBuilder.imageToPdfPage(file.buffer, ext);
                    fileDoc = await PDFDocument.load(pagePdfBytes);
                } else {
                    fileDoc = await PDFDocument.load(file.buffer, { ignoreEncryption: true });
                }

                const pageIndices = fileDoc.getPageIndices();
                const copiedPages = await finalDoc.copyPages(fileDoc, pageIndices);

                for (const page of copiedPages) {
                    finalDoc.addPage(page);
                    pageMetadata.push({ type: 'content', letter, pageNum });
                    pageNum++;
                }
            }
        }

        // Second pass: Bates stamps on content pages only
        progress(85, 'Applying Bates stamps...');
        const font = await finalDoc.embedFont(StandardFonts.Helvetica);

        for (let i = 0; i < pageMetadata.length; i++) {
            const meta = pageMetadata[i];
            if (meta.type !== 'content') continue;

            const page = finalDoc.getPages()[i];
            const batesNum = PdfPageBuilder.formatBatesNumber(meta.letter, meta.pageNum, padDigits);

            const fontSize = 9;
            const textWidth = font.widthOfTextAtSize(batesNum, fontSize);
            const textHeight = font.heightAtSize(fontSize);
            const padding = 4;

            const x = page.getWidth() - 36 - textWidth - padding;
            const y = 36;

            page.drawRectangle({
                x: x - padding, y: y - padding,
                width: textWidth + (padding * 2),
                height: textHeight + (padding * 2),
                color: rgb(1, 1, 1),
                borderColor: rgb(0.7, 0.7, 0.7),
                borderWidth: 0.5,
            });

            page.drawText(batesNum, {
                x, y, size: fontSize, font, color: rgb(0, 0, 0),
            });
        }

        // Save
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
