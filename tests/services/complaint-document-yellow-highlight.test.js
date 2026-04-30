const fs = require('fs');
const PizZip = require('pizzip');
const ComplaintDocumentGenerator = require('../../services/complaint-document-generator');

function makeZip(xml) {
    const z = {
        _x: xml,
        file(name, content) {
            if (content !== undefined) { this._x = content; return; }
            return { asText: () => this._x };
        },
    };
    return z;
}

describe('applyYellowHighlight (index-based)', () => {
    let gen;
    beforeAll(() => { gen = new ComplaintDocumentGenerator(); });

    test('highlights the run containing the placeholder, not an earlier run', () => {
        const xml =
            '<w:p>' +
              '<w:r><w:rPr><w:b/></w:rPr><w:t>Earlier text</w:t></w:r>' +
              '<w:r><w:rPr><w:i/></w:rPr><w:t xml:space="preserve">&lt;Move In Date&gt;</w:t></w:r>' +
            '</w:p>';
        const zip = makeZip(xml);
        gen.applyYellowHighlight(zip, ['<Move In Date>']);
        const out = zip._x;

        // Highlight must be on the second run (with the <i/> property)
        expect(out).toMatch(/<w:rPr><w:i\/><w:highlight w:val="yellow"\/><\/w:rPr>/);
        // Must NOT be on the first run (with <b/>)
        expect(out).not.toMatch(/<w:rPr><w:b\/><w:highlight/);
    });

    test('inserts new <w:rPr> when run has no rPr', () => {
        const xml = '<w:r><w:t>&lt;Move In Date&gt;</w:t></w:r>';
        const zip = makeZip(xml);
        gen.applyYellowHighlight(zip, ['<Move In Date>']);
        expect(zip._x).toContain('<w:rPr><w:highlight w:val="yellow"/></w:rPr>');
    });

    test('does not double-inject when run already has highlight', () => {
        const xml = '<w:r><w:rPr><w:highlight w:val="cyan"/></w:rPr><w:t>&lt;Move In Date&gt;</w:t></w:r>';
        const zip = makeZip(xml);
        gen.applyYellowHighlight(zip, ['<Move In Date>']);
        // No yellow added because cyan highlight already present
        expect(zip._x).not.toContain('w:val="yellow"');
        expect(zip._x).toContain('w:val="cyan"');
    });

    test('highlights every occurrence when placeholder appears 3 times', () => {
        const xml =
            '<w:r><w:t>&lt;Pronoun Subject&gt;</w:t></w:r>' +
            '<w:r><w:t>middle</w:t></w:r>' +
            '<w:r><w:t>&lt;Pronoun Subject&gt;</w:t></w:r>' +
            '<w:r><w:t>more</w:t></w:r>' +
            '<w:r><w:t>&lt;Pronoun Subject&gt;</w:t></w:r>';
        const zip = makeZip(xml);
        gen.applyYellowHighlight(zip, ['<Pronoun Subject>']);
        const yellowCount = (zip._x.match(/w:val="yellow"/g) || []).length;
        expect(yellowCount).toBe(3);
    });

    test('placeholder text not present is a no-op', () => {
        const xml = '<w:r><w:t>nothing here</w:t></w:r>';
        const zip = makeZip(xml);
        gen.applyYellowHighlight(zip, ['<Move In Date>']);
        expect(zip._x).toBe(xml);
    });

    test('end-to-end: 2-plaintiff complaint highlights <Move In Date>', async () => {
        const data = {
            'case-name': 'Test Case',
            'property-address': '123 Main St',
            'case-number': 'CV-001',
            'city': 'Los Angeles',
            'county': 'Los Angeles',
            plaintiffCount: '2',
            defendantCount: '1',
            'plaintiff-1-first-name': 'A',
            'plaintiff-1-last-name': 'B',
            'plaintiff-1-type': 'individual',
            'plaintiff-2-first-name': 'C',
            'plaintiff-2-last-name': 'D',
            'plaintiff-2-type': 'individual',
            'defendant-1-name': 'X',
            'defendant-1-type': 'corporate',
            causesOfAction: ['constructive-eviction'],
        };
        const result = await gen.generateComplaint(data);
        const xml = new PizZip(fs.readFileSync(result.outputPath)).file('word/document.xml').asText();
        const idx = xml.indexOf('&lt;Move In Date&gt;');
        expect(idx).toBeGreaterThan(-1);
        const runStart = Math.max(xml.lastIndexOf('<w:r ', idx), xml.lastIndexOf('<w:r>', idx));
        const runEnd = xml.indexOf('</w:r>', idx) + 6;
        const run = xml.slice(runStart, runEnd);
        expect(run).toContain('w:highlight');
        expect(run).toContain('w:val="yellow"');
    });
});
