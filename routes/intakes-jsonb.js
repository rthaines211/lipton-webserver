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

    // Validate required fields
    const requiredFields = [
      'firstName',
      'lastName',
      'primaryPhone',
      'emailAddress',
      'currentStreetAddress',
      'currentCity',
      'currentState',
      'currentZipCode',
      'propertyStreetAddress',
      'propertyCity',
      'propertyState',
      'propertyZipCode',
      'monthlyRent',
    ];

    const missingFields = requiredFields.filter(field => !formData[field]);
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
    const currentAddress = {
      street: formData.currentStreetAddress,
      unit: formData.currentUnitNumber || null,
      city: formData.currentCity,
      state: formData.currentState,
      zipCode: formData.currentZipCode,
      county: formData.currentCounty || null,
      yearsAtAddress: formData.yearsAtCurrentAddress ? parseInt(formData.yearsAtCurrentAddress) : null,
      monthsAtAddress: formData.monthsAtCurrentAddress ? parseInt(formData.monthsAtCurrentAddress) : null,
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
      floorNumber: formData.floorNumber ? parseInt(formData.floorNumber) : null,
    };

    const tenancyInfo = {
      leaseStartDate: formData.leaseStartDate || null,
      leaseEndDate: formData.leaseEndDate || null,
      leaseType: formData.leaseType || null,
      monthlyRent: formData.monthlyRent ? parseFloat(formData.monthlyRent) : null,
      securityDeposit: formData.securityDeposit ? parseFloat(formData.securityDeposit) : null,
      lastRentIncreaseDate: formData.lastRentIncreaseDate || null,
      lastRentIncreaseAmount: formData.lastRentIncreaseAmount ? parseFloat(formData.lastRentIncreaseAmount) : null,
      rentCurrent: formData.rentCurrent !== undefined ? formData.rentCurrent : true,
      monthsBehindRent: formData.monthsBehindRent ? parseInt(formData.monthsBehindRent) : 0,
      receivedEvictionNotice: formData.receivedEvictionNotice || false,
      isRentControlled: formData.isRentControlled || false,
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
      electricalOther: formData.electricalOther || false,
      electricalDetails: formData.electricalDetails || null,
      electricalFirstNoticed: formData.electricalFirstNoticed || null,
      electricalReportedDate: formData.electricalReportedDate || null,

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

      // Pest Issues - ALL fields from intake form
      hasPestIssues: formData.hasPestIssues || false,
      pestRats: formData.pestRats || false,
      pestMice: formData.pestMice || false,
      pestCockroaches: formData.pestCockroaches || false,
      pestBedbugs: formData.pestBedbugs || false,
      pestFleas: formData.pestFleas || false,
      pestAnts: formData.pestAnts || false,
      pestTermites: formData.pestTermites || false,
      pestSpiders: formData.pestSpiders || false,
      pestWasps: formData.pestWasps || false,
      pestBees: formData.pestBees || false,
      pestOtherInsects: formData.pestOtherInsects || false,
      pestBirds: formData.pestBirds || false,
      pestRaccoons: formData.pestRaccoons || false,
      pestOtherVermin: formData.pestOtherVermin || false,
      pestDetails: formData.pestDetails || null,
      pestFirstNoticed: formData.pestFirstNoticed || null,
      pestReportedDate: formData.pestReportedDate || null,

      // Fire Hazard Issues - ALL fields from intake form
      hasFireHazardIssues: formData.hasFireHazardIssues || false,
      fireHazardExposedWiring: formData.fireHazardExposedWiring || false,
      fireHazardBlockedExits: formData.fireHazardBlockedExits || false,
      fireHazardNoSmokeDetectors: formData.fireHazardNoSmokeDetectors || false,
      fireHazardBrokenSmokeDetectors: formData.fireHazardBrokenSmokeDetectors || false,
      fireHazardOther: formData.fireHazardOther || false,
      fireHazardDetails: formData.fireHazardDetails || null,
      fireHazardFirstNoticed: formData.fireHazardFirstNoticed || null,
      fireHazardReportedDate: formData.fireHazardReportedDate || null,

      // Utility Issues - ALL fields from intake form
      hasUtilityIssues: formData.hasUtilityIssues || false,
      utilityNoHotWater: formData.utilityNoHotWater || false,
      utilityNoHeat: formData.utilityNoHeat || false,
      utilityNoElectricity: formData.utilityNoElectricity || false,
      utilityNoGas: formData.utilityNoGas || false,
      utilityOther: formData.utilityOther || false,
      utilityDetails: formData.utilityDetails || null,
      utilityFirstNoticed: formData.utilityFirstNoticed || null,
      utilityReportedDate: formData.utilityReportedDate || null,

      // Flooring Issues - ALL fields from intake form
      hasFlooringIssues: formData.hasFlooringIssues || false,
      flooringDamaged: formData.flooringDamaged || false,
      flooringUneven: formData.flooringUneven || false,
      flooringMissing: formData.flooringMissing || false,
      flooringOther: formData.flooringOther || false,
      flooringDetails: formData.flooringDetails || null,
      flooringFirstNoticed: formData.flooringFirstNoticed || null,
      flooringReportedDate: formData.flooringReportedDate || null,

      // Window Issues - ALL fields from intake form
      hasWindowIssues: formData.hasWindowIssues || false,
      windowBroken: formData.windowBroken || false,
      windowMissing: formData.windowMissing || false,
      windowDrafty: formData.windowDrafty || false,
      windowNoScreens: formData.windowNoScreens || false,
      windowWontOpen: formData.windowWontOpen || false,
      windowOther: formData.windowOther || false,
      windowDetails: formData.windowDetails || null,
      windowFirstNoticed: formData.windowFirstNoticed || null,
      windowReportedDate: formData.windowReportedDate || null,

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
      doorDetails: formData.doorDetails || null,
      doorFirstNoticed: formData.doorFirstNoticed || null,
      doorReportedDate: formData.doorReportedDate || null,

      // Cabinet Issues - ALL fields from intake form
      hasCabinetIssues: formData.hasCabinetIssues || false,
      cabinetBroken: formData.cabinetBroken || false,
      cabinetMissing: formData.cabinetMissing || false,
      cabinetOther: formData.cabinetOther || false,
      cabinetDetails: formData.cabinetDetails || null,
      cabinetFirstNoticed: formData.cabinetFirstNoticed || null,
      cabinetReportedDate: formData.cabinetReportedDate || null,

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
      commonAreaDetails: formData.commonAreaDetails || null,
      commonAreaFirstNoticed: formData.commonAreaFirstNoticed || null,
      commonAreaReportedDate: formData.commonAreaReportedDate || null,

      // Trash Problems - ALL fields from intake form
      hasTrashProblems: formData.hasTrashProblems || false,
      trashNotCollected: formData.trashNotCollected || false,
      trashOverflowing: formData.trashOverflowing || false,
      trashDetails: formData.trashDetails || null,
      trashFirstNoticed: formData.trashFirstNoticed || null,
      trashReportedDate: formData.trashReportedDate || null,

      // Nuisance Issues - ALL fields from intake form
      hasNuisanceIssues: formData.hasNuisanceIssues || false,
      nuisanceNoise: formData.nuisanceNoise || false,
      nuisanceSmell: formData.nuisanceSmell || false,
      nuisanceSmoke: formData.nuisanceSmoke || false,
      nuisanceOther: formData.nuisanceOther || false,
      nuisanceDetails: formData.nuisanceDetails || null,
      nuisanceFirstNoticed: formData.nuisanceFirstNoticed || null,
      nuisanceReportedDate: formData.nuisanceReportedDate || null,

      // Health Hazard Issues - ALL fields from intake form
      hasHealthHazardIssues: formData.hasHealthHazardIssues || false,
      healthHazardMold: formData.healthHazardMold || false,
      healthHazardLeadPaint: formData.healthHazardLeadPaint || false,
      healthHazardAsbestos: formData.healthHazardAsbestos || false,
      healthHazardPoorVentilation: formData.healthHazardPoorVentilation || false,
      healthHazardChemicalSmell: formData.healthHazardChemicalSmell || false,
      healthHazardContaminatedWater: formData.healthHazardContaminatedWater || false,
      healthHazardOther: formData.healthHazardOther || false,
      healthHazardDetails: formData.healthHazardDetails || null,
      healthHazardFirstNoticed: formData.healthHazardFirstNoticed || null,
      healthHazardReportedDate: formData.healthHazardReportedDate || null,

      // Government Entities Contacted - ALL fields from intake form (NO date fields)
      hasGovernmentEntitiesContacted: formData.hasGovernmentEntitiesContacted || false,
      govEntityHPD: formData.govEntityHPD || false,
      govEntityDOB: formData.govEntityDOB || false,
      govEntityOATH: formData.govEntityOATH || false,
      govEntityDHCR: formData.govEntityDHCR || false,
      govEntityDHS: formData.govEntityDHS || false,
      govEntity311: formData.govEntity311 || false,
      govEntityOther: formData.govEntityOther || false,
      governmentEntitiesDetails: formData.governmentEntitiesDetails || null,

      // Notice Issues - ALL fields from intake form (NO date fields)
      hasNoticeIssues: formData.hasNoticeIssues || false,
      noticeEviction: formData.noticeEviction || false,
      noticeRentIncrease: formData.noticeRentIncrease || false,
      noticeLeaseTerm: formData.noticeLeaseTerm || false,
      noticeEntry: formData.noticeEntry || false,
      noticeRepair: formData.noticeRepair || false,
      noticeOther: formData.noticeOther || false,
      noticeDetails: formData.noticeDetails || null,

      // Safety Issues - ALL fields from intake form
      hasSafetyIssues: formData.hasSafetyIssues || false,
      safetyNoFireExtinguisher: formData.safetyNoFireExtinguisher || false,
      safetyNoEmergencyLighting: formData.safetyNoEmergencyLighting || false,
      safetyNoFireEscape: formData.safetyNoFireEscape || false,
      safetyBlockedFireEscape: formData.safetyBlockedFireEscape || false,
      safetyDamagedFireEscape: formData.safetyDamagedFireEscape || false,
      safetyOther: formData.safetyOther || false,
      safetyDetails: formData.safetyDetails || null,
      safetyFirstNoticed: formData.safetyFirstNoticed || null,
      safetyReportedDate: formData.safetyReportedDate || null,

      // Harassment Issues - Phase 3A (15 checkboxes + 1 date field)
      hasHarassmentIssues: formData.hasHarassmentIssues || false,
      harassmentUnlawfulDetainer: formData.harassmentUnlawfulDetainer || false,
      harassmentEvictionThreats: formData.harassmentEvictionThreats || false,
      harassmentByDefendant: formData.harassmentByDefendant || false,
      harassmentByMaintenance: formData.harassmentByMaintenance || false,
      harassmentByManager: formData.harassmentByManager || false,
      harassmentByOwner: formData.harassmentByOwner || false,
      harassmentByOtherTenants: formData.harassmentByOtherTenants || false,
      harassmentIllegitimateNotices: formData.harassmentIllegitimateNotices || false,
      harassmentRefusalToRepair: formData.harassmentRefusalToRepair || false,
      harassmentWrittenThreats: formData.harassmentWrittenThreats || false,
      harassmentAggressiveLanguage: formData.harassmentAggressiveLanguage || false,
      harassmentPhysicalThreats: formData.harassmentPhysicalThreats || false,
      harassmentSinglingOut: formData.harassmentSinglingOut || false,
      harassmentDuplicativeNotices: formData.harassmentDuplicativeNotices || false,
      harassmentUntimelyResponse: formData.harassmentUntimelyResponse || false,
      harassmentDetails: formData.harassmentDetails || null,
      harassmentStartDate: formData.harassmentStartDate || null,

      // Legacy fields for backwards compatibility (can be removed later)
      hasOtherIssues: formData.hasOtherIssues || false,
      otherDescription: formData.otherIssuesDescription || null,
    };

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

    // Phase 3B: Additional Property/Tenancy fields
    const additionalTenancyInfo = {
      hasUnlawfulDetainerFiled: formData.hasUnlawfulDetainerFiled || null,
      moveInDate: formData.moveInDate || null,
      hasRetainerWithAnotherAttorney: formData.hasRetainerWithAnotherAttorney || null,
      howDidYouFindUs: formData.howDidYouFindUs || null,
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
        filing_county,
        is_head_of_household,
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
        $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21
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

    const values = [
      intakeNumber,
      formData.firstName,
      formData.middleName || null,
      formData.lastName,
      formData.preferredName || null,
      formData.dateOfBirth || null,
      formData.emailAddress,
      formData.primaryPhone,
      formData.secondaryPhone || null,
      formData.preferredContactMethod || 'email',
      formData.filingCounty || null,
      formData.isHeadOfHousehold !== undefined ? formData.isHeadOfHousehold : true,
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

    const duration = Date.now() - startTime;
    logger.info('Intake form saved successfully', {
      intakeId: intake.id,
      intakeNumber: intake.intake_number,
      duration: `${duration}ms`,
    });

    res.status(201).json({
      success: true,
      message: 'Intake form submitted successfully',
      data: {
        intakeId: intake.id,
        intakeNumber: intake.intake_number,
        status: intake.intake_status,
        submittedAt: intake.created_at,
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
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
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
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
    });
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
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
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
      'lease-start-date': intake.tenancy_info?.leaseStartDate || '',
      'monthly-rent': intake.tenancy_info?.monthlyRent ? intake.tenancy_info.monthlyRent.toString() : '',
      'security-deposit': intake.tenancy_info?.securityDeposit ? intake.tenancy_info.securityDeposit.toString() : '',

      // =======================================================================
      // BUILDING ISSUES MAPPING - Doc-Gen Plaintiff Issues Format
      // =======================================================================
      // Doc-gen form uses edit-issue-{plaintiffId}-{CategoryName} format for plaintiff issues
      // Example: edit-issue-1-VerminIssue, edit-issue-1-ElectricalIssues
      // These are the actual checkboxes in the doc-gen form for plaintiff #1
      // =======================================================================

      // Plaintiff #1 Issue Toggle Checkboxes (ACTUAL IDs from dynamically generated HTML)
      // Format: {CategoryName}-toggle-{plaintiffId}
      // These are the actual checkbox IDs created by the doc-gen form JavaScript
      'VerminIssue-toggle-1': intake.building_issues?.pestRats || intake.building_issues?.pestMice || false,
      'InsectIssues-toggle-1': intake.building_issues?.pestCockroaches || intake.building_issues?.pestBedbugs || intake.building_issues?.pestAnts || intake.building_issues?.pestTermites || false,
      'HVACIssues-toggle-1': intake.building_issues?.hasHvacIssues || false,
      'ElectricalIssues-toggle-1': intake.building_issues?.hasElectricalIssues || false,
      'FireHazardIssues-toggle-1': intake.building_issues?.hasFireHazardIssues || false,
      'AppliancesIssues-toggle-1': intake.building_issues?.hasApplianceIssues || false,
      'PlumbingIssues-toggle-1': intake.building_issues?.hasPlumbingIssues || false,
      'CabinetsIssues-toggle-1': intake.building_issues?.hasCabinetIssues || false,
      'FlooringIssues-toggle-1': intake.building_issues?.hasFlooringIssues || false,
      'WindowsIssues-toggle-1': intake.building_issues?.hasWindowIssues || false,
      'DoorIssues-toggle-1': intake.building_issues?.hasDoorIssues || false,
      'StructureIssues-toggle-1': intake.building_issues?.hasStructuralIssues || false,
      'CommonAreasIssues-toggle-1': intake.building_issues?.hasCommonAreaIssues || false,
      'TrashIssues-toggle-1': intake.building_issues?.hasTrashProblems || false,
      'NuisanceIssues-toggle-1': intake.building_issues?.hasNuisanceIssues || false,
      'HealthHazardIssues-toggle-1': intake.building_issues?.hasHealthHazardIssues || false,
      'HarassmentIssues-toggle-1': intake.building_issues?.hasHarassmentIssues || false,
      'NoticesIssues-toggle-1': intake.building_issues?.hasNoticeIssues || false,
      'UtilityIssues-toggle-1': intake.building_issues?.hasUtilityIssues || false,
      'SafetyIssues-toggle-1': intake.building_issues?.hasSafetyIssues || false,

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
    };

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

    res.status(200).json(docGenData);
  } catch (error) {
    logger.error('Error fetching intake in doc-gen format', {
      error: error.message,
      stack: error.stack,
    });

    res.status(500).json({
      error: 'Failed to fetch intake data',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
    });
  }
});

module.exports = router;
