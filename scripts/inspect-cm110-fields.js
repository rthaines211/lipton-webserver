/**
 * CM-110 PDF Field Inspection Script
 * Extracts all form field names and types from the CM-110 court form template
 *
 * Usage: node scripts/inspect-cm110-fields.js
 * Output: Console output + JSON file with field details
 */

const { PDFDocument } = require('pdf-lib');
const fs = require('fs').promises;
const path = require('path');

async function inspectCM110Fields() {
  try {
    console.log('🔍 Inspecting CM-110.pdf form fields...\n');

    // Load the CM-110 PDF template
    // Note: CM-110.pdf is encrypted (common with court forms), so we use ignoreEncryption
    const templatePath = path.join(__dirname, '../normalization work/pdf_templates/cm110.pdf');
    const pdfBytes = await fs.readFile(templatePath);
    const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });

    // Get the form from the PDF
    const form = pdfDoc.getForm();
    const fields = form.getFields();

    console.log(`✅ Found ${fields.length} form fields in CM-110.pdf\n`);

    // Extract field information
    const fieldInfo = fields.map((field, index) => {
      const fieldName = field.getName();
      const fieldType = field.constructor.name;

      // Get field value if available
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
        index,
        name: fieldName,
        type: fieldType,
        value: fieldValue
      };
    });

    // Group fields by type for analysis
    const fieldsByType = fieldInfo.reduce((acc, field) => {
      if (!acc[field.type]) {
        acc[field.type] = [];
      }
      acc[field.type].push(field);
      return acc;
    }, {});

    // Print summary
    console.log('📊 Field Type Summary:');
    Object.entries(fieldsByType).forEach(([type, fields]) => {
      console.log(`   ${type}: ${fields.length} fields`);
    });

    // Print all field names
    console.log('\n📝 All Field Names:');
    fieldInfo.forEach(field => {
      console.log(`   [${field.index}] ${field.name} (${field.type})`);
    });

    // Save to JSON file
    const outputPath = path.join(__dirname, '../specs/001-pdf-form-filling/cm110-fields.json');
    await fs.writeFile(outputPath, JSON.stringify({
      totalFields: fields.length,
      fieldsByType: Object.entries(fieldsByType).map(([type, fields]) => ({
        type,
        count: fields.length
      })),
      fields: fieldInfo
    }, null, 2));

    console.log(`\n💾 Field information saved to: ${outputPath}`);
    console.log('\n✅ Inspection complete!');

  } catch (error) {
    console.error('❌ Error inspecting PDF:', error.message);
    console.error(error);
    process.exit(1);
  }
}

// Run the inspection
inspectCM110Fields();
