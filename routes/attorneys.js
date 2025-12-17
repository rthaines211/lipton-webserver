/**
 * Attorneys Routes
 *
 * Provides API endpoints for attorney management.
 * Uses the existing attorneys auth table.
 */

const express = require('express');
const router = express.Router();
const logger = require('../monitoring/logger');
const { getPool } = require('../server/services/database-service');

/**
 * GET /api/attorneys
 * List all active attorneys
 *
 * Query params:
 * - include_inactive: Include inactive attorneys (default false)
 */
router.get('/', async (req, res) => {
  try {
    const pool = getPool();
    const { include_inactive = 'false' } = req.query;

    const activeCondition = include_inactive === 'true' ? '' : 'WHERE active = true';

    const result = await pool.query(`
      SELECT id, full_name, email, role, active, created_at, last_login
      FROM attorneys
      ${activeCondition}
      ORDER BY full_name ASC
    `);

    res.json(result.rows);
  } catch (error) {
    logger.error('Failed to fetch attorneys', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch attorneys' });
  }
});

/**
 * GET /api/attorneys/:id
 * Get a single attorney by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const pool = getPool();
    const { id } = req.params;

    const result = await pool.query(`
      SELECT id, full_name, email, role, active, created_at, last_login
      FROM attorneys
      WHERE id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Attorney not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    logger.error('Failed to fetch attorney', { error: error.message, id: req.params.id });
    res.status(500).json({ error: 'Failed to fetch attorney' });
  }
});

/**
 * GET /api/attorneys/:id/cases
 * Get cases assigned to an attorney
 */
router.get('/:id/cases', async (req, res) => {
  try {
    const pool = getPool();
    const { id } = req.params;
    const { status } = req.query;

    // Verify attorney exists
    const attorneyResult = await pool.query(`
      SELECT id FROM attorneys WHERE id = $1
    `, [id]);

    if (attorneyResult.rows.length === 0) {
      return res.status(404).json({ error: 'Attorney not found' });
    }

    let query = `
      SELECT * FROM v_dashboard_list
      WHERE attorney_id = $1
    `;
    const params = [id];

    if (status) {
      query += ' AND status = $2';
      params.push(status);
    }

    query += ' ORDER BY is_priority DESC, updated_at DESC';

    const result = await pool.query(query, params);

    res.json(result.rows);
  } catch (error) {
    logger.error('Failed to fetch attorney cases', { error: error.message, id: req.params.id });
    res.status(500).json({ error: 'Failed to fetch attorney cases' });
  }
});

/**
 * POST /api/attorneys/seed
 * Seed Kevin Lipton and Michael Falsafi attorneys
 */
router.post('/seed', async (req, res) => {
  try {
    const pool = getPool();

    // Insert Kevin Lipton with ID 1
    // Note: password_hash is NULL - attorneys use token-based auth, not password auth
    await pool.query(`
      INSERT INTO attorneys (id, email, full_name, password_hash, role, active)
      VALUES (1, 'kevin@liptonlegal.com', 'Kevin Lipton', NULL, 'attorney', true)
      ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, active = EXCLUDED.active
    `);

    // Insert Michael Falsafi with ID 2
    // Note: password_hash is NULL - attorneys use token-based auth, not password auth
    await pool.query(`
      INSERT INTO attorneys (id, email, full_name, password_hash, role, active)
      VALUES (2, 'michael@liptonlegal.com', 'Michael Falsafi', NULL, 'attorney', true)
      ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, active = EXCLUDED.active
    `);

    // Reset sequence
    await pool.query(`SELECT setval('attorneys_id_seq', GREATEST((SELECT MAX(id) FROM attorneys), 2))`);

    // Return result
    const result = await pool.query('SELECT id, full_name, email, active FROM attorneys ORDER BY id');
    logger.info('Attorneys seeded', { count: result.rows.length });
    res.json({ message: 'Attorneys seeded', attorneys: result.rows });
  } catch (error) {
    logger.error('Failed to seed attorneys', { error: error.message });
    res.status(500).json({ error: 'Failed to seed attorneys: ' + error.message });
  }
});

/**
 * GET /api/attorneys/:id/workload
 * Get workload statistics for an attorney
 */
router.get('/:id/workload', async (req, res) => {
  try {
    const pool = getPool();
    const { id } = req.params;

    // Verify attorney exists
    const attorneyResult = await pool.query(`
      SELECT id, full_name FROM attorneys WHERE id = $1
    `, [id]);

    if (attorneyResult.rows.length === 0) {
      return res.status(404).json({ error: 'Attorney not found' });
    }

    // Get workload breakdown by status
    const workloadResult = await pool.query(`
      SELECT
        status,
        COUNT(*) as count,
        COUNT(*) FILTER (WHERE is_priority = true) as priority_count
      FROM case_dashboard
      WHERE assigned_attorney_id = $1 AND is_archived = false
      GROUP BY status
    `, [id]);

    // Get total counts
    const totalsResult = await pool.query(`
      SELECT
        COUNT(*) as total_assigned,
        COUNT(*) FILTER (WHERE is_priority = true) as total_priority,
        COUNT(*) FILTER (WHERE status IN ('new', 'in_review', 'docs_in_progress')) as active_cases,
        COUNT(*) FILTER (WHERE status IN ('docs_generated', 'sent_to_client', 'filed')) as completed_cases
      FROM case_dashboard
      WHERE assigned_attorney_id = $1 AND is_archived = false
    `, [id]);

    res.json({
      attorney: attorneyResult.rows[0],
      byStatus: workloadResult.rows,
      totals: totalsResult.rows[0]
    });
  } catch (error) {
    logger.error('Failed to fetch attorney workload', { error: error.message, id: req.params.id });
    res.status(500).json({ error: 'Failed to fetch attorney workload' });
  }
});

module.exports = router;
