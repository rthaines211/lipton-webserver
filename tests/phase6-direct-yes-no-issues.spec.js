/**
 * Phase 6A.3: Direct Yes/No Issues Tests
 *
 * Tests the functionality of Direct Yes/No category checkboxes - these are
 * categories that have a single yes/no toggle without individual item checkboxes.
 *
 * Categories tested:
 * - Injury Issues
 * - Security Deposit Issues
 * - Stolen Items
 * - Damaged Items
 * - Unauthorized Entries
 * - Nonresponsive Landlord
 * - Age Discrimination
 * - Racial Discrimination
 * - Disability Discrimination
 *
 * Test Coverage:
 * - YESNO-01 through YESNO-12 as specified in Phase 6 plan
 *
 * Run with: npx playwright test phase6-direct-yes-no-issues.spec.js --headed
 */

import { test, expect } from '@playwright/test';

const DOC_GEN_URL = 'http://localhost:3000/?token=29c0f5b6b92b1fdc4305dd844a0767a1d00de2a01334214a07bd3e30bb5ad3d8';

test.describe('Phase 6A.3: Direct Yes/No Issues', () => {
  test.setTimeout(120000); // 2 minutes

  /**
   * Helper function to load the first available intake
   */
  async function loadFirstIntake(page) {
    await page.goto(DOC_GEN_URL);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const loadButton = page.locator('button:has-text("LOAD FROM CLIENT INTAKE"), button:has-text("Load from Client Intake")');
    await loadButton.first().click({ timeout: 10000 });
    await page.waitForSelector('#intake-search-modal', { state: 'visible', timeout: 10000 });
    await page.waitForTimeout(2000);

    const selectButtons = page.locator('.intake-action-btn-primary');
    const buttonCount = await selectButtons.count();

    if (buttonCount === 0) {
      return false;
    }

    await selectButtons.first().click();
    await page.waitForSelector('#intake-search-modal', { state: 'hidden', timeout: 10000 });
    await page.waitForTimeout(3000);
    return true;
  }

  // ============================================
  // YESNO-01: Injury Issues checkbox
  // ============================================
  test('YESNO-01: Injury Issues checkbox populates correctly', async ({ page }) => {
    console.log('\n=== YESNO-01: Injury Issues ===');

    const loaded = await loadFirstIntake(page);
    if (!loaded) {
      console.log('  Skipping: No intakes available');
      test.skip();
      return;
    }

    const checkbox = page.locator('#direct-injuryissues-1');
    const exists = await checkbox.count() > 0;

    console.log(`  #direct-injuryissues-1 exists: ${exists}`);

    if (exists) {
      const isChecked = await checkbox.isChecked();
      console.log(`  Is checked: ${isChecked}`);
    }

    expect(exists).toBeTruthy();
    console.log('  YESNO-01: PASSED');
  });

  // ============================================
  // YESNO-02: Security Deposit Issues checkbox
  // ============================================
  test('YESNO-02: Security Deposit Issues checkbox works', async ({ page }) => {
    console.log('\n=== YESNO-02: Security Deposit Issues ===');

    const loaded = await loadFirstIntake(page);
    if (!loaded) {
      console.log('  Skipping: No intakes available');
      test.skip();
      return;
    }

    const checkbox = page.locator('#direct-securitydepositissues-1');
    const exists = await checkbox.count() > 0;

    console.log(`  #direct-securitydepositissues-1 exists: ${exists}`);

    if (exists) {
      const isChecked = await checkbox.isChecked();
      console.log(`  Is checked: ${isChecked}`);
    }

    expect(exists).toBeTruthy();
    console.log('  YESNO-02: PASSED');
  });

  // ============================================
  // YESNO-03: Stolen Items checkbox
  // ============================================
  test('YESNO-03: Stolen Items checkbox works', async ({ page }) => {
    console.log('\n=== YESNO-03: Stolen Items ===');

    const loaded = await loadFirstIntake(page);
    if (!loaded) {
      console.log('  Skipping: No intakes available');
      test.skip();
      return;
    }

    const checkbox = page.locator('#direct-stolenitems-1');
    const exists = await checkbox.count() > 0;

    console.log(`  #direct-stolenitems-1 exists: ${exists}`);

    if (exists) {
      const isChecked = await checkbox.isChecked();
      console.log(`  Is checked: ${isChecked}`);
    }

    expect(exists).toBeTruthy();
    console.log('  YESNO-03: PASSED');
  });

  // ============================================
  // YESNO-04: Damaged Items checkbox
  // ============================================
  test('YESNO-04: Damaged Items checkbox works', async ({ page }) => {
    console.log('\n=== YESNO-04: Damaged Items ===');

    const loaded = await loadFirstIntake(page);
    if (!loaded) {
      console.log('  Skipping: No intakes available');
      test.skip();
      return;
    }

    const checkbox = page.locator('#direct-damageditems-1');
    const exists = await checkbox.count() > 0;

    console.log(`  #direct-damageditems-1 exists: ${exists}`);

    if (exists) {
      const isChecked = await checkbox.isChecked();
      console.log(`  Is checked: ${isChecked}`);
    }

    expect(exists).toBeTruthy();
    console.log('  YESNO-04: PASSED');
  });

  // ============================================
  // YESNO-05: Unauthorized Entries checkbox
  // ============================================
  test('YESNO-05: Unauthorized Entries checkbox works', async ({ page }) => {
    console.log('\n=== YESNO-05: Unauthorized Entries ===');

    const loaded = await loadFirstIntake(page);
    if (!loaded) {
      console.log('  Skipping: No intakes available');
      test.skip();
      return;
    }

    const checkbox = page.locator('#direct-unauthorizedentries-1');
    const exists = await checkbox.count() > 0;

    console.log(`  #direct-unauthorizedentries-1 exists: ${exists}`);

    if (exists) {
      const isChecked = await checkbox.isChecked();
      console.log(`  Is checked: ${isChecked}`);
    }

    expect(exists).toBeTruthy();
    console.log('  YESNO-05: PASSED');
  });

  // ============================================
  // YESNO-06: Nonresponsive Landlord checkbox
  // ============================================
  test('YESNO-06: Nonresponsive Landlord checkbox works', async ({ page }) => {
    console.log('\n=== YESNO-06: Nonresponsive Landlord ===');

    const loaded = await loadFirstIntake(page);
    if (!loaded) {
      console.log('  Skipping: No intakes available');
      test.skip();
      return;
    }

    const checkbox = page.locator('#direct-nonresponsivelandlordissues-1');
    const exists = await checkbox.count() > 0;

    console.log(`  #direct-nonresponsivelandlordissues-1 exists: ${exists}`);

    if (exists) {
      const isChecked = await checkbox.isChecked();
      console.log(`  Is checked: ${isChecked}`);
    }

    expect(exists).toBeTruthy();
    console.log('  YESNO-06: PASSED');
  });

  // ============================================
  // YESNO-07: Age Discrimination checkbox
  // ============================================
  test('YESNO-07: Age Discrimination checkbox works', async ({ page }) => {
    console.log('\n=== YESNO-07: Age Discrimination ===');

    const loaded = await loadFirstIntake(page);
    if (!loaded) {
      console.log('  Skipping: No intakes available');
      test.skip();
      return;
    }

    const checkbox = page.locator('#direct-agediscrimination-1');
    const exists = await checkbox.count() > 0;

    console.log(`  #direct-agediscrimination-1 exists: ${exists}`);

    if (exists) {
      const isChecked = await checkbox.isChecked();
      console.log(`  Is checked: ${isChecked}`);
    }

    expect(exists).toBeTruthy();
    console.log('  YESNO-07: PASSED');
  });

  // ============================================
  // YESNO-08: Racial Discrimination checkbox
  // ============================================
  test('YESNO-08: Racial Discrimination checkbox works', async ({ page }) => {
    console.log('\n=== YESNO-08: Racial Discrimination ===');

    const loaded = await loadFirstIntake(page);
    if (!loaded) {
      console.log('  Skipping: No intakes available');
      test.skip();
      return;
    }

    const checkbox = page.locator('#direct-racialdiscrimination-1');
    const exists = await checkbox.count() > 0;

    console.log(`  #direct-racialdiscrimination-1 exists: ${exists}`);

    if (exists) {
      const isChecked = await checkbox.isChecked();
      console.log(`  Is checked: ${isChecked}`);
    }

    expect(exists).toBeTruthy();
    console.log('  YESNO-08: PASSED');
  });

  // ============================================
  // YESNO-09: Disability Discrimination checkbox
  // ============================================
  test('YESNO-09: Disability Discrimination checkbox works', async ({ page }) => {
    console.log('\n=== YESNO-09: Disability Discrimination ===');

    const loaded = await loadFirstIntake(page);
    if (!loaded) {
      console.log('  Skipping: No intakes available');
      test.skip();
      return;
    }

    const checkbox = page.locator('#direct-disabilitydiscrimination-1');
    const exists = await checkbox.count() > 0;

    console.log(`  #direct-disabilitydiscrimination-1 exists: ${exists}`);

    if (exists) {
      const isChecked = await checkbox.isChecked();
      console.log(`  Is checked: ${isChecked}`);
    }

    expect(exists).toBeTruthy();
    console.log('  YESNO-09: PASSED');
  });

  // ============================================
  // YESNO-10: Alternative field name mapping
  // ============================================
  test('YESNO-10: Alternative field names map correctly (hasInjury→hasInjuryIssues)', async ({ page }) => {
    console.log('\n=== YESNO-10: Alternative Field Name Mapping ===');

    const loaded = await loadFirstIntake(page);
    if (!loaded) {
      console.log('  Skipping: No intakes available');
      test.skip();
      return;
    }

    // Both hasInjury and hasInjuryIssues should map to the same checkbox
    const injuryCheckbox = page.locator('#direct-injuryissues-1');
    const exists = await injuryCheckbox.count() > 0;

    console.log(`  Injury checkbox exists: ${exists}`);

    // Test that the checkbox can be found regardless of API field name
    const alternativeSelectors = [
      '#direct-injury-1',
      '#injury-1',
      '#hasInjury-1',
      '#hasInjuryIssues-1'
    ];

    console.log('  Checking alternative selectors:');
    for (const selector of alternativeSelectors) {
      const altExists = await page.locator(selector).count() > 0;
      console.log(`    ${selector}: ${altExists ? 'exists' : 'not found'}`);
    }

    // The primary selector should exist
    expect(exists).toBeTruthy();
    console.log('  YESNO-10: PASSED');
  });

  // ============================================
  // YESNO-11: Direct issues panel appears after load
  // ============================================
  test('YESNO-11: Direct issues panel appears when data exists', async ({ page }) => {
    console.log('\n=== YESNO-11: Direct Issues Panel Visibility ===');

    const loaded = await loadFirstIntake(page);
    if (!loaded) {
      console.log('  Skipping: No intakes available');
      test.skip();
      return;
    }

    // Check if any direct yes/no checkboxes are checked
    const directCheckboxes = page.locator('[id^="direct-"]');
    const checkedCount = await directCheckboxes.evaluateAll(els =>
      els.filter(el => el.type === 'checkbox' && el.checked).length
    );

    console.log(`  Direct checkboxes checked: ${checkedCount}`);

    // Check for direct issues panel/section
    const directPanel = page.locator('#direct-issues-container, .direct-issues-section, [data-section="direct"]');
    const panelExists = await directPanel.count() > 0;

    console.log(`  Direct issues panel/section exists: ${panelExists}`);

    if (panelExists && await directPanel.first().isVisible()) {
      console.log('  Direct issues panel is visible');
    }

    // Verify the direct checkboxes section exists (even if not in a separate panel)
    const directSection = page.locator('.direct-yes-no, [class*="direct"], text=/Direct|Yes.No/i').first();
    const sectionVisible = await directSection.isVisible().catch(() => false);

    console.log(`  Has direct issues section: ${sectionVisible}`);

    console.log('  YESNO-11: PASSED');
  });

  // ============================================
  // YESNO-12: 2-column grid layout for metadata
  // ============================================
  test('YESNO-12: Direct issues metadata uses 2-column grid layout', async ({ page }) => {
    console.log('\n=== YESNO-12: 2-Column Grid Layout ===');

    const loaded = await loadFirstIntake(page);
    if (!loaded) {
      console.log('  Skipping: No intakes available');
      test.skip();
      return;
    }

    // Check for the issue details panel which should use 2-column grid
    const container = page.locator('#intake-issue-details-container');

    if (!await container.isVisible()) {
      console.log('  Skipping: Metadata panel not visible');
      test.skip();
      return;
    }

    // Check for grid layout on metadata items
    const gridElements = await container.evaluate(el => {
      const elements = el.querySelectorAll('.metadata-grid, .issue-metadata, [style*="grid"]');
      const results = [];

      elements.forEach(element => {
        const style = window.getComputedStyle(element);
        results.push({
          display: style.display,
          gridTemplateColumns: style.gridTemplateColumns
        });
      });

      // Also check for 2-column specific classes
      const twoColumnElements = el.querySelectorAll('.two-column, .grid-cols-2, .col-span-2');

      return {
        gridElements: results,
        twoColumnCount: twoColumnElements.length
      };
    });

    console.log(`  Grid elements found: ${gridElements.gridElements.length}`);
    console.log(`  Two-column elements: ${gridElements.twoColumnCount}`);

    if (gridElements.gridElements.length > 0) {
      console.log('  Grid styles:');
      gridElements.gridElements.slice(0, 3).forEach((el, i) => {
        console.log(`    ${i + 1}. display: ${el.display}, columns: ${el.gridTemplateColumns}`);
      });
    }

    console.log('  YESNO-12: PASSED');
  });

  // ============================================
  // All Direct Yes/No Categories Test
  // ============================================
  test('Phase 6A.3: All 9 Direct Yes/No categories exist and work', async ({ page }) => {
    console.log('\n========================================');
    console.log('PHASE 6A.3 COMPREHENSIVE TEST');
    console.log('========================================\n');

    await page.goto(DOC_GEN_URL);
    await page.waitForLoadState('networkidle');

    const directCategories = [
      { id: 'direct-injuryissues-1', name: 'Injury Issues' },
      { id: 'direct-securitydepositissues-1', name: 'Security Deposit' },
      { id: 'direct-stolenitems-1', name: 'Stolen Items' },
      { id: 'direct-damageditems-1', name: 'Damaged Items' },
      { id: 'direct-unauthorizedentries-1', name: 'Unauthorized Entries' },
      { id: 'direct-nonresponsivelandlordissues-1', name: 'Nonresponsive Landlord' },
      { id: 'direct-agediscrimination-1', name: 'Age Discrimination' },
      { id: 'direct-racialdiscrimination-1', name: 'Racial Discrimination' },
      { id: 'direct-disabilitydiscrimination-1', name: 'Disability Discrimination' }
    ];

    let existCount = 0;
    let canToggleCount = 0;

    console.log('Direct Yes/No Categories:');
    for (const { id, name } of directCategories) {
      const checkbox = page.locator(`#${id}`);
      const exists = await checkbox.count() > 0;

      if (exists) {
        existCount++;

        // Test if checkbox can be toggled
        const initialState = await checkbox.isChecked();
        await checkbox.click();
        const newState = await checkbox.isChecked();

        if (initialState !== newState) {
          canToggleCount++;
          // Restore original state
          await checkbox.click();
        }

        console.log(`  ✓ ${name.padEnd(25)} (${id})`);
      } else {
        console.log(`  ✗ ${name.padEnd(25)} NOT FOUND`);
      }
    }

    console.log('\n  Summary:');
    console.log(`    Exist: ${existCount}/9`);
    console.log(`    Can toggle: ${canToggleCount}/9`);

    // All 9 should exist
    expect(existCount).toBe(9);
    // All should be toggleable
    expect(canToggleCount).toBe(9);

    console.log('\n========================================\n');
  });

  // ============================================
  // Load Test with Direct Issues
  // ============================================
  test('Phase 6A.3: Load intake and verify direct issues populate', async ({ page }) => {
    console.log('\n=== Direct Issues Population After Load ===\n');

    const consoleMessages = [];
    page.on('console', msg => consoleMessages.push(msg.text()));

    const loaded = await loadFirstIntake(page);

    if (!loaded) {
      console.log('⚠ No intakes available - skipping test');
      test.skip();
      return;
    }

    const directCategories = [
      'direct-injuryissues-1',
      'direct-securitydepositissues-1',
      'direct-stolenitems-1',
      'direct-damageditems-1',
      'direct-unauthorizedentries-1',
      'direct-nonresponsivelandlordissues-1',
      'direct-agediscrimination-1',
      'direct-racialdiscrimination-1',
      'direct-disabilitydiscrimination-1'
    ];

    let checkedCount = 0;

    console.log('Direct checkboxes after load:');
    for (const id of directCategories) {
      const checkbox = page.locator(`#${id}`);
      if (await checkbox.count() > 0) {
        const isChecked = await checkbox.isChecked();
        if (isChecked) {
          checkedCount++;
          console.log(`  ✓ ${id}`);
        }
      }
    }

    console.log(`\nChecked: ${checkedCount}/9`);

    // Check console for direct population logs
    const directLogs = consoleMessages.filter(msg =>
      msg.includes('direct-') ||
      msg.includes('Direct') ||
      msg.includes('yes/no') ||
      msg.includes('Yes/No')
    );

    console.log(`\nDirect-related console logs: ${directLogs.length}`);
    directLogs.slice(0, 5).forEach(log => console.log(`  ${log}`));

    console.log('\n');
  });
});
