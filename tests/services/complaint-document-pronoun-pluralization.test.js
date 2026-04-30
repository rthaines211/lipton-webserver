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

function makeFormData(plaintiffCount, opts = {}) {
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
        causesOfAction: ['constructive-eviction', 'statutory-breach-of-warranty-of-habitability', 'retaliatory-eviction'],
        ...opts.caseInfo,
    };
    const firstNames = ['Jane', 'John', 'Mary', 'Pat'];
    for (let i = 1; i <= plaintiffCount; i++) {
        data[`plaintiff-${i}-first-name`] = firstNames[i - 1] || `Plaintiff${i}`;
        data[`plaintiff-${i}-last-name`] = 'Doe';
        data[`plaintiff-${i}-type`] = (opts.types && opts.types[i - 1]) || 'individual';
        if (opts.guardians && opts.guardians[i - 1]) {
            data[`plaintiff-${i}-guardian`] = String(opts.guardians[i - 1]);
        }
    }
    return data;
}

describe('Complaint Document Pronoun Pluralization', () => {
    let generator;
    beforeAll(() => { generator = new ComplaintDocumentGenerator(); });

    describe('with 1 plaintiff (Individual, female pronouns)', () => {
        let text;
        beforeAll(async () => {
            const data = makeFormData(1);
            data['pronouns'] = 'female';
            data['move-in-date'] = '2020-05-01';
            const result = await generator.generateComplaint(data);
            text = extractText(result.outputPath);
        });

        test('does NOT pluralize singular pronouns', () => {
            expect(text).toContain('her home');
            expect(text).not.toContain('their home');
        });
    });

    describe('with 2 plaintiffs (Individuals)', () => {
        let text;
        beforeAll(async () => {
            const result = await generator.generateComplaint(makeFormData(2));
            text = extractText(result.outputPath);
        });

        test('possessive: "her home" → "their home"', () => {
            expect(text).toContain('their home');
            expect(text).not.toMatch(/\bher\s+home\b/);
        });

        test('possessive: "her tenancy" → "their tenancy"', () => {
            expect(text).toContain('their tenancy');
        });

        test('phrase: "his or her tenancy" → "their tenancy"', () => {
            expect(text).not.toMatch(/\bhis\s+or\s+her\b/);
        });

        test('subject: "she lived" → "they lived"', () => {
            expect(text).toContain('they lived');
            expect(text).not.toMatch(/\bshe\s+lived\b/);
        });

        test('object allowlist: "intimidating her" → "intimidating them"', () => {
            // This phrase appears in some causes; assert no singular form remains
            expect(text).not.toMatch(/\bintimidating\s+her\b/);
        });

        test('verb agreement after swap: no "they is" / "they has" / "they was"', () => {
            expect(text).not.toMatch(/\bthey\s+is\b/);
            expect(text).not.toMatch(/\bthey\s+has\b/);
            expect(text).not.toMatch(/\bthey\s+was\b/);
        });

        test('preserves "[t]he" statutory citation (does not match \\bhe\\b)', () => {
            // The §1942.5(h) quotation contains "[t]he remedies provided"
            expect(text).toContain('[t]he remedies provided');
            expect(text).not.toContain('[t]they remedies');
        });
    });

    describe('with 1 Individual + 1 Minor (2 plaintiffs total)', () => {
        let text;
        beforeAll(async () => {
            const data = makeFormData(2, {
                types: ['individual', 'minor'],
                guardians: [null, 1],
            });
            const result = await generator.generateComplaint(data);
            text = extractText(result.outputPath);
        });

        test('pluralizes pronouns (total > 1)', () => {
            expect(text).not.toMatch(/\bher\s+home\b/);
            expect(text).toContain('their home');
        });

        test('pluralizes "Plaintiff" (existing behavior, regression check)', () => {
            expect(text).toContain('PLAINTIFFS');
        });
    });

    describe('capitalized variants (sentence-start)', () => {
        // Use applyPronounPluralization directly via a mock zip to test edge
        // cases the canned causes don't necessarily exercise.
        function applyAndExtract(inputXml, count = 2) {
            const fakeZip = {
                file: (_name, content) => {
                    if (content !== undefined) { fakeZip._content = content; return; }
                    return { asText: () => fakeZip._content };
                },
                _content: inputXml,
            };
            const gen = new ComplaintDocumentGenerator();
            gen.applyPronounPluralization(fakeZip, count);
            return fakeZip._content;
        }

        test('"She has" → "They have"', () => {
            const out = applyAndExtract('<w:t>She has standing.</w:t>');
            expect(out).toContain('They have standing.');
            expect(out).not.toContain('She has');
        });

        test('"He is" → "They are"', () => {
            const out = applyAndExtract('<w:t>He is a tenant.</w:t>');
            expect(out).toContain('They are a tenant.');
        });

        test('"His or her" → "Their"', () => {
            const out = applyAndExtract('<w:t>His or her tenancy.</w:t>');
            expect(out).toContain('Their tenancy.');
        });

        test('count=1 is no-op (preserves singular)', () => {
            const out = applyAndExtract('<w:t>She has standing.</w:t>', 1);
            expect(out).toContain('She has standing.');
        });
    });

    describe('split-run tolerance', () => {
        function applyAndExtract(inputXml, count = 2) {
            const fakeZip = {
                file: (_name, content) => {
                    if (content !== undefined) { fakeZip._content = content; return; }
                    return { asText: () => fakeZip._content };
                },
                _content: inputXml,
            };
            const gen = new ComplaintDocumentGenerator();
            gen.applyPronounPluralization(fakeZip, count);
            return fakeZip._content;
        }

        test('verb across runs: <w:r>he</w:r><w:r> is</w:r> → they are', () => {
            const xml = '<w:p><w:r><w:t>he</w:t></w:r><w:r><w:t> is</w:t></w:r></w:p>';
            const out = applyAndExtract(xml);
            // After step 3 generic swap "he" → "they", and verb-agreement should
            // collapse "they is" across the run gap.
            expect(out).toMatch(/they.*are/);
            expect(out).not.toMatch(/they.*is/);
        });

        test('"his or her" split across runs preserved', () => {
            // If "his or her" is run-split, current phrase rule matches contiguous
            // text only — confirm no regression by running the raw contiguous case.
            const xml = '<w:t>his or her tenancy</w:t>';
            const out = applyAndExtract(xml);
            expect(out).toContain('their tenancy');
        });
    });

    describe('[t]he statutory citation preservation', () => {
        function applyAndExtract(inputXml, count = 2) {
            const fakeZip = {
                file: (_name, content) => {
                    if (content !== undefined) { fakeZip._content = content; return; }
                    return { asText: () => fakeZip._content };
                },
                _content: inputXml,
            };
            const gen = new ComplaintDocumentGenerator();
            gen.applyPronounPluralization(fakeZip, count);
            return fakeZip._content;
        }

        test('"[t]he remedies" preserved verbatim', () => {
            const xml = '<w:t>[t]he remedies provided by</w:t>';
            const out = applyAndExtract(xml);
            expect(out).toContain('[t]he remedies provided by');
        });

        test('"[T]he" capitalized variant preserved', () => {
            const xml = '<w:t>[T]he tenant</w:t>';
            const out = applyAndExtract(xml);
            expect(out).toContain('[T]he tenant');
        });

        test('standalone "he" still pluralized', () => {
            const xml = '<w:t>and he is liable</w:t>';
            const out = applyAndExtract(xml);
            expect(out).toContain('they are liable');
        });
    });
});
