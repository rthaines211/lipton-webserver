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
