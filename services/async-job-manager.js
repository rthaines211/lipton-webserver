const { Pool } = require('pg');

let _pool = null;

function getPool() {
    if (!_pool) {
        _pool = new Pool({
            connectionString: process.env.DATABASE_URL,
            max: 5,
            idleTimeoutMillis: 30000,
        });
    }
    return _pool;
}

async function createJob({ caseName, totalFiles, exhibitMapping, dropboxSourcePath, email }) {
    const pool = getPool();
    const result = await pool.query(
        `INSERT INTO exhibit_jobs (case_name, total_files, exhibit_mapping, dropbox_source_path, email)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [caseName, totalFiles, JSON.stringify(exhibitMapping), dropboxSourcePath, email || null]
    );
    return result.rows[0];
}

async function getJob(jobId) {
    const pool = getPool();
    const result = await pool.query('SELECT * FROM exhibit_jobs WHERE id = $1', [jobId]);
    return result.rows[0] || null;
}

async function updateProgress(jobId, { status, progress, progressMessage }) {
    const pool = getPool();
    await pool.query(
        `UPDATE exhibit_jobs
         SET status = $1, progress = $2, progress_message = $3, updated_at = NOW()
         WHERE id = $4`,
        [status, progress, progressMessage, jobId]
    );
}

async function completeJob(jobId, { gcsOutputUrl, dropboxOutputPath }) {
    const pool = getPool();
    await pool.query(
        `UPDATE exhibit_jobs
         SET status = 'complete', progress = 100, gcs_output_url = $1,
             dropbox_output_path = $2, completed_at = NOW(), updated_at = NOW()
         WHERE id = $3`,
        [gcsOutputUrl, dropboxOutputPath, jobId]
    );
}

async function failJob(jobId, errorMessage) {
    const pool = getPool();
    await pool.query(
        `UPDATE exhibit_jobs
         SET status = 'failed', error_message = $1, updated_at = NOW()
         WHERE id = $2`,
        [errorMessage, jobId]
    );
}

async function listJobs({ limit = 20 } = {}) {
    const pool = getPool();
    const result = await pool.query(
        `SELECT id, status, progress, progress_message, case_name, total_files,
                gcs_output_url, dropbox_output_path, error_message,
                created_at, updated_at, completed_at
         FROM exhibit_jobs
         ORDER BY created_at DESC
         LIMIT $1`,
        [limit]
    );
    return result.rows;
}

module.exports = { createJob, getJob, updateProgress, completeJob, failJob, listJobs, getPool };
