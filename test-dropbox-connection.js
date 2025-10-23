#!/usr/bin/env node
/**
 * Quick Dropbox Connection Test
 * 
 * This script tests your Dropbox configuration and connection.
 * Run with: node test-dropbox-connection.js
 */

require('dotenv').config();
const dropboxService = require('./dropbox-service');

async function testDropboxConnection() {
    console.log('\n🔍 Dropbox Configuration Test\n');
    console.log('━'.repeat(50));
    
    // Check configuration
    const config = dropboxService.config;
    console.log('\n📋 Current Configuration:');
    console.log(`   DROPBOX_ENABLED: ${config.enabled}`);
    console.log(`   DROPBOX_ACCESS_TOKEN: ${config.accessToken ? '✅ Set (hidden)' : '❌ Not set'}`);
    console.log(`   DROPBOX_BASE_PATH: ${config.basePath}`);
    console.log(`   LOCAL_OUTPUT_PATH: ${config.localOutputPath}`);
    console.log(`   CONTINUE_ON_FAILURE: ${config.continueOnFailure}`);
    
    console.log('\n━'.repeat(50));
    
    // Check if enabled
    if (!config.enabled) {
        console.log('\n❌ Dropbox is DISABLED');
        console.log('\n📝 To enable Dropbox:');
        console.log('   1. Open the .env file');
        console.log('   2. Set DROPBOX_ENABLED=true');
        console.log('   3. Add your DROPBOX_ACCESS_TOKEN');
        console.log('\n📖 See docs/setup/DROPBOX_SETUP.md for complete setup instructions\n');
        process.exit(1);
    }
    
    // Check if access token is set
    if (!config.accessToken) {
        console.log('\n❌ DROPBOX_ACCESS_TOKEN is not set');
        console.log('\n📝 To add your access token:');
        console.log('   1. Go to https://www.dropbox.com/developers/apps');
        console.log('   2. Create or select your app');
        console.log('   3. Generate an access token');
        console.log('   4. Add it to .env: DROPBOX_ACCESS_TOKEN=your_token_here');
        console.log('\n📖 See docs/setup/DROPBOX_SETUP.md for detailed instructions\n');
        process.exit(1);
    }
    
    // Test connection
    console.log('\n🔌 Testing Dropbox Connection...\n');
    
    try {
        const accountInfo = await dropboxService.getAccountInfo();
        console.log('✅ Successfully connected to Dropbox!\n');
        console.log(`   Account Name: ${accountInfo.name.display_name}`);
        console.log(`   Email: ${accountInfo.email}`);
        console.log(`   Account ID: ${accountInfo.account_id.substring(0, 20)}...`);
        console.log(`   Country: ${accountInfo.country || 'N/A'}`);
        
        console.log('\n━'.repeat(50));
        console.log('\n✅ Configuration is valid! Dropbox service is ready to use.\n');
        console.log('💡 Next steps:');
        console.log('   - Start your server: npm start');
        console.log('   - Test file upload: node test-dropbox-upload.js');
        console.log('\n');
        
    } catch (error) {
        console.log('❌ Failed to connect to Dropbox\n');
        console.log(`   Error: ${error.message}\n`);
        
        if (error.status === 401 || error.message.includes('unauthorized')) {
            console.log('🔑 This looks like an authentication error.');
            console.log('   Your access token may be:');
            console.log('   - Invalid');
            console.log('   - Expired');
            console.log('   - Missing required permissions\n');
            console.log('💡 Solutions:');
            console.log('   1. Generate a new access token at https://www.dropbox.com/developers/apps');
            console.log('   2. Ensure permissions include: files.content.write, files.metadata.write');
            console.log('   3. Update DROPBOX_ACCESS_TOKEN in .env\n');
        } else {
            console.log('💡 Check your internet connection and try again.\n');
        }
        
        process.exit(1);
    }
}

// Run the test
testDropboxConnection().catch(error => {
    console.error('\n💥 Unexpected error:', error.message);
    process.exit(1);
});

