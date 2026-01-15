/**
 * Contingency Agreement Document Generator
 * Generates DOCX contingency fee agreements using docxtemplater
 *
 * Features:
 * - Generates one agreement per plaintiff
 * - Fills template with plaintiff and property data
 * - Handles minors with guardian information
 * - Creates organized file structure
 */

const fs = require('fs');
const path = require('path');
const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');
const logger = require('../monitoring/logger');

class ContingencyDocumentGenerator {
    constructor() {
        this.templatePath = path.join(__dirname, '../templates/LLG Contingency Fee Agreement - Template.docx');
        this.minorTemplatePath = path.join(__dirname, '../templates/LLG Contingency Fee Agreement - Minor.docx');

        // Use /tmp for Cloud Run compatibility (ephemeral storage)
        // In production, files are temporary and will be downloaded immediately
        this.outputBaseDir = process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'staging'
            ? '/tmp/contingency-agreements'
            : path.join(__dirname, '../generated-documents/contingency-agreements');

        // Ensure output directory exists
        if (!fs.existsSync(this.outputBaseDir)) {
            fs.mkdirSync(this.outputBaseDir, { recursive: true });
        }
    }

    /**
     * Generate contingency agreements for all plaintiffs
     * @param {Object} formData - Form submission data
     * @returns {Array} Array of generated document paths
     */
    async generateAgreements(formData) {
        const { propertyInfo, plaintiffs, defendants } = this.parseFormData(formData);
        const generatedDocs = [];

        // Filter out empty plaintiffs (no name)
        const validPlaintiffs = plaintiffs.filter(p => p.firstName || p.lastName);

        logger.info('Starting contingency agreement generation', {
            plaintiffCount: validPlaintiffs.length,
            defendantCount: defendants.length,
            property: propertyInfo.fullAddress
        });

        // Populate guardian data for minors
        this.populateGuardianData(validPlaintiffs);

        // Build set of plaintiff IDs who are guardians (they shouldn't get their own document)
        const guardianIds = new Set();
        validPlaintiffs.forEach(plaintiff => {
            if (plaintiff.isMinor && plaintiff.guardianId) {
                guardianIds.add(parseInt(plaintiff.guardianId));
            }
        });

        // Generate documents only for:
        // 1. Adult plaintiffs who are NOT guardians of minors
        // 2. Minor plaintiffs (they get the minor template with guardian info)
        for (const plaintiff of validPlaintiffs) {
            // Skip if this plaintiff is a guardian for a minor
            if (guardianIds.has(plaintiff.id)) {
                logger.info('Skipping document generation for guardian', {
                    plaintiff: plaintiff.fullName,
                    reason: 'Guardian covered by minor\'s agreement'
                });
                continue;
            }

            try {
                const docPath = await this.generateSingleAgreement(plaintiff, propertyInfo, defendants);
                generatedDocs.push(docPath);

                logger.info('Generated contingency agreement', {
                    plaintiff: plaintiff.fullName,
                    isMinor: plaintiff.isMinor,
                    guardianId: plaintiff.guardianId,
                    path: docPath
                });
            } catch (error) {
                logger.error('Failed to generate agreement for plaintiff', {
                    plaintiff: plaintiff.fullName,
                    error: error.message
                });
                throw error;
            }
        }

        return generatedDocs;
    }

    /**
     * Generate a single contingency agreement for one plaintiff
     * @param {Object} plaintiff - Plaintiff data
     * @param {Object} propertyInfo - Property information
     * @param {Array} defendants - List of defendants
     * @returns {string} Path to generated document
     */
    async generateSingleAgreement(plaintiff, propertyInfo, defendants) {
        // Determine which template to use based on whether plaintiff is a minor
        const isMinor = plaintiff.isMinor;
        const templateToUse = isMinor ? this.minorTemplatePath : this.templatePath;

        // Load appropriate template
        const templateContent = fs.readFileSync(templateToUse, 'binary');
        const zip = new PizZip(templateContent);
        const doc = new Docxtemplater(zip, {
            paragraphLoop: true,
            linebreaks: true,
            delimiters: {
                start: '<',
                end: '>'
            }
        });

        // Prepare defendant names (comma-separated list)
        const defendantNames = defendants.map(d => d.fullName).join(', ');

        // Prepare template data
        let templateData;

        if (isMinor && plaintiff.guardian) {
            // For minors: Use guardian's contact info, include both guardian and minor names
            templateData = {
                'Guardian\'s Full Name': plaintiff.guardian.fullName,
                'Minor\'s Full Name': plaintiff.fullName,
                'Client\'s Full Name': plaintiff.guardian.fullName, // Straight apostrophe
                "Client's Full Name": plaintiff.guardian.fullName, // Curly apostrophe
                'Client Full Name': plaintiff.guardian.fullName, // No apostrophe
                'Clients Full Name': plaintiff.guardian.fullName, // Plural possessive
                'Plaintiff Full Name': plaintiff.guardian.fullName, // Guardian signs
                'Plaintiff Full Address': this.buildFullAddress(plaintiff.guardian, propertyInfo),
                'Plaintiff Email Address': plaintiff.guardian.email,
                'Plaintiff Phone Number': plaintiff.guardian.phone,
                'Defendant Full Name': defendantNames
            };
        } else {
            // For adults: Use plaintiff's own information
            templateData = {
                'Plaintiff Full Name': plaintiff.fullName,
                'Plaintiff Full Address': this.buildFullAddress(plaintiff, propertyInfo),
                'Plaintiff Email Address': plaintiff.email,
                'Plaintiff Phone Number': plaintiff.phone,
                'Defendant Full Name': defendantNames
            };
        }

        // Debug: Log template data to verify all fields are populated
        logger.info('Template data being used for document generation', {
            plaintiff: plaintiff.fullName,
            isMinor: plaintiff.isMinor,
            templateData: templateData
        });

        // Fill template
        doc.render(templateData);

        // Generate output buffer
        const buffer = doc.getZip().generate({
            type: 'nodebuffer',
            compression: 'DEFLATE'
        });

        // Create output directory structure
        const folderName = this.sanitizeForFilename(propertyInfo.street);
        const outputDir = path.join(this.outputBaseDir, folderName);

        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        // Generate filename
        const filename = this.generateFilename(propertyInfo.street, plaintiff);
        const outputPath = path.join(outputDir, filename);

        // Write file
        fs.writeFileSync(outputPath, buffer);

        return outputPath;
    }

    /**
     * Parse form data into structured format
     * @param {Object} formData - Raw form data
     * @returns {Object} Parsed data with propertyInfo, plaintiffs, defendants
     */
    parseFormData(formData) {
        // Extract property information
        const propertyInfo = {
            street: formData['property-street'] || '',
            city: formData['property-city'] || '',
            state: formData['property-state'] || '',
            zip: formData['property-zip'] || '',
            fullAddress: ''
        };

        // Build full address
        propertyInfo.fullAddress = [
            propertyInfo.street,
            propertyInfo.city,
            propertyInfo.state,
            propertyInfo.zip
        ].filter(Boolean).join(', ');

        // Extract plaintiffs
        const plaintiffCount = parseInt(formData.plaintiffCount || '0');
        const plaintiffs = [];

        for (let i = 1; i <= plaintiffCount; i++) {
            const firstName = formData[`plaintiff-${i}-first-name`] || '';
            const lastName = formData[`plaintiff-${i}-last-name`] || '';
            const email = formData[`plaintiff-${i}-email`] || '';
            const phone = formData[`plaintiff-${i}-phone`] || '';
            const unit = formData[`plaintiff-${i}-unit`] || '';
            const isMinor = formData[`plaintiff-${i}-is-minor`] === 'on' || formData[`plaintiff-${i}-is-minor`] === true;
            const guardianId = formData[`plaintiff-${i}-guardian`] || '';

            plaintiffs.push({
                id: i,
                firstName,
                lastName,
                fullName: `${firstName} ${lastName}`.trim(),
                email,
                phone,
                unit,
                isMinor,
                guardianId
            });
        }

        // Extract defendants
        const defendantCount = parseInt(formData.defendantCount || '0');
        const defendants = [];

        for (let i = 1; i <= defendantCount; i++) {
            const firstName = formData[`defendant-${i}-first-name`] || '';
            const lastName = formData[`defendant-${i}-last-name`] || '';

            defendants.push({
                firstName,
                lastName,
                fullName: `${firstName} ${lastName}`.trim()
            });
        }

        return { propertyInfo, plaintiffs, defendants };
    }

    /**
     * Build full address for plaintiff including unit if specified
     * @param {Object} plaintiff - Plaintiff data
     * @param {Object} propertyInfo - Property information
     * @returns {string} Full formatted address
     */
    buildFullAddress(plaintiff, propertyInfo) {
        const parts = [propertyInfo.street];

        if (plaintiff.unit) {
            parts[0] += ` #${plaintiff.unit}`;
        }

        parts.push(propertyInfo.city);
        parts.push(propertyInfo.state);
        parts.push(propertyInfo.zip);

        return parts.filter(Boolean).join(', ');
    }

    /**
     * Generate filename for agreement
     * @param {string} propertyStreet - Property street address
     * @param {Object} plaintiff - Plaintiff data
     * @returns {string} Formatted filename
     */
    generateFilename(propertyStreet, plaintiff) {
        const streetPart = this.sanitizeForFilename(propertyStreet);

        // For minors, use guardian's name in filename (they're the signer)
        let lastNamePart, firstNamePart;
        if (plaintiff.isMinor && plaintiff.guardian) {
            lastNamePart = this.sanitizeForFilename(plaintiff.guardian.lastName);
            firstNamePart = this.sanitizeForFilename(plaintiff.guardian.firstName);
        } else {
            lastNamePart = this.sanitizeForFilename(plaintiff.lastName);
            firstNamePart = this.sanitizeForFilename(plaintiff.firstName);
        }

        return `ContingencyAgreement_${streetPart}_${lastNamePart}_${firstNamePart}.docx`;
    }

    /**
     * Sanitize string for use in filename
     * @param {string} str - String to sanitize
     * @returns {string} Sanitized string safe for filenames
     */
    sanitizeForFilename(str) {
        return str
            .replace(/[^a-zA-Z0-9\s-]/g, '') // Remove special chars
            .replace(/\s+/g, '') // Remove spaces
            .substring(0, 50); // Limit length
    }

    /**
     * Populate email and phone for minor plaintiffs from their guardian
     * @param {Array} plaintiffs - Array of plaintiff objects
     */
    populateGuardianData(plaintiffs) {
        // Create a map of plaintiffs by ID for quick lookup
        const plaintiffMap = {};
        plaintiffs.forEach(p => {
            plaintiffMap[p.id] = p;
        });

        // For each minor plaintiff, attach the full guardian object
        plaintiffs.forEach(plaintiff => {
            if (plaintiff.isMinor && plaintiff.guardianId) {
                const guardian = plaintiffMap[plaintiff.guardianId];

                if (guardian) {
                    // Attach the complete guardian object for template population
                    plaintiff.guardian = {
                        fullName: guardian.fullName,
                        firstName: guardian.firstName,
                        lastName: guardian.lastName,
                        address: guardian.address,
                        unitNumber: guardian.unitNumber,
                        email: guardian.email,
                        phone: guardian.phone
                    };

                    logger.info('Populated guardian data for minor', {
                        minor: plaintiff.fullName,
                        guardian: guardian.fullName,
                        email: guardian.email,
                        phone: guardian.phone
                    });
                } else {
                    logger.warn('Guardian not found for minor plaintiff', {
                        minor: plaintiff.fullName,
                        guardianId: plaintiff.guardianId
                    });
                }
            }
        });
    }
}

module.exports = ContingencyDocumentGenerator;
