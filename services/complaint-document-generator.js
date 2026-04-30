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
        const validDefendants = defendants.filter(d => d.name);

        // Build a lookup of plaintiffs by index for guardian resolution
        const plaintiffByIndex = {};
        validPlaintiffs.forEach(p => { plaintiffByIndex[p.index] = p; });

        // Order plaintiffs by unit (grouped: adults first per unit)
        const orderedPlaintiffs = this.orderPlaintiffsByUnit(validPlaintiffs, plaintiffByIndex);
        const hasUnits = validPlaintiffs.some(p => p.unitNumber);

        // Build plaintiff names (ALL CAPS, grouped order)
        const plaintiffNames = this.joinPlaintiffList(
            orderedPlaintiffs.map(p => `${p.firstName} ${p.lastName}`.trim().toUpperCase()),
            hasUnits
        );

        // Build plaintiff names with types (ALL CAPS name + type descriptor, grouped order)
        const plaintiffNamesWithTypes = this.joinPlaintiffList(
            orderedPlaintiffs.map(p => {
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
            }),
            hasUnits
        );

        // Build defendant names (ALL CAPS, semicolon-separated)
        const defendantNames = validDefendants
            .map(d => d.name.trim().toUpperCase())
            .join('; ');

        // Type descriptor map
        const defendantTypeDescriptors = {
            individual: 'an individual',
            corporate: 'a corporate entity',
            llc: 'a limited liability company',
            government_entity: 'a government entity',
            trust: 'a trust',
            estate: 'an estate',
            partnership: 'a partnership',
            association: 'an association',
        };

        // Build defendant names with types
        const defendantNamesWithTypes = validDefendants
            .map(d => {
                const name = d.name.trim().toUpperCase();
                const descriptor = defendantTypeDescriptors[d.type] || 'an individual';
                return `${name}, ${descriptor}`;
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

        // Build causes of action data — always replace pronoun tokens so docxtemplater
        // never sees < > delimiters in cause text. When unresolved, use literal placeholder
        // strings which applyYellowHighlight will find and highlight in the DOCX XML.
        const pronounReplacements = hasPronouns
            ? pronounSelection
            : { subject: '<Pronoun Subject>', possessive: '<Pronoun Possessive>', object: '<Pronoun Object>' };
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

        // Pluralize "Plaintiff" → "Plaintiffs" throughout when multiple plaintiffs
        this.applyPluralization(doc.getZip(), validPlaintiffs.length);

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
                unitNumber: formData[`plaintiff-${i}-unit`] || '',
            });
        }

        const defendants = [];
        const defendantCount = parseInt(formData.defendantCount) || 1;
        for (let i = 1; i <= defendantCount; i++) {
            defendants.push({
                index: i,
                name: formData[`defendant-${i}-name`] || '',
                type: formData[`defendant-${i}-type`] || 'individual',
            });
        }

        const causes = formData.causesOfAction || formData['causes-of-action'] || [];

        return { caseInfo, plaintiffs, defendants, causes };
    }

    /**
     * Order plaintiffs by unit number: group by unit, adults first within each group.
     * Returns a new array in grouped order. If no unit numbers present, returns original order.
     */
    orderPlaintiffsByUnit(plaintiffs, plaintiffByIndex) {
        const hasUnits = plaintiffs.some(p => p.unitNumber);
        if (!hasUnits) return plaintiffs;

        // Resolve minor unit numbers from their guardian
        const resolved = plaintiffs.map(p => {
            if (p.type === 'minor' && p.guardianIndex) {
                const guardian = plaintiffByIndex[p.guardianIndex];
                return { ...p, resolvedUnit: guardian ? guardian.unitNumber : '' };
            }
            return { ...p, resolvedUnit: p.unitNumber };
        });

        // Group by resolved unit number (preserve insertion order of first occurrence)
        const groups = new Map();
        const ungrouped = [];

        resolved.forEach(p => {
            const unit = p.resolvedUnit;
            if (unit) {
                if (!groups.has(unit)) groups.set(unit, []);
                groups.get(unit).push(p);
            } else {
                ungrouped.push(p);
            }
        });

        // Within each group: adults first, then minors
        const sortWithinGroup = (arr) => {
            const adults = arr.filter(p => p.type !== 'minor');
            const minors = arr.filter(p => p.type === 'minor');
            return [...adults, ...minors];
        };

        const ordered = [];
        for (const [, group] of groups) {
            ordered.push(...sortWithinGroup(group));
        }
        // Ungrouped bucket: adults first, appended at end
        ordered.push(...sortWithinGroup(ungrouped));

        return ordered;
    }

    /**
     * Join an array of strings with "; " and "; and " before the last item.
     * Only uses "; and" when unit grouping is active (hasUnits=true).
     */
    joinPlaintiffList(items, hasUnits) {
        if (!hasUnits) return items.join('; ');
        if (items.length <= 1) return items.join('');
        return items.slice(0, -1).join('; ') + '; and ' + items[items.length - 1];
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
            body = body
                .replace(/<Pronoun Subject>/g, pronounReplacements.subject)
                .replace(/<Pronoun Possessive>/g, pronounReplacements.possessive)
                .replace(/<Pronoun Object>/g, pronounReplacements.object);

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
     * Handles placeholders that may be split across multiple <w:r> runs by
     * stripping intervening XML tags to find matches, then rebuilding as a
     * single highlighted run.
     * @param {PizZip} zip - The PizZip instance of the rendered DOCX
     * @param {string[]} placeholders - Array of placeholder strings to highlight
     */
    applyYellowHighlight(zip, placeholders) {
        if (!placeholders.length) return;

        let docXml = zip.file('word/document.xml').asText();

        for (const placeholder of placeholders) {
            const xmlEncoded = placeholder.replace(/</g, '&lt;').replace(/>/g, '&gt;');
            const escaped = xmlEncoded.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

            // First try: placeholder is in a single <w:r> run (common case)
            const singleRunPattern = new RegExp(
                `(<w:r[^>]*>)\\s*(?:<w:rPr>([\\s\\S]*?)</w:rPr>)?\\s*(<w:t[^>]*>${escaped}</w:t>)`,
                'g'
            );

            let matched = false;
            docXml = docXml.replace(singleRunPattern, (match, rOpen, existingRPr, tElement) => {
                matched = true;
                const highlightTag = '<w:highlight w:val="yellow"/>';
                if (existingRPr !== undefined) {
                    if (existingRPr.includes('w:highlight')) return match;
                    return `${rOpen}<w:rPr>${existingRPr}${highlightTag}</w:rPr>${tElement}`;
                } else {
                    return `${rOpen}<w:rPr>${highlightTag}</w:rPr>${tElement}`;
                }
            });

            // Fallback: placeholder is split across multiple <w:r> runs.
            // Find spans of consecutive runs whose combined text contains the placeholder,
            // then collapse them into a single highlighted run.
            if (!matched && docXml.includes(xmlEncoded)) {
                // Extract all <w:r>...</w:r> sequences within each <w:p> paragraph
                docXml = docXml.replace(/<w:p[ >][\s\S]*?<\/w:p>/g, (paragraph) => {
                    // Extract text content from all runs to check if this paragraph contains our placeholder
                    const textOnly = paragraph.replace(/<[^>]+>/g, '');
                    if (!textOnly.includes(xmlEncoded)) return paragraph;

                    // Find runs and their text content
                    const runRegex = /<w:r[ >][\s\S]*?<\/w:r>/g;
                    const runs = [];
                    let m;
                    while ((m = runRegex.exec(paragraph)) !== null) {
                        const runXml = m[0];
                        const textMatch = runXml.match(/<w:t[^>]*>([\s\S]*?)<\/w:t>/);
                        const text = textMatch ? textMatch[1] : '';
                        runs.push({ xml: runXml, text, index: m.index });
                    }

                    // Sliding window: find consecutive runs whose text concatenates to include the placeholder
                    for (let i = 0; i < runs.length; i++) {
                        let combined = '';
                        for (let j = i; j < runs.length; j++) {
                            combined += runs[j].text;
                            if (combined.includes(xmlEncoded)) {
                                // Found it spanning runs[i..j]
                                // Get rPr from first run (if any)
                                const rPrMatch = runs[i].xml.match(/<w:rPr>([\s\S]*?)<\/w:rPr>/);
                                const rPr = rPrMatch ? rPrMatch[1] : '';
                                const highlightTag = '<w:highlight w:val="yellow"/>';
                                const newRPr = rPr
                                    ? (rPr.includes('w:highlight') ? rPr : rPr + highlightTag)
                                    : highlightTag;

                                // Build a single replacement run with the combined text
                                const newRun = `<w:r><w:rPr>${newRPr}</w:rPr><w:t xml:space="preserve">${combined}</w:t></w:r>`;

                                // Replace the span of original runs with the new single run
                                const startIdx = runs[i].index;
                                const endIdx = runs[j].index + runs[j].xml.length;
                                paragraph = paragraph.substring(0, startIdx) + newRun + paragraph.substring(endIdx);

                                // Only fix first occurrence per paragraph, then break
                                break;
                            }
                        }
                        if (combined.includes(xmlEncoded)) break;
                    }

                    return paragraph;
                });
            }
        }

        zip.file('word/document.xml', docXml);
    }

    /**
     * Pluralize "Plaintiff" → "Plaintiffs" (and matching verbs) throughout the
     * rendered document when there are multiple plaintiffs. No-op for 1 plaintiff.
     *
     * Operates on word/document.xml. Substitutions tolerate XML tags between
     * words (template runs are often split mid-phrase: "PLAINTIFF" in one
     * <w:r>, "is" in the next). The "gap" pattern `(?:[\s\S]*?)?` allows any
     * intervening XML between the noun and its verb, but a leading word
     * boundary on the noun and a trailing word boundary on the verb keep the
     * match scoped tightly.
     *
     * Skips the pattern "Plaintiff <CapitalizedName>" so named singular
     * references in cause-of-action text (e.g. "Plaintiff Dakora Robinson")
     * stay singular.
     */
    applyPluralization(zip, plaintiffCount) {
        if (plaintiffCount <= 1) return;

        let xml = zip.file('word/document.xml').asText();

        // GAP: zero-or-more whitespace, XML tags, or punctuation that may
        // separate a subject and its verb across <w:r> runs. Excludes letters
        // and digits so we can't bridge unrelated sentences. Non-greedy.
        const GAP = '(?:[\\s\\xA0]|<[^>]+>|&[a-zA-Z]+;|&#\\d+;|[.,;:()"\\u2018\\u2019\\u201C\\u201D])*?';

        // 1. Verb-agreement substitutions FIRST so the residual "Plaintiff" in
        //    these sentences is then converted by the word-form rules.
        //    Each rule allows XML/whitespace gap between the subject and verb.
        const verbRules = [
            // "COMES NOW Plaintiff" can have XML between COMES/NOW/Plaintiff
            [new RegExp(`\\bCOMES${GAP}NOW${GAP}Plaintiff\\b`, 'g'), 'COME NOW Plaintiffs'],
            [new RegExp(`\\bComes${GAP}now${GAP}Plaintiff\\b`, 'g'), 'Come now Plaintiffs'],
            // "Plaintiff has been" / "PLAINTIFF has been"
            [new RegExp(`\\bPlaintiff(${GAP})has(${GAP})been\\b`, 'g'), 'Plaintiffs$1have$2been'],
            [new RegExp(`\\bPLAINTIFF(${GAP})has(${GAP})been\\b`, 'g'), 'PLAINTIFFS$1have$2been'],
            // "Plaintiff is" / "PLAINTIFF is"
            [new RegExp(`\\bPlaintiff(${GAP})is\\b`, 'g'), 'Plaintiffs$1are'],
            [new RegExp(`\\bPLAINTIFF(${GAP})is\\b`, 'g'), 'PLAINTIFFS$1are'],
            // "Plaintiff was"
            [new RegExp(`\\bPlaintiff(${GAP})was\\b`, 'g'), 'Plaintiffs$1were'],
            [new RegExp(`\\bPLAINTIFF(${GAP})was\\b`, 'g'), 'PLAINTIFFS$1were'],
            // "Plaintiff has" (after "has been" rule already matched)
            [new RegExp(`\\bPlaintiff(${GAP})has\\b`, 'g'), 'Plaintiffs$1have'],
            [new RegExp(`\\bPLAINTIFF(${GAP})has\\b`, 'g'), 'PLAINTIFFS$1have'],
        ];
        for (const [pattern, replacement] of verbRules) {
            xml = xml.replace(pattern, replacement);
        }

        // 2. Word-form substitutions. Order matters: possessive forms before
        //    base. Mixed-case base form excludes "Plaintiff <CapitalizedName>"
        //    so named singular references stay singular (e.g. "Plaintiff
        //    Dakora Robinson"). Handles straight ('), curly (’), and XML-
        //    encoded (&apos;) apostrophes.
        const wordRules = [
            [/\bPlaintiff’s\b/g, 'Plaintiffs’'],
            [/\bPlaintiff's\b/g, "Plaintiffs'"],
            [/\bPlaintiff&apos;s\b/g, 'Plaintiffs&apos;'],
            [/\bPLAINTIFF’S\b/g, 'PLAINTIFFS’'],
            [/\bPLAINTIFF'S\b/g, "PLAINTIFFS'"],
            [/\bPLAINTIFF&apos;S\b/g, 'PLAINTIFFS&apos;'],
            // Skip "Plaintiff <CapitalizedName>" — named singular references
            [/\bPlaintiff\b(?!s)(?!\s+[A-Z][a-z])/g, 'Plaintiffs'],
            // Uppercase form (no named-plaintiff exclusion needed: cause text
            // never has all-caps named references like "PLAINTIFF DAKORA").
            [/\bPLAINTIFF\b(?!S)/g, 'PLAINTIFFS'],
        ];
        for (const [pattern, replacement] of wordRules) {
            xml = xml.replace(pattern, replacement);
        }

        // 2b. Subject-verb agreement fixes that emerge AFTER pluralization.
        //     The cause-of-action text and template both contain singular
        //     verbs that need plural forms when the new subject is plural.
        const followUpVerbRules = [
            // "are and has" / "are and has been" — template phrase
            // "PLAINTIFF is and has been a tenant" gets pluralized to
            // "PLAINTIFFS are and has been..." which needs "have" not "has".
            // The "has" is sometimes split across runs from "been" so rewrite
            // "are and has" directly (ungrammatical regardless).
            [new RegExp(`\\bare${GAP}and${GAP}has\\b`, 'g'), 'are and have'],
            // After "Plaintiffs" / "PLAINTIFFS", common singular verbs from
            // cause-of-action text. Allow XML/whitespace gap between subject
            // and verb so split runs are still matched.
            [new RegExp(`\\b(Plaintiffs|PLAINTIFFS)(${GAP})hereby${GAP}incorporates\\b`, 'g'),
                (m, subj, gap) => `${subj}${gap}hereby incorporate`],
            [new RegExp(`\\b(Plaintiffs|PLAINTIFFS)(${GAP})incorporates\\b`, 'g'),
                (m, subj, gap) => `${subj}${gap}incorporate`],
            [new RegExp(`\\b(Plaintiffs|PLAINTIFFS)(${GAP})demands\\b`, 'g'),
                (m, subj, gap) => `${subj}${gap}demand`],
            [new RegExp(`\\b(Plaintiffs|PLAINTIFFS)(${GAP})prays\\b`, 'g'),
                (m, subj, gap) => `${subj}${gap}pray`],
            [new RegExp(`\\b(Plaintiffs|PLAINTIFFS)(${GAP})seeks\\b`, 'g'),
                (m, subj, gap) => `${subj}${gap}seek`],
            [new RegExp(`\\b(Plaintiffs|PLAINTIFFS)(${GAP})alleges\\b`, 'g'),
                (m, subj, gap) => `${subj}${gap}allege`],
            [new RegExp(`\\b(Plaintiffs|PLAINTIFFS)(${GAP})asserts\\b`, 'g'),
                (m, subj, gap) => `${subj}${gap}assert`],
            [new RegExp(`\\b(Plaintiffs|PLAINTIFFS)(${GAP})repeats\\b`, 'g'),
                (m, subj, gap) => `${subj}${gap}repeat`],
            // "Plaintiffs ... and believes" — the second verb of a compound
            // is also singular in source text.
            [/\band\s+believes\b/g, 'and believe'],
            // "Plaintiffs ... and brings" — template "and brings this action"
            [/\band\s+brings\b/g, 'and bring'],
        ];
        for (const [pattern, replacement] of followUpVerbRules) {
            xml = xml.replace(pattern, replacement);
        }

        // 3. Template oddity fix: the original DOCX has "PLAINTIFF'" (run end)
        //    followed by a separate "S" run, then " COMPLAINT". After the
        //    above rules, that becomes "PLAINTIFFS'" + "S" + " COMPLAINT" =
        //    "PLAINTIFFS'S COMPLAINT". Strip the orphan S run that sits
        //    immediately between "PLAINTIFFS'" and " COMPLAINT".
        xml = xml.replace(
            /(PLAINTIFFS[’']<\/w:t><\/w:r>)<w:r\b[^>]*>(?:<w:rPr>[\s\S]*?<\/w:rPr>)?<w:t[^>]*>S<\/w:t><\/w:r>(\s*<w:r\b[^>]*>(?:<w:rPr>[\s\S]*?<\/w:rPr>)?<w:t[^>]*>\s*COMPLAINT)/g,
            '$1$2'
        );

        zip.file('word/document.xml', xml);
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
