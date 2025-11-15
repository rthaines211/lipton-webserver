/**
 * Test the PDF field mapper with sample form submission data
 * Usage: node scripts/test-field-mapper.js
 */

const { mapFormDataToPdfFields } = require('../server/utils/pdf-field-mapper');
const sampleFormData = require('../data/form-entry-1760972183672-pnqqab2fo.json');

console.log('🧪 Testing PDF Field Mapper\n');
console.log('='.repeat(80));

try {
  const pdfFields = mapFormDataToPdfFields(sampleFormData);

  console.log(`\n✅ Mapping successful! Generated ${Object.keys(pdfFields).length} PDF fields\n`);
  console.log('='.repeat(80));
  console.log('\n📋 Mapped PDF Fields:\n');

  // Group fields by category for easier reading
  const fieldsByCategory = {
    'Case Number (5 pages)': [],
    'Plaintiff Names (5 pages)': [],
    'Defendant Names (5 pages)': [],
    'Court Info': [],
    'Attorney Info': [],
    'Party Statement': [],
    'Other': []
  };

  Object.entries(pdfFields).forEach(([fieldName, value]) => {
    const shortName = fieldName.split('[0]').pop().replace(/\[0\]/g, '');
    const entry = `${shortName}\n   → "${value}"`;

    if (fieldName.includes('caseNumber')) {
      fieldsByCategory['Case Number (5 pages)'].push(entry);
    } else if (fieldName.includes('Party1')) {
      fieldsByCategory['Plaintiff Names (5 pages)'].push(entry);
    } else if (fieldName.includes('Party2')) {
      fieldsByCategory['Defendant Names (5 pages)'].push(entry);
    } else if (fieldName.includes('CourtInfo') || fieldName.includes('CrtCounty') || fieldName.includes('CrtCityZip')) {
      fieldsByCategory['Court Info'].push(entry);
    } else if (fieldName.includes('AttyPartyInfo')) {
      fieldsByCategory['Attorney Info'].push(entry);
    } else if (fieldName.includes('TextField2')) {
      fieldsByCategory['Party Statement'].push(entry);
    } else {
      fieldsByCategory['Other'].push(entry);
    }
  });

  // Print categorized fields
  Object.entries(fieldsByCategory).forEach(([category, fields]) => {
    if (fields.length > 0) {
      console.log(`\n${category}:`);
      console.log('-'.repeat(80));
      fields.forEach(field => console.log(field));
    }
  });

  console.log('\n' + '='.repeat(80));
  console.log('\n✅ Test Complete!\n');

  // Verify expected fields
  console.log('🔍 Verification:');
  console.log(`   Plaintiff names: ${pdfFields['CM-110[0].Page1[0].P1Caption[0].TitlePartyName[0].Party1[0]'] || 'MISSING'}`);
  console.log(`   Defendant names: ${pdfFields['CM-110[0].Page1[0].P1Caption[0].TitlePartyName[0].Party2[0]'] || 'MISSING'}`);
  console.log(`   County: ${pdfFields['CM-110[0].Page1[0].P1Caption[0].CourtInfo[0].CrtCounty[0]'] || 'MISSING'}`);
  console.log(`   City/Zip: ${pdfFields['CM-110[0].Page1[0].P1Caption[0].CourtInfo[0].CrtCityZip[0]'] || 'MISSING'}`);
  console.log(`   Attorney Firm: ${pdfFields['CM-110[0].Page1[0].P1Caption[0].AttyPartyInfo[0].AttyFirm[0]'] || 'MISSING'}`);
  console.log('');

} catch (error) {
  console.error('\n❌ Test failed:', error.message);
  console.error('\nStack trace:');
  console.error(error.stack);
  process.exit(1);
}
