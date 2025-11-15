/**
 * Alternative CM-110 PDF Field Inspection using pdftk
 * If pdf-lib doesn't work, we can use pdftk as a fallback
 *
 * Usage: node scripts/inspect-cm110-pdftk.js
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

async function inspectWithPdftk() {
  try {
    console.log('🔍 Attempting to inspect CM-110.pdf with pdftk...\n');

    const templatePath = path.join(__dirname, '../normalization work/pdf_templates/cm110.pdf');

    // Check if pdftk is available
    try {
      execSync('which pdftk', { stdio: 'ignore' });
    } catch (e) {
      console.log('⚠️  pdftk not found. Install with: brew install pdftk-java');
      console.log('Attempting alternative inspection methods...\n');
      return inspectAlternative();
    }

    // Use pdftk to dump field data
    const output = execSync(`pdftk "${templatePath}" dump_data_fields`, { encoding: 'utf-8' });

    console.log('✅ pdftk output:\n');
    console.log(output);

    // Parse the output to count fields
    const fieldMatches = output.match(/FieldName:/g);
    const fieldCount = fieldMatches ? fieldMatches.length : 0;

    console.log(`\n📊 Total fields found: ${fieldCount}`);

    return output;
  } catch (error) {
    console.error('❌ Error with pdftk:', error.message);
    return null;
  }
}

function inspectAlternative() {
  console.log('📋 Alternative approach: Manually creating field mapping based on CM-110 form structure\n');
  console.log('Since automatic field detection isn\'t working, we\'ll need to:');
  console.log('1. Open CM-110.pdf in Adobe Reader or Preview');
  console.log('2. Identify fillable field names manually');
  console.log('3. Create field mapping configuration');
  console.log('\nOr we can use coordinate-based text placement instead of form field filling.');
}

inspectWithPdftk();
