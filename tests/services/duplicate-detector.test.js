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

    describe('computeDHash', () => {
        const sharp = require('sharp');

        it('should return a BigInt hash for a valid image', async () => {
            const buf = await sharp({
                create: { width: 100, height: 100, channels: 3, background: { r: 128, g: 128, b: 128 } }
            }).png().toBuffer();

            const hash = await DuplicateDetector.computeDHash(buf);
            expect(typeof hash).toBe('bigint');
        });

        it('should be deterministic (same buffer → same hash)', async () => {
            const buf = await sharp({
                create: { width: 50, height: 50, channels: 3, background: { r: 200, g: 100, b: 50 } }
            }).png().toBuffer();

            const hash1 = await DuplicateDetector.computeDHash(buf);
            const hash2 = await DuplicateDetector.computeDHash(buf);
            expect(hash1).toBe(hash2);
        });

        it('should produce similar hashes for the same image at different resolutions', async () => {
            const small = await sharp({
                create: { width: 100, height: 100, channels: 3, background: { r: 255, g: 0, b: 0 } }
            }).png().toBuffer();
            const large = await sharp({
                create: { width: 200, height: 200, channels: 3, background: { r: 255, g: 0, b: 0 } }
            }).png().toBuffer();

            const hash1 = await DuplicateDetector.computeDHash(small);
            const hash2 = await DuplicateDetector.computeDHash(large);
            expect(DuplicateDetector.hammingDistance(hash1, hash2)).toBeLessThanOrEqual(15);
        });

        it('should produce different hashes for visually distinct images', async () => {
            const white = await sharp({
                create: { width: 100, height: 100, channels: 3, background: { r: 255, g: 255, b: 255 } }
            }).png().toBuffer();
            const gradient = await sharp(
                Buffer.from(Array.from({ length: 100 * 100 * 3 }, (_, i) => (i % 256))),
                { raw: { width: 100, height: 100, channels: 3 } }
            ).png().toBuffer();

            const hash1 = await DuplicateDetector.computeDHash(white);
            const hash2 = await DuplicateDetector.computeDHash(gradient);
            expect(hash1).not.toBe(hash2);
        });

        it('should return null for corrupt buffer', async () => {
            const hash = await DuplicateDetector.computeDHash(Buffer.from('not an image'));
            expect(hash).toBeNull();
        });
    });

    describe('hammingDistance', () => {
        it('should return 0 for identical hashes', () => {
            expect(DuplicateDetector.hammingDistance(0n, 0n)).toBe(0);
            expect(DuplicateDetector.hammingDistance(0xFFn, 0xFFn)).toBe(0);
        });

        it('should return 64 when all bits differ', () => {
            const allOnes = (1n << 64n) - 1n;
            expect(DuplicateDetector.hammingDistance(0n, allOnes)).toBe(64);
        });

        it('should return correct distance for known pairs', () => {
            // 1010 vs 1001 → bits 0 and 1 differ
            expect(DuplicateDetector.hammingDistance(0b1010n, 0b1001n)).toBe(2);
        });

        it('should return 15 for exactly 15 differing bits (boundary: included)', () => {
            // First 15 bits set = 0x7FFF
            const hash = (1n << 15n) - 1n;
            expect(DuplicateDetector.hammingDistance(0n, hash)).toBe(15);
        });

        it('should return 16 for exactly 16 differing bits (boundary: excluded)', () => {
            const hash = (1n << 16n) - 1n;
            expect(DuplicateDetector.hammingDistance(0n, hash)).toBe(16);
        });
    });

    describe('findVisualMatches with dHash pre-filter', () => {
        const sharp = require('sharp');

        it('should detect identical images as VISUAL_MATCH', async () => {
            const img = await sharp({
                create: { width: 100, height: 100, channels: 3, background: { r: 255, g: 0, b: 0 } }
            }).png().toBuffer();

            const files = [
                { name: 'img1.png', buffer: img, type: 'png' },
                { name: 'img2.png', buffer: Buffer.from(img), type: 'png' },
            ];

            const { matches } = await DuplicateDetector.findVisualMatches(files);
            expect(matches).toHaveLength(1);
            expect(matches[0].matchType).toBe('VISUAL_MATCH');
            expect(matches[0].confidence).toBe(100);
        });

        it('should filter out very different images via dHash', async () => {
            const white = await sharp({
                create: { width: 100, height: 100, channels: 3, background: { r: 255, g: 255, b: 255 } }
            }).png().toBuffer();
            const gradient = await sharp(
                Buffer.from(Array.from({ length: 100 * 100 * 3 }, (_, i) => (i % 256))),
                { raw: { width: 100, height: 100, channels: 3 } }
            ).png().toBuffer();

            const files = [
                { name: 'white.png', buffer: white, type: 'png' },
                { name: 'gradient.png', buffer: gradient, type: 'png' },
            ];

            const { matches, maybePairs } = await DuplicateDetector.findVisualMatches(files);
            expect(matches).toHaveLength(0);
            expect(maybePairs).toHaveLength(0);
        });

        it('should report filtered candidate count in progress callback', async () => {
            const img = await sharp({
                create: { width: 100, height: 100, channels: 3, background: { r: 255, g: 0, b: 0 } }
            }).png().toBuffer();

            const files = [
                { name: 'a.png', buffer: img, type: 'png' },
                { name: 'b.png', buffer: Buffer.from(img), type: 'png' },
            ];

            const progressCalls = [];
            await DuplicateDetector.findVisualMatches(files, new Set(), (completed, total) => {
                progressCalls.push({ completed, total });
            });

            expect(progressCalls.length).toBeGreaterThan(0);
            // totalPairs should reflect candidate count, not all possible pairs
            expect(progressCalls[0].total).toBeGreaterThanOrEqual(1);
        });

        it('should include pair when one file has null dHash (fallback)', async () => {
            const img = await sharp({
                create: { width: 100, height: 100, channels: 3, background: { r: 255, g: 0, b: 0 } }
            }).png().toBuffer();

            const files = [
                { name: 'good.png', buffer: img, type: 'png' },
                { name: 'bad.png', buffer: Buffer.from('corrupt'), type: 'png' },
            ];

            // computeDHash will return null for the corrupt buffer.
            // The pair should still be attempted (and will fail at pixel comparison,
            // but the point is it wasn't filtered out by hamming distance).
            // We spy on computeVisualSimilarity to confirm it was called.
            const spy = jest.spyOn(DuplicateDetector, 'computeVisualSimilarity');
            await DuplicateDetector.findVisualMatches(files);

            // computeVisualSimilarity should have been called (pair wasn't filtered out)
            expect(spy).toHaveBeenCalled();
            spy.mockRestore();
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
