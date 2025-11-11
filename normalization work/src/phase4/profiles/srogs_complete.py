from typing import Dict
from ..base_profile import BaseDocumentProfile

class SROGsProfile(BaseDocumentProfile):
    @property
    def doc_type(self) -> str:
        return "SROGs"

    @property
    def template_name(self) -> str:
        return "SROGsMaster.docx"

    @property
    def filename_suffix(self) -> str:
        return "Discovery Propounded SROGs"

    @property
    def first_set_only_flags(self) -> list[str]:
        return ["SROGsGeneral", "IsOwner", "IsManager"]

    @property
    def interrogatory_counts(self) -> Dict[str, int]:
        return {
                "HasAC": 7,
                "HasAgeDiscrimination": 21,
                "HasAggressiveInappropriateLanguage": 6,
                "HasAnts": 13,
                "HasBasementFlood": 7,
                "HasBath": 7,
                "HasBedbugs": 13,
                "HasBees": 13,
                "HasBlockedAreasDoors": 7,
                "HasBrokenDoors": 17,
                "HasBrokenHinges": 7,
                "HasBrokenSecurityGate": 10,
                "HasBrokenWindows": 7,
                "HasBumpsInCeiling": 7,
                "HasCabinetAlignment": 7,
                "HasCabinetHinges": 7,
                "HasCabinets": 7,
                "HasCabinetsBroken": 7,
                "HasCarbonMonoxideDetectors": 7,
                "HasCarpet": 7,
                "HasChemicalsPaintContamination": 15,
                "HasCloggedBath": 7,
                "HasCloggedShower": 7,
                "HasCloggedSink": 7,
                "HasCloggedToilet": 7,
                "HasDamagedItems": 6,
                "HasDamageToCars": 7,
                "HasDisabilityDiscrimination": 20,
                "HasDishwasher": 7,
                "HasDoorKnobs": 7,
                "HasDoorLocks": 7,
                "HasDrugs": 6,
                "HasDuplicativeNotices": 6,
                "HasElectricityShutoffs": 9,
                "HasElevator": 18,
                "HasEntrancesBlocked": 7,
                "HasEvictionThreat": 6,
                "HasExteriorDeckPorch": 7,
                "HasExteriorLighting": 7,
                "HasFans": 7,
                "HasFireExtinguisher": 4,
                "HasFixtures": 7,
                "HasFlies": 13,
                "HasFlooding": 7,
                "HasGangs": 7,
                "HasGarbageDisposal": 7,
                "HasGasLeaks": 9,
                "HasGovContact": 7,
                "HasGym": 7,
                "HasHarrassmentByDefendants": 6,
                "HasHarrassmentByOwnerAndTheirGuests": 6,
                "HasHarrassmentMaintenanceManWorkers": 6,
                "HasHarrassmentManagerStaff": 6,
                "HasHarrassmentOtherTenants": 6,
                "HasHeater": 7,
                "HasHoleInCeiling": 7,
                "HasHoleInWall": 7,
                "HasHornets": 13,
                "HasIllegitimateNotices": 6,
                "HasInadequateNumberOfTrashReceptacles": 6,
                "HasInadequateServicingAndEmptyingTrashReceptacles": 6,
                "HasIneffectiveWaterproofing": 7,
                "HasInjury": 8,
                "HasInoperableLocks": 10,
                "HasInsects": 13,
                "HasInsufficientWaterPressure": 7,
                "HasInteriorLighting": 7,
                "HasJacuzzi": 7,
                "HasLaundryRoom": 7,
                "HasLeaks": 7,
                "HasLeaksInGarage": 20,
                "HasLightFixtures": 7,
                "HasMailboxBroken": 7,
                "HasMicrowave": 7,
                "HasMildew": 15,
                "HasMold": 24,
                "HasMosquitos": 13,
                "HasMushrooms": 15,
                "HasNailsStickingOut": 7,
                "HasNoHotWater": 7,
                "HasNoisyNeighbors": 6,
                "HasNonCompliantElectricity": 7,
                "HasNonGfiElectricalOutlets": 7,
                "HasNonresponsiveLandlord": 6,
                "HasNotices": 14,
                "HasNoticesSinglingOutOneTenant": 6,
                "HasNoxiousFumes": 15,
                "HasOutlets": 7,
                "HasOven": 7,
                "HasPaint": 8,
                "HasPanel": 7,
                "HasParkingAreaIssues": 7,
                "HasPhysicalThreatsOrTouching": 6,
                "HasRacialDiscrimination": 19,
                "HasRawSewageOnExterior": 15,
                "HasRecreationRoom": 7,
                "HasRefrigerator": 7,
                "HasRefusalToMakeTimelyRepairs": 6,
                "HasRoaches": 13,
                "HasSafety": 20,
                "HasSecurityCameras": 14,
                "HasSecurityDeposit": 20,
                "HasSewageComingOut": 7,
                "HasShower": 7,
                "HasSlidingGlassDoors": 7,
                "HasSmokeAlarms": 7,
                "HasSmoking": 6,
                "HasSpiders": 13,
                "HasStaircase": 7,
                "HasStolenItems": 7,
                "HasStove": 7,
                "HasSwimmingPool": 7,
                "HasTermites": 13,
                "HasTiles": 7,
                "HasToilet": 7,
                "HasTrashProblems": 6,
                "HasUnauthorizedEntries": 9,
                "HasUnevenFlooring": 7,
                "HasUnlawfulDetainer": 7,
                "HasVentilation": 7,
                "HasVermin": 13,
                "HasWallSwitches": 7,
                "HasWasherDryer": 7,
                "HasWasps": 13,
                "HasWaterIntrusionInsects": 7,
                "HasWaterproofToilet": 7,
                "HasWaterproofTub": 7,
                "HasWaterShutoffs": 9,
                "HasWaterStainsOnCeiling": 7,
                "HasWaterStainsOnWall": 7,
                "HasWindowLeaks": 7,
                "HasWindowScreens": 7,
                "HasWindowsDoNotLock": 7,
                "HasWrittenThreats": 6,
                "IsManager": 20,
                "IsOwner": 22,
                "SROGsGeneral": 56,       # LA-specific (not Set 1 only for SROGs)
        }

    def add_profile_specific_flags(self, dataset: dict) -> dict:
        """Add SROGs-specific flags."""
        flags = dataset['flags']

        # Always add SROGsGeneral
        flags['SROGsGeneral'] = True

        # Add defendant role flags
        defendant_role = dataset.get('defendant', {}).get('role', '')
        flags['IsOwner'] = defendant_role.lower() == 'owner'
        flags['IsManager'] = defendant_role.lower() == 'manager'

        return dataset
