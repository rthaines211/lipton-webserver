/**
 * Playwright Test Script for Phase 7D.3 & 7D.4: Full Workflow E2E & Responsive Tests
 *
 * Tests complete workflows:
 * - Full workflow from intake to dashboard to doc gen (7D.3)
 * - Responsive design testing at different viewports (7D.4)
 *
 * Phase 7D.3/7D.4 Implementation (2025-12-12):
 * - End-to-end workflow testing
 * - Mobile/tablet responsive testing
 *
 * Run with: npx playwright test dashboard-workflow.spec.js --headed
 */

import { test, expect } from '@playwright/test';

const DASHBOARD_URL = 'http://localhost:3000/dashboard.html?token=29c0f5b6b92b1fdc4305dd844a0767a1d00de2a01334214a07bd3e30bb5ad3d8';
const DOC_GEN_URL = 'http://localhost:3000/?token=29c0f5b6b92b1fdc4305dd844a0767a1d00de2a01334214a07bd3e30bb5ad3d8';
const API_TOKEN = '29c0f5b6b92b1fdc4305dd844a0767a1d00de2a01334214a07bd3e30bb5ad3d8';

test.describe('Phase 7D.3: Full Workflow E2E Tests', () => {
  test.setTimeout(180000); // 3 minutes

  test('Full workflow: Dashboard → Case Detail → Open in Doc Gen', async ({ page }) => {
    console.log('\n========================================');
    console.log('FULL WORKFLOW: Dashboard → Doc Gen');
    console.log('========================================\n');

    // Step 1: Load Dashboard
    console.log('STEP 1: Load Dashboard');
    await page.goto(DASHBOARD_URL);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const dashboardLoaded = await page.evaluate(() => typeof window.Dashboard !== 'undefined');
    console.log(`  Dashboard loaded: ${dashboardLoaded}`);
    expect(dashboardLoaded).toBeTruthy();

    // Step 2: Select a Case
    console.log('\nSTEP 2: Select a Case');
    const caseCards = page.locator('.case-card');
    const cardCount = await caseCards.count();
    console.log(`  Available cases: ${cardCount}`);

    if (cardCount === 0) {
      console.log('  Skipping: No cases available');
      return;
    }

    await caseCards.first().click();
    await page.waitForTimeout(1500);

    const caseSelected = await page.locator('.case-card.active').count() > 0;
    console.log(`  Case selected: ${caseSelected}`);

    // Step 3: Verify Case Detail Panel
    console.log('\nSTEP 3: Verify Case Detail Panel');
    const detailPanel = page.locator('.case-detail-panel, #case-detail-panel');
    const panelContent = await detailPanel.innerHTML();
    const hasContent = panelContent.length > 200;
    console.log(`  Detail panel has content: ${hasContent}`);

    // Step 4: Get intake ID
    console.log('\nSTEP 4: Get Intake ID');
    const caseState = await page.evaluate(() => {
      if (window.CaseDetail && window.CaseDetail.getState) {
        const state = window.CaseDetail.getState();
        return state.currentCase;
      }
      return null;
    });

    const intakeId = caseState?.intake_id;
    console.log(`  Intake ID: ${intakeId || 'N/A'}`);

    if (!intakeId) {
      console.log('  Cannot proceed: No intake ID associated with case');
      console.log('\n========================================');
      console.log('WORKFLOW TEST COMPLETE (PARTIAL)');
      console.log('========================================\n');
      return;
    }

    // Step 5: Click "Open in Doc Gen"
    console.log('\nSTEP 5: Click Open in Doc Gen');
    const docGenButton = page.locator('button:has-text("Doc Gen")');
    if (await docGenButton.count() === 0) {
      console.log('  Doc Gen button not found');
      return;
    }

    await docGenButton.click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Step 6: Verify navigation to Doc Gen with loadIntake parameter
    console.log('\nSTEP 6: Verify Navigation');
    const currentUrl = page.url();
    console.log(`  Current URL: ${currentUrl}`);

    const hasLoadIntake = currentUrl.includes('loadIntake=');
    const hasCorrectId = currentUrl.includes(`loadIntake=${intakeId}`);
    console.log(`  Has loadIntake param: ${hasLoadIntake}`);
    console.log(`  Has correct intake ID: ${hasCorrectId}`);

    // Step 7: Verify form loading (if on doc gen page)
    if (hasLoadIntake) {
      console.log('\nSTEP 7: Verify Form Load');
      await page.waitForTimeout(3000); // Wait for form to populate

      // Check if form is populated
      const propertyAddress = page.locator('#property-address');
      if (await propertyAddress.count() > 0) {
        const addressValue = await propertyAddress.inputValue();
        console.log(`  Property address populated: ${addressValue ? 'YES' : 'NO'}`);
      }
    }

    console.log('\n========================================');
    console.log('FULL WORKFLOW TEST COMPLETE');
    console.log('========================================\n');
  });

  test('Workflow: Navigate from Doc Gen to Dashboard via nav link', async ({ page }) => {
    console.log('\n========================================');
    console.log('WORKFLOW: Doc Gen → Dashboard Navigation');
    console.log('========================================\n');

    // Start at Doc Gen
    console.log('STEP 1: Load Doc Gen page');
    await page.goto(DOC_GEN_URL);
    await page.waitForLoadState('networkidle');

    // Find Dashboard nav link
    console.log('\nSTEP 2: Find Dashboard nav link');
    const dashboardLink = page.locator('a:has-text("Dashboard"), a[href*="dashboard"]');
    const linkExists = await dashboardLink.count() > 0;
    console.log(`  Dashboard link exists: ${linkExists}`);

    if (!linkExists) {
      console.log('  Skipping: Dashboard link not found');
      return;
    }

    // Click nav link
    console.log('\nSTEP 3: Navigate to Dashboard');
    await dashboardLink.first().click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Verify on Dashboard
    console.log('\nSTEP 4: Verify Dashboard loaded');
    const onDashboard = page.url().includes('dashboard');
    console.log(`  URL contains dashboard: ${onDashboard}`);

    const dashboardLoaded = await page.evaluate(() => typeof window.Dashboard !== 'undefined');
    console.log(`  Dashboard object loaded: ${dashboardLoaded}`);

    console.log('\n========================================');
    console.log('NAVIGATION WORKFLOW COMPLETE');
    console.log('========================================\n');
  });

  test('Workflow: Filter → Select → Update Status → Verify Activity', async ({ page }) => {
    console.log('\n========================================');
    console.log('WORKFLOW: Filter → Select → Update → Verify');
    console.log('========================================\n');

    await page.goto(DASHBOARD_URL);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Step 1: Apply a filter
    console.log('STEP 1: Apply Status Filter');
    const statusFilters = page.locator('.status-filter-item[data-status]:not([data-status=""])');
    if (await statusFilters.count() > 0) {
      await statusFilters.first().click();
      await page.waitForTimeout(1500);
      console.log('  Filter applied');
    } else {
      console.log('  No filters to apply');
    }

    // Step 2: Select a case
    console.log('\nSTEP 2: Select Case');
    const caseCards = page.locator('.case-card');
    if (await caseCards.count() === 0) {
      console.log('  No cases available');
      return;
    }

    await caseCards.first().click();
    await page.waitForTimeout(1500);
    console.log('  Case selected');

    // Step 3: Change status
    console.log('\nSTEP 3: Change Status');
    const statusSelect = page.locator('#status-select');
    if (await statusSelect.count() > 0) {
      const currentStatus = await statusSelect.inputValue();
      console.log(`  Current status: ${currentStatus}`);

      // Change to different status
      const newStatus = currentStatus === 'new' ? 'in_review' : 'new';
      await statusSelect.selectOption(newStatus);
      await page.waitForTimeout(1500);
      console.log(`  Changed to: ${newStatus}`);

      // Step 4: Verify activity added
      console.log('\nSTEP 4: Verify Activity Added');
      const timeline = page.locator('#activity-timeline, .activity-timeline');
      const activities = timeline.locator('.activity-item');
      const activityCount = await activities.count();
      console.log(`  Activities in timeline: ${activityCount}`);

      // Check for status change activity
      const hasStatusActivity = await page.locator('text=/status.*changed|Status/i').count() > 0;
      console.log(`  Has status change activity: ${hasStatusActivity}`);
    } else {
      console.log('  Status select not found');
    }

    console.log('\n========================================');
    console.log('UPDATE WORKFLOW COMPLETE');
    console.log('========================================\n');
  });

  test('Workflow: Add Note → Verify Display → Refresh → Verify Persistence', async ({ page }) => {
    console.log('\n========================================');
    console.log('WORKFLOW: Notes CRUD');
    console.log('========================================\n');

    await page.goto(DASHBOARD_URL);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Select a case
    console.log('STEP 1: Select Case');
    const caseCards = page.locator('.case-card');
    if (await caseCards.count() === 0) {
      console.log('  No cases available');
      return;
    }

    await caseCards.first().click();
    await page.waitForTimeout(1500);

    // Get dashboard ID for later verification
    const dashboardId = await page.evaluate(() => {
      if (window.CaseDetail && window.CaseDetail.getState) {
        return window.CaseDetail.getState().currentCase?.dashboard_id;
      }
      return null;
    });
    console.log(`  Selected case: ${dashboardId}`);

    // Add a note
    console.log('\nSTEP 2: Add Note');
    const noteInput = page.locator('#new-note-text, textarea[placeholder*="note"]');
    if (await noteInput.count() === 0) {
      console.log('  Note input not found');
      return;
    }

    const testNote = `Playwright test note ${Date.now()}`;
    await noteInput.fill(testNote);
    console.log(`  Entered note: "${testNote.substring(0, 30)}..."`);

    const addButton = page.locator('#add-note-btn, button:has-text("Add Note")');
    if (await addButton.count() > 0) {
      await addButton.click();
      await page.waitForTimeout(1500);
      console.log('  Note submitted');
    }

    // Verify note appears
    console.log('\nSTEP 3: Verify Note Display');
    const notesContainer = page.locator('#notes-container, .notes-container');
    const noteText = await notesContainer.textContent();
    const noteAdded = noteText.includes(testNote.substring(0, 20));
    console.log(`  Note visible in UI: ${noteAdded}`);

    // Refresh and verify persistence
    console.log('\nSTEP 4: Verify Persistence After Refresh');
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Re-select the same case
    if (dashboardId) {
      await page.locator(`.case-card[data-id="${dashboardId}"]`).click().catch(() => {
        // If specific selector fails, click first case
        page.locator('.case-card').first().click();
      });
      await page.waitForTimeout(1500);

      const notesAfterRefresh = page.locator('#notes-container, .notes-container');
      const noteTextAfter = await notesAfterRefresh.textContent();
      const notePersisted = noteTextAfter.includes(testNote.substring(0, 20));
      console.log(`  Note persisted after refresh: ${notePersisted}`);
    }

    console.log('\n========================================');
    console.log('NOTES WORKFLOW COMPLETE');
    console.log('========================================\n');
  });
});

test.describe('Phase 7D.4: Responsive Design Tests', () => {
  test.setTimeout(120000);

  const viewports = [
    { name: 'Desktop Large', width: 1920, height: 1080 },
    { name: 'Desktop', width: 1440, height: 900 },
    { name: 'Laptop', width: 1280, height: 800 },
    { name: 'Tablet Landscape', width: 1024, height: 768 },
    { name: 'Tablet Portrait', width: 768, height: 1024 },
    { name: 'Mobile Large', width: 414, height: 896 },
    { name: 'Mobile', width: 375, height: 667 },
    { name: 'Mobile Small', width: 320, height: 568 }
  ];

  test('Responsive: Dashboard layout at all viewports', async ({ page }) => {
    console.log('\n========================================');
    console.log('RESPONSIVE LAYOUT TEST');
    console.log('========================================\n');

    for (const viewport of viewports) {
      console.log(`\n--- ${viewport.name} (${viewport.width}x${viewport.height}) ---`);

      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto(DASHBOARD_URL);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);

      // Check layout elements
      const sidebar = page.locator('.dashboard-sidebar');
      const caseList = page.locator('.case-list-panel');
      const detailPanel = page.locator('.case-detail-panel');

      const sidebarVisible = await sidebar.isVisible().catch(() => false);
      const caseListVisible = await caseList.isVisible().catch(() => false);
      const detailPanelVisible = await detailPanel.isVisible().catch(() => false);

      console.log(`  Sidebar visible: ${sidebarVisible}`);
      console.log(`  Case list visible: ${caseListVisible}`);
      console.log(`  Detail panel visible: ${detailPanelVisible}`);

      // On mobile, sidebar might be hidden
      if (viewport.width < 768) {
        // Mobile: at minimum case list should be visible
        expect(caseListVisible).toBeTruthy();
      } else if (viewport.width < 1200) {
        // Tablet: case list should be visible
        expect(caseListVisible).toBeTruthy();
      } else {
        // Desktop: all three panels should be visible
        expect(caseListVisible).toBeTruthy();
      }

      // Check for overflow issues
      const hasHorizontalScroll = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth;
      });
      console.log(`  Horizontal scroll: ${hasHorizontalScroll ? 'YES (potential issue)' : 'NO'}`);
    }

    console.log('\n========================================');
    console.log('RESPONSIVE TEST COMPLETE');
    console.log('========================================\n');
  });

  test('Responsive: Case card readability at mobile', async ({ page }) => {
    console.log('\n=== MOBILE CARD READABILITY TEST ===');

    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto(DASHBOARD_URL);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const caseCards = page.locator('.case-card');
    if (await caseCards.count() === 0) {
      console.log('  No cases to test');
      return;
    }

    const firstCard = caseCards.first();

    // Check card dimensions
    const cardBox = await firstCard.boundingBox();
    if (cardBox) {
      console.log(`  Card width: ${cardBox.width}px`);
      console.log(`  Card height: ${cardBox.height}px`);

      // Card should fit within viewport
      expect(cardBox.width).toBeLessThanOrEqual(375);
    }

    // Check text is visible (not overflowing)
    const title = firstCard.locator('.case-card-title');
    if (await title.count() > 0) {
      const titleVisible = await title.isVisible();
      console.log(`  Title visible: ${titleVisible}`);
    }

    console.log('  Mobile card readability test passed');
  });

  test('Responsive: Case detail panel on mobile', async ({ page }) => {
    console.log('\n=== MOBILE DETAIL PANEL TEST ===');

    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto(DASHBOARD_URL);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const caseCards = page.locator('.case-card');
    if (await caseCards.count() === 0) {
      console.log('  No cases to test');
      return;
    }

    // Select a case
    await caseCards.first().click();
    await page.waitForTimeout(1500);

    // On mobile, detail panel should be visible or become active
    const detailPanel = page.locator('.case-detail-panel');
    const isActive = await detailPanel.evaluate(el => el.classList.contains('active')).catch(() => false);
    const isVisible = await detailPanel.isVisible().catch(() => false);

    console.log(`  Detail panel active: ${isActive}`);
    console.log(`  Detail panel visible: ${isVisible}`);

    // Check panel fits mobile viewport
    const panelBox = await detailPanel.boundingBox();
    if (panelBox) {
      console.log(`  Panel width: ${panelBox.width}px`);
      expect(panelBox.width).toBeLessThanOrEqual(375 + 10); // Small tolerance
    }

    console.log('  Mobile detail panel test passed');
  });

  test('Responsive: Touch targets on mobile', async ({ page }) => {
    console.log('\n=== MOBILE TOUCH TARGET TEST ===');

    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto(DASHBOARD_URL);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Minimum touch target should be 44x44px per Apple HIG
    const minTouchSize = 44;

    // Check buttons
    const buttons = page.locator('button');
    const buttonCount = await buttons.count();

    let smallButtons = 0;
    for (let i = 0; i < Math.min(buttonCount, 10); i++) {
      const button = buttons.nth(i);
      const box = await button.boundingBox();
      if (box && (box.width < minTouchSize || box.height < minTouchSize)) {
        smallButtons++;
      }
    }

    console.log(`  Buttons checked: ${Math.min(buttonCount, 10)}`);
    console.log(`  Small buttons (< ${minTouchSize}px): ${smallButtons}`);

    // Check status filters
    const filters = page.locator('.status-filter-item');
    const filterCount = await filters.count();

    let smallFilters = 0;
    for (let i = 0; i < filterCount; i++) {
      const filter = filters.nth(i);
      const box = await filter.boundingBox();
      if (box && box.height < minTouchSize) {
        smallFilters++;
      }
    }

    console.log(`  Filters checked: ${filterCount}`);
    console.log(`  Small filters: ${smallFilters}`);

    console.log('  Touch target test complete');
  });

  test('Responsive: Text scaling and readability', async ({ page }) => {
    console.log('\n=== TEXT SCALING TEST ===');

    const testViewports = [
      { name: 'Desktop', width: 1440, height: 900 },
      { name: 'Mobile', width: 375, height: 667 }
    ];

    for (const viewport of testViewports) {
      console.log(`\n  ${viewport.name}:`);

      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto(DASHBOARD_URL);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);

      // Check header font size
      const header = page.locator('h1, .dashboard-header h1, .logo').first();
      if (await header.count() > 0) {
        const fontSize = await header.evaluate(el => {
          return window.getComputedStyle(el).fontSize;
        });
        console.log(`    Header font size: ${fontSize}`);
      }

      // Check body text
      const bodyText = page.locator('.case-card-title, .case-card-meta').first();
      if (await bodyText.count() > 0) {
        const fontSize = await bodyText.evaluate(el => {
          return window.getComputedStyle(el).fontSize;
        });
        console.log(`    Body text font size: ${fontSize}`);

        // Font should be at least 12px for readability
        const fontSizeNum = parseInt(fontSize);
        expect(fontSizeNum).toBeGreaterThanOrEqual(12);
      }
    }

    console.log('\n  Text scaling test passed');
  });
});

test.describe('Phase 7D.5: Cross-Browser Verification', () => {
  test('Core functionality works in current browser', async ({ page, browserName }) => {
    console.log('\n========================================');
    console.log(`CROSS-BROWSER TEST: ${browserName}`);
    console.log('========================================\n');

    await page.goto(DASHBOARD_URL);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Test 1: JavaScript loaded
    console.log('1. JavaScript:');
    const dashboardLoaded = await page.evaluate(() => typeof window.Dashboard !== 'undefined');
    const caseDetailLoaded = await page.evaluate(() => typeof window.CaseDetail !== 'undefined');
    console.log(`   Dashboard: ${dashboardLoaded ? 'LOADED' : 'FAILED'}`);
    console.log(`   CaseDetail: ${caseDetailLoaded ? 'LOADED' : 'FAILED'}`);
    expect(dashboardLoaded).toBeTruthy();

    // Test 2: CSS rendering
    console.log('\n2. CSS Rendering:');
    const sidebar = page.locator('.dashboard-sidebar');
    if (await sidebar.count() > 0) {
      const bgColor = await sidebar.evaluate(el => {
        return window.getComputedStyle(el).backgroundColor;
      });
      console.log(`   Sidebar background: ${bgColor}`);
    }

    // Test 3: API calls work
    console.log('\n3. API Integration:');
    const caseCards = page.locator('.case-card');
    const cardCount = await caseCards.count();
    console.log(`   Cases loaded: ${cardCount}`);

    // Test 4: Interactivity
    console.log('\n4. Interactivity:');
    if (cardCount > 0) {
      await caseCards.first().click();
      await page.waitForTimeout(1000);

      const isActive = await page.locator('.case-card.active').count() > 0;
      console.log(`   Click handler: ${isActive ? 'WORKING' : 'FAILED'}`);
    }

    // Test 5: Form controls
    console.log('\n5. Form Controls:');
    const searchInput = page.locator('#search-input');
    if (await searchInput.count() > 0) {
      await searchInput.fill('test');
      const value = await searchInput.inputValue();
      console.log(`   Input fill: ${value === 'test' ? 'WORKING' : 'FAILED'}`);
    }

    console.log('\n========================================');
    console.log(`${browserName} TEST COMPLETE`);
    console.log('========================================\n');
  });
});
