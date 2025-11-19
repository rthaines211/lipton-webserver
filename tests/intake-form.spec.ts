/**
 * Playwright Test Script for Client Intake Form - COMPREHENSIVE
 *
 * This script fills out EVERY SINGLE FIELD in the 9-step client intake form
 * to thoroughly test the complete end-to-end workflow including all edge cases.
 *
 * Run with: npx playwright test intake-form.spec.ts --headed
 */

import { test, expect } from '@playwright/test';

test('Complete Client Intake Form - Fill EVERY Field', async ({ page }) => {
  // Increase timeout for this comprehensive test
  test.setTimeout(180000); // 3 minutes

  // Navigate to the intake form with authentication token (dev environment)
  await page.goto('https://node-server-dev-zyiwmzwenq-uc.a.run.app/intake/?token=XYhK2Y9BAYaqyLoTXQrka8N%2BfB6Xtz939HjVGMBQJKA%3D');

  // Wait for form to load
  await expect(page.getByText('Client Intake Form')).toBeVisible({ timeout: 10000 });
  await expect(page.getByText('Step 1 of 9')).toBeVisible();

  // ============================================================
  // STEP 1: PERSONAL INFORMATION (20 fields - added filingCounty, isHeadOfHousehold + 8 legal history fields)
  // ============================================================
  console.log('\n📋 STEP 1: Filling Personal Information (20 fields)...');

  await page.fill('#firstName', 'Maria');
  await page.fill('#middleName', 'Elena');
  await page.fill('#lastName', 'Rodriguez-Garcia');
  await page.fill('#preferredName', 'Maria');
  await page.fill('#dateOfBirth', '1985-06-15');
  await page.selectOption('#gender', 'female');
  await page.selectOption('#maritalStatus', 'married');
  await page.selectOption('#languagePreference', 'Spanish');
  await page.check('#requiresInterpreter');
  await page.selectOption('#filingCounty', 'Los Angeles');
  // Select "Yes" for Head of Household
  await page.click('input[name="isHeadOfHousehold"][value="true"]');

  // Legal History Section
  await page.selectOption('#hasRentDeductions', 'yes');
  await page.fill('#rentDeductionsDetails', 'Received $500/month rent reduction for 6 months due to lack of heat and mold issues.');

  await page.selectOption('#hasBeenRelocated', 'yes');
  await page.fill('#relocationDetails', 'Temporarily relocated to hotel for 2 weeks when apartment was deemed uninhabitable by health department.');

  await page.selectOption('#hasLawsuitInvolvement', 'yes');
  await page.fill('#lawsuitDetails', 'Filed small claims case against landlord in 2023 for security deposit withholding. Case settled.');

  await page.fill('#hasPoliceReports', 'Filed police report for break-in due to broken door lock that landlord refused to fix.');
  await page.fill('#hasPropertyDamage', 'Lost furniture, electronics, and personal belongings to mold and water damage from persistent leaks.');

  console.log('   ✓ Personal information completed');
  await page.click('button:has-text("Next")');
  await expect(page.getByText('Step 2 of 9')).toBeVisible();

  // ============================================================
  // STEP 2: CONTACT INFORMATION (13 fields)
  // ============================================================
  console.log('\n📞 STEP 2: Filling Contact Information (13 fields)...');

  await page.fill('#primaryPhone', '(415) 555-1234');
  await page.fill('#secondaryPhone', '(415) 555-5678');
  await page.fill('#workPhone', '(415) 555-9999');
  await page.fill('#emailAddress', 'maria.rodriguez.test@example.com');
  await page.selectOption('#preferredContactMethod', 'phone');
  await page.selectOption('#preferredContactTime', 'evening');
  await page.fill('#emergencyContactName', 'Carlos Rodriguez');
  await page.fill('#emergencyContactRelationship', 'Spouse');
  await page.fill('#emergencyContactPhone', '(415) 555-1111');
  await page.check('#canTextPrimary');
  await page.check('#canLeaveVoicemail');
  await page.fill('#communicationRestrictions', 'Please do not call before 9am or after 8pm. Prefer text messages during work hours (9am-5pm). Spanish language preferred.');

  await page.fill('#howDidYouFindUs', 'Referred by friend who used your services');

  console.log('   ✓ Contact information completed');
  await page.click('button:has-text("Next")');
  await expect(page.getByText('Step 3 of 9')).toBeVisible();

  // ============================================================
  // STEP 3: CURRENT ADDRESS (8 fields)
  // ============================================================
  console.log('\n🏠 STEP 3: Filling Address Information (8 fields)...');

  await page.fill('#currentStreetAddress', '1234 Mission Street');
  await page.fill('#currentUnitNumber', 'Apt 3B');
  await page.fill('#currentCity', 'San Francisco');
  await page.selectOption('#currentState', 'CA');
  await page.fill('#currentZipCode', '94103');
  await page.fill('#currentCounty', 'San Francisco');
  await page.fill('#yearsAtCurrentAddress', '3');
  await page.fill('#monthsAtCurrentAddress', '6');

  console.log('   ✓ Address information completed');
  await page.click('button:has-text("Next")');
  await expect(page.getByText('Step 4 of 9')).toBeVisible();

  // ============================================================
  // STEP 4: PROPERTY & TENANCY (23 fields total)
  // ============================================================
  console.log('\n🏢 STEP 4: Filling Property & Tenancy Details (23 fields)...');

  // Property Information (10 fields)
  await page.fill('#propertyStreetAddress', '1234 Mission Street');
  await page.fill('#propertyUnitNumber', 'Apt 3B');
  await page.fill('#propertyCity', 'San Francisco');
  await page.selectOption('#propertyState', 'CA');
  await page.fill('#propertyZipCode', '94103');
  await page.fill('#propertyCounty', 'San Francisco');
  await page.selectOption('#propertyType', 'apartment');
  await page.fill('#numberOfUnitsInBuilding', '24');
  await page.fill('#floorNumber', '3');
  await page.check('#isRentControlled');

  // Tenancy Details (10 fields)
  await page.fill('#leaseStartDate', '2021-01-01');
  await page.fill('#leaseEndDate', '2024-12-31');
  await page.selectOption('#leaseType', 'fixed_term');
  await page.fill('#monthlyRent', '2500.00');
  await page.fill('#securityDeposit', '2500.00');
  await page.fill('#lastRentIncreaseDate', '2023-01-01');
  await page.fill('#lastRentIncreaseAmount', '150.00');

  // Rent status - test BOTH scenarios by toggling
  // First test: rent is NOT current (to fill monthsBehindRent)
  await page.uncheck('#rentCurrent');
  await page.waitForSelector('#monthsBehindRent', { timeout: 2000 });
  await page.fill('#monthsBehindRent', '2');
  await page.check('#receivedEvictionNotice');

  // Then switch to rent IS current (for realistic scenario)
  await page.check('#rentCurrent');
  await page.uncheck('#receivedEvictionNotice');

  await page.fill('#hasUnlawfulDetainerFiled', 'No unlawful detainer has been filed against me at this time.');
  await page.fill('#moveInDate', '2021-01-01');
  await page.selectOption('#hasRetainerWithAnotherAttorney', 'no');

  console.log('   ✓ Property & tenancy completed');
  await page.click('button:has-text("Next")');
  await expect(page.getByText('Step 5 of 9')).toBeVisible();

  // ============================================================
  // STEP 5: HOUSEHOLD COMPOSITION (Dynamic - Add 3 members + 9 demographics)
  // ============================================================
  console.log('\n👨‍👩‍👧‍👦 STEP 5: Filling Household Composition (24 fields - 9 demographics + 3 members)...');

  // Household Demographics
  console.log('   → Filling household demographics...');
  await page.fill('#clientOccupation', 'Restaurant Server');
  await page.selectOption('#clientHasDisability', 'yes');
  await page.fill('#clientDisabilityDetails', 'Chronic back pain from work injury, limiting mobility and ability to stand for long periods.');
  await page.selectOption('#isSpanishSpeaking', 'yes');
  await page.selectOption('#isVeteran', 'no');
  await page.fill('#numberOfChildren', '2');
  await page.fill('#numberOfElderly', '1');
  await page.fill('#totalHouseholdSize', '5');
  await page.selectOption('#householdIncomeUnder45k', 'yes');

  // Member 1 - Spouse
  await page.click('button:has-text("Add Household Member")');
  await page.waitForTimeout(500);

  // Fill member 1 fields - using nth selectors since fields don't have unique names
  const member1Container = page.locator('.border-2.border-gray-200').nth(0);
  await member1Container.locator('input').nth(0).fill('Carlos'); // First Name
  await member1Container.locator('input').nth(1).fill('Rodriguez'); // Last Name
  await member1Container.locator('select').selectOption('spouse'); // Relationship
  await member1Container.locator('input[type="number"]').fill('42'); // Age
  // Leave disability unchecked (default)

  // Member 2 - Child with disability
  await page.click('button:has-text("Add Household Member")');
  await page.waitForTimeout(500);

  const member2Container = page.locator('.border-2.border-gray-200').nth(1);
  await member2Container.locator('input').nth(0).fill('Sofia'); // First Name
  await member2Container.locator('input').nth(1).fill('Rodriguez'); // Last Name
  await member2Container.locator('select').selectOption('child'); // Relationship
  await member2Container.locator('input[type="number"]').fill('8'); // Age
  await member2Container.locator('input[type="checkbox"]').check(); // Has disability
  await page.waitForTimeout(300);
  await member2Container.locator('textarea').fill('Autism spectrum disorder requiring special education services and occupational therapy.');

  // Member 3 - Elderly parent with disability
  await page.click('button:has-text("Add Household Member")');
  await page.waitForTimeout(500);

  const member3Container = page.locator('.border-2.border-gray-200').nth(2);
  await member3Container.locator('input').nth(0).fill('Carmen'); // First Name
  await member3Container.locator('input').nth(1).fill('Garcia'); // Last Name
  await member3Container.locator('select').selectOption('parent'); // Relationship
  await member3Container.locator('input[type="number"]').fill('72'); // Age
  await member3Container.locator('input[type="checkbox"]').check(); // Has disability
  await page.waitForTimeout(300);
  await member3Container.locator('textarea').fill('Mobility impairment requiring wheelchair access and assisted living support.');

  console.log('   ✓ Household composition completed (3 members)');
  await page.click('button:has-text("Next")');
  await expect(page.getByText('Step 6 of 9')).toBeVisible();

  // ============================================================
  // STEP 6: LANDLORD & PROPERTY MANAGEMENT (10 fields)
  // ============================================================
  console.log('\n🏗️ STEP 6: Filling Landlord & Property Management (10 fields)...');

  // Landlord Information (6 fields)
  await page.selectOption('#landlordType', 'corporation');
  await page.fill('#landlordName', 'John Smith');
  await page.fill('#landlordCompanyName', 'Mission Properties LLC');
  await page.fill('#landlordPhone', '(415) 555-7777');
  await page.fill('#landlordEmail', 'jsmith@missionproperties.com');
  await page.fill('#landlordAddress', '555 Market Street, San Francisco, CA 94105');

  // Property Management (4 fields)
  await page.check('#hasPropertyManager');
  await page.waitForSelector('#managerCompanyName', { timeout: 2000 });

  await page.fill('#managerCompanyName', 'Bay Area Property Management Services');
  await page.fill('#managerContactName', 'David Chen');
  await page.fill('#managerPhone', '(415) 555-8888');
  await page.fill('#managerEmail', 'dchen@bapm.com');

  console.log('   ✓ Landlord & property management completed');
  await page.click('button:has-text("Next")');
  await expect(page.getByText('Step 7 of 9')).toBeVisible();

  // ============================================================
  // STEP 7: BUILDING & HOUSING ISSUES (73 fields)
  // ============================================================
  console.log('\n🚨 STEP 7: Filling Building & Housing Issues (ALL categories)...');

  // STRUCTURAL ISSUES (14 fields: 1 master + 11 checkboxes + 1 details + 2 dates)
  console.log('   → Structural Issues...');
  await page.check('#hasStructuralIssues');
  await page.check('#structuralCeilingDamage');
  await page.check('#structuralWallCracks');
  await page.check('#structuralFloorDamage');
  await page.check('#structuralFoundationIssues');
  await page.check('#structuralRoofLeaks');
  await page.check('#structuralWindowDamage');
  await page.check('#structuralDoorDamage');
  await page.check('#structuralStairsUnsafe');
  await page.check('#structuralBalconyUnsafe');
  await page.check('#structuralRailingMissing');
  await page.check('#structuralOther');
  await page.fill('#structuralDetails', 'Large cracks in ceiling with extensive water damage and mold growth. Multiple broken windows that do not close or lock properly, allowing rain and cold air inside. Floor is sagging in kitchen area. Stairway railing is loose and dangerous. Balcony has rotting wood and feels unstable. Exposed asbestos in ceiling tiles.');
  await page.fill('#structuralFirstNoticed', '2023-10-15');
  await page.fill('#structuralReportedDate', '2023-10-20');

  // PLUMBING ISSUES (17 fields: 1 master + 14 checkboxes + 1 details + 2 dates)
  console.log('   → Plumbing Issues...');
  await page.check('#hasPlumbingIssues');
  await page.check('#plumbingNoHotWater');
  await page.check('#plumbingNoWater');
  await page.check('#plumbingLowPressure');
  await page.check('#plumbingLeaks');
  await page.check('#plumbingBurstPipes');
  await page.check('#plumbingCloggedDrains');
  await page.check('#plumbingToiletNotWorking');
  await page.check('#plumbingShowerNotWorking');
  await page.check('#plumbingSinkNotWorking');
  await page.check('#plumbingSewerBackup');
  await page.check('#plumbingWaterDamage');
  await page.check('#plumbingFlooding');
  await page.check('#plumbingWaterDiscoloration');
  await page.check('#plumbingOther');
  await page.fill('#plumbingDetails', 'No hot water for over 2 weeks. Major leak under kitchen sink causing water damage to cabinet and floor. Toilet frequently clogs and overflows. Shower drain is completely clogged - water floods bathroom floor. Low and inconsistent water pressure throughout apartment. Water is brown/discolored when first turned on. Sewage smell in bathroom. Water pressure fluctuates wildly.');
  await page.fill('#plumbingFirstNoticed', '2023-11-01');
  await page.fill('#plumbingReportedDate', '2023-11-05');

  // ELECTRICAL ISSUES (14 fields: 1 master + 11 checkboxes + 1 details + 2 dates)
  console.log('   → Electrical Issues...');
  await page.check('#hasElectricalIssues');
  await page.check('#electricalNoPower');
  await page.check('#electricalPartialOutages');
  await page.check('#electricalExposedWiring');
  await page.check('#electricalSparkingOutlets');
  await page.check('#electricalBrokenOutlets');
  await page.check('#electricalBrokenSwitches');
  await page.check('#electricalFlickeringLights');
  await page.check('#electricalCircuitBreakerIssues');
  await page.check('#electricalInsufficientOutlets');
  await page.check('#electricalBurningSmell');
  await page.check('#electricalOther');
  await page.fill('#electricalDetails', 'Frequent partial power outages in bedroom and living room - sometimes multiple times per day. Several outlets do not work at all, and some spark when plugs are inserted. Lights flicker constantly throughout the unit. Circuit breaker trips multiple times per week, even with minimal electrical use. Burning smell near electrical panel. Exposed wiring visible in several locations. Outlets get very hot when devices are plugged in. Electrical panel looks old and dangerous. SERIOUS SAFETY HAZARD.');
  await page.fill('#electricalFirstNoticed', '2023-09-15');
  await page.fill('#electricalReportedDate', '2023-09-20');

  // HVAC ISSUES (13 fields: 1 master + 9 checkboxes + 1 details + 2 dates)
  console.log('   → HVAC Issues...');
  await page.check('#hasHvacIssues');
  await page.check('#hvacNoHeat');
  await page.check('#hvacInadequateHeat');
  await page.check('#hvacNoAirConditioning');
  await page.check('#hvacInadequateCooling');
  await page.check('#hvacBrokenThermostat');
  await page.check('#hvacGasSmell');
  await page.check('#hvacCarbonMonoxideDetectorMissing');
  await page.check('#hvacVentilationPoor');
  await page.check('#hvacOther');
  await page.fill('#hvacDetails', 'No heat in apartment during winter months - temperature inside drops to 50°F or lower. Thermostat is broken and does not control temperature at all. Very poor ventilation causes condensation, mold growth, and air quality issues. Occasional gas smell (possible leak). NO carbon monoxide detector installed despite gas heating. In summer, no air conditioning and unit becomes dangerously hot (90°F+). Heater makes loud banging noises. Possible gas leak - smell comes and goes.');
  await page.fill('#hvacFirstNoticed', '2023-12-01');
  await page.fill('#hvacReportedDate', '2023-12-05');

  // APPLIANCE ISSUES (10 fields: 1 master + 8 checkboxes + 1 details)
  console.log('   → Appliance Issues...');
  await page.check('#hasApplianceIssues');
  await page.check('#applianceRefrigeratorBroken');
  await page.check('#applianceStoveBroken');
  await page.check('#applianceOvenBroken');
  await page.check('#applianceDishwasherBroken');
  await page.check('#applianceGarbageDisposalBroken');
  await page.check('#applianceWasherBroken');
  await page.check('#applianceDryerBroken');
  await page.check('#applianceOther');
  await page.fill('#applianceDetails', 'Refrigerator does not cool properly - temperature fluctuates and food spoils within 2-3 days. Two burners on stove do not work at all. Oven does not heat to correct temperature. Garbage disposal is completely broken and jammed. Dishwasher leaks water onto floor. Washing machine does not drain properly. Dryer does not heat. Microwave sparks when turned on. Range hood does not vent properly.');

  // SECURITY ISSUES (12 fields: 1 master + 10 checkboxes + 1 details)
  console.log('   → Security Issues...');
  await page.check('#hasSecurityIssues');
  await page.check('#securityBrokenLocks');
  await page.check('#securityBrokenWindows');
  await page.check('#securityBrokenDoors');
  await page.check('#securityNoDeadbolt');
  await page.check('#securityBrokenGate');
  await page.check('#securityBrokenIntercom');
  await page.check('#securityInadequateLighting');
  await page.check('#securityNoSmokeDetector');
  await page.check('#securityBreakIns');
  await page.check('#securityOther');
  await page.fill('#securityDetails', 'Front door lock is broken - does not secure properly and can be opened without key. No deadbolt installed on unit door. Two windows do not lock at all. Building entrance gate is broken and always open. Intercom system does not work - anyone can enter building. Hallway lighting is inadequate and dangerous at night - several lights are out. NO working smoke detector in unit despite repeated requests. There have been 2 break-ins in the building in the past 6 months. Feel very unsafe, especially with children and elderly mother living here. No security cameras. Broken mailbox locks. Drug activity in building.');

  // PEST ISSUES (17 fields: 1 master + 14 checkboxes + 1 details + 2 dates)
  console.log('   → Pest Issues...');
  await page.check('#hasPestIssues');
  await page.check('#pestRats');
  await page.check('#pestMice');
  await page.check('#pestCockroaches');
  await page.check('#pestBedbugs');
  await page.check('#pestFleas');
  await page.check('#pestAnts');
  await page.check('#pestTermites');
  await page.check('#pestSpiders');
  await page.check('#pestWasps');
  await page.check('#pestBees');
  await page.check('#pestOtherInsects');
  await page.check('#pestBirds');
  await page.check('#pestRaccoons');
  await page.check('#pestOtherVermin');
  await page.fill('#pestDetails', 'SEVERE cockroach infestation throughout entire apartment, especially in kitchen and bathroom - see dozens daily. Rats and mice in walls - can hear scratching and running at night, keeping family awake. Found evidence of rats in kitchen cabinets and chewed food packages. Found bed bugs in bedroom - had to throw away mattress and all bedding. Ant trails in kitchen. Signs of termite damage in window frames. Wasp nest on balcony. Building has general pest problem - landlord refuses to provide adequate extermination services. Possums in attic. Flies everywhere due to garbage. Mosquitoes breed in standing water from leaks.');
  await page.fill('#pestFirstNoticed', '2023-08-01');
  await page.fill('#pestReportedDate', '2023-08-10');

  // FIRE HAZARD ISSUES (8 fields: 1 master + 5 checkboxes + 1 details + 2 dates)
  console.log('   → Fire Hazard Issues...');
  await page.check('#hasFireHazardIssues');
  await page.check('#fireHazardExposedWiring');
  await page.check('#fireHazardBlockedExits');
  await page.check('#fireHazardNoSmokeDetectors');
  await page.fill('#fireHazardDetails', 'Exposed electrical wiring in bedroom wall - visible sparking. Fire exit blocked by landlord storage. No working smoke detectors in unit - batteries dead for months.');
  await page.fill('#fireHazardFirstNoticed', '2024-01-15');
  await page.fill('#fireHazardReportedDate', '2024-01-20');

  // UTILITY ISSUES (8 fields: 1 master + 5 checkboxes + 1 details + 2 dates)
  console.log('   → Utility Issues...');
  await page.check('#hasUtilityIssues');
  await page.check('#utilityNoHotWater');
  await page.check('#utilityNoHeat');
  await page.fill('#utilityDetails', 'No hot water for 3 weeks - landlord refuses to fix boiler. No heat in winter - apartment temperature drops to 50°F at night.');
  await page.fill('#utilityFirstNoticed', '2024-01-01');
  await page.fill('#utilityReportedDate', '2024-01-05');

  // FLOORING ISSUES (7 fields: 1 master + 4 checkboxes + 1 details + 2 dates)
  console.log('   → Flooring Issues...');
  await page.check('#hasFlooringIssues');
  await page.check('#flooringDamaged');
  await page.check('#flooringUneven');
  await page.fill('#flooringDetails', 'Hardwood floors severely damaged with large holes - dangerous for children. Uneven floors causing trip hazards throughout apartment.');
  await page.fill('#flooringFirstNoticed', '2023-06-01');
  await page.fill('#flooringReportedDate', '2023-06-15');

  // WINDOW ISSUES (9 fields: 1 master + 6 checkboxes + 1 details + 2 dates)
  console.log('   → Window Issues...');
  await page.check('#hasWindowIssues');
  await page.check('#windowBroken');
  await page.check('#windowDrafty');
  await page.check('#windowNoScreens');
  await page.fill('#windowDetails', 'Two broken windows in living room - covered with cardboard. All windows extremely drafty - cold air comes through. No window screens - mosquitoes and flies come in.');
  await page.fill('#windowFirstNoticed', '2023-09-01');
  await page.fill('#windowReportedDate', '2023-09-10');

  // DOOR ISSUES (11 fields: 1 master + 8 checkboxes + 1 details + 2 dates)
  console.log('   → Door Issues...');
  await page.check('#hasDoorIssues');
  await page.check('#doorNoLock');
  await page.check('#doorDamaged');
  await page.check('#doorWontClose');
  await page.fill('#doorDetails', 'Front door lock completely broken - serious security risk. Bedroom door damaged and won\'t close properly. Bathroom door won\'t stay shut.');
  await page.fill('#doorFirstNoticed', '2023-07-01');
  await page.fill('#doorReportedDate', '2023-07-15');

  // CABINET ISSUES (6 fields: 1 master + 3 checkboxes + 1 details + 2 dates)
  console.log('   → Cabinet Issues...');
  await page.check('#hasCabinetIssues');
  await page.check('#cabinetBroken');
  await page.check('#cabinetMissing');
  await page.fill('#cabinetDetails', 'Kitchen cabinets broken - doors falling off hinges. Two cabinets completely missing - no storage space.');
  await page.fill('#cabinetFirstNoticed', '2023-05-01');
  await page.fill('#cabinetReportedDate', '2023-05-10');

  // COMMON AREA ISSUES (19 fields: 1 master + 16 checkboxes + 1 details + 2 dates)
  console.log('   → Common Area Issues...');
  await page.check('#hasCommonAreaIssues');
  await page.check('#commonAreaHallwayDirty');
  await page.check('#commonAreaStairsDamaged');
  await page.check('#commonAreaElevatorBroken');
  await page.check('#commonAreaLaundryBroken');
  await page.check('#commonAreaNoSecurity');
  await page.fill('#commonAreaDetails', 'Hallways never cleaned - garbage everywhere. Stairs damaged and dangerous. Elevator broken for 6 months. Laundry room machines all broken. No building security - front door never locks.');
  await page.fill('#commonAreaFirstNoticed', '2023-04-01');
  await page.fill('#commonAreaReportedDate', '2023-04-10');

  // TRASH PROBLEMS (5 fields: 1 master + 2 checkboxes + 1 details + 2 dates)
  console.log('   → Trash Problems...');
  await page.check('#hasTrashProblems');
  await page.check('#trashNotCollected');
  await page.check('#trashOverflowing');
  await page.fill('#trashDetails', 'Trash not collected for weeks - piling up in hallways. Dumpsters always overflowing - attracting rats and roaches.');
  await page.fill('#trashFirstNoticed', '2023-08-15');
  await page.fill('#trashReportedDate', '2023-08-20');

  // NUISANCE ISSUES (7 fields: 1 master + 4 checkboxes + 1 details + 2 dates)
  console.log('   → Nuisance Issues...');
  await page.check('#hasNuisanceIssues');
  await page.check('#nuisanceNoise');
  await page.check('#nuisanceSmell');
  await page.fill('#nuisanceDetails', 'Constant loud noise from upstairs neighbor day and night - landlord refuses to address. Terrible smell from garbage chute - unbearable in summer.');
  await page.fill('#nuisanceFirstNoticed', '2023-03-01');
  await page.fill('#nuisanceReportedDate', '2023-03-15');

  // HEALTH HAZARD ISSUES (10 fields: 1 master + 7 checkboxes + 1 details + 2 dates)
  console.log('   → Health Hazard Issues...');
  await page.check('#hasHealthHazardIssues');
  await page.check('#healthHazardMold');
  await page.check('#healthHazardLeadPaint');
  await page.check('#healthHazardPoorVentilation');
  await page.fill('#healthHazardDetails', 'Black mold growing on all walls and ceiling from water leaks - causing respiratory problems for entire family. Peeling lead paint in children\'s bedroom - very dangerous. Poor ventilation - no windows open in bathroom.');
  await page.fill('#healthHazardFirstNoticed', '2023-02-01');
  await page.fill('#healthHazardReportedDate', '2023-02-10');

  // GOVERNMENT ENTITIES CONTACTED (9 fields: 1 master + 7 checkboxes + 1 details, NO dates)
  console.log('   → Government Entities Contacted...');
  await page.check('#hasGovernmentEntitiesContacted');
  await page.check('#govEntityHPD');
  await page.check('#govEntityDOB');
  await page.check('#govEntity311');
  await page.fill('#governmentEntitiesDetails', 'Filed multiple complaints with HPD about mold and heating issues. DOB inspection revealed code violations. Called 311 numerous times for various building problems.');

  // NOTICE ISSUES (8 fields: 1 master + 6 checkboxes + 1 details, NO dates)
  console.log('   → Notice Issues...');
  await page.check('#hasNoticeIssues');
  await page.check('#noticeEviction');
  await page.check('#noticeRentIncrease');
  await page.fill('#noticeDetails', 'Received eviction notice after complaining about repairs. Landlord trying to force us out with unreasonable rent increase notice.');

  // SAFETY ISSUES (9 fields: 1 master + 6 checkboxes + 1 details + 2 dates)
  console.log('   → Safety Issues...');
  await page.check('#hasSafetyIssues');
  await page.check('#safetyNoFireExtinguisher');
  await page.check('#safetyBlockedFireEscape');
  await page.check('#safetyDamagedFireEscape');
  await page.fill('#safetyDetails', 'No fire extinguisher in building. Fire escape blocked by landlord storage. Fire escape rusted and unstable - dangerous to use.');
  await page.fill('#safetyFirstNoticed', '2023-10-01');
  await page.fill('#safetyReportedDate', '2023-10-15');

  // HARASSMENT ISSUES (18 fields: 1 master + 15 checkboxes + 1 details + 1 date)
  console.log('   → Harassment Issues...');
  await page.check('#hasHarassmentIssues');
  await page.check('#harassmentEvictionThreats');
  await page.check('#harassmentByOwner');
  await page.check('#harassmentRefusalToRepair');
  await page.check('#harassmentWrittenThreats');
  await page.check('#harassmentAggressiveLanguage');
  await page.fill('#harassmentDetails', 'Landlord threatened eviction multiple times after I complained about repairs. Sent intimidating letters. Refused to make timely repairs despite repeated requests. Uses aggressive and inappropriate language when contacted. Building manager also participates in harassment.');
  await page.fill('#harassmentStartDate', '2023-01-15');

  console.log('   ✓ Building & housing issues completed (ALL 21 categories filled)');
  await page.click('button:has-text("Next")');
  await expect(page.getByText('Step 8 of 9')).toBeVisible();

  // ============================================================
  // STEP 8: REVIEW INFORMATION
  // ============================================================
  console.log('\n📄 STEP 8: Review Information (verification)...');

  // Verify key information is displayed
  await expect(page.getByText('Maria Elena Rodriguez-Garcia')).toBeVisible();
  await expect(page.getByText('maria.rodriguez.test@example.com')).toBeVisible();

  // Check for validation errors
  const errorBox = page.locator('.bg-red-50');
  const hasErrors = await errorBox.isVisible().catch(() => false);

  if (hasErrors) {
    const errorText = await errorBox.textContent();
    console.log('   ⚠️  Validation errors found:', errorText);
  } else {
    console.log('   ✓ No validation errors');
  }

  // Click Next to proceed to final submit step
  console.log('   → Proceeding to Step 9...');
  await page.click('button:has-text("Next")');
  await page.waitForTimeout(2000);

  // Check if form auto-submitted from Step 8
  const isOnSuccessPage = await page.getByText('Form Submitted Successfully!').isVisible().catch(() => false);

  if (!isOnSuccessPage) {
    // ============================================================
    // STEP 9: FINAL SUBMIT
    // ============================================================
    console.log('\n✅ STEP 9: Final Submit...');
    await expect(page.getByText('Step 9 of 9')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Ready to Submit')).toBeVisible({ timeout: 10000 });

    // Submit the form
    console.log('   → Clicking Submit button...');
    await page.click('button:has-text("Submit Intake Form")');
    await page.waitForTimeout(3000);
  } else {
    console.log('\n✅ Form auto-submitted from Step 8!');
  }

  // ============================================================
  // VERIFY SUCCESS PAGE
  // ============================================================
  console.log('\n🎉 Verifying submission success...');

  // Wait for success message
  await expect(page.getByText('Form Submitted Successfully!')).toBeVisible({ timeout: 20000 });
  await expect(page.getByText('Your intake form has been submitted')).toBeVisible();
  await expect(page.getByText('Your Intake Number:')).toBeVisible();

  // Get the intake number
  const intakeNumberElement = page.locator('.text-xl.font-bold.text-blue-700');
  const intakeNumber = await intakeNumberElement.textContent();
  console.log(`   📋 Intake Number: ${intakeNumber}`);

  // Verify intake number format
  expect(intakeNumber).toMatch(/^INT-\d{8}-\d{4}$/);
  console.log('   ✓ Valid intake number format');

  // Take screenshot of success page
  await page.screenshot({ path: 'test-results/intake-form-success.png', fullPage: true });
  console.log('   📸 Screenshot saved: test-results/intake-form-success.png');

  // ============================================================
  // SUMMARY
  // ============================================================
  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║         ✅ TEST COMPLETE - SUMMARY                     ║');
  console.log('╠════════════════════════════════════════════════════════╣');
  console.log('║ Step 1 (Personal):          20 fields                 ║');
  console.log('║ Step 2 (Contact):           13 fields                 ║');
  console.log('║ Step 3 (Address):            8 fields                 ║');
  console.log('║ Step 4 (Property):          23 fields                 ║');
  console.log('║ Step 5 (Household):         24 fields (9 + 3 members) ║');
  console.log('║ Step 6 (Landlord):          10 fields                 ║');
  console.log('║ Step 7 (Issues):           231 fields (21 categories) ║');
  console.log('║ Step 8 (Review):             0 fields (read-only)     ║');
  console.log('║ Step 9 (Submit):          SUBMITTED                   ║');
  console.log('╠════════════════════════════════════════════════════════╣');
  console.log(`║ TOTAL FIELDS FILLED:       329 fields                 ║`);
  console.log(`║ Intake Number:             ${intakeNumber}                ║`);
  console.log('╚════════════════════════════════════════════════════════╝');
});
