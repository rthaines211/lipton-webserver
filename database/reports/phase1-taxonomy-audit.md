# Phase 1.1 Taxonomy Audit Report
**Date:** 2025-01-21
**Author:** Claude AI Assistant
**Status:** ✅ AUDIT COMPLETE

---

## Executive Summary

**Current State:**
- ❌ NO `issue_categories` table exists
- ❌ NO `issue_options` table exists
- ✅ Current intake schema uses flat tables with boolean fields
- ✅ Doc gen system (form-transformer.js) has complete, stable taxonomy

**Required Action:**
- Create `issue_categories` table with 21 categories
- Create `issue_options` table with 200+ individual options
- Create new intake tables that reference shared taxonomy
- Maintain backward compatibility with existing intake data

---

## Issue Categories Extracted from Doc Gen (form-transformer.js)

### Complete Taxonomy (21 Categories)

| # | Category Code | Category Name | Boolean Flag | Array Name | Option Count |
|---|--------------|---------------|--------------|------------|--------------|
| 1 | vermin | Vermin/Pests | VerminIssue | Vermin | 6 |
| 2 | insects | Insect Infestation | InsectIssues | Insects | 10 |
| 3 | hvac | HVAC Issues | HVACIssues | HVAC | 3 |
| 4 | electrical | Electrical Problems | ElectricalIssues | Electrical | 7 |
| 5 | fireHazard | Fire Hazards | FireHazardIssues | FireHazard | 5 |
| 6 | government | Government Contact | GovernmentEntityContacted | SpecificGovernmentEntityContacted | 7 |
| 7 | appliances | Appliance Issues | AppliancesIssues | Appliances | 7 |
| 8 | plumbing | Plumbing Problems | PlumbingIssues | Plumbing | 15 |
| 9 | cabinets | Cabinet Issues | CabinetsIssues | Cabinets | 3 |
| 10 | flooring | Flooring Problems | FlooringIssues | Flooring | 4 |
| 11 | windows | Window Issues | WindowsIssues | Windows | 6 |
| 12 | doors | Door Problems | DoorIssues | Doors | 8 |
| 13 | structure | Structural Issues | StructureIssues | Structure | 14 |
| 14 | commonAreas | Common Area Problems | CommonAreasIssues | CommonAreas | 16 |
| 15 | trash | Trash Problems | (none) | SelectTrashProblems | 2 |
| 16 | nuisance | Nuisance Issues | NuisanceIssues | Nuisance | 4 |
| 17 | healthHazard | Health Hazards | HealthHazardIssues | HealthHazard | 8 |
| 18 | harassment | Harassment | HarassmentIssues | Harassment | 15 |
| 19 | notices | Notices Received | (none) | SelectNoticesIssues | 6 |
| 20 | utility | Utility Interruptions | (none) | UtilityInterruptions | 5 |
| 21 | safety | Safety Issues | (none) | SelectSafetyIssues | 6 |

**Total:** 21 categories, ~150+ individual options

---

## Direct Boolean Flags (No Arrays)

These are standalone boolean fields without associated option arrays:

1. `InjuryIssues` - Physical injury issues
2. `NonresponsiveLandlordIssues` - Landlord non-responsiveness
3. `UnauthorizedEntries` - Unauthorized entry by landlord
4. `StolenItems` - Items stolen from unit
5. `DamagedItems` - Property damage to tenant belongings
6. `AgeDiscrimination` - Age-based discrimination
7. `RacialDiscrimination` - Race-based discrimination
8. `DisabilityDiscrimination` - Disability-based discrimination
9. `SecurityDeposit` - Security deposit issues

**Decision:** These will be added as standalone categories with no options.

---

## Detailed Category Breakdown

### 1. Vermin (vermin)
**Options:**
- RatsMice → "Rats/Mice"
- Skunks → "Skunks"
- Bats → "Bats"
- Raccoons → "Raccoons"
- Pigeons → "Pigeons"
- Opossums → "Opossums"

### 2. Insects (insects)
**Options:**
- Ants → "Ants"
- Roaches → "Roaches"
- Flies → "Flies"
- Bedbugs → "Bedbugs"
- Wasps → "Wasps"
- Hornets → "Hornets"
- Spiders → "Spiders"
- Termites → "Termites"
- Mosquitos → "Mosquitos"
- Bees → "Bees"

### 3. HVAC (hvac)
**Options:**
- AirConditioner → "Air conditioner"
- Heater → "Heater"
- Ventilation → "Ventilation"

### 4. Electrical (electrical)
**Options:**
- Outlets → "Outlets"
- Panel → "Panel"
- WallSwitches → "Wall switches"
- ExteriorLighting → "Exterior lighting"
- InteriorLighting → "Interior lighting"
- LightFixtures → "Light fixtures"
- Fans → "Fans"

### 5. Fire Hazard (fireHazard)
**Options:**
- SmokeAlarms → "Smoke alarms"
- FireExtinguisher → "Fire extinguisher"
- Noncompliantelectricity → "Non-compliant electricity"
- NonGFIoutletsnearwater → "Non-GFI outlets near water"
- Carbonmonoxidedetectors → "Carbon monoxide detectors"

### 6. Government Entity (government)
**Options:**
- HealthDepartment → "Health department"
- HousingAuthority → "Housing authority"
- CodeEnforcement → "Code enforcement"
- FireDepartment → "Fire department"
- PoliceDepartment → "Police department"
- DepartmentofEnvironmentalHealth → "Department of environmental health"
- DepartmentofHealthServices → "Department of health services"

### 7. Appliances (appliances)
**Options:**
- Stove → "Stove"
- Dishwasher → "Dishwasher"
- Washerdryer → "Washer/dryer"
- Oven → "Oven"
- Microwave → "Microwave"
- Garbagedisposal → "Garbage disposal"
- Refrigerator → "Refrigerator"

### 8. Plumbing (plumbing)
**Options:**
- Toilet → "Toilet"
- Insufficientwaterpressure → "Insufficient water pressure"
- Cloggedbath → "Clogged bath"
- Shower → "Shower"
- Nohotwater → "No hot water"
- Cloggedsinks → "Clogged sinks"
- Bath → "Bath"
- Nocoldwater → "No cold water"
- Cloggedshower → "Clogged shower"
- Fixtures → "Fixtures"
- Sewagecomingout → "Sewage coming out"
- NoCleanWaterSupply → "No Clean Water Supply"
- Leaks → "Leaks"
- Cloggedtoilets → "Clogged toilets"
- Unsanitarywater → "Unsanitary water"

### 9. Cabinets (cabinets)
**Options:**
- Broken → "Broken"
- Hinges → "Hinges"
- Alignment → "Alignment"

### 10. Flooring (flooring)
**Options:**
- Uneven → "Uneven"
- Carpet → "Carpet"
- Nailsstickingout → "Nails sticking out"
- Tiles → "Tiles"

### 11. Windows (windows)
**Options:**
- Broken → "Broken"
- Screens → "Screens"
- Leaks → "Leaks"
- Donotlock → "Do not lock"
- Missingwindows → "Missing windows"
- Brokenormissingscreens → "Broken or missing screens"

### 12. Doors (doors)
**Options:**
- Broken → "Broken"
- Knobs → "Knobs"
- Locks → "Locks"
- Brokenhinges → "Broken hinges"
- Slidingglassdoors → "Sliding glass doors"
- Ineffectivewaterproofing → "Ineffective waterproofing"
- Waterintrusionandorinsects → "Water intrusion and/or insects"
- Donotcloseproperly → "Do not close properly"

### 13. Structure (structure)
**Options:**
- Bumpsinceiling → "Bumps in ceiling"
- Holeinceiling → "Hole in ceiling"
- Waterstainsonceiling → "Water stains on ceiling"
- Waterstainsonwall → "Water stains on wall"
- Holeinwall → "Hole in wall"
- Paint → "Paint"
- Exteriordeckporch → "Exterior deck/porch"
- Waterprooftoilet → "Waterproof toilet"
- Waterprooftub → "Waterproof tub"
- Staircase → "Staircase"
- Basementflood → "Basement flood"
- Leaksingarage → "Leaks in garage"
- SoftSpotsduetoLeaks → "Soft spots due to leaks"
- UneffectiveWaterproofingofthetubsortoilet → "Ineffective waterproofing of the tubs or toilet"
- IneffectiveWeatherproofingofanywindows → "Ineffective Weatherproofing of any windows doors"

### 14. Common Areas (commonAreas)
**Options:**
- Mailboxbroken → "Mailbox broken"
- Parkingareaissues → "Parking area issues"
- Damagetocars → "Damage to cars"
- Flooding → "Flooding"
- Entrancesblocked → "Entrances blocked"
- Swimmingpool → "Swimming pool"
- Jacuzzi → "Jacuzzi"
- Laundryroom → "Laundry room"
- Recreationroom → "Recreation room"
- Gym → "Gym"
- Elevator → "Elevator"
- FilthRubbishGarbage → "Filth/Rubbish/Garbage"
- Vermin → "Vermin"
- Insects → "Insects"
- BrokenGate → "Broken gate"
- Blockedareasdoors → "Blocked areas/doors"

### 15. Trash (trash)
**Options:**
- Inadequatenumberofreceptacles → "Inadequate number of receptacles"
- Improperservicingemptying → "Improper servicing/emptying"

### 16. Nuisance (nuisance)
**Options:**
- Drugs → "Drugs"
- Smoking → "Smoking"
- Noisyneighbors → "Noisy neighbors"
- Gangs → "Gangs"

### 17. Health Hazard (healthHazard)
**Options:**
- Mold → "Mold"
- Mildew → "Mildew"
- Mushrooms → "Mushrooms"
- Rawsewageonexterior → "Raw sewage on exterior"
- Noxiousfumes → "Noxious fumes"
- Chemicalpaintcontamination → "Chemical/paint contamination"
- Toxicwaterpollution → "Toxic water pollution"
- Offensiveodors → "Offensive odors"

### 18. Harassment (harassment)
**Options:**
- UnlawfulDetainer → "Unlawful detainer"
- Evictionthreats → "Eviction threats"
- Bydefendant → "By defendant"
- Bymaintenancemanworkers → "By maintenance man/workers"
- Bymanagerbuildingstaff → "By manager/building staff"
- Byowner → "By owner"
- Othertenants → "Other tenants"
- Illegitimatenotices → "Illegitimate notices"
- Refusaltomaketimelyrepairs → "Refusal to make timely repairs"
- Writtenthreats → "Written threats"
- Aggressiveinappropriatelanguage → "Aggressive/inappropriate language"
- Physicalthreatsortouching → "Physical threats or touching"
- Noticessinglingoutonetenantbutnotuniformlygiventoalltenants → "Notices singling out one tenant, but not uniformly given to all tenants"
- Duplicativenotices → "Duplicative notices"
- UntimelyResponsefromLandlord → "Untimely response from landlord"

### 19. Notices (notices)
**Options:**
- 3day → "3-day"
- 24hour → "24-hour"
- 30day → "30-day"
- 60day → "60-day"
- Toquit → "To quit"
- Performorquit → "Perform or quit"

### 20. Utility (utility)
**Options:**
- Gasleak → "Gas leak"
- Watershutoffs → "Water shutoffs"
- Electricityshutoffs → "Electricity shutoffs"
- Heatshutoff → "Heat shutoff"
- Gasshutoff → "Gas shutoff"

### 21. Safety (safety)
**Options:**
- Brokeninoperablesecuritygate → "Broken/inoperable security gate"
- Brokendoors → "Broken doors"
- Unauthorizedentries → "Unauthorized entries"
- Brokenbuzzertogetin → "Broken buzzer to get in"
- Securitycameras → "Security cameras"
- Inoperablelocks → "Inoperable locks"

---

## Gap Analysis

### Current Database State

**Tables that exist:**
- ✅ client_intakes
- ✅ intake_page_1 through intake_page_5
- ✅ intake_submissions

**Tables that DON'T exist:**
- ❌ issue_categories
- ❌ issue_options
- ❌ intake_issue_selections
- ❌ intake_issue_metadata

### Required Actions

**Phase 1.2: Create Seed Data**
- Create CSV with 21 categories
- Create CSV with ~150+ options
- Assign display_order for consistent UI ordering

**Phase 1.3: Create Migrations**
- `002_create_shared_taxonomy.sql` - Create issue_categories and issue_options tables
- `003_create_intake_issue_tables.sql` - Create intake_issue_selections and intake_issue_metadata tables
- `004_add_delete_protection.sql` - Add ON DELETE RESTRICT constraints
- `005_add_category_validation.sql` - Add validation trigger

**Phase 1.4-1.6: Add Safeguards**
- Delete protection on foreign keys
- Category code validation trigger
- Comprehensive testing

---

## Compatibility Notes

### Doc Gen System Protection

**✅ ZERO CHANGES to doc gen system:**
- form-transformer.js - NO MODIFICATIONS
- Field mappings (lines 289-506) - READ ONLY
- Output structure (lines 176-225) - PRESERVED

**✅ Shared taxonomy approach:**
- Both systems read from same tables
- Doc gen continues to work unchanged
- Intake can be refactored independently

### Existing Intake Data

**Current schema uses flat tables:**
- `intake_building_issues` - Has boolean fields like `has_pest_issues`, `pests_rodents`, etc.
- `intake_utilities_issues` - Has boolean fields for utilities
- Other specialized tables

**Migration strategy:**
- Phase 1-2: Create new tables alongside old ones
- Phase 3: Refactor intake form to use new schema
- Phase 3C: Migrate existing data from old tables → new tables
- Phase 3C: Deprecate old tables

---

## Display Order Strategy

To maintain consistent UI across both systems, display order will match the order in form-transformer.js:

1. Vermin (display_order: 1)
2. Insects (display_order: 2)
3. HVAC (display_order: 3)
4. Electrical (display_order: 4)
5. Fire Hazard (display_order: 5)
6. Government Entity (display_order: 6)
7. Appliances (display_order: 7)
8. Plumbing (display_order: 8)
9. Cabinets (display_order: 9)
10. Flooring (display_order: 10)
11. Windows (display_order: 11)
12. Doors (display_order: 12)
13. Structure (display_order: 13)
14. Common Areas (display_order: 14)
15. Trash Problems (display_order: 15)
16. Nuisance (display_order: 16)
17. Health Hazard (display_order: 17)
18. Harassment (display_order: 18)
19. Notices (display_order: 19)
20. Utility Interruptions (display_order: 20)
21. Safety Issues (display_order: 21)

---

## Next Steps

✅ **Phase 1.1 COMPLETE** - Taxonomy audit finished

**Proceeding to Phase 1.2:**
1. Create `issue-categories.csv` seed data
2. Create `issue-options.csv` seed data
3. Verify data completeness

**Questions for stakeholder:**
None at this time. All necessary data extracted successfully from form-transformer.js.

---

**End of Report**
