# FORM 1 → FORM 2 MAPPING SPECIFICATION
## Complete Field Mapping Document for Legal Document Automation System

---

## DOCUMENT PURPOSE

This document provides the complete mapping specification for transferring data from Form 1 (Client Intake Form) to Form 2 (Discovery Document Generator). It includes:
- Direct field mappings (auto-populate)
- View window mappings (display only for attorney review)
- Derived/calculated fields
- Fields with no mapping

---

## MAPPING SYMBOLS LEGEND

| **Symbol** | **Meaning** | **Description** |
|---|---|---|
| **→** | Direct Mapping | Field value auto-populates from Form 1 to Form 2 |
| **⇢** | View Window | Field displays in Form 2 view window for attorney reference only |
| **↻** | Derived/Calculated | Form 2 value is calculated from Form 1 data |
| **⊗** | No Mapping | Form 1 field exists but doesn't map to Form 2 |
| **⚠️** | Manual Entry Required | Attorney must manually enter this data in Form 2 |

---

## SECTION 1: CONTACT & PROPERTY INFORMATION

### Direct Mappings

| **Form 1 Field** | **Map Type** | **Form 2 Field** | **Implementation Notes** |
|---|---|---|---|
| First Name * | → | First Name * (Plaintiff) | Direct auto-populate |
| Last Name * | → | Last Name * (Plaintiff) | Direct auto-populate |
| Street Address | → | Property Address (Line 1) * | Direct auto-populate |
| City * | → | City * | Direct auto-populate |
| City * | → | Filing City * | **SAME VALUE populates both fields** |
| State * | → | State * | Direct auto-populate |
| Postal code | → | ZIP Code * | Direct auto-populate |
| Filing County * | → | Filing County * | Direct auto-populate |
| Unit # (Link to Client Card) | → | Unit Number | Direct auto-populate |

### No Mapping (Internal Use Only)

| **Form 1 Field** | **Map Type** | **Form 2 Field** | **Reason** |
|---|---|---|---|
| Phone | ⊗ | N/A | Contact info not needed in discovery docs |
| Email * | ⊗ | N/A | Contact info not needed in discovery docs |
| How Did You Find Us? | ⊗ | N/A | Marketing data only |

---

## SECTION 2: HOUSEHOLD/PLAINTIFF INFORMATION

### Derived Fields

| **Form 1 Field** | **Map Type** | **Form 2 Field** | **Derivation Logic** |
|---|---|---|---|
| Date of Birth * | ↻ | Age Category (Adult/Child) | If age >= 18: "Adult"<br>If age < 18: "Child" |
| Are You the Head of Household? * | → | Head of Household (Yes/No) | Direct mapping |

### Conditional Plaintiff Mapping

| **Form 1 Field** | **Map Type** | **Form 2 Field** | **Condition** |
|---|---|---|---|
| First Name * + Last Name * | → | Plaintiff #1 | If "Are You Head of Household?" = **Yes** |
| Head of Household First Name | → | Plaintiff #1 First Name | If "Are You Head of Household?" = **No** |
| Head of Household Last Name | → | Plaintiff #1 Last Name | If "Are You Head of Household?" = **No** |

### View Window Mappings

| **Form 1 Field** | **Map Type** | **Form 2 View Window Location** | **Purpose** |
|---|---|---|---|
| What Do You Do For Work? | ⇢ | Plaintiff Info View Window | Attorney reference |
| Do You Have Any Disabilities? | ⇢ | Plaintiff Info View Window | Attorney reference |
| Spanish Speaking? | ⇢ | Plaintiff Info View Window | Communication needs |
| Are You A Veteran? | ⇢ | Plaintiff Info View Window | Potential claim relevance |
| # Of Children In Your Unit | ⇢ | Household Info View Window | Context |
| # Of Elderly In Your Unit | ⇢ | Household Info View Window | Context |
| Number of People | ⇢ | Household Info View Window | Context |
| Is your approximate household income under $45,000? | ⇢ | Financial Info View Window | Case qualification |
| Has an Unlawful Detainer Been Filed Against You? | ⇢ | Legal Status View Window | Case context |
| Current Rent | ⇢ | Property Info View Window | Financial context |
| Move In Date | ⇢ | Property Info View Window | Tenancy timeline |
| # Of Units In The Building | ⇢ | Property Info View Window | Property context |
| Have You Signed A Retainer With Another Attorney? | ⇢ | Legal Status View Window | Conflict check |

---

## SECTION 3: DEFENDANT INFORMATION

### View Window for Attorney Reference

| **Form 1 Field** | **Map Type** | **Form 2 Display Location** | **Notes** |
|---|---|---|---|
| Your Buildings Management Company or Manager's Name? | ⇢ | View Window above Defendant fields | Free text from client |
| Your Maintenance Man's Name? | ⇢ | View Window above Defendant fields | Potential additional defendant |

### Manual Entry Required

| **Form 2 Field** | **Map Type** | **Data Source** | **Notes** |
|---|---|---|---|
| Defendant First Name * | ⚠️ | Attorney manually enters from view window | Must be structured |
| Defendant Last Name * | ⚠️ | Attorney manually enters from view window | Must be structured |
| Defendant Type | ⚠️ | Attorney manually enters | Individual/LLC/Corporation/etc |
| Manager or Owner (radio) | ⚠️ | Attorney manually selects | Based on case facts |

---

## SECTION 4: ISSUE CATEGORIES - PATTERN EXPLANATION

**All issue categories follow the same mapping pattern:**

### Pattern Components:

1. **Category Toggle** (Yes/No Question)
   - Form 1: "Do You Have [Issue Type]?"
   - Form 2: "[Issue Type] Issues" toggle
   - Mapping: → Direct (if Yes, toggle checked)

2. **Specific Issue Checkboxes**
   - Form 1: Individual checkboxes for each issue
   - Form 2: Matching individual checkboxes
   - Mapping: → Direct (1:1 checkbox mapping)

3. **Detailed Description**
   - Form 1: "Describe [issue type] in detail" (text area)
   - Form 2: View window
   - Mapping: ⇢ Display in view window

4. **Timeline Information**
   - Form 1: "When Did [Issue Type] Start?" (text)
   - Form 2: View window
   - Mapping: ⇢ Display in view window

5. **Repair History**
   - Form 1: "Were Any [Issue Type] Repairs Made?" (text area)
   - Form 2: View window
   - Mapping: ⇢ Display in view window

---

## SECTION 5: ELECTRICAL ISSUES

| **Form 1 Field** | **Map Type** | **Form 2 Field** | **Notes** |
|---|---|---|---|
| Do You Have Any Electrical Issues? | → | Electrical Issues (toggle) | Auto-check if Yes |
| ☐ Outlets | → | ☐ Outlets | Direct 1:1 |
| ☐ Wall Switches | → | ☐ Wall Switches | Direct 1:1 |
| ☐ Interior Lighting | → | ☐ Interior Lighting | Direct 1:1 |
| ☐ Fans | → | ☐ Fans | Direct 1:1 |
| ☐ Panel | → | ☐ Panel | Direct 1:1 |
| ☐ Exterior Lighting | → | ☐ Exterior Lighting | Direct 1:1 |
| ☐ Light Fixtures | → | ☐ Light Fixtures | Direct 1:1 |
| Describe electrical issues in detail | ⇢ | View Window | Below checkboxes |
| When Did Your Electrical Issues Start? | ⇢ | View Window | Timeline section |
| Were Any Electrical Repairs Made? | ⇢ | View Window | Repair history section |

---

## SECTION 6: FIRE HAZARD ISSUES

| **Form 1 Field** | **Map Type** | **Form 2 Field** | **Notes** |
|---|---|---|---|
| Do You Have Any Fire Hazard Issues? | → | Fire Hazard Issues (toggle) | Auto-check if Yes |
| ☐ Smoke Alarms | → | ☐ Smoke Alarms | Direct 1:1 |
| ☐ Non-compliant electricity | → | ☐ Non-compliant electricity | Direct 1:1 |
| ☐ Carbon monoxide detectors | → | ☐ Carbon monoxide detectors | Direct 1:1 |
| ☐ Fire Extinguisher | → | ☐ Fire Extinguisher | Direct 1:1 |
| ☐ Non-GFI outlets near water | → | ☐ Non-GFI outlets near water | Direct 1:1 |
| Describe fire hazard issues in detail | ⇢ | View Window | Below checkboxes |
| When Did Fire Hazard Issues Start? | ⇢ | View Window | Timeline section |
| Were Any Fire Hazard Repairs Made? | ⇢ | View Window | Repair history section |

---

## SECTION 7: APPLIANCE ISSUES

| **Form 1 Field** | **Map Type** | **Form 2 Field** | **Notes** |
|---|---|---|---|
| Do You Have Any Problems with Appliances? | → | Appliance Issues (toggle) | Auto-check if Yes |
| ☐ Stove | → | ☐ Stove | Direct 1:1 |
| ☐ Dishwasher | → | ☐ Dishwasher | Direct 1:1 |
| ☐ Washer/dryer | → | ☐ Washer/dryer | Direct 1:1 |
| ☐ Oven | → | ☐ Oven | Direct 1:1 |
| ☐ Microwave | → | ☐ Microwave | Direct 1:1 |
| ☐ Garbage disposal | → | ☐ Garbage disposal | Direct 1:1 |
| ☐ Refrigerator | → | ☐ Refrigerator | Direct 1:1 |
| Describe appliance issues in detail | ⇢ | View Window | Below checkboxes |
| When Did Your Issues With Appliances Start? | ⇢ | View Window | Timeline section |
| Were Any Appliances Repairs Made? | ⇢ | View Window | Repair history section |

---

## SECTION 8: HVAC ISSUES

| **Form 1 Field** | **Map Type** | **Form 2 Field** | **Notes** |
|---|---|---|---|
| Do You Have Any Problems with Heating/AC? | → | HVAC Issues (toggle) | Auto-check if Yes |
| ☐ Air Conditioner | → | ☐ Air Conditioner | Direct 1:1 |
| ☐ Heater | → | ☐ Heater | Direct 1:1 |
| ☐ Ventilation | → | ☐ Ventilation | Direct 1:1 |
| Describe HVAC issues in detail | ⇢ | View Window | Below checkboxes |
| When Did Issues With Heating/AC Start? | ⇢ | View Window | Timeline section |
| Were Any Heating/AC Repairs Made? | ⇢ | View Window | Repair history section |

---

## SECTION 9: PLUMBING ISSUES

| **Form 1 Field** | **Map Type** | **Form 2 Field** | **Notes** |
|---|---|---|---|
| Do You Have Any Problems with Plumbing? | → | Plumbing Issues (toggle) | Auto-check if Yes |
| ☐ Toilet | → | ☐ Toilet | Direct 1:1 |
| ☐ Insufficient water pressure | → | ☐ Insufficient water pressure | Direct 1:1 |
| ☐ Clogged bath | → | ☐ Clogged bath | Direct 1:1 |
| ☐ Shower | → | ☐ Shower | Direct 1:1 |
| ☐ No hot water | → | ☐ No hot water | Direct 1:1 |
| ☐ Clogged sinks | → | ☐ Clogged sinks | Direct 1:1 |
| ☐ Bath | → | ☐ Bath | Direct 1:1 |
| ☐ No cold water | → | ☐ No cold water | Direct 1:1 |
| ☐ Clogged shower | → | ☐ Clogged shower | Direct 1:1 |
| ☐ Fixtures | → | ☐ Fixtures | Direct 1:1 |
| ☐ Sewage coming out | → | ☐ Sewage coming out | Direct 1:1 |
| ☐ No Clean Water Supply | → | ☐ No Clean Water Supply | Direct 1:1 |
| ☐ Leaks | → | ☐ Leaks | Direct 1:1 |
| ☐ Clogged toilets | → | ☐ Clogged toilets | Direct 1:1 |
| ☐ Unsanitary water | → | ☐ Unsanitary water | Direct 1:1 |
| Describe plumbing issues in detail | ⇢ | View Window | Below checkboxes |
| When Did Plumbing Issues Start? | ⇢ | View Window | Timeline section |
| Were Any Plumbing Repairs Made? | ⇢ | View Window | Repair history section |

---

## SECTION 10: UTILITY ISSUES

| **Form 1 Field** | **Map Type** | **Form 2 Field** | **Notes** |
|---|---|---|---|
| Do You Have Any Utility Issues? | → | Utility Issues (toggle) | Auto-check if Yes |
| ☐ Gas leak | → | ☐ Gas leak | Direct 1:1 |
| ☐ Gas shutoff | → | ☐ Gas shutoff | Direct 1:1 |
| ☐ Electricity shutoffs | → | ☐ Electricity shutoffs | Direct 1:1 |
| ☐ Water shutoffs | → | ☐ Water shutoffs | Direct 1:1 |
| ☐ Heat shutoff | → | ☐ Heat shutoff | Direct 1:1 |
| Describe utility issues in detail | ⇢ | View Window | Below checkboxes |
| When Did Utility Issues Start? | ⇢ | View Window | Timeline section |
| Were Any Utility Repairs Made? | ⇢ | View Window | Repair history section |

---

## SECTION 11: FLOORING ISSUES

| **Form 1 Field** | **Map Type** | **Form 2 Field** | **Notes** |
|---|---|---|---|
| Do You Have Any Issues with Flooring? | → | Flooring Issues (toggle) | Auto-check if Yes |
| ☐ Uneven | → | ☐ Uneven | Direct 1:1 |
| ☐ Carpet | → | ☐ Carpet | Direct 1:1 |
| ☐ Nails sticking out | → | ☐ Nails sticking out | Direct 1:1 |
| ☐ Tiles | → | ☐ Tiles | Direct 1:1 |
| Describe flooring issues in detail | ⇢ | View Window | Below checkboxes |
| When Did Your Issues With Flooring Start | ⇢ | View Window | Timeline section |
| Did You Have Any Flooring Repairs Made? | ⇢ | View Window | Repair history section |

---

## SECTION 12: WINDOW ISSUES

| **Form 1 Field** | **Map Type** | **Form 2 Field** | **Notes** |
|---|---|---|---|
| Do You Have Any Issues with Windows? | → | Windows Issues (toggle) | Auto-check if Yes |
| ☐ Broken | → | ☐ Broken | Direct 1:1 |
| ☐ Leaks | → | ☐ Leaks | Direct 1:1 |
| ☐ Missing windows | → | ☐ Missing windows | Direct 1:1 |
| ☐ Screens | → | ☐ Screens | Direct 1:1 |
| ☐ Do not lock | → | ☐ Do not lock | Direct 1:1 |
| ☐ Broken or missing screens | → | ☐ Broken or missing screens | Direct 1:1 |
| Describe window issues in detail | ⇢ | View Window | Below checkboxes |
| When Did Your Issues With Windows Start? | ⇢ | View Window | Timeline section |
| Were Any Window Repairs Made? | ⇢ | View Window | Repair history section |

---

## SECTION 13: DOOR ISSUES

| **Form 1 Field** | **Map Type** | **Form 2 Field** | **Notes** |
|---|---|---|---|
| Do You Have Any Issues with Doors? | → | Door Issues (toggle) | Auto-check if Yes |
| ☐ Broken | → | ☐ Broken | Direct 1:1 |
| ☐ Broken hinges | → | ☐ Broken hinges | Direct 1:1 |
| ☐ Water intrusion and/or insects | → | ☐ Water intrusion and/or insects | Direct 1:1 |
| ☐ Knobs | → | ☐ Knobs | Direct 1:1 |
| ☐ Sliding glass doors | → | ☐ Sliding glass doors | Direct 1:1 |
| ☐ Do not close properly | → | ☐ Do not close properly | Direct 1:1 |
| ☐ Locks | → | ☐ Locks | Direct 1:1 |
| ☐ Ineffective waterproofing | → | ☐ Ineffective waterproofing | Direct 1:1 |
| Describe door issues in detail | ⇢ | View Window | Below checkboxes |
| When Did Your Issues With Doors Start? | ⇢ | View Window | Timeline section |
| Were Any Door Repairs Made? | ⇢ | View Window | Repair history section |

---

## SECTION 14: CABINET ISSUES

| **Form 1 Field** | **Map Type** | **Form 2 Field** | **Notes** |
|---|---|---|---|
| Do You Have Any Cabinet Issues? | → | Cabinets Issues (toggle) | Auto-check if Yes |
| ☐ Broken | → | ☐ Broken | Direct 1:1 |
| ☐ Hinges | → | ☐ Hinges | Direct 1:1 |
| ☐ Alignment | → | ☐ Alignment | Direct 1:1 |
| Describe cabinet issues in detail | ⇢ | View Window | Below checkboxes |
| When Did Cabinet Issues Start? | ⇢ | View Window | Timeline section |
| Were Any Cabinet Repairs Made? | ⇢ | View Window | Repair history section |

---

## SECTION 15: STRUCTURAL ISSUES

| **Form 1 Field** | **Map Type** | **Form 2 Field** | **Notes** |
|---|---|---|---|
| Do You Have Any Problems with Structure? | → | Structure Issues (toggle) | Auto-check if Yes |
| ☐ Bumps in ceiling | → | ☐ Bumps in ceiling | Direct 1:1 |
| ☐ Hole in ceiling | → | ☐ Hole in ceiling | Direct 1:1 |
| ☐ Water stains on ceiling | → | ☐ Water stains on ceiling | Direct 1:1 |
| ☐ Water stains on wall | → | ☐ Water stains on wall | Direct 1:1 |
| ☐ Hole in wall | → | ☐ Hole in wall | Direct 1:1 |
| ☐ Paint | → | ☐ Paint | Direct 1:1 |
| ☐ Exterior deck/porch | → | ☐ Exterior deck/porch | Direct 1:1 |
| ☐ Waterproof toilet | → | ☐ Waterproof toilet | Direct 1:1 |
| ☐ Waterproof tub | → | ☐ Waterproof tub | Direct 1:1 |
| ☐ Staircase | → | ☐ Staircase | Direct 1:1 |
| ☐ Basement flood | → | ☐ Basement flood | Direct 1:1 |
| ☐ Leaks in garage | → | ☐ Leaks in garage | Direct 1:1 |
| ☐ Soft Spots due to Leaks | → | ☐ Soft Spots due to Leaks | Direct 1:1 |
| ☐ Ineffective Waterproofing (tubs/toilet) | → | ☐ Uneffective Waterproofing (tubs/toilet) | **Note: Form 2 has typo "Uneffective"** |
| ☐ Ineffective Weatherproofing (windows) | → | ☐ Ineffective Weatherproofing (windows) | Direct 1:1 |
| Describe structural issues in detail | ⇢ | View Window | Below checkboxes |
| When Did Your Issues With Structure Start? | ⇢ | View Window | Timeline section |
| Were Any Structure Repairs Made? | ⇢ | View Window | Repair history section |

---

## SECTION 16: COMMON AREA ISSUES

| **Form 1 Field** | **Map Type** | **Form 2 Field** | **Notes** |
|---|---|---|---|
| Do You Have Any Issues with Common Areas? | → | Common Areas Issues (toggle) | Auto-check if Yes |
| ☐ Gym | → | ☐ Gym | Direct 1:1 |
| ☐ Mailbox broken | → | ☐ Mailbox broken | Direct 1:1 |
| ☐ Parking area issues | → | ☐ Parking area issues | Direct 1:1 |
| ☐ Broken Gate | → | ☐ Broken Gate | Direct 1:1 |
| ☐ Flooding | → | ☐ Flooding | Direct 1:1 |
| ☐ Recreation room | → | ☐ Recreation room | Direct 1:1 |
| ☐ Damage to cars | → | ☐ Damage to cars | Direct 1:1 |
| ☐ Entrances blocked | → | ☐ Entrances blocked | Direct 1:1 |
| ☐ Swimming pool | → | ☐ Swimming pool | Direct 1:1 |
| ☐ Jacuzzi | → | ☐ Jacuzzi | Direct 1:1 |
| ☐ Elevator | → | ☐ Elevator | Direct 1:1 |
| ☐ Laundry room | → | ☐ Laundry room | Direct 1:1 |
| ☐ Blocked areas/doors | → | ☐ Blocked areas/doors | Direct 1:1 |
| ☐ Filth / Rubbish / Garbage | → | ☐ Filth / Rubbish / Garbage | Direct 1:1 |
| ☐ Vermin (in common areas) | → | ☐ Vermin | Direct 1:1 |
| ☐ Insects (in common areas) | → | ☐ Insects | Direct 1:1 |
| Describe common area issues in detail | ⇢ | View Window | Below checkboxes |
| When Did Your Issues With Common Areas Start? | ⇢ | View Window | Timeline section |
| Were Any Common Areas Repairs Made? | ⇢ | View Window | Repair history section |

---

## SECTION 17: TRASH PROBLEMS

| **Form 1 Field** | **Map Type** | **Form 2 Field** | **Notes** |
|---|---|---|---|
| Do You Have Trash Problems? | → | Trash Problems (toggle) | Auto-check if Yes |
| ☐ Inadequate number of receptacles | → | ☐ Inadequate number of receptacles | Direct 1:1 |
| ☐ Improper servicing/emptying | → | ☐ Improper servicing/emptying | Direct 1:1 |
| Describe trash problems in detail | ⇢ | View Window | Below checkboxes |
| When Did Trash Problems Start? | ⇢ | View Window | Timeline section |
| Were Trash Problems Addressed? | ⇢ | View Window | Repair history section |

---

## SECTION 18: NUISANCE ISSUES

| **Form 1 Field** | **Map Type** | **Form 2 Field** | **Notes** |
|---|---|---|---|
| Do you have any nuisances? | → | Nuisance Issues (toggle) | Auto-check if Yes |
| ☐ Drugs | → | ☐ Drugs | Direct 1:1 |
| ☐ Smoking | → | ☐ Smoking | Direct 1:1 |
| ☐ Noisy neighbors | → | ☐ Noisy neighbors | Direct 1:1 |
| ☐ Gangs | → | ☐ Gangs | Direct 1:1 |
| Describe nuisance issues in detail | ⇢ | View Window | Below checkboxes |
| When Did Your Issues With Nuisances Start? | ⇢ | View Window | Timeline section |
| Did You File Any Complaints Due To Nuisances? | ⇢ | View Window | Complaint section |

---

## SECTION 19: VERMIN & INSECT ISSUES

**Note:** Form 1 has ONE trigger question that maps to TWO Form 2 categories

| **Form 1 Field** | **Map Type** | **Form 2 Field** | **Notes** |
|---|---|---|---|
| Do You Have Any Bugs or Vermin? | → | **Vermin Issues** (toggle) | Same trigger for both |
| Do You Have Any Bugs or Vermin? | → | **Insect Issues** (toggle) | Same trigger for both |

### Vermin Checkboxes

| **Form 1 Field** | **Map Type** | **Form 2 Field** | **Notes** |
|---|---|---|---|
| ☐ Rats / Mice | → | ☐ Rats / Mice | Direct 1:1 |
| ☐ Bats | → | ☐ Bats | Direct 1:1 |
| ☐ Pigeons | → | ☐ Pigeons | Direct 1:1 |
| ☐ Skunks | → | ☐ Skunks | Direct 1:1 |
| ☐ Raccoons | → | ☐ Raccoons | Direct 1:1 |
| ☐ Opossums | → | ☐ Opossums | Direct 1:1 |

### Insect Checkboxes

| **Form 1 Field** | **Map Type** | **Form 2 Field** | **Notes** |
|---|---|---|---|
| ☐ Roaches | → | ☐ Roaches | Direct 1:1 |
| ☐ Ants | → | ☐ Ants | Direct 1:1 |
| ☐ Bedbugs | → | ☐ Bedbugs | Direct 1:1 |
| ☐ Spiders | → | ☐ Spiders | Direct 1:1 |
| ☐ Termites | → | ☐ Termites | Direct 1:1 |
| ☐ Bees | → | ☐ Bees | Direct 1:1 |
| ☐ Wasps | → | ☐ Wasps | Direct 1:1 |
| ☐ Hornets | → | ☐ Hornets | Direct 1:1 |
| ☐ Flies | → | ☐ Flies | Direct 1:1 |
| ☐ Mosquitos | → | ☐ Mosquitos | Direct 1:1 |

### View Windows (Same for Both Categories)

| **Form 1 Field** | **Map Type** | **Form 2 Display** | **Notes** |
|---|---|---|---|
| Describe infestation issues in detail | ⇢ | View Window under both Vermin & Insect sections | Same text displays in both |
| When Did Your Issues with Infestations Start? | ⇢ | View Window | Timeline section |
| Were Any Infestations Repairs Made? | ⇢ | View Window | Repair history section |

---

## SECTION 20: HEALTH HAZARD ISSUES

| **Form 1 Field** | **Map Type** | **Form 2 Field** | **Notes** |
|---|---|---|---|
| Do You Have Any Health Hazards? | → | Health Hazard Issues (toggle) | Auto-check if Yes |
| ☐ Mold | → | ☐ Mold | Direct 1:1 |
| ☐ Mildew | → | ☐ Mildew | Direct 1:1 |
| ☐ Mushrooms | → | ☐ Mushrooms | Direct 1:1 |
| ☐ Raw sewage on exterior | → | ☐ Raw sewage on exterior | Direct 1:1 |
| ☐ Toxic water pollution | → | ☐ Toxic water pollution | Direct 1:1 |
| ☐ Chemical/paint contamination | → | ☐ Chemical/paint contamination | Direct 1:1 |
| ☐ Offensive odors | → | ☐ Offensive odors | Direct 1:1 |
| Describe health hazard issues in detail | ⇢ | View Window | Below checkboxes |
| When Did Your Health Hazards Issues Start? | ⇢ | View Window | Timeline section |
| Were Any Health Hazards Issues Repairs Made? | ⇢ | View Window | Repair history section |

---

## SECTION 21: GOVERNMENT ENTITIES CONTACTED

| **Form 1 Field** | **Map Type** | **Form 2 Field** | **Notes** |
|---|---|---|---|
| Have you filed with Housing/Health Dept? | → | Government Entity Contacted (toggle) | Auto-check if Yes |
| ☐ Health Department | → | ☐ Health Department | Direct 1:1 |
| ☐ Police Department | → | ☐ Police Department | Direct 1:1 |
| ☐ Housing Authority | → | ☐ Housing Authority | Direct 1:1 |
| ☐ Department of Environmental Health | → | ☐ Department of Environmental Health | Direct 1:1 |
| ☐ Code Enforcement | → | ☐ Code Enforcement | Direct 1:1 |
| ☐ Department of Health Services | → | ☐ Department of Health Services | Direct 1:1 |
| ☐ Fire Department | → | ☐ Fire Department | Direct 1:1 |

---

## SECTION 22: NOTICE ISSUES

| **Form 1 Field** | **Map Type** | **Form 2 Field** | **Notes** |
|---|---|---|---|
| Have you been given any notices? | → | Notices Issues (toggle) | Auto-check if Yes |
| ☐ 3-day | → | ☐ 3-day | Direct 1:1 |
| ☐ 24-hour | → | ☐ 24-hour | Direct 1:1 |
| ☐ 30-day | → | ☐ 30-day | Direct 1:1 |
| ☐ 60-day | → | ☐ 60-day | Direct 1:1 |
| ☐ To quit | → | ☐ To quit | Direct 1:1 |
| ☐ Perform or quit | → | ☐ Perform or quit | Direct 1:1 |
| Describe the notices you received in detail | ⇢ | View Window | Below checkboxes |

---

## SECTION 23: SAFETY ISSUES

| **Form 1 Field** | **Map Type** | **Form 2 Field** | **Notes** |
|---|---|---|---|
| Do You Have Any Safety Issues? | → | Safety Issues (toggle) | Auto-check if Yes |
| ☐ Broken / inoperable security gate | → | ☐ Broken / inoperable security gate | Direct 1:1 |
| ☐ Unauthorized entries | → | ☐ Unauthorized entries | Direct 1:1 |
| ☐ Security cameras | → | ☐ Security cameras | Direct 1:1 |
| ☐ Broken doors | → | ☐ Broken doors | Direct 1:1 |
| ☐ Broken buzzer to get in | → | ☐ Broken buzzer to get in | Direct 1:1 |
| ☐ Inoperable locks | → | ☐ Inoperable locks | Direct 1:1 |
| Describe safety issues in detail | ⇢ | View Window | Below checkboxes |
| When Did Safety Issues Start? | ⇢ | View Window | Timeline section |
| Were Any Safety Repairs Made? | ⇢ | View Window | Repair history section |

---

## SECTION 24: HARASSMENT ISSUES

| **Form 1 Field** | **Map Type** | **Form 2 Field** | **Notes** |
|---|---|---|---|
| Has Landlord/Manager Harassed You? | → | Harassment Issues (toggle) | Auto-check if Yes |
| ☐ Unlawful Detainer | → | ☐ Unlawful Detainer | Direct 1:1 |
| ☐ Eviction threats | → | ☐ Eviction threats | Direct 1:1 |
| ☐ By defendant | → | ☐ By defendant | Direct 1:1 |
| ☐ By maintenance man/workers | → | ☐ By maintenance man/workers | Direct 1:1 |
| ☐ By manager/building staff | → | ☐ By manager/building staff | Direct 1:1 |
| ☐ By owner | → | ☐ By owner | Direct 1:1 |
| ☐ Other tenants | → | ☐ Other tenants | Direct 1:1 |
| ☐ Illegitimate notices | → | ☐ Illegitimate notices | Direct 1:1 |
| ☐ Refusal to make timely repairs | → | ☐ Refusal to make timely repairs | Direct 1:1 |
| ☐ Written threats | → | ☐ Written threats | Direct 1:1 |
| ☐ Aggressive/inappropriate language | → | ☐ Aggressive/inappropriate language | Direct 1:1 |
| ☐ Physical threats or touching | → | ☐ Physical threats or touching | Direct 1:1 |
| ☐ Notices singling out one tenant | → | ☐ Notices singling out one tenant, but not uniformly given to all tenants | Direct 1:1 |
| ☐ Duplicative notices | → | ☐ Duplicative notices | Direct 1:1 |
| ☐ Untimely Response from Landlord | → | ☐ Untimely Response from Landlord | Direct 1:1 |
| Describe harassment in detail | ⇢ | View Window | Below checkboxes |
| When Did Harassment Start? | ⇢ | View Window | Timeline section |

---

## SECTION 25: DIRECT YES/NO ISSUES (Special Cases)

### Property Damage

| **Form 1 Field** | **Map Type** | **Form 2 Field** | **Logic** |
|---|---|---|---|
| Any lost stolen or damaged property due to theft or leaks? | → | ☐ Stolen Items | Auto-check if response indicates theft/loss |
| Any lost stolen or damaged property due to theft or leaks? | → | ☐ Damaged Items | Auto-check if response indicates damage |

### Disability Discrimination

| **Form 1 Field** | **Map Type** | **Form 2 Field** | **Logic** |
|---|---|---|---|
| Do You Have Any Disabilities? | → | ☐ Disability Discrimination | **Only if response indicates discrimination occurred**<br>Not just presence of disability |

---

## SECTION 26: FORM 2 FIELDS WITH NO FORM 1 MAPPING

These Form 2 fields do NOT have corresponding Form 1 fields:

| **Form 2 Field** | **Map Type** | **Reason** | **Action Required** |
|---|---|---|---|
| ☐ Injury Issues | ⊗ | Not collected in Form 1 | Attorney manually checks if applicable |
| ☐ Nonresponsive Landlord Issues | ⊗ | Not collected in Form 1 | Attorney manually checks if applicable |
| ☐ Age Discrimination | ⊗ | Not collected in Form 1 | Attorney manually checks if applicable |
| ☐ Racial Discrimination | ⊗ | Not collected in Form 1 | Attorney manually checks if applicable |
| ☐ Security Deposit Issues | ⊗ | Not collected in Form 1 | Attorney manually checks if applicable |
| Plaintiff Type | ⊗ | Not collected in Form 1 | Attorney manually enters |

---

## SECTION 27: OTHER LEGAL HISTORY (View Windows Only)

| **Form 1 Field** | **Map Type** | **Form 2 Display Location** | **Purpose** |
|---|---|---|---|
| Have you ever received rent deductions? | ⇢ | Legal History View Window | Context for claims |
| Have you ever been relocated due to issues? | ⇢ | Legal History View Window | Context for claims |
| Have you filed or been involved in a lawsuit? | ⇢ | Legal History View Window | Prior litigation check |
| Have you filed any police reports? | ⇢ | Legal History View Window | Documentation trail |
| Any Other or Additional Problems? | ⇢ | Additional Info View Window | Catch-all issues |
| Do you have neighbors interested in lawsuit? | ⇢ | Case Development View Window | Potential co-plaintiffs |

---

## IMPLEMENTATION NOTES

### Auto-Population Logic

1. **On Form 2 Load:**
   - Query Form 1 database for client record
   - Auto-populate all fields marked with → symbol
   - Calculate derived fields marked with ↻ symbol
   - Load all view window content marked with ⇢ symbol

2. **Checkbox Logic:**
   - If Form 1 checkbox is checked → Check corresponding Form 2 checkbox
   - If Form 1 category trigger = "Yes" → Check Form 2 category toggle

3. **View Window Population:**
   - Create collapsible panels for each category
   - Display all text fields, timeline, and repair history
   - Mark sections where client provided information
   - Gray out sections where no information provided

### Data Validation Rules

1. **Required Field Check:**
   - All fields marked with * in Form 2 must have data
   - System should flag missing required fields before document generation

2. **Head of Household Logic:**
   - IF Form 1 "Are You Head of Household?" = "Yes"
     - THEN use Form 1 First Name + Last Name for Plaintiff #1
   - IF Form 1 "Are You Head of Household?" = "No"
     - THEN use Form 1 "Head of Household First Name" + "Head of Household Last Name" for Plaintiff #1

3. **Age Category Calculation:**
   - Calculate age from Date of Birth
   - IF age >= 18: Set "Age Category" = "Adult"
   - IF age < 18: Set "Age Category" = "Child"

4. **Duplicate City Value:**
   - Form 1 "City" value must populate BOTH:
     - Form 2 "City" field
     - Form 2 "Filing City" field

---

## VIEW WINDOW UI SPECIFICATIONS

### Standard View Window Structure
```
┌─ CLIENT PROVIDED INFORMATION ─────────────────────────┐
│                                                        │
│ [Issue Type] Details:                                 │
│ ┌────────────────────────────────────────────────┐   │
│ │ [Client's detailed description text]            │   │
│ └────────────────────────────────────────────────┘   │
│                                                        │
│ Timeline:                                             │
│ Started: [Client's timeline response]                │
│                                                        │
│ Repair History:                                       │
│ [Client's repair history response]                    │
│                                                        │
│ [If applicable] Complaints Filed:                     │
│ [Client's complaint information]                      │
│                                                        │
└──────────────────────────────────────────────────────┘
```

### View Window Behavior

- **Collapsible:** Can be expanded/collapsed by attorney
- **Read-Only:** No editing allowed
- **Highlighting:** Sections with data are highlighted
- **Empty State:** Grayed out if no data provided
- **Location:** Positioned directly below relevant Form 2 checkboxes

---

## QUALITY ASSURANCE CHECKLIST

Before going live, verify:

- [ ] All → mappings auto-populate correctly
- [ ] All ⇢ view windows display properly
- [ ] All ↻ calculations work correctly
- [ ] Head of Household logic functions properly
- [ ] Age Category calculation is accurate
- [ ] City value populates both City and Filing City
- [ ] All 20 category triggers map to toggles
- [ ] All checkbox mappings are 1:1 accurate
- [ ] View windows show/hide correctly
- [ ] Manual entry fields are clearly marked
- [ ] No data loss from Form 1 to Form 2
- [ ] Attorney can override auto-populated fields
- [ ] Defendant information displays in view window
- [ ] All timeline data displays in view windows
- [ ] All repair history displays in view windows

---

**Document Version:** 1.0  
**Last Updated:** [Current Date]  
**Status:** Ready for Implementation