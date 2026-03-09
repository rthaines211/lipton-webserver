/**
 * Process items with bounded concurrency.
 * @param {Array} items - Items to process
 * @param {Function} fn - Async function to apply to each item: (item, index) => Promise<result>
 * @param {number} [limit=4] - Max concurrent operations
 * @returns {Promise<Array>} Results in original order
 */
async function processWithConcurrency(items, fn, limit = 4) {
    const results = new Array(items.length);
    let nextIndex = 0;

    async function worker() {
        while (nextIndex < items.length) {
            const index = nextIndex++;
            results[index] = await fn(items[index], index);
        }
    }

    const workers = Array.from({ length: Math.min(limit, items.length) }, () => worker());
    await Promise.all(workers);
    return results;
}

module.exports = { processWithConcurrency };
