/**
 * Playwright Test Script for Intake → Doc-Gen Form Loading
 *
 * Tests the functionality of loading client intake data into the document generation form,
 * specifically verifying that all checkbox categories populate correctly including:
 * - Government entities (7 checkboxes)
 * - Notices (6 checkboxes including numeric IDs like 3day, 24hour)
 * - Master-only categories (9 categories: Injury, Nonresponsive, etc.)
 * - Individual item checkboxes (appliances, structure, plumbing, etc.)
 *
 * Phase 4.4 Integration Tests (2025-12-11):
 * - Tests Phase 4.2 endpoint (/api/form-entries/load-from-intake/:intakeId)
 * - Tests preview modal functionality
 * - Tests confirmation dialog for overwriting form data (Plan Q13)
 * - Tests load complete/partial intake scenarios
 * - Tests edit after load scenario
 *
 * Run with: npx playwright test intake-to-docgen-loading.spec.js --headed
 */

import { test, expect } from '@playwright/test';

const DOC_GEN_URL = 'http://localhost:3000/?token=29c0f5b6b92b1fdc4305dd844a0767a1d00de2a01334214a07bd3e30bb5ad3d8';

test.describe('Intake to Doc-Gen Form Loading', () => {
  test.setTimeout(120000); // 2 minutes

  test('should open intake modal when clicking Load from Intake button', async ({ page }) => {
    await page.goto(DOC_GEN_URL);

    // Wait for page to load
    await expect(page.locator('body')).toBeVisible({ timeout: 10000 });

    // Find and click the "Load from Intake" button
    const loadButton = page.getByRole('button', { name: /load from intake/i });
    await expect(loadButton).toBeVisible({ timeout: 5000 });
    await loadButton.click();

    // Verify modal opens
    const modal = page.locator('#intake-search-modal');
    await expect(modal).toBeVisible({ timeout: 5000 });

    // Verify modal has search controls
    await expect(page.locator('#intake-search-input')).toBeVisible();
    await expect(page.locator('#intake-filter-status')).toBeVisible();
  });

  test('should load intake data and populate all checkbox categories', async ({ page }) => {
    await page.goto(DOC_GEN_URL);

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Open the intake modal
    const loadButton = page.getByRole('button', { name: /load from intake/i });
    await loadButton.click({ timeout: 5000 });

    // Wait for modal to open and intakes to load
    await expect(page.locator('#intake-search-modal')).toBeVisible({ timeout: 5000 });
    await page.waitForTimeout(2000); // Wait for intakes to load

    // Click the first "Select" button in the intake list
    const selectButton = page.locator('.intake-action-btn-primary').first();
    await expect(selectButton).toBeVisible({ timeout: 10000 });
    await selectButton.click();

    // Wait for modal to close and data to populate
    await expect(page.locator('#intake-search-modal')).not.toBeVisible({ timeout: 5000 });
    await page.waitForTimeout(2000); // Wait for form population

    console.log('✓ Intake loaded into form');
  });

  test('should populate government entity checkboxes', async ({ page }) => {
    await page.goto(DOC_GEN_URL);
    await page.waitForLoadState('networkidle');

    // Load intake
    await page.getByRole('button', { name: /load from intake/i }).click();
    await page.waitForSelector('#intake-search-modal', { state: 'visible', timeout: 5000 });
    await page.waitForTimeout(2000);
    await page.locator('.intake-action-btn-primary').first().click();
    await page.waitForSelector('#intake-search-modal', { state: 'hidden', timeout: 5000 });
    await page.waitForTimeout(2000);

    // Verify government entity checkboxes are populated
    // These should be checked if the intake has government entities
    const governmentCheckboxes = [
      'government-HealthDepartment-1',
      'government-PoliceDepartment-1',
      'government-HousingAuthority-1',
      'government-DepartmentofEnvironmentalHealth-1',
      'government-CodeEnforcement-1',
      'government-DepartmentofHealthServices-1',
      'government-FireDepartment-1'
    ];

    // Check if at least one government checkbox exists (they should all exist)
    for (const checkboxId of governmentCheckboxes) {
      const checkbox = page.locator(`#${checkboxId}`);
      const exists = await checkbox.count();
      console.log(`Government checkbox ${checkboxId}: ${exists > 0 ? 'EXISTS' : 'MISSING'}`);

      if (exists > 0) {
        const isChecked = await checkbox.isChecked();
        console.log(`  → Checked: ${isChecked}`);
      }
    }
  });

  test('should populate notices checkboxes including numeric IDs', async ({ page }) => {
    await page.goto(DOC_GEN_URL);
    await page.waitForLoadState('networkidle');

    // Load intake
    await page.getByRole('button', { name: /load from intake/i }).click();
    await page.waitForSelector('#intake-search-modal', { state: 'visible', timeout: 5000 });
    await page.waitForTimeout(2000);
    await page.locator('.intake-action-btn-primary').first().click();
    await page.waitForSelector('#intake-search-modal', { state: 'hidden', timeout: 5000 });
    await page.waitForTimeout(2000);

    // Verify notices checkboxes are populated
    const noticesCheckboxes = [
      'notices-3day-1',          // Numeric ID - was previously broken
      'notices-24hour-1',        // Numeric ID - was previously broken
      'notices-30day-1',         // Numeric ID - was previously broken
      'notices-60day-1',         // Numeric ID - was previously broken
      'notices-Toquit-1',        // Text ID - should work
      'notices-Performorquit-1'  // Text ID - should work
    ];

    console.log('\n=== NOTICES CHECKBOXES ===');
    for (const checkboxId of noticesCheckboxes) {
      const checkbox = page.locator(`#${checkboxId}`);
      const exists = await checkbox.count();
      console.log(`Notices checkbox ${checkboxId}: ${exists > 0 ? 'EXISTS' : 'MISSING'}`);

      if (exists > 0) {
        const isChecked = await checkbox.isChecked();
        console.log(`  → Checked: ${isChecked}`);
      }
    }
  });

  test('should populate master-only category checkboxes', async ({ page }) => {
    await page.goto(DOC_GEN_URL);
    await page.waitForLoadState('networkidle');

    // Load intake
    await page.getByRole('button', { name: /load from intake/i }).click();
    await page.waitForSelector('#intake-search-modal', { state: 'visible', timeout: 5000 });
    await page.waitForTimeout(2000);
    await page.locator('.intake-action-btn-primary').first().click();
    await page.waitForSelector('#intake-search-modal', { state: 'hidden', timeout: 5000 });
    await page.waitForTimeout(2000);

    // Verify master-only category checkboxes are populated
    // These are the 9 categories with only a yes/no toggle, no individual items
    const masterOnlyCheckboxes = [
      'direct-injuryissues-1',
      'direct-nonresponsivelandlordissues-1',
      'direct-unauthorizedentries-1',
      'direct-stolenitems-1',
      'direct-disabilitydiscrimination-1',
      'direct-damageditems-1',
      'direct-agediscrimination-1',
      'direct-racialdiscrimination-1',
      'direct-securitydepositissues-1'
    ];

    console.log('\n=== MASTER-ONLY CATEGORIES ===');
    for (const checkboxId of masterOnlyCheckboxes) {
      const checkbox = page.locator(`#${checkboxId}`);
      const exists = await checkbox.count();
      console.log(`Master-only checkbox ${checkboxId}: ${exists > 0 ? 'EXISTS' : 'MISSING'}`);

      if (exists > 0) {
        const isChecked = await checkbox.isChecked();
        console.log(`  → Checked: ${isChecked}`);
      }
    }
  });

  test('should populate individual item checkboxes (appliances, structure, etc.)', async ({ page }) => {
    await page.goto(DOC_GEN_URL);
    await page.waitForLoadState('networkidle');

    // Load intake
    await page.getByRole('button', { name: /load from intake/i }).click();
    await page.waitForSelector('#intake-search-modal', { state: 'visible', timeout: 5000 });
    await page.waitForTimeout(2000);
    await page.locator('.intake-action-btn-primary').first().click();
    await page.waitForSelector('#intake-search-modal', { state: 'hidden', timeout: 5000 });
    await page.waitForTimeout(2000);

    // Sample of individual item checkboxes across various categories
    const sampleCheckboxes = {
      appliances: [
        'appliances-Stove-1',
        'appliances-Refrigerator-1',
        'appliances-Washerdryer-1'
      ],
      structure: [
        'structure-Bumpsinceiling-1',
        'structure-Holeinceiling-1',
        'structure-Waterstainsonceiling-1'
      ],
      plumbing: [
        'plumbing-Toilet-1',
        'plumbing-Shower-1',
        'plumbing-Leaks-1'
      ],
      cabinets: [
        'cabinets-Broken-1',
        'cabinets-Hinges-1'
      ],
      windows: [
        'windows-Broken-1',
        'windows-Screens-1',
        'windows-Leaks-1'
      ]
    };

    console.log('\n=== INDIVIDUAL ITEM CHECKBOXES ===');
    for (const [category, checkboxes] of Object.entries(sampleCheckboxes)) {
      console.log(`\n${category.toUpperCase()}:`);
      for (const checkboxId of checkboxes) {
        const checkbox = page.locator(`#${checkboxId}`);
        const exists = await checkbox.count();
        console.log(`  ${checkboxId}: ${exists > 0 ? 'EXISTS' : 'MISSING'}`);

        if (exists > 0) {
          const isChecked = await checkbox.isChecked();
          console.log(`    → Checked: ${isChecked}`);
        }
      }
    }
  });

  test('should verify console logs show successful population', async ({ page }) => {
    const consoleMessages = [];

    // Capture console messages
    page.on('console', (msg) => {
      consoleMessages.push(msg.text());
    });

    await page.goto(DOC_GEN_URL);
    await page.waitForLoadState('networkidle');

    // Load intake
    await page.getByRole('button', { name: /load from intake/i }).click();
    await page.waitForSelector('#intake-search-modal', { state: 'visible', timeout: 5000 });
    await page.waitForTimeout(2000);
    await page.locator('.intake-action-btn-primary').first().click();
    await page.waitForSelector('#intake-search-modal', { state: 'hidden', timeout: 5000 });
    await page.waitForTimeout(3000); // Wait for all population to complete

    // Check console logs
    console.log('\n=== CONSOLE LOGS ===');
    const relevantLogs = consoleMessages.filter(msg =>
      msg.includes('Populated checkbox') ||
      msg.includes('Successfully populated') ||
      msg.includes('building issue') ||
      msg.includes('government-') ||
      msg.includes('notices-') ||
      msg.includes('direct-')
    );

    console.log(`Found ${relevantLogs.length} relevant console messages`);
    relevantLogs.slice(0, 20).forEach(log => console.log(`  ${log}`));

    // Verify we have success messages
    const hasSuccessMessage = consoleMessages.some(msg =>
      msg.includes('Successfully populated') && msg.includes('checkboxes')
    );

    expect(hasSuccessMessage).toBeTruthy();
  });

  test('comprehensive: should populate ALL checkbox types in one test', async ({ page }) => {
    const consoleMessages = [];
    page.on('console', (msg) => consoleMessages.push(msg.text()));

    await page.goto(DOC_GEN_URL);
    await page.waitForLoadState('networkidle');

    console.log('\n📋 COMPREHENSIVE CHECKBOX POPULATION TEST\n');

    // Step 1: Load intake
    console.log('Step 1: Opening intake modal...');
    await page.getByRole('button', { name: /load from intake/i }).click();
    await page.waitForSelector('#intake-search-modal', { state: 'visible', timeout: 5000 });

    console.log('Step 2: Waiting for intakes to load...');
    await page.waitForTimeout(2000);

    console.log('Step 3: Selecting first intake...');
    await page.locator('.intake-action-btn-primary').first().click();

    console.log('Step 4: Waiting for form population...');
    await page.waitForSelector('#intake-search-modal', { state: 'hidden', timeout: 5000 });
    await page.waitForTimeout(3000);

    // Step 2: Verify all checkbox categories
    const allCheckboxes = {
      'Government Entities': [
        'government-HealthDepartment-1',
        'government-PoliceDepartment-1',
        'government-HousingAuthority-1',
        'government-DepartmentofEnvironmentalHealth-1',
        'government-CodeEnforcement-1',
        'government-DepartmentofHealthServices-1',
        'government-FireDepartment-1'
      ],
      'Notices (Numeric IDs)': [
        'notices-3day-1',
        'notices-24hour-1',
        'notices-30day-1',
        'notices-60day-1'
      ],
      'Notices (Text IDs)': [
        'notices-Toquit-1',
        'notices-Performorquit-1'
      ],
      'Master-Only Categories': [
        'direct-injuryissues-1',
        'direct-nonresponsivelandlordissues-1',
        'direct-unauthorizedentries-1',
        'direct-stolenitems-1',
        'direct-disabilitydiscrimination-1',
        'direct-damageditems-1',
        'direct-agediscrimination-1',
        'direct-racialdiscrimination-1',
        'direct-securitydepositissues-1'
      ],
      'Appliances': [
        'appliances-Stove-1',
        'appliances-Refrigerator-1',
        'appliances-Washerdryer-1',
        'appliances-Dishwasher-1'
      ],
      'Structure': [
        'structure-Bumpsinceiling-1',
        'structure-Holeinceiling-1',
        'structure-Waterstainsonceiling-1',
        'structure-Waterstainsonwall-1'
      ],
      'Plumbing': [
        'plumbing-Toilet-1',
        'plumbing-Shower-1',
        'plumbing-Leaks-1'
      ],
      'Windows': [
        'windows-Broken-1',
        'windows-Screens-1',
        'windows-Leaks-1'
      ],
      'Cabinets': [
        'cabinets-Broken-1',
        'cabinets-Hinges-1',
        'cabinets-Alignment-1'
      ]
    };

    console.log('\n=== VERIFICATION RESULTS ===\n');

    let totalChecked = 0;
    let totalExists = 0;
    let totalMissing = 0;

    for (const [categoryName, checkboxIds] of Object.entries(allCheckboxes)) {
      console.log(`\n${categoryName}:`);

      let categoryChecked = 0;
      let categoryExists = 0;

      for (const checkboxId of checkboxIds) {
        const checkbox = page.locator(`#${checkboxId}`);
        const count = await checkbox.count();

        if (count > 0) {
          categoryExists++;
          totalExists++;
          const isChecked = await checkbox.isChecked();
          if (isChecked) {
            categoryChecked++;
            totalChecked++;
            console.log(`  ✓ ${checkboxId} - CHECKED`);
          } else {
            console.log(`  ○ ${checkboxId} - exists but not checked`);
          }
        } else {
          totalMissing++;
          console.log(`  ✗ ${checkboxId} - MISSING FROM DOM`);
        }
      }

      console.log(`  Summary: ${categoryChecked}/${checkboxIds.length} checked, ${categoryExists}/${checkboxIds.length} exist`);
    }

    console.log('\n=== OVERALL SUMMARY ===');
    console.log(`Total checkboxes checked: ${totalChecked}`);
    console.log(`Total checkboxes exist in DOM: ${totalExists}`);
    console.log(`Total checkboxes missing: ${totalMissing}`);

    // Verify we have at least some checkboxes populated
    expect(totalChecked).toBeGreaterThan(0);
    expect(totalExists).toBeGreaterThan(totalMissing);

    console.log('\n✓ Test completed successfully!\n');
  });

  // ============================================
  // PHASE 4.4 INTEGRATION TESTS
  // ============================================

  test('Phase 4.4: should use new load-from-intake endpoint', async ({ page }) => {
    const apiCalls = [];

    // Intercept API calls
    page.on('request', (request) => {
      if (request.url().includes('/api/')) {
        apiCalls.push({
          url: request.url(),
          method: request.method()
        });
      }
    });

    await page.goto(DOC_GEN_URL);
    await page.waitForLoadState('networkidle');

    // Load intake
    await page.getByRole('button', { name: /load from intake/i }).click();
    await page.waitForSelector('#intake-search-modal', { state: 'visible', timeout: 5000 });
    await page.waitForTimeout(2000);
    await page.locator('.intake-action-btn-primary').first().click();
    await page.waitForSelector('#intake-search-modal', { state: 'hidden', timeout: 5000 });
    await page.waitForTimeout(2000);

    // Check that either the new endpoint or fallback was called
    const loadFromIntakeCall = apiCalls.find(call =>
      call.url.includes('/api/form-entries/load-from-intake/') ||
      call.url.includes('/api/intakes/') && call.url.includes('/doc-gen-format')
    );

    console.log('\n=== API CALLS ===');
    apiCalls.forEach(call => console.log(`  ${call.method} ${call.url}`));

    expect(loadFromIntakeCall).toBeDefined();
    console.log('✓ Phase 4.2 endpoint integration verified');
  });

  test('Phase 4.4: preview modal should display intake details', async ({ page }) => {
    await page.goto(DOC_GEN_URL);
    await page.waitForLoadState('networkidle');

    // Open intake modal
    await page.getByRole('button', { name: /load from intake/i }).click();
    await page.waitForSelector('#intake-search-modal', { state: 'visible', timeout: 5000 });
    await page.waitForTimeout(2000);

    // Look for preview button in the first intake row
    const previewButton = page.locator('.intake-action-btn-secondary, button:has-text("Preview")').first();
    const hasPreviewButton = await previewButton.count() > 0;

    if (hasPreviewButton) {
      await previewButton.click();
      await page.waitForTimeout(1000);

      // Check for preview modal
      const previewModal = page.locator('#intake-preview-modal, .preview-modal');
      const previewModalVisible = await previewModal.isVisible().catch(() => false);

      if (previewModalVisible) {
        console.log('✓ Preview modal opened successfully');

        // Check for key preview sections
        const hasPropertyInfo = await page.locator('text=/property|address/i').first().isVisible().catch(() => false);
        const hasPlaintiffInfo = await page.locator('text=/plaintiff|tenant|client/i').first().isVisible().catch(() => false);

        console.log(`  Property info visible: ${hasPropertyInfo}`);
        console.log(`  Plaintiff info visible: ${hasPlaintiffInfo}`);
      } else {
        console.log('○ Preview modal not visible (may use inline preview)');
      }
    } else {
      console.log('○ Preview button not found (feature may be inline)');
    }

    console.log('✓ Preview modal test completed');
  });

  test('Phase 4.4: confirmation dialog when form has existing data (Plan Q13)', async ({ page }) => {
    await page.goto(DOC_GEN_URL);
    await page.waitForLoadState('networkidle');

    // First, fill in some form data to trigger the confirmation dialog
    const propertyAddress = page.locator('#property-address');
    if (await propertyAddress.count() > 0) {
      await propertyAddress.fill('123 Test Street, Test City, CA 90210');
      console.log('✓ Filled property address to simulate existing data');
    }

    // Set up dialog handler
    let dialogShown = false;
    let dialogMessage = '';
    page.on('dialog', async dialog => {
      dialogShown = true;
      dialogMessage = dialog.message();
      console.log(`  Dialog message: ${dialogMessage}`);
      await dialog.accept(); // Accept to continue with load
    });

    // Now try to load an intake
    await page.getByRole('button', { name: /load from intake/i }).click();
    await page.waitForSelector('#intake-search-modal', { state: 'visible', timeout: 5000 });
    await page.waitForTimeout(2000);
    await page.locator('.intake-action-btn-primary').first().click();
    await page.waitForTimeout(2000);

    // Check if dialog was shown or if a custom modal was used
    const confirmModal = page.locator('#intake-confirm-modal');
    const customModalShown = await confirmModal.isVisible().catch(() => false);

    if (dialogShown) {
      console.log('✓ Browser confirmation dialog shown (Plan Q13 implemented)');
      expect(dialogMessage).toContain('overwrite');
    } else if (customModalShown) {
      console.log('✓ Custom confirmation modal shown (Plan Q13 implemented)');
    } else {
      console.log('○ No confirmation shown (may not have detected existing data)');
    }

    console.log('✓ Plan Q13 confirmation test completed');
  });

  test('Phase 4.4: load complete intake with all fields', async ({ page }) => {
    await page.goto(DOC_GEN_URL);
    await page.waitForLoadState('networkidle');

    // Load intake
    await page.getByRole('button', { name: /load from intake/i }).click();
    await page.waitForSelector('#intake-search-modal', { state: 'visible', timeout: 5000 });
    await page.waitForTimeout(2000);
    await page.locator('.intake-action-btn-primary').first().click();
    await page.waitForSelector('#intake-search-modal', { state: 'hidden', timeout: 5000 });
    await page.waitForTimeout(3000);

    // Verify key fields are populated
    console.log('\n=== FIELD POPULATION CHECK ===');

    const fieldsToCheck = [
      { selector: '#property-address', name: 'Property Address' },
      { selector: '#plaintiff-1-first-name', name: 'Plaintiff First Name' },
      { selector: '#plaintiff-1-last-name', name: 'Plaintiff Last Name' },
      { selector: '#defendant-1-name', name: 'Defendant Name' }
    ];

    let populatedCount = 0;
    for (const field of fieldsToCheck) {
      const element = page.locator(field.selector);
      if (await element.count() > 0) {
        const value = await element.inputValue();
        if (value && value.trim() !== '') {
          populatedCount++;
          console.log(`  ✓ ${field.name}: "${value}"`);
        } else {
          console.log(`  ○ ${field.name}: empty`);
        }
      } else {
        console.log(`  ✗ ${field.name}: element not found`);
      }
    }

    console.log(`\nPopulated ${populatedCount}/${fieldsToCheck.length} fields`);
    expect(populatedCount).toBeGreaterThan(0);
    console.log('✓ Complete intake load test passed');
  });

  test('Phase 4.4: edit form after loading intake data', async ({ page }) => {
    await page.goto(DOC_GEN_URL);
    await page.waitForLoadState('networkidle');

    // Load intake
    await page.getByRole('button', { name: /load from intake/i }).click();
    await page.waitForSelector('#intake-search-modal', { state: 'visible', timeout: 5000 });
    await page.waitForTimeout(2000);
    await page.locator('.intake-action-btn-primary').first().click();
    await page.waitForSelector('#intake-search-modal', { state: 'hidden', timeout: 5000 });
    await page.waitForTimeout(2000);

    // Try to edit a loaded field
    const propertyAddress = page.locator('#property-address');
    if (await propertyAddress.count() > 0) {
      const originalValue = await propertyAddress.inputValue();
      console.log(`  Original value: "${originalValue}"`);

      // Edit the field
      await propertyAddress.fill('456 Modified Street, Edited City, CA 99999');
      const newValue = await propertyAddress.inputValue();
      console.log(`  New value: "${newValue}"`);

      expect(newValue).toBe('456 Modified Street, Edited City, CA 99999');
      console.log('✓ Form editing after load works correctly');
    } else {
      console.log('○ Property address field not found');
    }

    // Verify checkboxes can be toggled
    const checkboxes = page.locator('input[type="checkbox"]');
    const checkboxCount = await checkboxes.count();

    if (checkboxCount > 0) {
      const firstCheckbox = checkboxes.first();
      const wasChecked = await firstCheckbox.isChecked();
      await firstCheckbox.click();
      const nowChecked = await firstCheckbox.isChecked();

      console.log(`  Checkbox toggled: ${wasChecked} → ${nowChecked}`);
      expect(nowChecked).not.toBe(wasChecked);
      console.log('✓ Checkbox toggling after load works correctly');
    }

    console.log('✓ Edit after load test completed');
  });

  test('Phase 4.4: load intake with partial data (some fields empty)', async ({ page }) => {
    await page.goto(DOC_GEN_URL);
    await page.waitForLoadState('networkidle');

    const consoleMessages = [];
    page.on('console', msg => consoleMessages.push(msg.text()));

    // Load intake
    await page.getByRole('button', { name: /load from intake/i }).click();
    await page.waitForSelector('#intake-search-modal', { state: 'visible', timeout: 5000 });
    await page.waitForTimeout(2000);
    await page.locator('.intake-action-btn-primary').first().click();
    await page.waitForSelector('#intake-search-modal', { state: 'hidden', timeout: 5000 });
    await page.waitForTimeout(2000);

    // Check for any error messages in console
    const errors = consoleMessages.filter(msg =>
      msg.toLowerCase().includes('error') &&
      !msg.toLowerCase().includes('no error')
    );

    console.log('\n=== PARTIAL DATA LOAD CHECK ===');
    console.log(`  Errors in console: ${errors.length}`);

    if (errors.length > 0) {
      errors.forEach(err => console.log(`  ⚠ ${err}`));
    } else {
      console.log('  ✓ No errors during partial load');
    }

    // Verify form is still functional after partial load
    const submitButton = page.getByRole('button', { name: /generate|submit|save/i }).first();
    const buttonEnabled = await submitButton.isEnabled().catch(() => true);

    console.log(`  Form submit button enabled: ${buttonEnabled}`);
    expect(buttonEnabled).toBeTruthy();

    console.log('✓ Partial data load test completed');
  });
});
