/**
 * CRM Dashboard Routes
 *
 * Provides API endpoints for the CRM dashboard including:
 * - Dashboard entries (cases from intakes)
 * - Status management
 * - Attorney assignments
 * - Notes CRUD
 * - Activity timeline
 * - Generated documents tracking
 */

const express = require('express');
const router = express.Router();
const logger = require('../monitoring/logger');
const { getPool } = require('../server/services/database-service');

// ============================================================================
// Constants
// ============================================================================
const MAX_PAGE_SIZE = 100;
const DEFAULT_PAGE_SIZE = 20;
const DEFAULT_ACTIVITY_PAGE_SIZE = 50;
const MIN_PAGE_SIZE = 1;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Log an activity to the case_activities table
 */
async function logActivity(pool, dashboardId, intakeId, activityType, description, performedBy, oldValue = null, newValue = null, metadata = null) {
  try {
    await pool.query(`
      INSERT INTO case_activities (dashboard_id, intake_id, activity_type, description, performed_by, old_value, new_value, metadata)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [dashboardId, intakeId, activityType, description, performedBy, oldValue, newValue, metadata ? JSON.stringify(metadata) : null]);
  } catch (error) {
    logger.error('Failed to log activity', { error: error.message, dashboardId, activityType });
  }
}

/**
 * Get the current user from request (placeholder for auth integration)
 */
function getCurrentUser(req) {
  return req.headers['x-user-email'] || req.body?.performedBy || 'system';
}

// ============================================================================
// Dashboard Entry Endpoints
// ============================================================================

/**
 * GET /api/dashboard
 * List all dashboard entries with filters and pagination
 *
 * Query params:
 * - status: Filter by status (new, in_review, docs_in_progress, etc.)
 * - attorney_id: Filter by assigned attorney
 * - search: Search by client name, intake number, or email
 * - priority: Filter by priority (true/false)
 * - page: Page number (default 1)
 * - limit: Items per page (default 20, max 100)
 */
router.get('/', async (req, res) => {
  try {
    const pool = getPool();
    const { status, attorney_id, search, priority, page = 1, limit = 20 } = req.query;

    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(MAX_PAGE_SIZE, Math.max(MIN_PAGE_SIZE, parseInt(limit) || DEFAULT_PAGE_SIZE));
    const offset = (pageNum - 1) * limitNum;

    // Build dynamic WHERE clause
    const conditions = ['1=1']; // Always true base condition
    const params = [];
    let paramIndex = 1;

    if (status) {
      conditions.push(`status = $${paramIndex++}`);
      params.push(status);
    }

    if (attorney_id) {
      conditions.push(`attorney_id = $${paramIndex++}`);
      params.push(parseInt(attorney_id));
    }

    if (priority !== undefined) {
      conditions.push(`is_priority = $${paramIndex++}`);
      params.push(priority === 'true');
    }

    if (search) {
      conditions.push(`(
        primary_client_name ILIKE $${paramIndex} OR
        intake_number ILIKE $${paramIndex} OR
        client_email ILIKE $${paramIndex}
      )`);
      params.push(`%${search}%`);
      paramIndex++;
    }

    const whereClause = conditions.join(' AND ');

    // Get total count for pagination
    const countResult = await pool.query(`
      SELECT COUNT(*) as total FROM v_dashboard_list WHERE ${whereClause}
    `, params);
    const total = parseInt(countResult.rows[0].total);

    // Get paginated results
    params.push(limitNum, offset);
    const result = await pool.query(`
      SELECT * FROM v_dashboard_list
      WHERE ${whereClause}
      ORDER BY is_priority DESC, updated_at DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex}
    `, params);

    // Get status summary for filter counts
    const summaryResult = await pool.query('SELECT * FROM v_dashboard_status_summary');

    res.json({
      data: result.rows,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum)
      },
      statusSummary: summaryResult.rows
    });
  } catch (error) {
    logger.error('Failed to fetch dashboard list', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch dashboard entries' });
  }
});

/**
 * GET /api/dashboard/:id
 * Get single dashboard entry with full details
 */
router.get('/:id', async (req, res) => {
  try {
    const pool = getPool();
    const { id } = req.params;

    const result = await pool.query(`
      SELECT * FROM v_dashboard_detail WHERE dashboard_id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Dashboard entry not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    logger.error('Failed to fetch dashboard entry', { error: error.message, id: req.params.id });
    res.status(500).json({ error: 'Failed to fetch dashboard entry' });
  }
});

/**
 * POST /api/dashboard
 * Create a new dashboard entry (usually auto-created on intake submission)
 */
router.post('/', async (req, res) => {
  try {
    const pool = getPool();
    const { intake_id } = req.body;
    const performedBy = getCurrentUser(req);

    if (!intake_id) {
      return res.status(400).json({ error: 'intake_id is required' });
    }

    // Check if dashboard entry already exists for this intake
    const existingResult = await pool.query(`
      SELECT id FROM case_dashboard WHERE intake_id = $1
    `, [intake_id]);

    if (existingResult.rows.length > 0) {
      return res.status(409).json({
        error: 'Dashboard entry already exists for this intake',
        dashboard_id: existingResult.rows[0].id
      });
    }

    // Create dashboard entry
    const result = await pool.query(`
      INSERT INTO case_dashboard (intake_id, status, status_changed_by)
      VALUES ($1, 'new', $2)
      RETURNING id, intake_id, status, created_at
    `, [intake_id, performedBy]);

    const dashboardId = result.rows[0].id;

    // Log activity
    await logActivity(pool, dashboardId, intake_id, 'created', 'Case created from client intake submission', performedBy);

    logger.info('Dashboard entry created', { dashboardId, intakeId: intake_id });

    res.status(201).json(result.rows[0]);
  } catch (error) {
    logger.error('Failed to create dashboard entry', { error: error.message });
    res.status(500).json({ error: 'Failed to create dashboard entry' });
  }
});

/**
 * PATCH /api/dashboard/:id/status
 * Update the status of a dashboard entry
 */
router.patch('/:id/status', async (req, res) => {
  try {
    const pool = getPool();
    const { id } = req.params;
    const { status } = req.body;
    const performedBy = getCurrentUser(req);

    const validStatuses = ['new', 'in_review', 'docs_in_progress', 'docs_generated', 'sent_to_client', 'filed', 'closed', 'on_hold'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    }

    // Get current status
    const currentResult = await pool.query(`
      SELECT status, intake_id FROM case_dashboard WHERE id = $1
    `, [id]);

    if (currentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Dashboard entry not found' });
    }

    const oldStatus = currentResult.rows[0].status;
    const intakeId = currentResult.rows[0].intake_id;

    if (oldStatus === status) {
      return res.json({ message: 'Status unchanged', status });
    }

    // Update status
    const result = await pool.query(`
      UPDATE case_dashboard
      SET status = $1, status_changed_by = $2
      WHERE id = $3
      RETURNING id, status, status_changed_at
    `, [status, performedBy, id]);

    // Log activity
    await logActivity(pool, id, intakeId, 'status_changed', `Status changed from ${oldStatus} to ${status}`, performedBy, oldStatus, status);

    logger.info('Dashboard status updated', { dashboardId: id, oldStatus, newStatus: status });

    res.json(result.rows[0]);
  } catch (error) {
    logger.error('Failed to update dashboard status', { error: error.message, id: req.params.id });
    res.status(500).json({ error: 'Failed to update status' });
  }
});

/**
 * PATCH /api/dashboard/:id/assign
 * Assign an attorney to a dashboard entry
 */
router.patch('/:id/assign', async (req, res) => {
  try {
    const pool = getPool();
    const { id } = req.params;
    const { attorney_id } = req.body;
    const performedBy = getCurrentUser(req);

    // Get current assignment and intake_id
    const currentResult = await pool.query(`
      SELECT cd.assigned_attorney_id, cd.intake_id, a.full_name as old_attorney_name
      FROM case_dashboard cd
      LEFT JOIN attorneys a ON cd.assigned_attorney_id = a.id
      WHERE cd.id = $1
    `, [id]);

    if (currentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Dashboard entry not found' });
    }

    const oldAttorneyId = currentResult.rows[0].assigned_attorney_id;
    const oldAttorneyName = currentResult.rows[0].old_attorney_name || 'Unassigned';
    const intakeId = currentResult.rows[0].intake_id;

    // Get attorney name - use hardcoded names for Kevin/Michael, otherwise lookup
    let newAttorneyName = 'Unassigned';
    const ATTORNEY_NAMES = {
      1: 'Kevin Lipton',
      2: 'Michael Falsafi'
    };

    if (attorney_id) {
      // Use hardcoded name if available
      if (ATTORNEY_NAMES[attorney_id]) {
        newAttorneyName = ATTORNEY_NAMES[attorney_id];
      } else {
        // Try database lookup for other attorneys
        const attorneyResult = await pool.query(`
          SELECT full_name FROM attorneys WHERE id = $1 AND active = true
        `, [attorney_id]);
        if (attorneyResult.rows.length > 0) {
          newAttorneyName = attorneyResult.rows[0].full_name;
        }
      }
    }

    // Update assignment
    const result = await pool.query(`
      UPDATE case_dashboard
      SET assigned_attorney_id = $1, assigned_at = CURRENT_TIMESTAMP, assigned_by = $2
      WHERE id = $3
      RETURNING id, assigned_attorney_id, assigned_at
    `, [attorney_id || null, performedBy, id]);

    // Log activity
    const description = attorney_id
      ? `Assigned to ${newAttorneyName}`
      : `Unassigned (was ${oldAttorneyName})`;
    await logActivity(pool, id, intakeId, 'assigned', description, performedBy, oldAttorneyName, newAttorneyName);

    logger.info('Dashboard assignment updated', { dashboardId: id, attorneyId: attorney_id });

    res.json({
      ...result.rows[0],
      attorney_name: newAttorneyName
    });
  } catch (error) {
    logger.error('Failed to update dashboard assignment', { error: error.message, id: req.params.id });
    res.status(500).json({ error: 'Failed to update assignment' });
  }
});

/**
 * PATCH /api/dashboard/:id/priority
 * Toggle the priority flag on a dashboard entry
 */
router.patch('/:id/priority', async (req, res) => {
  try {
    const pool = getPool();
    const { id } = req.params;
    const { is_priority } = req.body;
    const performedBy = getCurrentUser(req);

    // Get current state
    const currentResult = await pool.query(`
      SELECT is_priority, intake_id FROM case_dashboard WHERE id = $1
    `, [id]);

    if (currentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Dashboard entry not found' });
    }

    const newPriority = is_priority !== undefined ? is_priority : !currentResult.rows[0].is_priority;
    const intakeId = currentResult.rows[0].intake_id;

    // Update priority
    const result = await pool.query(`
      UPDATE case_dashboard
      SET is_priority = $1
      WHERE id = $2
      RETURNING id, is_priority
    `, [newPriority, id]);

    // Log activity
    await logActivity(pool, id, intakeId, 'priority_changed',
      newPriority ? 'Marked as priority' : 'Removed priority status',
      performedBy,
      String(!newPriority),
      String(newPriority)
    );

    logger.info('Dashboard priority updated', { dashboardId: id, isPriority: newPriority });

    res.json(result.rows[0]);
  } catch (error) {
    logger.error('Failed to update dashboard priority', { error: error.message, id: req.params.id });
    res.status(500).json({ error: 'Failed to update priority' });
  }
});

/**
 * DELETE /api/dashboard/:id
 * Archive (soft delete) a dashboard entry
 */
router.delete('/:id', async (req, res) => {
  try {
    const pool = getPool();
    const { id } = req.params;
    const performedBy = getCurrentUser(req);

    // Get intake_id
    const currentResult = await pool.query(`
      SELECT intake_id, is_archived FROM case_dashboard WHERE id = $1
    `, [id]);

    if (currentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Dashboard entry not found' });
    }

    if (currentResult.rows[0].is_archived) {
      return res.status(400).json({ error: 'Dashboard entry is already archived' });
    }

    const intakeId = currentResult.rows[0].intake_id;

    // Archive entry
    await pool.query(`
      UPDATE case_dashboard SET is_archived = true WHERE id = $1
    `, [id]);

    // Log activity
    await logActivity(pool, id, intakeId, 'archived', 'Case archived', performedBy);

    logger.info('Dashboard entry archived', { dashboardId: id });

    res.json({ message: 'Dashboard entry archived', id });
  } catch (error) {
    logger.error('Failed to archive dashboard entry', { error: error.message, id: req.params.id });
    res.status(500).json({ error: 'Failed to archive entry' });
  }
});

// ============================================================================
// Activity Endpoints
// ============================================================================

/**
 * GET /api/dashboard/:id/activities
 * Get activity timeline for a dashboard entry
 */
router.get('/:id/activities', async (req, res) => {
  try {
    const pool = getPool();
    const { id } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    // Verify dashboard exists
    const dashboardResult = await pool.query(`
      SELECT id FROM case_dashboard WHERE id = $1
    `, [id]);

    if (dashboardResult.rows.length === 0) {
      return res.status(404).json({ error: 'Dashboard entry not found' });
    }

    const result = await pool.query(`
      SELECT id, activity_type, description, performed_by, performed_at, old_value, new_value, metadata
      FROM case_activities
      WHERE dashboard_id = $1
      ORDER BY performed_at DESC
      LIMIT $2 OFFSET $3
    `, [id, Math.min(MAX_PAGE_SIZE, parseInt(limit) || DEFAULT_ACTIVITY_PAGE_SIZE), parseInt(offset) || 0]);

    res.json(result.rows);
  } catch (error) {
    logger.error('Failed to fetch activities', { error: error.message, id: req.params.id });
    res.status(500).json({ error: 'Failed to fetch activities' });
  }
});

// ============================================================================
// Notes Endpoints
// ============================================================================

/**
 * GET /api/dashboard/:id/notes
 * Get all notes for a dashboard entry
 */
router.get('/:id/notes', async (req, res) => {
  try {
    const pool = getPool();
    const { id } = req.params;
    const { include_deleted = 'false' } = req.query;

    // Verify dashboard exists
    const dashboardResult = await pool.query(`
      SELECT id FROM case_dashboard WHERE id = $1
    `, [id]);

    if (dashboardResult.rows.length === 0) {
      return res.status(404).json({ error: 'Dashboard entry not found' });
    }

    const deletedCondition = include_deleted === 'true' ? '' : 'AND is_deleted = false';
    const result = await pool.query(`
      SELECT id, content, is_pinned, created_by, created_at, updated_by, updated_at, is_deleted
      FROM case_notes
      WHERE dashboard_id = $1 ${deletedCondition}
      ORDER BY is_pinned DESC, created_at DESC
    `, [id]);

    res.json(result.rows);
  } catch (error) {
    logger.error('Failed to fetch notes', { error: error.message, id: req.params.id });
    res.status(500).json({ error: 'Failed to fetch notes' });
  }
});

/**
 * POST /api/dashboard/:id/notes
 * Add a new note to a dashboard entry
 */
router.post('/:id/notes', async (req, res) => {
  try {
    const pool = getPool();
    const { id } = req.params;
    const { content, is_pinned = false } = req.body;
    const performedBy = getCurrentUser(req);

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: 'Note content is required' });
    }

    // Get intake_id
    const dashboardResult = await pool.query(`
      SELECT intake_id FROM case_dashboard WHERE id = $1
    `, [id]);

    if (dashboardResult.rows.length === 0) {
      return res.status(404).json({ error: 'Dashboard entry not found' });
    }

    const intakeId = dashboardResult.rows[0].intake_id;

    // Create note
    const result = await pool.query(`
      INSERT INTO case_notes (dashboard_id, intake_id, content, is_pinned, created_by)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, content, is_pinned, created_by, created_at
    `, [id, intakeId, content.trim(), is_pinned, performedBy]);

    // Log activity
    await logActivity(pool, id, intakeId, 'note_added', 'Note added', performedBy, null, null, { noteId: result.rows[0].id });

    logger.info('Note added', { dashboardId: id, noteId: result.rows[0].id });

    res.status(201).json(result.rows[0]);
  } catch (error) {
    logger.error('Failed to add note', { error: error.message, id: req.params.id });
    res.status(500).json({ error: 'Failed to add note' });
  }
});

/**
 * PATCH /api/dashboard/:id/notes/:noteId
 * Edit an existing note
 */
router.patch('/:id/notes/:noteId', async (req, res) => {
  try {
    const pool = getPool();
    const { id, noteId } = req.params;
    const { content } = req.body;
    const performedBy = getCurrentUser(req);

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: 'Note content is required' });
    }

    // Verify note exists and belongs to this dashboard
    const noteResult = await pool.query(`
      SELECT cn.id, cd.intake_id FROM case_notes cn
      JOIN case_dashboard cd ON cn.dashboard_id = cd.id
      WHERE cn.id = $1 AND cn.dashboard_id = $2 AND cn.is_deleted = false
    `, [noteId, id]);

    if (noteResult.rows.length === 0) {
      return res.status(404).json({ error: 'Note not found' });
    }

    const intakeId = noteResult.rows[0].intake_id;

    // Update note
    const result = await pool.query(`
      UPDATE case_notes
      SET content = $1, updated_by = $2, updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING id, content, is_pinned, created_by, created_at, updated_by, updated_at
    `, [content.trim(), performedBy, noteId]);

    // Log activity
    await logActivity(pool, id, intakeId, 'note_edited', 'Note edited', performedBy, null, null, { noteId });

    logger.info('Note edited', { dashboardId: id, noteId });

    res.json(result.rows[0]);
  } catch (error) {
    logger.error('Failed to edit note', { error: error.message, id: req.params.id, noteId: req.params.noteId });
    res.status(500).json({ error: 'Failed to edit note' });
  }
});

/**
 * PATCH /api/dashboard/:id/notes/:noteId/pin
 * Toggle pin status on a note
 */
router.patch('/:id/notes/:noteId/pin', async (req, res) => {
  try {
    const pool = getPool();
    const { id, noteId } = req.params;
    const { is_pinned } = req.body;

    // Verify note exists
    const noteResult = await pool.query(`
      SELECT is_pinned FROM case_notes
      WHERE id = $1 AND dashboard_id = $2 AND is_deleted = false
    `, [noteId, id]);

    if (noteResult.rows.length === 0) {
      return res.status(404).json({ error: 'Note not found' });
    }

    const newPinned = is_pinned !== undefined ? is_pinned : !noteResult.rows[0].is_pinned;

    // Update pin status
    const result = await pool.query(`
      UPDATE case_notes SET is_pinned = $1 WHERE id = $2
      RETURNING id, is_pinned
    `, [newPinned, noteId]);

    res.json(result.rows[0]);
  } catch (error) {
    logger.error('Failed to toggle note pin', { error: error.message, id: req.params.id, noteId: req.params.noteId });
    res.status(500).json({ error: 'Failed to toggle pin status' });
  }
});

/**
 * DELETE /api/dashboard/:id/notes/:noteId
 * Soft delete a note
 */
router.delete('/:id/notes/:noteId', async (req, res) => {
  try {
    const pool = getPool();
    const { id, noteId } = req.params;
    const performedBy = getCurrentUser(req);

    // Verify note exists
    const noteResult = await pool.query(`
      SELECT cn.id, cd.intake_id FROM case_notes cn
      JOIN case_dashboard cd ON cn.dashboard_id = cd.id
      WHERE cn.id = $1 AND cn.dashboard_id = $2 AND cn.is_deleted = false
    `, [noteId, id]);

    if (noteResult.rows.length === 0) {
      return res.status(404).json({ error: 'Note not found' });
    }

    const intakeId = noteResult.rows[0].intake_id;

    // Soft delete
    await pool.query(`
      UPDATE case_notes
      SET is_deleted = true, deleted_at = CURRENT_TIMESTAMP, deleted_by = $1
      WHERE id = $2
    `, [performedBy, noteId]);

    // Log activity (but don't log note deletion separately - could be noisy)
    logger.info('Note deleted', { dashboardId: id, noteId });

    res.json({ message: 'Note deleted', id: noteId });
  } catch (error) {
    logger.error('Failed to delete note', { error: error.message, id: req.params.id, noteId: req.params.noteId });
    res.status(500).json({ error: 'Failed to delete note' });
  }
});

// ============================================================================
// Document Endpoints
// ============================================================================

/**
 * GET /api/dashboard/:id/documents
 * Get generated documents for a dashboard entry
 */
router.get('/:id/documents', async (req, res) => {
  try {
    const pool = getPool();
    const { id } = req.params;

    // Get intake_id from dashboard
    const dashboardResult = await pool.query(`
      SELECT intake_id FROM case_dashboard WHERE id = $1
    `, [id]);

    if (dashboardResult.rows.length === 0) {
      return res.status(404).json({ error: 'Dashboard entry not found' });
    }

    const intakeId = dashboardResult.rows[0].intake_id;

    const result = await pool.query(`
      SELECT id, document_type, document_name, file_path, dropbox_path,
             file_size_bytes, generated_by, generated_at, status, metadata
      FROM generated_documents
      WHERE intake_id = $1
      ORDER BY generated_at DESC
    `, [intakeId]);

    res.json(result.rows);
  } catch (error) {
    logger.error('Failed to fetch documents', { error: error.message, id: req.params.id });
    res.status(500).json({ error: 'Failed to fetch documents' });
  }
});

/**
 * POST /api/dashboard/:id/documents
 * Log a new generated document
 */
router.post('/:id/documents', async (req, res) => {
  try {
    const pool = getPool();
    const { id } = req.params;
    const { document_type, document_name, file_path, dropbox_path, file_size_bytes, metadata } = req.body;
    const performedBy = getCurrentUser(req);

    if (!document_type || !document_name) {
      return res.status(400).json({ error: 'document_type and document_name are required' });
    }

    // Get intake_id and case_id from dashboard
    const dashboardResult = await pool.query(`
      SELECT intake_id, case_id FROM case_dashboard WHERE id = $1
    `, [id]);

    if (dashboardResult.rows.length === 0) {
      return res.status(404).json({ error: 'Dashboard entry not found' });
    }

    const { intake_id: intakeId, case_id: caseId } = dashboardResult.rows[0];

    // Create document record
    const result = await pool.query(`
      INSERT INTO generated_documents
        (intake_id, case_id, document_type, document_name, file_path, dropbox_path, file_size_bytes, generated_by, metadata)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id, document_type, document_name, generated_at, status
    `, [intakeId, caseId, document_type, document_name, file_path, dropbox_path, file_size_bytes, performedBy, metadata ? JSON.stringify(metadata) : null]);

    // Update dashboard doc generation tracking
    await pool.query(`
      UPDATE case_dashboard
      SET docs_generated_at = CURRENT_TIMESTAMP,
          docs_generated_by = $1,
          last_doc_gen_count = (SELECT COUNT(*) FROM generated_documents WHERE intake_id = $2)
      WHERE id = $3
    `, [performedBy, intakeId, id]);

    // Log activity
    await logActivity(pool, id, intakeId, 'doc_generated', `Generated document: ${document_name}`, performedBy, null, null, {
      documentId: result.rows[0].id,
      documentType: document_type
    });

    logger.info('Document logged', { dashboardId: id, documentId: result.rows[0].id, documentType: document_type });

    res.status(201).json(result.rows[0]);
  } catch (error) {
    logger.error('Failed to log document', { error: error.message, id: req.params.id });
    res.status(500).json({ error: 'Failed to log document' });
  }
});

// ============================================================================
// Utility Endpoints
// ============================================================================

/**
 * GET /api/dashboard/stats
 * Get dashboard statistics
 */
router.get('/stats/summary', async (req, res) => {
  try {
    const pool = getPool();

    const summaryResult = await pool.query('SELECT * FROM v_dashboard_status_summary');

    const totalResult = await pool.query(`
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE is_priority = true) as priority_count,
        COUNT(*) FILTER (WHERE assigned_attorney_id IS NULL) as unassigned_count
      FROM case_dashboard
      WHERE is_archived = false
    `);

    res.json({
      byStatus: summaryResult.rows,
      totals: totalResult.rows[0]
    });
  } catch (error) {
    logger.error('Failed to fetch dashboard stats', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

/**
 * GET /api/dashboard/recent-activities
 * Get recent activities across all cases
 */
router.get('/recent/activities', async (req, res) => {
  try {
    const pool = getPool();
    const { limit = 20 } = req.query;

    const result = await pool.query(`
      SELECT * FROM v_recent_activities
      LIMIT $1
    `, [Math.min(MAX_PAGE_SIZE, parseInt(limit) || DEFAULT_PAGE_SIZE)]);

    res.json(result.rows);
  } catch (error) {
    logger.error('Failed to fetch recent activities', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch recent activities' });
  }
});

module.exports = router;
