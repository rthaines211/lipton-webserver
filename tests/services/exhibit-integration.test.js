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
        expect(result.duplicates.A[0].files).toHaveLength(2);
        expect(result.duplicates.A[0].edges[0].matchType).toBe('EXACT_DUPLICATE');
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

    describe('Group duplicate detection integration', () => {
        it('should detect a group of 3 exact duplicates and resolve correctly', async () => {
            const buf = await sharp({
                create: { width: 100, height: 100, channels: 3, background: { r: 128, g: 64, b: 32 } }
            }).png().toBuffer();

            const exhibits = {
                A: [
                    { name: 'original.png', buffer: buf, type: 'png' },
                    { name: 'copy1.png', buffer: Buffer.from(buf), type: 'png' },
                    { name: 'copy2.png', buffer: Buffer.from(buf), type: 'png' },
                ],
            };

            const result = await ExhibitProcessor.process({
                caseName: 'GroupTest',
                exhibits,
                outputDir: tempDir,
            });

            expect(result.paused).toBe(true);
            const groups = result.duplicates.A;
            expect(groups).toHaveLength(1);
            expect(groups[0].files).toHaveLength(3);
            expect(groups[0].files).toContain('original.png');
            expect(groups[0].files).toContain('copy1.png');
            expect(groups[0].files).toContain('copy2.png');

            // Simulate resolution: keep original, remove copies
            const filesToRemove = new Set(['copy1.png', 'copy2.png']);
            exhibits.A = exhibits.A.filter(f => !filesToRemove.has(f.name));
            expect(exhibits.A).toHaveLength(1);
            expect(exhibits.A[0].name).toBe('original.png');
        }, 30000);

        it('should detect two separate groups in one exhibit', async () => {
            const buf1 = await sharp({
                create: { width: 100, height: 100, channels: 3, background: { r: 255, g: 0, b: 0 } }
            }).png().toBuffer();
            const buf2 = await sharp({
                create: { width: 100, height: 100, channels: 3, background: { r: 0, g: 0, b: 255 } }
            }).png().toBuffer();
            const buf3 = await sharp({
                create: { width: 100, height: 100, channels: 3, background: { r: 0, g: 255, b: 0 } }
            }).png().toBuffer();

            const exhibits = {
                A: [
                    { name: 'set1-a.png', buffer: buf1, type: 'png' },
                    { name: 'set1-b.png', buffer: Buffer.from(buf1), type: 'png' },
                    { name: 'set2-a.png', buffer: buf2, type: 'png' },
                    { name: 'set2-b.png', buffer: Buffer.from(buf2), type: 'png' },
                    { name: 'unique.png', buffer: buf3, type: 'png' },
                ],
            };

            const result = await ExhibitProcessor.process({
                caseName: 'MultiGroupTest',
                exhibits,
                outputDir: tempDir,
            });

            expect(result.paused).toBe(true);
            const groups = result.duplicates.A;
            expect(groups).toHaveLength(2);
        }, 30000);
    });
});
