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
      // Structural
      hasStructuralIssues: formData.hasStructuralIssues || false,
      structuralCracks: formData.structuralCracks || false,
      structuralLeaning: formData.structuralLeaning || false,
      structuralCollapse: formData.structuralCollapse || false,

      // Plumbing
      hasPlumbingIssues: formData.hasPlumbingIssues || false,
      plumbingLeaks: formData.plumbingLeaks || false,
      plumbingNoPressure: formData.plumbingNoPressure || false,
      plumbingNoHotWater: formData.plumbingNoHotWater || false,
      plumbingSewerBackup: formData.plumbingSewerBackup || false,
      plumbingCloggedDrains: formData.plumbingCloggedDrains || false,

      // Heating/Cooling
      hasHvacIssues: formData.hasHvacIssues || false,
      hvacNoHeat: formData.hvacNoHeat || false,
      hvacNoAC: formData.hvacNoAC || false,
      hvacPoorVentilation: formData.hvacPoorVentilation || false,

      // Electrical
      hasElectricalIssues: formData.hasElectricalIssues || false,
      electricalOutages: formData.electricalOutages || false,
      electricalSparks: formData.electricalSparks || false,
      electricalOverloaded: formData.electricalOverloaded || false,

      // Pest
      hasPestIssues: formData.hasPestIssues || false,
      pestRodents: formData.pestRodents || false,
      pestCockroaches: formData.pestCockroaches || false,
      pestBedBugs: formData.pestBedBugs || false,

      // Mold
      hasMoldIssues: formData.hasMoldIssues || false,
      moldVisible: formData.moldVisible || false,
      moldSmell: formData.moldSmell || false,
      moldExtensive: formData.moldExtensive || false,

      // Water
      hasWaterIssues: formData.hasWaterIssues || false,
      waterLeak: formData.waterLeak || false,
      waterDamage: formData.waterDamage || false,
      waterStanding: formData.waterStanding || false,

      // Safety
      hasSafetyIssues: formData.hasSafetyIssues || false,
      safetyNoSmoke: formData.safetyNoSmoke || false,
      safetyNoCO: formData.safetyNoCO || false,
      safetyBrokenLocks: formData.safetyBrokenLocks || false,

      // Other
      hasOtherIssues: formData.hasOtherIssues || false,
      otherDescription: formData.otherIssuesDescription || null,
    };

    const householdMembers = formData.householdMembers || [];

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
      JSON.stringify(currentAddress),
      JSON.stringify(propertyAddress),
      JSON.stringify(tenancyInfo),
      JSON.stringify(householdMembers),
      landlordInfo ? JSON.stringify(landlordInfo) : null,
      propertyManagerInfo ? JSON.stringify(propertyManagerInfo) : null,
      JSON.stringify(buildingIssues),
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

    // Transform JSONB data into doc-gen format (flat hyphenated keys)
    const docGenData = {
      // Property Information (from property_address JSONB)
      'property-address': intake.property_address?.street || '',
      'apartment-unit': intake.property_address?.unit || '',
      'city': intake.property_address?.city || '',
      'state': intake.property_address?.state || '',
      'zip-code': intake.property_address?.zipCode || '',
      'filing-county': intake.property_address?.county || '',

      // Plaintiff 1 (Primary Client) - from individual fields + current_address JSONB
      'plaintiff-1-first-name': intake.first_name || '',
      'plaintiff-1-last-name': intake.last_name || '',
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
      'plaintiff-1-head-of-household': true, // Intake submitter is assumed to be head of household

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

      // Issue Checkboxes - from building_issues JSONB
      // Map intake form field names to doc-gen checkbox values for auto-population
      //
      // STRUCTURAL ISSUES
      'issue-structural-cracks': intake.building_issues?.structuralWallCracks || intake.building_issues?.structuralCeilingDamage || false,
      'issue-structural-leaning': intake.building_issues?.structuralFloorDamage || intake.building_issues?.structuralFoundationIssues || false,
      'issue-structural-collapse': intake.building_issues?.structuralBalconyUnsafe || intake.building_issues?.structuralStairsUnsafe || false,
      'issue-structural-roof': intake.building_issues?.structuralRoofLeaks || false,
      'issue-structural-windows': intake.building_issues?.structuralWindowDamage || false,
      'issue-structural-doors': intake.building_issues?.structuralDoorDamage || false,
      'issue-structural-railings': intake.building_issues?.structuralRailingMissing || false,

      // PLUMBING ISSUES
      'issue-plumbing-leaks': intake.building_issues?.plumbingLeaks || intake.building_issues?.plumbingBurstPipes || false,
      'issue-plumbing-no-pressure': intake.building_issues?.plumbingLowPressure || false,
      'issue-plumbing-no-hot-water': intake.building_issues?.plumbingNoHotWater || intake.building_issues?.plumbingNoWater || false,
      'issue-plumbing-sewer-backup': intake.building_issues?.plumbingSewerBackup || false,
      'issue-plumbing-clogged-drains': intake.building_issues?.plumbingCloggedDrains || false,
      'issue-plumbing-toilet': intake.building_issues?.plumbingToiletNotWorking || false,
      'issue-plumbing-shower': intake.building_issues?.plumbingShowerNotWorking || false,
      'issue-plumbing-sink': intake.building_issues?.plumbingSinkNotWorking || false,
      'issue-plumbing-water-damage': intake.building_issues?.plumbingWaterDamage || intake.building_issues?.plumbingFlooding || false,
      'issue-plumbing-discolored-water': intake.building_issues?.plumbingWaterDiscoloration || false,

      // HVAC ISSUES
      'issue-hvac-no-heat': intake.building_issues?.hvacNoHeat || intake.building_issues?.hvacInadequateHeat || false,
      'issue-hvac-no-ac': intake.building_issues?.hvacNoAirConditioning || intake.building_issues?.hvacInadequateCooling || false,
      'issue-hvac-poor-ventilation': intake.building_issues?.hvacVentilationPoor || false,
      'issue-hvac-thermostat': intake.building_issues?.hvacBrokenThermostat || false,
      'issue-hvac-gas-smell': intake.building_issues?.hvacGasSmell || false,

      // ELECTRICAL ISSUES
      'issue-electrical-outages': intake.building_issues?.electricalPartialOutages || intake.building_issues?.electricalNoPower || false,
      'issue-electrical-sparks': intake.building_issues?.electricalSparkingOutlets || intake.building_issues?.electricalExposedWiring || false,
      'issue-electrical-overloaded': intake.building_issues?.electricalCircuitBreakerIssues || false,
      'issue-electrical-outlets': intake.building_issues?.electricalBrokenOutlets || false,
      'issue-electrical-switches': intake.building_issues?.electricalBrokenSwitches || false,
      'issue-electrical-flickering': intake.building_issues?.electricalFlickeringLights || false,
      'issue-electrical-burning': intake.building_issues?.electricalBurningSmell || false,

      // PEST ISSUES
      'issue-pest-rodents': intake.building_issues?.pestRats || intake.building_issues?.pestMice || false,
      'issue-pest-cockroaches': intake.building_issues?.pestCockroaches || false,
      'issue-pest-bed-bugs': intake.building_issues?.pestBedbugs || false,
      'issue-pest-ants': intake.building_issues?.pestAnts || false,
      'issue-pest-termites': intake.building_issues?.pestTermites || false,

      // MOLD & HEALTH HAZARD ISSUES
      'issue-mold-visible': intake.building_issues?.moldVisible || intake.building_issues?.moldMildew || false,
      'issue-mold-smell': intake.building_issues?.moldSmell || intake.building_issues?.moldMustyOdor || false,
      'issue-mold-extensive': intake.building_issues?.moldExtensive || false,
      'issue-health-noxious-fumes': intake.building_issues?.healthNoxiousFumes || false,
      'issue-health-toxic-water': intake.building_issues?.healthToxicWater || false,

      // SECURITY & SAFETY ISSUES
      'issue-safety-no-smoke': intake.building_issues?.securityNoSmokeDetector || false,
      'issue-safety-no-co': intake.building_issues?.securityNoCarbonMonoxide || false,
      'issue-safety-broken-locks': intake.building_issues?.securityBrokenLocks || intake.building_issues?.securityWindowLocksBroken || false,
      'issue-safety-inadequate-lighting': intake.building_issues?.securityInadequateLighting || false,
      'issue-safety-no-deadbolt': intake.building_issues?.securityNoDeadbolt || false,
      'issue-safety-broken-windows': intake.building_issues?.securityBrokenWindows || false,

      // APPLIANCE ISSUES
      'issue-appliance-stove': intake.building_issues?.applianceStoveBroken || false,
      'issue-appliance-refrigerator': intake.building_issues?.applianceRefrigeratorBroken || false,
      'issue-appliance-dishwasher': intake.building_issues?.applianceDishwasherBroken || false,
      'issue-appliance-washer': intake.building_issues?.applianceWasherBroken || false,
      'issue-appliance-dryer': intake.building_issues?.applianceDryerBroken || false,
      'issue-appliance-garbage-disposal': intake.building_issues?.applianceGarbageDisposalBroken || false,
      'issue-appliance-microwave': intake.building_issues?.applianceMicrowaveBroken || false,

      // Issue Descriptions
      'structural-issue-description': intake.building_issues?.otherDescription || '',
      'plumbing-issue-description': intake.building_issues?.otherDescription || '',
    };

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
