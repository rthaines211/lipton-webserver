/**
 * PDF Templates Utility
 * Manages PDF template loading and field inspection
 *
 * @module server/utils/pdf-templates
 */

const { PDFDocument } = require('pdf-lib');
const fs = require('fs').promises;
const path = require('path');
const logger = require('../../monitoring/logger');

/**
 * Template Configuration
 * Maps template names to file paths
 */
const TEMPLATE_PATHS = {
  'cm110': path.join(__dirname, '../../normalization work/pdf_templates/cm110.pdf'),
  'cm110-decrypted': path.join(__dirname, '../../normalization work/pdf_templates/cm110-decrypted.pdf'),
  'civ109': path.join(__dirname, '../../new templates/Civil Case Addendum (CIV-109).pdf'),
  'cm010': path.join(__dirname, '../../new templates/Civil Case Cover Sheet (CM-010).pdf')
};

/**
 * Load PDF template from file system
 * @param {string} templateName - Name of the template (e.g., 'cm110', 'cm110-decrypted')
 * @returns {Promise<Buffer>} PDF template bytes
 * @throws {Error} If template not found or cannot be read
 */
async function loadTemplate(templateName) {
  try {
    const templatePath = TEMPLATE_PATHS[templateName];

    if (!templatePath) {
      throw new Error(`Unknown template: ${templateName}. Available templates: ${Object.keys(TEMPLATE_PATHS).join(', ')}`);
    }

    // Validate template exists and is readable
    await validateTemplate(templatePath);

    // Load template file
    const templateBytes = await fs.readFile(templatePath);

    logger.info('PDF template loaded successfully', {
      templateName,
      templatePath,
      sizeBytes: templateBytes.length
    });

    return templateBytes;
  } catch (error) {
    logger.error('Failed to load PDF template', {
      templateName,
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
}

/**
 * Get template fields with names and types
 * Programmatically extracts field metadata from PDF template
 *
 * NOTE: CM-110 uses XFA forms with encryption that pdf-lib cannot read directly.
 * This function is provided for future templates that use standard AcroForms.
 * For CM-110, we use pre-inspected field names from pdftk (cm110-fields-pdftk.txt).
 *
 * @param {string} templateName - Name of the template (e.g., 'cm110')
 * @returns {Promise<Array>} Array of field objects with name, type, value
 */
async function getTemplateFields(templateName) {
  try {
    const templateBytes = await loadTemplate(templateName);

    // Load PDF with pdf-lib
    const pdfDoc = await PDFDocument.load(templateBytes, {
      ignoreEncryption: true,
      updateMetadata: false
    });

    const form = pdfDoc.getForm();
    const fields = form.getFields();

    const fieldInfo = fields.map(field => {
      const fieldName = field.getName();
      const fieldType = field.constructor.name;

      // Try to get current value if available
      let fieldValue = null;
      try {
        if (typeof field.getText === 'function') {
          fieldValue = field.getText();
        } else if (typeof field.isChecked === 'function') {
          fieldValue = field.isChecked();
        }
      } catch (e) {
        // Some fields don't support value retrieval
        fieldValue = null;
      }

      return {
        name: fieldName,
        type: fieldType,
        value: fieldValue
      };
    });

    logger.info('PDF template fields extracted', {
      templateName,
      fieldCount: fieldInfo.length
    });

    return fieldInfo;
  } catch (error) {
    logger.warn('Could not extract PDF fields programmatically', {
      templateName,
      error: error.message,
      note: 'CM-110 uses XFA forms which pdf-lib cannot read. Using pre-inspected field names from pdftk instead.'
    });

    // For CM-110, return empty array since we use pre-inspected fields
    return [];
  }
}

/**
 * Validate template file exists and is readable
 * @param {string} templatePath - Path to template file
 * @returns {Promise<boolean>} True if template is valid
 * @throws {Error} If template is invalid or missing
 */
async function validateTemplate(templatePath) {
  try {
    // Check if file exists and is readable
    await fs.access(templatePath, fs.constants.R_OK);

    // Check file stats
    const stats = await fs.stat(templatePath);

    // Validate file size
    if (stats.size === 0) {
      throw new Error('Template file is empty');
    }

    // Validate it's actually a file (not a directory)
    if (!stats.isFile()) {
      throw new Error('Template path is not a file');
    }

    // Validate file size is reasonable (< 10MB for PDF forms)
    const MAX_SIZE = 10 * 1024 * 1024; // 10MB
    if (stats.size > MAX_SIZE) {
      logger.warn('Template file is unusually large', {
        templatePath,
        sizeBytes: stats.size,
        maxBytes: MAX_SIZE
      });
    }

    logger.debug('Template validation passed', {
      templatePath,
      sizeBytes: stats.size
    });

    return true;
  } catch (error) {
    // Enhance error message for common issues
    if (error.code === 'ENOENT') {
      throw new Error(`Template file not found: ${templatePath}`);
    } else if (error.code === 'EACCES') {
      throw new Error(`Template file not readable (permission denied): ${templatePath}`);
    } else {
      logger.error('Template validation failed', {
        templatePath,
        error: error.message
      });
      throw new Error(`Invalid or corrupted PDF template: ${templatePath} - ${error.message}`);
    }
  }
}

/**
 * Get template path by name
 * @param {string} templateName - Template name
 * @returns {string|null} Template path or null if not found
 */
function getTemplatePath(templateName) {
  return TEMPLATE_PATHS[templateName] || null;
}

/**
 * List available templates
 * @returns {Array<string>} Array of template names
 */
function listTemplates() {
  return Object.keys(TEMPLATE_PATHS);
}

module.exports = {
  loadTemplate,
  getTemplateFields,
  validateTemplate,
  getTemplatePath,
  listTemplates,
  TEMPLATE_PATHS
};
