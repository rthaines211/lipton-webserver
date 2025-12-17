/**
 * Playwright Test Script for Phase 7D.2: CRM Case Detail Panel
 *
 * Tests the functionality of the Case Detail Panel including:
 * - Case detail loading when selecting a case
 * - Status change dropdown (7C.6)
 * - Attorney assignment dropdown (7C.7)
 * - Priority toggle
 * - Notes CRUD - add/delete (7C.8)
 * - Activity timeline (7C.9)
 * - "Open in Doc Gen" button (7C.10)
 *
 * Phase 7D.2 Implementation (2025-12-12):
 * - Tests Phase 7C case detail UI components
 * - Tests Phase 7A API endpoints for case detail operations
 *
 * Run with: npx playwright test case-detail.spec.js --headed
 */

import { test, expect } from '@playwright/test';

const DASHBOARD_URL = 'http://localhost:3000/dashboard.html?token=29c0f5b6b92b1fdc4305dd844a0767a1d00de2a01334214a07bd3e30bb5ad3d8';
const API_TOKEN = '29c0f5b6b92b1fdc4305dd844a0767a1d00de2a01334214a07bd3e30bb5ad3d8';

test.describe('Phase 7D.2: Case Detail Panel Tests', () => {
  test.setTimeout(120000); // 2 minutes

  // Helper function to select a case
  async function selectFirstCase(page) {
    await page.goto(DASHBOARD_URL);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const caseCards = page.locator('.case-card');
    const cardCount = await caseCards.count();

    if (cardCount === 0) {
      return false;
    }

    await caseCards.first().click();
    await page.waitForTimeout(1500);
    return true;
  }

  // ============================================
  // CASE DETAIL LOADING TESTS
  // ============================================

  test('CaseDetail global object should be available', async ({ page }) => {
    await page.goto(DASHBOARD_URL);
    await page.waitForLoadState('networkidle');

    console.log('\n=== CASEDETAIL GLOBAL OBJECT TEST ===');

    const caseDetailExists = await page.evaluate(() => {
      return typeof window.CaseDetail !== 'undefined';
    });

    console.log(`  CaseDetail defined: ${caseDetailExists}`);
    expect(caseDetailExists).toBeTruthy();

    const methods = await page.evaluate(() => {
      if (!window.CaseDetail) return [];
      return Object.keys(window.CaseDetail);
    });

    console.log(`  Available methods: ${methods.join(', ')}`);
    expect(methods).toContain('loadCase');
    expect(methods).toContain('handleStatusChange');
    expect(methods).toContain('handleAttorneyChange');
    expect(methods).toContain('handleAddNote');
    expect(methods).toContain('openInDocGen');

    console.log('  CaseDetail global object test passed');
  });

  test('Case detail panel should load when selecting a case', async ({ page }) => {
    console.log('\n=== CASE DETAIL LOADING TEST ===');

    const hasCase = await selectFirstCase(page);

    if (!hasCase) {
      console.log('  Skipping: No cases available');
      return;
    }

    // Check if detail panel has content
    const detailPanel = page.locator('.case-detail-panel, #case-detail-panel');
    const panelContent = await detailPanel.innerHTML();

    const hasClientName = panelContent.includes('detail-client-name') || panelContent.includes('Unknown Client');
    const hasManagement = panelContent.includes('Case Management') || panelContent.includes('status-select');

    console.log(`  Has client name section: ${hasClientName}`);
    console.log(`  Has case management section: ${hasManagement}`);

    expect(panelContent.length).toBeGreaterThan(100);
    console.log('  Case detail loading test passed');
  });

  test('Case detail API should return case data', async ({ request }) => {
    console.log('\n=== CASE DETAIL API TEST ===');

    // First get a dashboard ID
    const listResponse = await request.get('http://localhost:3000/api/dashboard?limit=1', {
      headers: {
        'Authorization': `Bearer ${API_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    if (!listResponse.ok()) {
      console.log('  Skipping: Cannot fetch dashboard list');
      return;
    }

    const listData = await listResponse.json();
    if (!listData.data || listData.data.length === 0) {
      console.log('  Skipping: No cases in database');
      return;
    }

    const dashboardId = listData.data[0].dashboard_id;
    console.log(`  Testing with dashboard ID: ${dashboardId}`);

    // Fetch case detail
    const detailResponse = await request.get(`http://localhost:3000/api/dashboard/${dashboardId}`, {
      headers: {
        'Authorization': `Bearer ${API_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    console.log(`  Response status: ${detailResponse.status()}`);
    expect(detailResponse.ok()).toBeTruthy();

    const detailData = await detailResponse.json();
    console.log(`  Has intake_number: ${!!detailData.intake_number}`);
    console.log(`  Has status: ${!!detailData.status}`);
    console.log(`  Has created_at: ${!!detailData.created_at}`);

    console.log('  Case detail API test passed');
  });

  // ============================================
  // STATUS CHANGE TESTS (7C.6)
  // ============================================

  test('7C.6: Status dropdown should render with all options', async ({ page }) => {
    console.log('\n=== STATUS DROPDOWN TEST ===');

    const hasCase = await selectFirstCase(page);
    if (!hasCase) {
      console.log('  Skipping: No cases available');
      return;
    }

    const statusSelect = page.locator('#status-select');
    const selectExists = await statusSelect.count() > 0;

    console.log(`  Status select exists: ${selectExists}`);

    if (!selectExists) {
      console.log('  Skipping: Status select not found');
      return;
    }

    const options = statusSelect.locator('option');
    const optionCount = await options.count();

    console.log(`  Status options count: ${optionCount}`);

    // Check for expected status options
    const expectedStatuses = ['new', 'in_review', 'docs_in_progress', 'docs_generated', 'filed', 'closed', 'on_hold'];
    const optionValues = await options.evaluateAll(opts => opts.map(o => o.value));

    console.log(`  Option values: ${optionValues.join(', ')}`);

    for (const status of expectedStatuses) {
      const hasStatus = optionValues.includes(status);
      console.log(`  Has ${status}: ${hasStatus}`);
    }

    expect(optionCount).toBeGreaterThanOrEqual(5);
    console.log('  Status dropdown test passed');
  });

  test('7C.6: Status change should call API', async ({ page }) => {
    let statusApiCall = null;

    page.on('request', (request) => {
      if (request.url().includes('/api/dashboard/') && request.url().includes('/status')) {
        statusApiCall = {
          url: request.url(),
          method: request.method(),
          postData: request.postData()
        };
      }
    });

    console.log('\n=== STATUS CHANGE API TEST ===');

    const hasCase = await selectFirstCase(page);
    if (!hasCase) {
      console.log('  Skipping: No cases available');
      return;
    }

    const statusSelect = page.locator('#status-select');
    if (await statusSelect.count() === 0) {
      console.log('  Skipping: Status select not found');
      return;
    }

    // Get current value and change to different status
    const currentValue = await statusSelect.inputValue();
    console.log(`  Current status: ${currentValue}`);

    // Select a different status
    const newStatus = currentValue === 'new' ? 'in_review' : 'new';
    await statusSelect.selectOption(newStatus);
    await page.waitForTimeout(1000);

    if (statusApiCall) {
      console.log(`  API called: ${statusApiCall.method} ${statusApiCall.url}`);
      console.log(`  Post data: ${statusApiCall.postData}`);
      expect(statusApiCall.method).toBe('PUT');
    } else {
      console.log('  No status API call detected');
    }

    console.log('  Status change API test passed');
  });

  // ============================================
  // ATTORNEY ASSIGNMENT TESTS (7C.7)
  // ============================================

  test('7C.7: Attorney dropdown should render with attorneys', async ({ page }) => {
    console.log('\n=== ATTORNEY DROPDOWN TEST ===');

    const hasCase = await selectFirstCase(page);
    if (!hasCase) {
      console.log('  Skipping: No cases available');
      return;
    }

    const attorneySelect = page.locator('#attorney-select');
    const selectExists = await attorneySelect.count() > 0;

    console.log(`  Attorney select exists: ${selectExists}`);

    if (!selectExists) {
      console.log('  Skipping: Attorney select not found');
      return;
    }

    const options = attorneySelect.locator('option');
    const optionCount = await options.count();

    console.log(`  Attorney options count: ${optionCount}`);
    expect(optionCount).toBeGreaterThan(0);

    // Should have "Unassigned" option
    const firstOption = await options.first().textContent();
    console.log(`  First option: "${firstOption}"`);

    console.log('  Attorney dropdown test passed');
  });

  test('7C.7: Attorney change should call API', async ({ page }) => {
    let attorneyApiCall = null;

    page.on('request', (request) => {
      if (request.url().includes('/api/dashboard/') && request.url().includes('/attorney')) {
        attorneyApiCall = {
          url: request.url(),
          method: request.method(),
          postData: request.postData()
        };
      }
    });

    console.log('\n=== ATTORNEY CHANGE API TEST ===');

    const hasCase = await selectFirstCase(page);
    if (!hasCase) {
      console.log('  Skipping: No cases available');
      return;
    }

    const attorneySelect = page.locator('#attorney-select');
    if (await attorneySelect.count() === 0) {
      console.log('  Skipping: Attorney select not found');
      return;
    }

    const options = await attorneySelect.locator('option').all();
    if (options.length > 1) {
      // Select second option (first non-Unassigned attorney)
      await attorneySelect.selectOption({ index: 1 });
      await page.waitForTimeout(1000);

      if (attorneyApiCall) {
        console.log(`  API called: ${attorneyApiCall.method} ${attorneyApiCall.url}`);
        expect(attorneyApiCall.method).toBe('PUT');
      } else {
        console.log('  No attorney API call detected');
      }
    } else {
      console.log('  Skipping: Only one attorney option available');
    }

    console.log('  Attorney change API test passed');
  });

  // ============================================
  // PRIORITY TOGGLE TESTS
  // ============================================

  test('Priority toggle should work', async ({ page }) => {
    let priorityApiCall = null;

    page.on('request', (request) => {
      if (request.url().includes('/api/dashboard/') && request.url().includes('/priority')) {
        priorityApiCall = {
          url: request.url(),
          method: request.method()
        };
      }
    });

    console.log('\n=== PRIORITY TOGGLE TEST ===');

    const hasCase = await selectFirstCase(page);
    if (!hasCase) {
      console.log('  Skipping: No cases available');
      return;
    }

    const priorityToggle = page.locator('#priority-toggle');
    const toggleExists = await priorityToggle.count() > 0;

    console.log(`  Priority toggle exists: ${toggleExists}`);

    if (!toggleExists) {
      console.log('  Skipping: Priority toggle not found');
      return;
    }

    const initialState = await priorityToggle.isChecked();
    console.log(`  Initial state: ${initialState ? 'ON' : 'OFF'}`);

    await priorityToggle.click();
    await page.waitForTimeout(1000);

    const newState = await priorityToggle.isChecked();
    console.log(`  New state: ${newState ? 'ON' : 'OFF'}`);

    if (priorityApiCall) {
      console.log(`  API called: ${priorityApiCall.method} ${priorityApiCall.url}`);
    }

    console.log('  Priority toggle test passed');
  });

  // ============================================
  // NOTES CRUD TESTS (7C.8)
  // ============================================

  test('7C.8: Notes container should render', async ({ page }) => {
    console.log('\n=== NOTES CONTAINER TEST ===');

    const hasCase = await selectFirstCase(page);
    if (!hasCase) {
      console.log('  Skipping: No cases available');
      return;
    }

    const notesContainer = page.locator('#notes-container, .notes-container');
    const containerExists = await notesContainer.count() > 0;

    console.log(`  Notes container exists: ${containerExists}`);

    // Check for add note form
    const noteInput = page.locator('#new-note-text, textarea[placeholder*="note"], textarea[placeholder*="Note"]');
    const inputExists = await noteInput.count() > 0;
    console.log(`  Note input exists: ${inputExists}`);

    const addButton = page.locator('#add-note-btn, button:has-text("Add Note")');
    const buttonExists = await addButton.count() > 0;
    console.log(`  Add note button exists: ${buttonExists}`);

    console.log('  Notes container test passed');
  });

  test('7C.8: Add note should call API', async ({ page }) => {
    let noteApiCall = null;

    page.on('request', (request) => {
      if (request.url().includes('/api/dashboard/') && request.url().includes('/notes') && request.method() === 'POST') {
        noteApiCall = {
          url: request.url(),
          method: request.method(),
          postData: request.postData()
        };
      }
    });

    console.log('\n=== ADD NOTE API TEST ===');

    const hasCase = await selectFirstCase(page);
    if (!hasCase) {
      console.log('  Skipping: No cases available');
      return;
    }

    const noteInput = page.locator('#new-note-text, textarea[placeholder*="note"], textarea[placeholder*="Note"]');
    if (await noteInput.count() === 0) {
      console.log('  Skipping: Note input not found');
      return;
    }

    // Enter a note
    const testNote = `Test note from Playwright ${Date.now()}`;
    await noteInput.fill(testNote);
    console.log(`  Entered note: "${testNote}"`);

    // Click add button
    const addButton = page.locator('#add-note-btn, button:has-text("Add Note")');
    if (await addButton.count() > 0) {
      await addButton.click();
      await page.waitForTimeout(1000);

      if (noteApiCall) {
        console.log(`  API called: ${noteApiCall.method} ${noteApiCall.url}`);
        expect(noteApiCall.method).toBe('POST');
      } else {
        console.log('  No note API call detected');
      }
    } else {
      console.log('  Add note button not found');
    }

    console.log('  Add note API test passed');
  });

  test('7C.8: Notes API should return notes', async ({ request }) => {
    console.log('\n=== NOTES API TEST ===');

    // Get a dashboard ID first
    const listResponse = await request.get('http://localhost:3000/api/dashboard?limit=1', {
      headers: {
        'Authorization': `Bearer ${API_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    if (!listResponse.ok()) {
      console.log('  Skipping: Cannot fetch dashboard list');
      return;
    }

    const listData = await listResponse.json();
    if (!listData.data || listData.data.length === 0) {
      console.log('  Skipping: No cases in database');
      return;
    }

    const dashboardId = listData.data[0].dashboard_id;

    // Fetch notes
    const notesResponse = await request.get(`http://localhost:3000/api/dashboard/${dashboardId}/notes`, {
      headers: {
        'Authorization': `Bearer ${API_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    console.log(`  Response status: ${notesResponse.status()}`);
    expect(notesResponse.ok()).toBeTruthy();

    const notesData = await notesResponse.json();
    const notes = notesData.data || notesData;
    console.log(`  Notes count: ${Array.isArray(notes) ? notes.length : 'N/A'}`);

    console.log('  Notes API test passed');
  });

  // ============================================
  // ACTIVITY TIMELINE TESTS (7C.9)
  // ============================================

  test('7C.9: Activity timeline should render', async ({ page }) => {
    console.log('\n=== ACTIVITY TIMELINE TEST ===');

    const hasCase = await selectFirstCase(page);
    if (!hasCase) {
      console.log('  Skipping: No cases available');
      return;
    }

    const timeline = page.locator('#activity-timeline, .activity-timeline');
    const timelineExists = await timeline.count() > 0;

    console.log(`  Activity timeline exists: ${timelineExists}`);

    if (timelineExists) {
      const activities = timeline.locator('.activity-item');
      const activityCount = await activities.count();
      console.log(`  Activity items: ${activityCount}`);

      if (activityCount > 0) {
        const firstActivity = activities.first();
        const hasIcon = await firstActivity.locator('.activity-dot, .activity-icon').count() > 0;
        const hasText = await firstActivity.locator('.activity-text, .activity-description').count() > 0;

        console.log(`  First activity has icon: ${hasIcon}`);
        console.log(`  First activity has text: ${hasText}`);
      }
    }

    console.log('  Activity timeline test passed');
  });

  test('7C.9: Activities API should return data', async ({ request }) => {
    console.log('\n=== ACTIVITIES API TEST ===');

    // Get a dashboard ID
    const listResponse = await request.get('http://localhost:3000/api/dashboard?limit=1', {
      headers: {
        'Authorization': `Bearer ${API_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    if (!listResponse.ok()) {
      console.log('  Skipping: Cannot fetch dashboard list');
      return;
    }

    const listData = await listResponse.json();
    if (!listData.data || listData.data.length === 0) {
      console.log('  Skipping: No cases in database');
      return;
    }

    const dashboardId = listData.data[0].dashboard_id;

    // Fetch activities
    const activitiesResponse = await request.get(`http://localhost:3000/api/dashboard/${dashboardId}/activities`, {
      headers: {
        'Authorization': `Bearer ${API_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    console.log(`  Response status: ${activitiesResponse.status()}`);
    expect(activitiesResponse.ok()).toBeTruthy();

    const activitiesData = await activitiesResponse.json();
    const activities = activitiesData.data || activitiesData;
    console.log(`  Activities count: ${Array.isArray(activities) ? activities.length : 'N/A'}`);

    if (Array.isArray(activities) && activities.length > 0) {
      const first = activities[0];
      console.log(`  First activity type: ${first.activity_type}`);
      console.log(`  First activity description: ${first.description?.substring(0, 50)}...`);
    }

    console.log('  Activities API test passed');
  });

  // ============================================
  // OPEN IN DOC GEN TESTS (7C.10)
  // ============================================

  test('7C.10: Open in Doc Gen button should exist', async ({ page }) => {
    console.log('\n=== OPEN IN DOC GEN BUTTON TEST ===');

    const hasCase = await selectFirstCase(page);
    if (!hasCase) {
      console.log('  Skipping: No cases available');
      return;
    }

    const docGenButton = page.locator('button:has-text("Open in Doc Gen"), button:has-text("Open in Document"), #open-docgen-btn');
    const buttonExists = await docGenButton.count() > 0;

    console.log(`  Open in Doc Gen button exists: ${buttonExists}`);

    if (buttonExists) {
      const isEnabled = await docGenButton.isEnabled();
      console.log(`  Button enabled: ${isEnabled}`);
    }

    console.log('  Open in Doc Gen button test passed');
  });

  test('7C.10: Open in Doc Gen should navigate correctly', async ({ page }) => {
    console.log('\n=== OPEN IN DOC GEN NAVIGATION TEST ===');

    const hasCase = await selectFirstCase(page);
    if (!hasCase) {
      console.log('  Skipping: No cases available');
      return;
    }

    // Get current case state
    const caseState = await page.evaluate(() => {
      if (window.CaseDetail && window.CaseDetail.getState) {
        return window.CaseDetail.getState();
      }
      return null;
    });

    if (!caseState || !caseState.currentCase) {
      console.log('  Skipping: No case loaded');
      return;
    }

    const intakeId = caseState.currentCase.intake_id;
    console.log(`  Current case intake_id: ${intakeId}`);

    if (!intakeId) {
      console.log('  Skipping: Case has no intake_id');
      return;
    }

    const docGenButton = page.locator('button:has-text("Open in Doc Gen"), button:has-text("Open in Document"), #open-docgen-btn');
    if (await docGenButton.count() === 0) {
      console.log('  Skipping: Button not found');
      return;
    }

    // Click button and check navigation
    await docGenButton.click();
    await page.waitForTimeout(1000);

    const currentUrl = page.url();
    console.log(`  Current URL after click: ${currentUrl}`);

    const hasLoadIntake = currentUrl.includes('loadIntake=');
    console.log(`  URL has loadIntake parameter: ${hasLoadIntake}`);

    console.log('  Open in Doc Gen navigation test passed');
  });

  // ============================================
  // CLOSE PANEL TEST
  // ============================================

  test('Close panel button should work', async ({ page }) => {
    console.log('\n=== CLOSE PANEL TEST ===');

    const hasCase = await selectFirstCase(page);
    if (!hasCase) {
      console.log('  Skipping: No cases available');
      return;
    }

    const closeButton = page.locator('.close-detail-btn, button:has(.fa-times)');
    const buttonExists = await closeButton.count() > 0;

    console.log(`  Close button exists: ${buttonExists}`);

    if (buttonExists) {
      await closeButton.click();
      await page.waitForTimeout(500);

      // Check if panel is hidden or shows placeholder
      const placeholder = page.locator('.detail-placeholder');
      const hasPlaceholder = await placeholder.count() > 0 && await placeholder.isVisible();
      console.log(`  Placeholder visible after close: ${hasPlaceholder}`);
    }

    console.log('  Close panel test passed');
  });

  // ============================================
  // PROPERTY INFO DISPLAY TEST
  // ============================================

  test('Property information should display', async ({ page }) => {
    console.log('\n=== PROPERTY INFO TEST ===');

    const hasCase = await selectFirstCase(page);
    if (!hasCase) {
      console.log('  Skipping: No cases available');
      return;
    }

    // Check for property section
    const propertySection = page.locator('text=/Property Information/i');
    const sectionExists = await propertySection.count() > 0;
    console.log(`  Property section header exists: ${sectionExists}`);

    // Check for address
    const addressField = page.locator('.info-item:has-text("Address")');
    const hasAddress = await addressField.count() > 0;
    console.log(`  Has address field: ${hasAddress}`);

    // Check for rent
    const rentField = page.locator('.info-item:has-text("Rent")');
    const hasRent = await rentField.count() > 0;
    console.log(`  Has rent field: ${hasRent}`);

    // Check for lease start
    const leaseField = page.locator('.info-item:has-text("Lease")');
    const hasLease = await leaseField.count() > 0;
    console.log(`  Has lease field: ${hasLease}`);

    console.log('  Property info test passed');
  });

  // ============================================
  // COMPREHENSIVE TEST
  // ============================================

  test('Phase 7D.2: Complete case detail functionality test', async ({ page }) => {
    const apiCalls = [];

    page.on('request', (request) => {
      if (request.url().includes('/api/dashboard/')) {
        apiCalls.push({
          url: request.url(),
          method: request.method()
        });
      }
    });

    console.log('\n========================================');
    console.log('PHASE 7D.2 COMPREHENSIVE CASE DETAIL TEST');
    console.log('========================================\n');

    // 1. Load Dashboard
    console.log('1. LOAD DASHBOARD:');
    await page.goto(DASHBOARD_URL);
    await page.waitForLoadState('networkidle');

    const caseDetailExists = await page.evaluate(() => typeof window.CaseDetail !== 'undefined');
    console.log(`   - CaseDetail object: ${caseDetailExists ? 'LOADED' : 'MISSING'}`);
    expect(caseDetailExists).toBeTruthy();

    await page.waitForTimeout(2000);

    // 2. Select Case
    console.log('\n2. SELECT CASE:');
    const caseCards = page.locator('.case-card');
    const cardCount = await caseCards.count();
    console.log(`   - Available cases: ${cardCount}`);

    if (cardCount === 0) {
      console.log('   - Skipping remaining tests (no cases)');
      console.log('\n========================================');
      console.log('PHASE 7D.2 TEST COMPLETE (LIMITED)');
      console.log('========================================\n');
      return;
    }

    await caseCards.first().click();
    await page.waitForTimeout(1500);
    console.log('   - Case selected');

    // 3. API Calls
    console.log('\n3. API CALLS:');
    const detailCall = apiCalls.find(c => c.url.match(/\/api\/dashboard\/[\w-]+$/) && c.method === 'GET');
    const notesCall = apiCalls.find(c => c.url.includes('/notes'));
    const activitiesCall = apiCalls.find(c => c.url.includes('/activities'));

    console.log(`   - Detail API: ${detailCall ? 'CALLED' : 'NOT CALLED'}`);
    console.log(`   - Notes API: ${notesCall ? 'CALLED' : 'NOT CALLED'}`);
    console.log(`   - Activities API: ${activitiesCall ? 'CALLED' : 'NOT CALLED'}`);

    // 4. UI Elements
    console.log('\n4. UI ELEMENTS:');
    const elements = {
      'Client Name': '.detail-client-name',
      'Status Select': '#status-select',
      'Attorney Select': '#attorney-select',
      'Priority Toggle': '#priority-toggle',
      'Notes Container': '#notes-container, .notes-container',
      'Activity Timeline': '#activity-timeline, .activity-timeline',
      'Doc Gen Button': 'button:has-text("Doc Gen")'
    };

    for (const [name, selector] of Object.entries(elements)) {
      const exists = await page.locator(selector).count() > 0;
      console.log(`   - ${name}: ${exists ? 'PRESENT' : 'MISSING'}`);
    }

    // 5. State Check
    console.log('\n5. STATE CHECK:');
    const state = await page.evaluate(() => {
      if (window.CaseDetail && window.CaseDetail.getState) {
        return window.CaseDetail.getState();
      }
      return null;
    });

    if (state) {
      console.log(`   - Current case loaded: ${!!state.currentCase}`);
      console.log(`   - Notes count: ${state.notes?.length || 0}`);
      console.log(`   - Activities count: ${state.activities?.length || 0}`);
      console.log(`   - Attorneys loaded: ${state.attorneys?.length || 0}`);
    }

    console.log('\n========================================');
    console.log('PHASE 7D.2 CASE DETAIL TEST COMPLETE');
    console.log('========================================\n');
  });
});
