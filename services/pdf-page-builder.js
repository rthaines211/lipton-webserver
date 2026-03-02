/**
 * PDF Page Builder Service
 *
 * Creates separator pages, converts images to PDF pages, and applies Bates stamps.
 * Used by the Exhibit Collector pipeline.
 *
 * @module services/pdf-page-builder
 */

const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');
const sharp = require('sharp');

// US Letter dimensions in points (72 points per inch)
const PAGE_WIDTH = 612;   // 8.5 inches
const PAGE_HEIGHT = 792;  // 11 inches
const MARGIN = 54;        // 0.75 inches

class PdfPageBuilder {
    /**
     * Create an exhibit separator page with centered letter.
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

        page.drawText(text, { x, y, size: fontSize, font, color: rgb(0, 0, 0) });

        // Horizontal rules (2 inches = 144 points wide, centered)
        const ruleWidth = 144;
        const ruleX = (PAGE_WIDTH - ruleWidth) / 2;

        page.drawLine({
            start: { x: ruleX, y: y + textHeight + 20 },
            end: { x: ruleX + ruleWidth, y: y + textHeight + 20 },
            thickness: 1.5, color: rgb(0, 0, 0),
        });
        page.drawLine({
            start: { x: ruleX, y: y - 20 },
            end: { x: ruleX + ruleWidth, y: y - 20 },
            thickness: 1.5, color: rgb(0, 0, 0),
        });

        return doc.save();
    }

    /**
     * Convert an image buffer to a single-page US Letter PDF.
     * Image is centered on the page within margins, aspect ratio preserved.
     * @param {Buffer} imageBuffer - Raw image data
     * @param {string} format - Image format: 'png', 'jpg', 'jpeg', 'tiff', 'heic'
     * @returns {Promise<Uint8Array>} PDF bytes
     */
    static async imageToPdfPage(imageBuffer, format) {
        // Always convert to JPEG for embedding — pdf-lib's pure-JS PNG decoder hangs
        // on large RGBA images (e.g. retina screenshots). JPEG embedding is fast and
        // handles all input formats including HEIC, TIFF, and alpha-channel PNGs.
        const jpgBuffer = await sharp(imageBuffer)
            .flatten({ background: { r: 255, g: 255, b: 255 } })
            .toColorspace('srgb')
            .jpeg({ quality: 92 })
            .toBuffer();

        const doc = await PDFDocument.create();
        const page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);

        const metadata = await sharp(imageBuffer).metadata();
        const imgWidth = metadata.width;
        const imgHeight = metadata.height;

        const maxWidth = PAGE_WIDTH - (MARGIN * 2);
        const maxHeight = PAGE_HEIGHT - (MARGIN * 2);
        const scale = Math.min(maxWidth / imgWidth, maxHeight / imgHeight, 1);
        const scaledWidth = imgWidth * scale;
        const scaledHeight = imgHeight * scale;
        const x = (PAGE_WIDTH - scaledWidth) / 2;
        const y = (PAGE_HEIGHT - scaledHeight) / 2;

        let image;
        {
            image = await doc.embedJpg(jpgBuffer);
        }

        page.drawImage(image, { x, y, width: scaledWidth, height: scaledHeight });
        return doc.save();
    }

    /**
     * Embed an image directly into an existing PDFDocument as a new page.
     * Avoids the intermediate PDF + copyPages path which causes pdf-lib to hang
     * on save when large PNG blobs are involved.
     * @param {PDFDocument} doc - The target PDFDocument to add the page to
     * @param {Buffer} imageBuffer - Raw image data
     * @param {string} format - Image format: 'png', 'jpg', 'jpeg', 'tiff', 'heic'
     */
    static async addImagePage(doc, imageBuffer, format) {
        const jpgBuffer = await sharp(imageBuffer)
            .flatten({ background: { r: 255, g: 255, b: 255 } })
            .toColorspace('srgb')
            .jpeg({ quality: 92 })
            .toBuffer();

        const metadata = await sharp(imageBuffer).metadata();
        const imgWidth = metadata.width;
        const imgHeight = metadata.height;

        const maxWidth = PAGE_WIDTH - (MARGIN * 2);
        const maxHeight = PAGE_HEIGHT - (MARGIN * 2);
        const scale = Math.min(maxWidth / imgWidth, maxHeight / imgHeight, 1);
        const scaledWidth = imgWidth * scale;
        const scaledHeight = imgHeight * scale;
        const x = (PAGE_WIDTH - scaledWidth) / 2;
        const y = (PAGE_HEIGHT - scaledHeight) / 2;

        const image = await doc.embedJpg(jpgBuffer);
        const page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
        page.drawImage(image, { x, y, width: scaledWidth, height: scaledHeight });
    }

    /**
     * Add a Bates stamp to a specific page of a PDF.
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

        const x = page.getWidth() - 36 - textWidth - padding;
        const y = 36;

        page.drawRectangle({
            x: x - padding, y: y - padding,
            width: textWidth + (padding * 2), height: textHeight + (padding * 2),
            color: rgb(1, 1, 1),
            borderColor: rgb(0.7, 0.7, 0.7), borderWidth: 0.5,
        });

        page.drawText(batesNumber, { x, y, size: fontSize, font, color: rgb(0, 0, 0) });
        return doc.save();
    }

    /**
     * Format a Bates number string.
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
