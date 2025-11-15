#!/usr/bin/env python3
"""
Comprehensive audit of all three profiles (Admissions, SROGs, PODs)
against the Discovery Doc Profiles.md specification.
"""

# Spec counts from Discovery Doc Profiles.md
ADMISSIONS_SPEC = {
    "AdmissionsGeneral": 24,
    "IsOwner": 1,
    "IsManager": 1,
    "HasLosAngeles": 1,

    "HasElectrical": 6,
    "HasOutlets": 1,
    "HasPanel": 1,
    "HasExteriorLighting": 1,
    "HasInteriorLighting": 1,
    "HasFans": 1,
    "HasWallSwitches": 1,
    "HasLightFixtures": 1,
    "HasSmokeAlarms": 2,

    "HasVermin": 6,
    "HasRatsMice": 1,
    "HasSkunks": 1,
    "HasPigeons": 1,
    "HasBats": 1,
    "HasRacoons": 1,
    "HasOpossums": 1,

    "HasHvac": 6,
    "HasHeater": 1,
    "HasAC": 1,
    "HasVentilation": 1,

    "HasPlumbing": 6,
    "HasFixtures": 1,
    "HasLeaks": 1,
    "HasNoHotWater": 2,
    "HasSewageComingOut": 1,
    "HasCloggedToilet": 1,
    "HasCloggedBath": 1,
    "HasCloggedSink": 1,
    "HasToilet": 1,
    "HasShower": 2,
    "HasBath": 2,
    "HasNoColdWater": 1,
    "HasNoCleanWaterSupply": 1,
    "HasInsufficientWaterPressure": 1,
    "HasUnsanitaryWater": 1,

    "HasWindows": 6,
    "HasBrokenWindows": 1,
    "HasBrokenMissingScreens": 1,
    "HasWindowLeaks": 1,
    "HasWindowsDoNotLock": 1,
    "HasMissingWindows": 1,

    "HasDoors": 6,
    "HasBrokenDoors": 2,
    "HasDoorsDoNotCloseProperly": 1,
    "HasBrokenHinges": 1,
    "HasDoorKnobs": 1,
    "HasDoorLocks": 1,
    "HasSlidingGlassDoors": 1,
    "HasIneffectiveWaterproofing": 1,
    "HasWaterIntrusionInsects": 1,

    "HasFloors": 6,
    "HasUnevenFlooring": 1,
    "HasCarpet": 1,
    "HasTiles": 1,
    "HasNailsStickingOut": 1,

    "HasCabinets": 6,
    "HasCabinetsBroken": 1,
    "HasCabinetHinges": 1,
    "HasCabinetAlignment": 1,

    "HasAppliances": 6,
    "HasStove": 1,
    "HasOven": 1,
    "HasGarbageDisposal": 1,
    "HasDishwasher": 1,
    "HasWasherDryer": 1,
    "HasMicrowave": 1,

    "HasInsects": 6,
    "HasAnts": 1,
    "HasRoaches": 1,
    "HasFlies": 1,
    "HasBedbugs": 1,
    "HasBees": 1,
    "HasWasps": 1,
    "HasHornets": 1,
    "HasSpiders": 1,
    "HasTermites": 1,
    "HasMosquitos": 1,

    "HasStructure": 6,
    "HasHolesInCeilingWalls": 1,
    "HasExteriorDeckPorch": 1,
    "HasStaircase": 1,
    "HasBasementFlood": 1,
    "HasFlooding": 2,
    "HasBumpsInCeiling": 1,
    "HasWaterStainsOnCeilingWalls": 1,
    "HasSoftSpotsDueToLeaks": 1,
    "HasPaint": 1,
    "HasIneffectiveWaterproofingOfTheTubsToilet": 1,
    "HasIneffectiveWeatherproofingOfAnyWindowsDoors": 1,

    "HasCommonArea": 6,
    "HasFilthRubbishGarbage": 1,
    "HasCommonAreaVermin": 1,
    "HasCommonAreaInsects": 1,
    "HasGym": 1,
    "HasMailboxBroken": 3,
    "HasBrokenGate": 1,
    "HasRecreationRoom": 1,
    "HasLeaksInGarage": 1,
    "HasParkingAreaIssues": 1,
    "HasSwimmingPool": 1,
    "HasJacuzzi": 1,
    "HasElevator": 2,
    "HasLaundryRoom": 1,
    "HasEntrancesBlocked": 1,

    "HasFireHazard": 7,
    "HasNoncompliantElectricity": 1,
    "HasNonGfiElectricalOutlets": 1,
    "HasCarbonmonoxideDetectors": 1,
    "HasFireExtinguisher": 1,

    "HasHarassment": 5,
    "HasHarrassmentManagerStaff": 1,
    "HasHarrassmentByOwnerAndTheirGuests": 1,
    "HasHarrassmentMaintenanceManWorkers": 1,
    "HasHarrassmentOtherTenants": 1,
    "HasEvictionThreat": 1,
    "HasIllegitimateNotices": 1,
    "HasRefusalToMakeTimelyRepairs": 1,
    "HasUnlawfulDetainer": 5,
    "HasUnauthorizedEntries": 3,
    "HasUntimelyResponseFromLandlord": 1,
    "HasWrittenThreats": 1,
    "HasAggressiveInappropriateLanguage": 1,
    "HasPhysicalThreatsOrTouching": 1,
    "HasNoticesSinglingOutOneTenant": 1,
    "HasDuplicativeNotices": 1,

    "HasNuisance": 5,
    "HasNoisyNeighbors": 1,
    "HasDrugs": 1,
    "HasSmoking": 2,
    "HasGangs": 1,

    "HasHealthHazards": 6,
    "HasGasLeaks": 2,
    "HasMold": 6,
    "HasToxicWaterPollution": 2,
    "HasMildew": 1,
    "HasMushrooms": 1,
    "HasRawSewageOnExterior": 1,
    "HasNoxiousFumes": 1,
    "HasChemicalsPaintContamination": 2,
    "HasOffensiveOdors": 1,

    "HasNonresponsiveLandlord": 12,
    "HasWaterShutoffs": 1,
    "HasHeatShutoff": 1,  # Note: singular in spec
    "HasGasShutoff": 1,   # Note: singular in spec
    "HasElectricityShutoffs": 1,

    "HasTrashProblems": 7,
    "HasInadequateNumberOfTrashReceptacles": 1,
    "HasInadequateServicingAndEmptyingTrashReceptacles": 1,

    "HasSafety": 6,
    "HasInoperableLocks": 1,
    "HasBrokenSecurityGate": 1,
    "HasSecurityCameras": 1,

    "HasStolenItems": 3,

    "HasAgeDiscrimination": 10,
    "HasDisabilityDiscrimination": 10,
    "HasRacialDiscrimination": 10,
    "HasSecurityDeposit": 16,

    "HasGovContact": 9,
    "HasPerformOrQuit": 1,
    "Has3DayNotices": 1,
    "Has60DayNotices": 1,
}

# Code counts from admissions_complete.py
ADMISSIONS_CODE = {
    "AdmissionsGeneral": 24,
    "HasLosAngeles": 1,
    "IsOwner": 1,
    "IsManager": 1,
    "HasInsects": 6,
    "HasAnts": 1,
    "HasRoaches": 1,
    "HasFlies": 2,  # ❌
    "HasBedbugs": 1,
    "HasBees": 1,
    "HasWasps": 1,
    "HasHornets": 1,
    "HasSpiders": 2,  # ❌
    "HasTermites": 1,
    "HasMosquitos": 1,
    "HasRatsMice": 8,  # ❌
    "HasSkunks": 1,
    "HasBats": 1,
    "HasRacoons": 1,
    "HasPigeons": 1,
    "HasOpossums": 1,
    "HasVermin": 3,  # ❌
    "HasHeater": 1,
    "HasAC": 1,
    "HasVentilation": 1,
    "HasHvac": 2,  # ❌
    "HasOutlets": 1,
    "HasPanel": 1,
    "HasWallSwitches": 1,
    "HasExteriorLighting": 1,
    "HasInteriorLighting": 1,
    "HasLightFixtures": 1,
    "HasFans": 1,
    "HasElectrical": 2,  # ❌
    "HasToilet": 1,
    "HasShower": 1,  # ❌
    "HasBath": 1,  # ❌
    "HasFixtures": 1,
    "HasLeaks": 2,  # ❌
    "HasInsufficientWaterPressure": 1,
    "HasNoHotWater": 1,  # ❌
    "HasSewageComingOut": 1,
    "HasCloggedToilet": 1,
    "HasCloggedBath": 1,
    "HasCloggedSink": 1,
    "HasCloggedShower": 1,
    "HasNoCleanWaterSupply": 1,
    "HasNoColdWater": 1,
    "HasUnsanitaryWater": 1,
    "HasClogs": 1,
    "HasPlumbing": 2,  # ❌
    "HasSmokeAlarms": 1,  # ❌
    "HasFireExtinguisher": 1,
    "HasNonCompliantElectricity": 1,
    "HasNonGfiElectricalOutlets": 1,
    "HasCarbonmonoxideDetectors": 1,
    "HasFireHazard": 2,  # ❌
    "HasDepartmentOfEnvironmentalHealth": 1,
    "HasDepartmentOfPublicHealth": 1,
    "HasDepartmentOfHealthServices": 1,
    "HasFireDepartment": 1,
    "HasPoliceDepartment": 1,
    "HasCodeEnforcement": 1,
    "HasGovContact": 1,  # ❌
    "HasStove": 1,
    "HasDishwasher": 1,
    "HasWasherDryer": 1,
    "HasOven": 1,
    "HasMicrowave": 1,
    "HasGarbageDisposal": 1,
    "HasRefrigerator": 1,
    "HasAppliances": 6,  # ❌ (aggregate)
    "HasCabinets": 1,  # ❌
    "HasCabinetsBroken": 1,
    "HasCabinetHinges": 1,
    "HasCabinetAlignment": 1,
    "HasUnevenFlooring": 1,
    "HasCarpet": 1,
    "HasTiles": 1,
    "HasNailsStickingOut": 1,
    "HasFloors": 1,  # ❌
    "HasBrokenWindows": 1,
    "HasWindowScreens": 1,
    "HasWindowLeaks": 1,
    "HasWindowsDoNotLock": 1,
    "HasMissingWindows": 1,
    "HasBrokenMissingScreens": 1,
    "HasWindows": 1,  # ❌
    "HasBrokenDoors": 2,
    "HasDoorKnobs": 1,
    "HasDoorLocks": 1,
    "HasBrokenHinges": 1,
    "HasSlidingGlassDoors": 1,
    "HasIneffectiveWaterproofing": 1,
    "HasWaterIntrusionInsects": 1,
    "HasDoorsDoNotCloseProperly": 1,
    "HasDoors": 1,  # ❌
    "HasHoleInCeiling": 1,
    "HasBumpsInCeiling": 1,
    "HasWaterStainsOnCeiling": 1,
    "HasWaterStainsOnWall": 1,
    "HasHoleInWall": 1,
    "HasPaint": 1,
    "HasExteriorDeckPorch": 1,
    "HasWaterproofToilet": 1,
    "HasWaterproofTub": 1,
    "HasStaircase": 1,
    "HasBasementFlood": 1,
    "HasLeaksInGarage": 1,
    "HasIneffectiveWeatherproofingOfAnyWindowsDoors": 1,
    "HasIneffectiveWaterproofingOfTheTubsToilet": 1,
    "HasSoftSpotsDueToLeaks": 1,
    "HasHolesInCeilingWalls": 1,
    "HasWaterStainsOnCeilingWalls": 1,
    "HasStructure": 1,  # ❌
    "HasMailboxBroken": 1,  # ❌
    "HasParkingAreaIssues": 1,
    "HasDamageToCars": 1,
    "HasFlooding": 1,  # ❌
    "HasEntrancesBlocked": 1,
    "HasSwimmingPool": 1,
    "HasJacuzzi": 1,
    "HasLaundryRoom": 1,
    "HasRecreationRoom": 1,
    "HasGym": 1,
    "HasBlockedAreasDoors": 1,
    "HasElevator": 2,
    "HasFilthRubbishGarbage": 1,
    "HasCommonAreaVermin": 1,
    "HasBrokenGate": 1,
    "HasCommonAreaInsects": 1,
    "HasCommonArea": 1,  # ❌
    "HasDrugs": 1,
    "HasSmoking": 1,  # ❌
    "HasNoisyNeighbors": 1,
    "HasGangs": 1,
    "HasNuisance": 1,  # ❌
    "HasMold": 6,
    "HasMildew": 1,
    "HasMushrooms": 1,
    "HasRawSewageOnExterior": 1,
    "HasNoxiousFumes": 1,
    "HasChemicalsPaintContamination": 1,  # ❌
    "HasToxicWaterPollution": 1,  # ❌
    "HasOffensiveOdors": 1,
    "HasHealthHazards": 2,  # ❌
    "HasUnlawfulDetainer": 1,  # ❌
    "HasEvictionThreat": 1,
    "HasHarrassmentByDefendants": 1,
    "HasHarrassmentMaintenanceManWorkers": 1,
    "HasHarrassmentManagerStaff": 1,
    "HasHarrassmentByOwnerAndTheirGuests": 1,
    "HasHarrassmentOtherTenants": 1,
    "HasIllegitimateNotices": 1,
    "HasRefusalToMakeTimelyRepairs": 1,
    "HasWrittenThreats": 1,
    "HasAggressiveInappropriateLanguage": 1,
    "HasPhysicalThreatsOrTouching": 1,
    "HasNoticesSinglingOutOneTenant": 1,
    "HasDuplicativeNotices": 1,
    "HasUntimelyResponseFromLandlord": 1,
    "HasHarassment": 1,  # ❌
    "HasNotices": 1,
    "Has24HourNotices": 1,
    "Has3DayNotices": 1,
    "Has30DayNotices": 1,
    "Has60DayNotices": 1,
    "HasToQuitNotices": 1,
    "HasPerformOrQuit": 1,
    "HasWaterShutoffs": 1,
    "HasGasLeaks": 1,  # ❌
    "HasElectricityShutoffs": 1,
    "HasHeatShutoffs": 1,
    "HasGasShutoffs": 1,
    "HasSafety": 1,  # ❌
    "HasInoperableLocks": 1,
    "HasBrokenSecurityGate": 1,
    "HasSecurityCameras": 1,
    "HasBrokenBuzzerToGetIn": 1,
    "HasInjury": 1,
    "HasNonresponsiveLandlord": 1,  # ❌
    "HasUnauthorizedEntries": 1,  # ❌
    "HasStolenItems": 1,  # ❌
    "HasDamagedItems": 1,
    "HasAgeDiscrimination": 1,  # ❌
    "HasDisabilityDiscrimination": 1,  # ❌
    "HasRacialDiscrimination": 1,  # ❌
    "HasSecurityDeposit": 16,
    "HasTrashProblems": 1,  # ❌
    "HasInadequateNumberOfTrashReceptacles": 1,
    "HasInadequateServicingAndEmptyingTrashReceptacles": 1,
}

def compare_profiles():
    """Compare code counts against spec."""
    print("="*80)
    print("ADMISSIONS PROFILE DISCREPANCIES")
    print("="*80)

    mismatches = []
    for flag in sorted(ADMISSIONS_SPEC.keys()):
        spec_count = ADMISSIONS_SPEC[flag]
        code_count = ADMISSIONS_CODE.get(flag, "MISSING")

        if code_count == "MISSING":
            mismatches.append((flag, spec_count, "MISSING", f"-{spec_count}"))
        elif spec_count != code_count:
            diff = code_count - spec_count
            mismatches.append((flag, spec_count, code_count, f"{diff:+d}"))

    if mismatches:
        print(f"\nFound {len(mismatches)} discrepancies:\n")
        print(f"{'Flag':<50} {'Spec':<10} {'Code':<10} {'Diff':<10}")
        print("-"*80)
        for flag, spec, code, diff in mismatches:
            print(f"{flag:<50} {spec:<10} {str(code):<10} {diff:<10}")
    else:
        print("\n✅ All counts match!")

    # Calculate total impact
    total_spec = sum(ADMISSIONS_SPEC.values())
    total_code = sum(v for v in ADMISSIONS_CODE.values() if isinstance(v, int))

    print(f"\n{'='*80}")
    print(f"Total expected interrogatories (spec): {total_spec}")
    print(f"Total calculated interrogatories (code): {total_code}")
    print(f"Difference: {total_code - total_spec:+d}")
    print(f"{'='*80}\n")

if __name__ == "__main__":
    compare_profiles()
