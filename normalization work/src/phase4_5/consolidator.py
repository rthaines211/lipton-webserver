"""
Profile Consolidation Module for Phase 4.5

Creates master JSON files that consolidate all datasets by document profile type.
Each master file is formatted for direct use with Word document templates.
"""

from typing import Dict, Any, List
from collections import defaultdict


def consolidate_profiles(phase4_output: Dict[str, Any]) -> Dict[str, Any]:
    """
    Consolidate Phase 4 datasets by document profile type.

    Creates three master documents formatted for Word template merging:
    - SROGs: All SROGs interrogatories with boolean flags
    - PODs: All PODs documents with boolean flags
    - Admissions: All Admissions with boolean flags

    Args:
        phase4_output: Output from Phase 4 with profiled datasets

    Returns:
        Dictionary with three keys: 'srogs', 'pods', 'admissions'
        Each contains a flattened structure ready for document template merging

    Example output structure:
        {
            "srogs": {
                "HeadOfHousehold": "Clark Kent",
                "TargetDefendant": "htd ewt",
                "Case": {
                    "FilingCounty": "Los Angeles County",
                    "FullAddress": "333, Los Angeles, CA 28027"
                },
                "AllPlaintiffsUpperWithTypes": "CLARK KENT, AN INDIVIDUAL",
                "AllDefendantsUpperWithTypes": "HTD EWT, MANAGER",
                "SROGsGeneral": "true",
                "HasMold": "true",
                "IsManager": "true",
                ...all other flags as "true" or "false"...
                "Plaintiffs": [
                    {"name": "Clark Kent", "type": "Individual"},
                    ...
                ]
            },
            "pods": {...},
            "admissions": {...}
        }
    """
    datasets = phase4_output.get("datasets", [])

    # Group datasets by profile type
    profiles = {
        "srogs": [],
        "pods": [],
        "admissions": []
    }

    for dataset in datasets:
        # Phase 4 structure has profile data nested under profile-specific keys
        if "srogs" in dataset:
            profiles["srogs"].append(dataset["srogs"])
        if "pods" in dataset:
            profiles["pods"].append(dataset["pods"])
        if "admissions" in dataset:
            profiles["admissions"].append(dataset["admissions"])

    # Build consolidated output for each profile
    consolidated = {}

    for profile_key in ["srogs", "pods", "admissions"]:
        profile_datasets = profiles[profile_key]

        if not profile_datasets:
            continue

        # For now, use the first dataset as the primary dataset
        # In multi-pair cases, this could be enhanced to handle multiple pairs
        first_dataset = profile_datasets[0]

        # Extract party information
        plaintiff = first_dataset.get("plaintiff", {})
        defendant = first_dataset.get("defendant", {})
        case_metadata = first_dataset.get("case_metadata", {})

        # Build HeadOfHousehold and TargetDefendant
        head_of_household = plaintiff.get("full_name", "")
        target_defendant = defendant.get("full_name", "")

        # Build Case object
        case_obj = {
            "FilingCounty": case_metadata.get("filing_county", ""),
            "FilingCity": case_metadata.get("filing_city", ""),
            "FullAddress": case_metadata.get("property_address_with_unit", case_metadata.get("property_address", "")),
            "Address": case_metadata.get("property_address", ""),
            "City": case_metadata.get("city", ""),
            "State": case_metadata.get("state", ""),
            "Zip": case_metadata.get("zip", "")
        }

        # Build AllPlaintiffsUpperWithTypes and AllDefendantsUpperWithTypes
        # For single plaintiff/defendant, format as: "CLARK KENT, an Individual"
        plaintiff_type = plaintiff.get("entity_type", "Individual")
        defendant_type = defendant.get("entity_type", defendant.get("role", ""))

        # Format entity type for display with proper article
        plaintiff_article = 'an' if plaintiff_type and plaintiff_type[0].lower() in 'aeiou' else 'a'
        defendant_article = 'an' if defendant_type and defendant_type[0].lower() in 'aeiou' else 'a'

        plaintiff_type_display = f"{plaintiff_article} {plaintiff_type}" if plaintiff_type else "an Individual"
        defendant_type_display = f"{defendant_article} {defendant_type}" if defendant_type else "a Defendant"

        all_plaintiffs_upper = f"{head_of_household.upper()}, {plaintiff_type_display}"
        all_defendants_upper = f"{target_defendant.upper()}, {defendant_type_display}"

        # Build Plaintiffs array
        plaintiffs_array = [{
            "name": head_of_household,
            "type": plaintiff_type or "Individual",
            "unit_number": plaintiff.get("unit_number", "")
        }]

        # Get flags from both interrogatory_counts AND boolean flags from Phase 3
        interrogatory_counts = first_dataset.get("interrogatory_counts", {})
        boolean_flags = first_dataset.get("flags", {})

        # Convert all flags to string "true" or "false"
        # Priority: interrogatory_counts > 0 OR boolean flag is True
        all_possible_flags = _get_all_possible_flags()

        flag_strings = {}
        for flag_name in all_possible_flags:
            # Check if flag has interrogatories OR is set to true in Phase 3 boolean flags
            has_interrogatories = interrogatory_counts.get(flag_name, 0) > 0
            is_boolean_true = boolean_flags.get(flag_name, False) == True
            flag_strings[flag_name] = "true" if (has_interrogatories or is_boolean_true) else "false"

        # Build the consolidated master document
        master_doc = {
            "HeadOfHousehold": head_of_household,
            "TargetDefendant": target_defendant,
            "Case": case_obj,
            "AllPlaintiffsUpperWithTypes": all_plaintiffs_upper,
            "AllDefendantsUpperWithTypes": all_defendants_upper,
            "Plaintiffs": plaintiffs_array
        }

        # Add all flag strings
        master_doc.update(flag_strings)

        consolidated[profile_key] = master_doc

    return consolidated


def _get_all_possible_flags() -> List[str]:
    """
    Return a list of all possible flag names across all profiles.

    This is a comprehensive list of all flags that can appear in any profile.
    """
    return [
        # Profile-specific general flags
        "SROGsGeneral",
        "PODsGeneral",
        "AdmissionsGeneral",

        # Role flags
        "IsOwner",
        "IsManager",
        "IsOwnerManager",

        # Location flags
        "HasLosAngeles",

        # Notice flags
        "HasNotices",
        "Has3DayNotices",
        "Has24HourNotices",
        "Has30DayNotices",
        "Has60DayNotices",
        "HasToQuitNotices",
        "HasPerformOrQuit",

        # Government flags
        "HasGovContact",
        "HasDepartmentOfEnvironmentalHealth",
        "HasDepartmentOfPublicHealth",
        "HasDepartmentOfHealthServices",
        "HasFireDepartment",
        "HasPoliceDepartment",
        "HasCodeEn",
        "HasCodeEnforcement",

        # Electrical flags
        "HasElectrical",
        "HasElectricalIssues",
        "HasOutlets",
        "HasPanel",
        "HasExteriorLighting",
        "HasInteriorLighting",
        "HasFans",
        "HasWallSwitches",
        "HasLightFixtures",
        "HasFixtures",

        # Fire hazard flags
        "HasFireHazard",
        "HasFireHazardIssues",
        "HasSmokeAlarms",
        "HasFireExtinguisher",
        "HasNonCompliantElectricity",
        "HasNonGfiElectricalOutlets",
        "HasCarbonmonoxideDetectors",

        # Vermin flags
        "HasVermin",
        "HasRatsMice",
        "HasSkunks",
        "HasPigeons",
        "HasBats",
        "HasRaccoons",
        "HasRacoons",
        "HasOpossums",

        # HVAC flags
        "HasHvac",
        "HasHVAC",
        "HasHeater",
        "HasAC",
        "HasVentilation",

        # Plumbing flags
        "HasPlumbing",
        "HasPlumbingIssues",
        "HasLeaks",
        "HasNoHotWater",
        "HasSewageComingOut",
        "HasCloggedToilet",
        "HasCloggedToilets",
        "HasCloggedBath",
        "HasCloggedSink",
        "HasCloggedSinks",
        "HasCloggedShower",
        "HasClogs",
        "HasToilet",
        "HasShower",
        "HasBath",
        "HasNoColdWater",
        "HasNoCleanWaterSupply",
        "HasInsufficientWaterPressure",
        "HasUnsanitaryWater",

        # Window flags
        "HasWindows",
        "HasWindowsIssues",
        "HasBrokenWindows",
        "HasBrokenMissingScreens",
        "HasWindowScreens",
        "HasWindowLeaks",
        "HasWindowsDoNotLock",
        "HasMissingWindows",

        # Door flags
        "HasDoors",
        "HasDoorIssues",
        "HasBrokenDoors",
        "HasDoorsDoNotCloseProperly",
        "HasBrokenHinges",
        "HasDoorKnobs",
        "HasDoorLocks",
        "HasSlidingGlassDoors",
        "HasIneffectiveWaterproofing",
        "HasWaterIntrusionInsects",

        # Flooring flags
        "HasFloors",
        "HasFlooringIssues",
        "HasUnevenFlooring",
        "HasCarpet",
        "HasTiles",
        "HasNailsStickingOut",

        # Cabinet flags
        "HasCabinets",
        "HasCabinetsBroken",
        "HasCabinetHinges",
        "HasCabinetAlignment",

        # Appliance flags
        "HasAppliances",
        "HasStove",
        "HasOven",
        "HasGarbageDisposal",
        "HasDishwasher",
        "HasWasherDryer",
        "HasMicrowave",
        "HasRefrigerator",

        # Insect flags
        "HasInsects",
        "HasAnts",
        "HasRoaches",
        "HasFlies",
        "HasBedbugs",
        "HasBees",
        "HasWasps",
        "HasHornets",
        "HasSpiders",
        "HasTermites",
        "HasMosquitos",

        # Structure flags
        "HasStructure",
        "HasStructureIssues",
        "HasHolesInCeilingWalls",
        "HasHoleInCeiling",
        "HasHoleInWall",
        "HasExteriorDeckPorch",
        "HasStaircase",
        "HasBasementFlood",
        "HasFlooding",
        "HasBumpsInCeiling",
        "HasWaterStainsOnCeilingWalls",
        "HasWaterStainsOnCeiling",
        "HasWaterStainsOnWall",
        "HasSoftSpotsDueToLeaks",
        "HasPaint",
        "HasIneffectiveWaterproofingOfTheTubsToilet",
        "HasWaterproofToilet",
        "HasWaterproofTub",
        "HasIneffectiveWeatherproofingOfAnyWindowsDoors",
        "HasLeaksInGarage",

        # Common area flags
        "HasCommonArea",
        "HasCommonAreasIssues",
        "HasFilthRubbishGarbage",
        "HasCommonAreaVermin",
        "HasCommonAreaInsects",
        "HasGym",
        "HasMailboxBroken",
        "HasBrokenGate",
        "HasRecreationRoom",
        "HasParkingAreaIssues",
        "HasDamageToCars",
        "HasSwimmingPool",
        "HasJacuzzi",
        "HasElevator",
        "HasLaundryRoom",
        "HasEntrancesBlocked",
        "HasBlockedAreasDoors",

        # Harassment flags
        "HasHarassment",
        "HasHarassmentIssues",
        "HasHarrassmentManagerStaff",
        "HasHarrassmentByOwnerAndTheirGuests",
        "HasHarrassmentMaintenanceManWorkers",
        "HasHarrassmentByDefendants",
        "HasHarrassmentOtherTenants",
        "HasEvictionThreat",
        "HasIllegitimateNotices",
        "HasRefusalToMakeTimelyRepairs",
        "HasUnlawfulDetainer",
        "HasUnauthorizedEntries",
        "HasUntimelyResponseFromLandlord",
        "HasWrittenThreats",
        "HasAggressiveInappropriateLanguage",
        "HasPhysicalThreatsOrTouching",
        "HasNoticesSinglingOutOneTenant",
        "HasDuplicativeNotices",

        # Nuisance flags
        "HasNuisance",
        "HasNuisanceIssues",
        "HasNoisyNeighbors",
        "HasDrugs",
        "HasSmoking",
        "HasGangs",

        # Health hazard flags
        "HasHealthHazards",
        "HasHealthHazardIssues",
        "HasGasLeaks",
        "HasMold",
        "HasToxicWaterPollution",
        "HasMildew",
        "HasMushrooms",
        "HasRawSewageOnExterior",
        "HasNoxiousFumes",
        "HasChemicalsPaintContamination",
        "HasOffensiveOdors",

        # Landlord issues
        "HasNonresponsiveLandlord",

        # Utility flags
        "HasWaterShutoffs",
        "HasHeatShutoffs",
        "HasGasShutoffs",
        "HasElectricityShutoffs",

        # Trash flags
        "HasTrashProblems",
        "HasInadequateNumberOfTrashReceptacles",
        "HasInadequateServicingAndEmptyingTrashReceptacles",

        # Safety flags
        "HasSafety",
        "HasInoperableLocks",
        "HasBrokenSecurityGate",
        "HasSecurityCameras",
        "HasBrokenBuzzerToGetIn",
        "HasStolenItems",
        "HasDamagedItems",
        "HasInjury",

        # Discrimination flags
        "HasAgeDiscrimination",
        "HasDisabilityDiscrimination",
        "HasRacialDiscrimination",

        # Security deposit
        "HasSecurityDeposit",
    ]
