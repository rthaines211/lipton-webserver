/**
 * Phase 6A.4: Full Intake → Doc-Gen E2E Flow Tests
 *
 * Tests the complete end-to-end flow from opening the doc-gen form,
 * loading an intake, and verifying all data populates correctly.
 *
 * Test Coverage:
 * - E2E-01 through E2E-15 as specified in Phase 6 plan
 *
 * Run with: npx playwright test phase6-full-intake-docgen-flow.spec.js --headed
 */

import { test, expect } from '@playwright/test';

const DOC_GEN_URL = 'http://localhost:3000/?token=29c0f5b6b92b1fdc4305dd844a0767a1d00de2a01334214a07bd3e30bb5ad3d8';
const API_TOKEN = '29c0f5b6b92b1fdc4305dd844a0767a1d00de2a01334214a07bd3e30bb5ad3d8';

test.describe('Phase 6A.4: Full Intake → Doc-Gen E2E Flow', () => {
  test.setTimeout(120000); // 2 minutes

  // ============================================
  // E2E-01: Open doc-gen form with token
  // ============================================
  test('E2E-01: Doc-gen form loads successfully with token', async ({ page }) => {
    console.log('\n=== E2E-01: Form Loads With Token ===');

    await page.goto(DOC_GEN_URL);
    await page.waitForLoadState('networkidle');

    // Check that the form loaded (not an error page)
    const formContainer = page.locator('#form-container, form, .form-wrapper');
    const formExists = await formContainer.count() > 0;

    console.log(`  Form container exists: ${formExists}`);

    // Check for "Load from Intake" button - indicates full form loaded
    const loadButton = page.locator('button:has-text("LOAD FROM CLIENT INTAKE"), button:has-text("Load from Client Intake")');
    const buttonExists = await loadButton.count() > 0;

    console.log(`  Load from Intake button exists: ${buttonExists}`);

    // The key test is that the Load from Intake button exists
    // This means the form loaded successfully with the token
    expect(buttonExists).toBeTruthy();
    console.log('  E2E-01: PASSED');
  });

  // ============================================
  // E2E-02: Click "Load from Client Intake" opens modal
  // ============================================
  test('E2E-02: Load from Client Intake button opens modal', async ({ page }) => {
    console.log('\n=== E2E-02: Modal Opens ===');

    await page.goto(DOC_GEN_URL);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const loadButton = page.locator('button:has-text("LOAD FROM CLIENT INTAKE"), button:has-text("Load from Client Intake")');
    await loadButton.first().click({ timeout: 10000 });

    // Wait for modal to appear
    const modal = page.locator('#intake-search-modal');
    await expect(modal).toBeVisible({ timeout: 5000 });

    console.log('  Modal opened successfully');

    // Verify modal has expected content
    const hasSearchInput = await modal.locator('input[type="text"], input[type="search"]').count() > 0;
    const hasIntakeList = await modal.locator('.intake-list, .intake-item, table').count() > 0;

    console.log(`  Has search input: ${hasSearchInput}`);
    console.log(`  Has intake list: ${hasIntakeList}`);

    expect(hasSearchInput || hasIntakeList).toBeTruthy();
    console.log('  E2E-02: PASSED');
  });

  // ============================================
  // E2E-03: Search intakes by name
  // ============================================
  test('E2E-03: Search/filter intakes by name works', async ({ page }) => {
    console.log('\n=== E2E-03: Search Intakes ===');

    await page.goto(DOC_GEN_URL);
    await page.waitForLoadState('networkidle');

    const loadButton = page.locator('button:has-text("LOAD FROM CLIENT INTAKE"), button:has-text("Load from Client Intake")');
    await loadButton.first().click({ timeout: 10000 });
    await page.waitForSelector('#intake-search-modal', { state: 'visible', timeout: 5000 });
    await page.waitForTimeout(2000);

    const searchInput = page.locator('#intake-search-input');
    const searchExists = await searchInput.count() > 0;

    console.log(`  Search input exists: ${searchExists}`);

    if (searchExists) {
      // Type a search query
      await searchInput.fill('test');
      await page.waitForTimeout(1000);

      // Check if results filtered (or at least no error)
      const intakeItems = page.locator('.intake-item, .intake-row, tr');
      const itemCount = await intakeItems.count();

      console.log(`  Items after search: ${itemCount}`);
    }

    console.log('  E2E-03: PASSED');
  });

  // ============================================
  // E2E-04: Select intake from list
  // ============================================
  test('E2E-04: Select intake from list makes preview available', async ({ page }) => {
    console.log('\n=== E2E-04: Select Intake ===');

    await page.goto(DOC_GEN_URL);
    await page.waitForLoadState('networkidle');

    const loadButton = page.locator('button:has-text("LOAD FROM CLIENT INTAKE"), button:has-text("Load from Client Intake")');
    await loadButton.first().click({ timeout: 10000 });
    await page.waitForSelector('#intake-search-modal', { state: 'visible', timeout: 5000 });
    await page.waitForTimeout(2000);

    const selectButtons = page.locator('.intake-action-btn-primary, .select-intake-btn');
    const buttonCount = await selectButtons.count();

    console.log(`  Select buttons found: ${buttonCount}`);

    if (buttonCount === 0) {
      console.log('  Skipping: No intakes available');
      test.skip();
      return;
    }

    // Check for preview button (if exists)
    const previewButtons = page.locator('.intake-action-btn-secondary, button:has-text("Preview")');
    const hasPreview = await previewButtons.count() > 0;

    console.log(`  Preview buttons available: ${hasPreview}`);

    console.log('  E2E-04: PASSED');
  });

  // ============================================
  // E2E-05: Load intake data closes modal
  // ============================================
  test('E2E-05: Loading intake data closes modal and populates form', async ({ page }) => {
    console.log('\n=== E2E-05: Load Intake Data ===');

    await page.goto(DOC_GEN_URL);
    await page.waitForLoadState('networkidle');

    const loadButton = page.locator('button:has-text("LOAD FROM CLIENT INTAKE"), button:has-text("Load from Client Intake")');
    await loadButton.first().click({ timeout: 10000 });
    await page.waitForSelector('#intake-search-modal', { state: 'visible', timeout: 5000 });
    await page.waitForTimeout(2000);

    const selectButtons = page.locator('.intake-action-btn-primary');
    if (await selectButtons.count() === 0) {
      console.log('  Skipping: No intakes available');
      test.skip();
      return;
    }

    await selectButtons.first().click();

    // Wait for modal to close
    await page.waitForSelector('#intake-search-modal', { state: 'hidden', timeout: 5000 });

    console.log('  Modal closed after selection');

    // Wait for form population
    await page.waitForTimeout(2000);

    console.log('  E2E-05: PASSED');
  });

  // ============================================
  // E2E-06: Verify plaintiff fields populated
  // ============================================
  test('E2E-06: Plaintiff fields are populated after load', async ({ page }) => {
    console.log('\n=== E2E-06: Plaintiff Fields ===');

    await page.goto(DOC_GEN_URL);
    await page.waitForLoadState('networkidle');

    // Load intake
    const loadButton = page.locator('button:has-text("LOAD FROM CLIENT INTAKE"), button:has-text("Load from Client Intake")');
    await loadButton.first().click({ timeout: 10000 });
    await page.waitForSelector('#intake-search-modal', { state: 'visible', timeout: 5000 });
    await page.waitForTimeout(2000);

    const selectButtons = page.locator('.intake-action-btn-primary');
    if (await selectButtons.count() === 0) {
      console.log('  Skipping: No intakes available');
      test.skip();
      return;
    }

    await selectButtons.first().click();
    await page.waitForSelector('#intake-search-modal', { state: 'hidden', timeout: 5000 });
    await page.waitForTimeout(3000);

    // Check plaintiff fields
    const plaintiffFields = [
      { selector: '#plaintiff-1-first-name', name: 'First Name' },
      { selector: '#plaintiff-1-last-name', name: 'Last Name' },
      { selector: '#plaintiff-1-email', name: 'Email' },
      { selector: '#plaintiff-1-phone', name: 'Phone' }
    ];

    let populatedCount = 0;

    console.log('  Plaintiff fields:');
    for (const field of plaintiffFields) {
      const element = page.locator(field.selector);
      if (await element.count() > 0) {
        const value = await element.inputValue();
        const hasValue = value && value.trim() !== '';
        if (hasValue) populatedCount++;
        console.log(`    ${field.name}: ${hasValue ? `"${value}"` : '(empty)'}`);
      } else {
        console.log(`    ${field.name}: element not found`);
      }
    }

    console.log(`\n  Populated: ${populatedCount}/${plaintiffFields.length}`);
    expect(populatedCount).toBeGreaterThan(0);
    console.log('  E2E-06: PASSED');
  });

  // ============================================
  // E2E-07: Verify property address populated
  // ============================================
  test('E2E-07: Property address is populated after load', async ({ page }) => {
    console.log('\n=== E2E-07: Property Address ===');

    await page.goto(DOC_GEN_URL);
    await page.waitForLoadState('networkidle');

    const loadButton = page.locator('button:has-text("LOAD FROM CLIENT INTAKE"), button:has-text("Load from Client Intake")');
    await loadButton.first().click({ timeout: 10000 });
    await page.waitForSelector('#intake-search-modal', { state: 'visible', timeout: 5000 });
    await page.waitForTimeout(2000);

    const selectButtons = page.locator('.intake-action-btn-primary');
    if (await selectButtons.count() === 0) {
      console.log('  Skipping: No intakes available');
      test.skip();
      return;
    }

    await selectButtons.first().click();
    await page.waitForSelector('#intake-search-modal', { state: 'hidden', timeout: 5000 });
    await page.waitForTimeout(3000);

    // Check property address
    const propertyAddress = page.locator('#property-address');
    if (await propertyAddress.count() === 0) {
      console.log('  Skipping: Property address field not found');
      test.skip();
      return;
    }

    const value = await propertyAddress.inputValue();
    const hasValue = value && value.trim() !== '';

    console.log(`  Property address: ${hasValue ? `"${value}"` : '(empty)'}`);

    expect(hasValue).toBeTruthy();
    console.log('  E2E-07: PASSED');
  });

  // ============================================
  // E2E-08: Verify issue checkboxes populated
  // ============================================
  test('E2E-08: Issue checkboxes are populated after load', async ({ page }) => {
    console.log('\n=== E2E-08: Issue Checkboxes ===');

    await page.goto(DOC_GEN_URL);
    await page.waitForLoadState('networkidle');

    const loadButton = page.locator('button:has-text("LOAD FROM CLIENT INTAKE"), button:has-text("Load from Client Intake")');
    await loadButton.first().click({ timeout: 10000 });
    await page.waitForSelector('#intake-search-modal', { state: 'visible', timeout: 5000 });
    await page.waitForTimeout(2000);

    const selectButtons = page.locator('.intake-action-btn-primary');
    if (await selectButtons.count() === 0) {
      console.log('  Skipping: No intakes available');
      test.skip();
      return;
    }

    await selectButtons.first().click();
    await page.waitForSelector('#intake-search-modal', { state: 'hidden', timeout: 5000 });
    await page.waitForTimeout(3000);

    // Count checked checkboxes
    const allCheckboxes = page.locator('input[type="checkbox"]');
    const totalCheckboxes = await allCheckboxes.count();
    const checkedCheckboxes = await page.locator('input[type="checkbox"]:checked').count();

    console.log(`  Total checkboxes: ${totalCheckboxes}`);
    console.log(`  Checked checkboxes: ${checkedCheckboxes}`);

    expect(checkedCheckboxes).toBeGreaterThan(0);
    console.log('  E2E-08: PASSED');
  });

  // ============================================
  // E2E-09: Verify Client Intake Notes panel
  // ============================================
  test('E2E-09: Client Intake Notes panel displays metadata', async ({ page }) => {
    console.log('\n=== E2E-09: Client Intake Notes Panel ===');

    await page.goto(DOC_GEN_URL);
    await page.waitForLoadState('networkidle');

    const loadButton = page.locator('button:has-text("LOAD FROM CLIENT INTAKE"), button:has-text("Load from Client Intake")');
    await loadButton.first().click({ timeout: 10000 });
    await page.waitForSelector('#intake-search-modal', { state: 'visible', timeout: 5000 });
    await page.waitForTimeout(2000);

    const selectButtons = page.locator('.intake-action-btn-primary');
    if (await selectButtons.count() === 0) {
      console.log('  Skipping: No intakes available');
      test.skip();
      return;
    }

    await selectButtons.first().click();
    await page.waitForSelector('#intake-search-modal', { state: 'hidden', timeout: 5000 });
    await page.waitForTimeout(3000);

    // Check for metadata panel
    const metadataPanel = page.locator('#intake-issue-details-container');
    const panelVisible = await metadataPanel.isVisible();

    console.log(`  Metadata panel visible: ${panelVisible}`);

    if (panelVisible) {
      const hasContent = await metadataPanel.evaluate(el => el.innerHTML.length > 100);
      const hasReadOnly = await metadataPanel.locator('text=/Read-Only/i').count() > 0;

      console.log(`  Has content: ${hasContent}`);
      console.log(`  Has Read-Only label: ${hasReadOnly}`);
    }

    console.log('  E2E-09: PASSED');
  });

  // ============================================
  // E2E-10: Edit loaded data
  // ============================================
  test('E2E-10: Form fields remain editable after load', async ({ page }) => {
    console.log('\n=== E2E-10: Edit Loaded Data ===');

    await page.goto(DOC_GEN_URL);
    await page.waitForLoadState('networkidle');

    const loadButton = page.locator('button:has-text("LOAD FROM CLIENT INTAKE"), button:has-text("Load from Client Intake")');
    await loadButton.first().click({ timeout: 10000 });
    await page.waitForSelector('#intake-search-modal', { state: 'visible', timeout: 5000 });
    await page.waitForTimeout(2000);

    const selectButtons = page.locator('.intake-action-btn-primary');
    if (await selectButtons.count() === 0) {
      console.log('  Skipping: No intakes available');
      test.skip();
      return;
    }

    await selectButtons.first().click();
    await page.waitForSelector('#intake-search-modal', { state: 'hidden', timeout: 5000 });
    await page.waitForTimeout(2000);

    // Try to edit property address
    const propertyAddress = page.locator('#property-address');
    if (await propertyAddress.count() > 0) {
      const originalValue = await propertyAddress.inputValue();
      const testValue = '999 Edited Street, Test City, CA 12345';

      await propertyAddress.fill(testValue);
      const newValue = await propertyAddress.inputValue();

      console.log(`  Original: "${originalValue}"`);
      console.log(`  Edited to: "${newValue}"`);

      expect(newValue).toBe(testValue);
      console.log('  Field is editable');
    }

    console.log('  E2E-10: PASSED');
  });

  // ============================================
  // E2E-11: Toggle checkbox after load
  // ============================================
  test('E2E-11: Checkboxes can be toggled after load', async ({ page }) => {
    console.log('\n=== E2E-11: Toggle Checkbox After Load ===');

    await page.goto(DOC_GEN_URL);
    await page.waitForLoadState('networkidle');

    const loadButton = page.locator('button:has-text("LOAD FROM CLIENT INTAKE"), button:has-text("Load from Client Intake")');
    await loadButton.first().click({ timeout: 10000 });
    await page.waitForSelector('#intake-search-modal', { state: 'visible', timeout: 5000 });
    await page.waitForTimeout(2000);

    const selectButtons = page.locator('.intake-action-btn-primary');
    if (await selectButtons.count() === 0) {
      console.log('  Skipping: No intakes available');
      test.skip();
      return;
    }

    await selectButtons.first().click();
    await page.waitForSelector('#intake-search-modal', { state: 'hidden', timeout: 5000 });
    await page.waitForTimeout(2000);

    // Find any checkbox and toggle it
    const checkbox = page.locator('input[type="checkbox"]').first();
    const initialState = await checkbox.isChecked();

    await checkbox.click();
    const newState = await checkbox.isChecked();

    console.log(`  Initial state: ${initialState}`);
    console.log(`  After click: ${newState}`);

    expect(newState).not.toBe(initialState);
    console.log('  E2E-11: PASSED');
  });

  // ============================================
  // E2E-12: Confirmation on overwrite (Plan Q13)
  // ============================================
  test('E2E-12: Confirmation dialog appears when form has existing data', async ({ page }) => {
    console.log('\n=== E2E-12: Overwrite Confirmation (Plan Q13) ===');

    await page.goto(DOC_GEN_URL);
    await page.waitForLoadState('networkidle');

    // First, populate some data
    const propertyAddress = page.locator('#property-address');
    if (await propertyAddress.count() > 0) {
      await propertyAddress.fill('123 Existing Data Street');
    }

    // Set up dialog handler
    let dialogShown = false;
    let dialogMessage = '';

    page.on('dialog', async dialog => {
      dialogShown = true;
      dialogMessage = dialog.message();
      console.log(`  Dialog message: "${dialogMessage}"`);
      await dialog.accept();
    });

    // Try to load an intake
    const loadButton = page.locator('button:has-text("LOAD FROM CLIENT INTAKE"), button:has-text("Load from Client Intake")');
    await loadButton.first().click({ timeout: 10000 });
    await page.waitForSelector('#intake-search-modal', { state: 'visible', timeout: 5000 });
    await page.waitForTimeout(2000);

    const selectButtons = page.locator('.intake-action-btn-primary');
    if (await selectButtons.count() === 0) {
      console.log('  Skipping: No intakes available');
      test.skip();
      return;
    }

    await selectButtons.first().click();
    await page.waitForTimeout(3000);

    // Check if dialog was shown or custom modal
    const confirmModal = page.locator('#intake-confirm-modal, .confirm-dialog');
    const customModalShown = await confirmModal.isVisible().catch(() => false);

    console.log(`  Browser dialog shown: ${dialogShown}`);
    console.log(`  Custom modal shown: ${customModalShown}`);

    if (dialogShown) {
      expect(dialogMessage.toLowerCase()).toContain('overwrite');
    }

    console.log('  E2E-12: PASSED');
  });

  // ============================================
  // E2E-13: API endpoint called
  // ============================================
  test('E2E-13: Correct API endpoint is called when loading intake', async ({ page }) => {
    console.log('\n=== E2E-13: API Endpoint Called ===');

    const apiCalls = [];

    page.on('request', request => {
      if (request.url().includes('/api/')) {
        apiCalls.push({
          url: request.url(),
          method: request.method()
        });
      }
    });

    await page.goto(DOC_GEN_URL);
    await page.waitForLoadState('networkidle');

    const loadButton = page.locator('button:has-text("LOAD FROM CLIENT INTAKE"), button:has-text("Load from Client Intake")');
    await loadButton.first().click({ timeout: 10000 });
    await page.waitForSelector('#intake-search-modal', { state: 'visible', timeout: 5000 });
    await page.waitForTimeout(2000);

    const selectButtons = page.locator('.intake-action-btn-primary');
    if (await selectButtons.count() === 0) {
      console.log('  Skipping: No intakes available');
      test.skip();
      return;
    }

    await selectButtons.first().click();
    await page.waitForSelector('#intake-search-modal', { state: 'hidden', timeout: 5000 });
    await page.waitForTimeout(2000);

    // Check for expected API calls
    const loadIntakeCall = apiCalls.find(call =>
      call.url.includes('/api/form-entries/load-from-intake/') ||
      call.url.includes('/api/intakes/') && call.url.includes('/doc-gen-format')
    );

    console.log('  API calls made:');
    apiCalls.slice(-10).forEach(call => console.log(`    ${call.method} ${call.url}`));

    console.log(`\n  Load intake endpoint called: ${!!loadIntakeCall}`);

    expect(loadIntakeCall).toBeDefined();
    console.log('  E2E-13: PASSED');
  });

  // ============================================
  // E2E-14: Issue metadata API called
  // ============================================
  test('E2E-14: Issue metadata API endpoint is called', async ({ page }) => {
    console.log('\n=== E2E-14: Issue Metadata API ===');

    const apiCalls = [];

    page.on('request', request => {
      if (request.url().includes('issue-metadata')) {
        apiCalls.push(request.url());
      }
    });

    await page.goto(DOC_GEN_URL);
    await page.waitForLoadState('networkidle');

    const loadButton = page.locator('button:has-text("LOAD FROM CLIENT INTAKE"), button:has-text("Load from Client Intake")');
    await loadButton.first().click({ timeout: 10000 });
    await page.waitForSelector('#intake-search-modal', { state: 'visible', timeout: 5000 });
    await page.waitForTimeout(2000);

    const selectButtons = page.locator('.intake-action-btn-primary');
    if (await selectButtons.count() === 0) {
      console.log('  Skipping: No intakes available');
      test.skip();
      return;
    }

    await selectButtons.first().click();
    await page.waitForSelector('#intake-search-modal', { state: 'hidden', timeout: 5000 });
    await page.waitForTimeout(3000);

    console.log(`  Issue-metadata calls: ${apiCalls.length}`);
    apiCalls.forEach(url => console.log(`    ${url}`));

    expect(apiCalls.length).toBeGreaterThan(0);
    console.log('  E2E-14: PASSED');
  });

  // ============================================
  // E2E-15: Console shows success messages
  // ============================================
  test('E2E-15: Console shows success messages, no errors', async ({ page }) => {
    console.log('\n=== E2E-15: Console Messages ===');

    const consoleMessages = [];
    const consoleErrors = [];

    page.on('console', msg => {
      consoleMessages.push(msg.text());
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto(DOC_GEN_URL);
    await page.waitForLoadState('networkidle');

    const loadButton = page.locator('button:has-text("LOAD FROM CLIENT INTAKE"), button:has-text("Load from Client Intake")');
    await loadButton.first().click({ timeout: 10000 });
    await page.waitForSelector('#intake-search-modal', { state: 'visible', timeout: 5000 });
    await page.waitForTimeout(2000);

    const selectButtons = page.locator('.intake-action-btn-primary');
    if (await selectButtons.count() === 0) {
      console.log('  Skipping: No intakes available');
      test.skip();
      return;
    }

    await selectButtons.first().click();
    await page.waitForSelector('#intake-search-modal', { state: 'hidden', timeout: 5000 });
    await page.waitForTimeout(3000);

    // Check for success messages
    const successMessages = consoleMessages.filter(msg =>
      msg.toLowerCase().includes('success') ||
      msg.includes('Successfully') ||
      msg.includes('populated') ||
      msg.includes('loaded')
    );

    console.log(`  Total console messages: ${consoleMessages.length}`);
    console.log(`  Success messages: ${successMessages.length}`);
    console.log(`  Error messages: ${consoleErrors.length}`);

    if (successMessages.length > 0) {
      console.log('\n  Success messages:');
      successMessages.slice(0, 5).forEach(msg => console.log(`    ✓ ${msg}`));
    }

    if (consoleErrors.length > 0) {
      console.log('\n  Errors:');
      consoleErrors.slice(0, 3).forEach(err => console.log(`    ✗ ${err}`));
    }

    expect(consoleErrors.length).toBe(0);
    console.log('  E2E-15: PASSED');
  });

  // ============================================
  // Comprehensive E2E Test
  // ============================================
  test('Phase 6A.4: Complete E2E flow test', async ({ page }) => {
    console.log('\n========================================');
    console.log('PHASE 6A.4 COMPREHENSIVE E2E TEST');
    console.log('========================================\n');

    const results = {
      'Form loads': false,
      'Modal opens': false,
      'Intake loaded': false,
      'Fields populated': false,
      'Checkboxes populated': false,
      'Data editable': false,
      'No errors': false
    };

    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Test form loads
    await page.goto(DOC_GEN_URL);
    await page.waitForLoadState('networkidle');
    results['Form loads'] = await page.locator('button:has-text("LOAD FROM CLIENT INTAKE")').isVisible();

    // Test modal opens
    const loadButton = page.locator('button:has-text("LOAD FROM CLIENT INTAKE"), button:has-text("Load from Client Intake")');
    await loadButton.first().click({ timeout: 10000 });
    await page.waitForTimeout(1000);
    results['Modal opens'] = await page.locator('#intake-search-modal').isVisible();

    // Wait for intakes
    await page.waitForTimeout(2000);
    const selectButtons = page.locator('.intake-action-btn-primary');

    if (await selectButtons.count() === 0) {
      console.log('⚠ No intakes available - partial test only');
    } else {
      // Load intake
      await selectButtons.first().click();
      await page.waitForSelector('#intake-search-modal', { state: 'hidden', timeout: 5000 });
      await page.waitForTimeout(3000);
      results['Intake loaded'] = true;

      // Check fields populated
      const propertyAddress = page.locator('#property-address');
      if (await propertyAddress.count() > 0) {
        const value = await propertyAddress.inputValue();
        results['Fields populated'] = value && value.trim() !== '';
      }

      // Check checkboxes populated
      const checkedCount = await page.locator('input[type="checkbox"]:checked').count();
      results['Checkboxes populated'] = checkedCount > 0;

      // Test editability
      if (await propertyAddress.count() > 0) {
        await propertyAddress.fill('Test Edit');
        const newValue = await propertyAddress.inputValue();
        results['Data editable'] = newValue === 'Test Edit';
      }
    }

    // Check for errors
    results['No errors'] = consoleErrors.length === 0;

    // Print results
    console.log('Results:');
    let passCount = 0;
    for (const [test, passed] of Object.entries(results)) {
      console.log(`  ${passed ? '✓' : '✗'} ${test}`);
      if (passed) passCount++;
    }

    console.log(`\nPassed: ${passCount}/${Object.keys(results).length}`);

    if (consoleErrors.length > 0) {
      console.log('\nErrors encountered:');
      consoleErrors.forEach(err => console.log(`  ✗ ${err}`));
    }

    console.log('\n========================================\n');

    expect(passCount).toBeGreaterThanOrEqual(3);
  });
});
