const fs = require('fs');
const PizZip = require('pizzip');
const ComplaintDocumentGenerator = require('../../services/complaint-document-generator');

function extractText(docxPath) {
    const buf = fs.readFileSync(docxPath);
    const zip = new PizZip(buf);
    const xml = zip.file('word/document.xml').asText();
    return xml
        .replace(/<[^>]+>/g, ' ')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
        .replace(/&apos;/g, "'")
        .replace(/\s+/g, ' ');
}

function makeFormData(plaintiffCount) {
    const data = {
        'case-name': 'Test Case',
        'property-address': '123 Main St',
        'case-number': 'CV-001',
        'city': 'Los Angeles',
        'county': 'Los Angeles',
        plaintiffCount: String(plaintiffCount),
        defendantCount: '1',
        'defendant-1-name': 'Bad Landlord LLC',
        'defendant-1-type': 'corporate',
        causesOfAction: ['constructive-eviction', 'invasion-of-privacy-intrusion-into-private-affairs'],
    };
    const firstNames = ['Jane', 'John', 'Mary', 'Pat'];
    for (let i = 1; i <= plaintiffCount; i++) {
        data[`plaintiff-${i}-first-name`] = firstNames[i - 1] || `Plaintiff${i}`;
        data[`plaintiff-${i}-last-name`] = 'Doe';
        data[`plaintiff-${i}-type`] = 'individual';
    }
    return data;
}

describe('Complaint Document Plaintiff Pluralization', () => {
    let generator;

    beforeAll(() => {
        generator = new ComplaintDocumentGenerator();
    });

    describe('with 2 plaintiffs', () => {
        let text;

        beforeAll(async () => {
            const result = await generator.generateComplaint(makeFormData(2));
            text = extractText(result.outputPath);
        });

        test('caption uses "Plaintiffs"', () => {
            expect(text).toContain('Attorney for Plaintiffs');
            expect(text).toContain('Plaintiffs,');
        });

        test('title reads "PLAINTIFFS’ COMPLAINT" (no orphan S)', () => {
            expect(text).toContain('PLAINTIFFS’ COMPLAINT');
            expect(text).not.toContain('PLAINTIFFS’ S COMPLAINT');
            expect(text).not.toContain('PLAINTIFFS’S COMPLAINT');
        });

        test('"COMES NOW Plaintiff" becomes "COME NOW Plaintiffs ... and bring"', () => {
            expect(text).toContain('COME S NOW Plaintiffs');
            expect(text).toContain('and bring this action');
            expect(text).not.toContain('COMES NOW Plaintiff JANE');
        });

        test('verb agreement: "PLAINTIFFS are and have been"', () => {
            expect(text).toContain('PLAINTIFFS are and have been');
            expect(text).not.toContain('PLAINTIFFS are and has been');
            expect(text).not.toContain('PLAINTIFFS is and');
        });

        test('"occupied by PLAINTIFF" → "PLAINTIFFS"', () => {
            expect(text).toContain('occupied by PLAINTIFFS');
            expect(text).not.toMatch(/occupied by PLAINTIFF\s/);
        });

        test('cause-of-action body verbs agree with plural subject', () => {
            expect(text).toContain('Plaintiffs hereby incorporate');
            expect(text).toContain('Plaintiffs are informed and believe');
            expect(text).not.toContain('Plaintiffs hereby incorporates');
        });

        test('"PLAINTIFFS demand" not "PLAINTIFFS demands"', () => {
            expect(text).toContain('PLAINTIFFS demand a jury trial');
            expect(text).not.toContain('PLAINTIFFS demands');
        });
    });

    describe('with 1 plaintiff', () => {
        let text;

        beforeAll(async () => {
            const result = await generator.generateComplaint(makeFormData(1));
            text = extractText(result.outputPath);
        });

        test('caption stays singular: "Attorney for Plaintiff"', () => {
            expect(text).toContain('Attorney for Plaintiff');
            expect(text).not.toContain('Attorney for Plaintiffs');
        });

        test('"COMES NOW Plaintiff" stays singular', () => {
            expect(text).toContain('COME S NOW Plaintiff');
            expect(text).not.toContain('COME NOW Plaintiffs');
        });

        test('verb agreement preserved: "PLAINTIFF is and has been"', () => {
            expect(text).toContain('PLAINTIFF is and has been');
            expect(text).not.toContain('PLAINTIFFS are and have been');
        });

        test('jury trial demand stays singular', () => {
            expect(text).toContain('PLAINTIFF demands a jury trial');
            expect(text).not.toContain('PLAINTIFFS demand a jury');
        });

        test('cause-text "Plaintiff hereby incorporates" stays singular', () => {
            expect(text).toContain('Plaintiff hereby incorporates');
        });
    });
});
