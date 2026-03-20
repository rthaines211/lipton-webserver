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

// Load causes of action registry
const causesRegistry = JSON.parse(
    fs.readFileSync(path.join(__dirname, '../data/causes-of-action.json'), 'utf8')
);

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

        const validPlaintiffs = plaintiffs.filter(p => p.firstName || p.lastName);
        const validDefendants = defendants.filter(d => d.firstName || d.lastName);

        // Build a lookup of plaintiffs by index for guardian resolution
        const plaintiffByIndex = {};
        validPlaintiffs.forEach(p => { plaintiffByIndex[p.index] = p; });

        // Build plaintiff names (ALL CAPS, semicolon-separated)
        const plaintiffNames = validPlaintiffs
            .map(p => `${p.firstName} ${p.lastName}`.trim().toUpperCase())
            .join('; ');

        // Build plaintiff names with types (ALL CAPS name + type descriptor)
        const plaintiffNamesWithTypes = validPlaintiffs
            .map(p => {
                const name = `${p.firstName} ${p.lastName}`.trim().toUpperCase();
                if (p.type === 'minor') {
                    const guardian = p.guardianIndex ? plaintiffByIndex[p.guardianIndex] : null;
                    if (guardian) {
                        const guardianName = `${guardian.firstName} ${guardian.lastName}`.trim().toUpperCase();
                        return `${name}, minor by and through Guardian Ad Litem, ${guardianName}`;
                    }
                    return `${name}, a minor`;
                }
                return `${name}, an individual`;
            })
            .join('; ');

        // Build defendant names (ALL CAPS, semicolon-separated)
        const defendantNames = validDefendants
            .map(d => `${d.firstName} ${d.lastName}`.trim().toUpperCase())
            .join('; ');

        // Build defendant names with types
        const defendantNamesWithTypes = validDefendants
            .map(d => {
                const name = `${d.firstName} ${d.lastName}`.trim().toUpperCase();
                if (d.type === 'corporate') {
                    return `${name}, a corporate entity`;
                }
                return `${name}, an individual`;
            })
            .join('; ');

        const pronounMap = {
            male: { subject: 'he', possessive: 'his', object: 'him' },
            female: { subject: 'she', possessive: 'her', object: 'her' },
        };

        const individualPlaintiffs = plaintiffs.filter(p => p.type === 'individual');
        const singleIndividual = individualPlaintiffs.length === 1;
        const pronounSelection = pronounMap[caseInfo.pronouns];
        const hasMoveInDate = singleIndividual && caseInfo.moveInDate;
        const hasPronouns = singleIndividual && pronounSelection;

        // Build causes of action data (with pronoun replacement if resolved)
        const pronounReplacements = hasPronouns ? pronounSelection : null;
        const causesData = this.buildCausesOfActionData(causes, pronounReplacements);
        const causesList = this.buildCausesOfActionList(causes);

        const moveInDateValue = hasMoveInDate
            ? new Date(caseInfo.moveInDate + 'T00:00:00').toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
            : '<Move In Date>';

        const pronounSubjectValue = hasPronouns ? pronounSelection.subject : '<Pronoun Subject>';
        const pronounPossessiveValue = hasPronouns ? pronounSelection.possessive : '<Pronoun Possessive>';
        const pronounObjectValue = hasPronouns ? pronounSelection.object : '<Pronoun Object>';

        const templateData = {
            'Date': this.formatDateOrdinal(new Date()),
            'Case Name': caseInfo.caseName || '',
            'Property Address': caseInfo.propertyAddress || '',
            'Case Number': caseInfo.caseNumber || '',
            'Filing Date': caseInfo.filingDate || '',
            'City': caseInfo.city || '',
            'County': caseInfo.county || '',
            'Plaintiff Names': plaintiffNames,
            'Plaintiff Names With Types': plaintiffNamesWithTypes,
            'Defendant Names': defendantNames,
            'Defendant Names With Types': defendantNamesWithTypes,
            'Move In Date': moveInDateValue,
            'Pronoun Subject': pronounSubjectValue,
            'Pronoun Possessive': pronounPossessiveValue,
            'Pronoun Object': pronounObjectValue,
            'Causes of Action List': causesList,
            'causes': causesData,
        };

        doc.render(templateData);

        const highlightPlaceholders = [];
        if (!hasMoveInDate) highlightPlaceholders.push('<Move In Date>');
        if (!hasPronouns) {
            highlightPlaceholders.push('<Pronoun Subject>');
            highlightPlaceholders.push('<Pronoun Possessive>');
            highlightPlaceholders.push('<Pronoun Object>');
        }

        // Split causes list items into separate paragraphs for proper hanging indent
        this.splitCausesListIntoParagraphs(doc.getZip());

        if (highlightPlaceholders.length > 0) {
            this.applyYellowHighlight(doc.getZip(), highlightPlaceholders);
        }

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
            propertyAddress: formData['property-address'] || formData.propertyAddress || '',
            caseNumber: formData['case-number'] || formData.caseNumber || '',
            filingDate: formData['filing-date'] || formData.filingDate || '',
            city: formData['city'] || '',
            county: formData['county'] || '',
            moveInDate: formData['move-in-date'] || '',
            pronouns: formData['pronouns'] || '',
        };

        const plaintiffs = [];
        const plaintiffCount = parseInt(formData.plaintiffCount) || 1;
        for (let i = 1; i <= plaintiffCount; i++) {
            plaintiffs.push({
                index: i,
                firstName: formData[`plaintiff-${i}-first-name`] || '',
                lastName: formData[`plaintiff-${i}-last-name`] || '',
                type: formData[`plaintiff-${i}-type`] || 'individual',
                guardianIndex: formData[`plaintiff-${i}-guardian`] ? parseInt(formData[`plaintiff-${i}-guardian`]) : null,
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

    /**
     * Build causes of action as array of objects for docxtemplater loop.
     * Each object has: causeHeading, causeTitle, causePlaintiffLine, causeBody
     * The {n} placeholders get a running counter continuous across all causes.
     */
    buildCausesOfActionData(causeIds, pronounReplacements) {
        if (!Array.isArray(causeIds) || causeIds.length === 0) return [];

        const ordinals = [
            'FIRST', 'SECOND', 'THIRD', 'FOURTH', 'FIFTH', 'SIXTH', 'SEVENTH',
            'EIGHTH', 'NINTH', 'TENTH', 'ELEVENTH', 'TWELFTH', 'THIRTEENTH',
            'FOURTEENTH', 'FIFTEENTH', 'SIXTEENTH', 'SEVENTEENTH', 'EIGHTEENTH',
            'NINETEENTH', 'TWENTIETH', 'TWENTY-FIRST', 'TWENTY-SECOND',
            'TWENTY-THIRD', 'TWENTY-FOURTH', 'TWENTY-FIFTH', 'TWENTY-SIXTH',
            'TWENTY-SEVENTH', 'TWENTY-EIGHTH', 'TWENTY-NINTH', 'THIRTIETH',
        ];

        const registryById = {};
        causesRegistry.forEach(c => { registryById[c.id] = c; });

        let paragraphCounter = 57;
        const results = [];

        causeIds.forEach((causeId, index) => {
            const cause = registryById[causeId];
            if (!cause) {
                logger.warn('Unknown cause of action ID, skipping', { causeId });
                return;
            }

            const ordinal = ordinals[index] || `${index + 1}TH`;

            // Parse heading lines
            const headingLines = cause.heading.split('\n').map(l => l.trim()).filter(Boolean);

            // First line(s) are the title, last line is typically "(Plaintiff Against...)"
            const plaintiffLineIdx = headingLines.findIndex(l =>
                /^\(.*(?:plaintiff|plaintiffs|brought|by all|by plaintiff).*(?:against|defendant)/i.test(l)
            );

            let titleLines, plaintiffLine;
            if (plaintiffLineIdx >= 0) {
                titleLines = headingLines.slice(0, plaintiffLineIdx);
                plaintiffLine = headingLines[plaintiffLineIdx];
            } else {
                titleLines = headingLines;
                plaintiffLine = '';
            }

            // Replace {n} + any trailing whitespace with number.tab for consistent spacing
            let body = cause.insertText.replace(/\{n\}\s*/g, () => {
                return `${paragraphCounter++}.\t`;
            });

            // Replace pronoun placeholders in cause text
            if (pronounReplacements) {
                body = body
                    .replace(/\{pronoun_subject\}/g, pronounReplacements.subject)
                    .replace(/\{pronoun_possessive\}/g, pronounReplacements.possessive)
                    .replace(/\{pronoun_object\}/g, pronounReplacements.object);
            }

            // Split body into separate paragraphs for nested loop
            const bodyParagraphs = body.split('\n')
                .map(line => line.trim())
                .filter(Boolean)
                .map(text => ({ text }));

            results.push({
                causeHeading: `${ordinal} CAUSE OF ACTION`,
                causeTitle: titleLines.join('\n'),
                causePlaintiffLine: plaintiffLine,
                bodyParagraphs,
            });
        });

        return results;
    }

    /**
     * Build a numbered summary list of selected causes of action
     * e.g. "(1)    CONSTRUCTIVE EVICTION;\n(2)    BREACH OF CONTRACT;"
     */
    buildCausesOfActionList(causeIds) {
        if (!Array.isArray(causeIds) || causeIds.length === 0) return '';

        const registryById = {};
        causesRegistry.forEach(c => { registryById[c.id] = c; });

        const titles = [];

        causeIds.forEach((causeId) => {
            const cause = registryById[causeId];
            if (!cause) return;

            // Use full heading but strip the "(Plaintiff Against All Defendants...)" line
            const title = cause.heading
                .split('\n')
                .map(l => l.trim())
                .filter(l => !l.match(/^\(.*(?:plaintiff|plaintiffs|brought).*(?:against|defendants)/i))
                .join(' ')
                .toUpperCase();
            titles.push(title);
        });

        // Numbered list with semicolons, "; AND" before last
        // Use |||CAUSES_SPLIT||| delimiter instead of \n so we can post-process into separate paragraphs
        return titles.map((t, i) => {
            const num = `(${i + 1})`;
            if (i < titles.length - 2) return `  ${num}\t${t};`;
            if (i === titles.length - 2) return `  ${num}\t${t}; AND`;
            return `  ${num}\t${t}`;
        }).join('|||CAUSES_SPLIT|||');
    }

    /**
     * Post-processes DOCX XML to apply yellow highlight to placeholder text.
     * @param {PizZip} zip - The PizZip instance of the rendered DOCX
     * @param {string[]} placeholders - Array of placeholder strings to highlight
     */
    applyYellowHighlight(zip, placeholders) {
        if (!placeholders.length) return;

        const docXml = zip.file('word/document.xml').asText();
        let modified = docXml;

        for (const placeholder of placeholders) {
            // Convert to XML entities since DOCX XML encodes < and > as &lt; &gt;
            const xmlEncoded = placeholder.replace(/</g, '&lt;').replace(/>/g, '&gt;');
            // Escape special regex characters in the placeholder text
            const escaped = xmlEncoded.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

            // Match <w:r> elements containing the placeholder text in their <w:t> node.
            // Uses <w:r[^>]*> to match runs with or without attributes (e.g. w:rsidR="...").
            // Captures: (1) run open tag, (2) optional rPr content, (3) the <w:t> element
            const pattern = new RegExp(
                `(<w:r[^>]*>)\\s*(?:<w:rPr>([\\s\\S]*?)</w:rPr>)?\\s*(<w:t[^>]*>${escaped}</w:t>)`,
                'g'
            );

            modified = modified.replace(pattern, (match, rOpen, existingRPr, tElement) => {
                const highlightTag = '<w:highlight w:val="yellow"/>';
                if (existingRPr !== undefined) {
                    // Has existing rPr — inject highlight inside it
                    if (existingRPr.includes('w:highlight')) return match; // already highlighted
                    return `${rOpen}<w:rPr>${existingRPr}${highlightTag}</w:rPr>${tElement}`;
                } else {
                    // No rPr — add one with highlight
                    return `${rOpen}<w:rPr>${highlightTag}</w:rPr>${tElement}`;
                }
            });
        }

        zip.file('word/document.xml', modified);
    }

    /**
     * Post-process DOCX XML to split causes list into separate paragraphs
     * so each item gets its own hanging indent from the template style.
     */
    splitCausesListIntoParagraphs(zip) {
        const filename = 'word/document.xml';
        let xml = zip.file(filename).asText();

        if (!xml.includes('|||CAUSES_SPLIT|||')) return;

        // Find <w:br/> tags that docxtemplater inserted for our delimiter
        // Actually, since we don't use \n, docxtemplater puts the delimiter as literal text
        // We need to find the <w:p> that contains our delimiter and split it

        // Strategy: find the run containing |||CAUSES_SPLIT|||, get its parent paragraph,
        // clone paragraph properties, and create new paragraphs

        // Find the full paragraph containing our markers
        const markerEscaped = '|||CAUSES_SPLIT|||';
        const paraRegex = /<w:p[ >](?:(?!<w:p[ >]).)*?CAUSES_SPLIT.*?<\/w:p>/gs;
        const match = xml.match(paraRegex);

        if (!match || match.length === 0) return;

        const fullPara = match[0];

        // Extract paragraph properties (everything in <w:pPr>...</w:pPr>)
        const pPrMatch = fullPara.match(/<w:pPr>.*?<\/w:pPr>/s);
        const pPr = pPrMatch ? pPrMatch[0] : '';

        // Extract run properties from the first run
        const rPrMatch = fullPara.match(/<w:rPr>.*?<\/w:rPr>/s);
        const rPr = rPrMatch ? rPrMatch[0] : '';

        // Get the paragraph opening tag
        const pOpenMatch = fullPara.match(/^<w:p[^>]*>/);
        const pOpen = pOpenMatch ? pOpenMatch[0] : '<w:p>';

        // Extract all text content and split by our delimiter
        // Get the full text by collecting all <w:t> content
        const textParts = [];
        const textRegex = /<w:t[^>]*>(.*?)<\/w:t>/gs;
        let m;
        let fullText = '';
        while ((m = textRegex.exec(fullPara)) !== null) {
            fullText += m[1];
        }

        const items = fullText.split(markerEscaped);

        // Build replacement paragraphs with empty paragraph between each for spacing
        const emptyPara = `${pOpen}${pPr}<w:r>${rPr}<w:t xml:space="preserve"> </w:t></w:r></w:p>`;
        const newParas = items.map(item => {
            const escaped = item.replace(/&(?!amp;|lt;|gt;|quot;|apos;)/g, '&amp;');
            return `${pOpen}${pPr}<w:r>${rPr}<w:t xml:space="preserve">${escaped}</w:t></w:r></w:p>`;
        }).join(emptyPara);

        xml = xml.replace(fullPara, newParas);
        zip.file(filename, xml);
    }

    /**
     * Format a date as "3rd of October, 2025"
     */
    formatDateOrdinal(date) {
        const day = date.getDate();
        const month = date.toLocaleString('en-US', { month: 'long' });
        const year = date.getFullYear();

        const suffix = (day === 1 || day === 21 || day === 31) ? 'st'
            : (day === 2 || day === 22) ? 'nd'
            : (day === 3 || day === 23) ? 'rd'
            : 'th';

        return `${day}${suffix} of ${month}, ${year}`;
    }
}

module.exports = ComplaintDocumentGenerator;
