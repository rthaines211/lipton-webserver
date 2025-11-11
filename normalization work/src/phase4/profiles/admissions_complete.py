from typing import Dict
from ..base_profile import BaseDocumentProfile

class AdmissionsProfile(BaseDocumentProfile):
    @property
    def doc_type(self) -> str:
        return "Admissions"

    @property
    def template_name(self) -> str:
        return "AdmissionsMaster.docx"

    @property
    def filename_suffix(self) -> str:
        return "Discovery Request for Admissions"

    @property
    def first_set_only_flags(self) -> list[str]:
        return ["AdmissionsGeneral", "IsOwner", "IsManager", "HasLosAngeles"]

    @property
    def interrogatory_counts(self) -> Dict[str, int]:
        return {
            # Profile-specific flags (Set 1 only)
            "AdmissionsGeneral": 24,          # General admissions (Set 1 only)
            "HasLosAngeles": 1,               # LA-specific admission
            "IsOwner": 1,                     # Owner admission
            "IsManager": 1,                   # Manager admission
            
            # Insects - Lower counts (yes/no format)
            "HasInsects": 6,                  # Aggregate insect flag
            "HasAnts": 1,
            "HasRoaches": 1,                  # Roach admission
            "HasFlies": 1,
            "HasBedbugs": 1,                  # Bedbug admission
            "HasBees": 1,
            "HasWasps": 1,
            "HasHornets": 1,
            "HasSpiders": 2,
            "HasTermites": 1,
            "HasMosquitos": 1,

            # Vermin - Lower counts (yes/no format)
            "HasRatsMice": 1,
            "HasSkunks": 1,
            "HasBats": 1,
            "HasRacoons": 1,
            "HasPigeons": 1,
            "HasOpossums": 1,
            "HasVermin": 6,                   # Aggregate

            # HVAC Issues
            "HasHeater": 1,                   # Heater admission
            "HasAC": 1,                       # AC admission
            "HasVentilation": 1,
            "HasHvac": 6,                    # Aggregate

            # Electrical Issues
            "HasOutlets": 1,
            "HasPanel": 1,
            "HasWallSwitches": 1,
            "HasExteriorLighting": 1,
            "HasInteriorLighting": 1,
            "HasLightFixtures": 1,
            "HasFans": 1,
            "HasElectrical": 6,              # Aggregate

            # Plumbing Issues
            "HasToilet": 1,
            "HasShower": 2,
            "HasBath": 2,
            "HasFixtures": 1,
            "HasLeaks": 1,
            "HasInsufficientWaterPressure": 1,
            "HasNoHotWater": 2,
            "HasSewageComingOut": 1,
            "HasCloggedToilet": 1,
            "HasCloggedBath": 1,
            "HasCloggedSink": 1,
            "HasNoCleanWaterSupply": 1,
            "HasNoColdWater": 1,
            "HasUnsanitaryWater": 1,                 
            "HasPlumbing": 6,                # Aggregate

            # Fire Hazard Issues
            "HasSmokeAlarms": 2,
            "HasFireExtinguisher": 1,
            "HasNonCompliantElectricity": 1,
            "HasNonGfiElectricalOutlets": 1,
            "HasCarbonmonoxideDetectors": 1,
            "HasFireHazard": 7,              # Aggregate

            # Government Contact Issues
            "HasGovContact": 9,               # Aggregate

            # Appliance Issues
            "HasStove": 1,
            "HasDishwasher": 1,
            "HasWasherDryer": 1,
            "HasOven": 1,
            "HasMicrowave": 1,
            "HasGarbageDisposal": 1,
            "HasAppliances": 6,              # Aggregate

            # Cabinet Issues
            "HasCabinets": 6,
            "HasCabinetsBroken": 1,
            "HasCabinetHinges": 1,
            "HasCabinetAlignment": 1,

            # Flooring Issues
            "HasUnevenFlooring": 1,
            "HasCarpet": 1,
            "HasTiles": 1,
            "HasNailsStickingOut": 1,
            "HasFloors": 6,                  # Aggregate

            # Window Issues
            "HasBrokenWindows": 1,
            "HasWindowLeaks": 1,
            "HasWindowsDoNotLock": 1,
            "HasMissingWindows": 1,
            "HasBrokenMissingScreens": 1,
            "HasWindows": 6,                # Aggregate

            # Door Issues
            "HasBrokenDoors": 2,              # Door admissions
            "HasDoorKnobs": 1,
            "HasDoorLocks": 1,
            "HasBrokenHinges": 1,
            "HasSlidingGlassDoors": 1,
            "HasIneffectiveWaterproofing": 1,
            "HasWaterIntrusionInsects": 1,
            "HasDoorsDoNotCloseProperly": 1,
            "HasDoors": 6,                   # Aggregate

            # Structure Issues
            "HasBumpsInCeiling": 1,
            "HasPaint": 1,
            "HasExteriorDeckPorch": 1,
            "HasStaircase": 1,
            "HasBasementFlood": 1,
            "HasLeaksInGarage": 1,
            "HasIneffectiveWeatherproofingOfAnyWindowsDoors": 1,
            "HasIneffectiveWaterproofingOfTheTubsToilet": 1,
            "HasSoftSpotsDueToLeaks": 1,
            "HasHolesInCeilingWalls": 1,     # Aggregate
            "HasWaterStainsOnCeilingWalls": 1, # Aggregate
            "HasStructure": 6,               # Aggregate

            # Common Area Issues
            "HasMailboxBroken": 3,
            "HasParkingAreaIssues": 1,
            "HasFlooding": 2,
            "HasEntrancesBlocked": 1,
            "HasSwimmingPool": 1,
            "HasJacuzzi": 1,
            "HasLaundryRoom": 1,
            "HasRecreationRoom": 1,
            "HasGym": 1,
            "HasElevator": 2,                # Elevator admissions
            "HasFilthRubbishGarbage": 1,
            "HasCommonAreaVermin": 1,
            "HasBrokenGate": 1,
            "HasCommonAreaInsects": 1,
            "HasCommonArea": 6,              # Aggregate

            # Nuisance Issues
            "HasDrugs": 1,
            "HasSmoking": 2,
            "HasNoisyNeighbors": 1,
            "HasGangs": 1,
            "HasNuisance": 5,                # Aggregate

            # Health Hazards
            "HasMold": 6,                    # Mold admissions
            "HasMildew": 1,
            "HasMushrooms": 1,
            "HasRawSewageOnExterior": 1,
            "HasNoxiousFumes": 1,
            "HasChemicalsPaintContamination": 2,
            "HasToxicWaterPollution": 2,
            "HasOffensiveOdors": 1,
            "HasHealthHazards": 6,          # Aggregate

            # Harassment Issues
            "HasUnlawfulDetainer": 5,
            "HasEvictionThreat": 1,
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
            "HasHarassment": 5,              # Aggregate

            # Notice Issues
            "Has3DayNotices": 1,
            "Has60DayNotices": 1,
            "HasPerformOrQuit": 1,

            # Utility Issues
            "HasWaterShutoffs": 1,
            "HasGasLeaks": 2,
            "HasElectricityShutoffs": 1,
            "HasHeatShutoffs": 1,
            "HasGasShutoffs": 1,

            # Safety Issues
            "HasSafety": 6,
            "HasInoperableLocks": 1,
            "HasBrokenSecurityGate": 1,
            "HasSecurityCameras": 1,

            # Miscellaneous Issues
            "HasNonresponsiveLandlord": 12,
            "HasUnauthorizedEntries": 3,
            "HasStolenItems": 3,


            # Discrimination Issues
            "HasAgeDiscrimination": 10,
            "HasDisabilityDiscrimination": 10,
            "HasRacialDiscrimination": 10,
            "HasSecurityDeposit": 16,        # Security deposit admissions

            # Trash Issues
            "HasTrashProblems": 7,
            "HasInadequateNumberOfTrashReceptacles": 1,
            "HasInadequateServicingAndEmptyingTrashReceptacles": 1,
        }

    def add_profile_specific_flags(self, dataset: dict) -> dict:
        """Add Admissions-specific flags."""
        flags = dataset['flags']

        # Always add AdmissionsGeneral
        flags['AdmissionsGeneral'] = True

        # Add defendant role flags
        defendant_role = dataset.get('defendant', {}).get('role', '')
        flags['IsOwner'] = defendant_role.lower() == 'owner'
        flags['IsManager'] = defendant_role.lower() == 'manager'

        # Add geography flags
        filing_city = dataset.get('case_metadata', {}).get('filing_city', '')
        city_lower = filing_city.lower()
        
        # Major California cities
        flags['HasLosAngeles'] = 'los angeles' in city_lower
        flags['HasSanFrancisco'] = 'san francisco' in city_lower
        flags['HasOakland'] = 'oakland' in city_lower
        flags['HasSanDiego'] = 'san diego' in city_lower
        flags['HasSacramento'] = 'sacramento' in city_lower
        flags['HasFresno'] = 'fresno' in city_lower
        flags['HasLongBeach'] = 'long beach' in city_lower
        flags['HasBakersfield'] = 'bakersfield' in city_lower
        flags['HasAnaheim'] = 'anaheim' in city_lower
        flags['HasSantaAna'] = 'santa ana' in city_lower

        return dataset
