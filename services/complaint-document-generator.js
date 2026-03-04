/**
 * Legal Complaint Document Generator
 * Generates DOCX complaint documents using docxtemplater
 *
 * Features:
 * - Generates complaint from form data
 * - Fills template with case, party, and cause-of-action data
 * - Reports progress via onProgress callback (for SSE)
 * - Attorney info is hardcoded in the template (not from form)
 */

const fs = require('fs');
const path = require('path');
const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');
const logger = require('../monitoring/logger');

class ComplaintDocumentGenerator {
    constructor() {
        this.templatePath = path.join(__dirname, '../templates/Legal Complaint - Template.docx');

        this.outputBaseDir = process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'staging'
            ? '/tmp/complaint-documents'
            : path.join(__dirname, '../generated-documents/complaint');

        if (!fs.existsSync(this.outputBaseDir)) {
            fs.mkdirSync(this.outputBaseDir, { recursive: true });
        }
    }

    /**
     * Generate complaint document from form data
     * @param {Object} formData - Form submission data
     * @param {Function} onProgress - Callback(percent, message) for SSE
     * @returns {Object} { outputPath, filename }
     */
    async generateComplaint(formData, onProgress = () => {}) {
        onProgress(10, 'Parsing form data...');

        const { caseInfo, plaintiffs, defendants, causes } = this.parseFormData(formData);

        onProgress(20, 'Loading template...');

        if (!fs.existsSync(this.templatePath)) {
            throw new Error(`Template not found: ${this.templatePath}`);
        }

        const templateContent = fs.readFileSync(this.templatePath, 'binary');
        const zip = new PizZip(templateContent);

        const doc = new Docxtemplater(zip, {
            paragraphLoop: true,
            linebreaks: true,
            delimiters: { start: '<', end: '>' },
        });

        onProgress(40, 'Filling template with form data...');

        // Build plaintiff list string
        const plaintiffNames = plaintiffs
            .filter(p => p.firstName || p.lastName)
            .map(p => `${p.firstName} ${p.lastName}`.trim())
            .join(', ');

        // Build defendant list string
        const defendantNames = defendants
            .filter(d => d.firstName || d.lastName)
            .map(d => `${d.firstName} ${d.lastName}`.trim())
            .join(', ');

        // Build causes of action text
        const causesText = Array.isArray(causes) ? causes.join('\n\n') : '';

        const templateData = {
            'Case Name': caseInfo.caseName || '',
            'Case Number': caseInfo.caseNumber || '',
            'Filing Date': caseInfo.filingDate || '',
            'City': caseInfo.city || '',
            'County': caseInfo.county || '',
            'Plaintiff Names': plaintiffNames,
            'Defendant Names': defendantNames,
            'Causes of Action': causesText,
        };

        doc.render(templateData);

        onProgress(70, 'Generating document...');

        const buf = doc.getZip().generate({
            type: 'nodebuffer',
            compression: 'DEFLATE',
        });

        const safeCaseName = (caseInfo.caseName || 'Complaint')
            .replace(/[^a-zA-Z0-9_\- ]/g, '')
            .replace(/\s+/g, '_');
        const timestamp = new Date().toISOString().split('T')[0];
        const filename = `Complaint_${safeCaseName}_${timestamp}.docx`;
        const outputPath = path.join(this.outputBaseDir, filename);

        fs.writeFileSync(outputPath, buf);

        onProgress(90, 'Document saved...');

        logger.info('Complaint document generated', {
            filename,
            outputPath,
            plaintiffCount: plaintiffs.length,
            defendantCount: defendants.length,
            causesCount: causes.length,
        });

        onProgress(100, 'Complete');

        return { outputPath, filename };
    }

    /**
     * Parse raw form data into structured objects
     */
    parseFormData(formData) {
        const caseInfo = {
            caseName: formData['case-name'] || formData.caseName || '',
            caseNumber: formData['case-number'] || formData.caseNumber || '',
            filingDate: formData['filing-date'] || formData.filingDate || '',
            city: formData['city'] || '',
            county: formData['county'] || '',
        };

        const plaintiffs = [];
        const plaintiffCount = parseInt(formData.plaintiffCount) || 1;
        for (let i = 1; i <= plaintiffCount; i++) {
            plaintiffs.push({
                index: i,
                firstName: formData[`plaintiff-${i}-first-name`] || '',
                lastName: formData[`plaintiff-${i}-last-name`] || '',
                type: formData[`plaintiff-${i}-type`] || 'individual',
            });
        }

        const defendants = [];
        const defendantCount = parseInt(formData.defendantCount) || 1;
        for (let i = 1; i <= defendantCount; i++) {
            defendants.push({
                index: i,
                firstName: formData[`defendant-${i}-first-name`] || '',
                lastName: formData[`defendant-${i}-last-name`] || '',
                type: formData[`defendant-${i}-type`] || 'individual',
            });
        }

        const causes = formData.causesOfAction || formData['causes-of-action'] || [];

        return { caseInfo, plaintiffs, defendants, causes };
    }
}

module.exports = ComplaintDocumentGenerator;
