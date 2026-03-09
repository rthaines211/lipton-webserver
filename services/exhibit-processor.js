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
const Sentry = require('@sentry/node');
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
     * @param {Function} [params.onProgress] - Progress callback: (percent, message, phase) => void
     * @returns {Promise<{outputPath: string, filename: string}|{duplicates: Object, paused: boolean}>}
     */
    static async process({ caseName, exhibits, outputDir, onProgress }) {
        const progress = onProgress || (() => {});

        // Step 1: Validate (0-5%)
        progress(2, 'Validating exhibits...', 'validation');
        ExhibitProcessor.validateExhibits(exhibits);
        const activeLetters = ExhibitProcessor.getActiveExhibits(exhibits);
        progress(5, `Validated ${activeLetters.length} exhibit(s)`, 'validation');

        // Step 2: Duplicate detection per exhibit (5-40%)
        const duplicateReport = {};
        let hasDuplicates = false;

        await Sentry.startSpan({ op: 'exhibit.duplicate_detection', name: 'Duplicate detection' }, async () => {
            for (let i = 0; i < activeLetters.length; i++) {
                const letter = activeLetters[i];
                const exhibitWeight = 35 / activeLetters.length; // 35% total for dup detection
                const exhibitBase = 5 + (i * exhibitWeight);

                logger.info(`[exhibit-processor] Starting dup detect Exhibit ${letter} files: ${exhibits[letter].map(f=>f.name+'/'+f.type).join(', ')}`);

                const result = await DuplicateDetector.detectDuplicates(
                    exhibits[letter],
                    (subPct, subMsg) => {
                        const pct = Math.round(exhibitBase + (subPct / 100) * exhibitWeight);
                        progress(pct, `Exhibit ${letter}: ${subMsg}`, 'duplicate_detection');
                    }
                );

                logger.info(`[exhibit-processor] Finished dup detect Exhibit ${letter}, dupes: ${result.duplicates.length}`);
                if (result.duplicates.length > 0) {
                    duplicateReport[letter] = result.duplicates;
                    hasDuplicates = true;

                    Sentry.addBreadcrumb({
                        category: 'exhibit.duplicates',
                        message: `Duplicates found in Exhibit ${letter}`,
                        level: 'warning',
                        data: { exhibit: letter, count: result.duplicates.length },
                    });
                }
            }
        });

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
        progress(30, 'Resuming after duplicate resolution...', 'processing');
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

        // Count total files and estimate pages for progress + padding
        let totalFiles = 0;
        let estimatedPages = 0;
        for (const letter of activeLetters) {
            totalFiles += exhibits[letter].length;
            estimatedPages += exhibits[letter].length * 2;
        }
        const padDigits = ExhibitProcessor.determinePadding(estimatedPages);

        const pageMetadata = [];
        let filesProcessed = 0;

        await Sentry.startSpan({ op: 'exhibit.pdf_assembly', name: 'PDF assembly' }, async (assemblySpan) => {
            for (let li = 0; li < activeLetters.length; li++) {
                const letter = activeLetters[li];
                const files = exhibits[letter];
                logger.info(`[exhibit-processor] _buildPdf: Processing Exhibit ${letter}, ${files.length} files`);

                // Add separator page
                const separatorBytes = await PdfPageBuilder.createSeparatorPage(letter);
                const separatorDoc = await PDFDocument.load(separatorBytes);
                const [separatorPage] = await finalDoc.copyPages(separatorDoc, [0]);
                finalDoc.addPage(separatorPage);
                pageMetadata.push({ type: 'separator' });

                // Process each file
                let pageNum = 1;
                for (const file of files) {
                    filesProcessed++;
                    const pct = 40 + Math.round((filesProcessed / totalFiles) * 45); // 40-85%
                    progress(pct, `Processing file ${filesProcessed} of ${totalFiles}: ${file.name}`, 'processing');

                    const ext = file.type.toLowerCase();
                    logger.info(`[exhibit-processor] Processing file: ${file.name} type=${ext}`);

                    if (IMAGE_TYPES.has(ext)) {
                        logger.info(`[exhibit-processor] addImagePage start: buffer type=${file.buffer?.constructor?.name} size=${file.buffer?.length}`);
                        await PdfPageBuilder.addImagePage(finalDoc, file.buffer, ext);
                        logger.info('[exhibit-processor] addImagePage complete');
                        pageMetadata.push({ type: 'content', letter, pageNum });
                        pageNum++;
                    } else {
                        const fileDoc = await PDFDocument.load(file.buffer, { ignoreEncryption: true });
                        const pageIndices = fileDoc.getPageIndices();
                        logger.info(`[exhibit-processor] Loaded PDF ${file.name}, pages=${fileDoc.getPageCount()}`);
                        const copiedPages = await finalDoc.copyPages(fileDoc, pageIndices);
                        for (const page of copiedPages) {
                            finalDoc.addPage(page);
                            pageMetadata.push({ type: 'content', letter, pageNum });
                            pageNum++;
                        }
                    }
                }
            }

            assemblySpan.setAttribute('exhibit.total_pages', pageMetadata.length);
            assemblySpan.setAttribute('exhibit.content_pages', pageMetadata.filter(m => m.type === 'content').length);
        });

        // Second pass: Bates stamps on content pages only (85-95%)
        logger.info('[exhibit-processor] All exhibits processed, starting Bates stamp pass');
        progress(85, 'Applying Bates stamps...', 'stamping');
        const font = await finalDoc.embedFont(StandardFonts.Helvetica);

        const contentPages = pageMetadata.reduce((count, m) => count + (m.type === 'content' ? 1 : 0), 0);
        let stampedCount = 0;

        for (let i = 0; i < pageMetadata.length; i++) {
            const meta = pageMetadata[i];
            if (meta.type !== 'content') continue;

            stampedCount++;
            if (stampedCount % 5 === 0 || stampedCount === contentPages) {
                const pct = 85 + Math.round((stampedCount / contentPages) * 10); // 85-95%
                progress(pct, `Stamping page ${stampedCount} of ${contentPages}`, 'stamping');
            }

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

        // Save (95-100%)
        logger.info('[exhibit-processor] Saving final PDF...');
        const saveStart = Date.now();
        progress(95, 'Saving exhibit package...', 'finalizing');
        const filename = ExhibitProcessor.generateOutputFilename(caseName);
        const outputPath = path.join(outputDir, filename);

        const pdfBytes = await Sentry.startSpan(
            { op: 'exhibit.pdf_save', name: 'PDF save to disk' },
            async (saveSpan) => {
                const bytes = await Promise.race([
                    finalDoc.save(),
                    new Promise((_, reject) => setTimeout(() => reject(new Error('pdf-lib save() timed out after 30s')), 30000)),
                ]);
                const saveDuration = Date.now() - saveStart;
                logger.info(`[exhibit-processor] Save complete in ${saveDuration}ms, bytes=${bytes.length}`);
                saveSpan.setAttribute('exhibit.pdf_size_bytes', bytes.length);
                saveSpan.setAttribute('exhibit.save_duration_ms', saveDuration);
                fs.writeFileSync(outputPath, bytes);
                return bytes;
            }
        );

        Sentry.addBreadcrumb({
            category: 'exhibit.complete',
            message: `Exhibit package saved: ${filename}`,
            level: 'info',
            data: {
                filename,
                sizeBytes: pdfBytes.length,
                saveDurationMs: Date.now() - saveStart,
                totalPages: pageMetadata.length,
            },
        });

        progress(100, 'Complete!', 'finalizing');
        return { outputPath, filename };
    }
}

module.exports = ExhibitProcessor;
