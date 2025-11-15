/**
 * Test PDF Generation End-to-End
 * Tests the complete PDF generation pipeline:
 * - Template loading
 * - Field mapping
 * - PDF filling
 * - SSE progress updates
 *
 * Usage: node scripts/test-pdf-generation.js
 */

const fs = require('fs').promises;
const path = require('path');
const { generatePDFWithValidation } = require('../server/services/pdf-service');

// Load sample form data
const sampleDataPath = path.join(__dirname, '../data/form-entry-1760972183672-pnqqab2fo.json');

console.log('🧪 Testing PDF Generation Pipeline\n');
console.log('='.repeat(80));

async function testPdfGeneration() {
  try {
    // Load sample form data
    console.log('\n📂 Loading sample form data...');
    const sampleFormData = JSON.parse(await fs.readFile(sampleDataPath, 'utf8'));
    console.log(`   ✅ Loaded form data: ${Object.keys(sampleFormData).length} top-level fields\n`);

    // Generate unique job ID
    const jobId = `test-${Date.now()}`;
    console.log(`🆔 Job ID: ${jobId}\n`);

    // Progress callback to track SSE updates
    const progressUpdates = [];
    const progressCallback = (phase, progress, message) => {
      const update = `[${progress}%] ${phase}: ${message}`;
      progressUpdates.push(update);
      console.log(`   📊 ${update}`);
    };

    console.log('🚀 Starting PDF generation...\n');

    const startTime = Date.now();

    // Generate PDF with validation
    const pdfBuffer = await generatePDFWithValidation(sampleFormData, jobId, {
      template: 'cm110-decrypted',
      progressCallback
    });

    const executionTime = Date.now() - startTime;

    console.log('\n' + '='.repeat(80));
    console.log('\n✅ PDF Generation Successful!\n');

    // Display results
    console.log('📊 Results:');
    console.log(`   PDF Size: ${(pdfBuffer.length / 1024).toFixed(2)} KB`);
    console.log(`   Execution Time: ${executionTime}ms`);
    console.log(`   Progress Updates: ${progressUpdates.length}`);

    // Save test PDF
    const outputPath = path.join(__dirname, '../tmp/test-output.pdf');

    // Ensure tmp directory exists
    await fs.mkdir(path.dirname(outputPath), { recursive: true });

    await fs.writeFile(outputPath, pdfBuffer);
    console.log(`\n💾 Test PDF saved to: ${outputPath}`);

    console.log('\n📋 Progress Log:');
    console.log('-'.repeat(80));
    progressUpdates.forEach(update => console.log(`   ${update}`));

    console.log('\n' + '='.repeat(80));
    console.log('\n🎉 All tests passed!\n');

    return {
      success: true,
      pdfSize: pdfBuffer.length,
      executionTime,
      progressUpdates: progressUpdates.length
    };

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error('\nStack trace:');
    console.error(error.stack);
    process.exit(1);
  }
}

// Run test
testPdfGeneration();
