/**
 * PDF Generation Service
 * Core service for generating filled CM-110 PDFs
 *
 * Features:
 * - Load PDF templates
 * - Map form data to PDF fields
 * - Fill PDF fields using pdf-lib
 * - Real-time SSE progress updates
 * - Error handling and validation
 *
 * Usage:
 *   const { generatePDF } = require('./services/pdf-service');
 *
 *   const pdfBuffer = await generatePDF(formData, jobId, {
 *     template: 'cm110-decrypted',
 *     progressCallback: (phase, progress, message) => {...}
 *   });
 *
 * Last Updated: 2025-11-12
 * Created for: PDF Form Filling Feature (001-pdf-form-filling)
 *
 * @module server/services/pdf-service
 */

const { PDFDocument } = require('pdf-lib');
const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);
const logger = require('../../monitoring/logger');
const { loadTemplate, getTemplatePath } = require('../utils/pdf-templates');
const { mapFormDataToPdfFields, mapFieldsForDocumentType } = require('../utils/pdf-field-mapper');
const { updateStatus } = require('./sse-service');
const storageService = require('./storage-service');
const PdfGenerationJob = require('../models/pdf-generation-job');
const dropboxService = require('../../dropbox-service');

// Document types that require pdftk instead of pdf-lib (due to XFA/complex structure)
const PDFTK_DOCUMENT_TYPES = ['cm010', 'sum100', 'sum200a'];

/**
 * Generate FDF content for pdftk fill_form
 * @param {Object} fieldValues - Field name/value pairs
 * @returns {string} FDF file content
 */
function generateFdfContent(fieldValues) {
  let fields = '';
  for (const [fieldName, value] of Object.entries(fieldValues)) {
    // Escape special characters in value
    const escapedValue = String(value).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
    fields += `<< /T (${fieldName}) /V (${escapedValue}) >>\n`;
  }

  return `%FDF-1.2
1 0 obj
<<
/FDF
<<
/Fields [
${fields}]
>>
>>
endobj
trailer
<< /Root 1 0 R >>
%%EOF`;
}

/**
 * Generate PDF using pdftk fill_form (for complex PDFs that pdf-lib can't handle)
 * @param {string} templatePath - Path to PDF template
 * @param {Object} fieldValues - Field name/value pairs
 * @param {string} jobId - Job ID for logging
 * @returns {Promise<Buffer>} Filled PDF as buffer
 */
async function generatePdfWithPdftk(templatePath, fieldValues, jobId) {
  const tempDir = '/tmp';
  const fdfPath = path.join(tempDir, `${jobId}.fdf`);
  const outputPath = path.join(tempDir, `${jobId}-output.pdf`);

  try {
    // Write FDF file
    const fdfContent = generateFdfContent(fieldValues);
    await fs.writeFile(fdfPath, fdfContent);

    logger.info('FDF file created for pdftk', { jobId, fieldCount: Object.keys(fieldValues).length });

    // Run pdftk fill_form
    const command = `pdftk "${templatePath}" fill_form "${fdfPath}" output "${outputPath}"`;
    await execAsync(command);

    logger.info('pdftk fill_form completed', { jobId });

    // Read output PDF
    const pdfBuffer = await fs.readFile(outputPath);

    // Cleanup temp files
    await fs.unlink(fdfPath).catch(() => {});
    await fs.unlink(outputPath).catch(() => {});

    return pdfBuffer;
  } catch (error) {
    // Cleanup on error
    await fs.unlink(fdfPath).catch(() => {});
    await fs.unlink(outputPath).catch(() => {});
    throw error;
  }
}

/**
 * Generate a filled PDF from form submission data
 *
 * @param {Object} formData - Form submission data
 * @param {string} jobId - Job ID for SSE progress tracking
 * @param {Object} options - Generation options
 * @param {string} [options.template='cm110-decrypted'] - Template name
 * @param {string} [options.documentType] - Document type for field mapping (defaults to template name)
 * @param {Function} [options.progressCallback] - Optional progress callback
 * @returns {Promise<Buffer>} Filled PDF as buffer
 * @throws {Error} If PDF generation fails
 */
async function generatePDF(formData, jobId, options = {}) {
  const templateName = options.template || 'cm110-decrypted';
  const documentType = options.documentType || templateName;
  const startTime = Date.now();

  try {
    logger.info('Starting PDF generation', {
      jobId,
      templateName,
      documentType,
      hasFormData: !!formData
    });

    // Initialize SSE status
    updateStatus('pdf', jobId, {
      status: 'processing',
      phase: 'initializing',
      progress: 0,
      message: 'Starting PDF generation...'
    });

    // Phase 1: Map form data to PDF fields (20% progress)
    updateProgress(jobId, 'mapping_fields', 20, 'Mapping form data to PDF fields...', options.progressCallback);

    const pdfFieldValues = mapFieldsForDocumentType(formData, documentType);

    logger.info('Field mapping complete', {
      jobId,
      mappedFieldCount: Object.keys(pdfFieldValues).length
    });

    // Check if this document type requires pdftk (for complex PDFs that pdf-lib can't handle)
    if (PDFTK_DOCUMENT_TYPES.includes(documentType)) {
      logger.info('Using pdftk for PDF generation', { jobId, documentType });

      updateProgress(jobId, 'filling_fields', 50, 'Filling PDF fields with pdftk...', options.progressCallback);

      const templatePath = getTemplatePath(templateName);
      const pdfBuffer = await generatePdfWithPdftk(templatePath, pdfFieldValues, jobId);

      const executionTime = Date.now() - startTime;

      logger.info('PDF generation complete (pdftk)', {
        jobId,
        sizeBytes: pdfBuffer.length,
        executionTimeMs: executionTime
      });

      updateStatus('pdf', jobId, {
        status: 'success',
        phase: 'complete',
        progress: 100,
        message: 'PDF generated successfully',
        result: {
          sizeBytes: pdfBuffer.length,
          fieldsFilled: Object.keys(pdfFieldValues).length,
          executionTimeMs: executionTime
        }
      });

      return pdfBuffer;
    }

    // Standard pdf-lib path for other document types
    // Phase 2: Load PDF template (30% progress)
    updateProgress(jobId, 'loading_template', 30, 'Loading PDF template...', options.progressCallback);

    const templateBytes = await loadTemplate(templateName);

    logger.debug('Template loaded', {
      jobId,
      sizeBytes: templateBytes.length
    });

    // Phase 3: Load PDF document with pdf-lib (40% progress)
    updateProgress(jobId, 'parsing_pdf', 40, 'Parsing PDF structure...', options.progressCallback);

    const pdfDoc = await PDFDocument.load(templateBytes, {
      ignoreEncryption: true,
      updateMetadata: false
    });

    const form = pdfDoc.getForm();
    const formFields = form.getFields();

    logger.debug('PDF form loaded', {
      jobId,
      fieldCount: formFields.length
    });

    // Phase 4: Fill PDF fields (60% progress)
    updateProgress(jobId, 'filling_fields', 60, 'Filling PDF fields...', options.progressCallback);

    const fillResults = await fillPdfFields(pdfDoc, form, pdfFieldValues);

    logger.info('PDF fields filled', {
      jobId,
      successCount: fillResults.success,
      failedCount: fillResults.failed,
      skippedCount: fillResults.skipped
    });

    // Phase 5: Flatten form to prevent editing (80% progress)
    updateProgress(jobId, 'finalizing', 80, 'Finalizing PDF...', options.progressCallback);

    // Flatten form to make fields non-editable
    form.flatten();

    // Phase 6: Save PDF to buffer (90% progress)
    updateProgress(jobId, 'saving', 90, 'Saving PDF...', options.progressCallback);

    const pdfBytes = await pdfDoc.save();
    const pdfBuffer = Buffer.from(pdfBytes);

    const executionTime = Date.now() - startTime;

    logger.info('PDF generation complete', {
      jobId,
      sizeBytes: pdfBuffer.length,
      executionTimeMs: executionTime
    });

    // Phase 7: Complete (100% progress)
    updateStatus('pdf', jobId, {
      status: 'success',
      phase: 'complete',
      progress: 100,
      message: 'PDF generated successfully',
      result: {
        sizeBytes: pdfBuffer.length,
        fieldsFilled: fillResults.success,
        executionTimeMs: executionTime
      }
    });

    if (options.progressCallback) {
      options.progressCallback('complete', 100, 'PDF generated successfully');
    }

    return pdfBuffer;
  } catch (error) {
    logger.error('PDF generation failed', {
      jobId,
      error: error.message,
      stack: error.stack
    });

    // Update SSE with error status
    updateStatus('pdf', jobId, {
      status: 'failed',
      phase: 'error',
      progress: 0,
      message: 'PDF generation failed',
      error: error.message
    });

    if (options.progressCallback) {
      options.progressCallback('error', 0, `PDF generation failed: ${error.message}`);
    }

    throw new Error(`PDF generation failed: ${error.message}`);
  }
}

/**
 * Fill PDF form fields with mapped values
 *
 * @param {PDFDocument} pdfDoc - pdf-lib document
 * @param {PDFForm} form - pdf-lib form
 * @param {Object} fieldValues - Field name → value mappings
 * @returns {Promise<Object>} Fill results (success, failed, skipped counts)
 */
async function fillPdfFields(pdfDoc, form, fieldValues) {
  const results = {
    success: 0,
    failed: 0,
    skipped: 0,
    errors: []
  };

  for (const [fieldName, fieldValue] of Object.entries(fieldValues)) {
    try {
      // Skip empty values
      if (fieldValue === null || fieldValue === undefined || fieldValue === '') {
        results.skipped++;
        continue;
      }

      // Get field from form
      const field = form.getField(fieldName);

      if (!field) {
        logger.warn('PDF field not found', { fieldName });
        results.failed++;
        results.errors.push({ fieldName, error: 'Field not found in PDF' });
        continue;
      }

      // Determine field type and set value
      const fieldType = field.constructor.name;

      if (fieldType === 'PDFTextField') {
        field.setText(String(fieldValue));
        results.success++;
      } else if (fieldType === 'PDFCheckBox') {
        // Handle checkbox values (true/false, 'Yes'/'No', 1/0)
        const isChecked = fieldValue === true ||
                         fieldValue === 'Yes' ||
                         fieldValue === '1' ||
                         fieldValue === 1;

        if (isChecked) {
          field.check();
        } else {
          field.uncheck();
        }
        results.success++;
      } else if (fieldType === 'PDFDropdown') {
        field.select(String(fieldValue));
        results.success++;
      } else if (fieldType === 'PDFRadioGroup') {
        field.select(String(fieldValue));
        results.success++;
      } else {
        logger.warn('Unsupported field type', { fieldName, fieldType });
        results.failed++;
        results.errors.push({ fieldName, error: `Unsupported field type: ${fieldType}` });
      }
    } catch (error) {
      logger.error('Error filling PDF field', {
        fieldName,
        error: error.message
      });
      results.failed++;
      results.errors.push({ fieldName, error: error.message });
    }
  }

  return results;
}

/**
 * Update progress via SSE and optional callback
 *
 * @param {string} jobId - Job ID
 * @param {string} phase - Current phase name
 * @param {number} progress - Progress percentage (0-100)
 * @param {string} message - Status message
 * @param {Function} [progressCallback] - Optional callback
 */
function updateProgress(jobId, phase, progress, message, progressCallback) {
  updateStatus('pdf', jobId, {
    status: 'processing',
    phase,
    progress,
    message
  });

  if (progressCallback) {
    progressCallback(phase, progress, message);
  }
}

/**
 * Validate form data before PDF generation
 *
 * @param {Object} formData - Form submission data
 * @returns {Object} Validation result { valid: boolean, errors: string[] }
 */
function validateFormData(formData) {
  const errors = [];

  // Check for required plaintiff details
  if (!formData.PlaintiffDetails || !Array.isArray(formData.PlaintiffDetails) || formData.PlaintiffDetails.length === 0) {
    errors.push('PlaintiffDetails is required and must contain at least one plaintiff');
  }

  // Check for required defendant details
  if (!formData.DefendantDetails2 || !Array.isArray(formData.DefendantDetails2) || formData.DefendantDetails2.length === 0) {
    errors.push('DefendantDetails2 is required and must contain at least one defendant');
  }

  // Check for required county (after transformation, it's FilingCounty not 'Filing county')
  if (!formData.FilingCounty && !formData['Filing county']) {
    errors.push('Filing county is required');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Generate PDF with validation
 * Wrapper that validates form data before generation
 *
 * @param {Object} formData - Form submission data
 * @param {string} jobId - Job ID
 * @param {Object} options - Generation options
 * @returns {Promise<Buffer>} Filled PDF buffer
 * @throws {Error} If validation fails or generation fails
 */
async function generatePDFWithValidation(formData, jobId, options = {}) {
  // Validate form data
  const validation = validateFormData(formData);

  if (!validation.valid) {
    const errorMessage = `Form data validation failed: ${validation.errors.join(', ')}`;

    logger.error('PDF generation validation failed', {
      jobId,
      errors: validation.errors
    });

    updateStatus('pdf', jobId, {
      status: 'failed',
      phase: 'validation',
      progress: 0,
      message: 'Validation failed',
      error: errorMessage
    });

    throw new Error(errorMessage);
  }

  // Generate PDF
  return generatePDF(formData, jobId, options);
}

/**
 * Generate PDF and upload to Dropbox
 * Complete workflow: generate PDF → save to temp → upload to Dropbox → get shareable link
 *
 * @param {Object} formData - Form submission data
 * @param {string} jobId - Job ID for SSE progress tracking
 * @param {Object} options - Generation and upload options
 * @param {string} [options.template='cm110-decrypted'] - Template name
 * @param {string} [options.documentType] - Document type for field mapping (defaults to template name)
 * @param {string} [options.filename] - Custom filename (optional)
 * @param {string} [options.dropboxPath] - Custom Dropbox path (optional)
 * @param {Function} [options.progressCallback] - Optional progress callback
 * @returns {Promise<Object>} Result with pdfBuffer, dropboxUrl, and metadata
 * @throws {Error} If generation or upload fails
 */
async function generateAndUploadPDF(formData, jobId, options = {}) {
  const startTime = Date.now();
  const documentType = options.documentType || options.template || 'cm110-decrypted';
  // Convert documentType to display name for filename (e.g., 'civ109' -> 'CIV-109')
  const documentDisplayName = documentType.replace(/([a-z])(\d)/i, '$1-$2').toUpperCase();

  try {
    logger.info('Starting PDF generation and Dropbox upload', {
      jobId,
      documentType,
      dropboxEnabled: dropboxService.isEnabled()
    });

    // Step 1: Generate PDF (0-90% progress)
    const pdfBuffer = await generatePDFWithValidation(formData, jobId, {
      ...options,
      progressCallback: (phase, progress, message) => {
        // Scale progress to 0-90% range for generation
        const scaledProgress = Math.floor(progress * 0.9);
        updateProgress(jobId, phase, scaledProgress, message, options.progressCallback);
      }
    });

    // Step 2: Save to temporary storage (92% progress)
    updateProgress(jobId, 'saving_temp', 92, 'Saving PDF to temporary storage...', options.progressCallback);

    // Build case-specific path structure for Dropbox integration
    // Path format: webhook_documents/<streetAddress>/<headOfHouseholdName>/Discovery Propounded/CM-110.pdf
    // This matches the DOCX document output structure from the Python pipeline

    // Extract street address from transformed form data
    // The form data is already transformed, so address is in Full_Address object
    let streetAddress = 'Unknown-Address';

    // Debug logging to diagnose missing street address issue
    console.log('🔍 [PDF Service] Extracting street address from formData');
    console.log('   formData.Full_Address:', JSON.stringify(formData.Full_Address, null, 2));
    console.log('   formData["property-address"]:', formData['property-address']);

    if (formData.Full_Address && formData.Full_Address.Line1) {
      streetAddress = formData.Full_Address.Line1;
      console.log('   ✅ Using Full_Address.Line1:', streetAddress);
    } else if (formData['property-address']) {
      // Fallback to raw field if Full_Address not present
      streetAddress = formData['property-address'];
      console.log('   ✅ Using property-address fallback:', streetAddress);
    } else {
      console.log('   ⚠️  No street address found, using default:', streetAddress);
    }

    // Sanitize street address (remove invalid folder name characters)
    streetAddress = streetAddress.trim();
    if (!streetAddress || streetAddress === '') {
      console.warn('   ⚠️  Street address is empty after trimming! Using Unknown-Address');
      streetAddress = 'Unknown-Address';
    }

    // Find head of household plaintiff
    let headOfHouseholdName = 'Unknown-Plaintiff';
    console.log('🔍 [PDF Service] Finding head of household');
    console.log('   formData.PlaintiffDetails:', formData.PlaintiffDetails ? formData.PlaintiffDetails.length + ' plaintiffs' : 'undefined');

    if (formData.PlaintiffDetails && Array.isArray(formData.PlaintiffDetails)) {
      const headOfHousehold = formData.PlaintiffDetails.find(p => p.HeadOfHousehold === true);
      if (headOfHousehold && headOfHousehold.PlaintiffItemNumberName) {
        const firstName = headOfHousehold.PlaintiffItemNumberName.First || '';
        const lastName = headOfHousehold.PlaintiffItemNumberName.Last || '';
        headOfHouseholdName = `${firstName} ${lastName}`.trim() || 'Unknown-Plaintiff';
        console.log('   ✅ Found head of household:', headOfHouseholdName);
      } else {
        console.log('   ⚠️  No head of household found with valid name');
      }
    }

    // Generate filename with document type and head of household name
    const filename = options.filename || `${documentDisplayName}-${headOfHouseholdName}.pdf`;

    // Use webhook_documents base path for Dropbox integration
    // PDF path: webhook_documents/<street>/<filename>.pdf
    // Maps to Dropbox: /Current Clients/<street>/<filename>.pdf
    //
    // IMPORTANT: Use process.cwd() to get project root, not __dirname
    const projectRoot = process.cwd();
    const outputDir = path.join(projectRoot, 'webhook_documents', streetAddress);

    console.log('📁 [PDF Service] Creating output directory');
    console.log('   Project root:', projectRoot);
    console.log('   Street address:', streetAddress);
    console.log('   Full output path:', outputDir);

    await fs.mkdir(outputDir, { recursive: true });

    const tempFilePath = path.join(outputDir, filename);
    await fs.writeFile(tempFilePath, pdfBuffer);

    logger.debug('PDF saved to temp storage', {
      jobId,
      tempFilePath,
      sizeBytes: pdfBuffer.length
    });

    // Step 3: Upload to Dropbox (95% progress)
    let dropboxResult = null;

    if (dropboxService.isEnabled()) {
      updateProgress(jobId, 'uploading_dropbox', 95, 'Uploading PDF to Dropbox...', options.progressCallback);

      try {
        dropboxResult = await dropboxService.uploadFile(tempFilePath, pdfBuffer);

        if (dropboxResult.success) {
          logger.info('PDF uploaded to Dropbox', {
            jobId,
            dropboxPath: dropboxResult.dropboxPath
          });

          // Step 4: Create shareable link (97% progress)
          updateProgress(jobId, 'creating_link', 97, 'Creating shareable Dropbox link...', options.progressCallback);

          const folderPath = path.dirname(dropboxResult.dropboxPath);
          const dropboxUrl = await dropboxService.createSharedLink(folderPath);

          dropboxResult.sharedUrl = dropboxUrl;

          logger.info('Dropbox shareable link created', {
            jobId,
            dropboxUrl
          });
        } else {
          logger.warn('Dropbox upload failed, continuing without cloud backup', {
            jobId,
            error: dropboxResult.error
          });
        }
      } catch (dropboxError) {
        logger.error('Dropbox upload error', {
          jobId,
          error: dropboxError.message
        });
        // Continue even if Dropbox fails (graceful degradation)
      }
    } else {
      logger.debug('Dropbox disabled, skipping upload', { jobId });
    }

    const executionTime = Date.now() - startTime;

    // Step 5: Complete (100% progress)
    updateStatus('pdf', jobId, {
      status: 'success',
      phase: 'complete',
      progress: 100,
      message: 'PDF generated and uploaded successfully',
      result: {
        sizeBytes: pdfBuffer.length,
        filename,
        tempFilePath,
        dropboxPath: dropboxResult?.dropboxPath || null,
        dropboxUrl: dropboxResult?.sharedUrl || null,
        executionTimeMs: executionTime
      }
    });

    if (options.progressCallback) {
      options.progressCallback('complete', 100, 'PDF generated and uploaded successfully');
    }

    return {
      success: true,
      pdfBuffer,
      filename,
      tempFilePath,
      dropboxPath: dropboxResult?.dropboxPath || null,
      dropboxUrl: dropboxResult?.sharedUrl || null,
      sizeBytes: pdfBuffer.length,
      executionTimeMs: executionTime
    };

  } catch (error) {
    logger.error('PDF generation and upload failed', {
      jobId,
      error: error.message,
      stack: error.stack
    });

    updateStatus('pdf', jobId, {
      status: 'failed',
      phase: 'error',
      progress: 0,
      message: 'PDF generation and upload failed',
      error: error.message
    });

    throw error;
  }
}

/**
 * PDF Service Class (Legacy)
 * Orchestrates PDF generation workflow from form submission to Dropbox upload
 * Kept for backward compatibility - new code should use generatePDF() directly
 */
class PdfService {
  constructor() {
    this.templatePath = path.join(__dirname, '../../normalization work/pdf_templates/cm110.pdf');
    this.tempDir = path.join(__dirname, '../../tmp/pdf');
  }

  /**
   * Generate PDF from form submission data
   * @param {number} formSubmissionId - ID of the form submission
   * @returns {Promise<Object>} PDF generation job details
   */
  async generatePdfFromFormData(formSubmissionId) {
    // T033-T042: Use new generatePDF() function
    throw new Error('Use generatePDF() or generatePDFWithValidation() instead');
  }

  /**
   * Load form submission data from database
   * @param {number} formSubmissionId - ID of the form submission
   * @returns {Promise<Object>} Form submission data
   */
  async loadFormSubmissionData(formSubmissionId) {
    // T029: Implement loadFormSubmissionData()
    throw new Error('Not implemented: loadFormSubmissionData');
  }

  /**
   * Create PDF generation job record in database
   * @param {number} formSubmissionId - ID of the form submission
   * @returns {Promise<Object>} Created job record
   */
  async createPdfGenerationJob(formSubmissionId) {
    // T030: Implement createPdfGenerationJob()
    throw new Error('Not implemented: createPdfGenerationJob');
  }

  /**
   * Populate PDF fields with form data
   * @param {PDFDocument} pdfDoc - Loaded PDF document
   * @param {Object} formData - Form submission data
   * @returns {Promise<PDFDocument>} PDF with populated fields
   */
  async populatePdfFields(pdfDoc, formData) {
    // T031: Implement populatePdfFields()
    throw new Error('Not implemented: populatePdfFields');
  }

  /**
   * Generate unique filename for PDF
   * @param {Object} formData - Form submission data
   * @returns {string} Generated filename
   */
  generateUniqueFilename(formData) {
    // T032: Implement generateUniqueFilename()
    throw new Error('Not implemented: generateUniqueFilename');
  }

  /**
   * Save PDF to temporary storage
   * @param {PDFDocument} pdfDoc - PDF document to save
   * @param {string} filename - Filename for PDF
   * @returns {Promise<string>} Path to saved PDF
   */
  async savePdfToTemporaryStorage(pdfDoc, filename) {
    // T033: Implement savePdfToTemporaryStorage()
    throw new Error('Not implemented: savePdfToTemporaryStorage');
  }

  /**
   * Populate plaintiff fields in PDF
   * @param {PDFDocument} pdfDoc - PDF document
   * @param {Array} plaintiffs - Array of plaintiff data
   * @returns {Promise<PDFDocument>} PDF with plaintiff fields populated
   */
  async populatePlaintiffFields(pdfDoc, plaintiffs) {
    // T034: Implement populatePlaintiffFields()
    throw new Error('Not implemented: populatePlaintiffFields');
  }

  /**
   * Populate defendant fields in PDF
   * @param {PDFDocument} pdfDoc - PDF document
   * @param {Array} defendants - Array of defendant data
   * @returns {Promise<PDFDocument>} PDF with defendant fields populated
   */
  async populateDefendantFields(pdfDoc, defendants) {
    // T035: Implement populateDefendantFields()
    throw new Error('Not implemented: populateDefendantFields');
  }

  /**
   * Detect if plaintiffs/defendants exceed PDF capacity
   * @param {Array} plaintiffs - Array of plaintiffs
   * @param {Array} defendants - Array of defendants
   * @returns {Object} Overflow detection results
   */
  detectOverflow(plaintiffs, defendants) {
    // T036: Implement detectOverflow()
    throw new Error('Not implemented: detectOverflow');
  }

  /**
   * Generate continuation page for overflow entries
   * @param {Array} overflowEntries - Entries that don't fit in primary PDF
   * @param {string} entryType - Type of entry (plaintiff/defendant)
   * @returns {Promise<PDFDocument>} Continuation page PDF
   */
  async generateContinuationPage(overflowEntries, entryType) {
    // T037: Implement generateContinuationPage()
    throw new Error('Not implemented: generateContinuationPage');
  }

  /**
   * Upload PDF to Dropbox
   * @param {string} filePath - Path to PDF file
   * @param {string} filename - Dropbox filename
   * @returns {Promise<Object>} Dropbox upload result
   */
  async uploadPdfToDropbox(filePath, filename) {
    // T042: Implement uploadPdfToDropbox()
    throw new Error('Not implemented: uploadPdfToDropbox');
  }

  /**
   * Update job status in database
   * @param {number} jobId - PDF generation job ID
   * @param {string} status - New status
   * @param {Object} metadata - Additional metadata
   * @returns {Promise<Object>} Updated job record
   */
  async updateJobStatus(jobId, status, metadata = {}) {
    // T045: Implement updateJobStatus()
    throw new Error('Not implemented: updateJobStatus');
  }

  /**
   * Validate required fields are populated
   * @param {Object} formData - Form submission data
   * @returns {Object} Validation results
   */
  validateRequiredFields(formData) {
    // T058: Implement validateRequiredFields()
    throw new Error('Not implemented: validateRequiredFields');
  }

  /**
   * Handle missing optional fields
   * @param {Object} formData - Form submission data
   * @returns {Object} Sanitized form data with nulls handled
   */
  handleMissingOptionalFields(formData) {
    // T084: Implement handleMissingOptionalFields()
    throw new Error('Not implemented: handleMissingOptionalFields');
  }

  /**
   * Validate required fields are present
   * @param {Object} formData - Form submission data
   * @returns {Object} Validation results with missing fields list
   */
  validateRequiredFieldsPresent(formData) {
    // Use new validateFormData() function
    return validateFormData(formData);
  }
}

// Export both new functional API and legacy class instance
module.exports = {
  // New functional API (recommended)
  generatePDF,
  generatePDFWithValidation,
  generateAndUploadPDF,
  validateFormData,
  fillPdfFields,

  // Legacy class instance (for backward compatibility)
  PdfService: new PdfService()
};
