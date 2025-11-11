from typing import Dict
from ..base_profile import BaseDocumentProfile

class PODsProfile(BaseDocumentProfile):
    @property
    def doc_type(self) -> str:
        return "PODs"

    @property
    def template_name(self) -> str:
        return "PODsMaster.docx"

    @property
    def filename_suffix(self) -> str:
        return "Discovery Propounded PODs"

    @property
    def first_set_only_flags(self) -> list[str]:
        return ["IsOwner", "IsManager"]  # No SROGsGeneral

    @property
    def interrogatory_counts(self) -> Dict[str, int]:
        return {
            "Has24HourNotices": 1,
            "Has30DayNotices": 1,
            "Has3DayNotices": 1,
            "Has60DayNotices": 1,
            "HasAC": 5,
            "HasAgeDiscrimination": 21,
            "HasAggressiveInappropriateLanguage": 5,
            "HasAnts": 4,
            "HasBasementFlood": 4,
            "HasBath": 5,
            "HasBats": 4,
            "HasBedbugs": 4,
            "HasBees": 4,
            "HasBlockedAreasDoors": 4,
            "HasBrokenBuzzerToGetIn": 5,
            "HasBrokenDoors": 10,
            "HasBrokenHinges": 5,
            "HasBrokenSecurityGate": 5,
            "HasBrokenWindows": 5,
            "HasBumpsInCeiling": 4,
            "HasCabinetAlignment": 5,
            "HasCabinetHinges": 5,
            "HasCabinets": 5,
            "HasCabinetsBroken": 5,
            "HasCarbonmonoxideDetectors": 5,
            "HasCarpet": 5,
            "HasChemicalsPaintContamination": 4,
            "HasCloggedBath": 4,
            "HasCloggedShower": 4,
            "HasCloggedSink": 4,
            "HasCloggedToilet": 4,
            "HasClogs": 4,
            "HasCodeEnforcement": 1,
            "HasDamagedItems": 5,
            "HasDamageToCars": 5,
            "HasDepartmentOfEnvironmentalHealth": 1,
            "HasDepartmentOfHealthServices": 1,
            "HasDepartmentOfPublicHealth": 1,
            "HasDisabilityDiscrimination": 20,
            "HasDishwasher": 5,
            "HasDoorKnobs": 5,
            "HasDoorLocks": 5,
            "HasDrugs": 4,
            "HasDuplicativeNotices": 5,
            "HasElectricityShutoffs": 5,
            "HasElevator": 4,
            "HasEntrancesBlocked": 5,
            "HasEvictionThreat": 3,
            "HasExteriorDeckPorch": 4,
            "HasExteriorLighting": 5,
            "HasFans": 5,
            "HasFireDepartment": 1,
            "HasFireExtinguisher": 4,
            "HasFixtures": 5,
            "HasFlies": 4,
            "HasFlooding": 4,
            "HasGangs": 4,
            "HasGarbageDisposal": 5,
            "HasGasLeaks": 5,
            "HasGovContact": 3,
            "HasGym": 4,
            "HasHarrassmentByDefendants": 3,
            "HasHarrassmentByOwnerAndTheirGuests": 5,
            "HasHarrassmentMaintenanceManWorkers": 5,
            "HasHarrassmentManagerStaff": 5,
            "HasHarrassmentOtherTenants": 5,
            "HasHeater": 5,
            "HasHoleInCeiling": 4,
            "HasHoleInWall": 4,
            "HasHornets": 4,
            "HasIllegitimateNotices": 5,
            "HasInadequateNumberOfTrashReceptacles": 5,
            "HasInadequateServicingAndEmptyingTrashReceptacles": 5,
            "HasIneffectiveWaterproofing": 5,
            "HasInjury": 4,
            "HasInoperableLocks": 5,
            "HasInsects": 4,
            "HasInsufficientWaterPressure": 4,
            "HasInteriorLighting": 5,
            "HasJacuzzi": 4,
            "HasLaundryRoom": 4,
            "HasLeaks": 4,
            "HasLeaksInGarage": 9,
            "HasLightFixtures": 5,
            "HasMailboxBroken": 5,
            "HasMicrowave": 5,
            "HasMildew": 4,
            "HasMold": 4,
            "HasMosquitos": 4,
            "HasMushrooms": 4,
            "HasNailsStickingOut": 4,
            "HasNoHotWater": 4,
            "HasNoisyNeighbors": 4,
            "HasNonCompliantElectricity": 5,
            "HasNonGfiElectricalOutlets": 4,
            "HasNonresponsiveLandlord": 5,
            "HasNotices": 1,
            "HasNoticesSinglingOutOneTenant": 5,
            "HasNoxiousFumes": 4,
            "HasOpossums": 4,
            "HasOutlets": 5,
            "HasOven": 5,
            "HasPaint": 4,
            "HasPanel": 5,
            "HasParkingAreaIssues": 5,
            "HasPhysicalThreatsOrTouching": 5,
            "HasPigeons": 4,
            "HasPoliceDepartment": 1,
            "HasRacialDiscrimination": 19,
            "HasRacoons": 4,
            "HasRatsMice": 4,
            "HasRawSewageOnExterior": 4,
            "HasRecreationRoom": 4,
            "HasRefrigerator": 5,
            "HasRefusalToMakeTimelyRepairs": 5,
            "HasRoaches": 4,
            "HasSecurityCameras": 5,
            "HasSecurityDeposit": 22,
            "HasSewageComingOut": 4,
            "HasShower": 5,
            "HasSkunks": 4,
            "HasSlidingGlassDoors": 5,
            "HasSmokeAlarms": 5,
            "HasSmoking": 4,
            "HasSpiders": 4,
            "HasStaircase": 4,
            "HasStolenItems": 5,
            "HasStove": 5,
            "HasSwimmingPool": 4,
            "HasTermites": 4,
            "HasTiles": 5,
            "HasToilet": 5,
            "HasToQuitNotices": 1,
            "HasTrashProblems": 5,
            "HasUnauthorizedEntries": 10,
            "HasUnevenFlooring": 5,
            "HasUnlawfulDetainer": 2,
            "HasVentilation": 5,
            "HasVermin": 4,
            "HasWallSwitches": 5,
            "HasWasherDryer": 5,
            "HasWasps": 4,
            "HasWaterIntrusionInsects": 5,
            "HasWaterproofToilet": 4,
            "HasWaterproofTub": 4,
            "HasWaterShutoffs": 5,
            "HasWaterStainsOnCeiling": 4,
            "HasWaterStainsOnWall": 4,
            "HasWindowLeaks": 5,
            "HasWindowScreens": 5,
            "HasWindowsDoNotLock": 5,
            "HasWrittenThreats": 5,
            "IsManager": 1,
            "IsOwner": 6,
            "IsOwnerManager": 40,       # LA-specific
        }

    def add_profile_specific_flags(self, dataset: dict) -> dict:
        """Add PODs-specific flags."""
        flags = dataset['flags']

        # Remove SROGsGeneral if present
        flags.pop('SROGsGeneral', None)

        # Add defendant role flags
        defendant_role = dataset.get('defendant', {}).get('role', '')
        is_owner = defendant_role.lower() == 'owner'
        is_manager = defendant_role.lower() == 'manager'
        
        flags['IsOwner'] = is_owner
        flags['IsManager'] = is_manager
        flags['IsOwnerManager'] = is_owner or is_manager

        return dataset
