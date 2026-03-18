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

    describe('process with disk-based files', () => {
        it('should accept file objects with filePath instead of buffer', async () => {
            // Create a real PDF file on disk
            const pdfDoc = await PDFDocument.create();
            pdfDoc.addPage([612, 792]);
            const pdfBytes = await pdfDoc.save();
            const filePath = path.join(tempDir, 'test.pdf');
            fs.writeFileSync(filePath, Buffer.from(pdfBytes));

            const exhibits = {
                A: [{ name: 'test.pdf', type: 'pdf', filePath }],
            };

            const result = await ExhibitProcessor.process({
                caseName: 'Disk Test',
                exhibits,
                outputDir: tempDir,
                onProgress: () => {},
            });

            expect(result.filename).toBeDefined();
            expect(result.pdfBuffer).toBeInstanceOf(Uint8Array);
        });

        it('should support mixed buffer and filePath inputs', async () => {
            const pdfDoc1 = await PDFDocument.create();
            pdfDoc1.addPage([612, 792]);
            const pdfBytes1 = await pdfDoc1.save();

            const pdfDoc2 = await PDFDocument.create();
            pdfDoc2.addPage([400, 600]);
            const pdfBytes2 = await pdfDoc2.save();

            const filePath = path.join(tempDir, 'disk.pdf');
            fs.writeFileSync(filePath, Buffer.from(pdfBytes2));

            const exhibits = {
                A: [
                    { name: 'memory.pdf', type: 'pdf', buffer: Buffer.from(pdfBytes1) },
                    { name: 'disk.pdf', type: 'pdf', filePath },
                ],
            };

            const result = await ExhibitProcessor.process({
                caseName: 'Mixed Test',
                exhibits,
                outputDir: tempDir,
                onProgress: () => {},
            });

            expect(result.filename).toBeDefined();
        });
    });

    describe('scanForDuplicates', () => {
        it('should return duplicate groups with thumbnails and file metadata when duplicates found', async () => {
            const buf = fs.readFileSync(path.join(__dirname, '../../test-exhibit-files/Affidavit_photo_0016.png'));
            const result = await ExhibitProcessor.scanForDuplicates({
                exhibits: { A: [
                    { name: 'a.png', buffer: buf, type: 'png' },
                    { name: 'b.png', buffer: buf, type: 'png' },
                ]},
                generateThumbnails: true,
            });
            expect(result).not.toBeNull();
            expect(result.groups.A).toBeDefined();
            expect(result.groups.A[0]).toHaveProperty('groupId');
            expect(result.groups.A[0]).toHaveProperty('files');
            expect(result.groups.A[0]).toHaveProperty('edges');
            expect(result.groups.A[0]).toHaveProperty('thumbnails');
            expect(result.groups.A[0]).toHaveProperty('fileMetadata');
            // Check file metadata has size and dimensions for images
            const metadata = result.groups.A[0].fileMetadata['a.png'];
            expect(metadata.size).toBeGreaterThan(0);
            expect(metadata.width).toBeGreaterThan(0);
            expect(metadata.height).toBeGreaterThan(0);
            expect(result.totalGroups).toBe(1);
            expect(result.totalFiles).toBeGreaterThanOrEqual(2);
        });

        it('should return null when no duplicates found', async () => {
            const pdfDoc1 = await PDFDocument.create();
            pdfDoc1.addPage([612, 792]);
            const pdfDoc2 = await PDFDocument.create();
            pdfDoc2.addPage([400, 600]);

            const result = await ExhibitProcessor.scanForDuplicates({
                exhibits: { A: [
                    { name: 'doc1.pdf', type: 'pdf', buffer: Buffer.from(await pdfDoc1.save()) },
                    { name: 'doc2.pdf', type: 'pdf', buffer: Buffer.from(await pdfDoc2.save()) },
                ]},
            });
            expect(result).toBeNull();
        });
    });

    describe('process without duplicate detection', () => {
        it('should build PDF directly without pausing for duplicates', async () => {
            const pdfDoc = await PDFDocument.create();
            pdfDoc.addPage([612, 792]);
            const pdfBytes = await pdfDoc.save();

            const exhibits = {
                A: [
                    { name: 'doc1.pdf', type: 'pdf', buffer: Buffer.from(pdfBytes) },
                    { name: 'doc2.pdf', type: 'pdf', buffer: Buffer.from(pdfBytes) }, // same content = would be duplicate
                ],
            };

            const result = await ExhibitProcessor.process({
                caseName: 'No Dup Check Test',
                exhibits,
                outputDir: tempDir,
                onProgress: () => {},
            });

            // process() no longer does duplicate detection — should produce output directly
            expect(result.paused).toBeFalsy();
            expect(result.filename).toBeDefined();
        });
    });
});
