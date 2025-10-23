/**
 * SSE Client Module
 *
 * Manages Server-Sent Events connections with automatic reconnection,
 * error handling, and state persistence for job progress tracking.
 *
 * @module SSEClient
 */

// Use global variables instead of ES6 imports
// These will be available after the scripts are loaded

/**
 * Job Progress Stream Manager
 * Handles SSE connections with reconnection logic and error handling
 */
class JobProgressStream {
    constructor(jobId, sseUrl = '') {
        this.jobId = jobId;

        // Use current server if no URL provided (same-origin)
        const baseUrl = sseUrl || window.location.origin;

        // Extract authentication token from current page URL
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get('token');

        // Build SSE URL with authentication token
        const streamPath = `/api/jobs/${jobId}/stream`;
        if (token) {
            this.sseUrl = `${baseUrl}${streamPath}?token=${token}`;
            console.log(`🔐 SSE URL with auth token: ${baseUrl}${streamPath}?token=${token.substring(0, 10)}...`);
        } else {
            this.sseUrl = `${baseUrl}${streamPath}`;
            console.warn('⚠️ No authentication token found in URL - SSE connection may fail');
        }

        this.eventSource = null;
        this.isConnected = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 6; // 1s, 2s, 4s, 8s, 10s, 10s = ~2 minutes
        this.reconnectDelays = [1000, 2000, 4000, 8000, 10000, 10000];
        this.silenceTimeout = null;
        this.reconnectTimeout = null; // Track pending reconnection timeout
        this.silenceThreshold = 20000; // 20 seconds
        this.lastEventTime = Date.now();
        this.isDestroyed = false;
        this.jobCompleted = false; // Track if job has completed

        // Event handlers
        this.onProgress = null;
        this.onComplete = null;
        this.onError = null;
        this.onReconnect = null;

        console.log(`🔌 Initializing SSE stream for job: ${jobId}`);
    }

    /**
     * Connect to SSE stream
     */
    connect() {
        // Prevent connection if already completed or destroyed
        if (this.isDestroyed || this.jobCompleted) {
            console.warn(`SSE stream for ${this.jobId} is ${this.jobCompleted ? 'already completed' : 'destroyed'}, cannot connect`);
            this.clearReconnectTimeout(); // Ensure any pending reconnects are cancelled
            return;
        }

        // Prevent duplicate connections
        if (this.eventSource && this.isConnected) {
            console.warn(`SSE stream for ${this.jobId} is already connected`);
            return;
        }

        // Clear any pending reconnect timeout since we're connecting now
        this.clearReconnectTimeout();

        try {
            this.eventSource = new EventSource(this.sseUrl);
            this.setupEventHandlers();
            this.startSilenceDetection();
            console.log(`📡 Connected to SSE stream: ${this.sseUrl.replace(/token=[^&]*/, 'token=***')}`);
        } catch (error) {
            console.error(`Failed to create SSE connection for ${this.jobId}:`, error);
            this.handleConnectionError();
        }
    }

    /**
     * Setup SSE event handlers
     */
    setupEventHandlers() {
        if (!this.eventSource) return;

        // Handle connection open
        this.eventSource.onopen = (event) => {
            console.log(`✅ SSE connection opened for ${this.jobId}`);
            this.isConnected = true;
            this.reconnectAttempts = 0;
            this.lastEventTime = Date.now();

            // Toast notification removed - check console for reconnection status

            if (this.onReconnect) {
                this.onReconnect();
            }
        };

        // Handle progress events
        this.eventSource.addEventListener('progress', (event) => {
            this.handleProgressEvent(event);
        });

        // Handle completion events
        this.eventSource.addEventListener('complete', (event) => {
            this.handleCompleteEvent(event);
        });

        // Handle error events
        this.eventSource.addEventListener('error', (event) => {
            this.handleErrorEvent(event);
        });

        // Handle connection errors
        this.eventSource.onerror = (event) => {
            // Check if we should handle this error
            if (this.jobCompleted || this.isDestroyed) {
                console.log(`SSE error for ${this.jobId} but job is ${this.jobCompleted ? 'completed' : 'destroyed'}, forcing close`);
                // Force close the connection to prevent automatic reconnection
                if (this.eventSource) {
                    this.eventSource.close();
                    this.eventSource = null;
                }
                this.isConnected = false;
                return;
            }
            console.error(`SSE connection error for ${this.jobId}:`, event);
            this.handleConnectionError();
        };

        // Handle connection close
        this.eventSource.onclose = (event) => {
            console.log(`SSE connection closed for ${this.jobId}`);
            this.isConnected = false;
        };
    }

    /**
     * Handle progress events
     * @param {MessageEvent} event - SSE progress event
     */
    handleProgressEvent(event) {
        try {
            const data = JSON.parse(event.data);
            console.log(`📊 Progress update for ${this.jobId}:`, data);

            this.lastEventTime = Date.now();

            // Update progress state
            if (typeof updateJobProgress === 'function') {
                updateJobProgress(this.jobId, data.current, data.total, data.message);
            }

            // Toast notification removed - check console for progress updates

            // Call custom progress handler
            if (this.onProgress) {
                this.onProgress(data);
            }
        } catch (error) {
            console.error(`Failed to parse progress event for ${this.jobId}:`, error);
        }
    }

    /**
     * Handle completion events
     * @param {MessageEvent} event - SSE completion event
     */
    handleCompleteEvent(event) {
        // Immediately mark as completed to prevent any reconnection attempts
        this.jobCompleted = true;
        this.clearSilenceTimeout();
        this.clearReconnectTimeout(); // Cancel any pending reconnection attempts

        try {
            const data = JSON.parse(event.data);
            console.log(`✅ Job completed for ${this.jobId}:`, data);

            // Update progress state
            if (typeof markJobComplete === 'function') {
                markJobComplete(this.jobId, data.total, data.outputUrl);
            }

            // Toast notification removed - check console for completion status

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
     * Handle error events
     * @param {MessageEvent} event - SSE error event
     */
    handleErrorEvent(event) {
        // Check if this is a server-sent error event with data
        if (event.data === undefined || event.data === null) {
            // This is a browser connection error, not a server error event
            // The onerror handler will handle the reconnection logic
            return;
        }

        // Immediately mark as completed to prevent reconnection after server error
        this.jobCompleted = true;
        this.clearSilenceTimeout();
        this.clearReconnectTimeout(); // Cancel any pending reconnection attempts

        try {
            const data = JSON.parse(event.data);
            console.error(`❌ Job failed for ${this.jobId}:`, data);

            // Update progress state
            if (typeof markJobFailed === 'function') {
                markJobFailed(this.jobId, data.code, data.message);
            }

            // Toast notification removed - check console for error details

            // Call custom error handler
            if (this.onError) {
                this.onError(data);
            }

            // Close connection after error
            this.close();
        } catch (error) {
            console.error(`Failed to parse server error event for ${this.jobId}:`, error);
            console.error(`Raw event data:`, event.data);
            // Still close the connection even if parsing failed
            this.close();
        }
    }

    /**
     * Handle connection errors with reconnection logic
     */
    handleConnectionError() {
        this.isConnected = false;

        // Don't reconnect if job is already completed
        if (this.jobCompleted) {
            console.log(`Job ${this.jobId} already completed, not reconnecting`);
            this.clearSilenceTimeout();
            this.clearReconnectTimeout();
            // Ensure connection is closed
            if (this.eventSource) {
                this.eventSource.close();
                this.eventSource = null;
            }
            return;
        }

        // Don't reconnect if explicitly destroyed
        if (this.isDestroyed) {
            console.log(`SSE stream for ${this.jobId} is destroyed, not reconnecting`);
            this.clearReconnectTimeout();
            // Ensure connection is closed
            if (this.eventSource) {
                this.eventSource.close();
                this.eventSource = null;
            }
            return;
        }

        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error(`Max reconnection attempts reached for ${this.jobId}`);
            this.showConnectionFailed();
            return;
        }

        const delay = this.reconnectDelays[this.reconnectAttempts];
        this.reconnectAttempts++;

        console.log(`🔄 Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

        // Toast notification removed - check console for reconnection attempts

        // Clear any existing reconnect timeout before scheduling a new one
        this.clearReconnectTimeout();

        // Store timeout ID so we can cancel it if job completes
        this.reconnectTimeout = setTimeout(() => {
            this.reconnectTimeout = null;
            if (!this.isDestroyed && !this.jobCompleted) {
                this.connect();
            }
        }, delay);
    }

    /**
     * Start silence detection to detect connection issues
     */
    startSilenceDetection() {
        this.clearSilenceTimeout();

        this.silenceTimeout = setInterval(() => {
            const timeSinceLastEvent = Date.now() - this.lastEventTime;

            if (timeSinceLastEvent > this.silenceThreshold && this.isConnected) {
                console.warn(`SSE silence detected for ${this.jobId} (${timeSinceLastEvent}ms)`);
                this.handleConnectionError();
            }
        }, 5000); // Check every 5 seconds
    }

    /**
     * Clear silence detection timeout
     */
    clearSilenceTimeout() {
        if (this.silenceTimeout) {
            clearInterval(this.silenceTimeout);
            this.silenceTimeout = null;
        }
    }

    /**
     * Clear pending reconnection timeout
     * Prevents reconnection attempts after job completion
     */
    clearReconnectTimeout() {
        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = null;
            console.log(`🛑 Cancelled pending reconnection for ${this.jobId}`);
        }
    }

    /**
     * Show connection failed error
     */
    showConnectionFailed() {
        // Toast notification removed - check console for connection status
        console.error(`Max reconnection attempts reached for ${this.jobId}`);
    }

    /**
     * Close SSE connection
     */
    close() {
        console.log(`🔌 Closing SSE connection for ${this.jobId}`);
        this.isDestroyed = true;
        this.clearSilenceTimeout();
        this.clearReconnectTimeout(); // Cancel any pending reconnection attempts

        if (this.eventSource) {
            // Remove all event listeners to prevent any further events
            this.eventSource.onopen = null;
            this.eventSource.onerror = null;
            this.eventSource.onclose = null;
            this.eventSource.onmessage = null;

            // Close the connection
            this.eventSource.close();
            this.eventSource = null;
        }

        this.isConnected = false;
    }

    /**
     * Reconnect to SSE stream
     */
    reconnect() {
        // Don't reconnect if job is completed
        if (this.jobCompleted) {
            console.log(`❌ Cannot reconnect - job ${this.jobId} is already completed`);
            return;
        }

        console.log(`🔄 Manual reconnect requested for ${this.jobId}`);
        this.close();
        this.reconnectAttempts = 0;
        this.isDestroyed = false;
        this.jobCompleted = false; // Reset in case of manual reconnect
        this.connect();
    }

    /**
     * Check if connection is active
     * @returns {boolean} True if connected
     */
    isActive() {
        return this.isConnected && !this.isDestroyed;
    }

    /**
     * Get connection status
     * @returns {Object} Connection status information
     */
    getStatus() {
        return {
            jobId: this.jobId,
            isConnected: this.isConnected,
            reconnectAttempts: this.reconnectAttempts,
            lastEventTime: this.lastEventTime,
            isDestroyed: this.isDestroyed
        };
    }
}

/**
 * Create and manage SSE connection for a job
 * @param {string} jobId - Unique job identifier
 * @param {string} sseUrl - SSE server URL (optional, defaults to current origin)
 * @returns {JobProgressStream} SSE stream instance
 */
function createJobStream(jobId, sseUrl = '') {
    return new JobProgressStream(jobId, sseUrl);
}

// Make available globally
if (typeof window !== 'undefined') {
    console.log('📡 Loading sse-client.js');
    window.JobProgressStream = JobProgressStream;
    window.createJobStream = createJobStream;
    console.log('✅ sse-client.js loaded successfully');
}
