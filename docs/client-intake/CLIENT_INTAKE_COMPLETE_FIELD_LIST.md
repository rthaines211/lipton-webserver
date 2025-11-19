# CLIENT INTAKE FORM - COMPLETE FIELD SPECIFICATION
## Client Intake Form - Updated Field List with Conditional Display Logic

---

## LEGEND
- **Status:** EXISTING = Currently in form, NEW = Needs to be added, MODIFIED = Needs changes
- **Priority:** HIGH = Critical for DOC GENERATION FORM mapping, MEDIUM = Important enhancement, LOW = Nice to have
- **Display Condition:** Specifies when field is visible to user
- **⚙️ CATEGORY TRIGGER** = Yes/No field that controls visibility of related fields

---

## 1. CONTACT INFORMATION

| **Field Name** | **Field Type** | **Status** | **Priority** | **Display Condition** | **Notes** |
|---|---|---|---|---|---|
| First Name * | Text Input | EXISTING | - | Always visible | Required |
| Last Name * | Text Input | EXISTING | - | Always visible | Required |
| Phone | Phone Input | EXISTING | - | Always visible | |
| Email * | Text Input | EXISTING | - | Always visible | Required |
| How Did You Find Us? | Text Input | EXISTING | - | Always visible | Marketing tracking |

---

## 2. PROPERTY & TENANCY DETAILS

| **Field Name** | **Field Type** | **Status** | **Priority** | **Display Condition** | **Notes** |
|---|---|---|---|---|---|
| Has an Unlawful Detainer Been Filed Against You? | Text Input | EXISTING | - | Always visible | |
| Street Address | Text Input | EXISTING | - | Always visible | Maps to Property Address (Line 1) in DOC GENERATION FORM |
| City * | Text Input | EXISTING | - | Always visible | Maps to BOTH City AND Filing City in DOC GENERATION FORM |
| State * | Dropdown | EXISTING | - | Always visible | Required |
| Postal code | Text Input | EXISTING | - | Always visible | Maps to ZIP Code in DOC GENERATION FORM |
| **Filing County *** | **Text Input** | **NEW** | **HIGH** | Always visible | Required for DOC GENERATION FORM |
| Unit # (Link to Client Card) | Text Input | EXISTING | - | Always visible | |
| Current Rent | Text Input | EXISTING | - | Always visible | View window in DOC GENERATION FORM |
| Move In Date | Date Input | EXISTING | - | Always visible | View window in DOC GENERATION FORM |
| # Of Units In The Building | Text Input | EXISTING | - | Always visible | View window in DOC GENERATION FORM |
| Have You Signed A Retainer With Another Attorney? | Dropdown | EXISTING | - | Always visible | |

---

## 3. HOUSEHOLD INFORMATION

| **Field Name** | **Field Type** | **Status** | **Priority** | **Display Condition** | **Notes** |
|---|---|---|---|---|---|
| What Do You Do For Work? | Text Input | EXISTING | - | Always visible | View window in DOC GENERATION FORM |
| **Date of Birth *** | **Date Input** | **EXISTING** | **HIGH** | Always visible | Calculate Age Category (Adult/Child) for DOC GENERATION FORM |
| **Are You the Head of Household? *** | **Radio (Yes/No)** | **NEW** | **HIGH** | Always visible | ⚙️ Controls next 2 fields |
| **Head of Household First Name** | **Text Input** | **NEW** | **HIGH** | Only if "Are You Head of Household?" = No | Becomes Plaintiff #1 in DOC GENERATION FORM |
| **Head of Household Last Name** | **Text Input** | **NEW** | **HIGH** | Only if "Are You Head of Household?" = No | Becomes Plaintiff #1 in DOC GENERATION FORM |
| Do You Have Any Disabilities? | Text Input | EXISTING | - | Always visible | |
| Spanish Speaking? | Text Input | EXISTING | - | Always visible | View window in DOC GENERATION FORM |
| Are You A Veteran? | Text Input | EXISTING | - | Always visible | View window in DOC GENERATION FORM |
| # Of Children In Your Unit | Text Input | EXISTING | - | Always visible | View window in DOC GENERATION FORM |
| # Of Elderly In Your Unit | Text Input | EXISTING | - | Always visible | View window in DOC GENERATION FORM |
| Number of People | Text Input | EXISTING | - | Always visible | View window in DOC GENERATION FORM |
| Is your approximate household income under $45,000? | Text Input | EXISTING | - | Always visible | View window in DOC GENERATION FORM |

---

## 4. PROPERTY MANAGEMENT

| **Field Name** | **Field Type** | **Status** | **Priority** | **Display Condition** | **Notes** |
|---|---|---|---|---|---|
| Your Buildings Management Company or Manager's Name? | Text Input | EXISTING | - | Always visible | View window in DOC GENERATION FORM |
| Your Maintenance Man's Name? | Text Input | EXISTING | - | Always visible | View window in DOC GENERATION FORM |

---

## 5. UNIT CONDITION ISSUES

### 5A. ELECTRICAL ISSUES

| **Field Name** | **Field Type** | **Status** | **Priority** | **Display Condition** | **Notes** |
|---|---|---|---|---|---|
| Do You Have Any Electrical Issues with the Building? | Dropdown (Yes/No) | EXISTING | - | Always visible | ⚙️ **CATEGORY TRIGGER** |
| **☐ Outlets** | **Checkbox** | **NEW** | **HIGH** | Only if Electrical Issues = Yes | Match DOC GENERATION FORM |
| **☐ Wall Switches** | **Checkbox** | **NEW** | **HIGH** | Only if Electrical Issues = Yes | Match DOC GENERATION FORM |
| **☐ Interior Lighting** | **Checkbox** | **NEW** | **HIGH** | Only if Electrical Issues = Yes | Match DOC GENERATION FORM |
| **☐ Fans** | **Checkbox** | **NEW** | **HIGH** | Only if Electrical Issues = Yes | Match DOC GENERATION FORM |
| **☐ Panel** | **Checkbox** | **NEW** | **HIGH** | Only if Electrical Issues = Yes | Match DOC GENERATION FORM |
| **☐ Exterior Lighting** | **Checkbox** | **NEW** | **HIGH** | Only if Electrical Issues = Yes | Match DOC GENERATION FORM |
| **☐ Light Fixtures** | **Checkbox** | **NEW** | **HIGH** | Only if Electrical Issues = Yes | Match DOC GENERATION FORM |
| Describe electrical issues in detail | Text Area | EXISTING | - | Only if Electrical Issues = Yes | View window in DOC GENERATION FORM |
| When Did Your Electrical Issues Start? | Text Input | EXISTING | - | Only if Electrical Issues = Yes | View window in DOC GENERATION FORM |
| Were Any Electrical Repairs Made? (how long, how many times) | Text Area | EXISTING | - | Only if Electrical Issues = Yes | View window in DOC GENERATION FORM |

### 5B. FIRE HAZARD ISSUES

| **Field Name** | **Field Type** | **Status** | **Priority** | **Display Condition** | **Notes** |
|---|---|---|---|---|---|
| **Do You Have Any Fire Hazard Issues?** | **Dropdown (Yes/No)** | **NEW** | **HIGH** | Always visible | ⚙️ **CATEGORY TRIGGER** |
| **☐ Smoke Alarms** | **Checkbox** | **NEW** | **HIGH** | Only if Fire Hazard Issues = Yes | |
| **☐ Non-compliant electricity** | **Checkbox** | **NEW** | **HIGH** | Only if Fire Hazard Issues = Yes | |
| **☐ Carbon monoxide detectors** | **Checkbox** | **NEW** | **HIGH** | Only if Fire Hazard Issues = Yes | |
| **☐ Fire Extinguisher** | **Checkbox** | **NEW** | **HIGH** | Only if Fire Hazard Issues = Yes | |
| **☐ Non-GFI outlets near water** | **Checkbox** | **NEW** | **HIGH** | Only if Fire Hazard Issues = Yes | |
| **Describe fire hazard issues in detail** | **Text Area** | **NEW** | **HIGH** | Only if Fire Hazard Issues = Yes | View window in DOC GENERATION FORM |
| **When Did Fire Hazard Issues Start?** | **Text Input** | **NEW** | **HIGH** | Only if Fire Hazard Issues = Yes | View window in DOC GENERATION FORM |
| **Were Any Fire Hazard Repairs Made? (how long, how many times)** | **Text Area** | **NEW** | **HIGH** | Only if Fire Hazard Issues = Yes | View window in DOC GENERATION FORM |

### 5C. APPLIANCE ISSUES

| **Field Name** | **Field Type** | **Status** | **Priority** | **Display Condition** | **Notes** |
|---|---|---|---|---|---|
| Do You Have Any Problems with the Appliances in Your Unit? | Dropdown (Yes/No) | EXISTING | - | Always visible | ⚙️ **CATEGORY TRIGGER** |
| **☐ Stove** | **Checkbox** | **NEW** | **HIGH** | Only if Appliance Issues = Yes | Match DOC GENERATION FORM |
| **☐ Dishwasher** | **Checkbox** | **NEW** | **HIGH** | Only if Appliance Issues = Yes | Match DOC GENERATION FORM |
| **☐ Washer/dryer** | **Checkbox** | **NEW** | **HIGH** | Only if Appliance Issues = Yes | Match DOC GENERATION FORM |
| **☐ Oven** | **Checkbox** | **NEW** | **HIGH** | Only if Appliance Issues = Yes | Match DOC GENERATION FORM |
| **☐ Microwave** | **Checkbox** | **NEW** | **HIGH** | Only if Appliance Issues = Yes | Match DOC GENERATION FORM |
| **☐ Garbage disposal** | **Checkbox** | **NEW** | **HIGH** | Only if Appliance Issues = Yes | Match DOC GENERATION FORM |
| **☐ Refrigerator** | **Checkbox** | **NEW** | **HIGH** | Only if Appliance Issues = Yes | Match DOC GENERATION FORM |
| Describe appliance issues in detail | Text Area | EXISTING | - | Only if Appliance Issues = Yes | View window in DOC GENERATION FORM |
| When Did Your Issues With Your Appliances Start? | Text Input | EXISTING | - | Only if Appliance Issues = Yes | View window in DOC GENERATION FORM |
| Were Any Appliances Repairs Made? (how long, how many times) | Text Area | EXISTING | - | Only if Appliance Issues = Yes | View window in DOC GENERATION FORM |

### 5D. HVAC ISSUES

| **Field Name** | **Field Type** | **Status** | **Priority** | **Display Condition** | **Notes** |
|---|---|---|---|---|---|
| Do You Have Any Problems with Heating / Air Conditioning in Your Building? | Dropdown (Yes/No) | EXISTING | - | Always visible | ⚙️ **CATEGORY TRIGGER** |
| **☐ Air Conditioner** | **Checkbox** | **NEW** | **HIGH** | Only if HVAC Issues = Yes | Match DOC GENERATION FORM |
| **☐ Heater** | **Checkbox** | **NEW** | **HIGH** | Only if HVAC Issues = Yes | Match DOC GENERATION FORM |
| **☐ Ventilation** | **Checkbox** | **NEW** | **HIGH** | Only if HVAC Issues = Yes | Match DOC GENERATION FORM |
| Describe HVAC issues in detail | Text Area | EXISTING | - | Only if HVAC Issues = Yes | View window in DOC GENERATION FORM |
| When Did Issues With Your Heating/ Air Conditioning Start? | Text Input | EXISTING | - | Only if HVAC Issues = Yes | View window in DOC GENERATION FORM |
| Were Any Heating / Air Conditioning Repairs Made? (how long, how many times) | Text Area | EXISTING | - | Only if HVAC Issues = Yes | View window in DOC GENERATION FORM |

### 5E. PLUMBING ISSUES

| **Field Name** | **Field Type** | **Status** | **Priority** | **Display Condition** | **Notes** |
|---|---|---|---|---|---|
| Do You Have Any Problems with Plumbing in Your Building? | Dropdown (Yes/No) | EXISTING | - | Always visible | ⚙️ **CATEGORY TRIGGER** |
| **☐ Toilet** | **Checkbox** | **NEW** | **HIGH** | Only if Plumbing Issues = Yes | Match DOC GENERATION FORM |
| **☐ Insufficient water pressure** | **Checkbox** | **NEW** | **HIGH** | Only if Plumbing Issues = Yes | Match DOC GENERATION FORM |
| **☐ Clogged bath** | **Checkbox** | **NEW** | **HIGH** | Only if Plumbing Issues = Yes | Match DOC GENERATION FORM |
| **☐ Shower** | **Checkbox** | **NEW** | **HIGH** | Only if Plumbing Issues = Yes | Match DOC GENERATION FORM |
| **☐ No hot water** | **Checkbox** | **NEW** | **HIGH** | Only if Plumbing Issues = Yes | Match DOC GENERATION FORM |
| **☐ Clogged sinks** | **Checkbox** | **NEW** | **HIGH** | Only if Plumbing Issues = Yes | Match DOC GENERATION FORM |
| **☐ Bath** | **Checkbox** | **NEW** | **HIGH** | Only if Plumbing Issues = Yes | Match DOC GENERATION FORM |
| **☐ No cold water** | **Checkbox** | **NEW** | **HIGH** | Only if Plumbing Issues = Yes | Match DOC GENERATION FORM |
| **☐ Clogged shower** | **Checkbox** | **NEW** | **HIGH** | Only if Plumbing Issues = Yes | Match DOC GENERATION FORM |
| **☐ Fixtures** | **Checkbox** | **NEW** | **HIGH** | Only if Plumbing Issues = Yes | Match DOC GENERATION FORM |
| **☐ Sewage coming out** | **Checkbox** | **NEW** | **HIGH** | Only if Plumbing Issues = Yes | Match DOC GENERATION FORM |
| **☐ No Clean Water Supply** | **Checkbox** | **NEW** | **HIGH** | Only if Plumbing Issues = Yes | Match DOC GENERATION FORM |
| **☐ Leaks** | **Checkbox** | **NEW** | **HIGH** | Only if Plumbing Issues = Yes | Match DOC GENERATION FORM |
| **☐ Clogged toilets** | **Checkbox** | **NEW** | **HIGH** | Only if Plumbing Issues = Yes | Match DOC GENERATION FORM |
| **☐ Unsanitary water** | **Checkbox** | **NEW** | **HIGH** | Only if Plumbing Issues = Yes | Match DOC GENERATION FORM |
| Describe plumbing issues in detail | Text Area | EXISTING | - | Only if Plumbing Issues = Yes | View window in DOC GENERATION FORM |
| When Did Plumbing Issues Start? | Text Input | EXISTING | - | Only if Plumbing Issues = Yes | View window in DOC GENERATION FORM |
| Were Any Plumbing Repairs Made? (how long, how many times) | Text Area | EXISTING | - | Only if Plumbing Issues = Yes | View window in DOC GENERATION FORM |

### 5F. UTILITY ISSUES

| **Field Name** | **Field Type** | **Status** | **Priority** | **Display Condition** | **Notes** |
|---|---|---|---|---|---|
| **Do You Have Any Utility Issues?** | **Dropdown (Yes/No)** | **NEW** | **HIGH** | Always visible | ⚙️ **CATEGORY TRIGGER** |
| **☐ Gas leak** | **Checkbox** | **NEW** | **HIGH** | Only if Utility Issues = Yes | |
| **☐ Gas shutoff** | **Checkbox** | **NEW** | **HIGH** | Only if Utility Issues = Yes | |
| **☐ Electricity shutoffs** | **Checkbox** | **NEW** | **HIGH** | Only if Utility Issues = Yes | |
| **☐ Water shutoffs** | **Checkbox** | **NEW** | **HIGH** | Only if Utility Issues = Yes | |
| **☐ Heat shutoff** | **Checkbox** | **NEW** | **HIGH** | Only if Utility Issues = Yes | |
| **Describe utility issues in detail** | **Text Area** | **NEW** | **HIGH** | Only if Utility Issues = Yes | View window in DOC GENERATION FORM |
| **When Did Utility Issues Start?** | **Text Input** | **NEW** | **HIGH** | Only if Utility Issues = Yes | View window in DOC GENERATION FORM |
| **Were Any Utility Repairs Made? (how long, how many times)** | **Text Area** | **NEW** | **HIGH** | Only if Utility Issues = Yes | View window in DOC GENERATION FORM |

---

## 6. PHYSICAL STRUCTURE ISSUES

### 6A. FLOORING ISSUES

| **Field Name** | **Field Type** | **Status** | **Priority** | **Display Condition** | **Notes** |
|---|---|---|---|---|---|
| Do You Have Any Issues with the Flooring in Your Unit? | Dropdown (Yes/No) | EXISTING | - | Always visible | ⚙️ **CATEGORY TRIGGER** |
| **☐ Uneven** | **Checkbox** | **NEW** | **HIGH** | Only if Flooring Issues = Yes | Match DOC GENERATION FORM |
| **☐ Carpet** | **Checkbox** | **NEW** | **HIGH** | Only if Flooring Issues = Yes | Match DOC GENERATION FORM |
| **☐ Nails sticking out** | **Checkbox** | **NEW** | **HIGH** | Only if Flooring Issues = Yes | Match DOC GENERATION FORM |
| **☐ Tiles** | **Checkbox** | **NEW** | **HIGH** | Only if Flooring Issues = Yes | Match DOC GENERATION FORM |
| Describe flooring issues in detail | Text Area | EXISTING | - | Only if Flooring Issues = Yes | View window in DOC GENERATION FORM |
| When Did Your Issues With Your Flooring Start | Text Input | EXISTING | - | Only if Flooring Issues = Yes | View window in DOC GENERATION FORM |
| Did You Have Any Flooring Repairs Made? (how long, how many times) | Text Area | EXISTING | - | Only if Flooring Issues = Yes | View window in DOC GENERATION FORM |

### 6B. WINDOW ISSUES

| **Field Name** | **Field Type** | **Status** | **Priority** | **Display Condition** | **Notes** |
|---|---|---|---|---|---|
| Do You Have Any Issues with the Windows in Your Unit? | Dropdown (Yes/No) | EXISTING | - | Always visible | ⚙️ **CATEGORY TRIGGER** |
| **☐ Broken** | **Checkbox** | **NEW** | **HIGH** | Only if Window Issues = Yes | Match DOC GENERATION FORM |
| **☐ Leaks** | **Checkbox** | **NEW** | **HIGH** | Only if Window Issues = Yes | Match DOC GENERATION FORM |
| **☐ Missing windows** | **Checkbox** | **NEW** | **HIGH** | Only if Window Issues = Yes | Match DOC GENERATION FORM |
| **☐ Screens** | **Checkbox** | **NEW** | **HIGH** | Only if Window Issues = Yes | Match DOC GENERATION FORM |
| **☐ Do not lock** | **Checkbox** | **NEW** | **HIGH** | Only if Window Issues = Yes | Match DOC GENERATION FORM |
| **☐ Broken or missing screens** | **Checkbox** | **NEW** | **HIGH** | Only if Window Issues = Yes | Match DOC GENERATION FORM |
| Describe window issues in detail | Text Area | EXISTING | - | Only if Window Issues = Yes | View window in DOC GENERATION FORM |
| When Did Your Issues With Your Windows Start? | Text Input | EXISTING | - | Only if Window Issues = Yes | View window in DOC GENERATION FORM |
| Were Any Window Repairs Made? (how long, how many times) | Text Area | EXISTING | - | Only if Window Issues = Yes | View window in DOC GENERATION FORM |

### 6C. DOOR ISSUES

| **Field Name** | **Field Type** | **Status** | **Priority** | **Display Condition** | **Notes** |
|---|---|---|---|---|---|
| Do You Have Any Issues with the Doors in Your Unit? | Dropdown (Yes/No) | EXISTING | - | Always visible | ⚙️ **CATEGORY TRIGGER** |
| **☐ Broken** | **Checkbox** | **NEW** | **HIGH** | Only if Door Issues = Yes | Match DOC GENERATION FORM |
| **☐ Broken hinges** | **Checkbox** | **NEW** | **HIGH** | Only if Door Issues = Yes | Match DOC GENERATION FORM |
| **☐ Water intrusion and/or insects** | **Checkbox** | **NEW** | **HIGH** | Only if Door Issues = Yes | Match DOC GENERATION FORM |
| **☐ Knobs** | **Checkbox** | **NEW** | **HIGH** | Only if Door Issues = Yes | Match DOC GENERATION FORM |
| **☐ Sliding glass doors** | **Checkbox** | **NEW** | **HIGH** | Only if Door Issues = Yes | Match DOC GENERATION FORM |
| **☐ Do not close properly** | **Checkbox** | **NEW** | **HIGH** | Only if Door Issues = Yes | Match DOC GENERATION FORM |
| **☐ Locks** | **Checkbox** | **NEW** | **HIGH** | Only if Door Issues = Yes | Match DOC GENERATION FORM |
| **☐ Ineffective waterproofing** | **Checkbox** | **NEW** | **HIGH** | Only if Door Issues = Yes | Match DOC GENERATION FORM |
| Describe door issues in detail | Text Area | EXISTING | - | Only if Door Issues = Yes | View window in DOC GENERATION FORM |
| When Did Your Issues With Your Doors Start? | Text Input | EXISTING | - | Only if Door Issues = Yes | View window in DOC GENERATION FORM |
| Were Any Door Repairs Made? (how long, how many times) | Text Area | EXISTING | - | Only if Door Issues = Yes | View window in DOC GENERATION FORM |

### 6D. CABINET ISSUES

| **Field Name** | **Field Type** | **Status** | **Priority** | **Display Condition** | **Notes** |
|---|---|---|---|---|---|
| **Do You Have Any Cabinet Issues?** | **Dropdown (Yes/No)** | **NEW** | **MEDIUM** | Always visible | ⚙️ **CATEGORY TRIGGER** |
| **☐ Broken** | **Checkbox** | **NEW** | **MEDIUM** | Only if Cabinet Issues = Yes | Match DOC GENERATION FORM |
| **☐ Hinges** | **Checkbox** | **NEW** | **MEDIUM** | Only if Cabinet Issues = Yes | Match DOC GENERATION FORM |
| **☐ Alignment** | **Checkbox** | **NEW** | **MEDIUM** | Only if Cabinet Issues = Yes | Match DOC GENERATION FORM |
| **Describe cabinet issues in detail** | **Text Area** | **NEW** | **MEDIUM** | Only if Cabinet Issues = Yes | View window in DOC GENERATION FORM |
| **When Did Cabinet Issues Start?** | **Text Input** | **NEW** | **MEDIUM** | Only if Cabinet Issues = Yes | View window in DOC GENERATION FORM |
| **Were Any Cabinet Repairs Made? (how long, how many times)** | **Text Area** | **NEW** | **MEDIUM** | Only if Cabinet Issues = Yes | View window in DOC GENERATION FORM |

### 6E. STRUCTURAL ISSUES

| **Field Name** | **Field Type** | **Status** | **Priority** | **Display Condition** | **Notes** |
|---|---|---|---|---|---|
| Do You Have Any Problems with the Structure of Your Unit? | Dropdown (Yes/No) | EXISTING | - | Always visible | ⚙️ **CATEGORY TRIGGER** |
| **☐ Bumps in ceiling** | **Checkbox** | **NEW** | **HIGH** | Only if Structural Issues = Yes | Match DOC GENERATION FORM |
| **☐ Hole in ceiling** | **Checkbox** | **NEW** | **HIGH** | Only if Structural Issues = Yes | Match DOC GENERATION FORM |
| **☐ Water stains on ceiling** | **Checkbox** | **NEW** | **HIGH** | Only if Structural Issues = Yes | Match DOC GENERATION FORM |
| **☐ Water stains on wall** | **Checkbox** | **NEW** | **HIGH** | Only if Structural Issues = Yes | Match DOC GENERATION FORM |
| **☐ Hole in wall** | **Checkbox** | **NEW** | **HIGH** | Only if Structural Issues = Yes | Match DOC GENERATION FORM |
| **☐ Paint** | **Checkbox** | **NEW** | **HIGH** | Only if Structural Issues = Yes | Match DOC GENERATION FORM |
| **☐ Exterior deck/porch** | **Checkbox** | **NEW** | **HIGH** | Only if Structural Issues = Yes | Match DOC GENERATION FORM |
| **☐ Waterproof toilet** | **Checkbox** | **NEW** | **HIGH** | Only if Structural Issues = Yes | Match DOC GENERATION FORM |
| **☐ Waterproof tub** | **Checkbox** | **NEW** | **HIGH** | Only if Structural Issues = Yes | Match DOC GENERATION FORM |
| **☐ Staircase** | **Checkbox** | **NEW** | **HIGH** | Only if Structural Issues = Yes | Match DOC GENERATION FORM |
| **☐ Basement flood** | **Checkbox** | **NEW** | **HIGH** | Only if Structural Issues = Yes | Match DOC GENERATION FORM |
| **☐ Leaks in garage** | **Checkbox** | **NEW** | **HIGH** | Only if Structural Issues = Yes | Match DOC GENERATION FORM |
| **☐ Soft Spots due to Leaks** | **Checkbox** | **NEW** | **HIGH** | Only if Structural Issues = Yes | Match DOC GENERATION FORM |
| **☐ Ineffective Waterproofing of the tubs or toilet** | **Checkbox** | **NEW** | **HIGH** | Only if Structural Issues = Yes | Match DOC GENERATION FORM |
| **☐ Ineffective Weatherproofing of any windows** | **Checkbox** | **NEW** | **HIGH** | Only if Structural Issues = Yes | Match DOC GENERATION FORM |
| Describe structural issues in detail | Text Area | EXISTING | - | Only if Structural Issues = Yes | View window in DOC GENERATION FORM |
| When Did Your Issues With Your Structure Start? | Text Input | EXISTING | - | Only if Structural Issues = Yes | View window in DOC GENERATION FORM |
| Were Any Structure Repairs Made? (how long, how many times) | Text Area | EXISTING | - | Only if Structural Issues = Yes | View window in DOC GENERATION FORM |

---

## 7. COMMON AREAS & BUILDING ISSUES

### 7A. COMMON AREA ISSUES

| **Field Name** | **Field Type** | **Status** | **Priority** | **Display Condition** | **Notes** |
|---|---|---|---|---|---|
| Do You Have Any Issues with the Common Areas in Your Building? | Dropdown (Yes/No) | EXISTING | - | Always visible | ⚙️ **CATEGORY TRIGGER** |
| ☐ Gym | Checkbox | EXISTING | - | Only if Common Area Issues = Yes | |
| ☐ Mailbox broken | Checkbox | MODIFIED | - | Only if Common Area Issues = Yes | Was "Mailbox" |
| ☐ Parking area issues | Checkbox | MODIFIED | - | Only if Common Area Issues = Yes | Was "Parking Area" |
| ☐ Broken Gate | Checkbox | MODIFIED | - | Only if Common Area Issues = Yes | Was "Broken security gate" |
| ☐ Flooding | Checkbox | EXISTING | - | Only if Common Area Issues = Yes | |
| ☐ Recreation room | Checkbox | MODIFIED | - | Only if Common Area Issues = Yes | Was "Recreation Room" |
| ☐ Damage to cars | Checkbox | MODIFIED | - | Only if Common Area Issues = Yes | Was "Plumbing leaks onto cars" |
| ☐ Entrances blocked | Checkbox | MODIFIED | - | Only if Common Area Issues = Yes | Was "Entrance blocked" |
| ☐ Swimming pool | Checkbox | MODIFIED | - | Only if Common Area Issues = Yes | Split from "Swimming Pool/jacuzzi" |
| ☐ Jacuzzi | Checkbox | MODIFIED | - | Only if Common Area Issues = Yes | Split from "Swimming Pool/jacuzzi" |
| ☐ Elevator | Checkbox | MODIFIED | - | Only if Common Area Issues = Yes | Was "Elevator: Does not work" |
| ☐ Laundry room | Checkbox | EXISTING | - | Only if Common Area Issues = Yes | |
| **☐ Blocked areas/doors** | **Checkbox** | **NEW** | **MEDIUM** | Only if Common Area Issues = Yes | |
| **☐ Filth / Rubbish / Garbage** | **Checkbox** | **NEW** | **MEDIUM** | Only if Common Area Issues = Yes | |
| **☐ Vermin (in common areas)** | **Checkbox** | **NEW** | **MEDIUM** | Only if Common Area Issues = Yes | |
| **☐ Insects (in common areas)** | **Checkbox** | **NEW** | **MEDIUM** | Only if Common Area Issues = Yes | |
| Describe common area issues in detail | Text Area | EXISTING | - | Only if Common Area Issues = Yes | View window in DOC GENERATION FORM |
| When Did Your Issues With Your Common Areas Start? | Text Input | EXISTING | - | Only if Common Area Issues = Yes | View window in DOC GENERATION FORM |
| Were Any Common Areas Repairs Made? (how long, how many times) | Text Area | EXISTING | - | Only if Common Area Issues = Yes | View window in DOC GENERATION FORM |

### 7B. TRASH PROBLEMS

| **Field Name** | **Field Type** | **Status** | **Priority** | **Display Condition** | **Notes** |
|---|---|---|---|---|---|
| **Do You Have Trash Problems?** | **Dropdown (Yes/No)** | **NEW** | **MEDIUM** | Always visible | ⚙️ **CATEGORY TRIGGER** |
| **☐ Inadequate number of receptacles** | **Checkbox** | **NEW** | **MEDIUM** | Only if Trash Problems = Yes | |
| **☐ Improper servicing/emptying** | **Checkbox** | **NEW** | **MEDIUM** | Only if Trash Problems = Yes | |
| **Describe trash problems in detail** | **Text Area** | **NEW** | **MEDIUM** | Only if Trash Problems = Yes | View window in DOC GENERATION FORM |
| **When Did Trash Problems Start?** | **Text Input** | **NEW** | **MEDIUM** | Only if Trash Problems = Yes | View window in DOC GENERATION FORM |
| **Were Trash Problems Addressed? (how long, how many times)** | **Text Area** | **NEW** | **MEDIUM** | Only if Trash Problems = Yes | View window in DOC GENERATION FORM |

### 7C. NUISANCE ISSUES

| **Field Name** | **Field Type** | **Status** | **Priority** | **Display Condition** | **Notes** |
|---|---|---|---|---|---|
| Do you have any nuisances? | Dropdown (Yes/No) | EXISTING | - | Always visible | ⚙️ **CATEGORY TRIGGER** |
| **☐ Drugs** | **Checkbox** | **NEW** | **MEDIUM** | Only if Nuisances = Yes | Match DOC GENERATION FORM |
| **☐ Smoking** | **Checkbox** | **NEW** | **MEDIUM** | Only if Nuisances = Yes | Match DOC GENERATION FORM |
| **☐ Noisy neighbors** | **Checkbox** | **NEW** | **MEDIUM** | Only if Nuisances = Yes | Match DOC GENERATION FORM |
| **☐ Gangs** | **Checkbox** | **NEW** | **MEDIUM** | Only if Nuisances = Yes | Match DOC GENERATION FORM |
| Describe nuisance issues in detail | Text Area | EXISTING | - | Only if Nuisances = Yes | View window in DOC GENERATION FORM |
| When Did Your Issues With Nuisances Start? | Text Input | EXISTING | - | Only if Nuisances = Yes | View window in DOC GENERATION FORM |
| Did You File Any Complaints Due To Your Issues With Nuisances? Did they ever stop? | Text Area | EXISTING | - | Only if Nuisances = Yes | View window in DOC GENERATION FORM |

---

## 8. HEALTH & SAFETY HAZARDS

### 8A. INFESTATION ISSUES (VERMIN & INSECTS)

| **Field Name** | **Field Type** | **Status** | **Priority** | **Display Condition** | **Notes** |
|---|---|---|---|---|---|
| Do You Have Any Bugs or Vermin in Your Unit? | Dropdown (Yes/No) | EXISTING | - | Always visible | ⚙️ **CATEGORY TRIGGER** |
| ☐ Rats / Mice | Checkbox | MODIFIED | - | Only if Bugs/Vermin = Yes | Was "Mice/rats/rodents" |
| **☐ Bats** | **Checkbox** | **NEW** | **MEDIUM** | Only if Bugs/Vermin = Yes | Split from "Pigeons/bats" |
| ☐ Pigeons | Checkbox | MODIFIED | - | Only if Bugs/Vermin = Yes | Split from "Pigeons/bats" |
| **☐ Skunks** | **Checkbox** | **NEW** | **LOW** | Only if Bugs/Vermin = Yes | |
| ☐ Raccoons | Checkbox | MODIFIED | - | Only if Bugs/Vermin = Yes | Split from "Racoons/opossums" |
| ☐ Opossums | Checkbox | MODIFIED | - | Only if Bugs/Vermin = Yes | Split from "Racoons/opossums" |
| ☐ Roaches | Checkbox | MODIFIED | - | Only if Bugs/Vermin = Yes | Was "Cockroaches" |
| ☐ Ants | Checkbox | EXISTING | - | Only if Bugs/Vermin = Yes | |
| ☐ Bedbugs | Checkbox | MODIFIED | - | Only if Bugs/Vermin = Yes | Was "Bed bugs" |
| ☐ Spiders | Checkbox | EXISTING | - | Only if Bugs/Vermin = Yes | |
| ☐ Termites | Checkbox | MODIFIED | - | Only if Bugs/Vermin = Yes | Was "TermitesType" |
| ☐ Bees | Checkbox | MODIFIED | - | Only if Bugs/Vermin = Yes | Split from "Bees/wasps/hornets" |
| ☐ Wasps | Checkbox | MODIFIED | - | Only if Bugs/Vermin = Yes | Split from "Bees/wasps/hornets" |
| ☐ Hornets | Checkbox | MODIFIED | - | Only if Bugs/Vermin = Yes | Split from "Bees/wasps/hornets" |
| ☐ Flies | Checkbox | MODIFIED | - | Only if Bugs/Vermin = Yes | Split from "Flies/mosquitos" |
| ☐ Mosquitos | Checkbox | MODIFIED | - | Only if Bugs/Vermin = Yes | Split from "Flies/mosquitos" |
| Describe infestation issues in detail | Text Area | EXISTING | - | Only if Bugs/Vermin = Yes | View window in DOC GENERATION FORM |
| When Did Your Issues with Infestations Start? | Text Input | EXISTING | - | Only if Bugs/Vermin = Yes | View window in DOC GENERATION FORM |
| Were Any Infestations Repairs Made? (how long, how many times) | Text Area | EXISTING | - | Only if Bugs/Vermin = Yes | View window in DOC GENERATION FORM |

### 8B. HEALTH HAZARD ISSUES

| **Field Name** | **Field Type** | **Status** | **Priority** | **Display Condition** | **Notes** |
|---|---|---|---|---|---|
| Do You Have Any Health Hazards with Your Unit? | Dropdown (Yes/No) | EXISTING | - | Always visible | ⚙️ **CATEGORY TRIGGER** |
| ☐ Mold | Checkbox | MODIFIED | - | Only if Health Hazards = Yes | Split from "Mold/mildew/mushrooms" |
| ☐ Mildew | Checkbox | MODIFIED | - | Only if Health Hazards = Yes | Split from "Mold/mildew/mushrooms" |
| ☐ Mushrooms | Checkbox | MODIFIED | - | Only if Health Hazards = Yes | Split from "Mold/mildew/mushrooms" |
| ☐ Raw sewage on exterior | Checkbox | MODIFIED | - | Only if Health Hazards = Yes | Was "Raw sewage on exterior ground" |
| ☐ Toxic water pollution | Checkbox | MODIFIED | - | Only if Health Hazards = Yes | Was "Noxious fumes from sewer" |
| ☐ Chemical/paint contamination | Checkbox | MODIFIED | - | Only if Health Hazards = Yes | Was "Chemicals/paints contamination" |
| ☐ Offensive odors | Checkbox | MODIFIED | - | Only if Health Hazards = Yes | Was "Hazards to health: Offensive to the senses" |
| Describe health hazard issues in detail | Text Area | EXISTING | - | Only if Health Hazards = Yes | View window in DOC GENERATION FORM |
| When Did Your Health Hazards Issues Start? | Text Input | EXISTING | - | Only if Health Hazards = Yes | View window in DOC GENERATION FORM |
| Were Any Health Hazards Issues Repairs Made? (how long, how many times) | Text Area | EXISTING | - | Only if Health Hazards = Yes | View window in DOC GENERATION FORM |

---

## 9. LEGAL HISTORY & ACTIONS

### 9A. GOVERNMENT ENTITIES CONTACTED

| **Field Name** | **Field Type** | **Status** | **Priority** | **Display Condition** | **Notes** |
|---|---|---|---|---|---|
| Have you filed anything with the Housing and/or Health and Safety Department? | Dropdown (Yes/No) | EXISTING | - | Always visible | ⚙️ **CATEGORY TRIGGER** |
| **☐ Health Department** | **Checkbox** | **NEW** | **HIGH** | Only if Government Filing = Yes | Match DOC GENERATION FORM |
| **☐ Police Department** | **Checkbox** | **NEW** | **HIGH** | Only if Government Filing = Yes | Match DOC GENERATION FORM |
| **☐ Housing Authority** | **Checkbox** | **NEW** | **HIGH** | Only if Government Filing = Yes | Match DOC GENERATION FORM |
| **☐ Department of Environmental Health** | **Checkbox** | **NEW** | **HIGH** | Only if Government Filing = Yes | Match DOC GENERATION FORM |
| **☐ Code Enforcement** | **Checkbox** | **NEW** | **HIGH** | Only if Government Filing = Yes | Match DOC GENERATION FORM |
| **☐ Department of Health Services** | **Checkbox** | **NEW** | **HIGH** | Only if Government Filing = Yes | Match DOC GENERATION FORM |
| **☐ Fire Department** | **Checkbox** | **NEW** | **HIGH** | Only if Government Filing = Yes | Match DOC GENERATION FORM |

### 9B. NOTICE ISSUES

| **Field Name** | **Field Type** | **Status** | **Priority** | **Display Condition** | **Notes** |
|---|---|---|---|---|---|
| Have you been given any notices? | Dropdown (Yes/No) | EXISTING | - | Always visible | ⚙️ **CATEGORY TRIGGER** |
| **☐ 3-day** | **Checkbox** | **NEW** | **HIGH** | Only if Notices = Yes | Match DOC GENERATION FORM |
| **☐ 24-hour** | **Checkbox** | **NEW** | **HIGH** | Only if Notices = Yes | Match DOC GENERATION FORM |
| **☐ 30-day** | **Checkbox** | **NEW** | **HIGH** | Only if Notices = Yes | Match DOC GENERATION FORM |
| **☐ 60-day** | **Checkbox** | **NEW** | **HIGH** | Only if Notices = Yes | Match DOC GENERATION FORM |
| **☐ To quit** | **Checkbox** | **NEW** | **HIGH** | Only if Notices = Yes | Match DOC GENERATION FORM |
| **☐ Perform or quit** | **Checkbox** | **NEW** | **HIGH** | Only if Notices = Yes | Match DOC GENERATION FORM |
| Describe the notices you received in detail | Text Area | EXISTING | - | Only if Notices = Yes | View window in DOC GENERATION FORM |

### 9C. SAFETY ISSUES

| **Field Name** | **Field Type** | **Status** | **Priority** | **Display Condition** | **Notes** |
|---|---|---|---|---|---|
| **Do You Have Any Safety Issues?** | **Dropdown (Yes/No)** | **NEW** | **HIGH** | Always visible | ⚙️ **CATEGORY TRIGGER** |
| **☐ Broken / inoperable security gate** | **Checkbox** | **NEW** | **HIGH** | Only if Safety Issues = Yes | Match DOC GENERATION FORM |
| **☐ Unauthorized entries** | **Checkbox** | **NEW** | **HIGH** | Only if Safety Issues = Yes | Match DOC GENERATION FORM (was text field) |
| **☐ Security cameras** | **Checkbox** | **NEW** | **HIGH** | Only if Safety Issues = Yes | Match DOC GENERATION FORM |
| **☐ Broken doors** | **Checkbox** | **NEW** | **HIGH** | Only if Safety Issues = Yes | Match DOC GENERATION FORM |
| **☐ Broken buzzer to get in** | **Checkbox** | **NEW** | **HIGH** | Only if Safety Issues = Yes | Match DOC GENERATION FORM |
| **☐ Inoperable locks** | **Checkbox** | **NEW** | **HIGH** | Only if Safety Issues = Yes | Match DOC GENERATION FORM |
| **Describe safety issues in detail** | **Text Area** | **NEW** | **HIGH** | Only if Safety Issues = Yes | View window in DOC GENERATION FORM |
| **When Did Safety Issues Start?** | **Text Input** | **NEW** | **HIGH** | Only if Safety Issues = Yes | View window in DOC GENERATION FORM |
| **Were Any Safety Repairs Made? (how long, how many times)** | **Text Area** | **NEW** | **HIGH** | Only if Safety Issues = Yes | View window in DOC GENERATION FORM |

### 9D. HARASSMENT ISSUES

| **Field Name** | **Field Type** | **Status** | **Priority** | **Display Condition** | **Notes** |
|---|---|---|---|---|---|
| Has your Landlord/ Property Manager Harassed You in Any Way? | Dropdown (Yes/No) | EXISTING | - | Always visible | ⚙️ **CATEGORY TRIGGER** |
| **☐ Unlawful Detainer** | **Checkbox** | **NEW** | **MEDIUM** | Only if Harassment = Yes | Match DOC GENERATION FORM |
| **☐ Eviction threats** | **Checkbox** | **NEW** | **MEDIUM** | Only if Harassment = Yes | Match DOC GENERATION FORM |
| **☐ By defendant** | **Checkbox** | **NEW** | **MEDIUM** | Only if Harassment = Yes | Match DOC GENERATION FORM |
| **☐ By maintenance man/workers** | **Checkbox** | **NEW** | **MEDIUM** | Only if Harassment = Yes | Match DOC GENERATION FORM |
| **☐ By manager/building staff** | **Checkbox** | **NEW** | **MEDIUM** | Only if Harassment = Yes | Match DOC GENERATION FORM |
| **☐ By owner** | **Checkbox** | **NEW** | **MEDIUM** | Only if Harassment = Yes | Match DOC GENERATION FORM |
| **☐ Other tenants** | **Checkbox** | **NEW** | **MEDIUM** | Only if Harassment = Yes | Match DOC GENERATION FORM |
| **☐ Illegitimate notices** | **Checkbox** | **NEW** | **MEDIUM** | Only if Harassment = Yes | Match DOC GENERATION FORM |
| **☐ Refusal to make timely repairs** | **Checkbox** | **NEW** | **MEDIUM** | Only if Harassment = Yes | Match DOC GENERATION FORM |
| **☐ Written threats** | **Checkbox** | **NEW** | **MEDIUM** | Only if Harassment = Yes | Match DOC GENERATION FORM |
| **☐ Aggressive/inappropriate language** | **Checkbox** | **NEW** | **MEDIUM** | Only if Harassment = Yes | Match DOC GENERATION FORM |
| **☐ Physical threats or touching** | **Checkbox** | **NEW** | **MEDIUM** | Only if Harassment = Yes | Match DOC GENERATION FORM |
| **☐ Notices singling out one tenant** | **Checkbox** | **NEW** | **MEDIUM** | Only if Harassment = Yes | Match DOC GENERATION FORM |
| **☐ Duplicative notices** | **Checkbox** | **NEW** | **MEDIUM** | Only if Harassment = Yes | Match DOC GENERATION FORM |
| **☐ Untimely Response from Landlord** | **Checkbox** | **NEW** | **MEDIUM** | Only if Harassment = Yes | Match DOC GENERATION FORM |
| Describe harassment in detail | Text Area | EXISTING | - | Only if Harassment = Yes | View window in DOC GENERATION FORM |
| **When Did Harassment Start?** | **Text Input** | **NEW** | **MEDIUM** | Only if Harassment = Yes | View window in DOC GENERATION FORM |

### 9E. OTHER LEGAL HISTORY

| **Field Name** | **Field Type** | **Status** | **Priority** | **Display Condition** | **Notes** |
|---|---|---|---|---|---|
| Have you ever received rent deductions due to your problems | Dropdown | EXISTING | - | Always visible | View window in DOC GENERATION FORM |
| Have you ever been relocated due to issues with your unit? | Dropdown | EXISTING | - | Always visible | View window in DOC GENERATION FORM |
| Have you filed or been involved in a lawsuit? | Dropdown | EXISTING | - | Always visible | View window in DOC GENERATION FORM |
| Have you filed any police reports? | Text Area | EXISTING | - | Always visible | View window in DOC GENERATION FORM |
| Any lost stolen or damaged property due to theft or leaks? | Text Area | EXISTING | - | Always visible | Maps to Stolen/Damaged Items in DOC GENERATION FORM |

---

## 10. ADDITIONAL INFORMATION & CASE ASSESSMENT

| **Field Name** | **Field Type** | **Status** | **Priority** | **Display Condition** | **Notes** |
|---|---|---|---|---|---|
| Any Other or Additional Problems? | Text Area | EXISTING | - | Always visible | View window in DOC GENERATION FORM |
| Do you have any neighbors that you think might be interested in being part of a lawsuit with you? | Text Input | EXISTING | - | Always visible | View window in DOC GENERATION FORM |

---

## FIELDS REMOVED FROM CLIENT INTAKE FORM

| **Field Name** | **Reason for Removal** |
|---|---|
| Is this a potential case? | Internal assessment field |
| Submitted By | Internal tracking |
| Cases * | Internal tracking |
| Other toxic/noxious fumes | Redundant with other health hazard options |
| Smoke from neighbors in building | Not in DOC GENERATION FORM discovery |
| Hazards to health: Blocks movement | Not in DOC GENERATION FORM discovery |
| Other (health hazards) | Catch-all not needed with specific options |
| Assigned parking not enforced | Combined into "Parking area issues" |

---

## SUMMARY STATISTICS

| **Metric** | **Count** |
|---|---|
| **Total Main Sections** | **10** |
| Total Subsections | 20 |
| Total Fields in Updated CLIENT INTAKE FORM | 346 |
| New Fields Added | 185 |
| Fields Modified | 67 |
| Fields Removed | 8 |
| Category Trigger Questions | 20 |
| High Priority New Fields | 152 |
| Medium Priority New Fields | 29 |
| Low Priority New Fields | 1 |

---

## CONDITIONAL DISPLAY LOGIC SUMMARY

### Pattern for All Issue Categories
```
1. Display Category Trigger Question (Always Visible)
   Example: "Do You Have Any [Issue Type]?" [Yes/No]

2. If User Selects "Yes":
   - Show all checkboxes for that category
   - Show "Describe [issue type] in detail" text area
   - Show "When Did [issue type] Start?" text input
   - Show "Were Any [issue type] Repairs Made?" text area

3. If User Selects "No":
   - Hide all fields for that category
   - Do not submit any data for that category
```

### Category Trigger Questions (20 Total)

1. Electrical Issues
2. Fire Hazard Issues
3. Appliance Issues
4. HVAC Issues
5. Plumbing Issues
6. Utility Issues
7. Flooring Issues
8. Window Issues
9. Door Issues
10. Cabinet Issues
11. Structural Issues
12. Common Area Issues
13. Trash Problems
14. Nuisance Issues
15. Bugs or Vermin (triggers both Vermin & Insect categories in DOC GENERATION FORM)
16. Health Hazards
17. Government Entities Filed
18. Notices Received
19. Safety Issues
20. Harassment

### Other Conditional Fields

- **Head of Household Logic:** If user selects "No" to "Are You Head of Household?", show fields for Head of Household First Name and Last Name

---

## IMPLEMENTATION NOTES

### Form Flow Recommendations

1. **Group Sections Logically:** Use accordions or tabs to organize the 10 main sections
2. **Visual Indicators:** Show which sections have been completed
3. **Progress Tracking:** Display completion percentage
4. **Save & Resume:** Allow users to save and return later
5. **Validation:** Ensure at least one issue category is selected before submission
6. **Mobile-Friendly:** Design responsive forms for all devices

### UI Components Needed

- Dropdown (Yes/No) fields for category triggers
- Checkbox groups for specific issues
- Text areas for detailed descriptions
- Text inputs for timeline information
- Conditional display logic engine
- Progress indicator
- Save/resume functionality

---

**Document Version:** 2.0  
**Last Updated:** [Current Date]  
**Status:** Ready for Implementation  
**Change Log:** Consolidated 26 sections into 10 main sections with subsections