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
            const sharp = require('sharp');
            const pngBuffer = await sharp({
                create: { width: 200, height: 300, channels: 3, background: { r: 255, g: 0, b: 0 } }
            }).png().toBuffer();

            const pdfBytes = await PdfPageBuilder.imageToPdfPage(pngBuffer, 'png');
            const pdf = await PDFDocument.load(pdfBytes);

            expect(pdf.getPageCount()).toBe(1);
            const page = pdf.getPages()[0];
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
            const doc = await PDFDocument.create();
            doc.addPage([612, 792]);
            const pdfBytes = await doc.save();

            const stampedBytes = await PdfPageBuilder.addBatesStamp(pdfBytes, 0, 'EX-A-001');
            const stampedDoc = await PDFDocument.load(stampedBytes);

            expect(stampedDoc.getPageCount()).toBe(1);
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
