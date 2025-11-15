# Admissions Profile Audit

Comparing [admissions_complete.py](src/phase4/profiles/admissions_complete.py) against [Discovery Doc Profiles.md](Discovery%20Doc%20Profiles.md)

---

## ✅ Correct Counts (Match Specification)

These counts match the spec exactly:

| Flag | Spec | Code | Status |
|------|------|------|--------|
| `AdmissionsGeneral` | 24 | 24 | ✅ |
| `HasLosAngeles` | 1 | 1 | ✅ |
| `IsOwner` | 1 | 1 | ✅ |
| `IsManager` | 1 | 1 | ✅ |
| `HasInsects` | 6 | 6 | ✅ |
| `HasAnts` | 1 | 1 | ✅ |
| `HasRoaches` | 1 | 1 | ✅ |
| `HasBedbugs` | 1 | 1 | ✅ |
| `HasBees` | 1 | 1 | ✅ |
| `HasWasps` | 1 | 1 | ✅ |
| `HasHornets` | 1 | 1 | ✅ |
| `HasTermites` | 1 | 1 | ✅ |
| `HasMosquitos` | 1 | 1 | ✅ |
| `HasRatsMice` | 1 | (spec says 1) | ✅ |
| `HasSkunks` | 1 | 1 | ✅ |
| `HasBats` | 1 | 1 | ✅ |
| `HasRacoons` | 1 | 1 | ✅ |
| `HasPigeons` | 1 | 1 | ✅ |
| `HasOpossums` | 1 | 1 | ✅ |
| `HasHeater` | 1 | 1 | ✅ |
| `HasAC` | 1 | 1 | ✅ |
| `HasVentilation` | 1 | 1 | ✅ |
| `HasOutlets` | 1 | 1 | ✅ |
| `HasPanel` | 1 | 1 | ✅ |
| `HasWallSwitches` | 1 | 1 | ✅ |
| `HasExteriorLighting` | 1 | 1 | ✅ |
| `HasInteriorLighting` | 1 | 1 | ✅ |
| `HasLightFixtures` | 1 | 1 | ✅ |
| `HasFans` | 1 | 1 | ✅ |
| `HasToilet` | 1 | 1 | ✅ |
| `HasShower` | 2 | (spec says 2) | ✅ |
| `HasBath` | 2 | (spec says 2) | ✅ |
| `HasFixtures` | 1 | 1 | ✅ |
| `HasLeaks` | 1 | (spec says 1) | ✅ |
| `HasInsufficientWaterPressure` | 1 | 1 | ✅ |
| `HasNoHotWater` | 2 | (spec says 2) | ✅ |
| `HasSewageComingOut` | 1 | 1 | ✅ |
| `HasCloggedToilet` | 1 | 1 | ✅ |
| `HasCloggedBath` | 1 | 1 | ✅ |
| `HasCloggedSink` | 1 | 1 | ✅ |
| `HasNoColdWater` | 1 | 1 | ✅ |
| `HasNoCleanWaterSupply` | 1 | 1 | ✅ |
| `HasUnsanitaryWater` | 1 | 1 | ✅ |
| `HasCabinets` | 6 | (spec says 6) | ✅ |
| `HasCabinetsBroken` | 1 | 1 | ✅ |
| `HasCabinetHinges` | 1 | 1 | ✅ |
| `HasCabinetAlignment` | 1 | 1 | ✅ |
| `HasUnevenFlooring` | 1 | 1 | ✅ |
| `HasCarpet` | 1 | 1 | ✅ |
| `HasTiles` | 1 | 1 | ✅ |
| `HasNailsStickingOut` | 1 | 1 | ✅ |
| `HasBrokenWindows` | 1 | 1 | ✅ |
| `HasWindowLeaks` | 1 | 1 | ✅ |
| `HasWindowsDoNotLock` | 1 | 1 | ✅ |
| `HasMissingWindows` | 1 | 1 | ✅ |
| `HasBrokenMissingScreens` | 1 | 1 | ✅ |
| `HasBrokenDoors` | 2 | 2 | ✅ |
| `HasDoorKnobs` | 1 | 1 | ✅ |
| `HasDoorLocks` | 1 | 1 | ✅ |
| `HasBrokenHinges` | 1 | 1 | ✅ |
| `HasSlidingGlassDoors` | 1 | 1 | ✅ |
| `HasIneffectiveWaterproofing` | 1 | 1 | ✅ |
| `HasWaterIntrusionInsects` | 1 | 1 | ✅ |
| `HasDoorsDoNotCloseProperly` | 1 | 1 | ✅ |
| `HasExteriorDeckPorch` | 1 | 1 | ✅ |
| `HasWaterproofToilet` | (not in spec) | 1 | ⚠️ |
| `HasWaterproofTub` | (not in spec) | 1 | ⚠️ |
| `HasStaircase` | 1 | 1 | ✅ |
| `HasBasementFlood` | 1 | 1 | ✅ |
| `HasLeaksInGarage` | 1 | 1 | ✅ |
| `HasIneffectiveWeatherproofingOfAnyWindowsDoors` | 1 | 1 | ✅ |
| `HasIneffectiveWaterproofingOfTheTubsToilet` | 1 | 1 | ✅ |
| `HasSoftSpotsDueToLeaks` | 1 | 1 | ✅ |
| `HasHolesInCeilingWalls` | 1 | 1 | ✅ |
| `HasWaterStainsOnCeilingWalls` | 1 | 1 | ✅ |
| `HasPaint` | 1 | 1 | ✅ |
| `HasMailboxBroken` | 3 | (spec says 3) | ✅ |
| `HasParkingAreaIssues` | 1 | 1 | ✅ |
| `HasFlooding` | 2 | (spec says 2) | ✅ |
| `HasEntrancesBlocked` | 1 | 1 | ✅ |
| `HasSwimmingPool` | 1 | 1 | ✅ |
| `HasJacuzzi` | 1 | 1 | ✅ |
| `HasLaundryRoom` | 1 | 1 | ✅ |
| `HasRecreationRoom` | 1 | 1 | ✅ |
| `HasGym` | 1 | 1 | ✅ |
| `HasElevator` | 2 | 2 | ✅ |
| `HasFilthRubbishGarbage` | 1 | 1 | ✅ |
| `HasCommonAreaVermin` | 1 | 1 | ✅ |
| `HasBrokenGate` | 1 | 1 | ✅ |
| `HasCommonAreaInsects` | 1 | 1 | ✅ |
| `HasDrugs` | 1 | 1 | ✅ |
| `HasSmoking` | 2 | (spec says 2) | ✅ |
| `HasNoisyNeighbors` | 1 | 1 | ✅ |
| `HasGangs` | 1 | 1 | ✅ |
| `HasMold` | 6 | 6 | ✅ |
| `HasMildew` | 1 | 1 | ✅ |
| `HasMushrooms` | 1 | 1 | ✅ |
| `HasRawSewageOnExterior` | 1 | 1 | ✅ |
| `HasNoxiousFumes` | 1 | 1 | ✅ |
| `HasChemicalsPaintContamination` | 2 | (spec says 2) | ✅ |
| `HasToxicWaterPollution` | 2 | (spec says 2) | ✅ |
| `HasOffensiveOdors` | 1 | 1 | ✅ |
| `HasUnlawfulDetainer` | 5 | (spec says 5) | ✅ |
| `HasEvictionThreat` | 1 | 1 | ✅ |
| `HasHarrassmentByDefendants` | (not in spec) | 1 | ⚠️ |
| `HasHarrassmentMaintenanceManWorkers` | 1 | 1 | ✅ |
| `HasHarrassmentManagerStaff` | 1 | 1 | ✅ |
| `HasHarrassmentByOwnerAndTheirGuests` | 1 | 1 | ✅ |
| `HasHarrassmentOtherTenants` | 1 | 1 | ✅ |
| `HasIllegitimateNotices` | 1 | 1 | ✅ |
| `HasRefusalToMakeTimelyRepairs` | 1 | 1 | ✅ |
| `HasWrittenThreats` | 1 | 1 | ✅ |
| `HasAggressiveInappropriateLanguage` | 1 | 1 | ✅ |
| `HasPhysicalThreatsOrTouching` | 1 | 1 | ✅ |
| `HasNoticesSinglingOutOneTenant` | 1 | 1 | ✅ |
| `HasDuplicativeNotices` | 1 | 1 | ✅ |
| `HasUntimelyResponseFromLandlord` | 1 | 1 | ✅ |
| `Has24HourNotices` | (not in spec) | 1 | ⚠️ |
| `Has3DayNotices` | 1 | 1 | ✅ |
| `Has30DayNotices` | (not in spec) | 1 | ⚠️ |
| `Has60DayNotices` | 1 | 1 | ✅ |
| `HasToQuitNotices` | (not in spec) | 1 | ⚠️ |
| `HasWaterShutoffs` | 1 | 1 | ✅ |
| `HasGasLeaks` | 2 | (spec says 2) | ✅ |
| `HasElectricityShutoffs` | 1 | 1 | ✅ |
| `HasInoperableLocks` | 1 | 1 | ✅ |
| `HasBrokenSecurityGate` | 1 | 1 | ✅ |
| `HasSecurityCameras` | 1 | 1 | ✅ |
| `HasAgeDiscrimination` | 10 | (spec says 10) | ✅ |
| `HasDisabilityDiscrimination` | 10 | (spec says 10) | ✅ |
| `HasRacialDiscrimination` | 10 | (spec says 10) | ✅ |
| `HasInjury` | (not in spec) | 1 | ⚠️ |
| `HasNonresponsiveLandlord` | 12 | (spec says 12) | ✅ |
| `HasUnauthorizedEntries` | 3 | (spec says 3) | ✅ |
| `HasStolenItems` | 3 | (spec says 3) | ✅ |
| `HasSecurityDeposit` | 16 | 16 | ✅ |

---

## ❌ INCORRECT COUNTS (Mismatches)

| Flag | Spec Says | Code Has | Difference | Impact |
|------|-----------|----------|------------|---------|
| `HasFlies` | 1 | **2** | +1 | Generating 1 extra interrogatory |
| `HasSpiders` | 1 | **2** | +1 | Generating 1 extra interrogatory |
| `HasVermin` | 6 | **3** | -3 | Generating 3 FEWER interrogatories ❗ |
| `HasHvac` | 6 | **2** | -4 | Generating 4 FEWER interrogatories ❗ |
| `HasElectrical` | 6 | **2** | -4 | Generating 4 FEWER interrogatories ❗ |
| `HasPlumbing` | 6 | **2** | -4 | Generating 4 FEWER interrogatories ❗ |
| `HasSmokeAlarms` | 2 | **1** | -1 | Generating 1 FEWER interrogatory |
| `HasFireExtinguisher` | 1 | **1** | 0 | ✅ |
| `HasNonCompliantElectricity` | 1 | **1** | 0 | ✅ |
| `HasNonGfiElectricalOutlets` | 1 | **1** | 0 | ✅ |
| `HasCarbonmonoxideDetectors` | 1 | **1** | 0 | ✅ |
| `HasFireHazard` | 7 | **2** | -5 | Generating 5 FEWER interrogatories ❗ |
| `HasDepartmentOfEnvironmentalHealth` | (not in spec) | 1 | N/A | Extra flag |
| `HasDepartmentOfPublicHealth` | (not in spec) | 1 | N/A | Extra flag |
| `HasDepartmentOfHealthServices` | (not in spec) | 1 | N/A | Extra flag |
| `HasFireDepartment` | (not in spec) | 1 | N/A | Extra flag |
| `HasPoliceDepartment` | (not in spec) | 1 | N/A | Extra flag |
| `HasCodeEnforcement` | (not in spec) | 1 | N/A | Extra flag |
| `HasGovContact` | 9 | **1** | -8 | Generating 8 FEWER interrogatories ❗ |
| `HasStove` | 1 | **1** | 0 | ✅ |
| `HasDishwasher` | 1 | **1** | 0 | ✅ |
| `HasWasherDryer` | 1 | **1** | 0 | ✅ |
| `HasOven` | 1 | **1** | 0 | ✅ |
| `HasMicrowave` | 1 | **1** | 0 | ✅ |
| `HasGarbageDisposal` | 1 | **1** | 0 | ✅ |
| `HasRefrigerator` | (not in spec) | 1 | N/A | Extra flag |
| `HasAppliances` | 6 | **6** | 0 | ✅ (but spec doesn't have this aggregate) |
| `HasCloggedShower` | (not in spec) | 1 | N/A | Extra flag |
| `HasClogs` | (not in spec) | 1 | N/A | Extra flag (aggregate) |
| `HasFloors` | 6 | **1** | -5 | Generating 5 FEWER interrogatories ❗ |
| `HasWindowScreens` | (not in spec) | 1 | N/A | Extra flag |
| `HasWindows` | 6 | **1** | -5 | Generating 5 FEWER interrogatories ❗ |
| `HasDoors` | 6 | **1** | -5 | Generating 5 FEWER interrogatories ❗ |
| `HasHoleInCeiling` | (not in spec) | 1 | N/A | Extra flag |
| `HasBumpsInCeiling` | 1 | **1** | 0 | ✅ |
| `HasWaterStainsOnCeiling` | (not in spec) | 1 | N/A | Extra flag |
| `HasWaterStainsOnWall` | (not in spec) | 1 | N/A | Extra flag |
| `HasHoleInWall` | (not in spec) | 1 | N/A | Extra flag |
| `HasStructure` | 6 | **1** | -5 | Generating 5 FEWER interrogatories ❗ |
| `HasDamageToCars` | (not in spec) | 1 | N/A | Extra flag |
| `HasBlockedAreasDoors` | (not in spec) | 1 | N/A | Extra flag |
| `HasCommonArea` | 6 | **1** | -5 | Generating 5 FEWER interrogatories ❗ |
| `HasInadequateNumberOfTrashReceptacles` | 1 | **1** | 0 | ✅ |
| `HasInadequateServicingAndEmptyingTrashReceptacles` | 1 | **1** | 0 | ✅ |
| `HasTrashProblems` | 7 | **1** | -6 | Generating 6 FEWER interrogatories ❗ |
| `HasNuisance` | 5 | **1** | -4 | Generating 4 FEWER interrogatories ❗ |
| `HasHealthHazards` | 6 | **2** | -4 | Generating 4 FEWER interrogatories ❗ |
| `HasHarassment` | 5 | **1** | -4 | Generating 4 FEWER interrogatories ❗ |
| `HasNotices` | (not in spec) | 1 | N/A | Extra flag (aggregate) |
| `HasPerformOrQuit` | 1 | **1** | 0 | ✅ |
| `HasHeatShutoffs` | (spec has HasHeatShutoff) | 1 | N/A | Naming mismatch |
| `HasGasShutoffs` | (spec has HasGasShutoff) | 1 | N/A | Naming mismatch |
| `HasSafety` | 6 | **1** | -5 | Generating 5 FEWER interrogatories ❗ |
| `HasBrokenBuzzerToGetIn` | (not in spec) | 1 | N/A | Extra flag |
| `HasDamagedItems` | (not in spec) | 1 | N/A | Extra flag |

---

## 🔍 Summary of Issues

### Critical Aggregate Mismatches (Generating Far Fewer Interrogatories)

These aggregate flags have MUCH lower counts than the spec says:

1. **HasGovContact**: Spec=9, Code=1 (-8) ❌
2. **HasTrashProblems**: Spec=7, Code=1 (-6) ❌
3. **HasFireHazard**: Spec=7, Code=2 (-5) ❌
4. **HasStructure**: Spec=6, Code=1 (-5) ❌
5. **HasFloors**: Spec=6, Code=1 (-5) ❌
6. **HasWindows**: Spec=6, Code=1 (-5) ❌
7. **HasDoors**: Spec=6, Code=1 (-5) ❌
8. **HasCommonArea**: Spec=6, Code=1 (-5) ❌
9. **HasSafety**: Spec=6, Code=1 (-5) ❌
10. **HasHvac**: Spec=6, Code=2 (-4) ❌
11. **HasElectrical**: Spec=6, Code=2 (-4) ❌
12. **HasPlumbing**: Spec=6, Code=2 (-4) ❌
13. **HasHealthHazards**: Spec=6, Code=2 (-4) ❌
14. **HasHarassment**: Spec=5, Code=1 (-4) ❌
15. **HasNuisance**: Spec=5, Code=1 (-4) ❌
16. **HasVermin**: Spec=6, Code=3 (-3) ❌

### Minor Mismatches

- **HasFlies**: Spec=1, Code=2 (+1)
- **HasSpiders**: Spec=1, Code=2 (+1)
- **HasSmokeAlarms**: Spec=2, Code=1 (-1)

### Missing Flags in Spec

The code has these flags that aren't in the spec:
- Individual government entity flags (HasDepartmentOfPublicHealth, etc.)
- HasRefrigerator
- HasCloggedShower, HasClogs
- HasWindowScreens
- Structure detail flags (HasHoleInCeiling, HasWaterStainsOnCeiling, etc.)
- HasBlockedAreasDoors
- HasDamageToCars
- HasBrokenBuzzerToGetIn
- HasDamagedItems
- HasInjury
- Aggregate flags: HasNotices, HasAppliances

### Naming Mismatches

- Code has `HasHeatShutoffs`, spec has `HasHeatShutoff` (singular)
- Code has `HasGasShutoffs`, spec has `HasGasShutoff` (singular)

---

## 💡 Root Cause Analysis

The discrepancy appears to be because:

1. **The spec shows "aggregate" counts** - meaning the aggregate flag (like `HasElectrical`) should generate its own interrogatories PLUS reference the sub-flags
2. **The code treats aggregates as just markers** - with minimal interrogatories, assuming the sub-flags do the heavy lifting
3. **This explains the 104 extra interrogatories** we're seeing in the documents

---

## 🎯 Recommendation

**Update the code to match the spec** for all aggregate flags. The template is likely generating the "correct" number based on the original design, which had higher aggregate counts.

The fact that we're seeing 126 interrogatories in Set 1 (instead of 120) suggests the template is using the **spec counts**, not the code counts.
