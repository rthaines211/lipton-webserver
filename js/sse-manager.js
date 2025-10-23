/**
 * SSE Connection Manager
 *
 * Singleton manager to ensure only one SSE connection per job ID
 * Prevents duplicate connections and manages cleanup
 */

class SSEConnectionManager {
    constructor() {
        // Map to store active connections by job ID
        this.activeConnections = new Map();
        console.log('📡 SSE Connection Manager initialized');
    }

    /**
     * Get or create an SSE connection for a job
     * @param {string} jobId - The job/case ID
     * @param {string} sseUrl - Optional SSE server URL
     * @returns {JobProgressStream} The SSE stream instance
     */
    getConnection(jobId, sseUrl = '') {
        // Check if we already have an active connection for this job
        if (this.activeConnections.has(jobId)) {
            const existing = this.activeConnections.get(jobId);

            // If the connection is still active, return it
            if (existing && !existing.isDestroyed && !existing.jobCompleted) {
                console.log(`♻️ Reusing existing SSE connection for job: ${jobId}`);
                return existing;
            }

            // Clean up dead connection
            console.log(`🧹 Cleaning up inactive SSE connection for job: ${jobId}`);
            this.closeConnection(jobId);
        }

        // Create new connection
        console.log(`🆕 Creating new SSE connection for job: ${jobId}`);
        const connection = new JobProgressStream(jobId, sseUrl);

        // Store in our map
        this.activeConnections.set(jobId, connection);

        // Override the close method to clean up our reference
        const originalClose = connection.close.bind(connection);
        connection.close = () => {
            originalClose();
            this.activeConnections.delete(jobId);
            console.log(`🗑️ Removed SSE connection from manager for job: ${jobId}`);
        };

        return connection;
    }

    /**
     * Check if a connection exists for a job
     * @param {string} jobId - The job/case ID
     * @returns {boolean} True if an active connection exists
     */
    hasConnection(jobId) {
        const conn = this.activeConnections.get(jobId);
        return conn && !conn.isDestroyed && !conn.jobCompleted;
    }

    /**
     * Close a specific connection
     * @param {string} jobId - The job/case ID
     */
    closeConnection(jobId) {
        const connection = this.activeConnections.get(jobId);
        if (connection) {
            console.log(`🔌 Closing managed SSE connection for job: ${jobId}`);
            connection.close();
            this.activeConnections.delete(jobId);
        }
    }

    /**
     * Close all active connections
     */
    closeAll() {
        console.log(`🔌 Closing all ${this.activeConnections.size} SSE connections`);
        for (const [jobId, connection] of this.activeConnections) {
            connection.close();
        }
        this.activeConnections.clear();
    }

    /**
     * Get connection status
     * @returns {Object} Status of all connections
     */
    getStatus() {
        const status = {};
        for (const [jobId, connection] of this.activeConnections) {
            status[jobId] = {
                isConnected: connection.isConnected,
                isDestroyed: connection.isDestroyed,
                jobCompleted: connection.jobCompleted,
                reconnectAttempts: connection.reconnectAttempts
            };
        }
        return status;
    }
}

// Create singleton instance
const sseManager = new SSEConnectionManager();

// Enhanced createJobStream function that uses the manager
function createManagedJobStream(jobId, sseUrl = '') {
    return sseManager.getConnection(jobId, sseUrl);
}

// Make available globally
if (typeof window !== 'undefined') {
    console.log('📡 Loading sse-manager.js');
    window.SSEConnectionManager = SSEConnectionManager;
    window.sseManager = sseManager;
    window.createManagedJobStream = createManagedJobStream;

    // Override the original createJobStream to use managed version
    window.createJobStream = createManagedJobStream;

    // Clean up on page unload
    window.addEventListener('beforeunload', () => {
        sseManager.closeAll();
    });

    console.log('✅ sse-manager.js loaded successfully');
}