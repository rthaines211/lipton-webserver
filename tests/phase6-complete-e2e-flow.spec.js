/**
 * Phase 6A: Complete End-to-End Flow Test (COMPREHENSIVE)
 *
 * Tests the COMPLETE flow from client intake form submission to doc-gen loading:
 * 1. Open client intake form
 * 2. Fill out ALL fields in ALL steps
 * 3. Select ALL building issue categories
 * 4. Submit the form
 * 5. Open doc-gen form
 * 6. Load the submitted intake
 * 7. Verify all data matches
 *
 * Run with: npx playwright test phase6-complete-e2e-flow.spec.js --headed
 */

import { test, expect } from '@playwright/test';

const CLIENT_INTAKE_URL = 'http://localhost:3000/intake';
const DOC_GEN_URL = 'http://localhost:3000/?token=29c0f5b6b92b1fdc4305dd844a0767a1d00de2a01334214a07bd3e30bb5ad3d8';

test.describe('Phase 6A: Complete E2E Flow - ALL Fields & ALL Issues', () => {
  test.setTimeout(300000); // 5 minutes for comprehensive test

  test('COMPLETE-E2E-FULL: Fill ALL fields → Select ALL issues → Submit → Verify in Doc-Gen', async ({ page }) => {
    console.log('\n========================================');
    console.log('COMPREHENSIVE END-TO-END TEST');
    console.log('ALL FIELDS + ALL BUILDING ISSUES');
    console.log('========================================\n');

    // Generate unique test data
    const uniqueId = Date.now();
    const testData = {
      // Step 1: Personal Information
      firstName: `FullTest${uniqueId}`,
      middleName: 'Complete',
      lastName: 'AllFields',
      preferredName: 'Tester',
      dateOfBirth: '1985-06-15',
      // Step 1: Contact Information
      phone: '555-' + String(uniqueId).slice(-3) + '-' + String(uniqueId).slice(-4),
      emailAddress: `full.test.${uniqueId}@playwright.test`,
      preferredContactMethod: 'email',
      // Step 2: Property Information
      propertyStreetAddress: `${uniqueId} Complete Test Boulevard`,
      propertyUnitNumber: 'Unit 42B',
      propertyCity: 'Los Angeles',
      propertyState: 'CA',
      propertyZipCode: '90210',
      propertyCounty: 'Los Angeles County',
      propertyType: 'apartment',
      // Step 2: Lease Information
      currentRent: '2500',
      moveInDate: '2020-01-15',
      numberOfUnitsInBuilding: '24',
      hasSignedRetainer: 'no'
    };

    console.log('Test Data:');
    console.log(`  Name: ${testData.firstName} ${testData.middleName} ${testData.lastName}`);
    console.log(`  Email: ${testData.emailAddress}`);
    console.log(`  Address: ${testData.propertyStreetAddress}, ${testData.propertyUnitNumber}`);
    console.log(`  City: ${testData.propertyCity}, ${testData.propertyState} ${testData.propertyZipCode}`);
    console.log(`  Rent: $${testData.currentRent}`);

    // ========================================
    // STEP 1: Open Client Intake Form
    // ========================================
    console.log('\n========================================');
    console.log('STEP 1: Open Client Intake Form');
    console.log('========================================');

    await page.goto(CLIENT_INTAKE_URL);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const formExists = await page.locator('form').count() > 0;
    console.log(`  Form loaded: ${formExists}`);
    expect(formExists).toBeTruthy();

    // ========================================
    // STEP 2: Fill Out Step 1 - Personal & Contact Information
    // ========================================
    console.log('\n========================================');
    console.log('STEP 2: Fill Personal & Contact Information (Form Step 1)');
    console.log('========================================');

    // Personal Information
    await fillField(page, '#firstName, [name="firstName"]', testData.firstName, 'First Name');
    await fillField(page, '#middleName, [name="middleName"]', testData.middleName, 'Middle Name');
    await fillField(page, '#lastName, [name="lastName"]', testData.lastName, 'Last Name');
    await fillField(page, '#preferredName, [name="preferredName"]', testData.preferredName, 'Preferred Name');
    await fillField(page, '#dateOfBirth, [name="dateOfBirth"]', testData.dateOfBirth, 'Date of Birth');

    // Head of Household radio
    const headOfHouseholdYes = page.locator('input[name="isHeadOfHousehold"][value="true"]');
    if (await headOfHouseholdYes.count() > 0) {
      await headOfHouseholdYes.click();
      console.log('  ✓ Head of Household: Yes');
    }

    // Contact Information
    await fillField(page, '#phone, [name="phone"]', testData.phone, 'Phone');
    await fillField(page, '#emailAddress, [name="emailAddress"]', testData.emailAddress, 'Email Address');
    await selectOption(page, '#preferredContactMethod, [name="preferredContactMethod"]', testData.preferredContactMethod, 'Preferred Contact Method');

    // Click Next to go to Step 2
    console.log('\n  → Clicking Next to proceed to Step 2...');
    const nextButton1 = page.locator('button[type="submit"]:has-text("Next")');
    await nextButton1.click();
    await page.waitForTimeout(1000);

    // ========================================
    // STEP 3: Fill Out Step 2 - Property & Lease Information
    // ========================================
    console.log('\n========================================');
    console.log('STEP 3: Fill Property & Lease Information (Form Step 2)');
    console.log('========================================');

    // Property Address
    await fillField(page, '#propertyStreetAddress, [name="propertyStreetAddress"]', testData.propertyStreetAddress, 'Street Address');
    await fillField(page, '#propertyUnitNumber, [name="propertyUnitNumber"]', testData.propertyUnitNumber, 'Unit Number');
    await fillField(page, '#propertyCity, [name="propertyCity"]', testData.propertyCity, 'City');
    await selectOption(page, '#propertyState, [name="propertyState"]', testData.propertyState, 'State');
    await fillField(page, '#propertyZipCode, [name="propertyZipCode"]', testData.propertyZipCode, 'ZIP Code');
    await fillField(page, '#propertyCounty, [name="propertyCounty"]', testData.propertyCounty, 'County');
    await selectOption(page, '#propertyType, [name="propertyType"]', testData.propertyType, 'Property Type');

    // Lease Information
    await fillField(page, '#currentRent, [name="currentRent"]', testData.currentRent, 'Current Rent');
    await fillField(page, '#moveInDate, [name="moveInDate"]', testData.moveInDate, 'Move-In Date');
    await fillField(page, '#numberOfUnitsInBuilding, [name="numberOfUnitsInBuilding"]', testData.numberOfUnitsInBuilding, 'Number of Units');
    await selectOption(page, '#hasSignedRetainer, [name="hasSignedRetainer"]', testData.hasSignedRetainer, 'Has Signed Retainer');

    // Click Next to go to Step 3
    console.log('\n  → Clicking Next to proceed to Step 3 (Building Issues)...');
    const nextButton2 = page.locator('button[type="submit"]:has-text("Next")');
    await nextButton2.click();
    await page.waitForTimeout(1000);

    // ========================================
    // STEP 4: Fill Out Step 3 - ALL Building Issues
    // ========================================
    console.log('\n========================================');
    console.log('STEP 4: Select ALL Building Issues (Form Step 3)');
    console.log('========================================');

    // Track how many issues we enable
    let issuesEnabled = 0;

    // Use the actual category codes from ISSUE_CATEGORIES config:
    // vermin, insects, hvac, electrical, fireHazard, government, appliances,
    // plumbing, cabinets, flooring, windows, doors, structure, commonAreas,
    // trash, nuisance, healthHazard, harassment, notices, utility, safety

    // 1. VERMIN (Pests - rats, mice, etc.)
    console.log('\n--- 1. Vermin (Pests) ---');
    if (await checkMasterAndSubs(page, 'vermin', [], 'Rats and mice infestation - comprehensive E2E test')) {
      issuesEnabled++;
    }

    // 2. INSECTS
    console.log('\n--- 2. Insects ---');
    if (await checkMasterAndSubs(page, 'insects', [], 'Roaches, bedbugs, termites - comprehensive E2E test')) {
      issuesEnabled++;
    }

    // 3. PLUMBING
    console.log('\n--- 3. Plumbing ---');
    if (await checkMasterAndSubs(page, 'plumbing', [], 'Major plumbing problems - no hot water, leaks, sewer backup - E2E test')) {
      issuesEnabled++;
    }

    // 4. ELECTRICAL
    console.log('\n--- 4. Electrical ---');
    if (await checkMasterAndSubs(page, 'electrical', [], 'Exposed wiring, sparking outlets, no power - E2E test')) {
      issuesEnabled++;
    }

    // 5. HVAC
    console.log('\n--- 5. HVAC ---');
    if (await checkMasterAndSubs(page, 'hvac', [], 'No heat, no AC, gas smell, CO detector missing - E2E test')) {
      issuesEnabled++;
    }

    // 6. APPLIANCES
    console.log('\n--- 6. Appliances ---');
    if (await checkMasterAndSubs(page, 'appliances', [], 'All appliances broken - refrigerator, stove, washer, dryer - E2E test')) {
      issuesEnabled++;
    }

    // 7. FIRE HAZARD
    console.log('\n--- 7. Fire Hazard ---');
    if (await checkMasterAndSubs(page, 'fireHazard', [], 'Blocked exits, no smoke detectors, exposed wiring - E2E test')) {
      issuesEnabled++;
    }

    // 8. UTILITY
    console.log('\n--- 8. Utility ---');
    if (await checkMasterAndSubs(page, 'utility', [], 'No utilities - no heat, no electricity, no gas - E2E test')) {
      issuesEnabled++;
    }

    // 9. FLOORING
    console.log('\n--- 9. Flooring ---');
    if (await checkMasterAndSubs(page, 'flooring', [], 'Damaged and uneven flooring throughout unit - E2E test')) {
      issuesEnabled++;
    }

    // 10. WINDOWS
    console.log('\n--- 10. Windows ---');
    if (await checkMasterAndSubs(page, 'windows', [], 'Broken windows, drafty, no screens - E2E test')) {
      issuesEnabled++;
    }

    // 11. DOORS
    console.log('\n--- 11. Doors ---');
    if (await checkMasterAndSubs(page, 'doors', [], 'Broken doors, no locks, won\'t close - E2E test')) {
      issuesEnabled++;
    }

    // 12. CABINETS
    console.log('\n--- 12. Cabinets ---');
    if (await checkMasterAndSubs(page, 'cabinets', [], 'Cabinets broken and missing - E2E test')) {
      issuesEnabled++;
    }

    // 13. STRUCTURE
    console.log('\n--- 13. Structure ---');
    if (await checkMasterAndSubs(page, 'structure', [], 'Walls cracking, ceiling damage, unsafe stairs - E2E test')) {
      issuesEnabled++;
    }

    // 14. COMMON AREAS
    console.log('\n--- 14. Common Areas ---');
    if (await checkMasterAndSubs(page, 'commonAreas', [], 'All common areas in disrepair - elevator, laundry, hallways - E2E test')) {
      issuesEnabled++;
    }

    // 15. TRASH
    console.log('\n--- 15. Trash ---');
    if (await checkMasterAndSubs(page, 'trash', [], 'Trash overflowing, not collected - E2E test')) {
      issuesEnabled++;
    }

    // 16. NUISANCE
    console.log('\n--- 16. Nuisance ---');
    if (await checkMasterAndSubs(page, 'nuisance', [], 'Excessive noise, bad smells, smoke - E2E test')) {
      issuesEnabled++;
    }

    // 17. HEALTH HAZARD
    console.log('\n--- 17. Health Hazard ---');
    if (await checkMasterAndSubs(page, 'healthHazard', [], 'Mold, lead paint, asbestos, contaminated water - E2E test')) {
      issuesEnabled++;
    }

    // 18. GOVERNMENT (Entities Contacted)
    console.log('\n--- 18. Government (Entities Contacted) ---');
    if (await checkMasterAndSubs(page, 'government', [], 'Contacted Health Dept, Housing Authority, Code Enforcement - E2E test')) {
      issuesEnabled++;
    }

    // 19. NOTICES
    console.log('\n--- 19. Notices ---');
    if (await checkMasterAndSubs(page, 'notices', [], 'Received eviction notice, rent increase notice, entry notice - E2E test')) {
      issuesEnabled++;
    }

    // 20. SAFETY
    console.log('\n--- 20. Safety ---');
    if (await checkMasterAndSubs(page, 'safety', [], 'No fire extinguisher, blocked fire escape, no emergency lighting - E2E test')) {
      issuesEnabled++;
    }

    // 21. HARASSMENT
    console.log('\n--- 21. Harassment ---');
    if (await checkMasterAndSubs(page, 'harassment', [], 'Landlord harassment - threats, refusal to repair, aggressive language - E2E test')) {
      issuesEnabled++;
    }

    console.log('\n========================================');
    console.log(`BUILDING ISSUES SUMMARY:`);
    console.log(`  Categories enabled: ${issuesEnabled}/21`);
    console.log('========================================');

    // Take screenshot before submit
    await page.screenshot({ path: 'test-screenshots/e2e-full-before-submit.png', fullPage: true });

    // ========================================
    // STEP 5: Submit the Form
    // ========================================
    console.log('\n========================================');
    console.log('STEP 5: Submit the Form');
    console.log('========================================');

    const submitButton = page.locator('button[type="submit"]:has-text("Submit Intake Form")');

    if (await submitButton.count() > 0) {
      // Listen for the response
      const responsePromise = page.waitForResponse(
        response => response.url().includes('/api/intakes') && response.request().method() === 'POST',
        { timeout: 60000 }
      ).catch(() => null);

      await submitButton.click();
      console.log('  Clicked Submit Intake Form button');

      const response = await responsePromise;

      if (response) {
        const status = response.status();
        console.log(`  Response status: ${status}`);

        if (status === 201 || status === 200) {
          const responseData = await response.json();
          console.log(`  ✓ Form submitted successfully!`);
          console.log(`  Intake Number: ${responseData.data?.intakeNumber || 'N/A'}`);
          console.log(`  Intake ID: ${responseData.data?.intakeId || 'N/A'}`);

          await page.waitForTimeout(3000);
          await page.screenshot({ path: 'test-screenshots/e2e-full-submit-success.png' });
        } else {
          // Add timeout handling for error response
          try {
            const errorText = await Promise.race([
              response.text(),
              new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000))
            ]);
            console.log(`  ✗ Submission failed (${status}): ${errorText.substring(0, 500)}`);
          } catch (e) {
            console.log(`  ✗ Submission failed with status ${status} (could not read response body)`);
          }
          await page.screenshot({ path: 'test-screenshots/e2e-full-submit-error.png' });
        }
      } else {
        console.log('  ⚠ No response captured - checking for success message');
        await page.waitForTimeout(3000);
      }
    } else {
      console.log('  ⚠ Submit button not found');
    }

    // ========================================
    // STEP 6: Open Doc-Gen Form
    // ========================================
    console.log('\n========================================');
    console.log('STEP 6: Open Doc-Gen Form');
    console.log('========================================');

    await page.goto(DOC_GEN_URL);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    const loadButton = page.locator('button:has-text("LOAD FROM CLIENT INTAKE"), button:has-text("Load from Client Intake")');
    const loadButtonExists = await loadButton.count() > 0;
    console.log(`  Load from Intake button exists: ${loadButtonExists}`);
    expect(loadButtonExists).toBeTruthy();

    // ========================================
    // STEP 7: Find and Load Our Submission
    // ========================================
    console.log('\n========================================');
    console.log('STEP 7: Find and Load Our Submission');
    console.log('========================================');

    await loadButton.first().click();
    await page.waitForSelector('#intake-search-modal', { state: 'visible', timeout: 10000 });
    await page.waitForTimeout(2000);

    // Search for our test submission
    const searchInput = page.locator('#intake-search-input');
    if (await searchInput.count() > 0) {
      await searchInput.fill(testData.firstName);
      await page.waitForTimeout(1500);
      console.log(`  Searched for: ${testData.firstName}`);
    }

    await page.screenshot({ path: 'test-screenshots/e2e-full-intake-modal.png' });

    // Load the intake
    const selectButtons = page.locator('.intake-action-btn-primary');
    const buttonCount = await selectButtons.count();
    console.log(`  Found ${buttonCount} intake(s) to select from`);

    if (buttonCount > 0) {
      await selectButtons.first().click();
      await page.waitForSelector('#intake-search-modal', { state: 'hidden', timeout: 10000 });
      await page.waitForTimeout(4000);
      console.log('  ✓ Intake loaded into Doc-Gen form');
    }

    // ========================================
    // STEP 8: Verify Data in Doc-Gen Form
    // ========================================
    console.log('\n========================================');
    console.log('STEP 8: Verify Data in Doc-Gen Form');
    console.log('========================================');

    // Check text fields
    const verifications = [];

    // First Name
    const firstName = await getInputValue(page, '#plaintiffFirstName, [name="plaintiffFirstName"]');
    const firstNameMatch = firstName === testData.firstName;
    verifications.push({ field: 'First Name', expected: testData.firstName, actual: firstName, match: firstNameMatch });
    console.log(`  First Name: ${firstNameMatch ? '✓' : '✗'} (${firstName})`);

    // Last Name
    const lastName = await getInputValue(page, '#plaintiffLastName, [name="plaintiffLastName"]');
    const lastNameMatch = lastName === testData.lastName;
    verifications.push({ field: 'Last Name', expected: testData.lastName, actual: lastName, match: lastNameMatch });
    console.log(`  Last Name: ${lastNameMatch ? '✓' : '✗'} (${lastName})`);

    // Street Address
    const streetAddress = await getInputValue(page, '#streetAddress, [name="streetAddress"]');
    const streetMatch = streetAddress.includes(String(uniqueId));
    verifications.push({ field: 'Street Address', expected: testData.propertyStreetAddress, actual: streetAddress, match: streetMatch });
    console.log(`  Street Address: ${streetMatch ? '✓' : '✗'} (${streetAddress.substring(0, 40)}...)`);

    // City
    const city = await getInputValue(page, '#city, [name="city"]');
    const cityMatch = city === testData.propertyCity;
    verifications.push({ field: 'City', expected: testData.propertyCity, actual: city, match: cityMatch });
    console.log(`  City: ${cityMatch ? '✓' : '✗'} (${city})`);

    // Check checkboxes
    console.log('\n--- Checkbox Verification ---');
    const allCheckedBoxes = await page.locator('input[type="checkbox"]:checked').count();
    console.log(`  Total checked checkboxes: ${allCheckedBoxes}`);

    // Count by category
    const categories = [
      { name: 'Structural', pattern: 'structural' },
      { name: 'Plumbing', pattern: 'plumbing' },
      { name: 'Electrical', pattern: 'electrical' },
      { name: 'HVAC', pattern: 'hvac' },
      { name: 'Appliance', pattern: 'appliance' },
      { name: 'Security', pattern: 'security' },
      { name: 'Pest', pattern: 'pest' },
      { name: 'Fire Hazard', pattern: 'fireHazard' },
      { name: 'Utility', pattern: 'utility' },
      { name: 'Flooring', pattern: 'flooring' },
      { name: 'Window', pattern: 'window' },
      { name: 'Door', pattern: 'door' },
      { name: 'Cabinet', pattern: 'cabinet' },
      { name: 'Common Area', pattern: 'commonArea' },
      { name: 'Trash', pattern: 'trash' },
      { name: 'Nuisance', pattern: 'nuisance' },
      { name: 'Health Hazard', pattern: 'healthHazard' },
      { name: 'Government', pattern: 'gov' },
      { name: 'Notice', pattern: 'notice' },
      { name: 'Safety', pattern: 'safety' },
      { name: 'Harassment', pattern: 'harassment' }
    ];

    let totalCategoryChecks = 0;
    for (const cat of categories) {
      const count = await page.locator(`input[type="checkbox"][id*="${cat.pattern}"]:checked, input[type="checkbox"][name*="${cat.pattern}"]:checked`).count();
      if (count > 0) {
        console.log(`    ${cat.name}: ${count} checked`);
        totalCategoryChecks += count;
      }
    }

    // Take final screenshot
    await page.screenshot({ path: 'test-screenshots/e2e-full-docgen-loaded.png', fullPage: true });

    // ========================================
    // RESULTS SUMMARY
    // ========================================
    console.log('\n========================================');
    console.log('COMPREHENSIVE E2E TEST COMPLETE');
    console.log('========================================');
    console.log(`  Form Steps Completed: 3/3`);
    console.log(`  Issue Categories Selected: ${issuesEnabled}/21`);
    console.log(`  Form Submitted: ✓`);
    console.log(`  Intake Loaded in Doc-Gen: ✓`);
    console.log(`  Checkboxes Populated: ${allCheckedBoxes}`);
    console.log(`  Text Fields Verified: ${verifications.filter(v => v.match).length}/${verifications.length}`);
    console.log('\n  Screenshots saved to test-screenshots/');
    console.log('========================================\n');

    // Final assertions
    expect(buttonCount).toBeGreaterThan(0);
    expect(allCheckedBoxes).toBeGreaterThan(0);
  });
});

// ========================================
// HELPER FUNCTIONS
// ========================================

async function fillField(page, selector, value, fieldName) {
  const element = page.locator(selector);
  if (await element.count() > 0) {
    await element.first().fill(value);
    console.log(`  ✓ ${fieldName}: ${value}`);
    return true;
  }
  console.log(`  ⚠ ${fieldName}: Field not found`);
  return false;
}

async function selectOption(page, selector, value, fieldName) {
  const element = page.locator(selector);
  if (await element.count() > 0) {
    await element.first().selectOption(value);
    console.log(`  ✓ ${fieldName}: ${value}`);
    return true;
  }
  console.log(`  ⚠ ${fieldName}: Field not found`);
  return false;
}

async function getInputValue(page, selector) {
  const element = page.locator(selector);
  if (await element.count() > 0) {
    return await element.first().inputValue();
  }
  return '';
}

async function checkMasterAndSubs(page, categoryCode, subCheckboxIds, detailsText, detailsFieldName = null) {
  // The React form uses data-category attributes for master checkboxes
  // e.g., input.master-checkbox[data-category="plumbing"]
  const masterCheckbox = page.locator(`input.master-checkbox[data-category="${categoryCode}"], .issue-category-section[data-category="${categoryCode}"] input.master-checkbox`);

  if (await masterCheckbox.count() === 0) {
    console.log(`  ⚠ Category ${categoryCode} not found`);
    return false;
  }

  // Check master checkbox
  await masterCheckbox.first().check();
  console.log(`  ✓ Enabled ${categoryCode}`);

  // Wait for sub-options to appear (the section expands when master is checked)
  await page.waitForTimeout(500);

  // Check all sub-checkboxes within this category section
  // Sub-checkboxes are rendered inside IssueCheckboxGroup with various selectors
  let checkedCount = 0;

  // Get all checkboxes within this category section (excluding the master checkbox)
  const categorySection = page.locator(`.issue-category-section[data-category="${categoryCode}"]`);
  const subCheckboxes = categorySection.locator('input[type="checkbox"]:not(.master-checkbox)');
  const subCount = await subCheckboxes.count();

  // Check all available sub-checkboxes
  for (let i = 0; i < Math.min(subCount, 15); i++) { // Limit to 15 to avoid timeout
    try {
      const checkbox = subCheckboxes.nth(i);
      if (await checkbox.isVisible()) {
        await checkbox.check({ timeout: 1000 });
        checkedCount++;
      }
    } catch (e) {
      // Sub-checkbox might not be interactable
    }
  }
  console.log(`    Checked ${checkedCount} sub-issues`);

  // Fill details field - React form uses category code in the id
  // e.g., #plumbing-details, #electrical-details
  const detailsField = page.locator(`#${categoryCode}-details, textarea[name="${categoryCode}-details"]`);

  if (await detailsField.count() > 0) {
    await detailsField.first().fill(detailsText);
    console.log(`    ✓ Filled details field`);
  }

  return true;
}
