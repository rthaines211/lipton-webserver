/**
 * Client Intake Routes - Expanded Version
 *
 * Handles client intake form submissions with support for 100+ fields
 * Maps form data to the client_intakes table and related tables
 */

const express = require('express');
const router = express.Router();
const logger = require('../monitoring/logger');
const { getPool } = require('../server/services/database-service');

/**
 * POST /api/intakes
 * Submit a new client intake form (expanded version with 100+ fields)
 */
router.post('/', async (req, res) => {
  const startTime = Date.now();

  try {
    const formData = req.body;
    logger.info('Received intake form submission', {
      firstName: formData.firstName,
      lastName: formData.lastName,
      email: formData.emailAddress,
      hasStructuralIssues: formData.hasStructuralIssues,
      hasPlumbingIssues: formData.hasPlumbingIssues,
      householdMembers: formData.householdMembers?.length || 0,
    });

    // Validate required fields (minimum required for submission)
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

    // Start transaction
    await db.query('BEGIN');

    try {
      // Insert into client_intakes table (main table with 77 fields)
      const query = `
        INSERT INTO client_intakes (
          -- Section 1: Personal Information (10 fields)
          first_name,
          middle_name,
          last_name,
          preferred_name,
          date_of_birth,
          gender,
          marital_status,
          language_preference,
          requires_interpreter,

          -- Section 2: Contact Information (12 fields)
          primary_phone,
          secondary_phone,
          work_phone,
          email_address,
          preferred_contact_method,
          preferred_contact_time,
          emergency_contact_name,
          emergency_contact_relationship,
          emergency_contact_phone,
          can_text_primary,
          can_leave_voicemail,
          communication_restrictions,

          -- Section 3: Current Address (8 fields)
          current_street_address,
          current_unit_number,
          current_city,
          current_state,
          current_zip_code,
          current_county,
          years_at_current_address,
          months_at_current_address,

          -- Section 4: Property Information (12 fields)
          property_street_address,
          property_unit_number,
          property_city,
          property_state,
          property_zip_code,
          property_county,
          property_type,
          number_of_units_in_building,
          floor_number,
          total_floors_in_building,
          property_age_years,
          is_rent_controlled,

          -- Section 5: Tenancy Details (10 fields)
          lease_start_date,
          lease_end_date,
          lease_type,
          monthly_rent,
          security_deposit,
          last_rent_increase_date,
          last_rent_increase_amount,
          rent_current,
          months_behind_rent,
          received_eviction_notice,

          -- Metadata
          intake_status,
          submitted_by_ip,
          raw_form_data
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9,
          $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21,
          $22, $23, $24, $25, $26, $27, $28, $29,
          $30, $31, $32, $33, $34, $35, $36, $37, $38, $39, $40, $41,
          $42, $43, $44, $45, $46, $47, $48, $49, $50, $51,
          $52, $53, $54
        )
        RETURNING id, intake_number, intake_date, intake_status
      `;

      const values = [
        // Section 1: Personal Information
        formData.firstName,
        formData.middleName || null,
        formData.lastName,
        formData.preferredName || null,
        formData.dateOfBirth || null,
        formData.gender || null,
        formData.maritalStatus || null,
        formData.languagePreference || 'English',
        formData.requiresInterpreter || false,

        // Section 2: Contact Information
        formData.primaryPhone,
        formData.secondaryPhone || null,
        formData.workPhone || null,
        formData.emailAddress,
        formData.preferredContactMethod || 'phone',
        formData.preferredContactTime || null,
        formData.emergencyContactName || null,
        formData.emergencyContactRelationship || null,
        formData.emergencyContactPhone || null,
        formData.canTextPrimary !== undefined ? formData.canTextPrimary : true,
        formData.canLeaveVoicemail !== undefined ? formData.canLeaveVoicemail : true,
        formData.communicationRestrictions || null,

        // Section 3: Current Address
        formData.currentStreetAddress,
        formData.currentUnitNumber || null,
        formData.currentCity,
        formData.currentState,
        formData.currentZipCode,
        formData.currentCounty || null,
        formData.yearsAtCurrentAddress ? parseInt(formData.yearsAtCurrentAddress) : null,
        formData.monthsAtCurrentAddress ? parseInt(formData.monthsAtCurrentAddress) : null,

        // Section 4: Property Information
        formData.propertyStreetAddress,
        formData.propertyUnitNumber || null,
        formData.propertyCity,
        formData.propertyState,
        formData.propertyZipCode,
        formData.propertyCounty || null,
        formData.propertyType || null,
        formData.numberOfUnitsInBuilding ? parseInt(formData.numberOfUnitsInBuilding) : null,
        formData.floorNumber ? parseInt(formData.floorNumber) : null,
        formData.totalFloorsInBuilding ? parseInt(formData.totalFloorsInBuilding) : null,
        formData.propertyAgeYears ? parseInt(formData.propertyAgeYears) : null,
        formData.isRentControlled || false,

        // Section 5: Tenancy Details
        formData.leaseStartDate || null,
        formData.leaseEndDate || null,
        formData.leaseType || null,
        formData.monthlyRent ? parseFloat(formData.monthlyRent) : null,
        formData.securityDeposit ? parseFloat(formData.securityDeposit) : null,
        formData.lastRentIncreaseDate || null,
        formData.lastRentIncreaseAmount ? parseFloat(formData.lastRentIncreaseAmount) : null,
        formData.rentCurrent !== undefined ? formData.rentCurrent : true,
        formData.monthsBehindRent ? parseInt(formData.monthsBehindRent) : 0,
        formData.receivedEvictionNotice || false,

        // Metadata
        'pending', // Default status
        req.ip || req.connection.remoteAddress,
        JSON.stringify(formData), // Store complete raw form data for audit trail
      ];

      const result = await db.query(query, values);
      const intake = result.rows[0];
      const intakeId = intake.id;

      // Section 6: Insert household members (if any)
      if (formData.householdMembers && formData.householdMembers.length > 0) {
        for (let i = 0; i < formData.householdMembers.length; i++) {
          const member = formData.householdMembers[i];

          const memberQuery = `
            INSERT INTO intake_household_members (
              intake_id,
              member_type,
              first_name,
              last_name,
              relationship_to_client,
              age,
              date_of_birth,
              has_disability,
              disability_description,
              display_order
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          `;

          await db.query(memberQuery, [
            intakeId,
            member.memberType || null,
            member.firstName || null,
            member.lastName || null,
            member.relationshipToClient || null,
            member.age ? parseInt(member.age) : null,
            member.dateOfBirth || null,
            member.hasDisability || false,
            member.disabilityDescription || null,
            i + 1, // display_order
          ]);
        }

        logger.info('Saved household members', {
          intakeId,
          count: formData.householdMembers.length,
        });
      }

      // Section 7-8: Insert landlord info (if provided)
      if (formData.landlordName) {
        const landlordQuery = `
          INSERT INTO intake_landlord_info (
            intake_id,
            landlord_type,
            landlord_name,
            landlord_company_name,
            landlord_phone,
            landlord_email,
            landlord_address,
            landlord_city,
            landlord_state,
            landlord_zip,
            landlord_attorney_name,
            has_property_manager,
            manager_company_name,
            manager_contact_name,
            manager_phone,
            manager_email,
            manager_address,
            manager_response_time,
            manager_is_responsive
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
            $11, $12, $13, $14, $15, $16, $17, $18, $19
          )
        `;

        await db.query(landlordQuery, [
          intakeId,
          formData.landlordType || null,
          formData.landlordName,
          formData.landlordCompanyName || null,
          formData.landlordPhone || null,
          formData.landlordEmail || null,
          formData.landlordAddress || null,
          formData.landlordCity || null,
          formData.landlordState || null,
          formData.landlordZip || null,
          formData.landlordAttorneyName || null,
          formData.hasPropertyManager || false,
          formData.managerCompanyName || null,
          formData.managerContactName || null,
          formData.managerPhone || null,
          formData.managerEmail || null,
          formData.managerAddress || null,
          formData.managerResponseTime || null,
          formData.managerIsResponsive !== undefined ? formData.managerIsResponsive : null,
        ]);

        logger.info('Saved landlord information', { intakeId });
      }

      // Section 9-15: Insert building issues (if any reported)
      if (formData.hasStructuralIssues || formData.hasPlumbingIssues || formData.hasElectricalIssues ||
          formData.hasHvacIssues || formData.hasApplianceIssues || formData.hasSecurityIssues || formData.hasPestIssues) {
        const issuesQuery = `
          INSERT INTO intake_building_issues (
            intake_id,
            -- Structural Issues
            has_structural_issues,
            structural_ceiling_damage,
            structural_wall_cracks,
            structural_floor_damage,
            structural_foundation_issues,
            structural_roof_leaks,
            structural_window_damage,
            structural_door_damage,
            structural_stairs_unsafe,
            structural_balcony_unsafe,
            structural_railing_missing,
            structural_other,
            structural_other_details,
            structural_details,
            structural_first_noticed,
            structural_reported_date,
            -- Plumbing Issues
            has_plumbing_issues,
            plumbing_no_hot_water,
            plumbing_no_water,
            plumbing_low_pressure,
            plumbing_leaks,
            plumbing_burst_pipes,
            plumbing_clogged_drains,
            plumbing_toilet_not_working,
            plumbing_shower_not_working,
            plumbing_sink_not_working,
            plumbing_sewer_backup,
            plumbing_water_damage,
            plumbing_flooding,
            plumbing_water_discoloration,
            plumbing_other,
            plumbing_other_details,
            plumbing_details,
            plumbing_first_noticed,
            plumbing_reported_date,
            -- Electrical Issues
            has_electrical_issues,
            electrical_no_power,
            electrical_partial_outages,
            electrical_exposed_wiring,
            electrical_sparking_outlets,
            electrical_broken_outlets,
            electrical_broken_switches,
            electrical_flickering_lights,
            electrical_circuit_breaker_issues,
            electrical_insufficient_outlets,
            electrical_burning_smell,
            electrical_other,
            electrical_other_details,
            electrical_details,
            electrical_first_noticed,
            electrical_reported_date,
            -- HVAC Issues
            has_hvac_issues,
            hvac_no_heat,
            hvac_inadequate_heat,
            hvac_no_air_conditioning,
            hvac_inadequate_cooling,
            hvac_broken_thermostat,
            hvac_gas_smell,
            hvac_carbon_monoxide_detector_missing,
            hvac_ventilation_poor,
            hvac_other,
            hvac_other_details,
            hvac_details,
            hvac_first_noticed,
            hvac_reported_date,
            -- Appliance Issues
            has_appliance_issues,
            appliance_refrigerator_broken,
            appliance_stove_broken,
            appliance_oven_broken,
            appliance_dishwasher_broken,
            appliance_garbage_disposal_broken,
            appliance_washer_broken,
            appliance_dryer_broken,
            appliance_other,
            appliance_other_details,
            appliance_details,
            -- Security Issues
            has_security_issues,
            security_broken_locks,
            security_broken_windows,
            security_broken_doors,
            security_no_deadbolt,
            security_broken_gate,
            security_broken_intercom,
            security_inadequate_lighting,
            security_no_smoke_detector,
            security_break_ins,
            security_other,
            security_other_details,
            security_details,
            -- Pest Issues
            has_pest_issues,
            pest_rats,
            pest_mice,
            pest_cockroaches,
            pest_bedbugs,
            pest_fleas,
            pest_ants,
            pest_termites,
            pest_spiders,
            pest_wasps,
            pest_bees,
            pest_other_insects,
            pest_birds,
            pest_raccoons,
            pest_other_vermin,
            pest_other_details,
            pest_details,
            pest_first_noticed,
            pest_reported_date
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
            $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
            $21, $22, $23, $24, $25, $26, $27, $28, $29, $30,
            $31, $32, $33, $34, $35, $36, $37, $38, $39, $40,
            $41, $42, $43, $44, $45, $46, $47, $48, $49, $50,
            $51, $52, $53, $54, $55, $56, $57, $58, $59, $60,
            $61, $62, $63, $64, $65, $66, $67, $68, $69, $70,
            $71, $72, $73, $74, $75, $76, $77, $78, $79, $80,
            $81, $82, $83, $84, $85, $86, $87, $88, $89, $90,
            $91, $92, $93, $94, $95, $96, $97, $98, $99, $100,
            $101, $102, $103, $104, $105, $106, $107, $108, $109, $110,
            $111, $112, $113, $114, $115, $116, $117, $118, $119, $120,
            $121, $122
          )
        `;

        await db.query(issuesQuery, [
          intakeId,
          // Structural
          formData.hasStructuralIssues || false,
          formData.structuralCeilingDamage || false,
          formData.structuralWallCracks || false,
          formData.structuralFloorDamage || false,
          formData.structuralFoundationIssues || false,
          formData.structuralRoofLeaks || false,
          formData.structuralWindowDamage || false,
          formData.structuralDoorDamage || false,
          formData.structuralStairsUnsafe || false,
          formData.structuralBalconyUnsafe || false,
          formData.structuralRailingMissing || false,
          formData.structuralOther || false,
          formData.structuralOtherDetails || null,
          formData.structuralDetails || null,
          formData.structuralFirstNoticed || null,
          formData.structuralReportedDate || null,
          // Plumbing
          formData.hasPlumbingIssues || false,
          formData.plumbingNoHotWater || false,
          formData.plumbingNoWater || false,
          formData.plumbingLowPressure || false,
          formData.plumbingLeakyPipes || formData.plumbingLeaks || false,
          formData.plumbingBurstPipes || false,
          formData.plumbingCloggedDrains || false,
          formData.plumbingToiletNotWorking || false,
          formData.plumbingShowerNotWorking || false,
          formData.plumbingSinkNotWorking || false,
          formData.plumbingSewageBackup || formData.plumbingSewerBackup || false,
          formData.plumbingWaterDamage || false,
          formData.plumbingFlooding || false,
          formData.plumbingWaterDiscoloration || false,
          formData.plumbingOther || false,
          formData.plumbingOtherDetails || null,
          formData.plumbingDetails || null,
          formData.plumbingFirstNoticed || null,
          formData.plumbingReportedDate || null,
          // Electrical
          formData.hasElectricalIssues || false,
          formData.electricalNoPower || false,
          formData.electricalPartialOutages || false,
          formData.electricalExposedWiring || false,
          formData.electricalSparkingOutlets || false,
          formData.electricalBrokenOutlets || false,
          formData.electricalBrokenSwitches || false,
          formData.electricalFlickeringLights || false,
          formData.electricalCircuitBreakerIssues || false,
          formData.electricalInsufficientOutlets || false,
          formData.electricalBurningSmell || false,
          formData.electricalOther || false,
          formData.electricalOtherDetails || null,
          formData.electricalDetails || null,
          formData.electricalFirstNoticed || null,
          formData.electricalReportedDate || null,
          // HVAC
          formData.hasHvacIssues || false,
          formData.hvacNoHeat || false,
          formData.hvacInadequateHeat || false,
          formData.hvacNoAirConditioning || false,
          formData.hvacInadequateCooling || false,
          formData.hvacBrokenThermostat || false,
          formData.hvacGasSmell || false,
          formData.hvacCarbonMonoxideDetectorMissing || false,
          formData.hvacVentilationPoor || false,
          formData.hvacOther || false,
          formData.hvacOtherDetails || null,
          formData.hvacDetails || null,
          formData.hvacFirstNoticed || null,
          formData.hvacReportedDate || null,
          // Appliance
          formData.hasApplianceIssues || false,
          formData.applianceRefrigeratorBroken || false,
          formData.applianceStoveBroken || false,
          formData.applianceOvenBroken || false,
          formData.applianceDishwasherBroken || false,
          formData.applianceGarbageDisposalBroken || false,
          formData.applianceWasherBroken || false,
          formData.applianceDryerBroken || false,
          formData.applianceOther || false,
          formData.applianceOtherDetails || null,
          formData.applianceDetails || null,
          // Security
          formData.hasSecurityIssues || false,
          formData.securityBrokenLocks || false,
          formData.securityBrokenWindows || false,
          formData.securityBrokenDoors || false,
          formData.securityNoDeadbolt || false,
          formData.securityBrokenGate || false,
          formData.securityBrokenIntercom || false,
          formData.securityInadequateLighting || false,
          formData.securityNoSmokeDetector || false,
          formData.securityBreakIns || false,
          formData.securityOther || false,
          formData.securityOtherDetails || null,
          formData.securityDetails || null,
          // Pest
          formData.hasPestIssues || false,
          formData.pestRats || false,
          formData.pestMice || false,
          formData.pestCockroaches || false,
          formData.pestBedbugs || false,
          formData.pestFleas || false,
          formData.pestAnts || false,
          formData.pestTermites || false,
          formData.pestSpiders || false,
          formData.pestWasps || false,
          formData.pestBees || false,
          formData.pestOtherInsects || false,
          formData.pestBirds || false,
          formData.pestRaccoons || false,
          formData.pestOtherVermin || false,
          formData.pestOtherDetails || null,
          formData.pestDetails || null,
          formData.pestFirstNoticed || null,
          formData.pestReportedDate || null,
        ]);

        logger.info('Saved building issues', {
          intakeId,
          hasStructuralIssues: formData.hasStructuralIssues,
          hasPlumbingIssues: formData.hasPlumbingIssues,
          hasElectricalIssues: formData.hasElectricalIssues,
          hasHvacIssues: formData.hasHvacIssues,
          hasApplianceIssues: formData.hasApplianceIssues,
          hasSecurityIssues: formData.hasSecurityIssues,
          hasPestIssues: formData.hasPestIssues,
        });
      }

      // Commit transaction
      await db.query('COMMIT');

      const duration = Date.now() - startTime;
      logger.info('Intake form saved successfully', {
        intakeId: intake.id,
        intakeNumber: intake.intake_number,
        duration,
        householdMembers: formData.householdMembers?.length || 0,
        hasLandlordInfo: !!formData.landlordName,
        hasIssues: formData.hasStructuralIssues || formData.hasPlumbingIssues,
      });

      // Return success response with intake number
      res.status(201).json({
        success: true,
        intakeNumber: intake.intake_number,
        intakeId: intake.id,
        intakeDate: intake.intake_date,
        message: 'Your intake form has been submitted successfully. An attorney will review it shortly.',
      });

    } catch (error) {
      // Rollback transaction on error
      await db.query('ROLLBACK');
      throw error;
    }

  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('Error saving intake form', {
      error: error.message,
      stack: error.stack,
      duration,
    });

    // Check for specific database errors
    if (error.code === '23505') { // Unique violation
      return res.status(409).json({
        error: 'Duplicate submission detected',
        message: 'This intake form may have already been submitted.',
      });
    }

    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to submit intake form. Please try again.',
    });
  }
});

/**
 * GET /api/intakes
 * List all intake submissions (for internal/admin use)
 */
router.get('/', async (req, res) => {
  try {
    const { status, limit = 50, offset = 0 } = req.query;

    const db = getPool();

    let query = `
      SELECT
        i.id,
        i.intake_number,
        i.intake_date,
        i.intake_status,
        i.first_name,
        i.last_name,
        i.email_address,
        i.primary_phone,
        i.property_city,
        i.property_state,
        i.created_at,
        COALESCE(hm.household_count, 0) as household_members_count,
        CASE WHEN l.id IS NOT NULL THEN true ELSE false END as has_landlord_info,
        CASE WHEN bi.has_structural_issues OR bi.has_plumbing_issues THEN true ELSE false END as has_reported_issues
      FROM client_intakes i
      LEFT JOIN (
        SELECT intake_id, COUNT(*) as household_count
        FROM intake_household_members
        GROUP BY intake_id
      ) hm ON i.id = hm.intake_id
      LEFT JOIN intake_landlord_info l ON i.id = l.intake_id
      LEFT JOIN intake_building_issues bi ON i.id = bi.intake_id
    `;

    const values = [];
    let paramIndex = 1;

    // Filter by status if provided
    if (status) {
      query += ` WHERE i.intake_status = $${paramIndex}`;
      values.push(status);
      paramIndex++;
    }

    query += ` ORDER BY i.intake_date DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    values.push(parseInt(limit), parseInt(offset));

    const result = await db.query(query, values);

    logger.info('Fetched intake list', {
      count: result.rows.length,
      status,
    });

    res.json({
      intakes: result.rows,
      count: result.rows.length,
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

  } catch (error) {
    logger.error('Error fetching intakes', {
      error: error.message,
      stack: error.stack,
    });

    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch intakes.',
    });
  }
});

/**
 * GET /api/intakes/:id
 * Get a specific intake by ID (with all related data)
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const db = getPool();

    // Get main intake data
    const intakeQuery = 'SELECT * FROM client_intakes WHERE id = $1';
    const intakeResult = await db.query(intakeQuery, [id]);

    if (intakeResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Intake form not found.',
      });
    }

    const intake = intakeResult.rows[0];

    // Get related data
    const householdQuery = 'SELECT * FROM intake_household_members WHERE intake_id = $1 ORDER BY display_order';
    const householdResult = await db.query(householdQuery, [id]);

    const landlordQuery = 'SELECT * FROM intake_landlord_info WHERE intake_id = $1';
    const landlordResult = await db.query(landlordQuery, [id]);

    const issuesQuery = 'SELECT * FROM intake_building_issues WHERE intake_id = $1';
    const issuesResult = await db.query(issuesQuery, [id]);

    logger.info('Fetched intake details', {
      intakeId: id,
      intakeNumber: intake.intake_number,
      hasHousehold: householdResult.rows.length > 0,
      hasLandlord: landlordResult.rows.length > 0,
      hasIssues: issuesResult.rows.length > 0,
    });

    res.json({
      intake,
      householdMembers: householdResult.rows,
      landlordInfo: landlordResult.rows[0] || null,
      buildingIssues: issuesResult.rows[0] || null,
    });

  } catch (error) {
    logger.error('Error fetching intake', {
      error: error.message,
      stack: error.stack,
      intakeId: req.params.id,
    });

    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch intake.',
    });
  }
});

module.exports = router;
