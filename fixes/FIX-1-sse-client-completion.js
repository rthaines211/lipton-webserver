/**
 * FIX #1: SSE Client - Handle Completion Event with Missing 'total' Field
 *
 * PROBLEM IDENTIFIED:
 * Server sends completion event with this structure:
 * {
 *   jobId: 'xxx',
 *   status: 'complete',
 *   message: 'Job completed or not found',
 *   phase: 'complete',
 *   progress: 100    ← Has 'progress' but NOT 'total'!
 * }
 *
 * But client code expects:
 * {
 *   total: <number>,
 *   outputUrl: <string>
 * }
 *
 * This causes undefined/undefined in logs and also may prevent proper cleanup.
 *
 * LOCATION: js/sse-client.js, line 187-219
 *
 * SOLUTION:
 * Extract 'total' from either data.total OR data.progress
 * Set default values if missing
 * Log warning if data structure is unexpected
 */

// Replace the handleCompleteEvent method in JobProgressStream class
// Lines 187-219 in js/sse-client.js

handleCompleteEvent(event) {
    // Immediately mark as completed to prevent any reconnection attempts
    this.jobCompleted = true;
    this.clearSilenceTimeout();
    this.clearReconnectTimeout(); // Cancel any pending reconnection attempts

    try {
        const data = JSON.parse(event.data);
        console.log(`✅ Job completed for ${this.jobId}:`, data);

        // ===== FIX: Handle missing 'total' field =====
        // Server may send 'progress: 100' instead of 'total'
        // Or may not include these fields at all for already-completed jobs
        let total = data.total;

        if (total === undefined && data.progress !== undefined) {
            // Use progress value as total if total is missing
            total = data.progress;
            console.log(`📊 Using progress (${data.progress}) as total since total field is missing`);
        }

        if (total === undefined) {
            // If still undefined, check if we have existing state
            if (typeof getJobState === 'function') {
                const existingState = getJobState(this.jobId);
                if (existingState && existingState.total !== undefined) {
                    total = existingState.total;
                    console.log(`📊 Using existing state total (${total}) since completion event missing total`);
                } else {
                    // Last resort: use a sentinel value
                    total = 0;
                    console.warn(`⚠️ No total available - using 0 as fallback for ${this.jobId}`);
                }
            } else {
                total = 0;
                console.warn(`⚠️ No total available - using 0 as fallback for ${this.jobId}`);
            }
        }

        // Ensure outputUrl has a value
        const outputUrl = data.outputUrl || data.url || '';
        // ===== END FIX =====

        // Update progress state with corrected values
        if (typeof markJobComplete === 'function') {
            markJobComplete(this.jobId, total, outputUrl);
        }

        // Show success toast
        if (typeof progressToast !== 'undefined' && progressToast.showSuccess) {
            progressToast.showSuccess(this.jobId, total, outputUrl);
        }

        // Call custom completion handler
        if (this.onComplete) {
            this.onComplete(data);
        }

        // Close connection after completion
        this.close();
    } catch (error) {
        console.error(`Failed to parse completion event for ${this.jobId}:`, error);
        // Still close the connection even if parsing failed
        this.close();
    }
}

/**
 * IMPLEMENTATION NOTES:
 *
 * 1. This fix handles three scenarios:
 *    a) Server sends 'total' field (ideal case)
 *    b) Server sends 'progress: 100' instead (your current case)
 *    c) Server sends neither (reconnect to already-completed job)
 *
 * 2. Fallback strategy:
 *    - First try data.total
 *    - Then try data.progress
 *    - Then try existing localStorage state
 *    - Finally use 0 as sentinel value
 *
 * 3. Logs warnings when using fallbacks so you can see when this happens
 *
 * 4. Does NOT break if server structure changes - degrades gracefully
 */
