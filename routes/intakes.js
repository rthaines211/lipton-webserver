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

      // Section 9-10: Insert building issues (if any reported)
      if (formData.hasStructuralIssues || formData.hasPlumbingIssues) {
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
            plumbing_clogged_drains,
            plumbing_toilet_not_working,
            plumbing_shower_not_working,
            plumbing_sink_not_working,
            plumbing_sewer_backup,
            plumbing_mold_from_leaks,
            plumbing_other,
            plumbing_other_details,
            plumbing_details,
            plumbing_first_noticed,
            plumbing_reported_date
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
            $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
            $21, $22, $23, $24, $25, $26, $27, $28, $29, $30,
            $31, $32
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
          formData.plumbingLeakyPipes || false,
          formData.plumbingCloggedDrains || false,
          formData.plumbingToiletNotWorking || false,
          formData.plumbingShowerNotWorking || false,
          formData.plumbingSinkNotWorking || false,
          formData.plumbingSewageBackup || false,
          formData.plumbingMoldFromLeaks || false,
          formData.plumbingOther || false,
          formData.plumbingOtherDetails || null,
          formData.plumbingDetails || null,
          formData.plumbingFirstNoticed || null,
          formData.plumbingReportedDate || null,
        ]);

        logger.info('Saved building issues', {
          intakeId,
          hasStructuralIssues: formData.hasStructuralIssues,
          hasPlumbingIssues: formData.hasPlumbingIssues,
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
 * Supports search by name, email, or address
 */
router.get('/', async (req, res) => {
  try {
    const { status, limit = 50, offset = 0, search, dateFrom } = req.query;

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
        i.property_street_address,
        i.property_city,
        i.property_state,
        i.current_street_address,
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
      WHERE 1=1
    `;

    const values = [];
    let paramIndex = 1;

    // Filter by search term (name, email, or address)
    if (search) {
      query += ` AND (
        i.first_name ILIKE $${paramIndex} OR
        i.last_name ILIKE $${paramIndex} OR
        i.email_address ILIKE $${paramIndex} OR
        i.property_street_address ILIKE $${paramIndex} OR
        i.current_street_address ILIKE $${paramIndex}
      )`;
      values.push(`%${search}%`);
      paramIndex++;
    }

    // Filter by status if provided
    if (status) {
      query += ` AND i.intake_status = $${paramIndex}`;
      values.push(status);
      paramIndex++;
    }

    // Filter by date range
    if (dateFrom) {
      query += ` AND i.intake_date >= $${paramIndex}`;
      values.push(dateFrom);
      paramIndex++;
    }

    query += ` ORDER BY i.intake_date DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    values.push(parseInt(limit), parseInt(offset));

    const result = await db.query(query, values);

    logger.info('Fetched intake list', {
      count: result.rows.length,
      status,
      search,
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

/**
 * GET /api/intakes/:id/doc-gen-format
 * Get intake data transformed into document generation format
 * This endpoint maps intake field names to the format expected by the doc gen form
 */
router.get('/:id/doc-gen-format', async (req, res) => {
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

    const landlordInfo = landlordResult.rows[0];
    const buildingIssues = issuesResult.rows[0];

    // Map intake data to doc gen format
    const docGenData = {
      // Property information
      'property-address': intake.property_street_address || intake.current_street_address,
      'apartment-unit': intake.property_unit_number || intake.current_unit_number,
      'city': intake.property_city || intake.current_city,
      'state': intake.property_state || intake.current_state,
      'zip-code': intake.property_zip_code || intake.current_zip_code,
      'filing-county': intake.property_county || intake.current_county,

      // Plaintiff 1 (primary client)
      'plaintiff-1-firstname': intake.first_name,
      'plaintiff-1-lastname': intake.last_name,
      'plaintiff-1-phone': intake.primary_phone,
      'plaintiff-1-email': intake.email_address,
      'plaintiff-1-address': intake.current_street_address,
      'plaintiff-1-unit': intake.current_unit_number,
      'plaintiff-1-city': intake.current_city,
      'plaintiff-1-state': intake.current_state,
      'plaintiff-1-zip': intake.current_zip_code,

      // Defendant 1 (landlord)
      'defendant-1-name': landlordInfo?.landlord_name || '',
      'defendant-1-company': landlordInfo?.landlord_company_name || '',
      'defendant-1-address': landlordInfo?.landlord_address || '',
      'defendant-1-city': landlordInfo?.landlord_city || '',
      'defendant-1-state': landlordInfo?.landlord_state || '',
      'defendant-1-zip': landlordInfo?.landlord_zip || '',
      'defendant-1-phone': landlordInfo?.landlord_phone || '',
      'defendant-1-email': landlordInfo?.landlord_email || '',

      // Lease information
      'lease-start-date': intake.lease_start_date,
      'monthly-rent': intake.monthly_rent,
      'security-deposit': intake.security_deposit,
    };

    // Map building issues to checkboxes
    if (buildingIssues) {
      // Structural issues
      if (buildingIssues.structural_ceiling_damage) docGenData['issue-structural-ceiling'] = true;
      if (buildingIssues.structural_wall_cracks) docGenData['issue-structural-wall'] = true;
      if (buildingIssues.structural_floor_damage) docGenData['issue-structural-floor'] = true;
      if (buildingIssues.structural_roof_leaks) docGenData['issue-structural-roof'] = true;
      if (buildingIssues.structural_window_damage) docGenData['issue-structural-window'] = true;
      if (buildingIssues.structural_door_damage) docGenData['issue-structural-door'] = true;

      // Plumbing issues
      if (buildingIssues.plumbing_no_hot_water) docGenData['issue-plumbing-no-hot-water'] = true;
      if (buildingIssues.plumbing_no_water) docGenData['issue-plumbing-no-water'] = true;
      if (buildingIssues.plumbing_leaks) docGenData['issue-plumbing-leaks'] = true;
      if (buildingIssues.plumbing_clogged_drains) docGenData['issue-plumbing-clogged'] = true;
      if (buildingIssues.plumbing_toilet_not_working) docGenData['issue-plumbing-toilet'] = true;
      if (buildingIssues.plumbing_sewer_backup) docGenData['issue-plumbing-sewage'] = true;
      if (buildingIssues.plumbing_mold_from_leaks) docGenData['issue-plumbing-mold'] = true;

      // Add issue descriptions if available
      if (buildingIssues.structural_details) {
        docGenData['structural-issue-description'] = buildingIssues.structural_details;
      }
      if (buildingIssues.plumbing_details) {
        docGenData['plumbing-issue-description'] = buildingIssues.plumbing_details;
      }
    }

    // Add household members as additional plaintiffs
    if (householdResult.rows.length > 0) {
      householdResult.rows.forEach((member, index) => {
        const plaintiffNum = index + 2; // Start from plaintiff-2
        docGenData[`plaintiff-${plaintiffNum}-firstname`] = member.first_name;
        docGenData[`plaintiff-${plaintiffNum}-lastname`] = member.last_name;
        docGenData[`plaintiff-${plaintiffNum}-relationship`] = member.relationship_to_client;
      });
    }

    logger.info('Transformed intake to doc-gen format', {
      intakeId: id,
      intakeNumber: intake.intake_number,
      fieldCount: Object.keys(docGenData).length,
    });

    res.json(docGenData);

  } catch (error) {
    logger.error('Error transforming intake to doc-gen format', {
      error: error.message,
      stack: error.stack,
      intakeId: req.params.id,
    });

    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to transform intake data.',
    });
  }
});

module.exports = router;
