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
    }, 30000);

    it('should detect exact duplicates and pause', async () => {
        const pdfDoc = await PDFDocument.create();
        pdfDoc.addPage([612, 792]);
        const pdfBuffer = Buffer.from(await pdfDoc.save());

        const exhibits = {
            A: [
                { name: 'original.pdf', type: 'pdf', buffer: pdfBuffer },
                { name: 'copy.pdf', type: 'pdf', buffer: Buffer.from(pdfBuffer) },
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
    }, 15000);

    it('should resume after duplicate resolution and produce output', async () => {
        const pngBuffer = await sharp({
            create: { width: 400, height: 300, channels: 3, background: { r: 100, g: 150, b: 200 } }
        }).png().toBuffer();

        const exhibits = {
            C: [
                { name: 'exhibit-c.png', type: 'png', buffer: pngBuffer },
            ],
        };

        const result = await ExhibitProcessor.resume({
            caseName: 'Resume Test',
            exhibits,
            outputDir: tempDir,
        });

        expect(result.outputPath).toBeDefined();
        expect(result.filename).toBe('Resume_Test_Exhibits.pdf');

        const outputBytes = fs.readFileSync(result.outputPath);
        const outputDoc = await PDFDocument.load(outputBytes);
        // separator C + image page = 2 pages
        expect(outputDoc.getPageCount()).toBe(2);
    }, 15000);

    it('should handle multiple pages in a single PDF file', async () => {
        const pdfDoc = await PDFDocument.create();
        pdfDoc.addPage([612, 792]);
        pdfDoc.addPage([612, 792]);
        pdfDoc.addPage([612, 792]);
        const threePager = Buffer.from(await pdfDoc.save());

        const exhibits = {
            A: [
                { name: 'multi-page.pdf', type: 'pdf', buffer: threePager },
            ],
        };

        const result = await ExhibitProcessor.process({
            caseName: 'Multi Page',
            exhibits,
            outputDir: tempDir,
        });

        expect(result.filename).toBe('Multi_Page_Exhibits.pdf');

        const outputBytes = fs.readFileSync(result.outputPath);
        const outputDoc = await PDFDocument.load(outputBytes);
        // separator A + 3 pages = 4 pages
        expect(outputDoc.getPageCount()).toBe(4);
    }, 15000);
});
