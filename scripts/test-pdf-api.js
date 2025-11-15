/**
 * Test PDF Generation API Endpoints
 * Tests the complete API workflow for PDF generation
 *
 * Tests:
 * - POST /api/pdf/generate - Trigger PDF generation
 * - GET /api/pdf/status/:jobId - Check job status
 * - GET /api/pdf/download/:jobId - Download completed PDF
 *
 * Usage: node scripts/test-pdf-api.js
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

const API_BASE_URL = 'http://localhost:3001';

// Load sample form data
const sampleDataPath = path.join(__dirname, '../data/form-entry-1763042610468-gtq8m5nfg.json');
const sampleFormData = JSON.parse(fs.readFileSync(sampleDataPath, 'utf8'));

console.log('🧪 Testing PDF Generation API Endpoints\n');
console.log('='.repeat(80));

async function testPdfApi() {
  try {
    // Step 1: Trigger PDF generation
    console.log('\n📤 Step 1: Triggering PDF generation...');
    console.log(`   POST ${API_BASE_URL}/api/pdf/generate`);

    const generateResponse = await axios.post(`${API_BASE_URL}/api/pdf/generate`, {
      formData: sampleFormData
    });

    console.log('   ✅ PDF generation started');
    console.log(`   Job ID: ${generateResponse.data.jobId}`);
    console.log(`   Status: ${generateResponse.data.status}`);
    console.log(`   Message: ${generateResponse.data.message}`);

    const jobId = generateResponse.data.jobId;

    // Step 2: Poll for status
    console.log('\n⏳ Step 2: Polling job status...');
    let jobCompleted = false;
    let attempts = 0;
    const maxAttempts = 10;  // 10 seconds max

    while (!jobCompleted && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1000));  // Wait 1 second
      attempts++;

      try {
        const statusResponse = await axios.get(`${API_BASE_URL}/api/pdf/status/${jobId}`);
        const job = statusResponse.data.job;

        const statusEmoji = {
          'processing': '🟡',
          'completed': '✅',
          'failed': '❌'
        }[job.status] || '⚪';

        console.log(`   [${attempts}s] ${statusEmoji} Status: ${job.status}, Progress: ${job.progress}%`);

        if (job.status === 'completed') {
          jobCompleted = true;
          console.log('\n   📋 Job Details:');
          console.log(`      Filename: ${job.filename}`);
          console.log(`      Size: ${(job.sizeBytes / 1024).toFixed(2)} KB`);
          console.log(`      Temp Path: ${job.filePath}`);
          console.log(`      Dropbox: ${job.dropboxUrl || 'Not uploaded (disabled)'}`);
          console.log(`      Completed At: ${job.completedAt}`);
        } else if (job.status === 'failed') {
          jobCompleted = true;
          console.log('\n   ❌ Job Failed:');
          console.log(`      Error: ${job.error}`);
          return;
        }
      } catch (error) {
        if (error.response && error.response.status === 404) {
          console.log(`   [${attempts}s] ⚪ Job not found (may not be tracked yet)`);
        } else {
          throw error;
        }
      }
    }

    if (!jobCompleted) {
      console.log('\n   ⚠️  Job did not complete within 10 seconds');
      return;
    }

    // Step 3: Download PDF
    console.log('\n📥 Step 3: Downloading PDF...');
    console.log(`   GET ${API_BASE_URL}/api/pdf/download/${jobId}`);

    const downloadResponse = await axios.get(`${API_BASE_URL}/api/pdf/download/${jobId}`, {
      responseType: 'arraybuffer'
    });

    const downloadPath = path.join(__dirname, '../tmp/pdf', `test-api-download-${Date.now()}.pdf`);
    fs.mkdirSync(path.dirname(downloadPath), { recursive: true });
    fs.writeFileSync(downloadPath, downloadResponse.data);

    console.log('   ✅ PDF downloaded successfully');
    console.log(`   Downloaded to: ${downloadPath}`);
    console.log(`   Size: ${(downloadResponse.data.length / 1024).toFixed(2)} KB`);
    console.log(`   Content-Type: ${downloadResponse.headers['content-type']}`);

    // Step 4: Verify file
    console.log('\n📁 Step 4: Verifying downloaded file...');
    const stats = fs.statSync(downloadPath);
    console.log(`   ✅ File exists (${(stats.size / 1024).toFixed(2)} KB)`);
    console.log(`   File starts with: %PDF-${downloadResponse.data.toString('utf8', 0, 10).includes('PDF') ? '✅' : '❌'}`);

    console.log('\n' + '='.repeat(80));
    console.log('\n🎉 All tests passed!');
    console.log(`\n📄 Test PDF: ${downloadPath}\n`);

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    if (error.response) {
      console.error('\nResponse Status:', error.response.status);
      console.error('Response Data:', error.response.data);
    }
    console.error('\nStack trace:');
    console.error(error.stack);
    process.exit(1);
  }
}

// Run test
testPdfApi();
