/**
 * Exhibit Manager
 * Minimal state for generate button and session tracking.
 * File assignment is handled by DropboxBrowserUI.
 */

const ExhibitManager = (() => {
    let sessionId = null;

    function init() {
        sessionId = crypto.randomUUID();
        updateGenerateButton();
    }

    function getSessionId() {
        return sessionId;
    }

    function updateGenerateButton() {
        const btn = document.getElementById('btn-generate');
        const hasDropboxFiles = typeof DropboxBrowserUI !== 'undefined' && DropboxBrowserUI.getTotalFiles() > 0;
        btn.disabled = !hasDropboxFiles;
    }

    function clearAll() {
        sessionId = crypto.randomUUID();
        updateGenerateButton();
    }

    // Initialize on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    return {
        getSessionId,
        clearAll,
        updateGenerateButton,
    };
})();
