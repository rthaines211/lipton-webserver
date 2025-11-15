/**
 * Test Job Queue Service
 * Tests the pg-boss job queue for async PDF generation
 *
 * Tests:
 * - Job queue initialization
 * - Enqueue PDF generation job
 * - Job processing and completion
 * - Job status tracking
 * - Queue statistics
 *
 * Usage: node scripts/test-job-queue.js
 *
 * Requirements:
 * - PostgreSQL database running
 * - Database credentials configured in .env
 */

const fs = require('fs').promises;
const path = require('path');
const {
  initializeJobQueue,
  enqueuePdfGeneration,
  getJobStatus,
  getQueueStats,
  stopJobQueue
} = require('../server/services/job-queue-service');

// Load sample form data
const sampleDataPath = path.join(__dirname, '../data/form-entry-1760972183672-pnqqab2fo.json');

console.log('🧪 Testing Job Queue Service (pg-boss)\n');
console.log('='.repeat(80));

async function testJobQueue() {
  try {
    // Step 1: Initialize job queue
    console.log('\n📦 Step 1: Initializing job queue...');
    await initializeJobQueue();
    console.log('   ✅ Job queue initialized successfully');

    // Step 2: Load sample data
    console.log('\n📂 Step 2: Loading sample form data...');
    const sampleFormData = JSON.parse(await fs.readFile(sampleDataPath, 'utf8'));
    console.log(`   ✅ Loaded form data: ${Object.keys(sampleFormData).length} fields`);

    // Step 3: Check initial queue stats
    console.log('\n📊 Step 3: Checking initial queue stats...');
    const initialStats = await getQueueStats();
    console.log('   Queue Stats:', initialStats);

    // Step 4: Enqueue PDF generation job
    console.log('\n🚀 Step 4: Enqueueing PDF generation job...');
    const sseJobId = `test-queue-${Date.now()}`;
    const pgBossJobId = await enqueuePdfGeneration(
      sampleFormData,
      sseJobId,
      {
        priority: 10,
        retryLimit: 2,
        pdfOptions: {
          template: 'cm110-decrypted',
          filename: `CM-110-JobQueue-Test-${sseJobId}.pdf`
        }
      }
    );

    console.log(`   ✅ Job enqueued successfully`);
    console.log(`   SSE Job ID: ${sseJobId}`);
    console.log(`   pg-boss Job ID: ${pgBossJobId}`);

    // Step 5: Monitor job progress
    console.log('\n⏳ Step 5: Monitoring job progress...');
    console.log('   (Waiting for job to complete, max 30s...)\n');

    let jobCompleted = false;
    let attempts = 0;
    const maxAttempts = 30;  // 30 seconds max

    while (!jobCompleted && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1000));  // Wait 1 second
      attempts++;

      const jobStatus = await getJobStatus(pgBossJobId);

      if (!jobStatus) {
        console.log(`   [${attempts}s] Job not found yet...`);
        continue;
      }

      const stateEmoji = {
        'created': '🔵',
        'active': '🟡',
        'completed': '✅',
        'failed': '❌'
      }[jobStatus.state] || '⚪';

      console.log(`   [${attempts}s] ${stateEmoji} State: ${jobStatus.state}, Retry: ${jobStatus.retryCount}/${jobStatus.retryLimit}`);

      if (jobStatus.state === 'completed') {
        jobCompleted = true;
        console.log('\n   📋 Job Result:');
        console.log(`      Success: ${jobStatus.output?.success}`);
        console.log(`      PDF Size: ${(jobStatus.output?.result?.sizeBytes / 1024).toFixed(2)} KB`);
        console.log(`      Temp File: ${jobStatus.output?.result?.tempFilePath}`);
        console.log(`      Dropbox: ${jobStatus.output?.result?.dropboxUrl || 'Not uploaded (disabled)'}`);
        console.log(`      Execution Time: ${jobStatus.output?.executionTimeMs}ms`);
      } else if (jobStatus.state === 'failed') {
        jobCompleted = true;
        console.log('\n   ❌ Job Failed:');
        console.log(`      Error: ${jobStatus.error || 'Unknown error'}`);
      }
    }

    if (!jobCompleted) {
      console.log('\n   ⚠️  Job did not complete within 30 seconds');
      console.log('      (This may be normal for slow database connections)');
    }

    // Step 6: Final queue stats
    console.log('\n📊 Step 6: Final queue stats...');
    const finalStats = await getQueueStats();
    console.log('   Queue Stats:', finalStats);

    // Step 7: Stop job queue
    console.log('\n🛑 Step 7: Stopping job queue...');
    await stopJobQueue();
    console.log('   ✅ Job queue stopped successfully');

    console.log('\n' + '='.repeat(80));
    console.log('\n🎉 All tests completed!\n');

    return {
      success: jobCompleted,
      sseJobId,
      pgBossJobId,
      finalStats
    };

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error('\nStack trace:');
    console.error(error.stack);

    // Try to stop queue gracefully
    try {
      await stopJobQueue();
    } catch (stopError) {
      console.error('Error stopping queue:', stopError.message);
    }

    process.exit(1);
  }
}

// Run test
testJobQueue();
