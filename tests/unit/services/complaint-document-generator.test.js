const fs = require('fs');
const path = require('path');

describe('plaintiffNamesWithTypes descriptor (no article)', () => {
    const buildDescriptor = (plaintiff, guardian) => {
        const name = `${plaintiff.firstName} ${plaintiff.lastName}`.trim().toUpperCase();
        if (plaintiff.type === 'minor') {
            if (guardian) {
                const g = `${guardian.firstName} ${guardian.lastName}`.trim().toUpperCase();
                return `${name}, minor by and through Guardian Ad Litem, ${g}`;
            }
            return `${name}, minor`;
        }
        return `${name}, individual`;
    };

    test('individual plaintiff has no article', () => {
        expect(buildDescriptor({ firstName: 'John', lastName: 'Doe', type: 'individual' }))
            .toBe('JOHN DOE, individual');
    });

    test('minor without guardian has no article', () => {
        expect(buildDescriptor({ firstName: 'Jane', lastName: 'Doe', type: 'minor' }))
            .toBe('JANE DOE, minor');
    });

    test('minor with guardian is unchanged', () => {
        const out = buildDescriptor(
            { firstName: 'Jane', lastName: 'Doe', type: 'minor' },
            { firstName: 'Pat', lastName: 'Doe' }
        );
        expect(out).toBe('JANE DOE, minor by and through Guardian Ad Litem, PAT DOE');
    });
});

describe('source pins: plaintiff descriptor in complaint-document-generator.js', () => {
    const src = fs.readFileSync(
        path.join(__dirname, '../../../services/complaint-document-generator.js'),
        'utf8'
    );

    test('does not emit "an individual" for plaintiff', () => {
        expect(src).not.toMatch(/return\s+`\$\{name\},\s+an individual`/);
    });

    test('does not emit "a minor" for plaintiff (without guardian)', () => {
        expect(src).not.toMatch(/return\s+`\$\{name\},\s+a minor`/);
    });

    test('does emit "individual" for plaintiff', () => {
        expect(src).toMatch(/return\s+`\$\{name\},\s+individual`/);
    });

    test('does emit "minor" for plaintiff (without guardian)', () => {
        expect(src).toMatch(/return\s+`\$\{name\},\s+minor`/);
    });
});
