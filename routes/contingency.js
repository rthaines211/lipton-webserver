const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const logger = require('../monitoring/logger');
const ContingencyDocumentGenerator = require('../services/contingency-document-generator');

// Database connection
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT
});

/**
 * Extract plaintiffs from form data
 */
function extractPlaintiffs(formData) {
  const plaintiffs = [];
  const plaintiffCount = formData.plaintiffCount || 1;

  for (let i = 1; i <= plaintiffCount; i++) {
    const plaintiff = {
      index: i,
      firstName: formData[`plaintiff-${i}-first-name`] || '',
      lastName: formData[`plaintiff-${i}-last-name`] || '',
      address: formData[`plaintiff-${i}-address`] || '',
      unitNumber: formData[`plaintiff-${i}-unit`] || null,
      email: formData[`plaintiff-${i}-email`] || '',
      phone: formData[`plaintiff-${i}-phone`] || '',
      isMinor: formData[`plaintiff-${i}-is-minor`] === 'true' || formData[`plaintiff-${i}-is-minor`] === true,
      guardianId: formData[`plaintiff-${i}-guardian`] ? parseInt(formData[`plaintiff-${i}-guardian`]) : null
    };
    plaintiffs.push(plaintiff);
  }

  return plaintiffs;
}

/**
 * Extract defendants from form data
 */
function extractDefendants(formData) {
  const defendants = [];
  const defendantCount = formData.defendantCount || 1;

  for (let i = 1; i <= defendantCount; i++) {
    const defendant = {
      index: i,
      firstName: formData[`defendant-${i}-first-name`] || '',
      lastName: formData[`defendant-${i}-last-name`] || ''
    };
    defendants.push(defendant);
  }

  return defendants;
}

/**
 * POST /api/contingency-entries
 * Submit a new contingency agreement form
 */
router.post('/contingency-entries', async (req, res) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const formData = req.body;

    // Debug: Log raw form data to see checkbox values
    logger.info('Raw form data received', {
      plaintiffCount: formData.plaintiffCount,
      plaintiff1: {
        firstName: formData['plaintiff-1-first-name'],
        differentAddress: formData['plaintiff-1-different-address'],
        street: formData['plaintiff-1-street'],
        cityStateZip: formData['plaintiff-1-city-state-zip']
      }
    });

    const caseId = formData.id || `CA-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Build property address from separate fields
    const propertyAddress = formData.propertyAddress || formData['property-address'] ||
      `${formData['property-street'] || ''}, ${formData['property-city'] || ''}, ${formData['property-state'] || ''} ${formData['property-zip'] || ''}`.trim();

    // Insert main agreement record
    const agreementResult = await client.query(`
      INSERT INTO contingency_agreements (
        case_id, property_address, notification_email,
        notification_name, form_data
      ) VALUES ($1, $2, $3, $4, $5)
      RETURNING id, case_id
    `, [
      caseId,
      propertyAddress,
      formData.notificationEmail || null,
      formData.notificationName || null,
      JSON.stringify(formData)
    ]);

    const dbCaseId = agreementResult.rows[0].case_id;

    // Insert plaintiffs
    const plaintiffs = extractPlaintiffs(formData);
    for (const plaintiff of plaintiffs) {
      await client.query(`
        INSERT INTO contingency_plaintiffs (
          case_id, plaintiff_index, first_name, last_name,
          address, unit_number, email, phone, is_minor, guardian_plaintiff_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `, [
        dbCaseId,
        plaintiff.index,
        plaintiff.firstName,
        plaintiff.lastName,
        plaintiff.address,
        plaintiff.unitNumber,
        plaintiff.email,
        plaintiff.phone,
        plaintiff.isMinor,
        plaintiff.guardianId
      ]);
    }

    // Insert defendants
    const defendants = extractDefendants(formData);
    for (const defendant of defendants) {
      await client.query(`
        INSERT INTO contingency_defendants (
          case_id, defendant_index, first_name, last_name
        ) VALUES ($1, $2, $3, $4)
      `, [
        dbCaseId,
        defendant.index,
        defendant.firstName,
        defendant.lastName
      ]);
    }

    await client.query('COMMIT');

    logger.info('Contingency agreement submitted', { caseId: dbCaseId });

    // Generate documents for all plaintiffs
    let generatedDocs = [];
    let documentStatus = 'pending';

    try {
      const generator = new ContingencyDocumentGenerator();
      generatedDocs = await generator.generateAgreements(formData);
      documentStatus = 'completed';

      // Update document status in database
      await pool.query(
        'UPDATE contingency_agreements SET document_status = $1, document_paths = $2 WHERE case_id = $3',
        [documentStatus, JSON.stringify(generatedDocs), dbCaseId]
      );

      logger.info('Documents generated successfully', {
        caseId: dbCaseId,
        documentCount: generatedDocs.length
      });
    } catch (docError) {
      logger.error('Failed to generate documents', {
        caseId: dbCaseId,
        error: docError.message
      });

      // Update status to failed but don't fail the entire request
      await pool.query(
        'UPDATE contingency_agreements SET document_status = $1 WHERE case_id = $2',
        ['failed', dbCaseId]
      );
    }

    res.status(201).json({
      success: true,
      id: caseId,
      dbCaseId: dbCaseId,
      documentStatus,
      generatedDocuments: generatedDocs,
      message: 'Contingency agreement submitted successfully'
    });

  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Error submitting contingency agreement', {
      error: error.message,
      stack: error.stack,
      code: error.code,
      detail: error.detail,
      formDataSample: {
        plaintiffCount: req.body.plaintiffCount,
        defendantCount: req.body.defendantCount,
        hasPropertyStreet: !!req.body['property-street']
      }
    });
    res.status(500).json({
      success: false,
      error: 'Failed to submit contingency agreement',
      // Include error details in non-production for debugging
      ...(process.env.NODE_ENV !== 'production' && {
        details: error.message,
        code: error.code
      })
    });
  } finally {
    client.release();
  }
});

/**
 * GET /api/contingency-entries/:caseId
 * Retrieve a contingency agreement by case ID
 */
router.get('/contingency-entries/:caseId', async (req, res) => {
  try {
    const { caseId } = req.params;

    // Get agreement
    const agreementResult = await pool.query(
      'SELECT * FROM contingency_agreements WHERE case_id = $1',
      [caseId]
    );

    if (agreementResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Agreement not found'
      });
    }

    const agreement = agreementResult.rows[0];

    // Get plaintiffs
    const plaintiffsResult = await pool.query(
      'SELECT * FROM contingency_plaintiffs WHERE case_id = $1 ORDER BY plaintiff_index',
      [caseId]
    );

    // Get defendants
    const defendantsResult = await pool.query(
      'SELECT * FROM contingency_defendants WHERE case_id = $1 ORDER BY defendant_index',
      [caseId]
    );

    res.json({
      success: true,
      data: {
        agreement,
        plaintiffs: plaintiffsResult.rows,
        defendants: defendantsResult.rows
      }
    });

  } catch (error) {
    logger.error('Error retrieving contingency agreement', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve contingency agreement'
    });
  }
});

/**
 * GET /api/contingency-entries
 * List all contingency agreements
 */
router.get('/contingency-entries', async (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query;

    const result = await pool.query(`
      SELECT
        ca.id,
        ca.case_id,
        ca.property_address,
        ca.submitted_at,
        ca.document_status,
        COUNT(DISTINCT cp.id) as plaintiff_count,
        COUNT(DISTINCT cd.id) as defendant_count
      FROM contingency_agreements ca
      LEFT JOIN contingency_plaintiffs cp ON ca.case_id = cp.case_id
      LEFT JOIN contingency_defendants cd ON ca.case_id = cd.case_id
      GROUP BY ca.id, ca.case_id, ca.property_address, ca.submitted_at, ca.document_status
      ORDER BY ca.submitted_at DESC
      LIMIT $1 OFFSET $2
    `, [limit, offset]);

    const countResult = await pool.query('SELECT COUNT(*) FROM contingency_agreements');
    const total = parseInt(countResult.rows[0].count);

    res.json({
      success: true,
      data: result.rows,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: (parseInt(offset) + result.rows.length) < total
      }
    });

  } catch (error) {
    logger.error('Error listing contingency agreements', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to list contingency agreements'
    });
  }
});

/**
 * PUT /api/contingency-entries/:caseId
 * Update a contingency agreement
 */
router.put('/contingency-entries/:caseId', async (req, res) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const { caseId } = req.params;
    const formData = req.body;

    // Build property address from separate fields
    const propertyAddress = formData.propertyAddress || formData['property-address'] ||
      `${formData['property-street'] || ''}, ${formData['property-city'] || ''}, ${formData['property-state'] || ''} ${formData['property-zip'] || ''}`.trim();

    // Update main agreement
    await client.query(`
      UPDATE contingency_agreements
      SET
        property_address = $1,
        notification_email = $2,
        notification_name = $3,
        form_data = $4,
        updated_at = CURRENT_TIMESTAMP
      WHERE case_id = $5
    `, [
      propertyAddress,
      formData.notificationEmail || null,
      formData.notificationName || null,
      JSON.stringify(formData),
      caseId
    ]);

    // Delete existing plaintiffs and defendants
    await client.query('DELETE FROM contingency_plaintiffs WHERE case_id = $1', [caseId]);
    await client.query('DELETE FROM contingency_defendants WHERE case_id = $1', [caseId]);

    // Insert updated plaintiffs
    const plaintiffs = extractPlaintiffs(formData);
    for (const plaintiff of plaintiffs) {
      await client.query(`
        INSERT INTO contingency_plaintiffs (
          case_id, plaintiff_index, first_name, last_name,
          address, unit_number, email, phone, is_minor, guardian_plaintiff_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `, [
        caseId,
        plaintiff.index,
        plaintiff.firstName,
        plaintiff.lastName,
        plaintiff.address,
        plaintiff.unitNumber,
        plaintiff.email,
        plaintiff.phone,
        plaintiff.isMinor,
        plaintiff.guardianId
      ]);
    }

    // Insert updated defendants
    const defendants = extractDefendants(formData);
    for (const defendant of defendants) {
      await client.query(`
        INSERT INTO contingency_defendants (
          case_id, defendant_index, first_name, last_name
        ) VALUES ($1, $2, $3, $4)
      `, [
        caseId,
        defendant.index,
        defendant.firstName,
        defendant.lastName
      ]);
    }

    await client.query('COMMIT');

    logger.info('Contingency agreement updated', { caseId });

    res.json({
      success: true,
      message: 'Contingency agreement updated successfully'
    });

  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Error updating contingency agreement', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to update contingency agreement'
    });
  } finally {
    client.release();
  }
});

/**
 * DELETE /api/contingency-entries/:caseId
 * Delete a contingency agreement
 */
router.delete('/contingency-entries/:caseId', async (req, res) => {
  try {
    const { caseId } = req.params;

    const result = await pool.query(
      'DELETE FROM contingency_agreements WHERE case_id = $1 RETURNING case_id',
      [caseId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Agreement not found'
      });
    }

    logger.info('Contingency agreement deleted', { caseId });

    res.json({
      success: true,
      message: 'Contingency agreement deleted successfully'
    });

  } catch (error) {
    logger.error('Error deleting contingency agreement', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to delete contingency agreement'
    });
  }
});

/**
 * GET /api/contingency-entries/:caseId/download
 * Download documents for a case
 * - Single plaintiff: Direct .docx download
 * - Multiple plaintiffs: Zip file with all documents
 */
router.get('/contingency-entries/:caseId/download', async (req, res) => {
  try {
    const { caseId } = req.params;

    // Get agreement to find document paths
    const agreementResult = await pool.query(
      'SELECT document_paths, case_id FROM contingency_agreements WHERE case_id = $1',
      [caseId]
    );

    if (agreementResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Case not found'
      });
    }

    const documentPaths = agreementResult.rows[0].document_paths;

    if (!documentPaths || documentPaths.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No documents found for this case'
      });
    }

    const fs = require('fs');
    const path = require('path');

    // Filter out any template files and only include generated agreements
    const generatedDocs = documentPaths.filter(docPath => {
      const filename = path.basename(docPath);
      // Exclude template files (containing "Template" in name) and only include generated agreements
      return !filename.includes('Template') && filename.startsWith('ContingencyAgreement_');
    });

    if (generatedDocs.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No generated documents found for this case'
      });
    }

    // Single plaintiff: Download the .docx file directly
    if (generatedDocs.length === 1) {
      const docPath = generatedDocs[0];

      if (!fs.existsSync(docPath)) {
        return res.status(404).json({
          success: false,
          error: 'Document file not found'
        });
      }

      const filename = path.basename(docPath);
      res.download(docPath, filename, (err) => {
        if (err) {
          logger.error('Error downloading single document', { error: err.message });
        } else {
          logger.info('Single document downloaded', { caseId, filename });
        }
      });

    } else {
      // Multiple plaintiffs: Create zip file
      const archiver = require('archiver');
      const archive = archiver('zip', {
        zlib: { level: 9 }
      });

      // Set response headers for zip download
      res.attachment(`ContingencyAgreements_${caseId}.zip`);
      archive.pipe(res);

      // Add each generated document to the zip
      for (const docPath of generatedDocs) {
        if (fs.existsSync(docPath)) {
          const filename = path.basename(docPath);
          archive.file(docPath, { name: filename });
        }
      }

      await archive.finalize();

      logger.info('Documents downloaded as zip', {
        caseId,
        documentCount: generatedDocs.length
      });
    }

  } catch (error) {
    logger.error('Error downloading documents', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to download documents'
    });
  }
});

module.exports = router;
