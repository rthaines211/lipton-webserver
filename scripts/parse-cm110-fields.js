/**
 * Parse CM-110 PDF Field Data from pdftk Output
 * Extracts field names and creates human-readable mapping
 *
 * Usage: node scripts/parse-cm110-fields.js
 */

const fs = require('fs').promises;
const path = require('path');

async function parsePdftkOutput() {
  try {
    console.log('📄 Parsing CM-110 pdftk field output...\n');

    const inputPath = path.join(__dirname, '../specs/001-pdf-form-filling/cm110-fields-pdftk.txt');
    const content = await fs.readFile(inputPath, 'utf-8');

    // Parse the pdftk dump_data_fields output format
    const lines = content.split('\n');
    const fields = [];
    let currentField = {};

    for (const line of lines) {
      if (line.startsWith('---')) {
        // New field separator
        if (currentField.FieldName) {
          fields.push(currentField);
        }
        currentField = {};
      } else if (line.startsWith('FieldName: ')) {
        currentField.FieldName = line.substring('FieldName: '.length);
      } else if (line.startsWith('FieldNameAlt: ')) {
        currentField.FieldNameAlt = line.substring('FieldNameAlt: '.length);
      } else if (line.startsWith('FieldType: ')) {
        currentField.FieldType = line.substring('FieldType: '.length);
      } else if (line.startsWith('FieldValue: ')) {
        currentField.FieldValue = line.substring('FieldValue: '.length);
      } else if (line.startsWith('FieldFlags: ')) {
        currentField.FieldFlags = line.substring('FieldFlags: '.length);
      } else if (line.startsWith('FieldJustification: ')) {
        currentField.FieldJustification = line.substring('FieldJustification: '.length);
      }
    }

    // Add last field if exists
    if (currentField.FieldName) {
      fields.push(currentField);
    }

    console.log(`✅ Parsed ${fields.length} fields\n`);

    // Group fields by page
    const fieldsByPage = fields.reduce((acc, field) => {
      const pageMatch = field.FieldName.match(/Page(\d+)/);
      const page = pageMatch ? pageMatch[1] : 'unknown';
      if (!acc[page]) {
        acc[page] = [];
      }
      acc[page].push(field);
      return acc;
    }, {});

    // Print page summary
    console.log('📊 Fields by Page:');
    Object.entries(fieldsByPage).forEach(([page, pageFields]) => {
      console.log(`   Page ${page}: ${pageFields.length} fields`);
    });

    // Categorize fields for mapping
    const categorizedFields = {
      caseInfo: [],
      attorney: [],
      plaintiff: [],
      defendant: [],
      address: [],
      discovery: [],
      other: []
    };

    fields.forEach(field => {
      const name = field.FieldName.toLowerCase();
      const alt = (field.FieldNameAlt || '').toLowerCase();

      if (name.includes('casenumber') || name.includes('case')) {
        categorizedFields.caseInfo.push(field);
      } else if (name.includes('atty') || name.includes('attorney') || name.includes('bar')) {
        categorizedFields.attorney.push(field);
      } else if (name.includes('plaintiff') || alt.includes('plaintiff')) {
        categorizedFields.plaintiff.push(field);
      } else if (name.includes('defendant') || alt.includes('defendant')) {
        categorizedFields.defendant.push(field);
      } else if (name.includes('address') || name.includes('city') || name.includes('county') || name.includes('zip')) {
        categorizedFields.address.push(field);
      } else if (name.includes('discovery') || name.includes('interrogator') || name.includes('request')) {
        categorizedFields.discovery.push(field);
      } else {
        categorizedFields.other.push(field);
      }
    });

    console.log('\n📋 Categorized Fields:');
    Object.entries(categorizedFields).forEach(([category, categoryFields]) => {
      console.log(`   ${category}: ${categoryFields.length} fields`);
    });

    // Save categorized fields
    const outputPath = path.join(__dirname, '../specs/001-pdf-form-filling/cm110-fields-categorized.json');
    await fs.writeFile(outputPath, JSON.stringify({
      totalFields: fields.length,
      byPage: Object.entries(fieldsByPage).map(([page, pageFields]) => ({
        page,
        count: pageFields.length
      })),
      categorized: Object.entries(categorizedFields).map(([category, categoryFields]) => ({
        category,
        count: categoryFields.length,
        fields: categoryFields.map(f => ({
          name: f.FieldName,
          description: f.FieldNameAlt || '',
          type: f.FieldType || ''
        }))
      })),
      allFields: fields
    }, null, 2));

    console.log(`\n💾 Categorized fields saved to: ${outputPath}`);

    // Print sample fields from each category
    console.log('\n📝 Sample Fields by Category:\n');
    Object.entries(categorizedFields).forEach(([category, categoryFields]) => {
      console.log(`${category.toUpperCase()}:`);
      categoryFields.slice(0, 5).forEach(field => {
        console.log(`  ${field.FieldName}`);
        if (field.FieldNameAlt) {
          console.log(`    → ${field.FieldNameAlt}`);
        }
      });
      if (categoryFields.length > 5) {
        console.log(`  ... and ${categoryFields.length - 5} more`);
      }
      console.log('');
    });

    console.log('✅ Parsing complete!');

  } catch (error) {
    console.error('❌ Error parsing fields:', error.message);
    process.exit(1);
  }
}

parsePdftkOutput();
