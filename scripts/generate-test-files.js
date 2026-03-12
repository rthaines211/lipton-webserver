#!/usr/bin/env node

/**
 * Generate 200 test files (mix of PDFs and images) for exhibit collector testing.
 *
 * Usage: node scripts/generate-test-files.js [outputDir]
 * Default output: ./test-exhibit-files/
 */

const fs = require('fs');
const path = require('path');
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const sharp = require('sharp');

const OUTPUT_DIR = process.argv[2] || path.join(__dirname, '..', 'test-exhibit-files');
const TOTAL_FILES = 200;
const PDF_RATIO = 0.6; // 60% PDFs, 40% images

const COLORS = [
    { r: 0.2, g: 0.4, b: 0.8 },  // blue
    { r: 0.8, g: 0.2, b: 0.2 },  // red
    { r: 0.2, g: 0.7, b: 0.3 },  // green
    { r: 0.6, g: 0.3, b: 0.7 },  // purple
    { r: 0.9, g: 0.5, b: 0.1 },  // orange
    { r: 0.1, g: 0.6, b: 0.6 },  // teal
];

const CATEGORIES = [
    'Lease', 'Invoice', 'Receipt', 'Letter', 'Notice', 'Report',
    'Photo', 'Contract', 'Statement', 'Inspection', 'Complaint', 'Response',
    'Motion', 'Order', 'Exhibit', 'Affidavit', 'Deposition', 'Discovery',
    'Correspondence', 'Certificate',
];

async function generatePDF(filePath, index) {
    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const boldFont = await doc.embedFont(StandardFonts.HelveticaBold);

    const color = COLORS[index % COLORS.length];
    const category = CATEGORIES[index % CATEGORIES.length];
    const pageCount = 1 + (index % 3); // 1-3 pages

    for (let p = 0; p < pageCount; p++) {
        const page = doc.addPage([612, 792]); // US Letter

        // Header bar
        page.drawRectangle({
            x: 0, y: 720, width: 612, height: 72,
            color: rgb(color.r, color.g, color.b),
        });

        page.drawText(`${category} Document #${index + 1}`, {
            x: 40, y: 745, size: 20, font: boldFont, color: rgb(1, 1, 1),
        });

        page.drawText(`Page ${p + 1} of ${pageCount}`, {
            x: 40, y: 725, size: 12, font, color: rgb(1, 1, 1),
        });

        // Body text
        const lines = [
            `Document Type: ${category}`,
            `File Number: ${String(index + 1).padStart(4, '0')}`,
            `Generated for testing purposes`,
            `Date: ${new Date().toLocaleDateString()}`,
            '',
            'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
            'Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
            'Ut enim ad minim veniam, quis nostrud exercitation ullamco.',
        ];

        lines.forEach((line, i) => {
            page.drawText(line, {
                x: 40, y: 680 - (i * 24), size: 12, font, color: rgb(0.2, 0.2, 0.2),
            });
        });
    }

    const bytes = await doc.save();
    fs.writeFileSync(filePath, bytes);
}

async function generateImage(filePath, index) {
    const color = COLORS[index % COLORS.length];
    const category = CATEGORIES[index % CATEGORIES.length];
    const isJpg = index % 2 === 0;

    // Create a colored rectangle with text overlay using sharp
    const width = 800;
    const height = 600;

    const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="rgb(${Math.round(color.r * 255)},${Math.round(color.g * 255)},${Math.round(color.b * 255)})"/>
        <rect x="40" y="40" width="${width - 80}" height="${height - 80}" rx="12" fill="white" opacity="0.9"/>
        <text x="${width / 2}" y="200" text-anchor="middle" font-family="Arial" font-size="36" font-weight="bold" fill="#333">
            ${category} #${index + 1}
        </text>
        <text x="${width / 2}" y="260" text-anchor="middle" font-family="Arial" font-size="18" fill="#666">
            Test image for exhibit collector
        </text>
        <text x="${width / 2}" y="300" text-anchor="middle" font-family="Arial" font-size="14" fill="#999">
            File ${String(index + 1).padStart(4, '0')} — ${new Date().toLocaleDateString()}
        </text>
    </svg>`;

    const buffer = Buffer.from(svg);

    if (isJpg) {
        await sharp(buffer).jpeg({ quality: 85 }).toFile(filePath);
    } else {
        await sharp(buffer).png().toFile(filePath);
    }
}

async function main() {
    if (!fs.existsSync(OUTPUT_DIR)) {
        fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }

    const pdfCount = Math.round(TOTAL_FILES * PDF_RATIO);
    const imageCount = TOTAL_FILES - pdfCount;

    console.log(`Generating ${TOTAL_FILES} test files in ${OUTPUT_DIR}`);
    console.log(`  ${pdfCount} PDFs, ${imageCount} images (JPG/PNG mix)`);

    let generated = 0;

    // Generate PDFs
    for (let i = 0; i < pdfCount; i++) {
        const category = CATEGORIES[i % CATEGORIES.length];
        const filename = `${category}_${String(i + 1).padStart(4, '0')}.pdf`;
        const filePath = path.join(OUTPUT_DIR, filename);
        await generatePDF(filePath, i);
        generated++;
        if (generated % 20 === 0) console.log(`  ${generated}/${TOTAL_FILES} files generated...`);
    }

    // Generate images
    for (let i = 0; i < imageCount; i++) {
        const category = CATEGORIES[i % CATEGORIES.length];
        const ext = i % 2 === 0 ? 'jpg' : 'png';
        const filename = `${category}_photo_${String(i + 1).padStart(4, '0')}.${ext}`;
        const filePath = path.join(OUTPUT_DIR, filename);
        await generateImage(filePath, i);
        generated++;
        if (generated % 20 === 0) console.log(`  ${generated}/${TOTAL_FILES} files generated...`);
    }

    console.log(`\nDone! ${generated} files generated in ${OUTPUT_DIR}`);
    console.log(`Upload this folder to Dropbox to test the exhibit collector.`);
}

main().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
