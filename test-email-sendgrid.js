/**
 * SendGrid Email Test Script
 *
 * Quick test to verify SendGrid is configured correctly and can send emails.
 * Run this BEFORE testing the full form submission workflow.
 *
 * Usage:
 *   node test-email-sendgrid.js your-email@example.com
 *
 * Or with default test email:
 *   node test-email-sendgrid.js
 */

require('dotenv').config();
const emailService = require('./email-service');

// Get test email from command line or use default
const testEmail = process.argv[2] || 'liptonlegalgroup@gmail.com';

console.log('═══════════════════════════════════════════════════════');
console.log('  SendGrid Email Service Test');
console.log('═══════════════════════════════════════════════════════\n');

// Check configuration
console.log('📋 Configuration Check:');
console.log('   API Key:', process.env.SENDGRID_API_KEY ? '✓ Configured' : '✗ Missing');
console.log('   From Address:', process.env.EMAIL_FROM_ADDRESS || '✗ Missing');
console.log('   From Name:', process.env.EMAIL_FROM_NAME || '✗ Missing');
console.log('   Enabled:', process.env.EMAIL_ENABLED || 'false');
console.log('');

if (!process.env.SENDGRID_API_KEY) {
    console.error('❌ ERROR: SENDGRID_API_KEY not found in .env file');
    console.error('   Please add your SendGrid API key to .env');
    process.exit(1);
}

if (process.env.EMAIL_ENABLED !== 'true') {
    console.warn('⚠️  WARNING: EMAIL_ENABLED is not set to "true" in .env');
    console.warn('   Emails may not be sent. Set EMAIL_ENABLED=true\n');
}

// Test email service
async function runTest() {
    try {
        console.log('🧪 Testing Email Service...\n');

        // Check if service is enabled
        const serviceEnabled = emailService.isEnabled();
        console.log('1. Service Status:', serviceEnabled ? '✓ Enabled' : '✗ Disabled');

        if (!serviceEnabled) {
            console.error('\n❌ Email service is disabled!');
            console.error('   Check your .env configuration and ensure:');
            console.error('   - SENDGRID_API_KEY is set');
            console.error('   - EMAIL_ENABLED=true');
            process.exit(1);
        }

        console.log('\n2. Sending Test Email...');
        console.log('   To:', testEmail);
        console.log('   Subject: Test Email - Lipton Legal Notifications');
        console.log('   From:', `${process.env.EMAIL_FROM_NAME} <${process.env.EMAIL_FROM_ADDRESS}>`);
        console.log('');

        // Send test email
        const result = await emailService.sendCompletionNotification({
            to: testEmail,
            name: 'Test User',
            streetAddress: '123 Test Street',
            caseId: 99999,
            dropboxLink: 'https://www.dropbox.com/test-link-example',
            documentCount: 32
        });

        console.log('');
        console.log('═══════════════════════════════════════════════════════');

        if (result.success) {
            console.log('✅ SUCCESS! Test email sent successfully!');
            console.log('');
            console.log('📧 Check your inbox at:', testEmail);
            console.log('   Subject: "123 Test Street - Discover Forms Generated"');
            console.log('');
            console.log('   (Check spam folder if you don\'t see it in inbox)');
            console.log('');
            console.log('✓ SendGrid is configured correctly!');
            console.log('✓ Email templates are working!');
            console.log('✓ Ready to test full form submission workflow!');
        } else {
            console.error('❌ FAILED! Could not send test email');
            console.error('');
            console.error('Error:', result.error);
            console.error('');
            console.error('Common Issues:');
            console.error('  1. Invalid SendGrid API key');
            console.error('  2. Sender email not verified in SendGrid');
            console.error('  3. SendGrid account suspended');
            console.error('  4. Network connectivity issues');
            console.error('');
            console.error('Next Steps:');
            console.error('  1. Check SendGrid dashboard: https://app.sendgrid.com/');
            console.error('  2. Verify sender email is verified');
            console.error('  3. Check API key has "Mail Send" permissions');
            process.exit(1);
        }

        console.log('═══════════════════════════════════════════════════════');

    } catch (error) {
        console.error('\n═══════════════════════════════════════════════════════');
        console.error('❌ TEST FAILED - Unexpected Error');
        console.error('═══════════════════════════════════════════════════════');
        console.error('');
        console.error('Error:', error.message);
        console.error('');
        console.error('Stack Trace:');
        console.error(error.stack);
        process.exit(1);
    }
}

// Run the test
runTest();
