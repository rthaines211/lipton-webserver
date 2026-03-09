const { processWithConcurrency } = require('../../utils/concurrency');

describe('processWithConcurrency', () => {
    test('processes all items and returns results in order', async () => {
        const items = [1, 2, 3, 4, 5];
        const fn = async (item) => item * 2;
        const results = await processWithConcurrency(items, fn, 2);
        expect(results).toEqual([2, 4, 6, 8, 10]);
    });

    test('respects concurrency limit', async () => {
        let running = 0;
        let maxRunning = 0;
        const items = [1, 2, 3, 4, 5, 6];
        const fn = async (item) => {
            running++;
            maxRunning = Math.max(maxRunning, running);
            await new Promise(r => setTimeout(r, 50));
            running--;
            return item;
        };
        await processWithConcurrency(items, fn, 3);
        expect(maxRunning).toBeLessThanOrEqual(3);
    });

    test('handles empty array', async () => {
        const results = await processWithConcurrency([], async (x) => x, 4);
        expect(results).toEqual([]);
    });

    test('propagates errors', async () => {
        const items = [1, 2, 3];
        const fn = async (item) => {
            if (item === 2) throw new Error('boom');
            return item;
        };
        await expect(processWithConcurrency(items, fn, 2)).rejects.toThrow('boom');
    });
});
