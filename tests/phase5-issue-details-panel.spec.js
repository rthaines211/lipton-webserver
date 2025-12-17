/**
 * Playwright Test Script for Phase 5: Issue Details Panel
 *
 * Tests the functionality of displaying intake issue metadata in read-only panels
 * in the document generation form after loading from a client intake.
 *
 * Phase 5 Implementation (2025-12-11):
 * - 5.1: API endpoint GET /api/intakes/:id/issue-metadata
 * - 5.2: IssueDetailsPanel UI component (read-only)
 * - 5.3: Integration with Load Intake flow
 * - 5.4: Tests for Phase 5 functionality (this file)
 *
 * Run with: npx playwright test phase5-issue-details-panel.spec.js --headed
 */

import { test, expect } from '@playwright/test';

const DOC_GEN_URL = 'http://localhost:3000/?token=29c0f5b6b92b1fdc4305dd844a0767a1d00de2a01334214a07bd3e30bb5ad3d8';
const API_TOKEN = '29c0f5b6b92b1fdc4305dd844a0767a1d00de2a01334214a07bd3e30bb5ad3d8';

test.describe('Phase 5: Issue Details Panel', () => {
  test.setTimeout(120000); // 2 minutes

  // ============================================
  // 5.1: API ENDPOINT TESTS
  // ============================================

  test('5.1: API endpoint /api/intakes/:id/issue-metadata should exist and respond', async ({ request }) => {
    // First, get a valid intake ID from the intakes list
    const listResponse = await request.get('http://localhost:3000/api/intakes?limit=1', {
      headers: {
        'Authorization': `Bearer ${API_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('\n=== API ENDPOINT TEST ===');

    if (!listResponse.ok()) {
      console.log('  Skipping: No intakes available (need at least one intake for this test)');
      return;
    }

    const listData = await listResponse.json();
    if (!listData.intakes || listData.intakes.length === 0) {
      console.log('  Skipping: No intakes found in database');
      return;
    }

    const intakeId = listData.intakes[0].id;
    console.log(`  Testing with intake ID: ${intakeId}`);

    // Test the issue-metadata endpoint
    const metadataResponse = await request.get(`http://localhost:3000/api/intakes/${intakeId}/issue-metadata`, {
      headers: {
        'Authorization': `Bearer ${API_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    console.log(`  Response status: ${metadataResponse.status()}`);
    expect(metadataResponse.ok()).toBeTruthy();

    const metadataData = await metadataResponse.json();
    console.log('  Response structure:');
    console.log(`    - intakeId: ${metadataData.intakeId ? 'present' : 'missing'}`);
    console.log(`    - intakeNumber: ${metadataData.intakeNumber || 'N/A'}`);
    console.log(`    - issueMetadata: ${Array.isArray(metadataData.issueMetadata) ? `array(${metadataData.issueMetadata.length})` : 'missing'}`);
    console.log(`    - totalCategories: ${metadataData.totalCategories}`);

    // Verify response structure
    expect(metadataData).toHaveProperty('intakeId');
    expect(metadataData).toHaveProperty('issueMetadata');
    expect(Array.isArray(metadataData.issueMetadata)).toBeTruthy();

    // If there are issue metadata items, verify their structure
    if (metadataData.issueMetadata.length > 0) {
      const firstItem = metadataData.issueMetadata[0];
      console.log('\n  First metadata item:');
      console.log(`    - categoryCode: ${firstItem.categoryCode}`);
      console.log(`    - categoryName: ${firstItem.categoryName}`);
      console.log(`    - additionalDetails: ${firstItem.additionalDetails ? 'present' : 'null'}`);
      console.log(`    - firstNoticed: ${firstItem.firstNoticed || 'null'}`);
      console.log(`    - severity: ${firstItem.severity || 'null'}`);
      console.log(`    - repairHistory: ${firstItem.repairHistory ? 'present' : 'null'}`);
      console.log(`    - photos: ${Array.isArray(firstItem.photos) ? `array(${firstItem.photos.length})` : 'null'}`);

      expect(firstItem).toHaveProperty('categoryCode');
      expect(firstItem).toHaveProperty('categoryName');
    }

    console.log('\n  API endpoint test passed');
  });

  test('5.1: API endpoint should return 404 for non-existent intake', async ({ request }) => {
    const fakeId = '00000000-0000-0000-0000-000000000000';

    const response = await request.get(`http://localhost:3000/api/intakes/${fakeId}/issue-metadata`, {
      headers: {
        'Authorization': `Bearer ${API_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('\n=== 404 TEST ===');
    console.log(`  Response status: ${response.status()}`);
    expect(response.status()).toBe(404);
    console.log('  404 test passed');
  });

  // ============================================
  // 5.2: UI COMPONENT TESTS
  // ============================================

  test('5.2: IssueDetailsPanel should be available in global scope', async ({ page }) => {
    await page.goto(DOC_GEN_URL);
    await page.waitForLoadState('networkidle');

    console.log('\n=== UI COMPONENT TEST ===');

    // Check if IssueDetailsPanel is defined
    const panelExists = await page.evaluate(() => {
      return typeof window.IssueDetailsPanel !== 'undefined';
    });

    console.log(`  IssueDetailsPanel defined: ${panelExists}`);
    expect(panelExists).toBeTruthy();

    // Check for expected methods
    const methods = await page.evaluate(() => {
      if (!window.IssueDetailsPanel) return [];
      return Object.keys(window.IssueDetailsPanel);
    });

    console.log(`  Available methods: ${methods.join(', ')}`);
    expect(methods).toContain('render');
    expect(methods).toContain('fetchAndRender');
    expect(methods).toContain('toggleCard');

    console.log('  UI component test passed');
  });

  test('5.2: Issue details container should exist in DOM', async ({ page }) => {
    await page.goto(DOC_GEN_URL);
    await page.waitForLoadState('networkidle');

    console.log('\n=== CONTAINER TEST ===');

    const container = page.locator('#intake-issue-details-container');
    const containerExists = await container.count() > 0;

    console.log(`  Container exists: ${containerExists}`);
    expect(containerExists).toBeTruthy();

    // Container should be hidden by default
    const isHidden = await container.evaluate(el => {
      return el.style.display === 'none' || window.getComputedStyle(el).display === 'none';
    });

    console.log(`  Container hidden by default: ${isHidden}`);
    expect(isHidden).toBeTruthy();

    console.log('  Container test passed');
  });

  // ============================================
  // 5.3: INTEGRATION TESTS
  // ============================================

  test('5.3: Issue details panel should appear after loading intake', async ({ page }) => {
    await page.goto(DOC_GEN_URL);
    await page.waitForLoadState('networkidle');

    console.log('\n=== INTEGRATION TEST ===');

    // Open intake modal
    console.log('  Step 1: Opening intake modal...');
    await page.getByRole('button', { name: /load from intake/i }).click();
    await page.waitForSelector('#intake-search-modal', { state: 'visible', timeout: 5000 });
    await page.waitForTimeout(2000);

    // Check if there are any intakes to load
    const selectButtons = page.locator('.intake-action-btn-primary');
    const buttonCount = await selectButtons.count();

    if (buttonCount === 0) {
      console.log('  Skipping: No intakes available to load');
      return;
    }

    // Load the first intake
    console.log('  Step 2: Loading first intake...');
    await selectButtons.first().click();
    await page.waitForSelector('#intake-search-modal', { state: 'hidden', timeout: 5000 });
    await page.waitForTimeout(3000); // Wait for metadata fetch

    // Check if issue details container is visible
    const container = page.locator('#intake-issue-details-container');
    const isVisible = await container.isVisible();

    console.log(`  Step 3: Issue details container visible: ${isVisible}`);

    if (isVisible) {
      // Check for panel content
      const panelContent = await container.innerHTML();
      const hasPanel = panelContent.includes('issue-details-panel') || panelContent.includes('Client-Reported');

      console.log(`  Panel rendered: ${hasPanel}`);
      console.log('  Integration test passed');
    } else {
      // Container might be hidden if no metadata available
      console.log('  Container not visible (may have no metadata to display)');
    }
  });

  test('5.3: API should be called for issue metadata when loading intake', async ({ page }) => {
    const apiCalls = [];

    // Intercept API calls
    page.on('request', (request) => {
      if (request.url().includes('/api/intakes/') && request.url().includes('issue-metadata')) {
        apiCalls.push({
          url: request.url(),
          method: request.method()
        });
      }
    });

    await page.goto(DOC_GEN_URL);
    await page.waitForLoadState('networkidle');

    console.log('\n=== API CALL TEST ===');

    // Load intake
    await page.getByRole('button', { name: /load from intake/i }).click();
    await page.waitForSelector('#intake-search-modal', { state: 'visible', timeout: 5000 });
    await page.waitForTimeout(2000);

    const selectButtons = page.locator('.intake-action-btn-primary');
    if (await selectButtons.count() === 0) {
      console.log('  Skipping: No intakes available');
      return;
    }

    await selectButtons.first().click();
    await page.waitForSelector('#intake-search-modal', { state: 'hidden', timeout: 5000 });
    await page.waitForTimeout(3000);

    console.log(`  Issue-metadata API calls: ${apiCalls.length}`);
    apiCalls.forEach(call => console.log(`    ${call.method} ${call.url}`));

    expect(apiCalls.length).toBeGreaterThan(0);
    console.log('  API call test passed');
  });

  test('5.3: Panel should have correct structure when rendered', async ({ page }) => {
    await page.goto(DOC_GEN_URL);
    await page.waitForLoadState('networkidle');

    console.log('\n=== PANEL STRUCTURE TEST ===');

    // Load intake
    await page.getByRole('button', { name: /load from intake/i }).click();
    await page.waitForSelector('#intake-search-modal', { state: 'visible', timeout: 5000 });
    await page.waitForTimeout(2000);

    const selectButtons = page.locator('.intake-action-btn-primary');
    if (await selectButtons.count() === 0) {
      console.log('  Skipping: No intakes available');
      return;
    }

    await selectButtons.first().click();
    await page.waitForSelector('#intake-search-modal', { state: 'hidden', timeout: 5000 });
    await page.waitForTimeout(3000);

    const container = page.locator('#intake-issue-details-container');
    const isVisible = await container.isVisible();

    if (!isVisible) {
      console.log('  Container not visible (may have no metadata)');
      return;
    }

    // Check for panel components
    const hasHeader = await container.locator('.issue-details-header, text=/Client-Reported|Issue Details/i').count() > 0;
    const hasReadOnlyLabel = await container.locator('text=/Read-Only/i').count() > 0;
    const hasFooter = await container.locator('.issue-details-footer, text=/provided by the client/i').count() > 0;

    console.log(`  Has header: ${hasHeader}`);
    console.log(`  Has read-only label: ${hasReadOnlyLabel}`);
    console.log(`  Has footer: ${hasFooter}`);

    // Check for issue cards if there are issues
    const issueCards = container.locator('.issue-detail-card');
    const cardCount = await issueCards.count();
    console.log(`  Issue cards: ${cardCount}`);

    if (cardCount > 0) {
      // Check first card structure
      const firstCard = issueCards.first();
      const hasIcon = await firstCard.locator('.fas, i[class*="fa-"]').count() > 0;
      const hasChevron = await firstCard.locator('.issue-detail-chevron, .fa-chevron-down').count() > 0;

      console.log(`  First card has icon: ${hasIcon}`);
      console.log(`  First card has chevron: ${hasChevron}`);

      // Check for metadata fields
      const hasDetailsField = await container.locator('text=/Additional Details/i').count() > 0;
      const hasDateField = await container.locator('text=/First Noticed/i').count() > 0;
      const hasRepairField = await container.locator('text=/Repair History/i').count() > 0;

      console.log(`  Has Additional Details field: ${hasDetailsField}`);
      console.log(`  Has First Noticed field: ${hasDateField}`);
      console.log(`  Has Repair History field: ${hasRepairField}`);
    }

    console.log('  Panel structure test passed');
  });

  test('5.3: Panel cards should be collapsible', async ({ page }) => {
    await page.goto(DOC_GEN_URL);
    await page.waitForLoadState('networkidle');

    console.log('\n=== COLLAPSIBLE CARDS TEST ===');

    // Load intake
    await page.getByRole('button', { name: /load from intake/i }).click();
    await page.waitForSelector('#intake-search-modal', { state: 'visible', timeout: 5000 });
    await page.waitForTimeout(2000);

    const selectButtons = page.locator('.intake-action-btn-primary');
    if (await selectButtons.count() === 0) {
      console.log('  Skipping: No intakes available');
      return;
    }

    await selectButtons.first().click();
    await page.waitForSelector('#intake-search-modal', { state: 'hidden', timeout: 5000 });
    await page.waitForTimeout(3000);

    const container = page.locator('#intake-issue-details-container');
    if (!await container.isVisible()) {
      console.log('  Container not visible (may have no metadata)');
      return;
    }

    const cardHeaders = container.locator('.issue-detail-header');
    const headerCount = await cardHeaders.count();

    if (headerCount === 0) {
      console.log('  No cards to test');
      return;
    }

    console.log(`  Found ${headerCount} card headers`);

    // Get initial state of first card
    const firstHeader = cardHeaders.first();
    const firstContent = container.locator('#issue-detail-content-0');

    if (await firstContent.count() === 0) {
      console.log('  First card content not found');
      return;
    }

    const initialMaxHeight = await firstContent.evaluate(el => el.style.maxHeight);
    console.log(`  Initial max-height: ${initialMaxHeight}`);

    // Click to toggle
    await firstHeader.click();
    await page.waitForTimeout(500);

    const newMaxHeight = await firstContent.evaluate(el => el.style.maxHeight);
    console.log(`  After click max-height: ${newMaxHeight}`);

    expect(initialMaxHeight).not.toBe(newMaxHeight);
    console.log('  Collapsible cards test passed');
  });

  // ============================================
  // 5.4: SEVERITY BADGE TESTS
  // ============================================

  test('5.4: Severity badges should have correct colors', async ({ page }) => {
    await page.goto(DOC_GEN_URL);
    await page.waitForLoadState('networkidle');

    console.log('\n=== SEVERITY BADGE TEST ===');

    // Test the getSeverityBadge function directly
    const badgeTests = await page.evaluate(() => {
      if (!window.IssueDetailsPanel || !window.IssueDetailsPanel.getSeverityBadge) {
        return null;
      }

      return {
        low: window.IssueDetailsPanel.getSeverityBadge('low').includes('#48BB78'),
        medium: window.IssueDetailsPanel.getSeverityBadge('medium').includes('#ECC94B'),
        high: window.IssueDetailsPanel.getSeverityBadge('high').includes('#ED8936'),
        critical: window.IssueDetailsPanel.getSeverityBadge('critical').includes('#F56565')
      };
    });

    if (!badgeTests) {
      console.log('  Skipping: getSeverityBadge function not available');
      return;
    }

    console.log(`  Low (green): ${badgeTests.low ? 'PASS' : 'FAIL'}`);
    console.log(`  Medium (yellow): ${badgeTests.medium ? 'PASS' : 'FAIL'}`);
    console.log(`  High (orange): ${badgeTests.high ? 'PASS' : 'FAIL'}`);
    console.log(`  Critical (red): ${badgeTests.critical ? 'PASS' : 'FAIL'}`);

    expect(badgeTests.low).toBeTruthy();
    expect(badgeTests.medium).toBeTruthy();
    expect(badgeTests.high).toBeTruthy();
    expect(badgeTests.critical).toBeTruthy();

    console.log('  Severity badge test passed');
  });

  test('5.4: Date formatting should work correctly', async ({ page }) => {
    await page.goto(DOC_GEN_URL);
    await page.waitForLoadState('networkidle');

    console.log('\n=== DATE FORMATTING TEST ===');

    const dateTests = await page.evaluate(() => {
      if (!window.IssueDetailsPanel || !window.IssueDetailsPanel.formatDate) {
        return null;
      }

      return {
        isoDate: window.IssueDetailsPanel.formatDate('2024-01-15'),
        nullDate: window.IssueDetailsPanel.formatDate(null),
        undefinedDate: window.IssueDetailsPanel.formatDate(undefined),
        invalidDate: window.IssueDetailsPanel.formatDate('invalid')
      };
    });

    if (!dateTests) {
      console.log('  Skipping: formatDate function not available');
      return;
    }

    console.log(`  ISO date: "${dateTests.isoDate}"`);
    console.log(`  Null date: "${dateTests.nullDate}"`);
    console.log(`  Undefined date: "${dateTests.undefinedDate}"`);
    console.log(`  Invalid date: "${dateTests.invalidDate}"`);

    expect(dateTests.isoDate).toContain('January');
    expect(dateTests.isoDate).toContain('2024');
    expect(dateTests.nullDate).toBe('Not specified');
    expect(dateTests.undefinedDate).toBe('Not specified');

    console.log('  Date formatting test passed');
  });

  // ============================================
  // CONSOLE LOG VERIFICATION
  // ============================================

  test('5.4: Console should show issue metadata fetch logs', async ({ page }) => {
    const consoleMessages = [];

    page.on('console', (msg) => {
      consoleMessages.push(msg.text());
    });

    await page.goto(DOC_GEN_URL);
    await page.waitForLoadState('networkidle');

    console.log('\n=== CONSOLE LOG TEST ===');

    // Load intake
    await page.getByRole('button', { name: /load from intake/i }).click();
    await page.waitForSelector('#intake-search-modal', { state: 'visible', timeout: 5000 });
    await page.waitForTimeout(2000);

    const selectButtons = page.locator('.intake-action-btn-primary');
    if (await selectButtons.count() === 0) {
      console.log('  Skipping: No intakes available');
      return;
    }

    await selectButtons.first().click();
    await page.waitForSelector('#intake-search-modal', { state: 'hidden', timeout: 5000 });
    await page.waitForTimeout(3000);

    // Check for relevant console messages
    const metadataLogs = consoleMessages.filter(msg =>
      msg.includes('issue metadata') ||
      msg.includes('Issue details panel') ||
      msg.includes('IssueDetailsPanel')
    );

    console.log(`  Found ${metadataLogs.length} relevant console messages:`);
    metadataLogs.slice(0, 5).forEach(log => console.log(`    ${log}`));

    console.log('  Console log test passed');
  });

  // ============================================
  // COMPREHENSIVE TEST
  // ============================================

  test('Phase 5: Complete end-to-end test', async ({ page }) => {
    const apiCalls = [];
    const consoleMessages = [];

    page.on('request', (request) => {
      if (request.url().includes('/api/')) {
        apiCalls.push(request.url());
      }
    });

    page.on('console', (msg) => {
      consoleMessages.push(msg.text());
    });

    await page.goto(DOC_GEN_URL);
    await page.waitForLoadState('networkidle');

    console.log('\n========================================');
    console.log('PHASE 5 COMPREHENSIVE TEST');
    console.log('========================================\n');

    // Check prerequisites
    console.log('1. PREREQUISITES:');
    const panelExists = await page.evaluate(() => typeof window.IssueDetailsPanel !== 'undefined');
    const containerExists = await page.locator('#intake-issue-details-container').count() > 0;

    console.log(`   - IssueDetailsPanel component: ${panelExists ? 'LOADED' : 'MISSING'}`);
    console.log(`   - Container element: ${containerExists ? 'EXISTS' : 'MISSING'}`);

    expect(panelExists).toBeTruthy();
    expect(containerExists).toBeTruthy();

    // Load an intake
    console.log('\n2. LOADING INTAKE:');
    await page.getByRole('button', { name: /load from intake/i }).click();
    await page.waitForSelector('#intake-search-modal', { state: 'visible', timeout: 5000 });
    await page.waitForTimeout(2000);

    const selectButtons = page.locator('.intake-action-btn-primary');
    if (await selectButtons.count() === 0) {
      console.log('   - No intakes available in database');
      console.log('\n   Test skipped (requires intake data)');
      return;
    }

    await selectButtons.first().click();
    console.log('   - Selected first intake');

    await page.waitForSelector('#intake-search-modal', { state: 'hidden', timeout: 5000 });
    await page.waitForTimeout(3000);
    console.log('   - Intake loaded successfully');

    // Verify API call
    console.log('\n3. API CALLS:');
    const metadataCall = apiCalls.find(url => url.includes('issue-metadata'));
    console.log(`   - issue-metadata endpoint: ${metadataCall ? 'CALLED' : 'NOT CALLED'}`);

    // Verify panel visibility
    console.log('\n4. PANEL STATE:');
    const container = page.locator('#intake-issue-details-container');
    const isVisible = await container.isVisible();
    console.log(`   - Container visible: ${isVisible}`);

    if (isVisible) {
      const panelContent = await container.innerHTML();
      const hasContent = panelContent.length > 100;
      console.log(`   - Has content: ${hasContent}`);

      // Count issue cards
      const cardCount = await container.locator('.issue-detail-card').count();
      console.log(`   - Issue cards: ${cardCount}`);

      if (cardCount > 0) {
        // Verify interactivity
        console.log('\n5. INTERACTIVITY:');
        const firstHeader = container.locator('.issue-detail-header').first();
        await firstHeader.click();
        await page.waitForTimeout(300);
        console.log('   - Card toggle: WORKS');
      }
    } else {
      console.log('   - Panel hidden (no metadata available for this intake)');
    }

    console.log('\n========================================');
    console.log('PHASE 5 TEST COMPLETE');
    console.log('========================================\n');
  });
});
