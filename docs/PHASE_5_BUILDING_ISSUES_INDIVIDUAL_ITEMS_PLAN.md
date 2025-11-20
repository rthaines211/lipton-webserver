# Phase 5: Building Issues Individual Items Mapping

## Executive Summary

**Objective**: Map all 148 individual building issue checkboxes from client intake form to document generation form.

**Current Status**:
- ✅ Category toggle checkboxes (21 fields) - **COMPLETED**
- ⏳ Individual issue items (148 fields) - **PENDING APPROVAL**

**Timeline**: 5-6 working days

**Success Criteria**: 100% mapping coverage with comprehensive testing verification

---

## 1. Scope Overview

### What's Working Now
- All 21 category toggle checkboxes populate correctly
- Console verification shows: "Found 21 checked *-toggle-* checkboxes (doc-gen form)"
- Examples: `vermin-toggle-1`, `plumbing-toggle-1`, `electrical-toggle-1`

### What Needs Implementation
Map 148 individual issue checkboxes across 20 categories from:
- **Source**: Client intake JSONB fields (camelCase: `pestRats`, `plumbingToilet`)
- **Target**: Doc-gen form checkboxes (format: `{category}-{ItemNoSpaces}-{plaintiffId}`)
- **Reference**: `/docs/client-intake/INTAKE_TO_DOCGEN_MAPPING.MD` sections 5-24

---

## 2. Technical Specifications

### Field Naming Transformations

**Client Intake (JSONB)**:
```javascript
building_issues: {
  pestRats: true,
  plumbingToilet: true,
  electricalOutlets: true
}
```

**Doc-Gen Form (HTML)**:
```html
<input type="checkbox" id="vermin-RatsMice-1">
<input type="checkbox" id="plumbing-Toilet-1">
<input type="checkbox" id="electrical-Outlets-1">
```

**Transformation Rules**:
1. Remove special characters: `item.replace(/[^a-zA-Z0-9]/g, '')`
2. Examples:
   - "Rats / Mice" → "RatsMice"
   - "Toilet" → "Toilet"
   - "Air Conditioner" → "AirConditioner"

### Category Mapping Pattern

```javascript
// Backend: /routes/intakes-jsonb.js
'vermin-RatsMice-1': intake.building_issues?.pestRats || false,
'vermin-Bats-1': intake.building_issues?.pestBats || false,
'plumbing-Toilet-1': intake.building_issues?.plumbingToilet || false,
```

---

## 3. Complete Inventory (148 Checkboxes)

### Section 5: Plumbing Issues (12 items)
| Doc-Gen Field ID | Intake JSONB Field | Item Name |
|-----------------|-------------------|-----------|
| `plumbing-Toilet-1` | `plumbingToilet` | Toilet |
| `plumbing-Sink-1` | `plumbingSink` | Sink |
| `plumbing-Bathtub-1` | `plumbingBathtub` | Bathtub |
| `plumbing-Shower-1` | `plumbingShower` | Shower |
| `plumbing-WaterHeater-1` | `plumbingWaterHeater` | Water Heater |
| `plumbing-Faucets-1` | `plumbingFaucets` | Faucets |
| `plumbing-Pipes-1` | `plumbingPipes` | Pipes |
| `plumbing-Drainage-1` | `plumbingDrainage` | Drainage |
| `plumbing-Leaks-1` | `plumbingLeaks` | Leaks |
| `plumbing-Clogs-1` | `plumbingClogs` | Clogs |
| `plumbing-Pressure-1` | `plumbingPressure` | Pressure |
| `plumbing-SewerSmell-1` | `plumbingSewerSmell` | Sewer Smell |

### Section 6: Vermin Issues (6 items)
| Doc-Gen Field ID | Intake JSONB Field | Item Name |
|-----------------|-------------------|-----------|
| `vermin-RatsMice-1` | `pestRats` OR `pestMice` | Rats / Mice |
| `vermin-Bats-1` | `pestBats` | Bats |
| `vermin-Pigeons-1` | `pestPigeons` | Pigeons |
| `vermin-Skunks-1` | `pestSkunks` | Skunks |
| `vermin-Raccoons-1` | `pestRaccoons` | Raccoons |
| `vermin-Opossums-1` | `pestOpossums` | Opossums |

### Section 7: Insect Issues (10 items)
| Doc-Gen Field ID | Intake JSONB Field | Item Name |
|-----------------|-------------------|-----------|
| `insect-Ants-1` | `pestAnts` | Ants |
| `insect-Bedbugs-1` | `pestBedbugs` | Bedbugs |
| `insect-Spiders-1` | `pestSpiders` | Spiders |
| `insect-Mosquitos-1` | `pestMosquitos` | Mosquitos |
| `insect-Roaches-1` | `pestCockroaches` | Roaches |
| `insect-Wasps-1` | `pestWasps` | Wasps |
| `insect-Termites-1` | `pestTermites` | Termites |
| `insect-Bees-1` | `pestBees` | Bees |
| `insect-Flies-1` | `pestFlies` | Flies |
| `insect-Hornets-1` | `pestHornets` | Hornets |

### Section 8: Electrical Issues (7 items)
| Doc-Gen Field ID | Intake JSONB Field | Item Name |
|-----------------|-------------------|-----------|
| `electrical-Outlets-1` | `electricalOutlets` | Outlets |
| `electrical-Switches-1` | `electricalSwitches` | Switches |
| `electrical-Wiring-1` | `electricalWiring` | Wiring |
| `electrical-Breakers-1` | `electricalBreakers` | Breakers |
| `electrical-Lighting-1` | `electricalLighting` | Lighting |
| `electrical-Panel-1` | `electricalPanel` | Panel |
| `electrical-Fixtures-1` | `electricalFixtures` | Fixtures |

### Section 9: HVAC Issues (3 items)
| Doc-Gen Field ID | Intake JSONB Field | Item Name |
|-----------------|-------------------|-----------|
| `hvac-AirConditioner-1` | `hvacAirConditioner` | Air Conditioner |
| `hvac-Heater-1` | `hvacHeater` | Heater |
| `hvac-Ventilation-1` | `hvacVentilation` | Ventilation |

### Section 10: Appliance Issues (6 items)
| Doc-Gen Field ID | Intake JSONB Field | Item Name |
|-----------------|-------------------|-----------|
| `appliances-Refrigerator-1` | `appliancesRefrigerator` | Refrigerator |
| `appliances-Stove-1` | `appliancesStove` | Stove |
| `appliances-Oven-1` | `appliancesOven` | Oven |
| `appliances-Dishwasher-1` | `appliancesDishwasher` | Dishwasher |
| `appliances-GarbageDisposal-1` | `appliancesGarbageDisposal` | Garbage Disposal |
| `appliances-Microwave-1` | `appliancesMicrowave` | Microwave |

### Section 11: Health Hazard Issues (10 items)
| Doc-Gen Field ID | Intake JSONB Field | Item Name |
|-----------------|-------------------|-----------|
| `health-hazard-Mold-1` | `healthMold` | Mold |
| `health-hazard-Mildew-1` | `healthMildew` | Mildew |
| `health-hazard-LeadPaint-1` | `healthLeadPaint` | Lead Paint |
| `health-hazard-Asbestos-1` | `healthAsbestos` | Asbestos |
| `health-hazard-SewageBackup-1` | `healthSewageBackup` | Sewage Backup |
| `health-hazard-WaterDamage-1` | `healthWaterDamage` | Water Damage |
| `health-hazard-Flooding-1` | `healthFlooding` | Flooding |
| `health-hazard-GasLeak-1` | `healthGasLeak` | Gas Leak |
| `health-hazard-CarbonMonoxide-1` | `healthCarbonMonoxide` | Carbon Monoxide |
| `health-hazard-AirQuality-1` | `healthAirQuality` | Air Quality |

### Section 12: Structural Issues (10 items)
| Doc-Gen Field ID | Intake JSONB Field | Item Name |
|-----------------|-------------------|-----------|
| `structure-Foundation-1` | `structureFoundation` | Foundation |
| `structure-Walls-1` | `structureWalls` | Walls |
| `structure-Ceiling-1` | `structureCeiling` | Ceiling |
| `structure-Roof-1` | `structureRoof` | Roof |
| `structure-Stairs-1` | `structureStairs` | Stairs |
| `structure-Railings-1` | `structureRailings` | Railings |
| `structure-Balcony-1` | `structureBalcony` | Balcony |
| `structure-Porch-1` | `structurePorch` | Porch |
| `structure-Cracks-1` | `structureCracks` | Cracks |
| `structure-Sagging-1` | `structureSagging` | Sagging |

### Section 13: Flooring Issues (7 items)
| Doc-Gen Field ID | Intake JSONB Field | Item Name |
|-----------------|-------------------|-----------|
| `flooring-Carpet-1` | `flooringCarpet` | Carpet |
| `flooring-Tile-1` | `flooringTile` | Tile |
| `flooring-Hardwood-1` | `flooringHardwood` | Hardwood |
| `flooring-Linoleum-1` | `flooringLinoleum` | Linoleum |
| `flooring-Uneven-1` | `flooringUneven` | Uneven |
| `flooring-Damage-1` | `flooringDamage` | Damage |
| `flooring-Subfloor-1` | `flooringSubfloor` | Subfloor |

### Section 14: Cabinet Issues (4 items)
| Doc-Gen Field ID | Intake JSONB Field | Item Name |
|-----------------|-------------------|-----------|
| `cabinets-Kitchen-1` | `cabinetsKitchen` | Kitchen |
| `cabinets-Bathroom-1` | `cabinetsBathroom` | Bathroom |
| `cabinets-Counters-1` | `cabinetsCounters` | Counters |
| `cabinets-Hardware-1` | `cabinetsHardware` | Hardware |

### Section 15: Door Issues (5 items)
| Doc-Gen Field ID | Intake JSONB Field | Item Name |
|-----------------|-------------------|-----------|
| `door-Entry-1` | `doorEntry` | Entry |
| `door-Interior-1` | `doorInterior` | Interior |
| `door-Locks-1` | `doorLocks` | Locks |
| `door-Frames-1` | `doorFrames` | Frames |
| `door-Threshold-1` | `doorThreshold` | Threshold |

### Section 16: Window Issues (6 items)
| Doc-Gen Field ID | Intake JSONB Field | Item Name |
|-----------------|-------------------|-----------|
| `windows-Broken-1` | `windowsBroken` | Broken |
| `windows-Cracked-1` | `windowsCracked` | Cracked |
| `windows-Seals-1` | `windowsSeals` | Seals |
| `windows-Locks-1` | `windowsLocks` | Locks |
| `windows-Screens-1` | `windowsScreens` | Screens |
| `windows-Frames-1` | `windowsFrames` | Frames |

### Section 17: Fire Hazard Issues (5 items)
| Doc-Gen Field ID | Intake JSONB Field | Item Name |
|-----------------|-------------------|-----------|
| `fire-hazard-SmokeDetectors-1` | `fireHazardSmokeDetectors` | Smoke Detectors |
| `fire-hazard-CarbonMonoxideDetector-1` | `fireHazardCarbonMonoxideDetector` | Carbon Monoxide Detector |
| `fire-hazard-FireExtinguisher-1` | `safetyFireExtinguisher` | Fire Extinguisher |
| `fire-hazard-EmergencyExits-1` | `fireHazardEmergencyExits` | Emergency Exits |
| `fire-hazard-Uneffective-1` | `fireHazardIneffective` | Uneffective |

**⚠️ EDGE CASE NOTE**: "Uneffective" is a typo in doc-gen form but must be preserved for compatibility.

### Section 18: Nuisance Issues (8 items)
| Doc-Gen Field ID | Intake JSONB Field | Item Name |
|-----------------|-------------------|-----------|
| `nuisance-Noise-1` | `nuisanceNoise` | Noise |
| `nuisance-Odors-1` | `nuisanceOdors` | Odors |
| `nuisance-Pests-1` | `nuisancePests` | Pests |
| `nuisance-Vibrations-1` | `nuisanceVibrations` | Vibrations |
| `nuisance-Smoke-1` | `nuisanceSmoke` | Smoke |
| `nuisance-Light-1` | `nuisanceLight` | Light |
| `nuisance-Privacy-1` | `nuisancePrivacy` | Privacy |
| `nuisance-Access-1` | `nuisanceAccess` | Access |

### Section 19: Trash Issues (5 items)
| Doc-Gen Field ID | Intake JSONB Field | Item Name |
|-----------------|-------------------|-----------|
| `trash-Collection-1` | `trashCollection` | Collection |
| `trash-Bins-1` | `trashBins` | Bins |
| `trash-Disposal-1` | `trashDisposal` | Disposal |
| `trash-Overflowing-1` | `trashOverflowing` | Overflowing |
| `trash-Pests-1` | `trashPests` | Pests |

### Section 20: Common Area Issues (9 items)
| Doc-Gen Field ID | Intake JSONB Field | Item Name |
|-----------------|-------------------|-----------|
| `common-areas-Hallways-1` | `commonAreasHallways` | Hallways |
| `common-areas-Stairwells-1` | `commonAreasStairwells` | Stairwells |
| `common-areas-Elevators-1` | `commonAreasElevators` | Elevators |
| `common-areas-Laundry-1` | `commonAreasLaundry` | Laundry |
| `common-areas-Parking-1` | `commonAreasParking` | Parking |
| `common-areas-Mailboxes-1` | `commonAreasMailboxes` | Mailboxes |
| `common-areas-Lighting-1` | `commonAreasLighting` | Lighting |
| `common-areas-Cleanliness-1` | `commonAreasCleanliness` | Cleanliness |
| `common-areas-Security-1` | `commonAreasSecurity` | Security |

### Section 21: Notice Issues (7 items)
| Doc-Gen Field ID | Intake JSONB Field | Item Name |
|-----------------|-------------------|-----------|
| `notices-Eviction-1` | `noticesEviction` | Eviction |
| `notices-Rent-1` | `noticesRent` | Rent |
| `notices-Inspection-1` | `noticesInspection` | Inspection |
| `notices-Entry-1` | `noticesEntry` | Entry |
| `notices-Violation-1` | `noticesViolation` | Violation |
| `notices-Lease-1` | `noticesLease` | Lease |
| `notices-Legal-1` | `noticesLegal` | Legal |

### Section 22: Utility Issues (7 items)
| Doc-Gen Field ID | Intake JSONB Field | Item Name |
|-----------------|-------------------|-----------|
| `utility-Water-1` | `utilityWater` | Water |
| `utility-Gas-1` | `utilityGas` | Gas |
| `utility-Electric-1` | `utilityElectric` | Electric |
| `utility-Trash-1` | `utilityTrash` | Trash |
| `utility-Sewer-1` | `utilitySewer` | Sewer |
| `utility-Internet-1` | `utilityInternet` | Internet |
| `utility-Billing-1` | `utilityBilling` | Billing |

### Section 23: Safety Issues (8 items)
| Doc-Gen Field ID | Intake JSONB Field | Item Name |
|-----------------|-------------------|-----------|
| `safety-Railings-1` | `safetyRailings` | Railings |
| `safety-Lighting-1` | `safetyLighting` | Lighting |
| `safety-Locks-1` | `safetyLocks` | Locks |
| `safety-Security-1` | `safetySecurity` | Security |
| `safety-Cameras-1` | `safetyCameras` | Cameras |
| `safety-Gates-1` | `safetyGates` | Gates |
| `safety-Fencing-1` | `safetyFencing` | Fencing |
| `safety-Pool-1` | `safetyPool` | Pool |

### Section 24: Harassment Issues (7 items)
| Doc-Gen Field ID | Intake JSONB Field | Item Name |
|-----------------|-------------------|-----------|
| `harassment-Verbal-1` | `harassmentVerbal` | Verbal |
| `harassment-Physical-1` | `harassmentPhysical` | Physical |
| `harassment-Sexual-1` | `harassmentSexual` | Sexual |
| `harassment-Discrimination-1` | `harassmentDiscrimination` | Discrimination |
| `harassment-Retaliation-1` | `harassmentRetaliation` | Retaliation |
| `harassment-Intimidation-1` | `harassmentIntimidation` | Intimidation |
| `harassment-Threats-1` | `harassmentThreats` | Threats |

---

## 4. Edge Cases & Special Handling

### Combined Checkboxes
Some doc-gen items combine multiple intake fields:
```javascript
'vermin-RatsMice-1': intake.building_issues?.pestRats ||
                     intake.building_issues?.pestMice || false
```

### Cross-Category Items
Fire extinguisher field comes from safety category in intake:
```javascript
'fire-hazard-FireExtinguisher-1': intake.building_issues?.safetyFireExtinguisher || false
```

### Typo Preservation
Doc-gen has "Uneffective" instead of "Ineffective" - must preserve:
```javascript
'fire-hazard-Uneffective-1': intake.building_issues?.fireHazardIneffective || false
```

### Missing Fields
Some doc-gen items may not have corresponding intake fields - return `false`:
```javascript
'category-Item-1': false  // No intake field available
```

---

## 5. Implementation Phases

### Phase 3.1: High-Priority Categories (60 checkboxes)
**Priority**: Critical habitability issues
**Estimated Time**: 2 days

**Categories**:
1. ✅ Plumbing Issues (12 items) - Sections completed
2. ✅ Vermin Issues (6 items) - Section 6
3. ✅ Insect Issues (10 items) - Section 7
4. ✅ Electrical Issues (7 items) - Section 8
5. ✅ HVAC Issues (3 items) - Section 9
6. ✅ Health Hazard Issues (10 items) - Section 11
7. ✅ Structural Issues (12 items) - Section 12

**Deliverables**:
- Backend mapping in `/routes/intakes-jsonb.js`
- Console verification logging
- Unit test coverage for edge cases

### Phase 3.2: Medium-Priority Categories (48 checkboxes)
**Priority**: Important maintenance and safety issues
**Estimated Time**: 2 days

**Categories**:
1. ✅ Flooring Issues (7 items) - Section 13
2. ✅ Appliance Issues (6 items) - Section 10
3. ✅ Cabinet Issues (4 items) - Section 14
4. ✅ Door Issues (5 items) - Section 15
5. ✅ Window Issues (6 items) - Section 16
6. ✅ Fire Hazard Issues (5 items) - Section 17
7. ✅ Common Area Issues (9 items) - Section 20
8. ✅ Safety Issues (8 items) - Section 23

**Deliverables**:
- Backend mapping updates
- Visual verification checklist
- Integration testing

### Phase 3.3: Lower-Priority Categories (40 checkboxes)
**Priority**: Administrative and nuisance issues
**Estimated Time**: 1 day

**Categories**:
1. ✅ Nuisance Issues (8 items) - Section 18
2. ✅ Trash Issues (5 items) - Section 19
3. ✅ Notice Issues (7 items) - Section 21
4. ✅ Utility Issues (7 items) - Section 22
5. ✅ Harassment Issues (7 items) - Section 24

**Deliverables**:
- Complete backend mapping
- Full console verification
- End-to-end testing

### Phase 3.4: Testing & Verification
**Estimated Time**: 1-2 days

**Testing Strategy**:
1. **Console Verification**
   - Verify all 148 checkboxes populate
   - Check console logs for field population success
   - Validate field naming transformations

2. **Visual Checklist**
   - Load test intake in dev environment
   - Click "Load from Intake" button
   - Manually verify each category's items are checked
   - Screenshot verification for documentation

3. **Edge Case Testing**
   - Combined checkboxes (Rats/Mice)
   - Cross-category items (Fire extinguisher)
   - Typo preservation (Uneffective)
   - Missing fields return false

4. **Playwright Automated Testing**
   - Create test intake with all 148 items checked
   - Load into doc-gen form
   - Assert all checkboxes populate correctly
   - Generate test report

**Quality Assurance Checklist**:
- [ ] All 148 checkboxes mapped in backend
- [ ] Console shows successful population
- [ ] Visual verification complete (screenshot evidence)
- [ ] Edge cases handled correctly
- [ ] Playwright tests pass
- [ ] No regression in category toggle functionality
- [ ] Code review completed
- [ ] Documentation updated

---

## 6. Files to Modify

### `/routes/intakes-jsonb.js`
**Lines**: ~792-813 (current category toggles) + ~150 new lines for individual items
**Changes**: Add 148 individual checkbox mappings below existing category toggles

**Example Addition**:
```javascript
// Individual Plumbing Items (Section 5)
'plumbing-Toilet-1': intake.building_issues?.plumbingToilet || false,
'plumbing-Sink-1': intake.building_issues?.plumbingSink || false,
'plumbing-Bathtub-1': intake.building_issues?.plumbingBathtub || false,
// ... (12 total plumbing items)

// Individual Vermin Items (Section 6)
'vermin-RatsMice-1': intake.building_issues?.pestRats ||
                     intake.building_issues?.pestMice || false,
'vermin-Bats-1': intake.building_issues?.pestBats || false,
// ... (6 total vermin items)

// Continue for all 20 categories...
```

### `/js/intake-modal.js`
**Lines**: ~344, ~440-457 (already updated for category toggles)
**Changes**: No changes needed - existing checkbox handling will work for individual items

### Console Verification
**Lines**: ~382-388 (existing verification logging)
**Changes**: Update to show individual checkbox count
```javascript
const checkedToggles = document.querySelectorAll('input[type="checkbox"][id*="-toggle-"]:checked');
const checkedIndividualItems = document.querySelectorAll('input[type="checkbox"][id*="-"]:not([id*="-toggle-"]):checked');
console.log(`Found ${checkedToggles.length} category toggles checked`);
console.log(`Found ${checkedIndividualItems.length} individual items checked`);
```

---

## 7. Testing Requirements

### Unit Tests
Create `/tests/building-issues-mapping.test.js`:
```javascript
describe('Building Issues Individual Items Mapping', () => {
  test('Combined checkboxes (Rats/Mice)', () => {
    const intake = { building_issues: { pestRats: true, pestMice: false } };
    const result = transformToDocGen(intake);
    expect(result['vermin-RatsMice-1']).toBe(true);
  });

  test('Cross-category items (Fire extinguisher)', () => {
    const intake = { building_issues: { safetyFireExtinguisher: true } };
    const result = transformToDocGen(intake);
    expect(result['fire-hazard-FireExtinguisher-1']).toBe(true);
  });

  test('Typo preservation (Uneffective)', () => {
    const intake = { building_issues: { fireHazardIneffective: true } };
    const result = transformToDocGen(intake);
    expect(result['fire-hazard-Uneffective-1']).toBe(true);
  });

  test('Missing fields return false', () => {
    const intake = { building_issues: {} };
    const result = transformToDocGen(intake);
    expect(result['plumbing-Toilet-1']).toBe(false);
  });
});
```

### Integration Test
Create comprehensive test intake with all 148 items checked:
```bash
# Test data creation script
node scripts/create-full-building-issues-test-intake.js
```

### Playwright E2E Test
```javascript
// tests/e2e/building-issues-load.spec.js
test('Load all 148 building issues from intake', async ({ page }) => {
  // Navigate to doc-gen form
  await page.goto('/index.html');

  // Load test intake with all items
  await page.click('button[data-test="load-from-intake"]');
  await page.selectOption('select[name="intake-id"]', 'test-all-issues');

  // Verify all 148 checkboxes are checked
  const checkedCount = await page.locator('input[type="checkbox"]:checked:not([id*="-toggle-"])').count();
  expect(checkedCount).toBe(148);

  // Verify specific categories
  expect(await page.locator('#plumbing-Toilet-1').isChecked()).toBe(true);
  expect(await page.locator('#vermin-RatsMice-1').isChecked()).toBe(true);
  expect(await page.locator('#electrical-Outlets-1').isChecked()).toBe(true);

  // Take screenshot for documentation
  await page.screenshot({ path: 'test-results/all-issues-loaded.png' });
});
```

---

## 8. Success Criteria

### Definition of Done
- [ ] All 148 individual checkbox mappings implemented in backend
- [ ] Console verification shows correct population count
- [ ] Visual verification complete with screenshot evidence
- [ ] All edge cases handled correctly
- [ ] Unit tests pass (100% coverage for edge cases)
- [ ] Integration tests pass
- [ ] Playwright E2E tests pass
- [ ] No regression in category toggle functionality (21 toggles still work)
- [ ] Code review completed and approved
- [ ] Documentation updated in MAPPING.MD
- [ ] Deployed to dev environment
- [ ] Attorney testing and sign-off

### Verification Metrics
- **Backend Coverage**: 148/148 fields mapped (100%)
- **Console Output**: "Found 21 category toggles checked" + "Found 148 individual items checked"
- **Visual Verification**: Manual check of all 20 categories
- **Test Coverage**: 100% for edge cases, 95%+ overall
- **Regression Testing**: Category toggles remain functional

---

## 9. Risk Mitigation

### Potential Issues
1. **Missing JSONB fields**: Some doc-gen items may not have intake equivalents
   - **Mitigation**: Return `false` for missing fields, document in code comments

2. **Field name mismatches**: Transformation may not match exactly
   - **Mitigation**: Extensive console logging, visual verification checklist

3. **Regression**: Category toggles break during implementation
   - **Mitigation**: Don't modify existing toggle code, add individual items separately

4. **Performance**: 148+ field mappings may slow API response
   - **Mitigation**: Monitor response times, optimize if needed

### Rollback Plan
If critical issues arise:
1. Git revert to last working commit (category toggles functional)
2. Redeploy previous version to dev environment
3. Investigate issues in local environment
4. Create hotfix branch for targeted resolution

---

## 10. Timeline & Resource Allocation

### Detailed Schedule
- **Day 1**: Phase 3.1 implementation (Plumbing, Vermin, Insect, Electrical, HVAC, Health Hazard, Structure)
- **Day 2**: Phase 3.1 testing + Phase 3.2 start (Flooring, Appliances, Cabinets)
- **Day 3**: Phase 3.2 completion (Doors, Windows, Fire Hazard, Common Areas, Safety)
- **Day 4**: Phase 3.3 implementation (Nuisance, Trash, Notices, Utility, Harassment)
- **Day 5**: Phase 3.4 comprehensive testing
- **Day 6**: Buffer for fixes, attorney testing, documentation

### Checkpoints
- **End of Day 1**: 60 checkboxes working, console shows correct count
- **End of Day 3**: 108 checkboxes working, visual verification complete for high/medium priority
- **End of Day 4**: All 148 checkboxes implemented
- **End of Day 5**: All tests passing, ready for attorney review
- **End of Day 6**: Sign-off received, deployment to staging

---

## 11. Approval & Next Steps

### Approval Checklist
Please review and approve the following:
- [ ] **Scope**: All 148 checkboxes across 20 categories
- [ ] **Phasing**: High → Medium → Low → Testing approach
- [ ] **Edge Cases**: Combined fields, cross-category items, typo preservation, missing fields
- [ ] **Testing Strategy**: Console verification, visual checklist, unit tests, Playwright E2E
- [ ] **Timeline**: 5-6 working days acceptable
- [ ] **Success Criteria**: 100% mapping coverage with comprehensive testing

### Upon Approval
Once approved, I will:
1. Begin Phase 3.1 implementation (high-priority categories)
2. Update `/routes/intakes-jsonb.js` with 60 checkbox mappings
3. Add console verification for individual items
4. Create unit tests for edge cases
5. Provide progress updates at each checkpoint

### Questions for Clarification
- Are there any specific categories that should be prioritized differently?
- Do you want daily progress reports or checkpoint-based updates?
- Should Playwright tests be created during implementation or in Phase 3.4?
- Any specific attorneys who should review before final deployment?

---

## Appendix: Reference Documentation

- **Mapping Specification**: `/docs/client-intake/INTAKE_TO_DOCGEN_MAPPING.MD`
- **Intake Component**: `/client-intake/src/components/BuildingIssuesCompact.tsx`
- **Backend API**: `/routes/intakes-jsonb.js` (lines 792-813 for category toggles)
- **Frontend Logic**: `/js/intake-modal.js` (lines 344, 440-457 for population)
- **Doc-Gen Form**: `/index.html` (lines 5246-5360 for categories, line 5385+ for checkbox generation)

---

**Plan Status**: ⏳ **AWAITING APPROVAL**

**Created**: 2025-01-20
**Last Updated**: 2025-01-20
**Version**: 1.0
