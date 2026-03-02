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
                { name: 'file3.pdf', buffer: Buffer.from('content A') },
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
