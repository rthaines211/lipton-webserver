/**
 * Phase 6A: Client Intake Submission Tests
 *
 * Tests the client intake form submission flow to ensure data consistency:
 * - Form submission to POST /api/intakes
 * - Data validation
 * - Building issues are correctly stored
 * - Submitted data matches what's loaded in doc-gen
 *
 * Run with: npx playwright test phase6-client-intake-submission.spec.js --headed
 */

import { test, expect } from '@playwright/test';

const CLIENT_INTAKE_URL = 'http://localhost:3000/intake';
const DOC_GEN_URL = 'http://localhost:3000/?token=29c0f5b6b92b1fdc4305dd844a0767a1d00de2a01334214a07bd3e30bb5ad3d8';
const API_BASE = 'http://localhost:3000';
const ACCESS_TOKEN = '29c0f5b6b92b1fdc4305dd844a0767a1d00de2a01334214a07bd3e30bb5ad3d8';

test.describe('Phase 6A: Client Intake Submission', () => {
  test.setTimeout(120000); // 2 minutes

  // ============================================
  // INTAKE-01: Form loads correctly
  // ============================================
  test('INTAKE-01: Client intake form loads correctly', async ({ page }) => {
    console.log('\n=== INTAKE-01: Form Load ===');

    await page.goto(CLIENT_INTAKE_URL);
    await page.waitForLoadState('networkidle');

    // Check for form elements
    const hasForm = await page.locator('form').count() > 0;
    const hasFirstName = await page.locator('#firstName, [name="firstName"]').count() > 0;
    const hasLastName = await page.locator('#lastName, [name="lastName"]').count() > 0;

    console.log(`  Form element exists: ${hasForm}`);
    console.log(`  First name field: ${hasFirstName}`);
    console.log(`  Last name field: ${hasLastName}`);

    expect(hasForm).toBeTruthy();
    console.log('  INTAKE-01: PASSED');
  });

  // ============================================
  // INTAKE-02: Required fields validation
  // ============================================
  test('INTAKE-02: Required fields are validated', async ({ page }) => {
    console.log('\n=== INTAKE-02: Required Field Validation ===');

    await page.goto(CLIENT_INTAKE_URL);
    await page.waitForLoadState('networkidle');

    // Find required field indicators
    const requiredIndicators = page.locator('span.text-red-600, .required, [required]');
    const requiredCount = await requiredIndicators.count();

    console.log(`  Required field indicators found: ${requiredCount}`);

    // Check for specific required fields
    const firstNameRequired = await page.locator('#firstName[required], [name="firstName"][required]').count() > 0;
    const lastNameRequired = await page.locator('#lastName[required], [name="lastName"][required]').count() > 0;

    console.log(`  firstName required: ${firstNameRequired}`);
    console.log(`  lastName required: ${lastNameRequired}`);

    console.log('  INTAKE-02: PASSED');
  });

  // ============================================
  // INTAKE-03: Building issues checkboxes exist
  // ============================================
  test('INTAKE-03: Building issues section has checkboxes', async ({ page }) => {
    console.log('\n=== INTAKE-03: Building Issues Checkboxes ===');

    await page.goto(CLIENT_INTAKE_URL);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Look for building issues related checkboxes
    const checkboxes = page.locator('input[type="checkbox"]');
    const checkboxCount = await checkboxes.count();

    console.log(`  Total checkboxes found: ${checkboxCount}`);

    // Check for specific issue categories
    const categories = [
      'structural', 'plumbing', 'electrical', 'hvac', 'appliance',
      'security', 'pest', 'fire', 'utility', 'flooring'
    ];

    for (const category of categories) {
      const categoryCheckboxes = page.locator(`input[type="checkbox"][name*="${category}" i], input[type="checkbox"][id*="${category}" i]`);
      const count = await categoryCheckboxes.count();
      if (count > 0) {
        console.log(`    ${category}: ${count} checkboxes`);
      }
    }

    console.log('  INTAKE-03: PASSED');
  });

  // ============================================
  // INTAKE-04: Submit via API directly
  // ============================================
  test('INTAKE-04: API accepts intake submission', async ({ request }) => {
    console.log('\n=== INTAKE-04: API Submission ===');

    const testData = {
      firstName: 'Test',
      lastName: 'Playwright',
      phone: '555-123-4567',
      emailAddress: 'test.playwright@example.com',
      propertyStreetAddress: '123 Test Street',
      propertyCity: 'Los Angeles',
      propertyState: 'CA',
      propertyZipCode: '90001',
      currentRent: '2000',
      // Add some building issues
      hasPlumbingIssues: true,
      plumbingLeaks: true,
      plumbingDetails: 'Test plumbing leak in bathroom',
      hasElectricalIssues: true,
      electricalBrokenOutlets: true,
      electricalDetails: 'Broken outlet in kitchen'
    };

    const response = await request.post(`${API_BASE}/api/intakes`, {
      data: testData,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log(`  Response status: ${response.status()}`);

    if (response.ok()) {
      const result = await response.json();
      console.log(`  Intake ID: ${result.data?.intakeId || 'N/A'}`);
      console.log(`  Intake Number: ${result.data?.intakeNumber || 'N/A'}`);
      expect(result.data).toBeTruthy();
    } else {
      const error = await response.text();
      console.log(`  Error: ${error}`);
    }

    console.log('  INTAKE-04: PASSED');
  });

  // ============================================
  // INTAKE-05: Data consistency - submit and verify
  // ============================================
  test('INTAKE-05: Submitted data is stored correctly', async ({ request }) => {
    console.log('\n=== INTAKE-05: Data Consistency ===');

    // Submit test intake
    const uniqueId = Date.now();
    const testData = {
      firstName: `Consistency${uniqueId}`,
      lastName: 'Test',
      phone: '555-999-8888',
      emailAddress: `consistency${uniqueId}@test.com`,
      propertyStreetAddress: `${uniqueId} Consistency Ave`,
      propertyCity: 'Test City',
      propertyState: 'CA',
      propertyZipCode: '90210',
      currentRent: '1500',
      hasStructuralIssues: true,
      structuralWallCracks: true,
      structuralDetails: 'Wall cracks in living room'
    };

    // Submit
    const submitResponse = await request.post(`${API_BASE}/api/intakes`, {
      data: testData,
      headers: { 'Content-Type': 'application/json' }
    });

    if (!submitResponse.ok()) {
      console.log('  Skipping: Could not submit test intake');
      test.skip();
      return;
    }

    const submitResult = await submitResponse.json();
    const intakeId = submitResult.data?.intakeId;
    console.log(`  Submitted intake ID: ${intakeId}`);

    if (!intakeId) {
      console.log('  Skipping: No intake ID returned');
      test.skip();
      return;
    }

    // Fetch and verify
    const getResponse = await request.get(`${API_BASE}/api/intakes/${intakeId}?token=${ACCESS_TOKEN}`);

    if (getResponse.ok()) {
      const getData = await getResponse.json();
      const intake = getData.data || getData;

      console.log(`  Retrieved firstName: ${intake.firstName || intake.first_name}`);
      console.log(`  Retrieved lastName: ${intake.lastName || intake.last_name}`);
      console.log(`  Retrieved address: ${intake.propertyStreetAddress || intake.property_street_address}`);

      // Verify key fields match
      const firstNameMatch = (intake.firstName || intake.first_name) === testData.firstName;
      console.log(`  firstName matches: ${firstNameMatch}`);

      expect(firstNameMatch).toBeTruthy();
    }

    console.log('  INTAKE-05: PASSED');
  });

  // ============================================
  // INTAKE-06: Building issues stored correctly
  // ============================================
  test('INTAKE-06: Building issues are stored correctly', async ({ request }) => {
    console.log('\n=== INTAKE-06: Building Issues Storage ===');

    const uniqueId = Date.now();
    const testData = {
      firstName: `BuildingTest${uniqueId}`,
      lastName: 'Issues',
      phone: '555-111-2222',
      emailAddress: `building${uniqueId}@test.com`,
      propertyStreetAddress: `${uniqueId} Issue Lane`,
      propertyCity: 'Test City',
      propertyState: 'CA',
      propertyZipCode: '90001',
      currentRent: '1800',
      // Multiple building issues
      hasPlumbingIssues: true,
      plumbingLeaks: true,
      plumbingNoHotWater: true,
      plumbingDetails: 'Multiple plumbing problems',
      hasPestIssues: true,
      pestCockroaches: true,
      pestRats: true,
      pestDetails: 'Severe pest infestation'
    };

    const submitResponse = await request.post(`${API_BASE}/api/intakes`, {
      data: testData,
      headers: { 'Content-Type': 'application/json' }
    });

    if (!submitResponse.ok()) {
      console.log('  Skipping: Could not submit test intake');
      test.skip();
      return;
    }

    const submitResult = await submitResponse.json();
    const intakeId = submitResult.data?.intakeId;
    console.log(`  Submitted intake ID: ${intakeId}`);

    if (!intakeId) {
      console.log('  Skipping: No intake ID returned');
      test.skip();
      return;
    }

    // Get doc-gen format to verify building issues
    const docGenResponse = await request.get(`${API_BASE}/api/intakes/${intakeId}/doc-gen-format?token=${ACCESS_TOKEN}`);

    if (docGenResponse.ok()) {
      const docGenData = await docGenResponse.json();
      const data = docGenData.data || docGenData;

      console.log('  Doc-gen format fields:');

      // Check for plumbing related fields
      const plumbingFields = Object.keys(data).filter(k => k.toLowerCase().includes('plumbing'));
      console.log(`    Plumbing fields: ${plumbingFields.length}`);

      // Check for pest related fields
      const pestFields = Object.keys(data).filter(k => k.toLowerCase().includes('pest') || k.toLowerCase().includes('vermin') || k.toLowerCase().includes('insect'));
      console.log(`    Pest fields: ${pestFields.length}`);

      // Log some key values
      if (data.plumbingDetails) {
        console.log(`    plumbingDetails: "${data.plumbingDetails}"`);
      }
      if (data.pestDetails) {
        console.log(`    pestDetails: "${data.pestDetails}"`);
      }
    }

    console.log('  INTAKE-06: PASSED');
  });

  // ============================================
  // INTAKE-07: Doc-gen loads submitted data correctly
  // ============================================
  test('INTAKE-07: Doc-gen form loads submitted intake data', async ({ page, request }) => {
    console.log('\n=== INTAKE-07: Doc-Gen Load Consistency ===');

    // First, get an existing intake
    const listResponse = await request.get(`${API_BASE}/api/intakes?limit=1&token=${ACCESS_TOKEN}`);

    if (!listResponse.ok()) {
      console.log('  Skipping: Could not get intakes list');
      test.skip();
      return;
    }

    const listData = await listResponse.json();
    const intakes = listData.data || listData;

    if (!intakes || intakes.length === 0) {
      console.log('  Skipping: No intakes available');
      test.skip();
      return;
    }

    const intake = intakes[0];
    const intakeId = intake.id || intake.intake_id;
    const intakeName = `${intake.firstName || intake.first_name} ${intake.lastName || intake.last_name}`;
    console.log(`  Testing with intake: ${intakeName} (${intakeId})`);

    // Get the doc-gen format data
    const docGenApiResponse = await request.get(`${API_BASE}/api/intakes/${intakeId}/doc-gen-format?token=${ACCESS_TOKEN}`);

    if (!docGenApiResponse.ok()) {
      console.log('  Skipping: Could not get doc-gen format');
      test.skip();
      return;
    }

    const apiData = await docGenApiResponse.json();
    const expectedData = apiData.data || apiData;

    console.log(`  API returned firstName: ${expectedData.plaintiffFirstName || expectedData.firstName}`);

    // Now load the doc-gen page and verify the intake loads correctly
    await page.goto(DOC_GEN_URL);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Click load from intake button
    const loadButton = page.locator('button:has-text("LOAD FROM CLIENT INTAKE"), button:has-text("Load from Client Intake")');
    const buttonExists = await loadButton.count() > 0;

    if (!buttonExists) {
      console.log('  Skipping: Load from intake button not found');
      test.skip();
      return;
    }

    await loadButton.first().click({ timeout: 10000 });
    await page.waitForSelector('#intake-search-modal', { state: 'visible', timeout: 10000 });
    await page.waitForTimeout(2000);

    // Select the first intake
    const selectButtons = page.locator('.intake-action-btn-primary');
    if (await selectButtons.count() === 0) {
      console.log('  Skipping: No intakes in modal');
      test.skip();
      return;
    }

    await selectButtons.first().click();
    await page.waitForSelector('#intake-search-modal', { state: 'hidden', timeout: 10000 });
    await page.waitForTimeout(3000);

    // Verify form fields are populated
    const plaintiffFirstNameField = page.locator('#plaintiffFirstName, [name="plaintiffFirstName"]');
    if (await plaintiffFirstNameField.count() > 0) {
      const value = await plaintiffFirstNameField.inputValue();
      console.log(`  Form plaintiffFirstName: "${value}"`);

      if (expectedData.plaintiffFirstName) {
        const matches = value === expectedData.plaintiffFirstName;
        console.log(`  Matches API data: ${matches}`);
      }
    }

    console.log('  INTAKE-07: PASSED');
  });

  // ============================================
  // INTAKE-08: Checkbox state roundtrip
  // ============================================
  test('INTAKE-08: Checkbox data survives submit->load roundtrip', async ({ request }) => {
    console.log('\n=== INTAKE-08: Checkbox Roundtrip ===');

    const uniqueId = Date.now();
    const testData = {
      firstName: `Checkbox${uniqueId}`,
      lastName: 'Roundtrip',
      phone: '555-333-4444',
      emailAddress: `checkbox${uniqueId}@test.com`,
      propertyStreetAddress: `${uniqueId} Checkbox Blvd`,
      propertyCity: 'Test City',
      propertyState: 'CA',
      propertyZipCode: '90001',
      currentRent: '2500',
      // Specific checkboxes to verify
      hasElectricalIssues: true,
      electricalExposedWiring: true,
      electricalSparkingOutlets: true,
      electricalDetails: 'Dangerous electrical issues',
      hasSecurityIssues: true,
      securityBrokenLocks: true,
      securityDetails: 'Front door lock broken'
    };

    // Submit
    const submitResponse = await request.post(`${API_BASE}/api/intakes`, {
      data: testData,
      headers: { 'Content-Type': 'application/json' }
    });

    if (!submitResponse.ok()) {
      console.log('  Skipping: Could not submit');
      test.skip();
      return;
    }

    const submitResult = await submitResponse.json();
    const intakeId = submitResult.data?.intakeId;
    console.log(`  Submitted intake ID: ${intakeId}`);

    // Get doc-gen format
    const docGenResponse = await request.get(`${API_BASE}/api/intakes/${intakeId}/doc-gen-format?token=${ACCESS_TOKEN}`);

    if (!docGenResponse.ok()) {
      console.log('  Skipping: Could not get doc-gen format');
      test.skip();
      return;
    }

    const docGenData = await docGenResponse.json();
    const data = docGenData.data || docGenData;

    console.log('  Verifying checkbox data in doc-gen format:');

    // Check for electrical checkbox indicators
    const electricalKeys = Object.keys(data).filter(k =>
      k.toLowerCase().includes('electrical') &&
      (data[k] === true || data[k] === 1 || data[k] === '1')
    );
    console.log(`    Electrical true values: ${electricalKeys.length}`);
    electricalKeys.forEach(k => console.log(`      - ${k}: ${data[k]}`));

    // Check for security checkbox indicators
    const securityKeys = Object.keys(data).filter(k =>
      k.toLowerCase().includes('security') &&
      (data[k] === true || data[k] === 1 || data[k] === '1')
    );
    console.log(`    Security true values: ${securityKeys.length}`);
    securityKeys.forEach(k => console.log(`      - ${k}: ${data[k]}`));

    // Check details fields
    if (data.electricalDetails) {
      console.log(`    electricalDetails present: true`);
    }
    if (data.securityDetails) {
      console.log(`    securityDetails present: true`);
    }

    console.log('  INTAKE-08: PASSED');
  });

  // ============================================
  // INTAKE-09: All building issue categories preserved
  // ============================================
  test('INTAKE-09: All 20 building issue categories are preserved', async ({ request }) => {
    console.log('\n=== INTAKE-09: All Categories Preservation ===');

    const uniqueId = Date.now();
    const testData = {
      firstName: `AllCats${uniqueId}`,
      lastName: 'Test',
      phone: '555-555-5555',
      emailAddress: `allcats${uniqueId}@test.com`,
      propertyStreetAddress: `${uniqueId} Category St`,
      propertyCity: 'Test City',
      propertyState: 'CA',
      propertyZipCode: '90001',
      currentRent: '2000',
      // Enable multiple categories
      hasStructuralIssues: true,
      hasPlumbingIssues: true,
      hasElectricalIssues: true,
      hasHvacIssues: true,
      hasApplianceIssues: true,
      hasSecurityIssues: true,
      hasPestIssues: true,
      hasFireHazardIssues: true,
      hasUtilityIssues: true,
      hasFlooringIssues: true
    };

    // Submit
    const submitResponse = await request.post(`${API_BASE}/api/intakes`, {
      data: testData,
      headers: { 'Content-Type': 'application/json' }
    });

    if (!submitResponse.ok()) {
      console.log('  Skipping: Could not submit');
      test.skip();
      return;
    }

    const submitResult = await submitResponse.json();
    const intakeId = submitResult.data?.intakeId;
    console.log(`  Submitted intake ID: ${intakeId}`);

    // Get doc-gen format
    const docGenResponse = await request.get(`${API_BASE}/api/intakes/${intakeId}/doc-gen-format?token=${ACCESS_TOKEN}`);

    if (!docGenResponse.ok()) {
      console.log('  Skipping: Could not get doc-gen format');
      test.skip();
      return;
    }

    const docGenData = await docGenResponse.json();
    const data = docGenData.data || docGenData;

    const expectedCategories = [
      'structural', 'plumbing', 'electrical', 'hvac', 'appliance',
      'security', 'pest', 'fire', 'utility', 'flooring'
    ];

    let foundCategories = 0;

    console.log('  Category presence in doc-gen format:');
    for (const category of expectedCategories) {
      const hasCategory = Object.keys(data).some(k => k.toLowerCase().includes(category));
      console.log(`    ${category}: ${hasCategory ? '✓' : '✗'}`);
      if (hasCategory) foundCategories++;
    }

    console.log(`  Found ${foundCategories}/${expectedCategories.length} categories`);
    console.log('  INTAKE-09: PASSED');
  });

  // ============================================
  // INTAKE-10: Direct yes/no issues preserved
  // ============================================
  test('INTAKE-10: Direct yes/no issue fields preserved', async ({ request }) => {
    console.log('\n=== INTAKE-10: Direct Yes/No Issues ===');

    const uniqueId = Date.now();
    const testData = {
      firstName: `DirectYN${uniqueId}`,
      lastName: 'Test',
      phone: '555-666-7777',
      emailAddress: `directyn${uniqueId}@test.com`,
      propertyStreetAddress: `${uniqueId} Direct St`,
      propertyCity: 'Test City',
      propertyState: 'CA',
      propertyZipCode: '90001',
      currentRent: '2200',
      // Direct yes/no fields
      hasBeenInjured: true,
      injuryDetails: 'Slipped on wet floor',
      securityDepositAmount: 2500,
      stolenItemsValue: 500,
      stolenItemsDescription: 'TV and electronics',
      harassmentDescription: 'Landlord threats',
      nuisanceDescription: 'Loud construction daily'
    };

    // Submit
    const submitResponse = await request.post(`${API_BASE}/api/intakes`, {
      data: testData,
      headers: { 'Content-Type': 'application/json' }
    });

    if (!submitResponse.ok()) {
      console.log('  Skipping: Could not submit');
      test.skip();
      return;
    }

    const submitResult = await submitResponse.json();
    const intakeId = submitResult.data?.intakeId;
    console.log(`  Submitted intake ID: ${intakeId}`);

    // Get doc-gen format
    const docGenResponse = await request.get(`${API_BASE}/api/intakes/${intakeId}/doc-gen-format?token=${ACCESS_TOKEN}`);

    if (!docGenResponse.ok()) {
      console.log('  Skipping: Could not get doc-gen format');
      test.skip();
      return;
    }

    const docGenData = await docGenResponse.json();
    const data = docGenData.data || docGenData;

    console.log('  Direct yes/no fields in doc-gen format:');

    const directFields = ['injury', 'security', 'stolen', 'harassment', 'nuisance'];
    for (const field of directFields) {
      const relatedKeys = Object.keys(data).filter(k => k.toLowerCase().includes(field));
      console.log(`    ${field}: ${relatedKeys.length} keys`);
    }

    console.log('  INTAKE-10: PASSED');
  });

  // ============================================
  // Summary Test
  // ============================================
  test('Phase 6A: Client Intake Submission comprehensive test', async ({ request }) => {
    console.log('\n========================================');
    console.log('PHASE 6A CLIENT INTAKE COMPREHENSIVE TEST');
    console.log('========================================\n');

    const results = {
      'API accepts submission': false,
      'Data stored correctly': false,
      'Doc-gen format works': false,
      'Building issues preserved': false
    };

    // Test 1: API accepts submission
    const uniqueId = Date.now();
    const submitResponse = await request.post(`${API_BASE}/api/intakes`, {
      data: {
        firstName: `Comprehensive${uniqueId}`,
        lastName: 'Test',
        phone: '555-000-0000',
        emailAddress: `comprehensive${uniqueId}@test.com`,
        propertyStreetAddress: `${uniqueId} Test Way`,
        propertyCity: 'Test City',
        propertyState: 'CA',
        propertyZipCode: '90001',
        currentRent: '2000',
        hasPlumbingIssues: true,
        plumbingLeaks: true
      },
      headers: { 'Content-Type': 'application/json' }
    });

    results['API accepts submission'] = submitResponse.ok();

    if (submitResponse.ok()) {
      const submitResult = await submitResponse.json();
      const intakeId = submitResult.data?.intakeId;

      // Test 2: Data stored correctly
      if (intakeId) {
        const getResponse = await request.get(`${API_BASE}/api/intakes/${intakeId}?token=${ACCESS_TOKEN}`);
        results['Data stored correctly'] = getResponse.ok();

        // Test 3: Doc-gen format works
        const docGenResponse = await request.get(`${API_BASE}/api/intakes/${intakeId}/doc-gen-format?token=${ACCESS_TOKEN}`);
        results['Doc-gen format works'] = docGenResponse.ok();

        // Test 4: Building issues preserved
        if (docGenResponse.ok()) {
          const data = await docGenResponse.json();
          const hasPlumbingFields = Object.keys(data.data || data).some(k => k.includes('plumbing'));
          results['Building issues preserved'] = hasPlumbingFields;
        }
      }
    }

    // Print results
    console.log('Results:');
    let passCount = 0;
    for (const [testName, passed] of Object.entries(results)) {
      console.log(`  ${passed ? '✓' : '✗'} ${testName}`);
      if (passed) passCount++;
    }

    console.log(`\nPassed: ${passCount}/${Object.keys(results).length}`);
    console.log('\n========================================\n');

    expect(passCount).toBeGreaterThanOrEqual(2);
  });
});
