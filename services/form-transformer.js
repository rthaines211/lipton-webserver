/**
 * Form Transformer Service
 *
 * Handles transformation of raw HTML form data into structured JSON format
 * for the Phase 2 document generation system.
 *
 * Key transformations:
 * 1. Checkbox selections → arrays and boolean flags
 * 2. Plaintiff/defendant data → unique IDs and structured objects
 * 3. Address data → full formatting with city/state/zip
 * 4. Issue tracking → categorized discovery
 * 5. Normalized keys → human-readable format (reversion)
 *
 * Data Flow:
 * Raw Form Data → transformFormData() → Normalized JSON → revertToOriginalFormat() → Final Output
 *
 * This module was extracted from server.js to improve maintainability and testability.
 *
 * @module services/form-transformer
 */

/**
 * Transform raw form data into structured format
 *
 * Processes HTML form submissions and converts them into a structured JSON
 * object with separate arrays for plaintiffs, defendants, and organized
 * issue discovery data.
 *
 * @param {Object} rawData - Raw form data from POST request body
 * @returns {Object} Structured data with Form, PlaintiffDetails, DefendantDetails2, Full_Address
 */
function transformFormData(rawData) {
    console.log('Raw form data keys:', Object.keys(rawData));

    // Extract plaintiffs
    const plaintiffs = [];
    const plaintiffNumbers = new Set();

    // Find all plaintiff numbers
    Object.keys(rawData).forEach(key => {
        const match = key.match(/plaintiff-(\d+)-/);
        if (match) {
            plaintiffNumbers.add(parseInt(match[1]));
        }
    });

    console.log('Found plaintiff numbers:', Array.from(plaintiffNumbers));

    // Process each plaintiff
    plaintiffNumbers.forEach(num => {
        const isHeadOfHousehold = rawData[`plaintiff-${num}-head`] === 'yes';

        const plaintiff = {
            Id: generateShortId(),
            PlaintiffItemNumberName: {
                First: rawData[`plaintiff-${num}-first-name`] || null,
                FirstAndLast: null,
                Last: rawData[`plaintiff-${num}-last-name`] || null,
                Middle: null,
                MiddleInitial: null,
                Prefix: null,
                Suffix: null
            },
            PlaintiffItemNumberType: rawData[`plaintiff-${num}-type`] || "Individual",
            PlaintiffItemNumberAgeCategory: [
                rawData[`plaintiff-${num}-age`] === 'child' ? 'Child' : 'Adult'
            ],
            HeadOfHousehold: isHeadOfHousehold,
            ItemNumber: num
        };

        // Only include PlaintiffItemNumberDiscovery if this plaintiff is head of household
        if (isHeadOfHousehold) {
            plaintiff.PlaintiffItemNumberDiscovery = extractIssueData(rawData, num);
        }

        // Set FirstAndLast
        if (plaintiff.PlaintiffItemNumberName.First && plaintiff.PlaintiffItemNumberName.Last) {
            plaintiff.PlaintiffItemNumberName.FirstAndLast =
                `${plaintiff.PlaintiffItemNumberName.First} ${plaintiff.PlaintiffItemNumberName.Last}`;
        }

        plaintiffs.push(plaintiff);
    });

    // Extract defendants
    const defendants = [];
    const defendantNumbers = new Set();

    // Find all defendant numbers
    Object.keys(rawData).forEach(key => {
        const match = key.match(/defendant-(\d+)-/);
        if (match) {
            defendantNumbers.add(parseInt(match[1]));
        }
    });

    console.log('Found defendant numbers:', Array.from(defendantNumbers));

    // Process each defendant
    defendantNumbers.forEach(num => {
        const defendant = {
            Id: generateShortId(),
            DefendantItemNumberName: {
                First: rawData[`defendant-${num}-first-name`] || null,
                FirstAndLast: null,
                Last: rawData[`defendant-${num}-last-name`] || null,
                Middle: null,
                MiddleInitial: null,
                Prefix: null,
                Suffix: null
            },
            DefendantItemNumberType: rawData[`defendant-${num}-entity`] || "Individual",
            DefendantItemNumberManagerOwner: rawData[`defendant-${num}-role`] === 'manager' ? 'Manager' : 'Owner',
            ItemNumber: num
        };

        // Set FirstAndLast
        if (defendant.DefendantItemNumberName.First && defendant.DefendantItemNumberName.Last) {
            defendant.DefendantItemNumberName.FirstAndLast =
                `${defendant.DefendantItemNumberName.First} ${defendant.DefendantItemNumberName.Last}`;
        }

        defendants.push(defendant);
    });

    // Build address object
    const fullAddress = buildFullAddress(rawData);

    return {
        Form: {
            Id: "1",
            InternalName: "AutoPopulationForm",
            Name: "Auto-Population Form"
        },
        PlaintiffDetails: plaintiffs,
        PlaintiffDetails_Minimum: 1,
        DefendantDetails2: defendants,
        DefendantDetails2_Minimum: 1,
        DefendantDetails2_Maximum: 10,
        Full_Address: fullAddress,
        FilingCity: rawData['Filing city'] || rawData['filing-city'] || null,
        FilingCounty: rawData['Filing county'] || rawData['filing-county'] || null,
        NotificationEmailOptIn: Boolean(rawData.notificationEmailOptIn),
        NotificationEmail: rawData.notificationEmail || null
    };
}

/**
 * Extract issue data for a plaintiff based on the form field structure
 *
 * This function transforms raw form checkbox data into structured arrays and boolean flags.
 * It processes multiple categories of issues (vermin, insects, plumbing, etc.) and creates
 * both category-level boolean flags (e.g., "VerminIssue") and detailed arrays of specific
 * issues (e.g., ["Rats/Mice", "Bedbugs"]).
 *
 * Key Naming Convention:
 * All property keys use PascalCase without spaces (e.g., "FireHazard", "CommonAreas",
 * "SelectTrashProblems", "UtilityInterruptions", "AgeDiscrimination", etc.) to ensure
 * consistent JSON output format and easy programmatic access.
 *
 * Note: Some categories (TrashProblems, NoticesIssues, Safety, UtilityIssues) do NOT have
 * top-level boolean flags - they only populate their respective arrays. This ensures the
 * output matches the required specification without redundant Has_ flags.
 *
 * @param {Object} rawData - The raw form data from the POST request
 * @param {number} plaintiffNum - The plaintiff number to extract data for
 * @returns {Object} Structured issue data with arrays and boolean flags
 */
function extractIssueData(rawData, plaintiffNum) {
    console.log(`Extracting issue data for plaintiff ${plaintiffNum}`);

    // Initialize the complete issue structure matching goalOutput.md
    // Note: TrashProblems, NoticesIssues, Safety, and UtilityIssues flags have been removed
    // as they are not needed - only their respective arrays are used
    const issues = {
        VerminIssue: false,
        Vermin: [],
        InsectIssues: false,
        Insects: [],
        HVACIssues: false,
        HVAC: [],
        Electrical: [],
        ElectricalIssues: false,
        FireHazardIssues: false,
        GovernmentEntityContacted: false,
        AppliancesIssues: false,
        PlumbingIssues: false,
        CabinetsIssues: false,
        FireHazard: [],
        SpecificGovernmentEntityContacted: [],
        Appliances: [],
        Plumbing: [],
        Cabinets: [],
        FlooringIssues: false,
        WindowsIssues: false,
        DoorIssues: false,
        Flooring: [],
        Windows: [],
        Doors: [],
        StructureIssues: false,
        Structure: [],
        CommonAreasIssues: false,
        CommonAreas: [],
        SelectTrashProblems: [],
        NuisanceIssues: false,
        Nuisance: [],
        HealthHazard: [],
        HealthHazardIssues: false,
        HarassmentIssues: false,
        Harassment: [],
        SelectNoticesIssues: [],
        UtilityInterruptions: [],
        InjuryIssues: false,
        NonresponsiveLandlordIssues: false,
        UnauthorizedEntries: false,
        StolenItems: false,
        DamagedItems: false,
        AgeDiscrimination: false,
        RacialDiscrimination: false,
        DisabilityDiscrimination: false,
        Unit: rawData[`plaintiff-${plaintiffNum}-unit`] || null,
        SelectSafetyIssues: [],
        SecurityDeposit: false
    };

    // Check all form fields for this plaintiff to see what checkbox values exist
    const plaintiffFields = Object.keys(rawData).filter(key => key.includes(`plaintiff-${plaintiffNum}-`) || key.includes(`-${plaintiffNum}`));
    console.log(`Plaintiff ${plaintiffNum} fields:`, plaintiffFields);

    // Map checkbox field patterns to output structure
    // Each mapping contains:
    //   - category: The array name where the value should be added (e.g., "Vermin", "Insects")
    //   - value: The string value to add to the array (e.g., "Rats/Mice", "Bedbugs")
    //   - flag: (optional) The boolean flag to set to true when this checkbox is checked
    //
    // For categories like "Select Trash Problems", "Select Notices Issues", "Select Safety Issues",
    // and "Checkbox 44n6i" (utility issues), NO FLAG is specified - only the array is populated.
    // This prevents unwanted TrashProblems, NoticesIssues, Safety, and UtilityIssues boolean flags.
    const fieldMappings = getFieldMappings(plaintiffNum);

    // Process all mappings
    // This loop iterates through all field mappings and checks if each checkbox is checked ('on')
    // When a checkbox is found:
    //   1. If it has a category, add the value to that array
    //   2. If it has a flag, set that boolean to true
    //   3. Some mappings have only a category (no flag) - this is intentional for trash, notices, safety, utilities
    Object.keys(fieldMappings).forEach(fieldKey => {
        if (rawData[fieldKey] === 'on') {
            const mapping = fieldMappings[fieldKey];
            console.log(`Found checked field: ${fieldKey} -> ${JSON.stringify(mapping)}`);

            if (mapping.category) {
                // Add to array
                issues[mapping.category].push(mapping.value);
                // Set flag if one exists (some categories like trash/notices/safety/utilities don't have flags)
                if (mapping.flag) {
                    issues[mapping.flag] = true;
                }
            } else if (mapping.flag) {
                // Set boolean flag only (for direct boolean issues without arrays)
                issues[mapping.flag] = true;
            }
        }
    });

    // Deduplicate all arrays to prevent duplicate values
    // This is necessary because multiple form fields may map to the same consolidated value
    // (e.g., multiple clogged items all map to "Clogged bath/shower/sink/toilet")
    Object.keys(issues).forEach(key => {
        if (Array.isArray(issues[key]) && issues[key].length > 0) {
            issues[key] = [...new Set(issues[key])];
        }
    });

    console.log(`Final issues for plaintiff ${plaintiffNum}:`, issues);
    return issues;
}

/**
 * Get field mappings for a plaintiff number
 *
 * Returns object mapping form field names to output structure.
 * Extracted as separate function to reduce complexity and allow testing.
 *
 * @param {number} plaintiffNum - Plaintiff number
 * @returns {Object} Field mappings
 */
function getFieldMappings(plaintiffNum) {
    return {
        // Vermin issues
        [`vermin-RatsMice-${plaintiffNum}`]: { category: 'Vermin', value: 'Rats/Mice', flag: 'VerminIssue' },
        [`vermin-Skunks-${plaintiffNum}`]: { category: 'Vermin', value: 'Skunks', flag: 'VerminIssue' },
        [`vermin-Bats-${plaintiffNum}`]: { category: 'Vermin', value: 'Bats', flag: 'VerminIssue' },
        [`vermin-Raccoons-${plaintiffNum}`]: { category: 'Vermin', value: 'Raccoons', flag: 'VerminIssue' },
        [`vermin-Pigeons-${plaintiffNum}`]: { category: 'Vermin', value: 'Pigeons', flag: 'VerminIssue' },
        [`vermin-Opossums-${plaintiffNum}`]: { category: 'Vermin', value: 'Opossums', flag: 'VerminIssue' },

        // Insect issues
        [`insect-Ants-${plaintiffNum}`]: { category: 'Insects', value: 'Ants', flag: 'InsectIssues' },
        [`insect-Roaches-${plaintiffNum}`]: { category: 'Insects', value: 'Roaches', flag: 'InsectIssues' },
        [`insect-Flies-${plaintiffNum}`]: { category: 'Insects', value: 'Flies', flag: 'InsectIssues' },
        [`insect-Bedbugs-${plaintiffNum}`]: { category: 'Insects', value: 'Bedbugs', flag: 'InsectIssues' },
        [`insect-Wasps-${plaintiffNum}`]: { category: 'Insects', value: 'Wasps', flag: 'InsectIssues' },
        [`insect-Hornets-${plaintiffNum}`]: { category: 'Insects', value: 'Hornets', flag: 'InsectIssues' },
        [`insect-Spiders-${plaintiffNum}`]: { category: 'Insects', value: 'Spiders', flag: 'InsectIssues' },
        [`insect-Termites-${plaintiffNum}`]: { category: 'Insects', value: 'Termites', flag: 'InsectIssues' },
        [`insect-Mosquitos-${plaintiffNum}`]: { category: 'Insects', value: 'Mosquitos', flag: 'InsectIssues' },
        [`insect-Bees-${plaintiffNum}`]: { category: 'Insects', value: 'Bees', flag: 'InsectIssues' },

        // HVAC issues
        [`hvac-AirConditioner-${plaintiffNum}`]: { category: 'HVAC', value: 'Air conditioner', flag: 'HVACIssues' },
        [`hvac-Heater-${plaintiffNum}`]: { category: 'HVAC', value: 'Heater', flag: 'HVACIssues' },
        [`hvac-Ventilation-${plaintiffNum}`]: { category: 'HVAC', value: 'Ventilation', flag: 'HVACIssues' },

        // Electrical issues
        [`electrical-Outlets-${plaintiffNum}`]: { category: 'Electrical', value: 'Outlets', flag: 'ElectricalIssues' },
        [`electrical-Panel-${plaintiffNum}`]: { category: 'Electrical', value: 'Panel', flag: 'ElectricalIssues' },
        [`electrical-WallSwitches-${plaintiffNum}`]: { category: 'Electrical', value: 'Wall switches', flag: 'ElectricalIssues' },
        [`electrical-ExteriorLighting-${plaintiffNum}`]: { category: 'Electrical', value: 'Exterior lighting', flag: 'ElectricalIssues' },
        [`electrical-InteriorLighting-${plaintiffNum}`]: { category: 'Electrical', value: 'Interior lighting', flag: 'ElectricalIssues' },
        [`electrical-LightFixtures-${plaintiffNum}`]: { category: 'Electrical', value: 'Light fixtures', flag: 'ElectricalIssues' },
        [`electrical-Fans-${plaintiffNum}`]: { category: 'Electrical', value: 'Fans', flag: 'ElectricalIssues' },

        // Fire hazard issues
        [`fire-hazard-SmokeAlarms-${plaintiffNum}`]: { category: 'FireHazard', value: 'Smoke alarms', flag: 'FireHazardIssues' },
        [`fire-hazard-FireExtinguisher-${plaintiffNum}`]: { category: 'FireHazard', value: 'Fire extinguisher', flag: 'FireHazardIssues' },
        [`fire-hazard-Noncompliantelectricity-${plaintiffNum}`]: { category: 'FireHazard', value: 'Non-compliant electricity', flag: 'FireHazardIssues' },
        [`fire-hazard-NonGFIoutletsnearwater-${plaintiffNum}`]: { category: 'FireHazard', value: 'Non-GFI outlets near water', flag: 'FireHazardIssues' },
        [`fire-hazard-Carbonmonoxidedetectors-${plaintiffNum}`]: { category: 'FireHazard', value: 'Carbon monoxide detectors', flag: 'FireHazardIssues' },

        // Government entities
        [`government-HealthDepartment-${plaintiffNum}`]: { category: 'SpecificGovernmentEntityContacted', value: 'Health department', flag: 'GovernmentEntityContacted' },
        [`government-HousingAuthority-${plaintiffNum}`]: { category: 'SpecificGovernmentEntityContacted', value: 'Housing authority', flag: 'GovernmentEntityContacted' },
        [`government-CodeEnforcement-${plaintiffNum}`]: { category: 'SpecificGovernmentEntityContacted', value: 'Code enforcement', flag: 'GovernmentEntityContacted' },
        [`government-FireDepartment-${plaintiffNum}`]: { category: 'SpecificGovernmentEntityContacted', value: 'Fire department', flag: 'GovernmentEntityContacted' },
        [`government-PoliceDepartment-${plaintiffNum}`]: { category: 'SpecificGovernmentEntityContacted', value: 'Police department', flag: 'GovernmentEntityContacted' },
        [`government-DepartmentofEnvironmentalHealth-${plaintiffNum}`]: { category: 'SpecificGovernmentEntityContacted', value: 'Department of environmental health', flag: 'GovernmentEntityContacted' },
        [`government-DepartmentofHealthServices-${plaintiffNum}`]: { category: 'SpecificGovernmentEntityContacted', value: 'Department of health services', flag: 'GovernmentEntityContacted' },

        // Appliances
        [`appliances-Stove-${plaintiffNum}`]: { category: 'Appliances', value: 'Stove', flag: 'AppliancesIssues' },
        [`appliances-Dishwasher-${plaintiffNum}`]: { category: 'Appliances', value: 'Dishwasher', flag: 'AppliancesIssues' },
        [`appliances-Washerdryer-${plaintiffNum}`]: { category: 'Appliances', value: 'Washer/dryer', flag: 'AppliancesIssues' },
        [`appliances-Oven-${plaintiffNum}`]: { category: 'Appliances', value: 'Oven', flag: 'AppliancesIssues' },
        [`appliances-Microwave-${plaintiffNum}`]: { category: 'Appliances', value: 'Microwave', flag: 'AppliancesIssues' },
        [`appliances-Garbagedisposal-${plaintiffNum}`]: { category: 'Appliances', value: 'Garbage disposal', flag: 'AppliancesIssues' },
        [`appliances-Refrigerator-${plaintiffNum}`]: { category: 'Appliances', value: 'Refrigerator', flag: 'AppliancesIssues' },

        // Plumbing
        [`plumbing-Toilet-${plaintiffNum}`]: { category: 'Plumbing', value: 'Toilet', flag: 'PlumbingIssues' },
        [`plumbing-Insufficientwaterpressure-${plaintiffNum}`]: { category: 'Plumbing', value: 'Insufficient water pressure', flag: 'PlumbingIssues' },
        [`plumbing-Cloggedbath-${plaintiffNum}`]: { category: 'Plumbing', value: 'Clogged bath', flag: 'PlumbingIssues' },
        [`plumbing-Shower-${plaintiffNum}`]: { category: 'Plumbing', value: 'Shower', flag: 'PlumbingIssues' },
        [`plumbing-Nohotwater-${plaintiffNum}`]: { category: 'Plumbing', value: 'No hot water', flag: 'PlumbingIssues' },
        [`plumbing-Cloggedsinks-${plaintiffNum}`]: { category: 'Plumbing', value: 'Clogged sinks', flag: 'PlumbingIssues' },
        [`plumbing-Bath-${plaintiffNum}`]: { category: 'Plumbing', value: 'Bath', flag: 'PlumbingIssues' },
        [`plumbing-Nocoldwater-${plaintiffNum}`]: { category: 'Plumbing', value: 'No cold water', flag: 'PlumbingIssues' },
        [`plumbing-Cloggedshower-${plaintiffNum}`]: { category: 'Plumbing', value: 'Clogged shower', flag: 'PlumbingIssues' },
        [`plumbing-Fixtures-${plaintiffNum}`]: { category: 'Plumbing', value: 'Fixtures', flag: 'PlumbingIssues' },
        [`plumbing-Sewagecomingout-${plaintiffNum}`]: { category: 'Plumbing', value: 'Sewage coming out', flag: 'PlumbingIssues' },
        [`plumbing-NoCleanWaterSupply-${plaintiffNum}`]: { category: 'Plumbing', value: 'No Clean Water Supply', flag: 'PlumbingIssues' },
        [`plumbing-Leaks-${plaintiffNum}`]: { category: 'Plumbing', value: 'Leaks', flag: 'PlumbingIssues' },
        [`plumbing-Cloggedtoilets-${plaintiffNum}`]: { category: 'Plumbing', value: 'Clogged toilets', flag: 'PlumbingIssues' },
        [`plumbing-Unsanitarywater-${plaintiffNum}`]: { category: 'Plumbing', value: 'Unsanitary water', flag: 'PlumbingIssues' },

        // Cabinets
        [`cabinets-Broken-${plaintiffNum}`]: { category: 'Cabinets', value: 'Broken', flag: 'CabinetsIssues' },
        [`cabinets-Hinges-${plaintiffNum}`]: { category: 'Cabinets', value: 'Hinges', flag: 'CabinetsIssues' },
        [`cabinets-Alignment-${plaintiffNum}`]: { category: 'Cabinets', value: 'Alignment', flag: 'CabinetsIssues' },

        // Flooring
        [`flooring-Uneven-${plaintiffNum}`]: { category: 'Flooring', value: 'Uneven', flag: 'FlooringIssues' },
        [`flooring-Carpet-${plaintiffNum}`]: { category: 'Flooring', value: 'Carpet', flag: 'FlooringIssues' },
        [`flooring-Nailsstickingout-${plaintiffNum}`]: { category: 'Flooring', value: 'Nails sticking out', flag: 'FlooringIssues' },
        [`flooring-Tiles-${plaintiffNum}`]: { category: 'Flooring', value: 'Tiles', flag: 'FlooringIssues' },

        // Windows
        [`windows-Broken-${plaintiffNum}`]: { category: 'Windows', value: 'Broken', flag: 'WindowsIssues' },
        [`windows-Screens-${plaintiffNum}`]: { category: 'Windows', value: 'Screens', flag: 'WindowsIssues' },
        [`windows-Leaks-${plaintiffNum}`]: { category: 'Windows', value: 'Leaks', flag: 'WindowsIssues' },
        [`windows-Donotlock-${plaintiffNum}`]: { category: 'Windows', value: 'Do not lock', flag: 'WindowsIssues' },
        [`windows-Missingwindows-${plaintiffNum}`]: { category: 'Windows', value: 'Missing windows', flag: 'WindowsIssues' },
        [`windows-Brokenormissingscreens-${plaintiffNum}`]: { category: 'Windows', value: 'Broken or missing screens', flag: 'WindowsIssues' },

        // Doors (note: field names use "door-" not "doors-")
        [`door-Broken-${plaintiffNum}`]: { category: 'Doors', value: 'Broken', flag: 'DoorIssues' },
        [`door-Knobs-${plaintiffNum}`]: { category: 'Doors', value: 'Knobs', flag: 'DoorIssues' },
        [`door-Locks-${plaintiffNum}`]: { category: 'Doors', value: 'Locks', flag: 'DoorIssues' },
        [`door-Brokenhinges-${plaintiffNum}`]: { category: 'Doors', value: 'Broken hinges', flag: 'DoorIssues' },
        [`door-Slidingglassdoors-${plaintiffNum}`]: { category: 'Doors', value: 'Sliding glass doors', flag: 'DoorIssues' },
        [`door-Ineffectivewaterproofing-${plaintiffNum}`]: { category: 'Doors', value: 'Ineffective waterproofing', flag: 'DoorIssues' },
        [`door-Waterintrusionandorinsects-${plaintiffNum}`]: { category: 'Doors', value: 'Water intrusion and/or insects', flag: 'DoorIssues' },
        [`door-Donotcloseproperly-${plaintiffNum}`]: { category: 'Doors', value: 'Do not close properly', flag: 'DoorIssues' },

        // Structure
        // Note: Waterproofing and weatherproofing values use specific capitalization and wording
        [`structure-Bumpsinceiling-${plaintiffNum}`]: { category: 'Structure', value: 'Bumps in ceiling', flag: 'StructureIssues' },
        [`structure-Holeinceiling-${plaintiffNum}`]: { category: 'Structure', value: 'Hole in ceiling', flag: 'StructureIssues' },
        [`structure-Waterstainsonceiling-${plaintiffNum}`]: { category: 'Structure', value: 'Water stains on ceiling', flag: 'StructureIssues' },
        [`structure-Waterstainsonwall-${plaintiffNum}`]: { category: 'Structure', value: 'Water stains on wall', flag: 'StructureIssues' },
        [`structure-Holeinwall-${plaintiffNum}`]: { category: 'Structure', value: 'Hole in wall', flag: 'StructureIssues' },
        [`structure-Paint-${plaintiffNum}`]: { category: 'Structure', value: 'Paint', flag: 'StructureIssues' },
        [`structure-Exteriordeckporch-${plaintiffNum}`]: { category: 'Structure', value: 'Exterior deck/porch', flag: 'StructureIssues' },
        [`structure-Waterprooftoilet-${plaintiffNum}`]: { category: 'Structure', value: 'Waterproof toilet', flag: 'StructureIssues' },
        [`structure-Waterprooftub-${plaintiffNum}`]: { category: 'Structure', value: 'Waterproof tub', flag: 'StructureIssues' },
        [`structure-Staircase-${plaintiffNum}`]: { category: 'Structure', value: 'Staircase', flag: 'StructureIssues' },
        [`structure-Basementflood-${plaintiffNum}`]: { category: 'Structure', value: 'Basement flood', flag: 'StructureIssues' },
        [`structure-Leaksingarage-${plaintiffNum}`]: { category: 'Structure', value: 'Leaks in garage', flag: 'StructureIssues' },
        [`structure-SoftSpotsduetoLeaks-${plaintiffNum}`]: { category: 'Structure', value: 'Soft spots due to leaks', flag: 'StructureIssues' },
        [`structure-UneffectiveWaterproofingofthetubsortoilet-${plaintiffNum}`]: { category: 'Structure', value: 'Ineffective waterproofing of the tubs or toilet', flag: 'StructureIssues' },
        [`structure-IneffectiveWeatherproofingofanywindows-${plaintiffNum}`]: { category: 'Structure', value: 'Ineffective Weatherproofing of any windows doors', flag: 'StructureIssues' },

        // Common areas
        [`common-areas-Mailboxbroken-${plaintiffNum}`]: { category: 'CommonAreas', value: 'Mailbox broken', flag: 'CommonAreasIssues' },
        [`common-areas-Parkingareaissues-${plaintiffNum}`]: { category: 'CommonAreas', value: 'Parking area issues', flag: 'CommonAreasIssues' },
        [`common-areas-Damagetocars-${plaintiffNum}`]: { category: 'CommonAreas', value: 'Damage to cars', flag: 'CommonAreasIssues' },
        [`common-areas-Flooding-${plaintiffNum}`]: { category: 'CommonAreas', value: 'Flooding', flag: 'CommonAreasIssues' },
        [`common-areas-Entrancesblocked-${plaintiffNum}`]: { category: 'CommonAreas', value: 'Entrances blocked', flag: 'CommonAreasIssues' },
        [`common-areas-Swimmingpool-${plaintiffNum}`]: { category: 'CommonAreas', value: 'Swimming pool', flag: 'CommonAreasIssues' },
        [`common-areas-Jacuzzi-${plaintiffNum}`]: { category: 'CommonAreas', value: 'Jacuzzi', flag: 'CommonAreasIssues' },
        [`common-areas-Laundryroom-${plaintiffNum}`]: { category: 'CommonAreas', value: 'Laundry room', flag: 'CommonAreasIssues' },
        [`common-areas-Recreationroom-${plaintiffNum}`]: { category: 'CommonAreas', value: 'Recreation room', flag: 'CommonAreasIssues' },
        [`common-areas-Gym-${plaintiffNum}`]: { category: 'CommonAreas', value: 'Gym', flag: 'CommonAreasIssues' },
        [`common-areas-Elevator-${plaintiffNum}`]: { category: 'CommonAreas', value: 'Elevator', flag: 'CommonAreasIssues' },
        [`common-areas-FilthRubbishGarbage-${plaintiffNum}`]: { category: 'CommonAreas', value: 'Filth/Rubbish/Garbage', flag: 'CommonAreasIssues' },
        [`common-areas-Vermin-${plaintiffNum}`]: { category: 'CommonAreas', value: 'Vermin', flag: 'CommonAreasIssues' },
        [`common-areas-Insects-${plaintiffNum}`]: { category: 'CommonAreas', value: 'Insects', flag: 'CommonAreasIssues' },
        [`common-areas-BrokenGate-${plaintiffNum}`]: { category: 'CommonAreas', value: 'Broken gate', flag: 'CommonAreasIssues' },
        [`common-areas-Blockedareasdoors-${plaintiffNum}`]: { category: 'CommonAreas', value: 'Blocked areas/doors', flag: 'CommonAreasIssues' },

        // Trash problems (note: field names use "trash-" not "trash-problems-")
        [`trash-Inadequatenumberofreceptacles-${plaintiffNum}`]: { category: 'SelectTrashProblems', value: 'Inadequate number of receptacles' },
        [`trash-Improperservicingemptying-${plaintiffNum}`]: { category: 'SelectTrashProblems', value: 'Improper servicing/emptying' },

        // Nuisance
        [`nuisance-Drugs-${plaintiffNum}`]: { category: 'Nuisance', value: 'Drugs', flag: 'NuisanceIssues' },
        [`nuisance-Smoking-${plaintiffNum}`]: { category: 'Nuisance', value: 'Smoking', flag: 'NuisanceIssues' },
        [`nuisance-Noisyneighbors-${plaintiffNum}`]: { category: 'Nuisance', value: 'Noisy neighbors', flag: 'NuisanceIssues' },
        [`nuisance-Gangs-${plaintiffNum}`]: { category: 'Nuisance', value: 'Gangs', flag: 'NuisanceIssues' },

        // Health hazard
        // Note: Values are ordered as: Mold, Mildew, Mushrooms, Raw sewage, Noxious fumes, Chemical/paint, Toxic water, Offensive odors
        [`health-hazard-Mold-${plaintiffNum}`]: { category: 'HealthHazard', value: 'Mold', flag: 'HealthHazardIssues' },
        [`health-hazard-Mildew-${plaintiffNum}`]: { category: 'HealthHazard', value: 'Mildew', flag: 'HealthHazardIssues' },
        [`health-hazard-Mushrooms-${plaintiffNum}`]: { category: 'HealthHazard', value: 'Mushrooms', flag: 'HealthHazardIssues' },
        [`health-hazard-Rawsewageonexterior-${plaintiffNum}`]: { category: 'HealthHazard', value: 'Raw sewage on exterior', flag: 'HealthHazardIssues' },
        [`health-hazard-Noxiousfumes-${plaintiffNum}`]: { category: 'HealthHazard', value: 'Noxious fumes', flag: 'HealthHazardIssues' },
        [`health-hazard-Chemicalpaintcontamination-${plaintiffNum}`]: { category: 'HealthHazard', value: 'Chemical/paint contamination', flag: 'HealthHazardIssues' },
        [`health-hazard-Toxicwaterpollution-${plaintiffNum}`]: { category: 'HealthHazard', value: 'Toxic water pollution', flag: 'HealthHazardIssues' },
        [`health-hazard-Offensiveodors-${plaintiffNum}`]: { category: 'HealthHazard', value: 'Offensive odors', flag: 'HealthHazardIssues' },

        // Harassment
        [`harassment-UnlawfulDetainer-${plaintiffNum}`]: { category: 'Harassment', value: 'Unlawful detainer', flag: 'HarassmentIssues' },
        [`harassment-Evictionthreats-${plaintiffNum}`]: { category: 'Harassment', value: 'Eviction threats', flag: 'HarassmentIssues' },
        [`harassment-Bydefendant-${plaintiffNum}`]: { category: 'Harassment', value: 'By defendant', flag: 'HarassmentIssues' },
        [`harassment-Bymaintenancemanworkers-${plaintiffNum}`]: { category: 'Harassment', value: 'By maintenance man/workers', flag: 'HarassmentIssues' },
        [`harassment-Bymanagerbuildingstaff-${plaintiffNum}`]: { category: 'Harassment', value: 'By manager/building staff', flag: 'HarassmentIssues' },
        [`harassment-Byowner-${plaintiffNum}`]: { category: 'Harassment', value: 'By owner', flag: 'HarassmentIssues' },
        [`harassment-Othertenants-${plaintiffNum}`]: { category: 'Harassment', value: 'Other tenants', flag: 'HarassmentIssues' },
        [`harassment-Illegitimatenotices-${plaintiffNum}`]: { category: 'Harassment', value: 'Illegitimate notices', flag: 'HarassmentIssues' },
        [`harassment-Refusaltomaketimelyrepairs-${plaintiffNum}`]: { category: 'Harassment', value: 'Refusal to make timely repairs', flag: 'HarassmentIssues' },
        [`harassment-Writtenthreats-${plaintiffNum}`]: { category: 'Harassment', value: 'Written threats', flag: 'HarassmentIssues' },
        [`harassment-Aggressiveinappropriatelanguage-${plaintiffNum}`]: { category: 'Harassment', value: 'Aggressive/inappropriate language', flag: 'HarassmentIssues' },
        [`harassment-Physicalthreatsortouching-${plaintiffNum}`]: { category: 'Harassment', value: 'Physical threats or touching', flag: 'HarassmentIssues' },
        [`harassment-Noticessinglingoutonetenantbutnotuniformlygiventoalltenants-${plaintiffNum}`]: { category: 'Harassment', value: 'Notices singling out one tenant, but not uniformly given to all tenants', flag: 'HarassmentIssues' },
        [`harassment-Duplicativenotices-${plaintiffNum}`]: { category: 'Harassment', value: 'Duplicative notices', flag: 'HarassmentIssues' },
        [`harassment-UntimelyResponsefromLandlord-${plaintiffNum}`]: { category: 'Harassment', value: 'Untimely response from landlord', flag: 'HarassmentIssues' },

        // Notices issues (note: field names use "notices-" not "notices-issues-")
        [`notices-3day-${plaintiffNum}`]: { category: 'SelectNoticesIssues', value: '3-day' },
        [`notices-24hour-${plaintiffNum}`]: { category: 'SelectNoticesIssues', value: '24-hour' },
        [`notices-30day-${plaintiffNum}`]: { category: 'SelectNoticesIssues', value: '30-day' },
        [`notices-60day-${plaintiffNum}`]: { category: 'SelectNoticesIssues', value: '60-day' },
        [`notices-Toquit-${plaintiffNum}`]: { category: 'SelectNoticesIssues', value: 'To quit' },
        [`notices-Performorquit-${plaintiffNum}`]: { category: 'SelectNoticesIssues', value: 'Perform or quit' },

        // Utility issues (note: field names use "utility-" not "utility-issues-")
        [`utility-Gasleak-${plaintiffNum}`]: { category: 'UtilityInterruptions', value: 'Gas leak' },
        [`utility-Watershutoffs-${plaintiffNum}`]: { category: 'UtilityInterruptions', value: 'Water shutoffs' },
        [`utility-Electricityshutoffs-${plaintiffNum}`]: { category: 'UtilityInterruptions', value: 'Electricity shutoffs' },
        [`utility-Heatshutoff-${plaintiffNum}`]: { category: 'UtilityInterruptions', value: 'Heat shutoff' },
        [`utility-Gasshutoff-${plaintiffNum}`]: { category: 'UtilityInterruptions', value: 'Gas shutoff' },

        // Safety issues (note: field names use "safety-" not "safety-issues-")
        // Note: "Broken/inoperable security gate" uses "/" with no spaces for consistency
        [`safety-Brokeninoperablesecuritygate-${plaintiffNum}`]: { category: 'SelectSafetyIssues', value: 'Broken/inoperable security gate' },
        [`safety-Brokendoors-${plaintiffNum}`]: { category: 'SelectSafetyIssues', value: 'Broken doors' },
        [`safety-Unauthorizedentries-${plaintiffNum}`]: { category: 'SelectSafetyIssues', value: 'Unauthorized entries' },
        [`safety-Brokenbuzzertogetin-${plaintiffNum}`]: { category: 'SelectSafetyIssues', value: 'Broken buzzer to get in' },
        [`safety-Securitycameras-${plaintiffNum}`]: { category: 'SelectSafetyIssues', value: 'Security cameras' },
        [`safety-Inoperablelocks-${plaintiffNum}`]: { category: 'SelectSafetyIssues', value: 'Inoperable locks' },

        // Direct boolean issues
        [`direct-appliancesissues-${plaintiffNum}`]: { flag: 'AppliancesIssues' },
        [`direct-injuryissues-${plaintiffNum}`]: { flag: 'InjuryIssues' },
        [`direct-nonresponsivelandlordissues-${plaintiffNum}`]: { flag: 'NonresponsiveLandlordIssues' },
        [`direct-unauthorizedentries-${plaintiffNum}`]: { flag: 'UnauthorizedEntries' },
        [`direct-stolenitems-${plaintiffNum}`]: { flag: 'StolenItems' },
        [`direct-damageditems-${plaintiffNum}`]: { flag: 'DamagedItems' },
        [`direct-agediscrimination-${plaintiffNum}`]: { flag: 'AgeDiscrimination' },
        [`direct-racialdiscrimination-${plaintiffNum}`]: { flag: 'RacialDiscrimination' },
        [`direct-disabilitydiscrimination-${plaintiffNum}`]: { flag: 'DisabilityDiscrimination' },
        [`direct-securitydepositissues-${plaintiffNum}`]: { flag: 'SecurityDeposit' }
    };
}

/**
 * Build full address object
 *
 * Constructs structured address data from raw form fields.
 * Includes full address formatting, city/state/zip combinations,
 * and international address formatting.
 *
 * @param {Object} rawData - Raw form data
 * @returns {Object} Structured address object
 */
function buildFullAddress(rawData) {
    const line1 = rawData['property-address'] || '';
    const unit = rawData['apartment-unit'] ? ` ${rawData['apartment-unit']}` : '';
    const city = rawData['city'] || '';
    const state = rawData['state'] || '';
    const zip = rawData['zip-code'] || '';
    const stateName = getStateName(state);

    const streetAddress = line1 + unit;
    const fullAddress = `${streetAddress}, ${city}, ${stateName} ${zip}`;
    const cityStateZip = `${city}, ${stateName} ${zip}`;

    return {
        City: city,
        CityStatePostalCode: cityStateZip,
        Country: "United States",
        CountryCode: "US",
        FullAddress: fullAddress,
        FullInternationalAddress: `${fullAddress}, United States`,
        Latitude: null,
        Line1: streetAddress,
        Line2: null,
        Line3: null,
        Longitude: null,
        PostalCode: zip,
        State: stateName,
        StreetAddress: streetAddress,
        Type: "Home"
    };
}

/**
 * Convert state code to full name
 *
 * @param {string} stateCode - Two-letter state code (e.g., "CA", "NY")
 * @returns {string} Full state name (e.g., "California", "New York")
 */
function getStateName(stateCode) {
    const stateMap = {
        'AL': 'Alabama', 'AK': 'Alaska', 'AZ': 'Arizona', 'AR': 'Arkansas', 'CA': 'California',
        'CO': 'Colorado', 'CT': 'Connecticut', 'DE': 'Delaware', 'FL': 'Florida', 'GA': 'Georgia',
        'HI': 'Hawaii', 'ID': 'Idaho', 'IL': 'Illinois', 'IN': 'Indiana', 'IA': 'Iowa',
        'KS': 'Kansas', 'KY': 'Kentucky', 'LA': 'Louisiana', 'ME': 'Maine', 'MD': 'Maryland',
        'MA': 'Massachusetts', 'MI': 'Michigan', 'MN': 'Minnesota', 'MS': 'Mississippi', 'MO': 'Missouri',
        'MT': 'Montana', 'NE': 'Nebraska', 'NV': 'Nevada', 'NH': 'New Hampshire', 'NJ': 'New Jersey',
        'NM': 'New Mexico', 'NY': 'New York', 'NC': 'North Carolina', 'ND': 'North Dakota', 'OH': 'Ohio',
        'OK': 'Oklahoma', 'OR': 'Oregon', 'PA': 'Pennsylvania', 'RI': 'Rhode Island', 'SC': 'South Carolina',
        'SD': 'South Dakota', 'TN': 'Tennessee', 'TX': 'Texas', 'UT': 'Utah', 'VT': 'Vermont',
        'VA': 'Virginia', 'WA': 'Washington', 'WV': 'West Virginia', 'WI': 'Wisconsin', 'WY': 'Wyoming'
    };
    return stateMap[stateCode] || stateCode;
}

/**
 * Generate short random ID for plaintiffs/defendants
 *
 * Creates a 6-character random string for use as unique IDs.
 *
 * @returns {string} Random 6-character ID
 */
function generateShortId() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

/**
 * Revert normalized keys back to their original human-readable forms
 * and adjust value casing/spelling to match the original version
 *
 * This function recursively transforms the JSON output to match the original
 * key names and value formatting used in the first version of the application.
 *
 * @param {Object|Array} obj - The object or array to transform
 * @returns {Object|Array} Transformed object with original key names and value casing
 */
function revertToOriginalFormat(obj) {
    // Key mapping: normalized keys -> original human-readable keys
    const keyMappings = {
        'FilingCity': 'Filing city',
        'FilingCounty': 'Filing county',
        'HealthHazard': 'Health hazard',
        'SecurityDeposit': 'Security Deposit',
        'FireHazard': 'Fire Hazard',
        'SpecificGovernmentEntityContacted': 'Specific Government Entity Contacted',
        'CommonAreas': 'Common areas',
        'SelectTrashProblems': 'Select Trash Problems',
        'SelectSafetyIssues': 'Select Safety Issues',
        'SelectNoticesIssues': 'Select Notices Issues',
        'UtilityInterruptions': 'Checkbox 44n6i',
        'InjuryIssues': 'Injury Issues',
        'NonresponsiveLandlordIssues': 'Nonresponsive landlord Issues',
        'UnauthorizedEntries': 'Unauthorized entries',
        'StolenItems': 'Stolen items',
        'DamagedItems': 'Damaged items',
        'AgeDiscrimination': 'Age discrimination',
        'RacialDiscrimination': 'Racial Discrimination',
        'DisabilityDiscrimination': 'Disability discrimination',
        'NotificationEmailOptIn': 'Notification Email Opt-In',
        'NotificationEmail': 'Notification Email'
    };

    // Value mappings: normalized values -> original casing/spelling
    const valueMappings = {
        // HVAC
        'Air conditioner': 'Air Conditioner',

        // Electrical
        'Wall switches': 'Wall Switches',
        'Exterior lighting': 'Exterior Lighting',
        'Interior lighting': 'Interior Lighting',
        'Light fixtures': 'Light Fixtures',

        // Fire Hazard
        'Smoke alarms': 'Smoke Alarms',
        'Fire extinguisher': 'Fire Extinguisher',

        // Specific Government Entity Contacted
        'Health department': 'Health Department',
        'Housing authority': 'Housing Authority',
        'Code enforcement': 'Code Enforcement',
        'Fire department': 'Fire Department',
        'Police department': 'Police Department',
        'Department of environmental health': 'Department of Environmental Health',
        'Department of health services': 'Department of Health Services',

        // Common areas
        'Broken gate': 'Broken Gate',
        'Filth/Rubbish/Garbage': 'Filth Rubbish Garbage',

        // Harassment
        'Unlawful detainer': 'Unlawful Detainer',
        'Untimely response from landlord': 'Untimely Response from Landlord',

        // Structure
        'Soft spots due to leaks': 'Soft Spots due to Leaks',

        // Select Trash Problems
        'Improper servicing/emptying': 'Properly servicing and emptying receptacles',

        // Select Notices Issues
        'Perform or quit': 'Perform or Quit'
    };

    // Handle null, undefined, and primitive types
    if (obj === null || obj === undefined || typeof obj !== 'object') {
        return obj;
    }

    // Handle arrays - recursively transform each element
    if (Array.isArray(obj)) {
        return obj.map(item => {
            // Transform string values in arrays
            if (typeof item === 'string' && valueMappings[item]) {
                return valueMappings[item];
            }
            // Recursively transform objects in arrays
            if (typeof item === 'object') {
                return revertToOriginalFormat(item);
            }
            return item;
        });
    }

    // Handle objects - recursively transform keys and values
    const transformed = {};
    for (const [key, value] of Object.entries(obj)) {
        // Map the key name if it needs to be reverted
        const newKey = keyMappings[key] || key;

        // Recursively transform the value
        transformed[newKey] = revertToOriginalFormat(value);
    }

    return transformed;
}

// Export all transformation functions
module.exports = {
    transformFormData,
    revertToOriginalFormat,
    extractIssueData,
    buildFullAddress,
    getStateName,
    generateShortId,
    getFieldMappings
};
