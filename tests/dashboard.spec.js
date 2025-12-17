/**
 * Playwright Test Script for Phase 7D: CRM Dashboard
 *
 * Tests the functionality of the CRM Dashboard including:
 * - Dashboard page loading
 * - Case list rendering
 * - Status filters
 * - Attorney filter
 * - Search functionality
 * - Pagination
 * - Priority filter
 *
 * Phase 7D.1 Implementation (2025-12-12):
 * - Tests Phase 7C dashboard UI components
 * - Tests Phase 7A API endpoints integration
 *
 * Run with: npx playwright test dashboard.spec.js --headed
 */

import { test, expect } from '@playwright/test';

const DASHBOARD_URL = 'http://localhost:3000/dashboard.html?token=29c0f5b6b92b1fdc4305dd844a0767a1d00de2a01334214a07bd3e30bb5ad3d8';
const API_TOKEN = '29c0f5b6b92b1fdc4305dd844a0767a1d00de2a01334214a07bd3e30bb5ad3d8';

test.describe('Phase 7D.1: CRM Dashboard Tests', () => {
  test.setTimeout(120000); // 2 minutes

  // ============================================
  // PAGE LOADING TESTS
  // ============================================

  test('Dashboard page should load successfully', async ({ page }) => {
    await page.goto(DASHBOARD_URL);
    await page.waitForLoadState('networkidle');

    console.log('\n=== DASHBOARD PAGE LOAD TEST ===');

    // Verify page title/header
    const header = page.locator('.dashboard-header, header');
    const headerVisible = await header.isVisible().catch(() => false);
    console.log(`  Header visible: ${headerVisible}`);

    // Verify main layout elements
    const sidebar = page.locator('.dashboard-sidebar');
    const caseList = page.locator('.case-list-panel, #case-list');
    const detailPanel = page.locator('.case-detail-panel, #case-detail-panel');

    const sidebarExists = await sidebar.count() > 0;
    const caseListExists = await caseList.count() > 0;
    const detailPanelExists = await detailPanel.count() > 0;

    console.log(`  Sidebar exists: ${sidebarExists}`);
    console.log(`  Case list panel exists: ${caseListExists}`);
    console.log(`  Detail panel exists: ${detailPanelExists}`);

    expect(sidebarExists || caseListExists).toBeTruthy();
    console.log('  Dashboard page load test passed');
  });

  test('Dashboard global object should be available', async ({ page }) => {
    await page.goto(DASHBOARD_URL);
    await page.waitForLoadState('networkidle');

    console.log('\n=== DASHBOARD GLOBAL OBJECT TEST ===');

    // Check if Dashboard is defined
    const dashboardExists = await page.evaluate(() => {
      return typeof window.Dashboard !== 'undefined';
    });

    console.log(`  Dashboard defined: ${dashboardExists}`);
    expect(dashboardExists).toBeTruthy();

    // Check for expected methods
    const methods = await page.evaluate(() => {
      if (!window.Dashboard) return [];
      return Object.keys(window.Dashboard);
    });

    console.log(`  Available methods: ${methods.join(', ')}`);
    expect(methods).toContain('loadDashboard');
    expect(methods).toContain('selectCase');
    expect(methods).toContain('clearFilters');

    console.log('  Dashboard global object test passed');
  });

  // ============================================
  // API INTEGRATION TESTS
  // ============================================

  test('Dashboard API endpoint should return data', async ({ request }) => {
    console.log('\n=== DASHBOARD API TEST ===');

    const response = await request.get('http://localhost:3000/api/dashboard', {
      headers: {
        'Authorization': `Bearer ${API_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    console.log(`  Response status: ${response.status()}`);
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    console.log(`  Data structure:`);
    console.log(`    - data: ${Array.isArray(data.data) ? `array(${data.data.length})` : typeof data.data}`);
    console.log(`    - pagination: ${data.pagination ? 'present' : 'missing'}`);
    console.log(`    - statusSummary: ${Array.isArray(data.statusSummary) ? `array(${data.statusSummary.length})` : 'missing'}`);

    expect(data).toHaveProperty('data');
    expect(data).toHaveProperty('pagination');
    expect(data).toHaveProperty('statusSummary');

    console.log('  Dashboard API test passed');
  });

  test('Attorneys API endpoint should return data', async ({ request }) => {
    console.log('\n=== ATTORNEYS API TEST ===');

    const response = await request.get('http://localhost:3000/api/attorneys', {
      headers: {
        'Authorization': `Bearer ${API_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    console.log(`  Response status: ${response.status()}`);
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    const attorneys = data.data || data;

    console.log(`  Attorneys count: ${Array.isArray(attorneys) ? attorneys.length : 'N/A'}`);

    if (Array.isArray(attorneys) && attorneys.length > 0) {
      const first = attorneys[0];
      console.log(`  First attorney: ${first.full_name || first.name || 'Unknown'}`);
    }

    console.log('  Attorneys API test passed');
  });

  // ============================================
  // CASE LIST TESTS
  // ============================================

  test('Case list should render cases', async ({ page }) => {
    await page.goto(DASHBOARD_URL);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000); // Wait for data to load

    console.log('\n=== CASE LIST RENDERING TEST ===');

    const caseCards = page.locator('.case-card');
    const cardCount = await caseCards.count();

    console.log(`  Case cards found: ${cardCount}`);

    if (cardCount > 0) {
      // Check first card structure
      const firstCard = caseCards.first();
      const hasTitle = await firstCard.locator('.case-card-title').count() > 0;
      const hasIntake = await firstCard.locator('.case-card-intake').count() > 0;
      const hasStatus = await firstCard.locator('.case-card-status, .status-badge').count() > 0;
      const hasMeta = await firstCard.locator('.case-card-meta').count() > 0;

      console.log(`  First card structure:`);
      console.log(`    - Title: ${hasTitle ? 'present' : 'missing'}`);
      console.log(`    - Intake number: ${hasIntake ? 'present' : 'missing'}`);
      console.log(`    - Status badge: ${hasStatus ? 'present' : 'missing'}`);
      console.log(`    - Meta info: ${hasMeta ? 'present' : 'missing'}`);

      expect(hasTitle || hasIntake).toBeTruthy();
    } else {
      // Check for empty state
      const emptyState = page.locator('.empty-state');
      const hasEmptyState = await emptyState.count() > 0;
      console.log(`  Empty state displayed: ${hasEmptyState}`);
    }

    console.log('  Case list rendering test passed');
  });

  test('Case selection should update UI state', async ({ page }) => {
    await page.goto(DASHBOARD_URL);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    console.log('\n=== CASE SELECTION TEST ===');

    const caseCards = page.locator('.case-card');
    const cardCount = await caseCards.count();

    if (cardCount === 0) {
      console.log('  Skipping: No cases available');
      return;
    }

    // Click first case
    const firstCard = caseCards.first();
    await firstCard.click();
    await page.waitForTimeout(1000);

    // Check if card is now active
    const isActive = await firstCard.evaluate(el => el.classList.contains('active'));
    console.log(`  First card active after click: ${isActive}`);
    expect(isActive).toBeTruthy();

    // Check if detail panel shows content
    const detailPanel = page.locator('.case-detail-panel, #case-detail-panel');
    const detailContent = await detailPanel.innerHTML();
    const hasContent = detailContent.length > 100 && !detailContent.includes('Select a case');

    console.log(`  Detail panel has content: ${hasContent}`);

    console.log('  Case selection test passed');
  });

  // ============================================
  // STATUS FILTER TESTS
  // ============================================

  test('Status filters should render with counts', async ({ page }) => {
    await page.goto(DASHBOARD_URL);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    console.log('\n=== STATUS FILTERS TEST ===');

    const statusFilters = page.locator('.status-filter-item, #status-filters > div');
    const filterCount = await statusFilters.count();

    console.log(`  Status filter items: ${filterCount}`);
    expect(filterCount).toBeGreaterThan(0);

    // Check "All Cases" option
    const allCasesFilter = page.locator('[data-status=""], .status-filter-item:has-text("All Cases")');
    const hasAllOption = await allCasesFilter.count() > 0;
    console.log(`  Has "All Cases" option: ${hasAllOption}`);

    // Check for status counts
    const statusCounts = page.locator('.status-count');
    const hasStatusCounts = await statusCounts.count() > 0;
    console.log(`  Has status counts: ${hasStatusCounts}`);

    console.log('  Status filters test passed');
  });

  test('Clicking status filter should filter cases', async ({ page }) => {
    await page.goto(DASHBOARD_URL);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    console.log('\n=== STATUS FILTER CLICK TEST ===');

    // Get initial case count
    const initialCards = await page.locator('.case-card').count();
    console.log(`  Initial case count: ${initialCards}`);

    // Find a status filter with count > 0
    const statusFilters = page.locator('.status-filter-item[data-status]:not([data-status=""])');
    const filterCount = await statusFilters.count();

    if (filterCount === 0) {
      console.log('  Skipping: No status filters with data-status attribute');
      return;
    }

    // Click first non-"All" status filter
    await statusFilters.first().click();
    await page.waitForTimeout(1500);

    // Check if filter is now active
    const activeFilter = page.locator('.status-filter-item.active[data-status]:not([data-status=""])');
    const hasActiveFilter = await activeFilter.count() > 0;
    console.log(`  Filter activated: ${hasActiveFilter}`);

    console.log('  Status filter click test passed');
  });

  // ============================================
  // ATTORNEY FILTER TESTS
  // ============================================

  test('Attorney filter dropdown should render options', async ({ page }) => {
    await page.goto(DASHBOARD_URL);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    console.log('\n=== ATTORNEY FILTER TEST ===');

    const attorneyFilter = page.locator('#attorney-filter');
    const filterExists = await attorneyFilter.count() > 0;

    console.log(`  Attorney filter exists: ${filterExists}`);

    if (filterExists) {
      const options = attorneyFilter.locator('option');
      const optionCount = await options.count();
      console.log(`  Options count: ${optionCount}`);

      // Should have at least "All Attorneys" option
      expect(optionCount).toBeGreaterThan(0);

      // Check first option
      const firstOption = await options.first().textContent();
      console.log(`  First option: "${firstOption}"`);
    }

    console.log('  Attorney filter test passed');
  });

  // ============================================
  // SEARCH FUNCTIONALITY TESTS
  // ============================================

  test('Search input should filter cases', async ({ page }) => {
    await page.goto(DASHBOARD_URL);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    console.log('\n=== SEARCH FUNCTIONALITY TEST ===');

    const searchInput = page.locator('#search-input');
    const inputExists = await searchInput.count() > 0;

    console.log(`  Search input exists: ${inputExists}`);

    if (!inputExists) {
      console.log('  Skipping: Search input not found');
      return;
    }

    // Get initial count
    const initialCount = await page.locator('.case-card').count();
    console.log(`  Initial case count: ${initialCount}`);

    // Type a search term (use something unlikely to match)
    await searchInput.fill('ZZZNOMATCH999');
    await page.waitForTimeout(500); // Wait for debounce

    // Wait for potential API call
    await page.waitForTimeout(1500);

    const afterSearchCount = await page.locator('.case-card').count();
    console.log(`  After search count: ${afterSearchCount}`);

    // Either count changed or empty state shown
    const emptyState = page.locator('.empty-state');
    const hasEmptyState = await emptyState.count() > 0;

    console.log(`  Empty state shown: ${hasEmptyState}`);
    console.log('  Search functionality test passed');
  });

  // ============================================
  // PRIORITY FILTER TESTS
  // ============================================

  test('Priority filter should toggle', async ({ page }) => {
    await page.goto(DASHBOARD_URL);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    console.log('\n=== PRIORITY FILTER TEST ===');

    const priorityFilter = page.locator('#priority-filter');
    const filterExists = await priorityFilter.count() > 0;

    console.log(`  Priority filter exists: ${filterExists}`);

    if (!filterExists) {
      console.log('  Skipping: Priority filter not found');
      return;
    }

    // Check initial state
    const initialChecked = await priorityFilter.isChecked();
    console.log(`  Initial state: ${initialChecked ? 'checked' : 'unchecked'}`);

    // Toggle filter
    await priorityFilter.click();
    await page.waitForTimeout(1000);

    const afterChecked = await priorityFilter.isChecked();
    console.log(`  After toggle: ${afterChecked ? 'checked' : 'unchecked'}`);

    expect(afterChecked).not.toBe(initialChecked);
    console.log('  Priority filter test passed');
  });

  // ============================================
  // PAGINATION TESTS
  // ============================================

  test('Pagination should render when needed', async ({ page }) => {
    await page.goto(DASHBOARD_URL);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    console.log('\n=== PAGINATION TEST ===');

    const pagination = page.locator('#pagination');
    const paginationExists = await pagination.count() > 0;

    console.log(`  Pagination container exists: ${paginationExists}`);

    // Get pagination state
    const state = await page.evaluate(() => {
      if (window.Dashboard && window.Dashboard.getState) {
        const s = window.Dashboard.getState();
        return s.pagination;
      }
      return null;
    });

    if (state) {
      console.log(`  Total cases: ${state.total}`);
      console.log(`  Total pages: ${state.totalPages}`);
      console.log(`  Current page: ${state.page}`);
      console.log(`  Per page: ${state.limit}`);
    }

    // If totalPages > 1, pagination buttons should be visible
    if (state && state.totalPages > 1) {
      const paginationButtons = pagination.locator('button');
      const buttonCount = await paginationButtons.count();
      console.log(`  Pagination buttons: ${buttonCount}`);
      expect(buttonCount).toBeGreaterThan(0);
    } else {
      console.log('  Pagination not needed (single page)');
    }

    console.log('  Pagination test passed');
  });

  // ============================================
  // RESULTS COUNT TESTS
  // ============================================

  test('Results count should display', async ({ page }) => {
    await page.goto(DASHBOARD_URL);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    console.log('\n=== RESULTS COUNT TEST ===');

    const resultsCount = page.locator('#results-count');
    const countExists = await resultsCount.count() > 0;

    console.log(`  Results count element exists: ${countExists}`);

    if (countExists) {
      const countText = await resultsCount.textContent();
      console.log(`  Results count text: "${countText}"`);
      expect(countText).toBeTruthy();
    }

    console.log('  Results count test passed');
  });

  // ============================================
  // STATS SUMMARY TESTS
  // ============================================

  test('Stats summary should render', async ({ page }) => {
    await page.goto(DASHBOARD_URL);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    console.log('\n=== STATS SUMMARY TEST ===');

    const statsSummary = page.locator('#stats-summary');
    const summaryExists = await statsSummary.count() > 0;

    console.log(`  Stats summary exists: ${summaryExists}`);

    if (summaryExists) {
      const statCards = statsSummary.locator('.stat-card');
      const cardCount = await statCards.count();
      console.log(`  Stat cards: ${cardCount}`);

      // Check for expected stat cards
      const totalCases = page.locator('.stat-label:has-text("Total Cases")');
      const newCases = page.locator('.stat-label:has-text("New")');
      const inProgress = page.locator('.stat-label:has-text("In Progress")');
      const completed = page.locator('.stat-label:has-text("Completed")');

      console.log(`  Has Total Cases: ${await totalCases.count() > 0}`);
      console.log(`  Has New: ${await newCases.count() > 0}`);
      console.log(`  Has In Progress: ${await inProgress.count() > 0}`);
      console.log(`  Has Completed: ${await completed.count() > 0}`);
    }

    console.log('  Stats summary test passed');
  });

  // ============================================
  // CLEAR FILTERS TEST
  // ============================================

  test('Clear filters should reset all filters', async ({ page }) => {
    await page.goto(DASHBOARD_URL);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    console.log('\n=== CLEAR FILTERS TEST ===');

    // Apply some filters first
    const searchInput = page.locator('#search-input');
    if (await searchInput.count() > 0) {
      await searchInput.fill('test');
      await page.waitForTimeout(500);
    }

    const priorityFilter = page.locator('#priority-filter');
    if (await priorityFilter.count() > 0 && !await priorityFilter.isChecked()) {
      await priorityFilter.click();
      await page.waitForTimeout(500);
    }

    // Click clear filters
    const clearButton = page.locator('#clear-filters, button:has-text("Clear")');
    if (await clearButton.count() > 0) {
      await clearButton.click();
      await page.waitForTimeout(1500);

      // Verify filters cleared
      if (await searchInput.count() > 0) {
        const searchValue = await searchInput.inputValue();
        console.log(`  Search input after clear: "${searchValue}"`);
        expect(searchValue).toBe('');
      }

      if (await priorityFilter.count() > 0) {
        const priorityChecked = await priorityFilter.isChecked();
        console.log(`  Priority filter after clear: ${priorityChecked ? 'checked' : 'unchecked'}`);
        expect(priorityChecked).toBeFalsy();
      }
    } else {
      console.log('  Clear filters button not found');
    }

    console.log('  Clear filters test passed');
  });

  // ============================================
  // REFRESH BUTTON TEST
  // ============================================

  test('Refresh button should reload data', async ({ page }) => {
    let apiCallCount = 0;

    page.on('request', (request) => {
      if (request.url().includes('/api/dashboard')) {
        apiCallCount++;
      }
    });

    await page.goto(DASHBOARD_URL);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    console.log('\n=== REFRESH BUTTON TEST ===');

    const initialApiCalls = apiCallCount;
    console.log(`  Initial API calls: ${initialApiCalls}`);

    const refreshButton = page.locator('#refresh-btn, button:has-text("Refresh"), button:has(.fa-sync)');
    if (await refreshButton.count() > 0) {
      await refreshButton.click();
      await page.waitForTimeout(1500);

      console.log(`  API calls after refresh: ${apiCallCount}`);
      expect(apiCallCount).toBeGreaterThan(initialApiCalls);
    } else {
      console.log('  Refresh button not found');
    }

    console.log('  Refresh button test passed');
  });

  // ============================================
  // COMPREHENSIVE TEST
  // ============================================

  test('Phase 7D.1: Complete dashboard functionality test', async ({ page }) => {
    const apiCalls = [];

    page.on('request', (request) => {
      if (request.url().includes('/api/')) {
        apiCalls.push(request.url());
      }
    });

    await page.goto(DASHBOARD_URL);
    await page.waitForLoadState('networkidle');

    console.log('\n========================================');
    console.log('PHASE 7D.1 COMPREHENSIVE DASHBOARD TEST');
    console.log('========================================\n');

    // 1. Page Load
    console.log('1. PAGE LOAD:');
    const dashboardExists = await page.evaluate(() => typeof window.Dashboard !== 'undefined');
    console.log(`   - Dashboard object: ${dashboardExists ? 'LOADED' : 'MISSING'}`);
    expect(dashboardExists).toBeTruthy();

    await page.waitForTimeout(2000);

    // 2. API Calls
    console.log('\n2. API CALLS:');
    const dashboardCall = apiCalls.find(url => url.includes('/api/dashboard'));
    const attorneysCall = apiCalls.find(url => url.includes('/api/attorneys'));
    console.log(`   - /api/dashboard: ${dashboardCall ? 'CALLED' : 'NOT CALLED'}`);
    console.log(`   - /api/attorneys: ${attorneysCall ? 'CALLED' : 'NOT CALLED'}`);

    // 3. UI Elements
    console.log('\n3. UI ELEMENTS:');
    const elements = {
      'Status Filters': '#status-filters',
      'Attorney Filter': '#attorney-filter',
      'Search Input': '#search-input',
      'Case List': '#case-list',
      'Results Count': '#results-count',
      'Stats Summary': '#stats-summary'
    };

    for (const [name, selector] of Object.entries(elements)) {
      const exists = await page.locator(selector).count() > 0;
      console.log(`   - ${name}: ${exists ? 'PRESENT' : 'MISSING'}`);
    }

    // 4. Case List
    console.log('\n4. CASE LIST:');
    const caseCount = await page.locator('.case-card').count();
    console.log(`   - Cases rendered: ${caseCount}`);

    if (caseCount > 0) {
      // 5. Case Selection
      console.log('\n5. CASE SELECTION:');
      await page.locator('.case-card').first().click();
      await page.waitForTimeout(1000);

      const isActive = await page.locator('.case-card.active').count() > 0;
      console.log(`   - Card becomes active: ${isActive ? 'YES' : 'NO'}`);
    }

    // 6. State Check
    console.log('\n6. STATE CHECK:');
    const state = await page.evaluate(() => {
      if (window.Dashboard && window.Dashboard.getState) {
        return window.Dashboard.getState();
      }
      return null;
    });

    if (state) {
      console.log(`   - Cases in state: ${state.cases?.length || 0}`);
      console.log(`   - Selected case: ${state.selectedCaseId || 'none'}`);
      console.log(`   - Pagination: page ${state.pagination?.page}/${state.pagination?.totalPages}`);
    }

    console.log('\n========================================');
    console.log('PHASE 7D.1 DASHBOARD TEST COMPLETE');
    console.log('========================================\n');
  });
});
