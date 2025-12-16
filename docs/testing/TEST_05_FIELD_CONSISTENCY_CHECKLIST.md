# TEST 05: Field Consistency Checklist - Master Verification Matrix

**Purpose:** Comprehensive field-by-field verification matrix to ensure 100% consistency between intake form and doc gen form.

**Time Required:** 20-30 minutes

**Prerequisites:**
- TEST_04 completed (intake loaded into doc gen)
- Doc gen form still open with populated data
- Browser DevTools open
- `/tmp/intake-docgen-format.json` available

**What This Test Does:**
- Provides a comprehensive checklist of every single field
- Documents exact mapping from intake → doc gen
- Catches edge cases and missing mappings
- Creates a permanent record of field coverage

---

## How to Use This Checklist

For each section below:

1. **Find the field** in the doc gen form
2. **Verify the value** matches expected data from TEST_02
3. **Check the box** ✅ if correct
4. **Mark ❌** if missing, wrong, or not mapped
5. **Note any issues** in the "Issues" column

---

## Section 1: Property Information (11 fields)

| # | Intake Field | Doc Gen Field ID | Expected Value | ✅/❌ | Issues |
|---|--------------|------------------|----------------|-------|--------|
| 1 | Property Street Address | `property-address` | 123 Main Street | [ ] | |
| 2 | Unit Number | `apartment-unit` | Apt 4B | [ ] | |
| 3 | City | `city` | Los Angeles | [ ] | |
| 4 | State | `state` | California | [ ] | |
| 5 | ZIP Code | `zip-code` | 90001 | [ ] | |
| 6 | County | `county` or `filing-county` | Los Angeles | [ ] | |
| 7 | Filing City | `filing-city` | Los Angeles | [ ] | |
| 8 | Filing County | `filing-county` | Los Angeles | [ ] | |
| 9 | Units in Building | `units-in-building` | 24 | [ ] | |
| 10 | Monthly Rent | `monthly-rent` or `current-rent` | 1800 | [ ] | |
| 11 | Unit (for issues) | `unit` | Apt 4B | [ ] | |

**Section Total:** _____ / 11 fields

**Issues Found:**
_______________________________________

---

## Section 2: Plaintiff Information (10 fields)

| # | Intake Field | Doc Gen Field ID | Expected Value | ✅/❌ | Issues |
|---|--------------|------------------|----------------|-------|--------|
| 1 | First Name | `plaintiff-1-first-name` | John | [ ] | |
| 2 | Last Name | `plaintiff-1-last-name` | Doe | [ ] | |
| 3 | Full Name | `plaintiff-1-firstname-lastname` | John Doe | [ ] | |
| 4 | Phone | `plaintiff-1-phone` | (555) 123-4567 | [ ] | |
| 5 | Email | `plaintiff-1-email` | john.doe.test@example.com | [ ] | |
| 6 | Date of Birth | `plaintiff-1-date-of-birth` | 01/15/1985 | [ ] | |
| 7 | Age | `plaintiff-1-age` | 39 (calculated) | [ ] | |
| 8 | Is Adult | `plaintiff-1-is-adult` | true | [ ] | |
| 9 | Head of Household | `plaintiff-1-head-of-household` | true | [ ] | |
| 10 | Age Category | `plaintiff-1-age-category` | Adult | [ ] | |

**Section Total:** _____ / 10 fields

**Issues Found:**
_______________________________________

---

## Section 3: Building Issues - Category Toggles (21 toggles)

| # | Category | Toggle Field ID | Should Be | ✅/❌ | Issues |
|---|----------|----------------|-----------|-------|--------|
| 1 | Vermin | `vermin-toggle-1` | ON/true | [ ] | |
| 2 | Insects | `insect-toggle-1` | ON/true | [ ] | |
| 3 | HVAC | `hvac-toggle-1` | ON/true | [ ] | |
| 4 | Electrical | `electrical-toggle-1` | ON/true | [ ] | |
| 5 | Fire Hazard | `fire-hazard-toggle-1` | ON/true | [ ] | |
| 6 | Government | `government-toggle-1` | ON/true | [ ] | |
| 7 | Appliances | `appliances-toggle-1` | ON/true | [ ] | |
| 8 | Plumbing | `plumbing-toggle-1` | ON/true | [ ] | |
| 9 | Cabinets | `cabinets-toggle-1` | ON/true | [ ] | |
| 10 | Flooring | `flooring-toggle-1` | ON/true | [ ] | |
| 11 | Windows | `windows-toggle-1` | ON/true | [ ] | |
| 12 | Doors | `door-toggle-1` | ON/true | [ ] | |
| 13 | Structure | `structure-toggle-1` | ON/true | [ ] | |
| 14 | Common Areas | `common-areas-toggle-1` | ON/true | [ ] | |
| 15 | Trash | `trash-toggle-1` | ON/true | [ ] | |
| 16 | Nuisance | `nuisance-toggle-1` | ON/true | [ ] | |
| 17 | Health Hazard | `health-hazard-toggle-1` | ON/true | [ ] | |
| 18 | Harassment | `harassment-toggle-1` | ON/true | [ ] | |
| 19 | Notices | `notices-toggle-1` | ON/true | [ ] | |
| 20 | Utility | `utility-toggle-1` | ON/true | [ ] | |
| 21 | Safety | `safety-toggle-1` | ON/true | [ ] | |

**Section Total:** _____ / 21 toggles

**Issues Found:**
_______________________________________

---

## Section 4: Vermin Checkboxes (6 checkboxes)

| # | Checkbox | Field ID | Should Be | ✅/❌ | Issues |
|---|----------|----------|-----------|-------|--------|
| 1 | Rats/Mice | `vermin-RatsMice-1` | CHECKED | [ ] | |
| 2 | Bats | `vermin-Bats-1` | CHECKED | [ ] | |
| 3 | Pigeons | `vermin-Pigeons-1` | CHECKED | [ ] | |
| 4 | Skunks | `vermin-Skunks-1` | CHECKED | [ ] | |
| 5 | Raccoons | `vermin-Raccoons-1` | CHECKED | [ ] | |
| 6 | Opossums | `vermin-Opossums-1` | CHECKED | [ ] | |

**Section Total:** _____ / 6 checkboxes

---

## Section 5: Insect Checkboxes (10 checkboxes)

| # | Checkbox | Field ID | Should Be | ✅/❌ | Issues |
|---|----------|----------|-----------|-------|--------|
| 1 | Ants | `insect-Ants-1` | CHECKED | [ ] | |
| 2 | Roaches | `insect-Roaches-1` | CHECKED | [ ] | |
| 3 | Flies | `insect-Flies-1` | CHECKED | [ ] | |
| 4 | Bedbugs | `insect-Bedbugs-1` | CHECKED | [ ] | |
| 5 | Wasps | `insect-Wasps-1` | CHECKED | [ ] | |
| 6 | Hornets | `insect-Hornets-1` | CHECKED | [ ] | |
| 7 | Spiders | `insect-Spiders-1` | CHECKED | [ ] | |
| 8 | Termites | `insect-Termites-1` | CHECKED | [ ] | |
| 9 | Mosquitos | `insect-Mosquitos-1` | CHECKED | [ ] | |
| 10 | Bees | `insect-Bees-1` | CHECKED | [ ] | |

**Section Total:** _____ / 10 checkboxes

---

## Section 6: HVAC Checkboxes (3 checkboxes)

| # | Checkbox | Field ID | Should Be | ✅/❌ | Issues |
|---|----------|----------|-----------|-------|--------|
| 1 | Air conditioner | `hvac-AirConditioner-1` | CHECKED | [ ] | |
| 2 | Heater | `hvac-Heater-1` | CHECKED | [ ] | |
| 3 | Ventilation | `hvac-Ventilation-1` | CHECKED | [ ] | |

**Section Total:** _____ / 3 checkboxes

---

## Section 7: Electrical Checkboxes (7 checkboxes)

| # | Checkbox | Field ID | Should Be | ✅/❌ | Issues |
|---|----------|----------|-----------|-------|--------|
| 1 | Outlets | `electrical-Outlets-1` | CHECKED | [ ] | |
| 2 | Panel | `electrical-Panel-1` | CHECKED | [ ] | |
| 3 | Wall switches | `electrical-WallSwitches-1` | CHECKED | [ ] | |
| 4 | Exterior lighting | `electrical-ExteriorLighting-1` | CHECKED | [ ] | |
| 5 | Interior lighting | `electrical-InteriorLighting-1` | CHECKED | [ ] | |
| 6 | Light fixtures | `electrical-LightFixtures-1` | CHECKED | [ ] | |
| 7 | Fans | `electrical-Fans-1` | CHECKED | [ ] | |

**Section Total:** _____ / 7 checkboxes

---

## Section 8: Fire Hazard Checkboxes (5 checkboxes)

| # | Checkbox | Field ID | Should Be | ✅/❌ | Issues |
|---|----------|----------|-----------|-------|--------|
| 1 | Smoke alarms | `fire-hazard-SmokeAlarms-1` | CHECKED | [ ] | |
| 2 | Fire extinguisher | `fire-hazard-FireExtinguisher-1` | CHECKED | [ ] | |
| 3 | Non-compliant electricity | `fire-hazard-Noncompliantelectricity-1` | CHECKED | [ ] | |
| 4 | Non-GFI outlets near water | `fire-hazard-NonGFIoutletsnearwater-1` | CHECKED | [ ] | |
| 5 | Carbon monoxide detectors | `fire-hazard-Carbonmonoxidedetectors-1` | CHECKED | [ ] | |

**Section Total:** _____ / 5 checkboxes

---

## Section 9: Government Contact Checkboxes (7 checkboxes)

| # | Checkbox | Field ID | Should Be | ✅/❌ | Issues |
|---|----------|----------|-----------|-------|--------|
| 1 | Health department | `government-HealthDepartment-1` | CHECKED | [ ] | |
| 2 | Housing authority | `government-HousingAuthority-1` | CHECKED | [ ] | |
| 3 | Code enforcement | `government-CodeEnforcement-1` | CHECKED | [ ] | |
| 4 | Fire department | `government-FireDepartment-1` | CHECKED | [ ] | |
| 5 | Police department | `government-PoliceDepartment-1` | CHECKED | [ ] | |
| 6 | Dept of environmental health | `government-DepartmentofEnvironmentalHealth-1` | CHECKED | [ ] | |
| 7 | Dept of health services | `government-DepartmentofHealthServices-1` | CHECKED | [ ] | |

**Section Total:** _____ / 7 checkboxes

---

## Section 10: Appliances Checkboxes (7 checkboxes)

| # | Checkbox | Field ID | Should Be | ✅/❌ | Issues |
|---|----------|----------|-----------|-------|--------|
| 1 | Stove | `appliances-Stove-1` | CHECKED | [ ] | |
| 2 | Dishwasher | `appliances-Dishwasher-1` | CHECKED | [ ] | |
| 3 | Washer/dryer | `appliances-Washerdryer-1` | CHECKED | [ ] | |
| 4 | Oven | `appliances-Oven-1` | CHECKED | [ ] | |
| 5 | Microwave | `appliances-Microwave-1` | CHECKED | [ ] | |
| 6 | Garbage disposal | `appliances-Garbagedisposal-1` | CHECKED | [ ] | |
| 7 | Refrigerator | `appliances-Refrigerator-1` | CHECKED | [ ] | |

**Section Total:** _____ / 7 checkboxes

---

## Section 11: Plumbing Checkboxes (15 checkboxes) ⭐

| # | Checkbox | Field ID | Should Be | ✅/❌ | Issues |
|---|----------|----------|-----------|-------|--------|
| 1 | Toilet | `plumbing-Toilet-1` | CHECKED | [ ] | |
| 2 | Insufficient water pressure | `plumbing-Insufficientwaterpressure-1` | CHECKED | [ ] | |
| 3 | Clogged bath | `plumbing-Cloggedbath-1` | CHECKED | [ ] | |
| 4 | Shower | `plumbing-Shower-1` | CHECKED | [ ] | |
| 5 | No hot water | `plumbing-Nohotwater-1` | CHECKED | [ ] | |
| 6 | Clogged sinks | `plumbing-Cloggedsinks-1` | CHECKED | [ ] | |
| 7 | Bath | `plumbing-Bath-1` | CHECKED | [ ] | |
| 8 | No cold water | `plumbing-Nocoldwater-1` | CHECKED | [ ] | |
| 9 | Clogged shower | `plumbing-Cloggedshower-1` | CHECKED | [ ] | |
| 10 | Fixtures | `plumbing-Fixtures-1` | CHECKED | [ ] | |
| 11 | Sewage coming out | `plumbing-Sewagecomingout-1` | CHECKED | [ ] | |
| 12 | No clean water supply | `plumbing-NoCleanWaterSupply-1` | CHECKED | [ ] | |
| 13 | Leaks | `plumbing-Leaks-1` | CHECKED | [ ] | |
| 14 | Clogged toilets | `plumbing-Cloggedtoilets-1` | CHECKED | [ ] | |
| 15 | Unsanitary water | `plumbing-Unsanitarywater-1` | CHECKED | [ ] | |

**Section Total:** _____ / 15 checkboxes

---

## Section 12: Cabinet Checkboxes (3 checkboxes)

| # | Checkbox | Field ID | Should Be | ✅/❌ | Issues |
|---|----------|----------|-----------|-------|--------|
| 1 | Broken | `cabinets-Broken-1` | CHECKED | [ ] | |
| 2 | Hinges | `cabinets-Hinges-1` | CHECKED | [ ] | |
| 3 | Alignment | `cabinets-Alignment-1` | CHECKED | [ ] | |

**Section Total:** _____ / 3 checkboxes

---

## Section 13: Flooring Checkboxes (4 checkboxes)

| # | Checkbox | Field ID | Should Be | ✅/❌ | Issues |
|---|----------|----------|-----------|-------|--------|
| 1 | Uneven | `flooring-Uneven-1` | CHECKED | [ ] | |
| 2 | Carpet | `flooring-Carpet-1` | CHECKED | [ ] | |
| 3 | Nails sticking out | `flooring-Nailsstickingout-1` | CHECKED | [ ] | |
| 4 | Tiles | `flooring-Tiles-1` | CHECKED | [ ] | |

**Section Total:** _____ / 4 checkboxes

---

## Section 14: Window Checkboxes (6 checkboxes)

| # | Checkbox | Field ID | Should Be | ✅/❌ | Issues |
|---|----------|----------|-----------|-------|--------|
| 1 | Broken | `windows-Broken-1` | CHECKED | [ ] | |
| 2 | Screens | `windows-Screens-1` | CHECKED | [ ] | |
| 3 | Leaks | `windows-Leaks-1` | CHECKED | [ ] | |
| 4 | Do not lock | `windows-Donotlock-1` | CHECKED | [ ] | |
| 5 | Missing windows | `windows-Missingwindows-1` | CHECKED | [ ] | |
| 6 | Broken or missing screens | `windows-Brokenormissingscreens-1` | CHECKED | [ ] | |

**Section Total:** _____ / 6 checkboxes

---

## Section 15: Door Checkboxes (8 checkboxes)

| # | Checkbox | Field ID | Should Be | ✅/❌ | Issues |
|---|----------|----------|-----------|-------|--------|
| 1 | Broken | `door-Broken-1` | CHECKED | [ ] | |
| 2 | Knobs | `door-Knobs-1` | CHECKED | [ ] | |
| 3 | Locks | `door-Locks-1` | CHECKED | [ ] | |
| 4 | Broken hinges | `door-Brokenhinges-1` | CHECKED | [ ] | |
| 5 | Sliding glass doors | `door-Slidingglassdoors-1` | CHECKED | [ ] | |
| 6 | Ineffective waterproofing | `door-Ineffectivewaterproofing-1` | CHECKED | [ ] | |
| 7 | Water intrusion and/or insects | `door-Waterintrusionandorinsects-1` | CHECKED | [ ] | |
| 8 | Do not close properly | `door-Donotcloseproperly-1` | CHECKED | [ ] | |

**Section Total:** _____ / 8 checkboxes

---

## Section 16: Structural Checkboxes (15 checkboxes) ⭐

| # | Checkbox | Field ID | Should Be | ✅/❌ | Issues |
|---|----------|----------|-----------|-------|--------|
| 1 | Bumps in ceiling | `structure-Bumpsinceiling-1` | CHECKED | [ ] | |
| 2 | Hole in ceiling | `structure-Holeinceiling-1` | CHECKED | [ ] | |
| 3 | Water stains on ceiling | `structure-Waterstainsonceiling-1` | CHECKED | [ ] | |
| 4 | Water stains on wall | `structure-Waterstainsonwall-1` | CHECKED | [ ] | |
| 5 | Hole in wall | `structure-Holeinwall-1` | CHECKED | [ ] | |
| 6 | Paint | `structure-Paint-1` | CHECKED | [ ] | |
| 7 | Exterior deck/porch | `structure-Exteriordeckporch-1` | CHECKED | [ ] | |
| 8 | Waterproof toilet | `structure-Waterprooftoilet-1` | CHECKED | [ ] | |
| 9 | Waterproof tub | `structure-Waterprooftub-1` | CHECKED | [ ] | |
| 10 | Staircase | `structure-Staircase-1` | CHECKED | [ ] | |
| 11 | Basement flood | `structure-Basementflood-1` | CHECKED | [ ] | |
| 12 | Leaks in garage | `structure-Leaksingarage-1` | CHECKED | [ ] | |
| 13 | Soft spots due to leaks | `structure-SoftSpotsduetoLeaks-1` | CHECKED | [ ] | |
| 14 | Ineffective waterproofing tubs/toilet | `structure-UneffectiveWaterproofingofthetubsortoilet-1` | CHECKED | [ ] | |
| 15 | Ineffective weatherproofing windows | `structure-IneffectiveWeatherproofingofanywindows-1` | CHECKED | [ ] | |

**Section Total:** _____ / 15 checkboxes

---

## Section 17: Common Area Checkboxes (16 checkboxes) ⭐

| # | Checkbox | Field ID | Should Be | ✅/❌ | Issues |
|---|----------|----------|-----------|-------|--------|
| 1 | Mailbox broken | `common-areas-Mailboxbroken-1` | CHECKED | [ ] | |
| 2 | Parking area issues | `common-areas-Parkingareaissues-1` | CHECKED | [ ] | |
| 3 | Damage to cars | `common-areas-Damagetocars-1` | CHECKED | [ ] | |
| 4 | Flooding | `common-areas-Flooding-1` | CHECKED | [ ] | |
| 5 | Entrances blocked | `common-areas-Entrancesblocked-1` | CHECKED | [ ] | |
| 6 | Swimming pool | `common-areas-Swimmingpool-1` | CHECKED | [ ] | |
| 7 | Jacuzzi | `common-areas-Jacuzzi-1` | CHECKED | [ ] | |
| 8 | Laundry room | `common-areas-Laundryroom-1` | CHECKED | [ ] | |
| 9 | Recreation room | `common-areas-Recreationroom-1` | CHECKED | [ ] | |
| 10 | Gym | `common-areas-Gym-1` | CHECKED | [ ] | |
| 11 | Elevator | `common-areas-Elevator-1` | CHECKED | [ ] | |
| 12 | Filth/Rubbish/Garbage | `common-areas-FilthRubbishGarbage-1` | CHECKED | [ ] | |
| 13 | Vermin | `common-areas-Vermin-1` | CHECKED | [ ] | |
| 14 | Insects | `common-areas-Insects-1` | CHECKED | [ ] | |
| 15 | Broken gate | `common-areas-BrokenGate-1` | CHECKED | [ ] | |
| 16 | Blocked areas/doors | `common-areas-Blockedareasdoors-1` | CHECKED | [ ] | |

**Section Total:** _____ / 16 checkboxes

---

## Section 18: Trash Checkboxes (2 checkboxes)

| # | Checkbox | Field ID | Should Be | ✅/❌ | Issues |
|---|----------|----------|-----------|-------|--------|
| 1 | Inadequate number of receptacles | `trash-Inadequatenumberofreceptacles-1` | CHECKED | [ ] | |
| 2 | Improper servicing/emptying | `trash-Improperservicingemptying-1` | CHECKED | [ ] | |

**Section Total:** _____ / 2 checkboxes

---

## Section 19: Nuisance Checkboxes (4 checkboxes)

| # | Checkbox | Field ID | Should Be | ✅/❌ | Issues |
|---|----------|----------|-----------|-------|--------|
| 1 | Drugs | `nuisance-Drugs-1` | CHECKED | [ ] | |
| 2 | Smoking | `nuisance-Smoking-1` | CHECKED | [ ] | |
| 3 | Noisy neighbors | `nuisance-Noisyneighbors-1` | CHECKED | [ ] | |
| 4 | Gangs | `nuisance-Gangs-1` | CHECKED | [ ] | |

**Section Total:** _____ / 4 checkboxes

---

## Section 20: Health Hazard Checkboxes (8 checkboxes)

| # | Checkbox | Field ID | Should Be | ✅/❌ | Issues |
|---|----------|----------|-----------|-------|--------|
| 1 | Mold | `health-hazard-Mold-1` | CHECKED | [ ] | |
| 2 | Mildew | `health-hazard-Mildew-1` | CHECKED | [ ] | |
| 3 | Mushrooms | `health-hazard-Mushrooms-1` | CHECKED | [ ] | |
| 4 | Raw sewage on exterior | `health-hazard-Rawsewageonexterior-1` | CHECKED | [ ] | |
| 5 | Noxious fumes | `health-hazard-Noxiousfumes-1` | CHECKED | [ ] | |
| 6 | Chemical/paint contamination | `health-hazard-Chemicalpaintcontamination-1` | CHECKED | [ ] | |
| 7 | Toxic water pollution | `health-hazard-Toxicwaterpollution-1` | CHECKED | [ ] | |
| 8 | Offensive odors | `health-hazard-Offensiveodors-1` | CHECKED | [ ] | |

**Section Total:** _____ / 8 checkboxes

---

## Section 21: Harassment Checkboxes (15 checkboxes) ⭐

| # | Checkbox | Field ID | Should Be | ✅/❌ | Issues |
|---|----------|----------|-----------|-------|--------|
| 1 | Unlawful detainer | `harassment-UnlawfulDetainer-1` | CHECKED | [ ] | |
| 2 | Eviction threats | `harassment-Evictionthreats-1` | CHECKED | [ ] | |
| 3 | By defendant | `harassment-Bydefendant-1` | CHECKED | [ ] | |
| 4 | By maintenance man/workers | `harassment-Bymaintenancemanworkers-1` | CHECKED | [ ] | |
| 5 | By manager/building staff | `harassment-Bymanagerbuildingstaff-1` | CHECKED | [ ] | |
| 6 | By owner | `harassment-Byowner-1` | CHECKED | [ ] | |
| 7 | Other tenants | `harassment-Othertenants-1` | CHECKED | [ ] | |
| 8 | Illegitimate notices | `harassment-Illegitimatenotices-1` | CHECKED | [ ] | |
| 9 | Refusal to make timely repairs | `harassment-Refusaltomaketimelyrepairs-1` | CHECKED | [ ] | |
| 10 | Written threats | `harassment-Writtenthreats-1` | CHECKED | [ ] | |
| 11 | Aggressive/inappropriate language | `harassment-Aggressiveinappropriatelanguage-1` | CHECKED | [ ] | |
| 12 | Physical threats or touching | `harassment-Physicalthreatsortouching-1` | CHECKED | [ ] | |
| 13 | Notices singling out one tenant | `harassment-Noticessinglingoutonetenantbutnotuniformlygiventoalltenants-1` | CHECKED | [ ] | |
| 14 | Duplicative notices | `harassment-Duplicativenotices-1` | CHECKED | [ ] | |
| 15 | Untimely response from landlord | `harassment-UntimelyResponsefromLandlord-1` | CHECKED | [ ] | |

**Section Total:** _____ / 15 checkboxes

---

## Section 22: Notices Checkboxes (6 checkboxes)

| # | Checkbox | Field ID | Should Be | ✅/❌ | Issues |
|---|----------|----------|-----------|-------|--------|
| 1 | 3-day | `notices-3day-1` | CHECKED | [ ] | |
| 2 | 24-hour | `notices-24hour-1` | CHECKED | [ ] | |
| 3 | 30-day | `notices-30day-1` | CHECKED | [ ] | |
| 4 | 60-day | `notices-60day-1` | CHECKED | [ ] | |
| 5 | To quit | `notices-Toquit-1` | CHECKED | [ ] | |
| 6 | Perform or quit | `notices-Performorquit-1` | CHECKED | [ ] | |

**Section Total:** _____ / 6 checkboxes

---

## Section 23: Utility Checkboxes (5 checkboxes)

| # | Checkbox | Field ID | Should Be | ✅/❌ | Issues |
|---|----------|----------|-----------|-------|--------|
| 1 | Gas leak | `utility-Gasleak-1` | CHECKED | [ ] | |
| 2 | Water shutoffs | `utility-Watershutoffs-1` | CHECKED | [ ] | |
| 3 | Electricity shutoffs | `utility-Electricityshutoffs-1` | CHECKED | [ ] | |
| 4 | Heat shutoff | `utility-Heatshutoff-1` | CHECKED | [ ] | |
| 5 | Gas shutoff | `utility-Gasshutoff-1` | CHECKED | [ ] | |

**Section Total:** _____ / 5 checkboxes

---

## Section 24: Safety Checkboxes (6 checkboxes)

| # | Checkbox | Field ID | Should Be | ✅/❌ | Issues |
|---|----------|----------|-----------|-------|--------|
| 1 | Broken/inoperable security gate | `safety-Brokeninoperablesecuritygate-1` | CHECKED | [ ] | |
| 2 | Broken doors | `safety-Brokendoors-1` | CHECKED | [ ] | |
| 3 | Unauthorized entries | `safety-Unauthorizedentries-1` | CHECKED | [ ] | |
| 4 | Broken buzzer to get in | `safety-Brokenbuzzertogetin-1` | CHECKED | [ ] | |
| 5 | Security cameras | `safety-Securitycameras-1` | CHECKED | [ ] | |
| 6 | Inoperable locks | `safety-Inoperablelocks-1` | CHECKED | [ ] | |

**Section Total:** _____ / 6 checkboxes

---

## Section 25: Simple Toggles (9 categories)

These categories don't have individual checkboxes - just master toggles.

| # | Category | Toggle/Field | Should Be | ✅/❌ | Issues |
|---|----------|-------------|-----------|-------|--------|
| 1 | Injury Issues | Toggle or field ON | ON/true | [ ] | |
| 2 | Nonresponsive Landlord | Toggle or field ON | ON/true | [ ] | |
| 3 | Unauthorized Entries | Toggle or field ON | ON/true | [ ] | |
| 4 | Stolen Items | Toggle or field ON | ON/true | [ ] | |
| 5 | Damaged Items | Toggle or field ON | ON/true | [ ] | |
| 6 | Age Discrimination | Toggle or field ON | ON/true | [ ] | |
| 7 | Racial Discrimination | Toggle or field ON | ON/true | [ ] | |
| 8 | Disability Discrimination | Toggle or field ON | ON/true | [ ] | |
| 9 | Security Deposit Issues | Toggle or field ON | ON/true | [ ] | |

**Section Total:** _____ / 9 toggles

---

## FINAL TOTALS

### Fields Verified

| Section | Fields | Passed | Failed | % |
|---------|--------|--------|--------|---|
| Property Info | 11 | ___ | ___ | ___ |
| Plaintiff Info | 10 | ___ | ___ | ___ |
| Category Toggles | 21 | ___ | ___ | ___ |
| Vermin | 6 | ___ | ___ | ___ |
| Insects | 10 | ___ | ___ | ___ |
| HVAC | 3 | ___ | ___ | ___ |
| Electrical | 7 | ___ | ___ | ___ |
| Fire Hazard | 5 | ___ | ___ | ___ |
| Government | 7 | ___ | ___ | ___ |
| Appliances | 7 | ___ | ___ | ___ |
| Plumbing | 15 | ___ | ___ | ___ |
| Cabinets | 3 | ___ | ___ | ___ |
| Flooring | 4 | ___ | ___ | ___ |
| Windows | 6 | ___ | ___ | ___ |
| Doors | 8 | ___ | ___ | ___ |
| Structural | 15 | ___ | ___ | ___ |
| Common Areas | 16 | ___ | ___ | ___ |
| Trash | 2 | ___ | ___ | ___ |
| Nuisance | 4 | ___ | ___ | ___ |
| Health Hazard | 8 | ___ | ___ | ___ |
| Harassment | 15 | ___ | ___ | ___ |
| Notices | 6 | ___ | ___ | ___ |
| Utility | 5 | ___ | ___ | ___ |
| Safety | 6 | ___ | ___ | ___ |
| Simple Toggles | 9 | ___ | ___ | ___ |
| **GRAND TOTAL** | **200** | ___ | ___ | ___ |

### Coverage Analysis

**Total Fields Tested:** _____ / 200

**Success Rate:** _____%

**Status:** ✅ PASS (≥95%) / ⚠️ NEEDS WORK (90-94%) / ❌ FAIL (<90%)

---

## Missing Mappings Report

If any checkboxes failed, list them here:

| Category | Checkbox | Field ID Expected | Status |
|----------|----------|-------------------|--------|
| | | | |
| | | | |
| | | | |
| | | | |

**Total Missing:** _____ checkboxes

---

## Test Completion

**Test Date:** _____________________

**Tester Name:** _____________________

**Overall Result:** ✅ PASS / ❌ FAIL

**Signature:** _____________________

---

## Next Steps

**If 100% Pass (200/200):**
- ✅ System is working perfectly
- ✅ All mappings correct
- ✅ Ready for production testing
- ✅ Document generation can proceed

**If 95-99% Pass (190-199/200):**
- ⚠️ Minor issues exist
- Document missing mappings
- File bug reports for specific checkboxes
- Test again after fixes

**If <95% Pass (<190/200):**
- ❌ Major mapping issues
- Review routes/intakes-jsonb.js transformation code
- Check database field names vs doc-gen field IDs
- May need code fixes before proceeding

---

**Created:** 2025-12-16
**Purpose:** Master field-by-field verification
**Coverage:** 100% of all 200 fields (11 property + 10 plaintiff + 21 toggles + 158 checkboxes)
**Use Case:** Final verification and permanent documentation of field mapping accuracy
