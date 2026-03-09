/**
 * File Upload Module
 * Handles uploading files to the server for exhibit processing.
 */

const FileUploader = (() => {

    /**
     * Upload files for a specific exhibit letter.
     * @param {string} sessionId
     * @param {string} letter - A-Z
     * @param {File[]} files - Array of File objects
     * @returns {Promise<Object>} Server response
     */
    async function uploadFiles(sessionId, letter, files) {
        const formData = new FormData();
        formData.append('sessionId', sessionId);
        formData.append('letter', letter);

        for (const file of files) {
            formData.append('files', file);
        }

        const response = await fetch('/api/exhibits/upload', {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ error: 'Upload failed' }));
            throw new Error(error.error || `Upload failed with status ${response.status}`);
        }

        return response.json();
    }

    /**
     * Upload all exhibits that have files.
     * @param {string} sessionId
     * @param {Object} exhibits - { A: [{file, name, ...}], B: [...] }
     * @param {Function} [onProgress] - (letter, status) => void
     * @returns {Promise<void>}
     */
    async function uploadAllExhibits(sessionId, exhibits, onProgress) {
        const letters = Object.keys(exhibits).filter(l => exhibits[l].length > 0).sort();

        // Bounded concurrency: upload up to 3 exhibits simultaneously
        const limit = 3;
        let nextIndex = 0;

        async function worker() {
            while (nextIndex < letters.length) {
                const idx = nextIndex++;
                const letter = letters[idx];
                if (onProgress) onProgress(letter, 'uploading');

                const files = exhibits[letter].map(entry => entry.file).filter(Boolean);
                if (files.length > 0) {
                    await uploadFiles(sessionId, letter, files);
                }

                if (onProgress) onProgress(letter, 'done');
            }
        }

        const workers = Array.from(
            { length: Math.min(limit, letters.length) },
            () => worker()
        );
        await Promise.all(workers);
    }

    return {
        uploadFiles,
        uploadAllExhibits,
    };
})();
