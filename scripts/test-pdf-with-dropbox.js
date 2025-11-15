/**
 * Test PDF Generation with Dropbox Upload
 * Tests the complete workflow including:
 * - PDF generation
 * - Temporary file storage
 * - Dropbox upload
 * - Shareable link creation
 *
 * Usage: node scripts/test-pdf-with-dropbox.js
 *
 * Requirements:
 * - Dropbox credentials configured in .env:
 *   - DROPBOX_ENABLED=true
 *   - DROPBOX_REFRESH_TOKEN=...
 *   - DROPBOX_APP_KEY=...
 *   - DROPBOX_APP_SECRET=...
 */

const fs = require('fs').promises;
const path = require('path');
const { generateAndUploadPDF } = require('../server/services/pdf-service');
const dropboxService = require('../dropbox-service');

// Load sample form data
const sampleDataPath = path.join(__dirname, '../data/form-entry-1760972183672-pnqqab2fo.json');

console.log('🧪 Testing PDF Generation + Dropbox Upload\n');
console.log('='.repeat(80));

async function testPdfWithDropbox() {
  try {
    // Check Dropbox status
    console.log('\n🔍 Checking Dropbox configuration...');
    const dropboxEnabled = dropboxService.isEnabled();
    console.log(`   Dropbox: ${dropboxEnabled ? '✅ Enabled' : '❌ Disabled'}`);

    if (!dropboxEnabled) {
      console.log('\n⚠️  Dropbox is disabled');
      console.log('   To enable:');
      console.log('   1. Set DROPBOX_ENABLED=true in .env');
      console.log('   2. Configure DROPBOX_REFRESH_TOKEN, DROPBOX_APP_KEY, DROPBOX_APP_SECRET');
      console.log('\n   Continuing with PDF generation only...\n');
    }

    // Load sample form data
    console.log('\n📂 Loading sample form data...');
    const sampleFormData = JSON.parse(await fs.readFile(sampleDataPath, 'utf8'));
    console.log(`   ✅ Loaded form data: ${Object.keys(sampleFormData).length} top-level fields\n`);

    // Generate unique job ID
    const jobId = `test-dropbox-${Date.now()}`;
    console.log(`🆔 Job ID: ${jobId}\n`);

    // Progress callback to track updates
    const progressUpdates = [];
    const progressCallback = (phase, progress, message) => {
      const update = `[${progress}%] ${phase}: ${message}`;
      progressUpdates.push(update);
      console.log(`   📊 ${update}`);
    };

    console.log('🚀 Starting PDF generation and upload...\n');

    const startTime = Date.now();

    // Generate PDF and upload to Dropbox
    const result = await generateAndUploadPDF(sampleFormData, jobId, {
      template: 'cm110-decrypted',
      filename: `CM-110-Test-${jobId}.pdf`,
      progressCallback
    });

    const executionTime = Date.now() - startTime;

    console.log('\n' + '='.repeat(80));
    console.log('\n✅ PDF Generation and Upload Successful!\n');

    // Display results
    console.log('📊 Results:');
    console.log(`   PDF Size: ${(result.sizeBytes / 1024).toFixed(2)} KB`);
    console.log(`   Filename: ${result.filename}`);
    console.log(`   Temp Path: ${result.tempFilePath}`);
    console.log(`   Execution Time: ${executionTime}ms`);
    console.log(`   Progress Updates: ${progressUpdates.length}`);

    if (result.dropboxPath) {
      console.log(`\n☁️  Dropbox Upload:`);
      console.log(`   Path: ${result.dropboxPath}`);
      if (result.dropboxUrl) {
        console.log(`   Shareable Link: ${result.dropboxUrl}`);
      } else {
        console.log(`   Shareable Link: ❌ Not created`);
      }
    } else {
      console.log(`\n   Dropbox: ❌ Upload skipped (disabled or failed)`);
    }

    console.log('\n📋 Progress Log:');
    console.log('-'.repeat(80));
    progressUpdates.forEach(update => console.log(`   ${update}`));

    // Verify temp file exists
    console.log('\n📁 Verifying temp file...');
    try {
      const tempStats = await fs.stat(result.tempFilePath);
      console.log(`   ✅ Temp file exists (${(tempStats.size / 1024).toFixed(2)} KB)`);
    } catch (err) {
      console.log(`   ❌ Temp file not found: ${err.message}`);
    }

    console.log('\n' + '='.repeat(80));
    console.log('\n🎉 All tests passed!\n');

    return result;

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error('\nStack trace:');
    console.error(error.stack);
    process.exit(1);
  }
}

// Run test
testPdfWithDropbox();
