/**
 * intake-helpers.js
 *
 * Helper functions for writing intake data to the new normalized schema
 * (intake_issue_selections, intake_issue_metadata)
 *
 * Phase 3C: Backend Migration
 */

const logger = require('../monitoring/logger');

/**
 * Maps old checkbox field names to new database structure
 * Returns { categoryCode, optionCode }
 */
const FIELD_TO_OPTION_MAP = {
  // ===== VERMIN (category: vermin, prefix: pest) =====
  'pestRatsMice': { category: 'vermin', option: 'RatsMice' },
  'pestRats': { category: 'vermin', option: 'RatsMice' },
  'pestMice': { category: 'vermin', option: 'RatsMice' },
  'pestSkunks': { category: 'vermin', option: 'Skunks' },
  'pestBats': { category: 'vermin', option: 'Bats' },
  'pestRaccoons': { category: 'vermin', option: 'Raccoons' },
  'pestPigeons': { category: 'vermin', option: 'Pigeons' },
  'pestBirds': { category: 'vermin', option: 'Pigeons' },
  'pestOpossums': { category: 'vermin', option: 'Opossums' },

  // ===== INSECTS (category: insects, prefix: pest) =====
  'pestAnts': { category: 'insects', option: 'Ants' },
  'pestRoaches': { category: 'insects', option: 'Roaches' },
  'pestCockroaches': { category: 'insects', option: 'Roaches' },
  'pestFlies': { category: 'insects', option: 'Flies' },
  'pestBedbugs': { category: 'insects', option: 'Bedbugs' },
  'pestWasps': { category: 'insects', option: 'Wasps' },
  'pestHornets': { category: 'insects', option: 'Hornets' },
  'pestSpiders': { category: 'insects', option: 'Spiders' },
  'pestTermites': { category: 'insects', option: 'Termites' },
  'pestMosquitos': { category: 'insects', option: 'Mosquitos' },
  'pestBees': { category: 'insects', option: 'Bees' },

  // ===== HVAC (category: hvac, prefix: hvac) =====
  'hvacAirConditioner': { category: 'hvac', option: 'AirConditioner' },
  'hvacHeater': { category: 'hvac', option: 'Heater' },
  'hvacVentilation': { category: 'hvac', option: 'Ventilation' },

  // ===== ELECTRICAL (category: electrical, prefix: electrical) =====
  'electricalOutlets': { category: 'electrical', option: 'Outlets' },
  'electricalPanel': { category: 'electrical', option: 'Panel' },
  'electricalWallSwitches': { category: 'electrical', option: 'WallSwitches' },
  'electricalExteriorLighting': { category: 'electrical', option: 'ExteriorLighting' },
  'electricalInteriorLighting': { category: 'electrical', option: 'InteriorLighting' },
  'electricalLightFixtures': { category: 'electrical', option: 'LightFixtures' },
  'electricalFans': { category: 'electrical', option: 'Fans' },

  // ===== FIRE HAZARD (category: fireHazard, prefix: fireHazard) =====
  'fireHazardSmokeAlarms': { category: 'fireHazard', option: 'SmokeAlarms' },
  'fireHazardFireExtinguisher': { category: 'fireHazard', option: 'FireExtinguisher' },
  'fireHazardNoncompliantelectricity': { category: 'fireHazard', option: 'Noncompliantelectricity' },
  'fireHazardNonGFIoutletsnearwater': { category: 'fireHazard', option: 'NonGFIoutletsnearwater' },
  'fireHazardCarbonmonoxidedetectors': { category: 'fireHazard', option: 'Carbonmonoxidedetectors' },

  // ===== GOVERNMENT (category: government, prefix: govEntity) =====
  'govEntityHealthDepartment': { category: 'government', option: 'HealthDepartment' },
  'govEntityHousingAuthority': { category: 'government', option: 'HousingAuthority' },
  'govEntityCodeEnforcement': { category: 'government', option: 'CodeEnforcement' },
  'govEntityFireDepartment': { category: 'government', option: 'FireDepartment' },
  'govEntityPoliceDepartment': { category: 'government', option: 'PoliceDepartment' },
  'govEntityDepartmentofEnvironmentalHealth': { category: 'government', option: 'DepartmentofEnvironmentalHealth' },
  'govEntityDepartmentofHealthServices': { category: 'government', option: 'DepartmentofHealthServices' },

  // ===== APPLIANCES (category: appliances, prefix: appliance) =====
  'applianceStove': { category: 'appliances', option: 'Stove' },
  'applianceDishwasher': { category: 'appliances', option: 'Dishwasher' },
  'applianceWasherdryer': { category: 'appliances', option: 'Washerdryer' },
  'applianceOven': { category: 'appliances', option: 'Oven' },
  'applianceMicrowave': { category: 'appliances', option: 'Microwave' },
  'applianceGarbagedisposal': { category: 'appliances', option: 'Garbagedisposal' },
  'applianceRefrigerator': { category: 'appliances', option: 'Refrigerator' },

  // ===== PLUMBING (category: plumbing, prefix: plumbing) =====
  'plumbingToilet': { category: 'plumbing', option: 'Toilet' },
  'plumbingInsufficientwaterpressure': { category: 'plumbing', option: 'Insufficientwaterpressure' },
  'plumbingCloggedbath': { category: 'plumbing', option: 'Cloggedbath' },
  'plumbingShower': { category: 'plumbing', option: 'Shower' },
  'plumbingNohotwater': { category: 'plumbing', option: 'Nohotwater' },
  'plumbingCloggedsinks': { category: 'plumbing', option: 'Cloggedsinks' },
  'plumbingBath': { category: 'plumbing', option: 'Bath' },
  'plumbingNocoldwater': { category: 'plumbing', option: 'Nocoldwater' },
  'plumbingCloggedshower': { category: 'plumbing', option: 'Cloggedshower' },
  'plumbingFixtures': { category: 'plumbing', option: 'Fixtures' },
  'plumbingSewagecomingout': { category: 'plumbing', option: 'Sewagecomingout' },
  'plumbingNoCleanWaterSupply': { category: 'plumbing', option: 'NoCleanWaterSupply' },
  'plumbingLeaks': { category: 'plumbing', option: 'Leaks' },
  'plumbingCloggedtoilets': { category: 'plumbing', option: 'Cloggedtoilets' },
  'plumbingUnsanitarywater': { category: 'plumbing', option: 'Unsanitarywater' },

  // ===== CABINETS (category: cabinets, prefix: cabinet) =====
  'cabinetBroken': { category: 'cabinets', option: 'Broken' },
  'cabinetHinges': { category: 'cabinets', option: 'Hinges' },
  'cabinetAlignment': { category: 'cabinets', option: 'Alignment' },

  // ===== FLOORING (category: flooring, prefix: flooring) =====
  'flooringUneven': { category: 'flooring', option: 'Uneven' },
  'flooringCarpet': { category: 'flooring', option: 'Carpet' },
  'flooringNailsstickingout': { category: 'flooring', option: 'Nailsstickingout' },
  'flooringTiles': { category: 'flooring', option: 'Tiles' },

  // ===== WINDOWS (category: windows, prefix: window) =====
  'windowBroken': { category: 'windows', option: 'Broken' },
  'windowScreens': { category: 'windows', option: 'Screens' },
  'windowLeaks': { category: 'windows', option: 'Leaks' },
  'windowDonotlock': { category: 'windows', option: 'Donotlock' },
  'windowMissingwindows': { category: 'windows', option: 'Missingwindows' },
  'windowBrokenormissingscreens': { category: 'windows', option: 'Brokenormissingscreens' },

  // ===== DOORS (category: doors, prefix: door) =====
  'doorBroken': { category: 'doors', option: 'Broken' },
  'doorKnobs': { category: 'doors', option: 'Knobs' },
  'doorLocks': { category: 'doors', option: 'Locks' },
  'doorBrokenhinges': { category: 'doors', option: 'Brokenhinges' },
  'doorSlidingglassdoors': { category: 'doors', option: 'Slidingglassdoors' },
  'doorIneffectivewaterproofing': { category: 'doors', option: 'Ineffectivewaterproofing' },
  'doorWaterintrusionandorinsects': { category: 'doors', option: 'Waterintrusionandorinsects' },
  'doorDonotcloseproperly': { category: 'doors', option: 'Donotcloseproperly' },

  // ===== STRUCTURE (category: structure, prefix: structural) =====
  'structuralBumpsinceiling': { category: 'structure', option: 'Bumpsinceiling' },
  'structuralHoleinceiling': { category: 'structure', option: 'Holeinceiling' },
  'structuralWaterstainsonceiling': { category: 'structure', option: 'Waterstainsonceiling' },
  'structuralWaterstainsonwall': { category: 'structure', option: 'Waterstainsonwall' },
  'structuralHoleinwall': { category: 'structure', option: 'Holeinwall' },
  'structuralPaint': { category: 'structure', option: 'Paint' },
  'structuralExteriordeckporch': { category: 'structure', option: 'Exteriordeckporch' },
  'structuralWaterprooftoilet': { category: 'structure', option: 'Waterprooftoilet' },
  'structuralWaterprooftub': { category: 'structure', option: 'Waterprooftub' },
  'structuralStaircase': { category: 'structure', option: 'Staircase' },
  'structuralBasementflood': { category: 'structure', option: 'Basementflood' },
  'structuralLeaksingarage': { category: 'structure', option: 'Leaksingarage' },
  'structuralSoftSpotsduetoLeaks': { category: 'structure', option: 'SoftSpotsduetoLeaks' },
  'structuralUneffectiveWaterproofingofthetubsortoilet': { category: 'structure', option: 'UneffectiveWaterproofingofthetubsortoilet' },
  'structuralIneffectiveWeatherproofingofanywindows': { category: 'structure', option: 'IneffectiveWeatherproofingofanywindows' },

  // ===== COMMON AREAS (category: commonAreas, prefix: commonArea) =====
  'commonAreaMailboxbroken': { category: 'commonAreas', option: 'Mailboxbroken' },
  'commonAreaParkingareaissues': { category: 'commonAreas', option: 'Parkingareaissues' },
  'commonAreaDamagetocars': { category: 'commonAreas', option: 'Damagetocars' },
  'commonAreaFlooding': { category: 'commonAreas', option: 'Flooding' },
  'commonAreaEntrancesblocked': { category: 'commonAreas', option: 'Entrancesblocked' },
  'commonAreaSwimmingpool': { category: 'commonAreas', option: 'Swimmingpool' },
  'commonAreaJacuzzi': { category: 'commonAreas', option: 'Jacuzzi' },
  'commonAreaLaundryroom': { category: 'commonAreas', option: 'Laundryroom' },
  'commonAreaRecreationroom': { category: 'commonAreas', option: 'Recreationroom' },
  'commonAreaGym': { category: 'commonAreas', option: 'Gym' },
  'commonAreaElevator': { category: 'commonAreas', option: 'Elevator' },
  'commonAreaFilthRubbishGarbage': { category: 'commonAreas', option: 'FilthRubbishGarbage' },
  'commonAreaVermin': { category: 'commonAreas', option: 'Vermin' },
  'commonAreaInsects': { category: 'commonAreas', option: 'Insects' },
  'commonAreaBrokenGate': { category: 'commonAreas', option: 'BrokenGate' },
  'commonAreaBlockedareasdoors': { category: 'commonAreas', option: 'Blockedareasdoors' },

  // ===== TRASH (category: trash, prefix: trash) =====
  'trashInadequatenumberofreceptacles': { category: 'trash', option: 'Inadequatenumberofreceptacles' },
  'trashImproperservicingemptying': { category: 'trash', option: 'Improperservicingemptying' },

  // ===== NUISANCE (category: nuisance, prefix: nuisance) =====
  'nuisanceDrugs': { category: 'nuisance', option: 'Drugs' },
  'nuisanceSmoking': { category: 'nuisance', option: 'Smoking' },
  'nuisanceNoisyneighbors': { category: 'nuisance', option: 'Noisyneighbors' },
  'nuisanceGangs': { category: 'nuisance', option: 'Gangs' },

  // ===== HEALTH HAZARD (category: healthHazard, prefix: healthHazard) =====
  'healthHazardMold': { category: 'healthHazard', option: 'Mold' },
  'healthHazardMildew': { category: 'healthHazard', option: 'Mildew' },
  'healthHazardMushrooms': { category: 'healthHazard', option: 'Mushrooms' },
  'healthHazardRawsewageonexterior': { category: 'healthHazard', option: 'Rawsewageonexterior' },
  'healthHazardNoxiousfumes': { category: 'healthHazard', option: 'Noxiousfumes' },
  'healthHazardChemicalpaintcontamination': { category: 'healthHazard', option: 'Chemicalpaintcontamination' },
  'healthHazardToxicwaterpollution': { category: 'healthHazard', option: 'Toxicwaterpollution' },
  'healthHazardOffensiveodors': { category: 'healthHazard', option: 'Offensiveodors' },

  // ===== HARASSMENT (category: harassment, prefix: harassment) =====
  'harassmentUnlawfulDetainer': { category: 'harassment', option: 'UnlawfulDetainer' },
  'harassmentEvictionthreats': { category: 'harassment', option: 'Evictionthreats' },
  'harassmentBydefendant': { category: 'harassment', option: 'Bydefendant' },
  'harassmentBymaintenancemanworkers': { category: 'harassment', option: 'Bymaintenancemanworkers' },
  'harassmentBymanagerbuildingstaff': { category: 'harassment', option: 'Bymanagerbuildingstaff' },
  'harassmentByowner': { category: 'harassment', option: 'Byowner' },
  'harassmentOthertenants': { category: 'harassment', option: 'Othertenants' },
  'harassmentIllegitimatenotices': { category: 'harassment', option: 'Illegitimatenotices' },
  'harassmentRefusaltomaketimelyrepairs': { category: 'harassment', option: 'Refusaltomaketimelyrepairs' },
  'harassmentWrittenthreats': { category: 'harassment', option: 'Writtenthreats' },
  'harassmentAggressiveinappropriatelanguage': { category: 'harassment', option: 'Aggressiveinappropriatelanguage' },
  'harassmentPhysicalthreatsortouching': { category: 'harassment', option: 'Physicalthreatsortouching' },
  'harassmentNoticessinglingoutonetenantbutnotuniformlygiventoalltenants': { category: 'harassment', option: 'Noticessinglingoutonetenantbutnotuniformlygiventoalltenants' },
  'harassmentDuplicativenotices': { category: 'harassment', option: 'Duplicativenotices' },
  'harassmentUntimelyResponsefromLandlord': { category: 'harassment', option: 'UntimelyResponsefromLandlord' },

  // ===== NOTICES (category: notices, prefix: notice) =====
  'notice3day': { category: 'notices', option: '3day' },
  'notice24hour': { category: 'notices', option: '24hour' },
  'notice30day': { category: 'notices', option: '30day' },
  'notice60day': { category: 'notices', option: '60day' },
  'noticeToquit': { category: 'notices', option: 'Toquit' },
  'noticePerformorquit': { category: 'notices', option: 'Performorquit' },

  // ===== UTILITY (category: utility, prefix: utility) =====
  'utilityGasleak': { category: 'utility', option: 'Gasleak' },
  'utilityWatershutoffs': { category: 'utility', option: 'Watershutoffs' },
  'utilityElectricityshutoffs': { category: 'utility', option: 'Electricityshutoffs' },
  'utilityHeatshutoff': { category: 'utility', option: 'Heatshutoff' },
  'utilityGasshutoff': { category: 'utility', option: 'Gasshutoff' },

  // ===== SAFETY (category: safety, prefix: safety) =====
  'safetyBrokeninoperablesecuritygate': { category: 'safety', option: 'Brokeninoperablesecuritygate' },
  'safetyBrokendoors': { category: 'safety', option: 'Brokendoors' },
  'safetyUnauthorizedentries': { category: 'safety', option: 'Unauthorizedentries' },
  'safetyBrokenbuzzertogetin': { category: 'safety', option: 'Brokenbuzzertogetin' },
  'safetySecuritycameras': { category: 'safety', option: 'Securitycameras' },
  'safetyInoperablelocks': { category: 'safety', option: 'Inoperablelocks' }

  // NOTE: The following categories have no options in the database:
  // - injury, nonresponsive, unauthorized, stolen, damaged
  // - ageDiscrim, racialDiscrim, disabilityDiscrim, securityDeposit
  // These are master checkbox only categories (no individual options)
};

/**
 * Extracts issue selections from flat formData structure
 * Returns array of { categoryCode, optionCode }
 */
function extractIssueSelections(formData) {
  const selections = [];

  Object.entries(formData).forEach(([fieldName, value]) => {
    if (value === true && FIELD_TO_OPTION_MAP[fieldName]) {
      const mapping = FIELD_TO_OPTION_MAP[fieldName];
      selections.push({
        categoryCode: mapping.category,
        optionCode: mapping.option
      });
    }
  });

  return selections;
}

/**
 * Extracts issue metadata from flat formData structure
 * Returns object keyed by categoryCode
 */
function extractIssueMetadata(formData) {
  const metadata = {};

  // Define metadata field patterns
  // NOTE: Check both old (ReportedDate) and new (RepairHistory) field names
  const metadataPatterns = [
    { suffix: 'Details', field: 'details' },
    { suffix: 'FirstNoticed', field: 'first_noticed' },
    { suffix: 'ReportedDate', field: 'repair_history' },      // Old field name (legacy)
    { suffix: 'RepairHistory', field: 'repair_history' },     // New field name (Phase 3)
    { suffix: 'Severity', field: 'severity' }                 // Severity field (Phase 4)
  ];

  // Category prefix mapping (maps formData field prefix to database category codes)
  // NOTE: Each category now has INDEPENDENT metadata fields (vermin and insects are separate)
  // NOTE: Some categories use plural forms for Severity/RepairHistory (e.g., appliancesSeverity)
  //       We include both singular and plural prefixes to catch all variants
  const categoryPrefixes = {
    'vermin': ['vermin'],                             // Separate metadata fields for vermin
    'insects': ['insects'],                           // Separate metadata fields for insects
    'hvac': ['hvac'],
    'electrical': ['electrical'],
    'fireHazard': ['fireHazard'],
    'appliance': ['appliances'],                      // applianceDetails, applianceFirstNoticed
    'appliances': ['appliances'],                     // appliancesSeverity, appliancesRepairHistory
    'plumbing': ['plumbing'],
    'cabinet': ['cabinets'],                          // cabinetDetails, cabinetFirstNoticed
    'cabinets': ['cabinets'],                         // cabinetsSeverity, cabinetsRepairHistory
    'flooring': ['flooring'],
    'window': ['windows'],                            // windowDetails, windowFirstNoticed
    'windows': ['windows'],                           // windowsSeverity, windowsRepairHistory
    'door': ['doors'],
    'structural': ['structure'],                      // structuralDetails, structuralSeverity, etc.
    'structure': ['structure'],                       // Alternative prefix
    'commonArea': ['commonAreas'],                    // commonAreaDetails, commonAreaFirstNoticed
    'commonAreas': ['commonAreas'],                   // commonAreasSeverity, commonAreasRepairHistory
    'trash': ['trash'],
    'nuisance': ['nuisance'],
    'healthHazard': ['healthHazard'],
    'harassment': ['harassment'],
    'notice': ['notices'],
    'notices': ['notices'],                           // Alternative prefix for notices
    'utility': ['utility'],
    'safety': ['safety'],
    'security': ['safety'],                           // Maps to 'safety' (no 'security' category in DB)
    'govEntity': ['government'],
    'injury': ['injury'],                             // Master checkbox only
    'nonresponsive': ['nonresponsive'],              // Master checkbox only
    'unauthorized': ['unauthorized'],                 // Master checkbox only
    'stolen': ['stolen'],                             // Master checkbox only
    'damaged': ['damaged'],                           // Master checkbox only
    'ageDiscrim': ['ageDiscrim'],                     // Master checkbox only
    'racialDiscrim': ['racialDiscrim'],               // Master checkbox only
    'disabilityDiscrim': ['disabilityDiscrim'],       // Master checkbox only
    'securityDeposit': ['securityDeposit']            // Master checkbox only
  };

  // Extract metadata for each category
  // NOTE: We MERGE data from multiple prefixes (e.g., appliance + appliances) into the same category
  Object.entries(categoryPrefixes).forEach(([prefix, categories]) => {
    const categoryData = {};
    let hasData = false;

    metadataPatterns.forEach(({ suffix, field }) => {
      const fieldName = prefix + suffix;
      if (formData[fieldName]) {
        categoryData[field] = formData[fieldName];
        hasData = true;
      }
    });

    if (hasData) {
      categories.forEach(categoryCode => {
        // MERGE with existing data instead of overwriting
        if (metadata[categoryCode]) {
          metadata[categoryCode] = { ...metadata[categoryCode], ...categoryData };
        } else {
          metadata[categoryCode] = { ...categoryData };
        }
      });
    }
  });

  return metadata;
}

/**
 * Writes issue selections to intake_issue_selections table
 *
 * @param {object} db - Database pool
 * @param {string} intakeId - UUID of intake record
 * @param {array} selections - Array of { categoryCode, optionCode }
 */
async function writeIssueSelections(db, intakeId, selections) {
  if (selections.length === 0) {
    logger.info('No issue selections to write', { intakeId });
    return;
  }

  try {
    // Get option IDs from database
    const optionCodes = selections.map(s => s.optionCode);
    const optionQuery = `
      SELECT io.id, io.option_code, ic.category_code
      FROM issue_options io
      JOIN issue_categories ic ON io.category_id = ic.id
      WHERE io.option_code = ANY($1::text[])
    `;

    const optionResult = await db.query(optionQuery, [optionCodes]);
    const optionMap = new Map(
      optionResult.rows.map(row => [
        `${row.category_code}-${row.option_code}`,
        row.id
      ])
    );

    // Insert selections
    const insertPromises = selections.map(async ({ categoryCode, optionCode }) => {
      const optionId = optionMap.get(`${categoryCode}-${optionCode}`);

      if (!optionId) {
        logger.warn('Option not found in database', { categoryCode, optionCode });
        return;
      }

      const insertQuery = `
        INSERT INTO intake_issue_selections (intake_id, issue_option_id)
        VALUES ($1, $2)
        ON CONFLICT (intake_id, issue_option_id) DO NOTHING
      `;

      await db.query(insertQuery, [intakeId, optionId]);
    });

    await Promise.all(insertPromises);

    logger.info('Issue selections written successfully', {
      intakeId,
      selectionsCount: selections.length
    });
  } catch (error) {
    logger.error('Error writing issue selections', {
      intakeId,
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
}

/**
 * Writes issue metadata to intake_issue_metadata table
 *
 * @param {object} db - Database pool
 * @param {string} intakeId - UUID of intake record
 * @param {object} metadata - Object keyed by categoryCode
 */
async function writeIssueMetadata(db, intakeId, metadata) {
  const categories = Object.keys(metadata);

  if (categories.length === 0) {
    logger.info('No issue metadata to write', { intakeId });
    return;
  }

  try {
    const insertPromises = categories.map(async (categoryCode) => {
      const data = metadata[categoryCode];

      const insertQuery = `
        INSERT INTO intake_issue_metadata
        (intake_id, category_code, details, first_noticed, repair_history, severity)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (intake_id, category_code)
        DO UPDATE SET
          details = EXCLUDED.details,
          first_noticed = EXCLUDED.first_noticed,
          repair_history = EXCLUDED.repair_history,
          severity = EXCLUDED.severity,
          updated_at = CURRENT_TIMESTAMP
      `;

      await db.query(insertQuery, [
        intakeId,
        categoryCode,
        data.details || null,
        data.first_noticed || null,
        data.repair_history || null,
        data.severity || null
      ]);
    });

    await Promise.all(insertPromises);

    logger.info('Issue metadata written successfully', {
      intakeId,
      categoriesCount: categories.length
    });
  } catch (error) {
    logger.error('Error writing issue metadata', {
      intakeId,
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
}

module.exports = {
  extractIssueSelections,
  extractIssueMetadata,
  writeIssueSelections,
  writeIssueMetadata
};
