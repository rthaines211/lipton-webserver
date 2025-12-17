/**
 * Client Intake Routes - JSONB Schema Version
 *
 * This route handler works with the actual database schema that uses JSONB columns
 * for structured data instead of individual columns.
 */

const express = require('express');
const router = express.Router();
const logger = require('../monitoring/logger');
const { getPool } = require('../server/services/database-service');
const {
  extractIssueSelections,
  extractIssueMetadata,
  writeIssueSelections,
  writeIssueMetadata
} = require('./intake-helpers');

/**
 * Generates a unique intake number in format: INT-YYYYMMDD-NNNN
 */
function generateIntakeNumber() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const random = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
  return `INT-${year}${month}${day}-${random}`;
}

/**
 * POST /api/intakes
 * Submit a new client intake form
 */
router.post('/', async (req, res) => {
  const startTime = Date.now();

  try {
    const formData = req.body;
    logger.info('Received intake form submission (JSONB version)', {
      firstName: formData.firstName,
      lastName: formData.lastName,
      email: formData.emailAddress,
    });


    // Map new field names to old names for backward compatibility
    const fieldMappings = {
      phone: 'primaryPhone',
      currentRent: 'monthlyRent',
      hasSignedRetainer: 'hasRetainerWithAnotherAttorney',
    };

    // Apply field mappings (support both old and new field names)
    Object.keys(fieldMappings).forEach(newField => {
      const oldField = fieldMappings[newField];
      if (formData[newField] && !formData[oldField]) {
        formData[oldField] = formData[newField];
      }
    });

    // Validate required fields (updated for Phase 3.5 simplification)
    const requiredFields = [
      'firstName',
      'lastName',
      'phone', // NEW: renamed from primaryPhone
      'emailAddress',
      'propertyStreetAddress',
      'propertyCity',
      'propertyState',
      'propertyZipCode',
      'currentRent', // NEW: renamed from monthlyRent
    ];

    // Support old field names for backward compatibility
    const requiredFieldsWithFallback = requiredFields.map(field => {
      const oldField = Object.keys(fieldMappings).find(k => k === field);
      return oldField ? [field, fieldMappings[field]] : [field];
    }).flat();

    // Check for missing fields, supporting both old and new field names
    const missingFields = requiredFields.filter(field => {
      const oldFieldName = fieldMappings[field];
      return !formData[field] && !formData[oldFieldName];
    });

    if (missingFields.length > 0) {
      logger.warn('Missing required fields in intake submission', {
        missingFields,
      });
      return res.status(400).json({
        error: 'Missing required fields',
        missingFields,
      });
    }

    const db = getPool();
    const intakeNumber = generateIntakeNumber();

    // Build JSONB objects from form data
    // Phase 3.5: Current address removed - use property address as fallback for compatibility
    const currentAddress = formData.currentStreetAddress ? {
      street: formData.currentStreetAddress,
      unit: formData.currentUnitNumber || null,
      city: formData.currentCity,
      state: formData.currentState,
      zipCode: formData.currentZipCode,
      county: formData.currentCounty || null,
      yearsAtAddress: formData.yearsAtCurrentAddress ? parseInt(formData.yearsAtCurrentAddress) : null,
      monthsAtAddress: formData.monthsAtCurrentAddress ? parseInt(formData.monthsAtCurrentAddress) : null,
    } : {
      street: formData.propertyStreetAddress,
      unit: formData.propertyUnitNumber || null,
      city: formData.propertyCity,
      state: formData.propertyState,
      zipCode: formData.propertyZipCode,
      county: formData.propertyCounty || null,
      yearsAtAddress: null,
      monthsAtAddress: null,
    };

    const propertyAddress = {
      street: formData.propertyStreetAddress,
      unit: formData.propertyUnitNumber || null,
      city: formData.propertyCity,
      state: formData.propertyState,
      zipCode: formData.propertyZipCode,
      county: formData.propertyCounty || null,
      propertyType: formData.propertyType || null,
      numberOfUnits: formData.numberOfUnitsInBuilding ? parseInt(formData.numberOfUnitsInBuilding) : null,
      floorNumber: null, // Phase 3.5: Removed from form
    };

    // Phase 3.5: Simplified tenancy info - many fields removed
    const tenancyInfo = {
      leaseStartDate: null, // Phase 3.5: Removed from form
      leaseEndDate: null, // Phase 3.5: Removed from form
      leaseType: null, // Phase 3.5: Removed from form
      // Support both old and new field names
      monthlyRent: formData.currentRent ? parseFloat(formData.currentRent) :
                   (formData.monthlyRent ? parseFloat(formData.monthlyRent) : null),
      securityDeposit: null, // Phase 3.5: Removed from form
      lastRentIncreaseDate: null, // Phase 3.5: Removed from form
      lastRentIncreaseAmount: null, // Phase 3.5: Removed from form
      rentCurrent: true, // Phase 3.5: Removed from form, default to true
      monthsBehindRent: 0, // Phase 3.5: Removed from form
      receivedEvictionNotice: false, // Phase 3.5: Removed from form
      isRentControlled: false, // Phase 3.5: Removed from form
    };

    const landlordInfo = formData.landlordName ? {
      type: formData.landlordType || null,
      name: formData.landlordName,
      companyName: formData.landlordCompanyName || null,
      phone: formData.landlordPhone || null,
      email: formData.landlordEmail || null,
      address: formData.landlordAddress || null,
      attorneyName: formData.landlordAttorneyName || null,
    } : null;

    const propertyManagerInfo = formData.hasPropertyManager ? {
      companyName: formData.managerCompanyName || null,
      contactName: formData.managerContactName || null,
      phone: formData.managerPhone || null,
      email: formData.managerEmail || null,
    } : null;

    const buildingIssues = {
      // Structural Issues - ALL fields from intake form
      hasStructuralIssues: formData.hasStructuralIssues || false,
      structuralCeilingDamage: formData.structuralCeilingDamage || false,
      structuralWallCracks: formData.structuralWallCracks || false,
      structuralFloorDamage: formData.structuralFloorDamage || false,
      structuralFoundationIssues: formData.structuralFoundationIssues || false,
      structuralRoofLeaks: formData.structuralRoofLeaks || false,
      structuralWindowDamage: formData.structuralWindowDamage || false,
      structuralDoorDamage: formData.structuralDoorDamage || false,
      structuralStairsUnsafe: formData.structuralStairsUnsafe || false,
      structuralBalconyUnsafe: formData.structuralBalconyUnsafe || false,
      structuralRailingMissing: formData.structuralRailingMissing || false,
      structuralOther: formData.structuralOther || false,
      structuralDetails: formData.structuralDetails || null,
      structuralFirstNoticed: formData.structuralFirstNoticed || null,
      structuralReportedDate: formData.structuralReportedDate || null,
      structuralRepairHistory: formData.structuralRepairHistory || null,
      structuralSeverity: formData.structuralSeverity || null,

      // Plumbing Issues - ALL fields from intake form
      hasPlumbingIssues: formData.hasPlumbingIssues || false,
      plumbingNoHotWater: formData.plumbingNoHotWater || false,
      plumbingNoWater: formData.plumbingNoWater || false,
      plumbingLowPressure: formData.plumbingLowPressure || false,
      plumbingLeaks: formData.plumbingLeaks || false,
      plumbingBurstPipes: formData.plumbingBurstPipes || false,
      plumbingCloggedDrains: formData.plumbingCloggedDrains || false,
      plumbingToiletNotWorking: formData.plumbingToiletNotWorking || false,
      plumbingShowerNotWorking: formData.plumbingShowerNotWorking || false,
      plumbingSinkNotWorking: formData.plumbingSinkNotWorking || false,
      plumbingSewerBackup: formData.plumbingSewerBackup || false,
      plumbingWaterDamage: formData.plumbingWaterDamage || false,
      plumbingFlooding: formData.plumbingFlooding || false,
      plumbingWaterDiscoloration: formData.plumbingWaterDiscoloration || false,
      plumbingOther: formData.plumbingOther || false,
      plumbingDetails: formData.plumbingDetails || null,
      plumbingFirstNoticed: formData.plumbingFirstNoticed || null,
      plumbingReportedDate: formData.plumbingReportedDate || null,
      plumbingRepairHistory: formData.plumbingRepairHistory || null,
      plumbingSeverity: formData.plumbingSeverity || null,

      // Electrical Issues - ALL fields from intake form
      hasElectricalIssues: formData.hasElectricalIssues || false,
      electricalNoPower: formData.electricalNoPower || false,
      electricalPartialOutages: formData.electricalPartialOutages || false,
      electricalExposedWiring: formData.electricalExposedWiring || false,
      electricalSparkingOutlets: formData.electricalSparkingOutlets || false,
      electricalBrokenOutlets: formData.electricalBrokenOutlets || false,
      electricalBrokenSwitches: formData.electricalBrokenSwitches || false,
      electricalFlickeringLights: formData.electricalFlickeringLights || false,
      electricalCircuitBreakerIssues: formData.electricalCircuitBreakerIssues || false,
      electricalInsufficientOutlets: formData.electricalInsufficientOutlets || false,
      electricalBurningSmell: formData.electricalBurningSmell || false,
      electricalBrokenFans: formData.electricalBrokenFans || false,
      electricalExteriorLighting: formData.electricalExteriorLighting || false,
      electricalBrokenLightFixtures: formData.electricalBrokenLightFixtures || false,
      electricalOther: formData.electricalOther || false,
      electricalDetails: formData.electricalDetails || null,
      electricalFirstNoticed: formData.electricalFirstNoticed || null,
      electricalReportedDate: formData.electricalReportedDate || null,
      electricalRepairHistory: formData.electricalRepairHistory || null,
      electricalSeverity: formData.electricalSeverity || null,

      // HVAC Issues - ALL fields from intake form
      hasHvacIssues: formData.hasHvacIssues || false,
      hvacNoHeat: formData.hvacNoHeat || false,
      hvacInadequateHeat: formData.hvacInadequateHeat || false,
      hvacNoAirConditioning: formData.hvacNoAirConditioning || false,
      hvacInadequateCooling: formData.hvacInadequateCooling || false,
      hvacBrokenThermostat: formData.hvacBrokenThermostat || false,
      hvacGasSmell: formData.hvacGasSmell || false,
      hvacCarbonMonoxideDetectorMissing: formData.hvacCarbonMonoxideDetectorMissing || false,
      hvacVentilationPoor: formData.hvacVentilationPoor || false,
      hvacOther: formData.hvacOther || false,
      hvacDetails: formData.hvacDetails || null,
      hvacFirstNoticed: formData.hvacFirstNoticed || null,
      hvacReportedDate: formData.hvacReportedDate || null,
      hvacRepairHistory: formData.hvacRepairHistory || null,
      hvacSeverity: formData.hvacSeverity || null,

      // Appliance Issues - ALL fields from intake form
      hasApplianceIssues: formData.hasApplianceIssues || false,
      applianceRefrigeratorBroken: formData.applianceRefrigeratorBroken || false,
      applianceStoveBroken: formData.applianceStoveBroken || false,
      applianceOvenBroken: formData.applianceOvenBroken || false,
      applianceDishwasherBroken: formData.applianceDishwasherBroken || false,
      applianceGarbageDisposalBroken: formData.applianceGarbageDisposalBroken || false,
      applianceWasherBroken: formData.applianceWasherBroken || false,
      applianceDryerBroken: formData.applianceDryerBroken || false,
      applianceOther: formData.applianceOther || false,
      applianceDetails: formData.applianceDetails || null,
      applianceFirstNoticed: formData.applianceFirstNoticed || null,
      applianceRepairHistory: formData.applianceRepairHistory || null,
      appliancesSeverity: formData.appliancesSeverity || null,

      // Security Issues - ALL fields from intake form
      hasSecurityIssues: formData.hasSecurityIssues || false,
      securityBrokenLocks: formData.securityBrokenLocks || false,
      securityBrokenWindows: formData.securityBrokenWindows || false,
      securityBrokenDoors: formData.securityBrokenDoors || false,
      securityNoDeadbolt: formData.securityNoDeadbolt || false,
      securityBrokenGate: formData.securityBrokenGate || false,
      securityBrokenIntercom: formData.securityBrokenIntercom || false,
      securityInadequateLighting: formData.securityInadequateLighting || false,
      securityNoSmokeDetector: formData.securityNoSmokeDetector || false,
      securityBreakIns: formData.securityBreakIns || false,
      securityOther: formData.securityOther || false,
      securityDetails: formData.securityDetails || null,
      securityFirstNoticed: formData.securityFirstNoticed || null,
      securityRepairHistory: formData.securityRepairHistory || null,
      securitySeverity: formData.securitySeverity || null,

      // Pest Issues - ALL fields from intake form (21 checkboxes total)
      hasPestIssues: formData.hasPestIssues || false,
      // Vermin (8 fields)
      pestRats: formData.pestRats || false,
      pestMice: formData.pestMice || false,
      pestBats: formData.pestBats || false,
      pestBirds: formData.pestBirds || false,
      pestSkunks: formData.pestSkunks || false,
      pestRaccoons: formData.pestRaccoons || false,
      pestOpossums: formData.pestOpossums || false,
      pestOtherVermin: formData.pestOtherVermin || false,
      // Insects (13 fields)
      pestAnts: formData.pestAnts || false,
      pestBedbugs: formData.pestBedbugs || false,
      pestSpiders: formData.pestSpiders || false,
      pestMosquitos: formData.pestMosquitos || false,
      pestCockroaches: formData.pestCockroaches || false,
      pestWasps: formData.pestWasps || false,
      pestTermites: formData.pestTermites || false,
      pestBees: formData.pestBees || false,
      pestFlies: formData.pestFlies || false,
      pestHornets: formData.pestHornets || false,
      pestFleas: formData.pestFleas || false,
      pestOtherInsects: formData.pestOtherInsects || false,
      // Details and dates (OLD shared fields - kept for backward compatibility)
      pestDetails: formData.pestDetails || null,
      pestFirstNoticed: formData.pestFirstNoticed || null,
      pestReportedDate: formData.pestReportedDate || null,
      // NEW separated metadata fields (vermin and insects are independent)
      verminDetails: formData.verminDetails || null,
      verminFirstNoticed: formData.verminFirstNoticed || null,
      verminRepairHistory: formData.verminRepairHistory || null,
      verminSeverity: formData.verminSeverity || null,
      insectsDetails: formData.insectsDetails || null,
      insectsFirstNoticed: formData.insectsFirstNoticed || null,
      insectsRepairHistory: formData.insectsRepairHistory || null,
      insectsSeverity: formData.insectsSeverity || null,

      // Fire Hazard Issues - ALL fields from intake form
      hasFireHazardIssues: formData.hasFireHazardIssues || false,
      fireHazardExposedWiring: formData.fireHazardExposedWiring || false,
      fireHazardBlockedExits: formData.fireHazardBlockedExits || false,
      fireHazardNoSmokeDetectors: formData.fireHazardNoSmokeDetectors || false,
      fireHazardBrokenSmokeDetectors: formData.fireHazardBrokenSmokeDetectors || false,
      fireHazardNoFireExtinguisher: formData.fireHazardNoFireExtinguisher || false,
      fireHazardIneffective: formData.fireHazardIneffective || false,
      fireHazardOther: formData.fireHazardOther || false,
      fireHazardDetails: formData.fireHazardDetails || null,
      fireHazardFirstNoticed: formData.fireHazardFirstNoticed || null,
      fireHazardReportedDate: formData.fireHazardReportedDate || null,
      fireHazardRepairHistory: formData.fireHazardRepairHistory || null,
      fireHazardSeverity: formData.fireHazardSeverity || null,

      // Utility Issues - ALL fields from intake form
      hasUtilityIssues: formData.hasUtilityIssues || false,
      utilityNoHotWater: formData.utilityNoHotWater || false,
      utilityNoHeat: formData.utilityNoHeat || false,
      utilityNoElectricity: formData.utilityNoElectricity || false,
      utilityNoGas: formData.utilityNoGas || false,
      utilityOther: formData.utilityOther || false,
      // Individual utility checkbox fields
      utilityGasleak: formData.utilityGasleak || false,
      utilityDetails: formData.utilityDetails || null,
      utilityFirstNoticed: formData.utilityFirstNoticed || null,
      utilityReportedDate: formData.utilityReportedDate || null,
      utilityRepairHistory: formData.utilityRepairHistory || null,
      utilitySeverity: formData.utilitySeverity || null,

      // Flooring Issues - ALL fields from intake form
      hasFlooringIssues: formData.hasFlooringIssues || false,
      flooringDamaged: formData.flooringDamaged || false,
      flooringUneven: formData.flooringUneven || false,
      flooringMissing: formData.flooringMissing || false,
      flooringOther: formData.flooringOther || false,
      // Individual flooring checkbox fields
      flooringCarpetDamaged: formData.flooringCarpetDamaged || false,
      flooringNailsstickingout: formData.flooringNailsstickingout || false,
      flooringTileBroken: formData.flooringTileBroken || false,
      flooringHardwoodDamaged: formData.flooringHardwoodDamaged || false,
      flooringLinoleumDamaged: formData.flooringLinoleumDamaged || false,
      flooringSubfloorDamaged: formData.flooringSubfloorDamaged || false,
      flooringDetails: formData.flooringDetails || null,
      flooringFirstNoticed: formData.flooringFirstNoticed || null,
      flooringReportedDate: formData.flooringReportedDate || null,
      flooringRepairHistory: formData.flooringRepairHistory || null,
      flooringSeverity: formData.flooringSeverity || null,

      // Window Issues - ALL fields from intake form
      hasWindowIssues: formData.hasWindowIssues || false,
      windowBroken: formData.windowBroken || false,
      windowMissing: formData.windowMissing || false,
      windowDrafty: formData.windowDrafty || false,
      windowNoScreens: formData.windowNoScreens || false,
      windowWontOpen: formData.windowWontOpen || false,
      windowOther: formData.windowOther || false,
      // Additional window checkbox fields for doc-gen compatibility
      windowLeaks: formData.windowLeaks || false,
      windowScreens: formData.windowScreens || false,
      windowDonotlock: formData.windowDonotlock || false,
      windowMissingwindows: formData.windowMissingwindows || false,
      windowBrokenormissingscreens: formData.windowBrokenormissingscreens || false,
      windowDetails: formData.windowDetails || null,
      windowFirstNoticed: formData.windowFirstNoticed || null,
      windowReportedDate: formData.windowReportedDate || null,
      windowsRepairHistory: formData.windowsRepairHistory || null,
      windowsSeverity: formData.windowsSeverity || null,

      // Door Issues - ALL fields from intake form
      hasDoorIssues: formData.hasDoorIssues || false,
      doorBroken: formData.doorBroken || false,
      doorNoLock: formData.doorNoLock || false,
      doorDamaged: formData.doorDamaged || false,
      doorWontClose: formData.doorWontClose || false,
      doorMissing: formData.doorMissing || false,
      doorDrafty: formData.doorDrafty || false,
      doorNoScreen: formData.doorNoScreen || false,
      doorOther: formData.doorOther || false,
      // Individual door checkbox fields
      doorKnobs: formData.doorKnobs || false,
      doorSlidingGlass: formData.doorSlidingGlass || false,
      doorWaterproofing: formData.doorWaterproofing || false,
      doorWaterIntrusion: formData.doorWaterIntrusion || false,
      doorDetails: formData.doorDetails || null,
      doorFirstNoticed: formData.doorFirstNoticed || null,
      doorReportedDate: formData.doorReportedDate || null,
      doorsRepairHistory: formData.doorsRepairHistory || null,
      doorsSeverity: formData.doorsSeverity || null,

      // Cabinet Issues - ALL fields from intake form
      hasCabinetIssues: formData.hasCabinetIssues || false,
      cabinetBroken: formData.cabinetBroken || false,
      cabinetMissing: formData.cabinetMissing || false,
      cabinetOther: formData.cabinetOther || false,
      // Additional cabinet checkbox fields for doc-gen compatibility
      cabinetHinges: formData.cabinetHinges || false,
      cabinetAlignment: formData.cabinetAlignment || false,
      cabinetDetails: formData.cabinetDetails || null,
      cabinetFirstNoticed: formData.cabinetFirstNoticed || null,
      cabinetReportedDate: formData.cabinetReportedDate || null,
      cabinetsRepairHistory: formData.cabinetsRepairHistory || null,
      cabinetsSeverity: formData.cabinetsSeverity || null,

      // Common Area Issues - ALL fields from intake form
      hasCommonAreaIssues: formData.hasCommonAreaIssues || false,
      commonAreaHallwayDirty: formData.commonAreaHallwayDirty || false,
      commonAreaStairsDamaged: formData.commonAreaStairsDamaged || false,
      commonAreaElevatorBroken: formData.commonAreaElevatorBroken || false,
      commonAreaLaundryBroken: formData.commonAreaLaundryBroken || false,
      commonAreaMailboxBroken: formData.commonAreaMailboxBroken || false,
      commonAreaLightingBroken: formData.commonAreaLightingBroken || false,
      commonAreaNoSecurity: formData.commonAreaNoSecurity || false,
      commonAreaDoorsUnlocked: formData.commonAreaDoorsUnlocked || false,
      commonAreaIntercomBroken: formData.commonAreaIntercomBroken || false,
      commonAreaRoofLeaking: formData.commonAreaRoofLeaking || false,
      commonAreaBasementFlooded: formData.commonAreaBasementFlooded || false,
      commonAreaGarbageNotCollected: formData.commonAreaGarbageNotCollected || false,
      commonAreaSnowNotRemoved: formData.commonAreaSnowNotRemoved || false,
      commonAreaNoHeat: formData.commonAreaNoHeat || false,
      commonAreaNoHotWater: formData.commonAreaNoHotWater || false,
      commonAreaOther: formData.commonAreaOther || false,
      // Individual common area checkbox fields
      commonAreaDamagetocars: formData.commonAreaDamagetocars || false,
      commonAreaParkingIssue: formData.commonAreaParkingIssue || false,
      commonAreaEntrancesblocked: formData.commonAreaEntrancesblocked || false,
      commonAreaSwimmingpool: formData.commonAreaSwimmingpool || false,
      commonAreaJacuzzi: formData.commonAreaJacuzzi || false,
      commonAreaRecreationroom: formData.commonAreaRecreationroom || false,
      commonAreaGym: formData.commonAreaGym || false,
      commonAreaVermin: formData.commonAreaVermin || false,
      commonAreaInsects: formData.commonAreaInsects || false,
      commonAreaBrokenGate: formData.commonAreaBrokenGate || false,
      commonAreaBlockedareasdoors: formData.commonAreaBlockedareasdoors || false,
      commonAreaDetails: formData.commonAreaDetails || null,
      commonAreaFirstNoticed: formData.commonAreaFirstNoticed || null,
      commonAreaReportedDate: formData.commonAreaReportedDate || null,
      commonAreasRepairHistory: formData.commonAreasRepairHistory || null,
      commonAreasSeverity: formData.commonAreasSeverity || null,

      // Trash Problems - ALL fields from intake form
      hasTrashProblems: formData.hasTrashProblems || false,
      trashNotCollected: formData.trashNotCollected || false,
      trashOverflowing: formData.trashOverflowing || false,
      trashDetails: formData.trashDetails || null,
      trashFirstNoticed: formData.trashFirstNoticed || null,
      trashReportedDate: formData.trashReportedDate || null,
      trashRepairHistory: formData.trashRepairHistory || null,
      trashSeverity: formData.trashSeverity || null,

      // Nuisance Issues - ALL fields from intake form
      hasNuisanceIssues: formData.hasNuisanceIssues || false,
      nuisanceNoise: formData.nuisanceNoise || false,
      nuisanceSmell: formData.nuisanceSmell || false,
      nuisanceSmoke: formData.nuisanceSmoke || false,
      nuisanceOther: formData.nuisanceOther || false,
      nuisanceDetails: formData.nuisanceDetails || null,
      nuisanceFirstNoticed: formData.nuisanceFirstNoticed || null,
      nuisanceReportedDate: formData.nuisanceReportedDate || null,
      nuisanceRepairHistory: formData.nuisanceRepairHistory || null,
      nuisanceSeverity: formData.nuisanceSeverity || null,

      // Health Hazard Issues - ALL fields from intake form
      hasHealthHazardIssues: formData.hasHealthHazardIssues || false,
      healthHazardMold: formData.healthHazardMold || false,
      healthHazardLeadPaint: formData.healthHazardLeadPaint || false,
      healthHazardAsbestos: formData.healthHazardAsbestos || false,
      healthHazardPoorVentilation: formData.healthHazardPoorVentilation || false,
      healthHazardChemicalSmell: formData.healthHazardChemicalSmell || false,
      healthHazardContaminatedWater: formData.healthHazardContaminatedWater || false,
      healthHazardOther: formData.healthHazardOther || false,
      // Individual health hazard checkbox fields
      healthHazardMildew: formData.healthHazardMildew || false,
      healthHazardMushrooms: formData.healthHazardMushrooms || false,
      healthHazardRawsewageonexterior: formData.healthHazardRawsewageonexterior || false,
      healthHazardNoxiousfumes: formData.healthHazardNoxiousfumes || false,
      healthHazardChemicalpaintcontamination: formData.healthHazardChemicalpaintcontamination || false,
      healthHazardToxicwaterpollution: formData.healthHazardToxicwaterpollution || false,
      healthHazardOffensiveodors: formData.healthHazardOffensiveodors || false,
      healthHazardSewageBackup: formData.healthHazardSewageBackup || false,
      healthHazardWaterDamage: formData.healthHazardWaterDamage || false,
      healthHazardFlooding: formData.healthHazardFlooding || false,
      healthHazardGasLeak: formData.healthHazardGasLeak || false,
      healthHazardCarbonMonoxide: formData.healthHazardCarbonMonoxide || false,
      healthHazardAirQuality: formData.healthHazardAirQuality || false,
      healthHazardDetails: formData.healthHazardDetails || null,
      healthHazardFirstNoticed: formData.healthHazardFirstNoticed || null,
      healthHazardReportedDate: formData.healthHazardReportedDate || null,
      healthHazardRepairHistory: formData.healthHazardRepairHistory || null,
      healthHazardSeverity: formData.healthHazardSeverity || null,

      // Government Entities Contacted - ALL fields from intake form (NO date fields)
      hasGovernmentEntitiesContacted: formData.hasGovernmentEntitiesContacted || false,
      govEntityHPD: formData.govEntityHPD || false,
      govEntityDOB: formData.govEntityDOB || false,
      govEntityOATH: formData.govEntityOATH || false,
      govEntityDHCR: formData.govEntityDHCR || false,
      govEntityDHS: formData.govEntityDHS || false,
      govEntity311: formData.govEntity311 || false,
      govEntityOther: formData.govEntityOther || false,
      governmentEntitiesDetails: formData.governmentEntitiesDetails || formData.governmentDetails || null,
      governmentFirstNoticed: formData.governmentFirstNoticed || null,
      governmentRepairHistory: formData.governmentRepairHistory || null,
      governmentSeverity: formData.governmentSeverity || null,

      // Notice Issues - ALL fields from intake form (NO date fields)
      hasNoticeIssues: formData.hasNoticeIssues || false,
      noticeEviction: formData.noticeEviction || false,
      noticeRentIncrease: formData.noticeRentIncrease || false,
      noticeLeaseTerm: formData.noticeLeaseTerm || false,
      noticeEntry: formData.noticeEntry || false,
      noticeRepair: formData.noticeRepair || false,
      noticeOther: formData.noticeOther || false,
      noticeDetails: formData.noticeDetails || null,
      noticesFirstNoticed: formData.noticesFirstNoticed || null,
      noticesRepairHistory: formData.noticesRepairHistory || null,
      noticesSeverity: formData.noticesSeverity || null,

      // Safety Issues - ALL fields from intake form
      hasSafetyIssues: formData.hasSafetyIssues || false,
      safetyNoFireExtinguisher: formData.safetyNoFireExtinguisher || false,
      safetyNoEmergencyLighting: formData.safetyNoEmergencyLighting || false,
      safetyNoFireEscape: formData.safetyNoFireEscape || false,
      safetyBlockedFireEscape: formData.safetyBlockedFireEscape || false,
      safetyDamagedFireEscape: formData.safetyDamagedFireEscape || false,
      safetyOther: formData.safetyOther || false,
      // Individual safety checkbox fields
      safetyBrokenbuzzertogetin: formData.safetyBrokenbuzzertogetin || false,
      safetySecuritycameras: formData.safetySecuritycameras || false,
      safetyDetails: formData.safetyDetails || null,
      safetyFirstNoticed: formData.safetyFirstNoticed || null,
      safetyReportedDate: formData.safetyReportedDate || null,
      safetyRepairHistory: formData.safetyRepairHistory || null,
      safetySeverity: formData.safetySeverity || null,

      // Harassment Issues - Phase 3A (15 checkboxes + 1 date field)
      // Support both camelCase and lowercase field names from form
      hasHarassmentIssues: formData.hasHarassmentIssues || false,
      harassmentUnlawfulDetainer: formData.harassmentUnlawfulDetainer || false,
      harassmentEvictionThreats: formData.harassmentEvictionThreats || formData.harassmentEvictionthreats || false,
      harassmentByDefendant: formData.harassmentByDefendant || formData.harassmentBydefendant || false,
      harassmentByMaintenance: formData.harassmentByMaintenance || formData.harassmentBymaintenancemanworkers || false,
      harassmentByManager: formData.harassmentByManager || formData.harassmentBymanagerbuildingstaff || false,
      harassmentByOwner: formData.harassmentByOwner || formData.harassmentByowner || false,
      harassmentByOtherTenants: formData.harassmentByOtherTenants || formData.harassmentOthertenants || false,
      harassmentIllegitimateNotices: formData.harassmentIllegitimateNotices || formData.harassmentIllegitimatenotices || false,
      harassmentRefusalToRepair: formData.harassmentRefusalToRepair || formData.harassmentRefusaltomaketimelyrepairs || false,
      harassmentWrittenThreats: formData.harassmentWrittenThreats || formData.harassmentWrittenthreats || false,
      harassmentAggressiveLanguage: formData.harassmentAggressiveLanguage || formData.harassmentAggressiveinappropriatelanguage || false,
      harassmentPhysicalThreats: formData.harassmentPhysicalThreats || formData.harassmentPhysicalthreatsortouching || false,
      harassmentSinglingOut: formData.harassmentSinglingOut || formData.harassmentNoticessinglingoutonetenantbutnotuniformlygiventoalltenants || false,
      harassmentDuplicativeNotices: formData.harassmentDuplicativeNotices || formData.harassmentDuplicativenotices || false,
      harassmentUntimelyResponse: formData.harassmentUntimelyResponse || formData.harassmentUntimelyResponsefromLandlord || false,
      harassmentDetails: formData.harassmentDetails || null,
      harassmentStartDate: formData.harassmentStartDate || null,
      harassmentFirstNoticed: formData.harassmentFirstNoticed || null,
      harassmentRepairHistory: formData.harassmentRepairHistory || null,
      harassmentSeverity: formData.harassmentSeverity || null,

      // Master checkbox only categories (no individual options) - NEW in Phase 3
      // Note: Includes fallback mappings for alternative field names from test intake
      hasInjuryIssues: formData.hasInjuryIssues || formData.hasInjury || false,
      injuryDetails: formData.injuryDetails || null,
      injuryFirstNoticed: formData.injuryFirstNoticed || null,
      injuryRepairHistory: formData.injuryRepairHistory || null,
      injurySeverity: formData.injurySeverity || null,

      hasNonresponsiveIssues: formData.hasNonresponsiveIssues || formData.hasNonresponsiveLandlord || false,
      nonresponsiveDetails: formData.nonresponsiveDetails || null,
      nonresponsiveFirstNoticed: formData.nonresponsiveFirstNoticed || null,
      nonresponsiveRepairHistory: formData.nonresponsiveRepairHistory || null,
      nonresponsiveSeverity: formData.nonresponsiveSeverity || null,

      hasUnauthorizedIssues: formData.hasUnauthorizedIssues || formData.hasUnauthorizedEntries || false,
      unauthorizedDetails: formData.unauthorizedDetails || null,
      unauthorizedFirstNoticed: formData.unauthorizedFirstNoticed || null,
      unauthorizedRepairHistory: formData.unauthorizedRepairHistory || null,
      unauthorizedSeverity: formData.unauthorizedSeverity || null,

      hasStolenIssues: formData.hasStolenIssues || formData.hasStolenItems || false,
      stolenDetails: formData.stolenDetails || null,
      stolenFirstNoticed: formData.stolenFirstNoticed || null,
      stolenRepairHistory: formData.stolenRepairHistory || null,
      stolenSeverity: formData.stolenSeverity || null,

      hasDamagedIssues: formData.hasDamagedIssues || formData.hasDamagedItems || false,
      damagedDetails: formData.damagedDetails || null,
      damagedFirstNoticed: formData.damagedFirstNoticed || null,
      damagedRepairHistory: formData.damagedRepairHistory || null,
      damagedSeverity: formData.damagedSeverity || null,

      hasAgeDiscrimination: formData.hasAgeDiscrimination || false,
      ageDiscrimDetails: formData.ageDiscrimDetails || null,
      ageDiscrimFirstNoticed: formData.ageDiscrimFirstNoticed || null,
      ageDiscrimRepairHistory: formData.ageDiscrimRepairHistory || null,
      ageDiscrimSeverity: formData.ageDiscrimSeverity || null,

      hasRacialDiscrimination: formData.hasRacialDiscrimination || false,
      racialDiscrimDetails: formData.racialDiscrimDetails || null,
      racialDiscrimFirstNoticed: formData.racialDiscrimFirstNoticed || null,
      racialDiscrimRepairHistory: formData.racialDiscrimRepairHistory || null,
      racialDiscrimSeverity: formData.racialDiscrimSeverity || null,

      hasDisabilityDiscrimination: formData.hasDisabilityDiscrimination || formData.hasDisabilityDiscrimination || false,
      disabilityDiscrimDetails: formData.disabilityDiscrimDetails || formData.disabilityDetails || null,
      disabilityDiscrimFirstNoticed: formData.disabilityDiscrimFirstNoticed || formData.disabilityFirstNoticed || null,
      disabilityDiscrimRepairHistory: formData.disabilityDiscrimRepairHistory || formData.disabilityRepairHistory || null,
      disabilityDiscrimSeverity: formData.disabilityDiscrimSeverity || formData.disabilitySeverity || null,

      hasSecurityDepositIssues: formData.hasSecurityDepositIssues || formData.hasSecurityDeposit || false,
      securityDepositDetails: formData.securityDepositDetails || null,
      securityDepositFirstNoticed: formData.securityDepositFirstNoticed || null,
      securityDepositRepairHistory: formData.securityDepositRepairHistory || null,
      securityDepositSeverity: formData.securityDepositSeverity || null,

      // Legacy fields for backwards compatibility (can be removed later)
      hasOtherIssues: formData.hasOtherIssues || false,
      otherDescription: formData.otherIssuesDescription || null,

      // ========== ARRAY FORMAT FIELDS ==========
      // Store array-format fields from intake form for doc-gen mapping
      // These allow intake to use ["Rats / Mice", "Bats"] format
      verminTypes: formData.verminTypes || [],
      insectTypes: formData.insectTypes || [],
      plumbingTypes: formData.plumbingTypes || [],
      electricalTypes: formData.electricalTypes || [],
      hvacTypes: formData.hvacTypes || [],
      healthHazardTypes: formData.healthHazardTypes || [],
      fireHazardTypes: formData.fireHazardTypes || [],
      structuralTypes: formData.structuralTypes || [],
      flooringTypes: formData.flooringTypes || [],
      cabinetTypes: formData.cabinetTypes || [],
      doorTypes: formData.doorTypes || [],
      windowTypes: formData.windowTypes || [],
      applianceTypes: formData.applianceTypes || [],
      commonAreaTypes: formData.commonAreaTypes || [],
      nuisanceTypes: formData.nuisanceTypes || [],
      trashTypes: formData.trashTypes || [],
      harassmentTypes: formData.harassmentTypes || [],
      governmentTypes: formData.governmentTypes || [],
      noticeTypes: formData.noticeTypes || [],
      safetyTypes: formData.safetyTypes || [],
      utilityTypes: formData.utilityTypes || [],

    };

    // Phase 3.5: Household members removed from form
    const householdMembers = formData.householdMembers || [];

    // Phase 3A: Legal History Fields
    const legalHistory = {
      hasRentDeductions: formData.hasRentDeductions || null,
      rentDeductionsDetails: formData.rentDeductionsDetails || null,
      hasBeenRelocated: formData.hasBeenRelocated || null,
      relocationDetails: formData.relocationDetails || null,
      hasLawsuitInvolvement: formData.hasLawsuitInvolvement || null,
      lawsuitDetails: formData.lawsuitDetails || null,
      hasPoliceReports: formData.hasPoliceReports || null,
      hasPropertyDamage: formData.hasPropertyDamage || null,
    };

    // Phase 3B: Household Demographics
    const householdDemographics = {
      clientOccupation: formData.clientOccupation || null,
      clientHasDisability: formData.clientHasDisability || null,
      clientDisabilityDetails: formData.clientDisabilityDetails || null,
      isSpanishSpeaking: formData.isSpanishSpeaking || null,
      isVeteran: formData.isVeteran || null,
      numberOfChildren: formData.numberOfChildren ? parseInt(formData.numberOfChildren) : null,
      numberOfElderly: formData.numberOfElderly ? parseInt(formData.numberOfElderly) : null,
      totalHouseholdSize: formData.totalHouseholdSize ? parseInt(formData.totalHouseholdSize) : null,
      householdIncomeUnder45k: formData.householdIncomeUnder45k || null,
    };

    // Phase 3.5: Additional Property/Tenancy fields (simplified)
    const additionalTenancyInfo = {
      hasUnlawfulDetainerFiled: null, // Phase 3.5: Removed from form
      moveInDate: formData.moveInDate || null,
      // Support both old and new field names
      hasRetainerWithAnotherAttorney: formData.hasSignedRetainer || formData.hasRetainerWithAnotherAttorney || null,
      howDidYouFindUs: null, // Phase 3.5: Removed from form
    };

    // Insert into database
    const query = `
      INSERT INTO client_intakes (
        intake_number,
        first_name,
        middle_name,
        last_name,
        preferred_name,
        date_of_birth,
        email_address,
        primary_phone,
        secondary_phone,
        preferred_contact_method,
        current_address,
        property_address,
        tenancy_info,
        household_members,
        landlord_info,
        property_manager_info,
        building_issues,
        intake_status,
        raw_form_data
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
        $11, $12, $13, $14, $15, $16, $17, $18, $19
      )
      RETURNING id, intake_number, created_at, intake_status
    `;

    // Merge all the new Phase 3 fields into the appropriate JSONB columns
    const extendedTenancyInfo = {
      ...tenancyInfo,
      ...additionalTenancyInfo,
    };

    const extendedBuildingIssues = {
      ...buildingIssues,
      ...legalHistory,
    };

    const extendedHouseholdMembers = {
      members: householdMembers,
      demographics: householdDemographics,
    };

    // Phase 3.5: Updated values array with new field names
    const values = [
      intakeNumber,
      formData.firstName,
      formData.middleName || null,
      formData.lastName,
      formData.preferredName || null,
      formData.dateOfBirth || null,
      formData.emailAddress,
      // Support both old and new field names
      formData.phone || formData.primaryPhone,
      null, // secondaryPhone removed in Phase 3.5
      formData.preferredContactMethod || 'email',
      JSON.stringify(currentAddress),
      JSON.stringify(propertyAddress),
      JSON.stringify(extendedTenancyInfo),
      JSON.stringify(extendedHouseholdMembers),
      landlordInfo ? JSON.stringify(landlordInfo) : null,
      propertyManagerInfo ? JSON.stringify(propertyManagerInfo) : null,
      JSON.stringify(extendedBuildingIssues),
      'pending',
      JSON.stringify(formData),
    ];

    const result = await db.query(query, values);
    const intake = result.rows[0];

    // ============================================================================
    // Phase 7B.1: Auto-create CRM Dashboard entry
    // ============================================================================
    // Creates a case_dashboard entry for every new intake to enable workflow tracking
    // This happens before any optional operations so it always succeeds with the intake
    let dashboardId = null;
    try {
      const dashboardResult = await db.query(`
        INSERT INTO case_dashboard (intake_id, status, status_changed_by)
        VALUES ($1, 'new', 'system')
        RETURNING id
      `, [intake.id]);
      dashboardId = dashboardResult.rows[0].id;
      logger.info('Dashboard entry auto-created for intake', {
        intakeId: intake.id,
        intakeNumber: intake.intake_number,
        dashboardId: dashboardId
      });

      // Log the creation activity
      await db.query(`
        INSERT INTO case_activities (dashboard_id, intake_id, activity_type, description, performed_by)
        VALUES ($1, $2, 'created', 'Case auto-created from client intake submission', 'system')
      `, [dashboardId, intake.id]);
    } catch (dashboardError) {
      // Log error but don't fail the intake - dashboard can be created later
      logger.error('Failed to auto-create dashboard entry', {
        intakeId: intake.id,
        intakeNumber: intake.intake_number,
        error: dashboardError.message
      });
    }
    // ============================================================================

    // Phase 3C: Write to new normalized tables if feature flag is enabled
    const USE_NEW_INTAKE_SCHEMA = process.env.USE_NEW_INTAKE_SCHEMA === 'true';

    if (USE_NEW_INTAKE_SCHEMA) {
      try {
        logger.info('Writing to new normalized intake tables', {
          intakeId: intake.id,
          intakeNumber: intake.intake_number
        });

        // Extract issue selections and metadata from formData
        const selections = extractIssueSelections(formData);
        const metadata = extractIssueMetadata(formData);

        // Write to normalized tables
        await writeIssueSelections(db, intake.id, selections);
        await writeIssueMetadata(db, intake.id, metadata);

        logger.info('Successfully wrote to new normalized tables', {
          intakeId: intake.id,
          selectionsCount: selections.length,
          metadataCategoriesCount: Object.keys(metadata).length
        });
      } catch (normalizedWriteError) {
        // Log error but don't fail the request - JSONB write already succeeded
        logger.error('Error writing to normalized tables (JSONB write succeeded)', {
          intakeId: intake.id,
          intakeNumber: intake.intake_number,
          error: normalizedWriteError.message,
          stack: normalizedWriteError.stack
        });
      }
    }

    const duration = Date.now() - startTime;
    logger.info('Intake form saved successfully', {
      intakeId: intake.id,
      intakeNumber: intake.intake_number,
      duration: `${duration}ms`,
      wroteToNormalizedTables: USE_NEW_INTAKE_SCHEMA
    });

    res.status(201).json({
      success: true,
      message: 'Intake form submitted successfully',
      data: {
        intakeId: intake.id,
        intakeNumber: intake.intake_number,
        status: intake.intake_status,
        submittedAt: intake.created_at,
        dashboardId: dashboardId, // Phase 7B.1: Include CRM dashboard entry ID
      },
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('Error saving intake form', {
      error: error.message,
      stack: error.stack,
      duration: `${duration}ms`,
    });

    res.status(500).json({
      error: 'Failed to submit intake form',
      message: 'An unexpected error occurred. Please try again.',
      errorCode: 'INTAKE_SUBMIT_ERROR'
    });
  }
});

/**
 * GET /api/intakes
 * Get all intake forms
 */
router.get('/', async (req, res) => {
  try {
    const db = getPool();
    const query = `
      SELECT
        id,
        intake_number,
        first_name,
        middle_name,
        last_name,
        email_address,
        primary_phone,
        intake_status,
        created_at as intake_date,
        updated_at,
        current_address,
        property_address
      FROM client_intakes
      WHERE deleted_at IS NULL
      ORDER BY created_at DESC
    `;

    const result = await db.query(query);

    // Transform the results to flatten JSONB fields for the modal
    const intakes = result.rows.map(row => ({
      id: row.id,
      intake_number: row.intake_number,
      first_name: row.first_name,
      middle_name: row.middle_name,
      last_name: row.last_name,
      email_address: row.email_address,
      primary_phone: row.primary_phone,
      intake_status: row.intake_status,
      intake_date: row.intake_date,
      updated_at: row.updated_at,
      // Flatten current address
      current_street_address: row.current_address?.street || null,
      current_city: row.current_address?.city || null,
      current_state: row.current_address?.state || null,
      current_zip_code: row.current_address?.zipCode || null,
      // Flatten property address
      property_street_address: row.property_address?.street || null,
      property_city: row.property_address?.city || null,
      property_state: row.property_address?.state || null,
      property_zip_code: row.property_address?.zipCode || null,
    }));

    res.status(200).json({
      success: true,
      count: intakes.length,
      intakes: intakes,
    });
  } catch (error) {
    logger.error('Error fetching intake forms', {
      error: error.message,
      stack: error.stack,
    });

    res.status(500).json({
      error: 'Failed to fetch intake forms',
      message: 'An unexpected error occurred. Please try again.',
      errorCode: 'INTAKE_LIST_ERROR'
    });
  }
});

/**
 * PATCH /api/intakes/:id/building-issues
 * Update building_issues for a specific intake (for testing/admin purposes)
 */
router.patch('/:id/building-issues', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const db = getPool();

    // Get current building_issues
    const currentQuery = `SELECT building_issues FROM client_intakes WHERE id = $1 AND deleted_at IS NULL`;
    const currentResult = await db.query(currentQuery, [id]);

    if (currentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Intake not found' });
    }

    // Merge updates with existing building_issues
    const currentBuildingIssues = currentResult.rows[0].building_issues || {};
    const updatedBuildingIssues = { ...currentBuildingIssues, ...updates };

    // Update the database
    const updateQuery = `
      UPDATE client_intakes
      SET building_issues = $1, updated_at = NOW()
      WHERE id = $2 AND deleted_at IS NULL
      RETURNING id
    `;
    await db.query(updateQuery, [JSON.stringify(updatedBuildingIssues), id]);

    res.json({ success: true, message: 'Building issues updated', updatedFields: Object.keys(updates) });
  } catch (error) {
    logger.error('Error updating building issues:', error);
    res.status(500).json({ error: 'Failed to update building issues' });
  }
});

/**
 * GET /api/intakes/:id
 * Get a specific intake form by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const db = getPool();

    const query = `
      SELECT * FROM client_intakes
      WHERE id = $1 AND deleted_at IS NULL
    `;

    const result = await db.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Intake form not found',
      });
    }

    res.status(200).json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    logger.error('Error fetching intake form', {
      error: error.message,
      stack: error.stack,
    });

    res.status(500).json({
      error: 'Failed to fetch intake form',
      message: 'An unexpected error occurred. Please try again.',
      errorCode: 'INTAKE_GET_ERROR'
    });
  }
});

/**
 * GET /api/intakes/:id/doc-gen-format
 * Get intake data formatted for document generation form population
 * Transforms JSONB structure into flat hyphenated keys matching form field names
 */
router.get('/:id/doc-gen-format', async (req, res) => {
  try {
    const { id } = req.params;
    const db = getPool();

    const query = `
      SELECT * FROM client_intakes
      WHERE id = $1 AND deleted_at IS NULL
    `;

    const result = await db.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Intake form not found',
      });
    }

    const intake = result.rows[0];

    // ===== DEBUGGING: Log intake building_issues =====
    logger.info('DOC-GEN FORMAT DEBUG - Intake building_issues data:', {
      intakeId: id,
      hasBuildingIssues: !!intake.building_issues,
      buildingIssuesKeys: intake.building_issues ? Object.keys(intake.building_issues) : [],
      buildingIssuesData: intake.building_issues || {},
    });

    // Calculate age and adult status from date of birth
    let age = null;
    let isAdult = false;
    if (intake.date_of_birth) {
      const birthDate = new Date(intake.date_of_birth);
      const today = new Date();
      age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();

      // Adjust age if birthday hasn't occurred yet this year
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }

      // Determine adult status (21+ years old)
      isAdult = age >= 21;
    }

    // Implement Head of Household logic for Plaintiff #1
    // If client is head of household, use their info
    // If not, look for the head of household in household members array
    const isClientHeadOfHousehold = intake.is_head_of_household !== false; // Default to true if not specified
    let plaintiff1FirstName = intake.first_name || '';
    let plaintiff1LastName = intake.last_name || '';

    if (!isClientHeadOfHousehold && intake.household_members && Array.isArray(intake.household_members)) {
      // Find the head of household from household members
      const headOfHousehold = intake.household_members.find(member =>
        member.memberType === 'head_of_household' || member.relationshipToClient === 'head_of_household'
      );

      if (headOfHousehold) {
        plaintiff1FirstName = headOfHousehold.firstName || plaintiff1FirstName;
        plaintiff1LastName = headOfHousehold.lastName || plaintiff1LastName;
      }
    }

    // ===================================================================
    // HELPER: Check if a value exists in array OR is a boolean true
    // Supports BOTH old array format (verminTypes: ["Rats / Mice"])
    // AND new boolean format (pestRats: true)
    // ===================================================================
    const bi = intake.building_issues || {};
    // Also check raw_form_data for array fields (verminTypes, insectTypes, etc.)
    // These arrays may be stored in raw_form_data but not in building_issues
    const raw = intake.raw_form_data || {};

    // Helper to check array contains a value (case-insensitive, partial match)
    const arrayIncludes = (arr, ...searchTerms) => {
      if (!Array.isArray(arr)) return false;
      return arr.some(item => {
        const itemLower = String(item).toLowerCase().replace(/[^a-z]/g, '');
        return searchTerms.some(term => {
          const termLower = String(term).toLowerCase().replace(/[^a-z]/g, '');
          return itemLower.includes(termLower) || termLower.includes(itemLower);
        });
      });
    };

    // Vermin/Pest arrays - check BOTH building_issues AND raw_form_data
    // Arrays may be in raw_form_data but not properly mapped to building_issues
    const verminTypes = bi.verminTypes || raw.verminTypes || [];
    const insectTypes = bi.insectTypes || bi.insectsTypes || raw.insectTypes || raw.insectsTypes || [];
    const plumbingTypes = bi.plumbingTypes || raw.plumbingTypes || [];
    const electricalTypes = bi.electricalTypes || raw.electricalTypes || [];
    const hvacTypes = bi.hvacTypes || raw.hvacTypes || [];
    const healthHazardTypes = bi.healthHazardTypes || raw.healthHazardTypes || [];
    const fireHazardTypes = bi.fireHazardTypes || raw.fireHazardTypes || [];
    const structuralTypes = bi.structuralTypes || bi.structureTypes || raw.structuralTypes || raw.structureTypes || [];
    const flooringTypes = bi.flooringTypes || raw.flooringTypes || [];
    const doorTypes = bi.doorTypes || bi.doorsTypes || raw.doorTypes || raw.doorsTypes || [];
    const windowTypes = bi.windowTypes || bi.windowsTypes || raw.windowTypes || raw.windowsTypes || [];
    const applianceTypes = bi.applianceTypes || bi.appliancesTypes || raw.applianceTypes || raw.appliancesTypes || [];
    const nuisanceTypes = bi.nuisanceTypes || raw.nuisanceTypes || [];
    const commonAreaTypes = bi.commonAreaTypes || bi.commonAreasTypes || raw.commonAreaTypes || raw.commonAreasTypes || [];
    const harassmentTypes = bi.harassmentTypes || raw.harassmentTypes || [];
    const governmentTypes = bi.governmentTypes || bi.governmentEntitiesContacted || raw.governmentTypes || raw.governmentEntitiesContacted || [];
    const cabinetTypes = bi.cabinetTypes || bi.cabinetsTypes || raw.cabinetTypes || raw.cabinetsTypes || [];
    const trashTypes = bi.trashTypes || raw.trashTypes || [];
    const noticeTypes = bi.noticeTypes || bi.noticesTypes || raw.noticeTypes || raw.noticesTypes || [];
    const safetyTypes = bi.safetyTypes || raw.safetyTypes || [];
    const utilityTypes = bi.utilityTypes || raw.utilityTypes || [];

    // Transform JSONB data into doc-gen format (flat hyphenated keys)
    const docGenData = {
      // Property Information (from property_address JSONB)
      'property-address': intake.property_address?.street || '',
      'apartment-unit': intake.property_address?.unit || '',
      'city': intake.property_address?.city || '',
      'state': intake.property_address?.state || '',
      'zip-code': intake.property_address?.zipCode || '',
      'filing-city': intake.property_address?.city || '', // Same as city per mapping spec
      'filing-county': intake.filing_county || '', // Use actual filing_county column

      // Plaintiff 1 - Uses Head of Household logic
      'plaintiff-1-first-name': plaintiff1FirstName,
      'plaintiff-1-last-name': plaintiff1LastName,
      'plaintiff-1-phone': intake.primary_phone || '',
      'plaintiff-1-email': intake.email_address || '',
      'plaintiff-1-address': intake.current_address?.street || '',
      'plaintiff-1-unit': intake.current_address?.unit || '',
      'plaintiff-1-city': intake.current_address?.city || '',
      'plaintiff-1-state': intake.current_address?.state || '',
      'plaintiff-1-zip': intake.current_address?.zipCode || '',
      'plaintiff-1-date-of-birth': intake.date_of_birth || '',
      'plaintiff-1-age': age !== null ? age.toString() : '',
      'plaintiff-1-is-adult': isAdult,
      'plaintiff-1-head-of-household': isClientHeadOfHousehold,

      // Defendant 1 (Landlord) - from landlord_info JSONB
      'defendant-1-name': intake.landlord_info?.name || '',
      'defendant-1-company': intake.landlord_info?.companyName || '',
      'defendant-1-address': intake.landlord_info?.address || '',
      'defendant-1-city': '', // Not stored separately in intake
      'defendant-1-state': '', // Not stored separately in intake
      'defendant-1-zip': '', // Not stored separately in intake
      'defendant-1-phone': intake.landlord_info?.phone || '',
      'defendant-1-email': intake.landlord_info?.email || '',

      // Lease Information - from tenancy_info JSONB
      // Support both old (leaseStartDate) and new (moveInDate) field names
      'lease-start-date': intake.tenancy_info?.leaseStartDate || intake.tenancy_info?.moveInDate || '',
      'monthly-rent': intake.tenancy_info?.monthlyRent ? intake.tenancy_info.monthlyRent.toString() : '',
      'security-deposit': intake.tenancy_info?.securityDeposit ? intake.tenancy_info.securityDeposit.toString() : '',

      // =======================================================================
      // BUILDING ISSUES MAPPING - Doc-Gen Plaintiff Issues Format
      // =======================================================================
      // Doc-gen form uses edit-issue-{plaintiffId}-{category-name} format for plaintiff issues
      // Example: edit-issue-1-VerminIssue, edit-issue-1-ElectricalIssues
      // These are the actual checkboxes in the doc-gen form for plaintiff #1
      // =======================================================================

      // Plaintiff #1 Issue Toggle Checkboxes (ACTUAL IDs from dynamically generated HTML)
      // Format: {category-name}-toggle-{plaintiffId}
      // Supports THREE ways to detect issues:
      //   1. Boolean format: hasVermin, hasPestIssues, pestRats, etc.
      //   2. Array format: verminTypes: ["Rats / Mice"], insectTypes: ["Ants"], etc.
      //   3. Details text: If verminDetails has content, vermin issues exist
      'vermin-toggle-1':
        bi.hasVermin || bi.hasPestIssues ||
        bi.pestRats || bi.pestMice || bi.pestBats || bi.pestBirds ||
        bi.pestSkunks || bi.pestRaccoons || bi.pestOpossums || bi.pestRodents ||
        verminTypes.length > 0 ||
        !!(bi.verminDetails && bi.verminDetails.trim()) ||
        false,
      'insect-toggle-1':
        bi.hasInsects || bi.hasPestIssues ||
        bi.pestAnts || bi.pestBedbugs || bi.pestBedBugs || bi.pestSpiders ||
        bi.pestMosquitos || bi.pestCockroaches || bi.pestWasps || bi.pestTermites ||
        bi.pestBees || bi.pestFlies || bi.pestHornets || bi.pestFleas ||
        insectTypes.length > 0 ||
        !!(bi.insectsDetails && bi.insectsDetails.trim()) ||
        false,
      'hvac-toggle-1': bi.hasHvacIssues || bi.hasHvac || hvacTypes.length > 0 || !!(bi.hvacDetails && bi.hvacDetails.trim()) || false,
      'electrical-toggle-1': bi.hasElectricalIssues || bi.hasElectrical || electricalTypes.length > 0 || !!(bi.electricalDetails && bi.electricalDetails.trim()) || false,
      'fire-hazard-toggle-1': bi.hasFireHazardIssues || bi.hasFireHazard || fireHazardTypes.length > 0 || !!(bi.fireHazardDetails && bi.fireHazardDetails.trim()) || false,
      'government-toggle-1': bi.hasGovernmentEntitiesContacted || bi.hasGovernment || governmentTypes.length > 0 || !!(bi.governmentEntitiesDetails && bi.governmentEntitiesDetails.trim()) || false,
      'appliances-toggle-1': bi.hasApplianceIssues || bi.hasAppliances || applianceTypes.length > 0 || !!(bi.applianceDetails && bi.applianceDetails.trim()) || false,
      'plumbing-toggle-1': bi.hasPlumbingIssues || bi.hasPlumbing || plumbingTypes.length > 0 || !!(bi.plumbingDetails && bi.plumbingDetails.trim()) || false,
      'cabinets-toggle-1': bi.hasCabinetIssues || bi.hasCabinets || !!(bi.cabinetDetails && bi.cabinetDetails.trim()) || false,
      'flooring-toggle-1': bi.hasFlooringIssues || bi.hasFlooring || flooringTypes.length > 0 || !!(bi.flooringDetails && bi.flooringDetails.trim()) || false,
      'windows-toggle-1': bi.hasWindowIssues || bi.hasWindows || windowTypes.length > 0 || !!(bi.windowDetails && bi.windowDetails.trim()) || false,
      'door-toggle-1': bi.hasDoorIssues || bi.hasDoors || doorTypes.length > 0 || !!(bi.doorDetails && bi.doorDetails.trim()) || false,
      'structure-toggle-1': bi.hasStructuralIssues || bi.hasStructure || structuralTypes.length > 0 || !!(bi.structuralDetails && bi.structuralDetails.trim()) || false,
      'common-areas-toggle-1': bi.hasCommonAreaIssues || bi.hasCommonAreas || commonAreaTypes.length > 0 || !!(bi.commonAreaDetails && bi.commonAreaDetails.trim()) || false,
      'trash-toggle-1': bi.hasTrashProblems || bi.hasTrash || !!(bi.trashDetails && bi.trashDetails.trim()) || false,
      'nuisance-toggle-1': bi.hasNuisanceIssues || bi.hasNuisance || nuisanceTypes.length > 0 || !!(bi.nuisanceDetails && bi.nuisanceDetails.trim()) || false,
      'health-hazard-toggle-1': bi.hasHealthHazardIssues || bi.hasHealthHazard || healthHazardTypes.length > 0 || !!(bi.healthHazardDetails && bi.healthHazardDetails.trim()) || false,
      'harassment-toggle-1': bi.hasHarassmentIssues || bi.hasHarassment || harassmentTypes.length > 0 || !!(bi.harassmentDetails && bi.harassmentDetails.trim()) || false,
      'notices-toggle-1': bi.hasNoticeIssues || bi.hasNotices || !!(bi.noticeDetails && bi.noticeDetails.trim()) || false,
      'utility-toggle-1': bi.hasUtilityIssues || bi.hasUtility || !!(bi.utilityDetails && bi.utilityDetails.trim()) || false,
      'safety-toggle-1': bi.hasSafetyIssues || bi.hasSafety || !!(bi.safetyDetails && bi.safetyDetails.trim()) || false,

      // =======================================================================
      // INDIVIDUAL BUILDING ISSUES CHECKBOXES
      // =======================================================================
      // Format: {category}-{ItemNoSpaces}-{plaintiffId}
      // Maps FROM client intake form fields (camelCase) TO doc-gen checkbox IDs
      // Many doc-gen checkboxes don't have direct intake form equivalents
      // We map the closest semantic matches from the intake form
      // =======================================================================

      // ===== PLUMBING ISSUES (15 items) =====
      // Supports BOTH boolean format AND array format (plumbingTypes: ["Clogged toilets"])
      // Also supports stored field names like plumbingToiletNotWorking, plumbingNoHotWater, etc.
      'plumbing-Toilet-1': bi.plumbingToiletNotWorking || bi.plumbingToilet || bi.plumbingCloggedtoilets || arrayIncludes(plumbingTypes, 'toilet', 'clogged toilets') || false,
      'plumbing-Sink-1': bi.plumbingSinkNotWorking || bi.plumbingCloggedsinks || arrayIncludes(plumbingTypes, 'sink', 'clogged sinks') || false,
      'plumbing-Bathtub-1': bi.plumbingBath || bi.plumbingCloggedbath || bi.plumbingCloggedDrains || arrayIncludes(plumbingTypes, 'bath', 'bathtub') || false,
      'plumbing-Shower-1': bi.plumbingShowerNotWorking || bi.plumbingShower || bi.plumbingCloggedshower || arrayIncludes(plumbingTypes, 'shower') || false,
      'plumbing-WaterPressure-1': bi.plumbingLowPressure || bi.plumbingInsufficientwaterpressure || arrayIncludes(plumbingTypes, 'water pressure', 'insufficient') || false,
      'plumbing-Fixtures-1': bi.plumbingFixtures || bi.plumbingLeaks || bi.plumbingOther || arrayIncludes(plumbingTypes, 'fixtures') || false,
      'plumbing-Leaks-1': bi.plumbingLeaks || arrayIncludes(plumbingTypes, 'leaks') || false,
      // UI uses exact label text without spaces as ID
      'plumbing-Sewagecomingout-1': bi.plumbingSewerBackup || bi.plumbingSewagecomingout || arrayIncludes(plumbingTypes, 'sewage', 'sewage coming out') || false,
      'plumbing-Nohotwater-1': bi.plumbingNoHotWater || bi.plumbingNohotwater || arrayIncludes(plumbingTypes, 'hot water', 'no hot water') || false,
      'plumbing-Nocoldwater-1': bi.plumbingNoWater || bi.plumbingNocoldwater || arrayIncludes(plumbingTypes, 'cold water', 'no cold water') || false,
      'plumbing-NoCleanWaterSupply-1': bi.plumbingWaterDiscoloration || bi.plumbingNoCleanWaterSupply || arrayIncludes(plumbingTypes, 'water supply', 'clean water') || false,
      'plumbing-Unsanitarywater-1': bi.plumbingWaterDiscoloration || bi.plumbingUnsanitarywater || arrayIncludes(plumbingTypes, 'unsanitary') || false,
      // Additional plumbing mappings needed for UI
      'plumbing-Cloggedtoilets-1': bi.plumbingToiletNotWorking || bi.plumbingCloggedtoilets || arrayIncludes(plumbingTypes, 'clogged toilets') || false,
      'plumbing-Bath-1': bi.plumbingBath || bi.plumbingShowerNotWorking || bi.plumbingCloggedDrains || arrayIncludes(plumbingTypes, 'bath') || false,
      'plumbing-Cloggedbath-1': bi.plumbingCloggedDrains || bi.plumbingCloggedbath || arrayIncludes(plumbingTypes, 'clogged bath') || false,
      'plumbing-Cloggedshower-1': bi.plumbingCloggedDrains || bi.plumbingCloggedshower || arrayIncludes(plumbingTypes, 'clogged shower') || false,
      'plumbing-Cloggedsinks-1': bi.plumbingCloggedDrains || bi.plumbingCloggedsinks || arrayIncludes(plumbingTypes, 'clogged sinks') || false,
      'plumbing-Insufficientwaterpressure-1': bi.plumbingLowPressure || bi.plumbingInsufficientwaterpressure || arrayIncludes(plumbingTypes, 'insufficient water pressure', 'water pressure') || false,

      // ===== PEST/VERMIN ISSUES =====
      // Supports BOTH boolean format (pestRats) AND array format (verminTypes: ["Rats / Mice"])
      'vermin-RatsMice-1':
        bi.pestRats || bi.pestMice || bi.pestRodents ||
        arrayIncludes(verminTypes, 'rats', 'mice', 'rodent') ||
        false,
      'vermin-Bats-1': bi.pestBats || arrayIncludes(verminTypes, 'bats') || false,
      'vermin-Pigeons-1': bi.pestBirds || arrayIncludes(verminTypes, 'pigeons', 'birds') || false,
      'vermin-Skunks-1': bi.pestSkunks || arrayIncludes(verminTypes, 'skunks') || false,
      'vermin-Raccoons-1': bi.pestRaccoons || arrayIncludes(verminTypes, 'raccoons') || false,
      'vermin-Opossums-1': bi.pestOpossums || arrayIncludes(verminTypes, 'opossums') || false,

      // ===== INSECT ISSUES =====
      // Supports BOTH boolean format (pestAnts) AND array format (insectTypes: ["Ants"])
      'insect-Ants-1': bi.pestAnts || arrayIncludes(insectTypes, 'ants') || false,
      'insect-Bedbugs-1':
        bi.pestBedbugs || bi.pestBedBugs ||
        arrayIncludes(insectTypes, 'bedbugs', 'bed bugs') ||
        false,
      'insect-Spiders-1': bi.pestSpiders || arrayIncludes(insectTypes, 'spiders') || false,
      'insect-Mosquitos-1': bi.pestMosquitos || arrayIncludes(insectTypes, 'mosquitos', 'mosquitoes') || false,
      'insect-Roaches-1': bi.pestCockroaches || arrayIncludes(insectTypes, 'roaches', 'cockroaches') || false,
      'insect-Wasps-1': bi.pestWasps || arrayIncludes(insectTypes, 'wasps') || false,
      'insect-Termites-1': bi.pestTermites || arrayIncludes(insectTypes, 'termites') || false,
      'insect-Bees-1': bi.pestBees || arrayIncludes(insectTypes, 'bees') || false,
      'insect-Flies-1': bi.pestFlies || arrayIncludes(insectTypes, 'flies') || false,
      'insect-Hornets-1': bi.pestHornets || arrayIncludes(insectTypes, 'hornets') || false,

      // ===== ELECTRICAL ISSUES =====
      // Supports BOTH boolean format AND array format (electricalTypes: ["Outlets"])
      'electrical-Outlets-1': bi.electricalBrokenOutlets || bi.electricalSparkingOutlets || bi.electricalInsufficientOutlets || arrayIncludes(electricalTypes, 'outlets') || false,
      'electrical-WallSwitches-1': bi.electricalBrokenSwitches || arrayIncludes(electricalTypes, 'wall switches', 'switches') || false,
      'electrical-InteriorLighting-1': bi.electricalFlickeringLights || bi.electricalNoPower || arrayIncludes(electricalTypes, 'interior lighting', 'lighting') || false,
      'electrical-Fans-1': bi.electricalBrokenFans || arrayIncludes(electricalTypes, 'fans') || false,
      'electrical-ExteriorLighting-1': bi.electricalExteriorLighting || arrayIncludes(electricalTypes, 'exterior lighting') || false,
      'electrical-LightFixtures-1': bi.electricalBrokenLightFixtures || arrayIncludes(electricalTypes, 'light fixtures', 'fixtures') || false,
      'electrical-Panel-1': bi.electricalCircuitBreakerIssues || bi.electricalPartialOutages || bi.electricalExposedWiring || arrayIncludes(electricalTypes, 'panel') || false,

      // ===== HVAC ISSUES =====
      // Supports BOTH boolean format AND array format (hvacTypes: ["Heater", "Air Conditioner"])
      'hvac-AirConditioner-1': bi.hvacNoAirConditioning || bi.hvacInadequateCooling || arrayIncludes(hvacTypes, 'air conditioner', 'ac', 'cooling') || false,
      'hvac-Heater-1': bi.hvacNoHeat || bi.hvacInadequateHeat || arrayIncludes(hvacTypes, 'heater', 'heat') || false,
      'hvac-Ventilation-1': bi.hvacVentilationPoor || arrayIncludes(hvacTypes, 'ventilation') || false,

      // ===== HEALTH HAZARD ISSUES (10 items) =====
      // Supports BOTH boolean format AND array format (healthHazardTypes: ["Mold", "Mildew"])
      'health-hazard-Mold-1': bi.healthHazardMold || arrayIncludes(healthHazardTypes, 'mold') || false,
      'health-hazard-Mildew-1': bi.healthHazardMildew || arrayIncludes(healthHazardTypes, 'mildew') || false,
      'health-hazard-LeadPaint-1': bi.healthHazardLeadPaint || arrayIncludes(healthHazardTypes, 'lead paint', 'lead') || false,
      'health-hazard-Asbestos-1': bi.healthHazardAsbestos || arrayIncludes(healthHazardTypes, 'asbestos') || false,
      'health-hazard-SewageBackup-1': bi.healthHazardSewageBackup || bi.plumbingSewerBackup || arrayIncludes(healthHazardTypes, 'sewage', 'sewer') || false,
      'health-hazard-WaterDamage-1': bi.healthHazardWaterDamage || arrayIncludes(healthHazardTypes, 'water damage') || false,
      'health-hazard-Flooding-1': bi.healthHazardFlooding || arrayIncludes(healthHazardTypes, 'flooding') || false,
      'health-hazard-GasLeak-1': bi.healthHazardGasLeak || bi.hvacGasSmell || arrayIncludes(healthHazardTypes, 'gas leak', 'gas') || false,
      'health-hazard-CarbonMonoxide-1': bi.healthHazardCarbonMonoxide || arrayIncludes(healthHazardTypes, 'carbon monoxide') || false,
      'health-hazard-AirQuality-1': bi.healthHazardAirQuality || arrayIncludes(healthHazardTypes, 'air quality') || false,
      // UI uses label-based IDs - add mappings for all UI checkboxes
      'health-hazard-Mushrooms-1': bi.healthHazardMushrooms || arrayIncludes(healthHazardTypes, 'mushrooms') || false,
      'health-hazard-Noxiousfumes-1': bi.healthHazardNoxiousfumes || arrayIncludes(healthHazardTypes, 'noxious fumes', 'fumes') || false,
      'health-hazard-Toxicwaterpollution-1': bi.healthHazardToxicwaterpollution || arrayIncludes(healthHazardTypes, 'toxic water', 'water pollution') || false,
      'health-hazard-Rawsewageonexterior-1': bi.healthHazardRawsewageonexterior || arrayIncludes(healthHazardTypes, 'raw sewage', 'sewage on exterior') || false,
      'health-hazard-Chemicalpaintcontamination-1': bi.healthHazardChemicalpaintcontamination || arrayIncludes(healthHazardTypes, 'chemical', 'paint contamination') || false,
      'health-hazard-Offensiveodors-1': bi.healthHazardOffensiveodors || arrayIncludes(healthHazardTypes, 'offensive odors', 'odors') || false,

      // ===== STRUCTURAL ISSUES (15 items) =====
      // Supports BOTH boolean format AND array format (structuralTypes: ["Water stains on ceiling"])
      // Also supports stored field names like structuralCeilingDamage, structuralWallCracks, etc.
      'structure-Bumpsinceiling-1': bi.structuralCeilingDamage || bi.structuralBumpsinceiling || arrayIncludes(structuralTypes, 'bumps in ceiling', 'ceiling bumps') || false,
      'structure-Holeinceiling-1': bi.structuralCeilingDamage || bi.structuralHoleinceiling || arrayIncludes(structuralTypes, 'hole in ceiling', 'ceiling hole') || false,
      'structure-Waterstainsonceiling-1': bi.structuralCeilingDamage || bi.structuralWaterstainsonceiling || arrayIncludes(structuralTypes, 'water stains on ceiling', 'ceiling stains') || false,
      'structure-Waterstainsonwall-1': bi.structuralWallCracks || bi.structuralWaterstainsonwall || arrayIncludes(structuralTypes, 'water stains on wall', 'wall stains') || false,
      'structure-Holeinwall-1': bi.structuralWallCracks || bi.structuralHoleinwall || arrayIncludes(structuralTypes, 'hole in wall', 'wall hole') || false,
      'structure-Paint-1': bi.structuralPaint || bi.structuralOther || arrayIncludes(structuralTypes, 'paint') || false,
      'structure-Exteriordeckporch-1': bi.structuralBalconyUnsafe || bi.structuralExteriordeckporch || arrayIncludes(structuralTypes, 'deck', 'porch', 'exterior') || false,
      'structure-Waterprooftoilet-1': bi.structuralWaterprooftoilet || bi.plumbingLeaks || arrayIncludes(structuralTypes, 'waterproof toilet') || false,
      'structure-Waterprooftub-1': bi.structuralWaterprooftub || bi.plumbingLeaks || arrayIncludes(structuralTypes, 'waterproof tub') || false,
      'structure-Staircase-1': bi.structuralStairsUnsafe || bi.structuralStaircase || arrayIncludes(structuralTypes, 'staircase', 'stairs') || false,
      'structure-Basementflood-1': bi.structuralBasementflood || bi.commonAreaBasementFlooded || arrayIncludes(structuralTypes, 'basement flood', 'basement') || false,
      'structure-Leaksingarage-1': bi.structuralRoofLeaks || bi.structuralLeaksingarage || arrayIncludes(structuralTypes, 'leaks in garage', 'garage leaks', 'garage') || false,
      'structure-SoftSpotsduetoLeaks-1': bi.structuralFloorDamage || bi.structuralSoftSpotsduetoLeaks || arrayIncludes(structuralTypes, 'soft spots') || false,
      'structure-UneffectiveWaterproofingofthetubsortoilet-1': bi.structuralUneffectiveWaterproofingofthetubsortoilet || arrayIncludes(structuralTypes, 'waterproofing', 'tubs') || false,
      'structure-IneffectiveWeatherproofingofanywindows-1': bi.structuralWindowDamage || bi.structuralIneffectiveWeatherproofingofanywindows || arrayIncludes(structuralTypes, 'weatherproofing') || false,

      // ===== APPLIANCE ISSUES (7 items) =====
      // Supports BOTH boolean format AND array format (applianceTypes: ["Stove", "Refrigerator"])
      // Field names use "Broken" suffix in storage (applianceRefrigeratorBroken, etc.)
      'appliances-Refrigerator-1': bi.applianceRefrigeratorBroken || bi.applianceRefrigerator || arrayIncludes(applianceTypes, 'refrigerator', 'fridge') || false,
      'appliances-Stove-1': bi.applianceStoveBroken || bi.applianceStove || arrayIncludes(applianceTypes, 'stove') || false,
      'appliances-Oven-1': bi.applianceOvenBroken || bi.applianceOven || arrayIncludes(applianceTypes, 'oven') || false,
      'appliances-Dishwasher-1': bi.applianceDishwasherBroken || bi.applianceDishwasher || arrayIncludes(applianceTypes, 'dishwasher') || false,
      'appliances-Garbagedisposal-1': bi.applianceGarbageDisposalBroken || bi.applianceGarbagedisposal || arrayIncludes(applianceTypes, 'garbage disposal', 'disposal') || false,
      'appliances-Microwave-1': bi.applianceOther || bi.applianceMicrowave || arrayIncludes(applianceTypes, 'microwave') || false,
      'appliances-Washerdryer-1': bi.applianceWasherBroken || bi.applianceDryerBroken || bi.applianceWasherdryer || arrayIncludes(applianceTypes, 'washer', 'dryer') || false,

      // ===== FLOORING ISSUES (7 items) =====
      // Supports BOTH boolean format AND array format (flooringTypes: ["Carpet", "Tiles"])
      'flooring-Carpet-1': bi.flooringCarpetDamaged || bi.flooringDamaged || arrayIncludes(flooringTypes, 'carpet') || false,
      'flooring-Tiles-1': bi.flooringTileBroken || arrayIncludes(flooringTypes, 'tile', 'tiles') || false,
      'flooring-Hardwood-1': bi.flooringHardwoodDamaged || arrayIncludes(flooringTypes, 'hardwood') || false,
      'flooring-Linoleum-1': bi.flooringLinoleumDamaged || arrayIncludes(flooringTypes, 'linoleum') || false,
      'flooring-Uneven-1': bi.flooringUneven || arrayIncludes(flooringTypes, 'uneven') || false,
      'flooring-Nailsstickingout-1': bi.flooringNailsstickingout || arrayIncludes(flooringTypes, 'nails', 'nails sticking out') || false,
      'flooring-Damage-1': bi.flooringDamaged || arrayIncludes(flooringTypes, 'damage', 'damaged') || false,
      'flooring-Subfloor-1': bi.flooringSubfloorDamaged || arrayIncludes(flooringTypes, 'subfloor') || false,

      // ===== CABINET ISSUES (3 items) =====
      // Supports BOTH boolean format AND array format (cabinetTypes: ["Broken", "Hinges", "Alignment"])
      'cabinets-Broken-1': bi.cabinetBroken || arrayIncludes(cabinetTypes, 'broken') || false,
      'cabinets-Hinges-1': bi.cabinetHinges || arrayIncludes(cabinetTypes, 'hinges') || false,
      'cabinets-Alignment-1': bi.cabinetAlignment || arrayIncludes(cabinetTypes, 'alignment') || false,

      // ===== DOOR ISSUES (5 items) =====
      // Supports BOTH boolean format AND array format (doorTypes: ["Broken", "Locks"])
      'door-Entry-1': bi.doorEntryDamaged || bi.doorBroken || arrayIncludes(doorTypes, 'entry', 'front door') || false,
      'door-Interior-1': bi.doorInteriorDamaged || bi.doorDamaged || arrayIncludes(doorTypes, 'interior') || false,
      'door-Locks-1': bi.doorNoLock || bi.securityBrokenLocks || arrayIncludes(doorTypes, 'locks', 'lock') || false,
      'door-Frames-1': bi.doorFramesDamaged || arrayIncludes(doorTypes, 'frames', 'hinges') || false,
      'door-Threshold-1': bi.doorThresholdDamaged || arrayIncludes(doorTypes, 'threshold', 'close properly') || false,
      // Additional door mappings from intake form
      'door-Broken-1': bi.doorBroken || arrayIncludes(doorTypes, 'broken') || false,
      'door-Brokenhinges-1': bi.doorDamaged || arrayIncludes(doorTypes, 'broken hinges', 'hinges') || false,
      'door-Donotcloseproperly-1': bi.doorWontClose || arrayIncludes(doorTypes, 'do not close', 'close properly') || false,
      'door-Waterintrusionandorinsects-1': bi.doorWaterIntrusion || arrayIncludes(doorTypes, 'water intrusion', 'insects') || false,
      'door-Knobs-1': bi.doorKnobs || arrayIncludes(doorTypes, 'knobs') || false,
      'door-Slidingglassdoors-1': bi.doorSlidingGlass || arrayIncludes(doorTypes, 'sliding glass', 'sliding') || false,
      'door-Ineffectivewaterproofing-1': bi.doorWaterproofing || arrayIncludes(doorTypes, 'waterproofing', 'ineffective waterproofing') || false,

      // ===== WINDOW ISSUES (6 items) =====
      // Supports BOTH boolean format AND array format (windowTypes: ["Broken", "Leaks", "Do not lock"])
      // Also supports alternative field names from IntakeFormExpanded (windowMissing, windowNoScreens, etc.)
      'windows-Broken-1': bi.windowBroken || arrayIncludes(windowTypes, 'broken') || false,
      'windows-Leaks-1': bi.windowLeaks || bi.windowDrafty || arrayIncludes(windowTypes, 'leaks') || false,
      'windows-Missingwindows-1': bi.windowMissingwindows || bi.windowMissing || arrayIncludes(windowTypes, 'missing') || false,
      'windows-Screens-1': bi.windowScreens || bi.windowNoScreens || arrayIncludes(windowTypes, 'screens') || false,
      'windows-Donotlock-1': bi.windowDonotlock || bi.windowWontOpen || arrayIncludes(windowTypes, 'do not lock', 'lock') || false,
      'windows-Brokenormissingscreens-1': bi.windowBrokenormissingscreens || bi.windowNoScreens || arrayIncludes(windowTypes, 'broken or missing screens', 'missing screens') || false,

      // ===== FIRE HAZARD ISSUES (5 items) =====
      // Supports BOTH boolean format AND array format (fireHazardTypes: ["Smoke Alarms", "Carbon monoxide detectors"])
      'fire-hazard-SmokeDetectors-1': bi.fireHazardNoSmokeDetectors || bi.fireHazardBrokenSmokeDetectors || bi.securityNoSmokeDetector || arrayIncludes(fireHazardTypes, 'smoke alarms', 'smoke detectors') || false,
      'fire-hazard-CarbonMonoxideDetector-1': bi.hvacCarbonMonoxideDetectorMissing || arrayIncludes(fireHazardTypes, 'carbon monoxide') || false,
      'fire-hazard-FireExtinguisher-1': bi.fireHazardNoFireExtinguisher || arrayIncludes(fireHazardTypes, 'fire extinguisher') || false,
      'fire-hazard-EmergencyExits-1': bi.fireHazardBlockedExits || arrayIncludes(fireHazardTypes, 'emergency exits', 'exit') || false,
      'fire-hazard-Uneffective-1': bi.fireHazardIneffective || arrayIncludes(fireHazardTypes, 'non-compliant', 'non compliant') || false,
      // Additional fire hazard mappings from doc-gen form
      'fire-hazard-SmokeAlarms-1': bi.fireHazardNoSmokeDetectors || bi.fireHazardBrokenSmokeDetectors || arrayIncludes(fireHazardTypes, 'smoke alarms') || false,
      'fire-hazard-Noncompliantelectricity-1': bi.fireHazardExposedWiring || arrayIncludes(fireHazardTypes, 'non-compliant electricity', 'wiring') || false,
      'fire-hazard-Carbonmonoxidedetectors-1': bi.hvacCarbonMonoxideDetectorMissing || arrayIncludes(fireHazardTypes, 'carbon monoxide detectors') || false,
      'fire-hazard-FireExtinguisher-1': bi.fireHazardNoFireExtinguisher || arrayIncludes(fireHazardTypes, 'fire extinguisher') || false,
      'fire-hazard-NonGFIoutletsnearwater-1': bi.fireHazardIneffective || arrayIncludes(fireHazardTypes, 'non-gfi', 'gfi outlets') || false,

      // ===== GOVERNMENT ENTITIES CONTACTED (7 items) =====
      // Field names must match index.html generateIssueCategories() exactly (line 5275)
      // HTML items: ['Health Department', 'Police Department', 'Housing Authority',
      //              'Department of Environmental Health', 'Code Enforcement',
      //              'Department of Health Services', 'Fire Department']
      // After .replace(/[^a-zA-Z0-9]/g, ''): HealthDepartment, PoliceDepartment, HousingAuthority,
      //                                      DepartmentofEnvironmentalHealth, CodeEnforcement,
      //                                      DepartmentofHealthServices, FireDepartment
      // ===== GOVERNMENT ENTITY ISSUES =====
      // Supports BOTH boolean format AND array format (governmentTypes: ["Health Department", "Code Enforcement"])
      // Also supports abbreviated field names from IntakeFormExpanded (govEntityHPD, govEntityDOB, etc.)
      'government-HealthDepartment-1': bi.govEntityHealthDepartment || bi.govEntityDHS || arrayIncludes(governmentTypes, 'health department') || false,
      'government-PoliceDepartment-1': bi.govEntityPoliceDepartment || bi.govEntity311 || arrayIncludes(governmentTypes, 'police department', 'police') || false,
      'government-HousingAuthority-1': bi.govEntityHousingAuthority || bi.govEntityHPD || arrayIncludes(governmentTypes, 'housing authority') || false,
      'government-DepartmentofEnvironmentalHealth-1': bi.govEntityDepartmentofEnvironmentalHealth || bi.govEntityDHS || arrayIncludes(governmentTypes, 'environmental health', 'department of environmental') || false,
      'government-CodeEnforcement-1': bi.govEntityCodeEnforcement || bi.govEntityDOB || arrayIncludes(governmentTypes, 'code enforcement') || false,
      'government-DepartmentofHealthServices-1': bi.govEntityDepartmentofHealthServices || bi.govEntityDHS || arrayIncludes(governmentTypes, 'health services', 'department of health') || false,
      'government-FireDepartment-1': bi.govEntityFireDepartment || bi.govEntityOther || arrayIncludes(governmentTypes, 'fire department', 'fire') || false,

      // ===== NUISANCE ISSUES (8 items) =====
      // Supports BOTH boolean format AND array format (nuisanceTypes: ["Noisy neighbors", "Drugs"])
      'nuisance-Noise-1': bi.nuisanceNoise || arrayIncludes(nuisanceTypes, 'noisy neighbors', 'noise') || false,
      'nuisance-Odors-1': bi.nuisanceSmell || arrayIncludes(nuisanceTypes, 'odors', 'smell') || false,
      'nuisance-Pests-1': bi.nuisancePests || arrayIncludes(nuisanceTypes, 'pests') || false,
      'nuisance-Vibrations-1': bi.nuisanceVibrations || arrayIncludes(nuisanceTypes, 'vibrations') || false,
      'nuisance-Smoke-1': bi.nuisanceSmoke || arrayIncludes(nuisanceTypes, 'smoke', 'smoking') || false,
      'nuisance-Light-1': bi.nuisanceLight || arrayIncludes(nuisanceTypes, 'light') || false,
      'nuisance-Privacy-1': bi.nuisancePrivacy || arrayIncludes(nuisanceTypes, 'privacy') || false,
      'nuisance-Access-1': bi.nuisanceAccess || arrayIncludes(nuisanceTypes, 'access') || false,
      // Additional nuisance mappings from doc-gen form
      'nuisance-Drugs-1': bi.nuisanceOther || arrayIncludes(nuisanceTypes, 'drugs') || false,
      'nuisance-Smoking-1': bi.nuisanceSmoke || arrayIncludes(nuisanceTypes, 'smoking') || false,
      'nuisance-Noisyneighbors-1': bi.nuisanceNoise || arrayIncludes(nuisanceTypes, 'noisy neighbors') || false,
      'nuisance-Gangs-1': bi.nuisanceOther || arrayIncludes(nuisanceTypes, 'gangs') || false,

      // ===== TRASH ISSUES (5 items) =====
      // Supports BOTH boolean format AND array format (trashTypes: ["Collection", "Bins", "Overflowing"])
      'trash-Collection-1': bi.trashNotCollected || bi.commonAreaGarbageNotCollected || arrayIncludes(trashTypes, 'collection') || false,
      'trash-Bins-1': bi.trashBinsBroken || arrayIncludes(trashTypes, 'bins') || false,
      'trash-Disposal-1': bi.trashDisposalBroken || arrayIncludes(trashTypes, 'disposal') || false,
      'trash-Overflowing-1': bi.trashOverflowing || arrayIncludes(trashTypes, 'overflowing') || false,
      'trash-Pests-1': bi.trashPests || arrayIncludes(trashTypes, 'pests') || false,
      // Additional trash mappings from doc-gen form
      'trash-Inadequatenumberofreceptacles-1': bi.trashOverflowing || arrayIncludes(trashTypes, 'inadequate', 'receptacles') || false,
      'trash-Improperservicingemptying-1': bi.trashNotCollected || arrayIncludes(trashTypes, 'improper', 'servicing', 'emptying') || false,

      // ===== COMMON AREA ISSUES (9 items) =====
      // Supports BOTH boolean format AND array format (commonAreaTypes: ["Mailbox broken", "Elevator"])
      'common-areas-Hallways-1': bi.commonAreaHallwayDirty || arrayIncludes(commonAreaTypes, 'hallway') || false,
      'common-areas-Stairwells-1': bi.commonAreaStairsDamaged || arrayIncludes(commonAreaTypes, 'stairwell', 'stairs') || false,
      'common-areas-Elevators-1': bi.commonAreaElevatorBroken || arrayIncludes(commonAreaTypes, 'elevator') || false,
      'common-areas-Laundry-1': bi.commonAreaLaundryBroken || arrayIncludes(commonAreaTypes, 'laundry') || false,
      'common-areas-Parking-1': bi.commonAreaParkingIssue || arrayIncludes(commonAreaTypes, 'parking') || false,
      'common-areas-Mailboxes-1': bi.commonAreaMailboxBroken || arrayIncludes(commonAreaTypes, 'mailbox') || false,
      'common-areas-Lighting-1': bi.commonAreaLightingBroken || arrayIncludes(commonAreaTypes, 'lighting') || false,
      'common-areas-Cleanliness-1': bi.commonAreaDirty || arrayIncludes(commonAreaTypes, 'filth', 'rubbish', 'garbage') || false,
      'common-areas-Security-1': bi.commonAreaNoSecurity || bi.commonAreaDoorsUnlocked || arrayIncludes(commonAreaTypes, 'security', 'gate') || false,
      // Additional common area mappings from doc-gen form
      'common-areas-Mailboxbroken-1': bi.commonAreaMailboxBroken || arrayIncludes(commonAreaTypes, 'mailbox broken') || false,
      'common-areas-Elevator-1': bi.commonAreaElevatorBroken || arrayIncludes(commonAreaTypes, 'elevator') || false,
      'common-areas-Laundryroom-1': bi.commonAreaLaundryBroken || arrayIncludes(commonAreaTypes, 'laundry room') || false,
      'common-areas-FilthRubbishGarbage-1': bi.commonAreaDirty || bi.commonAreaGarbageNotCollected || arrayIncludes(commonAreaTypes, 'filth', 'rubbish', 'garbage') || false,
      'common-areas-Swimmingpool-1': bi.commonAreaSwimmingpool || bi.commonAreaOther || arrayIncludes(commonAreaTypes, 'swimming pool', 'pool') || false,
      'common-areas-Gym-1': bi.commonAreaGym || bi.commonAreaOther || arrayIncludes(commonAreaTypes, 'gym') || false,
      'common-areas-Jacuzzi-1': bi.commonAreaJacuzzi || bi.commonAreaOther || arrayIncludes(commonAreaTypes, 'jacuzzi') || false,
      'common-areas-Recreationroom-1': bi.commonAreaRecreationroom || bi.commonAreaOther || arrayIncludes(commonAreaTypes, 'recreation room', 'recreation') || false,
      'common-areas-BrokenGate-1': bi.commonAreaBrokenGate || bi.securityBrokenGate || arrayIncludes(commonAreaTypes, 'broken gate', 'gate') || false,
      'common-areas-Parkingareaissues-1': bi.commonAreaParkingIssue || arrayIncludes(commonAreaTypes, 'parking area issues', 'parking') || false,
      'common-areas-Damagetocars-1': bi.commonAreaDamagetocars || bi.commonAreaParkingIssue || arrayIncludes(commonAreaTypes, 'damage to cars') || false,
      'common-areas-Flooding-1': bi.commonAreaBasementFlooded || arrayIncludes(commonAreaTypes, 'flooding') || false,
      'common-areas-Entrancesblocked-1': bi.commonAreaEntrancesblocked || bi.commonAreaDoorsUnlocked || arrayIncludes(commonAreaTypes, 'entrances blocked') || false,
      'common-areas-Blockedareasdoors-1': bi.commonAreaBlockedareasdoors || bi.commonAreaDoorsUnlocked || arrayIncludes(commonAreaTypes, 'blocked areas', 'blocked doors') || false,
      'common-areas-Vermin-1': bi.commonAreaVermin || bi.hasPestIssues || arrayIncludes(commonAreaTypes, 'vermin') || false,
      'common-areas-Insects-1': bi.commonAreaInsects || bi.hasInsectIssues || arrayIncludes(commonAreaTypes, 'insects') || false,

      // ===== NOTICE ISSUES (6 items) =====
      // Supports BOTH boolean format AND array format (noticeTypes: ["3-day", "30-day", "To quit"])
      // Field names must match index.html generateIssueCategories() exactly (line 5341)
      // Also supports stored field names like noticeEviction, noticeLeaseTerm, noticeEntry, noticeRepair
      'notices-3day-1': bi.noticeEviction || bi.notice3day || arrayIncludes(noticeTypes, '3-day', '3 day') || false,
      'notices-24hour-1': bi.noticeEntry || bi.notice24hour || arrayIncludes(noticeTypes, '24-hour', '24 hour') || false,
      'notices-30day-1': bi.noticeLeaseTerm || bi.notice30day || arrayIncludes(noticeTypes, '30-day', '30 day') || false,
      'notices-60day-1': bi.noticeLeaseTerm || bi.notice60day || arrayIncludes(noticeTypes, '60-day', '60 day') || false,
      'notices-Toquit-1': bi.noticeEviction || bi.noticeToquit || arrayIncludes(noticeTypes, 'to quit') || false,
      'notices-Performorquit-1': bi.noticeRepair || bi.noticePerformorquit || arrayIncludes(noticeTypes, 'perform or quit') || false,

      // ===== UTILITY ISSUES (7 items) =====
      // Supports BOTH boolean format AND array format (utilityTypes: ["Water", "Gas", "Electric"])
      'utility-Water-1': bi.utilityNoHotWater || bi.plumbingNoWater || arrayIncludes(utilityTypes, 'water') || false,
      'utility-Gas-1': bi.utilityNoGas || arrayIncludes(utilityTypes, 'gas') || false,
      'utility-Electric-1': bi.utilityNoElectricity || bi.electricalNoPower || arrayIncludes(utilityTypes, 'electric') || false,
      'utility-Trash-1': bi.utilityTrashIssue || arrayIncludes(utilityTypes, 'trash') || false,
      'utility-Sewer-1': bi.utilitySewer || arrayIncludes(utilityTypes, 'sewer') || false,
      'utility-Internet-1': bi.utilityInternet || arrayIncludes(utilityTypes, 'internet') || false,
      'utility-Billing-1': bi.utilityBillingIssue || arrayIncludes(utilityTypes, 'billing') || false,
      // Additional utility mappings for doc-gen form field names
      'utility-Gasleak-1': bi.utilityGasleak || bi.healthHazardGasLeak || arrayIncludes(utilityTypes, 'gas leak') || false,
      'utility-Gasshutoff-1': bi.utilityNoGas || arrayIncludes(utilityTypes, 'gas shutoff', 'shutoff') || false,
      'utility-Electricityshutoffs-1': bi.utilityNoElectricity || arrayIncludes(utilityTypes, 'electricity shutoff', 'shutoff') || false,
      'utility-Watershutoffs-1': bi.plumbingNoWater || arrayIncludes(utilityTypes, 'water shutoff', 'shutoff') || false,
      'utility-Heatshutoff-1': bi.hvacNoHeat || arrayIncludes(utilityTypes, 'heat shutoff', 'shutoff') || false,

      // ===== SAFETY ISSUES (8 items) =====
      // Supports BOTH boolean format AND array format (safetyTypes: ["Railings", "Lighting", "Locks"])
      'safety-Railings-1': bi.structuralRailingMissing || bi.safetyRailings || arrayIncludes(safetyTypes, 'railings') || false,
      'safety-Lighting-1': bi.securityInadequateLighting || bi.safetyLighting || arrayIncludes(safetyTypes, 'lighting') || false,
      'safety-Locks-1': bi.securityBrokenLocks || bi.doorNoLock || arrayIncludes(safetyTypes, 'locks') || false,
      'safety-Security-1': bi.securityNoSecurity || bi.safetySecurity || arrayIncludes(safetyTypes, 'security') || false,
      'safety-Cameras-1': bi.securityNoCameras || bi.safetyCameras || arrayIncludes(safetyTypes, 'cameras') || false,
      'safety-Gates-1': bi.securityBrokenGate || bi.safetyGates || arrayIncludes(safetyTypes, 'gates') || false,
      'safety-Fencing-1': bi.safetyFencing || arrayIncludes(safetyTypes, 'fencing') || false,
      'safety-Pool-1': bi.safetyPoolUnsafe || arrayIncludes(safetyTypes, 'pool') || false,
      // Additional safety mappings for doc-gen form field names
      'safety-Brokeninoperablesecuritygate-1': bi.securityBrokenGate || arrayIncludes(safetyTypes, 'security gate', 'gate', 'broken') || false,
      'safety-Unauthorizedentries-1': bi.hasUnauthorizedIssues || arrayIncludes(safetyTypes, 'unauthorized') || false,
      'safety-Securitycameras-1': bi.safetySecuritycameras || bi.securityNoCameras || arrayIncludes(safetyTypes, 'security cameras', 'cameras') || false,
      'safety-Brokendoors-1': bi.doorBroken || arrayIncludes(safetyTypes, 'broken doors', 'doors') || false,
      'safety-Brokenbuzzertogetin-1': bi.safetyBrokenbuzzertogetin || bi.commonAreaIntercomBroken || arrayIncludes(safetyTypes, 'buzzer') || false,
      'safety-Inoperablelocks-1': bi.securityBrokenLocks || arrayIncludes(safetyTypes, 'inoperable locks', 'locks') || false,

      // ===== HARASSMENT ISSUES (7 items) =====
      // Supports BOTH boolean format AND array format (harassmentTypes: ["Eviction threats", "Aggressive/inappropriate language"])
      // Also supports stored field names like harassmentByOwner, harassmentByDefendant, etc.
      'harassment-Verbal-1': bi.harassmentAggressiveLanguage || bi.harassmentVerbalAbuse || arrayIncludes(harassmentTypes, 'verbal', 'aggressive', 'inappropriate language') || false,
      'harassment-Physical-1': bi.harassmentPhysicalThreats || arrayIncludes(harassmentTypes, 'physical') || false,
      'harassment-Sexual-1': bi.harassmentSexual || arrayIncludes(harassmentTypes, 'sexual') || false,
      'harassment-Discrimination-1': bi.harassmentSinglingOut || bi.harassmentDiscrimination || arrayIncludes(harassmentTypes, 'discrimination') || false,
      'harassment-Retaliation-1': bi.harassmentRetaliation || arrayIncludes(harassmentTypes, 'retaliation') || false,
      'harassment-Intimidation-1': bi.harassmentIntimidation || arrayIncludes(harassmentTypes, 'intimidation') || false,
      'harassment-Threats-1': bi.harassmentEvictionThreats || bi.harassmentPhysicalThreats || bi.harassmentWrittenThreats || arrayIncludes(harassmentTypes, 'threats', 'eviction') || false,
      // Additional harassment mappings from doc-gen form - check stored boolean fields
      'harassment-UnlawfulDetainer-1': bi.harassmentUnlawfulDetainer || arrayIncludes(harassmentTypes, 'unlawful detainer') || false,
      'harassment-Evictionthreats-1': bi.harassmentEvictionThreats || arrayIncludes(harassmentTypes, 'eviction threats') || false,
      'harassment-Bydefendant-1': bi.harassmentByDefendant || arrayIncludes(harassmentTypes, 'by defendant') || false,
      'harassment-Bymaintenancemanworkers-1': bi.harassmentByMaintenance || arrayIncludes(harassmentTypes, 'maintenance man', 'workers') || false,
      'harassment-Bymanagerbuildingstaff-1': bi.harassmentByManager || arrayIncludes(harassmentTypes, 'manager', 'building staff') || false,
      'harassment-Byowner-1': bi.harassmentByOwner || arrayIncludes(harassmentTypes, 'by owner') || false,
      'harassment-Othertenants-1': bi.harassmentByOtherTenants || arrayIncludes(harassmentTypes, 'other tenants') || false,
      'harassment-Illegitimatenotices-1': bi.harassmentIllegitimateNotices || arrayIncludes(harassmentTypes, 'illegitimate notices') || false,
      'harassment-Refusaltomaketimelyrepairs-1': bi.harassmentRefusalToRepair || arrayIncludes(harassmentTypes, 'refusal to make timely repairs', 'timely repairs') || false,
      'harassment-Writtenthreats-1': bi.harassmentWrittenThreats || arrayIncludes(harassmentTypes, 'written threats') || false,
      'harassment-Aggressiveinappropriatelanguage-1': bi.harassmentAggressiveLanguage || arrayIncludes(harassmentTypes, 'aggressive', 'inappropriate language') || false,
      'harassment-Physicalthreatsortouching-1': bi.harassmentPhysicalThreats || arrayIncludes(harassmentTypes, 'physical threats', 'touching') || false,
      'harassment-Noticessinglingoutonetenantbutnotuniformlygiventoalltenants-1': bi.harassmentSinglingOut || arrayIncludes(harassmentTypes, 'singling out') || false,
      'harassment-Duplicativenotices-1': bi.harassmentDuplicativeNotices || arrayIncludes(harassmentTypes, 'duplicative notices') || false,
      'harassment-UntimelyResponsefromLandlord-1': bi.harassmentUntimelyResponse || arrayIncludes(harassmentTypes, 'untimely response') || false,

      // ===== MASTER CHECKBOX ONLY CATEGORIES (9 items) =====
      // These categories only have a yes/no toggle, no individual checkboxes
      // Field names match index.html line 5414: direct-{categoryname}-{plaintiffId}
      // Category names are converted by .replace(/[^a-zA-Z0-9]/g, '').toLowerCase()
      'direct-injuryissues-1': intake.building_issues?.hasInjuryIssues || false,
      'direct-nonresponsivelandlordissues-1': intake.building_issues?.hasNonresponsiveIssues || false,
      'direct-unauthorizedentries-1': intake.building_issues?.hasUnauthorizedIssues || false,
      'direct-stolenitems-1': intake.building_issues?.hasStolenIssues || false,
      'direct-disabilitydiscrimination-1': intake.building_issues?.hasDisabilityDiscrimination || false,
      'direct-damageditems-1': intake.building_issues?.hasDamagedIssues || false,
      'direct-agediscrimination-1': intake.building_issues?.hasAgeDiscrimination || false,
      'direct-racialdiscrimination-1': intake.building_issues?.hasRacialDiscrimination || false,
      'direct-securitydepositissues-1': intake.building_issues?.hasSecurityDepositIssues || false,

      // =======================================================================
      // HABITABILITY INTAKE FORM FIELDS (hab-* format)
      // =======================================================================
      // These are for the habitability intake form, NOT the doc-gen form
      // Keeping them for compatibility but they won't populate doc-gen
      // =======================================================================

      // ===== PEST ISSUES (hab-pest-*) =====
      'hab-pest-mice-rats': intake.building_issues?.pestRats || intake.building_issues?.pestMice || false,
      'hab-pest-cockroaches': intake.building_issues?.pestCockroaches || false,
      'hab-pest-bedbugs': intake.building_issues?.pestBedbugs || false,
      'hab-pest-ants': intake.building_issues?.pestAnts || false,
      'hab-pest-termites': intake.building_issues?.pestTermites || false,
      'hab-pest-bees-wasps': false, // Not in intake form
      'hab-pest-flies-mosquitos': false, // Not in intake form
      'hab-pest-pigeons-bats': false, // Not in intake form
      'hab-pest-spiders': false, // Not in intake form

      // ===== HEATING/AC ISSUES (hab-heating-ac-*) =====
      'hab-heating-ac-problems': intake.building_issues?.hasHvacIssues ||
        intake.building_issues?.hvacNoHeat ||
        intake.building_issues?.hvacInadequateHeat ||
        intake.building_issues?.hvacNoAirConditioning ||
        intake.building_issues?.hvacInadequateCooling ||
        intake.building_issues?.hvacBrokenThermostat ||
        intake.building_issues?.hvacVentilationPoor ||
        intake.building_issues?.hvacGasSmell ||
        intake.building_issues?.hvacCarbonMonoxideDetectorMissing || false,

      // ===== ELECTRICAL ISSUES (hab-electrical-*) =====
      'hab-electrical-issues': intake.building_issues?.hasElectricalIssues ||
        intake.building_issues?.electricalNoPower ||
        intake.building_issues?.electricalPartialOutages ||
        intake.building_issues?.electricalSparkingOutlets ||
        intake.building_issues?.electricalBrokenOutlets ||
        intake.building_issues?.electricalBrokenSwitches ||
        intake.building_issues?.electricalFlickeringLights ||
        intake.building_issues?.electricalCircuitBreakerIssues ||
        intake.building_issues?.electricalBurningSmell ||
        intake.building_issues?.securityInadequateLighting || false,

      // ===== PLUMBING ISSUES (hab-plumbing-*) =====
      'hab-plumbing-problems': intake.building_issues?.hasPlumbingIssues ||
        intake.building_issues?.plumbingLeaks ||
        intake.building_issues?.plumbingBurstPipes ||
        intake.building_issues?.plumbingLowPressure ||
        intake.building_issues?.plumbingNoHotWater ||
        intake.building_issues?.plumbingNoWater ||
        intake.building_issues?.plumbingSewerBackup ||
        intake.building_issues?.plumbingCloggedDrains ||
        intake.building_issues?.plumbingSinkNotWorking ||
        intake.building_issues?.plumbingToiletNotWorking ||
        intake.building_issues?.plumbingShowerNotWorking ||
        intake.building_issues?.plumbingWaterDiscoloration ||
        intake.building_issues?.plumbingWaterDamage ||
        intake.building_issues?.plumbingFlooding || false,

      // ===== STRUCTURAL ISSUES (hab-structure-*) =====
      'hab-structure-problems': intake.building_issues?.hasStructuralIssues ||
        intake.building_issues?.structuralWallCracks ||
        intake.building_issues?.structuralCeilingDamage ||
        intake.building_issues?.structuralRoofLeaks ||
        intake.building_issues?.structuralBalconyUnsafe ||
        intake.building_issues?.structuralStairsUnsafe ||
        intake.building_issues?.structuralRailingMissing ||
        intake.building_issues?.structuralWindowDamage ||
        intake.building_issues?.structuralDoorDamage || false,

      // ===== HEALTH HAZARDS (hab-hazard-*) =====
      'hab-hazard-mold': intake.building_issues?.healthHazardMold || false,
      'hab-hazard-noxious-fumes-sewer': intake.building_issues?.healthHazardChemicalSmell || false,
      'hab-hazard-chemicals-paints': intake.building_issues?.healthHazardContaminatedWater || false,
      'hab-hazard-blocks-movement': false, // Not in intake form

      // ===== WINDOW ISSUES (hab-windows-*) =====
      'hab-windows-issues': intake.building_issues?.hasWindowIssues ||
        intake.building_issues?.windowBroken ||
        intake.building_issues?.structuralWindowDamage ||
        intake.building_issues?.securityBrokenWindows || false,

      // ===== DOOR ISSUES (hab-doors-*) =====
      'hab-doors-issues': intake.building_issues?.hasDoorIssues ||
        intake.building_issues?.doorBroken ||
        intake.building_issues?.doorDamaged ||
        intake.building_issues?.doorNoLock ||
        intake.building_issues?.structuralDoorDamage ||
        intake.building_issues?.securityBrokenDoors ||
        intake.building_issues?.securityBrokenLocks ||
        intake.building_issues?.securityNoDeadbolt || false,

      // ===== FLOORING ISSUES (hab-flooring-*) =====
      'hab-flooring-issues': intake.building_issues?.hasFlooringIssues ||
        intake.building_issues?.flooringDamaged ||
        intake.building_issues?.flooringCarpetStained ||
        intake.building_issues?.flooringTileBroken ||
        intake.building_issues?.flooringWoodDamaged || false,

      // ===== APPLIANCE ISSUES (hab-appliance-*) =====
      'hab-appliance-problems': intake.building_issues?.hasApplianceIssues ||
        intake.building_issues?.applianceStoveBroken ||
        intake.building_issues?.applianceOvenBroken ||
        intake.building_issues?.applianceRefrigeratorBroken ||
        intake.building_issues?.applianceDishwasherBroken ||
        intake.building_issues?.applianceWasherBroken ||
        intake.building_issues?.applianceDryerBroken ||
        intake.building_issues?.applianceGarbageDisposalBroken ||
        intake.building_issues?.applianceOther || false,

      // ===== COMMON AREA ISSUES (hab-common-*) =====
      'hab-common-laundry': intake.building_issues?.commonAreaLaundryBroken || false,
      'hab-common-elevator': intake.building_issues?.commonAreaElevatorBroken || false,
      'hab-common-entrance-blocked': intake.building_issues?.commonAreaEntranceBlocked || false,
      'hab-common-flooding': intake.building_issues?.commonAreaFlooding || false,
      'hab-common-plumbing-leaks': intake.building_issues?.commonAreaPlumbingLeaks || false,
      'hab-common-security-gate': intake.building_issues?.commonAreaSecurityGate || false,
      'hab-common-inadequate-parking': intake.building_issues?.commonAreaParkingIssues || false,
      'hab-common-parking-not-enforced': intake.building_issues?.commonAreaParkingNotEnforced || false,
      'hab-common-gym': false, // Not in intake form
      'hab-common-pool-jacuzzi': false, // Not in intake form
      'hab-common-recreation': false, // Not in intake form
      'hab-common-parking': false, // Not in intake form
      'hab-common-mailbox': false, // Not in intake form

      // ===== NUISANCE ISSUES (hab-nuisances-*) =====
      'hab-nuisances-problems': intake.building_issues?.hasNuisanceIssues ||
        intake.building_issues?.nuisanceNoise ||
        intake.building_issues?.nuisanceSmell ||
        intake.building_issues?.nuisanceNeighborDispute ||
        intake.building_issues?.nuisanceLitterDebris || false,

      // ===== HARASSMENT (hab-harassed) =====
      'hab-harassed': intake.building_issues?.hasHarassmentIssues ||
        intake.building_issues?.harassmentEvictionThreats ||
        intake.building_issues?.harassmentVerbalAbuse ||
        intake.building_issues?.harassmentUnauthorizedEntry ||
        intake.building_issues?.harassmentDiscrimination ||
        intake.building_issues?.harassmentRetaliation ||
        intake.building_issues?.harassmentSexual || false,

      // =======================================================================
      // ISSUE DETAILS / NOTES / HISTORY FIELDS
      // =======================================================================
      // These text fields contain the narrative details from the intake form
      // =======================================================================

      // Vermin/Pest details
      'vermin-details': intake.building_issues?.verminDetails || '',
      'vermin-repair-history': intake.building_issues?.verminRepairHistory || '',
      'vermin-first-noticed': intake.building_issues?.verminFirstNoticed || '',
      'vermin-severity': intake.building_issues?.verminSeverity || '',
      'insect-details': intake.building_issues?.insectsDetails || '',
      'insect-repair-history': intake.building_issues?.insectsRepairHistory || '',
      'insect-first-noticed': intake.building_issues?.insectsFirstNoticed || '',
      'insect-severity': intake.building_issues?.insectsSeverity || '',

      // HVAC details
      'hvac-details': intake.building_issues?.hvacDetails || '',
      'hvac-repair-history': intake.building_issues?.hvacRepairHistory || '',
      'hvac-first-noticed': intake.building_issues?.hvacFirstNoticed || '',
      'hvac-severity': intake.building_issues?.hvacSeverity || '',

      // Electrical details
      'electrical-details': intake.building_issues?.electricalDetails || '',
      'electrical-repair-history': intake.building_issues?.electricalRepairHistory || '',
      'electrical-first-noticed': intake.building_issues?.electricalFirstNoticed || '',
      'electrical-severity': intake.building_issues?.electricalSeverity || '',

      // Plumbing details
      'plumbing-details': intake.building_issues?.plumbingDetails || '',
      'plumbing-repair-history': intake.building_issues?.plumbingRepairHistory || '',
      'plumbing-first-noticed': intake.building_issues?.plumbingFirstNoticed || '',
      'plumbing-severity': intake.building_issues?.plumbingSeverity || '',

      // Structure details
      'structure-details': intake.building_issues?.structuralDetails || '',
      'structure-repair-history': intake.building_issues?.structuralRepairHistory || '',
      'structure-first-noticed': intake.building_issues?.structuralFirstNoticed || '',
      'structure-severity': intake.building_issues?.structuralSeverity || '',

      // Health hazard details
      'health-hazard-details': intake.building_issues?.healthHazardDetails || '',
      'health-hazard-repair-history': intake.building_issues?.healthHazardRepairHistory || '',
      'health-hazard-first-noticed': intake.building_issues?.healthHazardFirstNoticed || '',
      'health-hazard-severity': intake.building_issues?.healthHazardSeverity || '',

      // Fire hazard details
      'fire-hazard-details': intake.building_issues?.fireHazardDetails || '',
      'fire-hazard-repair-history': intake.building_issues?.fireHazardRepairHistory || '',
      'fire-hazard-first-noticed': intake.building_issues?.fireHazardFirstNoticed || '',
      'fire-hazard-severity': intake.building_issues?.fireHazardSeverity || '',

      // Appliance details
      'appliance-details': intake.building_issues?.applianceDetails || '',
      'appliance-repair-history': intake.building_issues?.applianceRepairHistory || '',
      'appliance-first-noticed': intake.building_issues?.applianceFirstNoticed || '',
      'appliance-severity': intake.building_issues?.appliancesSeverity || '',

      // Door details
      'door-details': intake.building_issues?.doorDetails || '',
      'door-repair-history': intake.building_issues?.doorsRepairHistory || '',
      'door-first-noticed': intake.building_issues?.doorFirstNoticed || '',
      'door-severity': intake.building_issues?.doorsSeverity || '',

      // Window details
      'window-details': intake.building_issues?.windowDetails || '',
      'window-repair-history': intake.building_issues?.windowsRepairHistory || '',
      'window-first-noticed': intake.building_issues?.windowFirstNoticed || '',
      'window-severity': intake.building_issues?.windowsSeverity || '',

      // Cabinet details
      'cabinet-details': intake.building_issues?.cabinetDetails || '',
      'cabinet-repair-history': intake.building_issues?.cabinetsRepairHistory || '',
      'cabinet-first-noticed': intake.building_issues?.cabinetFirstNoticed || '',
      'cabinet-severity': intake.building_issues?.cabinetsSeverity || '',

      // Flooring details
      'flooring-details': intake.building_issues?.flooringDetails || '',
      'flooring-repair-history': intake.building_issues?.flooringRepairHistory || '',
      'flooring-first-noticed': intake.building_issues?.flooringFirstNoticed || '',
      'flooring-severity': intake.building_issues?.flooringSeverity || '',

      // Common area details
      'common-area-details': intake.building_issues?.commonAreaDetails || '',
      'common-area-repair-history': intake.building_issues?.commonAreasRepairHistory || '',
      'common-area-first-noticed': intake.building_issues?.commonAreaFirstNoticed || '',
      'common-area-severity': intake.building_issues?.commonAreasSeverity || '',

      // Nuisance details
      'nuisance-details': intake.building_issues?.nuisanceDetails || '',
      'nuisance-repair-history': intake.building_issues?.nuisanceRepairHistory || '',
      'nuisance-first-noticed': intake.building_issues?.nuisanceFirstNoticed || '',
      'nuisance-severity': intake.building_issues?.nuisanceSeverity || '',

      // Trash details
      'trash-details': intake.building_issues?.trashDetails || '',
      'trash-repair-history': intake.building_issues?.trashRepairHistory || '',
      'trash-first-noticed': intake.building_issues?.trashFirstNoticed || '',
      'trash-severity': intake.building_issues?.trashSeverity || '',

      // Notice details
      'notices-details': intake.building_issues?.noticeDetails || '',
      'notices-first-noticed': intake.building_issues?.noticesFirstNoticed || '',
      'notices-repair-history': intake.building_issues?.noticesRepairHistory || '',
      'notices-severity': intake.building_issues?.noticesSeverity || '',

      // Utility details
      'utility-details': intake.building_issues?.utilityDetails || '',
      'utility-repair-history': intake.building_issues?.utilityRepairHistory || '',
      'utility-first-noticed': intake.building_issues?.utilityFirstNoticed || '',
      'utility-severity': intake.building_issues?.utilitySeverity || '',

      // Safety details
      'safety-details': intake.building_issues?.safetyDetails || '',
      'safety-repair-history': intake.building_issues?.safetyRepairHistory || '',
      'safety-first-noticed': intake.building_issues?.safetyFirstNoticed || '',
      'safety-severity': intake.building_issues?.safetySeverity || '',

      // Harassment details
      'harassment-details': intake.building_issues?.harassmentDetails || '',
      'harassment-start-date': intake.building_issues?.harassmentStartDate || '',
      'harassment-first-noticed': intake.building_issues?.harassmentFirstNoticed || '',
      'harassment-repair-history': intake.building_issues?.harassmentRepairHistory || '',
      'harassment-severity': intake.building_issues?.harassmentSeverity || '',

      // Government entity details (check both field names for compatibility)
      'government-details': intake.building_issues?.governmentEntitiesDetails || intake.building_issues?.governmentDetails || '',
      'government-first-noticed': intake.building_issues?.governmentFirstNoticed || '',
      'government-repair-history': intake.building_issues?.governmentRepairHistory || '',
      'government-severity': intake.building_issues?.governmentSeverity || '',

      // Phase 3 categories - metadata fields
      'injury-details': intake.building_issues?.injuryDetails || '',
      'injury-first-noticed': intake.building_issues?.injuryFirstNoticed || '',
      'injury-repair-history': intake.building_issues?.injuryRepairHistory || '',
      'injury-severity': intake.building_issues?.injurySeverity || '',

      'nonresponsive-details': intake.building_issues?.nonresponsiveDetails || '',
      'nonresponsive-first-noticed': intake.building_issues?.nonresponsiveFirstNoticed || '',
      'nonresponsive-repair-history': intake.building_issues?.nonresponsiveRepairHistory || '',
      'nonresponsive-severity': intake.building_issues?.nonresponsiveSeverity || '',

      'unauthorized-details': intake.building_issues?.unauthorizedDetails || '',
      'unauthorized-first-noticed': intake.building_issues?.unauthorizedFirstNoticed || '',
      'unauthorized-repair-history': intake.building_issues?.unauthorizedRepairHistory || '',
      'unauthorized-severity': intake.building_issues?.unauthorizedSeverity || '',

      'stolen-details': intake.building_issues?.stolenDetails || '',
      'stolen-first-noticed': intake.building_issues?.stolenFirstNoticed || '',
      'stolen-repair-history': intake.building_issues?.stolenRepairHistory || '',
      'stolen-severity': intake.building_issues?.stolenSeverity || '',

      'damaged-details': intake.building_issues?.damagedDetails || '',
      'damaged-first-noticed': intake.building_issues?.damagedFirstNoticed || '',
      'damaged-repair-history': intake.building_issues?.damagedRepairHistory || '',
      'damaged-severity': intake.building_issues?.damagedSeverity || '',

      'age-discrim-details': intake.building_issues?.ageDiscrimDetails || '',
      'age-discrim-first-noticed': intake.building_issues?.ageDiscrimFirstNoticed || '',
      'age-discrim-repair-history': intake.building_issues?.ageDiscrimRepairHistory || '',
      'age-discrim-severity': intake.building_issues?.ageDiscrimSeverity || '',

      'racial-discrim-details': intake.building_issues?.racialDiscrimDetails || '',
      'racial-discrim-first-noticed': intake.building_issues?.racialDiscrimFirstNoticed || '',
      'racial-discrim-repair-history': intake.building_issues?.racialDiscrimRepairHistory || '',
      'racial-discrim-severity': intake.building_issues?.racialDiscrimSeverity || '',

      'disability-discrim-details': intake.building_issues?.disabilityDiscrimDetails || '',
      'disability-discrim-first-noticed': intake.building_issues?.disabilityDiscrimFirstNoticed || '',
      'disability-discrim-repair-history': intake.building_issues?.disabilityDiscrimRepairHistory || '',
      'disability-discrim-severity': intake.building_issues?.disabilityDiscrimSeverity || '',

      'security-deposit-details': intake.building_issues?.securityDepositDetails || '',
      'security-deposit-first-noticed': intake.building_issues?.securityDepositFirstNoticed || '',
      'security-deposit-repair-history': intake.building_issues?.securityDepositRepairHistory || '',
      'security-deposit-severity': intake.building_issues?.securityDepositSeverity || '',

      // Other/Additional notes
      // Note: additionalNotes is stored in raw_form_data, building_issues, or at top level
      'additional-notes': intake.raw_form_data?.additionalNotes || intake.building_issues?.additionalNotes || intake.additional_notes || '',
      'hab-additional-notes': intake.raw_form_data?.additionalNotes || intake.building_issues?.additionalNotes || intake.additional_notes || '',
      'other-issues-description': intake.building_issues?.otherDescription || intake.raw_form_data?.otherDescription || '',

      // =======================================================================
      // HAB-* FORMAT DETAIL TEXTAREAS (match index.html field IDs)
      // =======================================================================
      // These are the actual textarea IDs in the doc-gen form
      // =======================================================================
      'hab-electrical-details': intake.building_issues?.electricalDetails || '',
      'hab-appliance-details': intake.building_issues?.applianceDetails || '',
      'hab-heating-details': intake.building_issues?.hvacDetails || '',
      'hab-plumbing-details': intake.building_issues?.plumbingDetails || '',
      'hab-flooring-details': intake.building_issues?.flooringDetails || '',
      'hab-windows-details': intake.building_issues?.windowDetails || '',
      'hab-doors-details': intake.building_issues?.doorDetails || '',
      'hab-structure-details': intake.building_issues?.structuralDetails || '',
      'hab-nuisances-details': intake.building_issues?.nuisanceDetails || '',
      'hab-pest-details': intake.building_issues?.verminDetails || intake.building_issues?.insectsDetails || '',
      'hab-common-details': intake.building_issues?.commonAreaDetails || '',
      'hab-fire-details': intake.building_issues?.fireHazardDetails || '',
      'hab-health-details': intake.building_issues?.healthHazardDetails || '',
    };

    // ===== DEBUGGING: Log government details specifically =====
    logger.info('DOC-GEN FORMAT DEBUG - Government details mapping:', {
      intakeId: id,
      rawGovernmentEntitiesDetails: intake.building_issues?.governmentEntitiesDetails,
      rawGovernmentDetails: intake.building_issues?.governmentDetails,
      mappedGovernmentDetails: docGenData['government-details'],
      mappedGovernmentFirstNoticed: docGenData['government-first-noticed'],
      mappedGovernmentSeverity: docGenData['government-severity'],
      mappedGovernmentRepairHistory: docGenData['government-repair-history'],
    });

    // ===== DEBUGGING: Log building issues mapping results =====
    const buildingIssuesFields = Object.entries(docGenData)
      .filter(([key]) => key.startsWith('hab-'))
      .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {});

    const trueBuildingIssues = Object.entries(buildingIssuesFields)
      .filter(([, value]) => value === true)
      .map(([key]) => key);

    logger.info('DOC-GEN FORMAT DEBUG - Building issues mapping output:', {
      intakeId: id,
      totalHabFields: Object.keys(buildingIssuesFields).length,
      trueHabFields: trueBuildingIssues.length,
      trueHabFieldsList: trueBuildingIssues,
      allHabFields: buildingIssuesFields,
    });

    // =======================================================================
    // READ FROM NORMALIZED TABLES (Phase 3)
    // =======================================================================
    // If USE_NEW_INTAKE_SCHEMA is true, also read from normalized tables
    // to populate individual checkbox fields
    // =======================================================================
    if (process.env.USE_NEW_INTAKE_SCHEMA === 'true') {
      try {
        // Query normalized tables for selected options
        const normalizedQuery = `
          SELECT
            ic.category_code AS category_code,
            io.option_code AS option_code
          FROM intake_issue_selections iis
          JOIN issue_options io ON iis.issue_option_id = io.id
          JOIN issue_categories ic ON io.category_id = ic.id
          WHERE iis.intake_id = $1
          ORDER BY ic.display_order, io.display_order
        `;

        const normalizedResult = await db.query(normalizedQuery, [id]);

        logger.info('DOC-GEN FORMAT DEBUG - Normalized table data:', {
          intakeId: id,
          optionsFound: normalizedResult.rows.length,
          options: normalizedResult.rows,
        });

        // Map category codes to doc-gen prefixes
        const categoryToPrefix = {
          'vermin': 'vermin',
          'insects': 'insect', // Note: 'insect' not 'insects' for doc-gen
          'hvac': 'hvac',
          'electrical': 'electrical',
          'fireHazard': 'fire-hazard',
          'government': 'government',
          'appliances': 'appliances',
          'plumbing': 'plumbing',
          'cabinets': 'cabinets',
          'flooring': 'flooring',
          'windows': 'windows',
          'doors': 'door', // Note: 'door' not 'doors' for doc-gen
          'structure': 'structure',
          'commonAreas': 'common-areas',
          'trash': 'trash',
          'nuisance': 'nuisance',
          'healthHazard': 'health-hazard',
          'harassment': 'harassment',
          'notices': 'notices',
          'utility': 'utility',
          'safety': 'safety',
        };

        // Build individual checkbox fields
        // Format: {category-prefix}-{OptionCode}-1
        normalizedResult.rows.forEach(row => {
          const prefix = categoryToPrefix[row.category_code];
          if (prefix) {
            const fieldName = `${prefix}-${row.option_code}-1`;
            docGenData[fieldName] = true;
            logger.info(`Added doc-gen checkbox field: ${fieldName}`);
          } else {
            logger.warn(`No doc-gen prefix mapping for category: ${row.category_code}`);
          }
        });

        logger.info('DOC-GEN FORMAT DEBUG - Added normalized fields:', {
          intakeId: id,
          fieldsAdded: normalizedResult.rows.length,
        });

      } catch (normalizedError) {
        // Log error but don't fail the request - fall back to JSONB only
        logger.warn('Failed to read from normalized tables, falling back to JSONB only:', {
          error: normalizedError.message,
          intakeId: id,
        });
      }
    }

    // ============================================================================
    // Phase 7B.2: Update CRM Dashboard status when intake is loaded into doc-gen
    // ============================================================================
    // When an attorney loads an intake into the doc-gen form, update status to 'in_review'
    // This indicates someone is actively working on document preparation
    try {
      const dashboardUpdateResult = await db.query(`
        UPDATE case_dashboard
        SET status = CASE
              WHEN status = 'new' THEN 'in_review'
              ELSE status
            END,
            status_changed_by = CASE
              WHEN status = 'new' THEN 'system'
              ELSE status_changed_by
            END
        WHERE intake_id = $1
        RETURNING id, status
      `, [id]);

      if (dashboardUpdateResult.rows.length > 0) {
        const dashboard = dashboardUpdateResult.rows[0];
        logger.info('Dashboard status updated on load-from-intake', {
          intakeId: id,
          dashboardId: dashboard.id,
          newStatus: dashboard.status
        });

        // Log activity if status changed
        if (dashboard.status === 'in_review') {
          await db.query(`
            INSERT INTO case_activities (dashboard_id, intake_id, activity_type, description, performed_by, old_value, new_value)
            VALUES ($1, $2, 'status_changed', 'Intake loaded into document generation form', 'system', 'new', 'in_review')
          `, [dashboard.id, id]);
        }
      }
    } catch (dashboardError) {
      // Log error but don't fail the request
      logger.warn('Failed to update dashboard status on load-from-intake', {
        intakeId: id,
        error: dashboardError.message
      });
    }
    // ============================================================================

    res.status(200).json(docGenData);
  } catch (error) {
    logger.error('Error fetching intake in doc-gen format', {
      error: error.message,
      stack: error.stack,
    });

    res.status(500).json({
      error: 'Failed to fetch intake data',
      message: 'An unexpected error occurred. Please try again.',
      errorCode: 'INTAKE_DATA_ERROR'
    });
  }
});

module.exports = router;
