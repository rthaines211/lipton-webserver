/**
 * BuildingIssuesRefactored.tsx
 *
 * Bridge component that uses shared IssueCategorySection components
 * while maintaining compatibility with existing IntakeFormExpanded state structure.
 *
 * This allows us to use the new shared UI components without needing to
 * refactor the entire IntakeFormExpanded component at once.
 *
 * Phase 3B: Frontend Refactor
 */

import React from 'react';
import { ISSUE_CATEGORIES } from '../../../shared/config/issue-categories-config';
import { IssueCategorySection } from '../../../shared/components/IssueCategorySection';

interface BuildingIssuesRefactoredProps {
  formData: any;
  handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
}

/**
 * Maps database option codes to actual form field names
 * This handles the mismatch between what the database has and what the form uses
 *
 * Format: { 'categoryCode': { 'OptionCode': 'actualFormFieldName' } }
 */
const OPTION_TO_FIELD_MAP: Record<string, Record<string, string>> = {
  // Vermin - maps ISSUE_CATEGORIES option codes to IntakeFormExpanded formData field names
  'vermin': {
    'RatsMice': 'pestRats',     // Combined in config, use rats field
    'Skunks': 'pestSkunks',
    'Bats': 'pestBats',
    'Raccoons': 'pestRaccoons',
    'Pigeons': 'pestBirds',     // Config says Pigeons, form says Birds
    'Opossums': 'pestOpossums'
  },
  // Insects - maps ISSUE_CATEGORIES option codes to IntakeFormExpanded formData field names
  'insects': {
    'Ants': 'pestAnts',
    'Roaches': 'pestCockroaches',  // Config says Roaches, form says Cockroaches
    'Flies': 'pestFlies',
    'Bedbugs': 'pestBedbugs',
    'Wasps': 'pestWasps',
    'Hornets': 'pestHornets',
    'Spiders': 'pestSpiders',
    'Termites': 'pestTermites',
    'Mosquitos': 'pestMosquitos',
    'Bees': 'pestBees'
  },
  // HVAC - maps to form field names
  'hvac': {
    'AirConditioner': 'hvacNoAirConditioning',
    'Heater': 'hvacNoHeat',
    'Ventilation': 'hvacVentilationPoor'
  },
  // Electrical - maps to form field names
  'electrical': {
    'Outlets': 'electricalBrokenOutlets',
    'Panel': 'electricalCircuitBreakerIssues',
    'WallSwitches': 'electricalBrokenSwitches',
    'ExteriorLighting': 'electricalExteriorLighting',
    'InteriorLighting': 'electricalFlickeringLights',
    'LightFixtures': 'electricalBrokenLightFixtures',
    'Fans': 'electricalBrokenFans'
  },
  // Fire Hazard - maps to form field names
  'fireHazard': {
    'SmokeAlarms': 'fireHazardNoSmokeDetectors',
    'FireExtinguisher': 'fireHazardNoFireExtinguisher',
    'Noncompliantelectricity': 'fireHazardExposedWiring',
    'NonGFIoutletsnearwater': 'fireHazardIneffective',
    'Carbonmonoxidedetectors': 'hvacCarbonMonoxideDetectorMissing'  // CO detectors stored in HVAC section
  },
  // Flooring - maps to form field names (each checkbox saves its own field)
  'flooring': {
    'Uneven': 'flooringUneven',
    'Carpet': 'flooringCarpetDamaged',
    'Nailsstickingout': 'flooringNailsstickingout',
    'Tiles': 'flooringTileBroken',
    'Hardwood': 'flooringHardwoodDamaged',
    'Linoleum': 'flooringLinoleumDamaged',
    'Damage': 'flooringDamaged',
    'Subfloor': 'flooringSubfloorDamaged'
  },
  // Doors - maps to form field names (each checkbox saves its own field)
  'doors': {
    'Broken': 'doorBroken',
    'Knobs': 'doorKnobs',
    'Locks': 'doorNoLock',
    'Brokenhinges': 'doorDamaged',
    'Slidingglassdoors': 'doorSlidingGlass',
    'Ineffectivewaterproofing': 'doorWaterproofing',
    'Waterintrusionandorinsects': 'doorWaterIntrusion',
    'Donotcloseproperly': 'doorWontClose'
  },
  // Trash - maps to form field names
  'trash': {
    'Inadequatenumberofreceptacles': 'trashOverflowing',
    'Improperservicingemptying': 'trashNotCollected'
  },
  // Nuisance - maps to form field names
  'nuisance': {
    'Drugs': 'nuisanceOther',
    'Smoking': 'nuisanceSmoke',
    'Noisyneighbors': 'nuisanceNoise',
    'Gangs': 'nuisanceOther'
  },
  // Health Hazard - maps to form field names (each checkbox saves its own field)
  'healthHazard': {
    'Mold': 'healthHazardMold',
    'Mildew': 'healthHazardMildew',
    'Mushrooms': 'healthHazardMushrooms',
    'Rawsewageonexterior': 'healthHazardRawsewageonexterior',
    'Noxiousfumes': 'healthHazardNoxiousfumes',
    'Chemicalpaintcontamination': 'healthHazardChemicalpaintcontamination',
    'Toxicwaterpollution': 'healthHazardToxicwaterpollution',
    'Offensiveodors': 'healthHazardOffensiveodors',
    'Asbestos': 'healthHazardAsbestos',
    'SewageBackup': 'healthHazardSewageBackup',
    'WaterDamage': 'healthHazardWaterDamage',
    'Flooding': 'healthHazardFlooding',
    'GasLeak': 'healthHazardGasLeak',
    'CarbonMonoxide': 'healthHazardCarbonMonoxide',
    'AirQuality': 'healthHazardAirQuality'
  },
  // Harassment - no direct mapping (uses master checkbox + details)
  'harassment': {},
  // Utility - maps to form field names (each checkbox saves its own field)
  'utility': {
    'Gasleak': 'utilityGasleak',
    'Watershutoffs': 'utilityNoHotWater',
    'Electricityshutoffs': 'utilityNoElectricity',
    'Heatshutoff': 'utilityNoHeat',
    'Gasshutoff': 'utilityNoGas'
  },
  // Safety - maps to form field names (each checkbox saves its own field)
  'safety': {
    'Brokeninoperablesecuritygate': 'securityBrokenGate',
    'Brokendoors': 'securityBrokenDoors',
    'Unauthorizedentries': 'securityBreakIns',
    'Brokenbuzzertogetin': 'safetyBrokenbuzzertogetin',
    'Securitycameras': 'safetySecuritycameras',
    'Inoperablelocks': 'securityBrokenLocks'
  },
  // Common Areas - maps to form field names (each checkbox saves its own field)
  'commonAreas': {
    'Mailboxbroken': 'commonAreaMailboxBroken',
    'Parkingareaissues': 'commonAreaParkingIssue',
    'Damagetocars': 'commonAreaDamagetocars',
    'Flooding': 'commonAreaBasementFlooded',
    'Entrancesblocked': 'commonAreaEntrancesblocked',
    'Swimmingpool': 'commonAreaSwimmingpool',
    'Jacuzzi': 'commonAreaJacuzzi',
    'Laundryroom': 'commonAreaLaundryBroken',
    'Recreationroom': 'commonAreaRecreationroom',
    'Gym': 'commonAreaGym',
    'Elevator': 'commonAreaElevatorBroken',
    'FilthRubbishGarbage': 'commonAreaGarbageNotCollected',
    'Vermin': 'commonAreaVermin',
    'Insects': 'commonAreaInsects',
    'BrokenGate': 'commonAreaBrokenGate',
    'Blockedareasdoors': 'commonAreaBlockedareasdoors'
  },

  // Categories with explicit field name mismatches (already working)
  'appliances': {
    'Stove': 'applianceStove',
    'Dishwasher': 'applianceDishwasher',
    'Washerdryer': 'applianceWasherdryer',
    'Oven': 'applianceOven',
    'Microwave': 'applianceMicrowave',
    'Garbagedisposal': 'applianceGarbagedisposal',
    'Refrigerator': 'applianceRefrigerator'
  },

  'government': {
    'HealthDepartment': 'govEntityHealthDepartment',
    'HousingAuthority': 'govEntityHousingAuthority',
    'CodeEnforcement': 'govEntityCodeEnforcement',
    'FireDepartment': 'govEntityFireDepartment',
    'PoliceDepartment': 'govEntityPoliceDepartment',
    'DepartmentofEnvironmentalHealth': 'govEntityDepartmentofEnvironmentalHealth',
    'DepartmentofHealthServices': 'govEntityDepartmentofHealthServices'
  },

  'plumbing': {
    'Toilet': 'plumbingToilet',
    'Insufficientwaterpressure': 'plumbingInsufficientwaterpressure',
    'Cloggedbath': 'plumbingCloggedbath',
    'Shower': 'plumbingShower',
    'Nohotwater': 'plumbingNohotwater',
    'Cloggedsinks': 'plumbingCloggedsinks',
    'Bath': 'plumbingBath',
    'Nocoldwater': 'plumbingNocoldwater',
    'Cloggedshower': 'plumbingCloggedshower',
    'Fixtures': 'plumbingFixtures',
    'Sewagecomingout': 'plumbingSewagecomingout',
    'NoCleanWaterSupply': 'plumbingNoCleanWaterSupply',
    'Leaks': 'plumbingLeaks',
    'Cloggedtoilets': 'plumbingCloggedtoilets',
    'Unsanitarywater': 'plumbingUnsanitarywater'
  },

  'cabinets': {
    'Broken': 'cabinetBroken',
    'Hinges': 'cabinetHinges',
    'Alignment': 'cabinetAlignment'
  },

  'windows': {
    'Broken': 'windowBroken',
    'Screens': 'windowScreens',
    'Leaks': 'windowLeaks',
    'Donotlock': 'windowDonotlock',
    'Missingwindows': 'windowMissingwindows',
    'Brokenormissingscreens': 'windowBrokenormissingscreens'
  },

  'structure': {
    'Bumpsinceiling': 'structuralBumpsinceiling',
    'Holeinceiling': 'structuralHoleinceiling',
    'Waterstainsonceiling': 'structuralWaterstainsonceiling',
    'Waterstainsonwall': 'structuralWaterstainsonwall',
    'Holeinwall': 'structuralHoleinwall',
    'Paint': 'structuralPaint',
    'Exteriordeckporch': 'structuralExteriordeckporch',
    'Waterprooftoilet': 'structuralWaterprooftoilet',
    'Waterprooftub': 'structuralWaterprooftub',
    'Staircase': 'structuralStaircase',
    'Basementflood': 'structuralBasementflood',
    'Leaksingarage': 'structuralLeaksingarage',
    'SoftSpotsduetoLeaks': 'structuralSoftSpotsduetoLeaks',
    'UneffectiveWaterproofingofthetubsortoilet': 'structuralUneffectiveWaterproofingofthetubsortoilet',
    'IneffectiveWeatherproofingofanywindows': 'structuralIneffectiveWeatherproofingofanywindows'
  },

  'notices': {
    '3day': 'notice3day',
    '24hour': 'notice24hour',
    '30day': 'notice30day',
    '60day': 'notice60day',
    'Toquit': 'noticeToquit',
    'Performorquit': 'noticePerformorquit'
  }
};

export function BuildingIssuesRefactored({ formData, handleChange }: BuildingIssuesRefactoredProps) {
  /**
   * Transform flat formData structure to category-based structure
   * This bridges the old checkbox structure to the new component API
   */
  const getCategoryState = (categoryCode: string) => {
    // Map category codes to their "has" checkbox field names
    const categoryMasterFields: Record<string, string> = {
      'vermin': 'hasPestIssues', // Special case: pest issues covers vermin
      'insects': 'hasPestIssues', // Special case: pest issues covers insects
      'hvac': 'hasHvacIssues',
      'electrical': 'hasElectricalIssues',
      'fireHazard': 'hasFireHazardIssues',
      'government': 'hasGovernmentEntitiesContacted', // Fixed: was 'governmentEntities'
      'appliances': 'hasApplianceIssues',
      'plumbing': 'hasPlumbingIssues',
      'cabinets': 'hasCabinetIssues',
      'flooring': 'hasFlooringIssues',
      'windows': 'hasWindowIssues',
      'doors': 'hasDoorIssues', // Fixed: was 'door'
      'structure': 'hasStructuralIssues',
      'commonAreas': 'hasCommonAreaIssues',
      'trash': 'hasTrashProblems',
      'nuisance': 'hasNuisanceIssues',
      'healthHazard': 'hasHealthHazardIssues',
      'harassment': 'hasHarassmentIssues',
      'notices': 'hasNoticeIssues',
      'utility': 'hasUtilityIssues',
      'safety': 'hasSafetyIssues',
      'injury': 'hasInjuryIssues',
      'nonresponsive': 'hasNonresponsiveIssues',
      'unauthorized': 'hasUnauthorizedIssues',
      'stolen': 'hasStolenIssues',
      'damaged': 'hasDamagedIssues',
      'ageDiscrim': 'hasAgeDiscrimination',
      'racialDiscrim': 'hasRacialDiscrimination',
      'disabilityDiscrim': 'hasDisabilityDiscrimination',
      'securityDeposit': 'hasSecurityDepositIssues'
    };

    return formData[categoryMasterFields[categoryCode]] || false;
  };

  /**
   * Get selected options for a category by checking individual checkbox fields
   * Uses OPTION_TO_FIELD_MAP to handle mismatches between database codes and form field names
   */
  const getSelectedOptions = (categoryCode: string) => {
    const category = ISSUE_CATEGORIES.find(c => c.code === categoryCode);
    if (!category) return [];

    const selected: string[] = [];
    const categoryMapping = OPTION_TO_FIELD_MAP[categoryCode] || {};

    category.options.forEach(option => {
      // First check if there's an explicit mapping for this option
      let fieldName = categoryMapping[option.code];

      // If no explicit mapping, build the field name using prefix + option.code pattern
      if (!fieldName) {
        const prefix = categoryCode === 'vermin' || categoryCode === 'insects' ? 'pest' :
                       categoryCode === 'doors' ? 'door' :
                       categoryCode === 'commonAreas' ? 'commonArea' :
                       categoryCode === 'fireHazard' ? 'fireHazard' :
                       categoryCode === 'healthHazard' ? 'healthHazard' :
                       categoryCode === 'government' ? 'govEntity' :
                       categoryCode === 'injury' ? 'injury' :
                       categoryCode === 'nonresponsive' ? 'nonresponsive' :
                       categoryCode === 'unauthorized' ? 'unauthorized' :
                       categoryCode === 'stolen' ? 'stolen' :
                       categoryCode === 'damaged' ? 'damaged' :
                       categoryCode === 'ageDiscrim' ? 'ageDiscrim' :
                       categoryCode === 'racialDiscrim' ? 'racialDiscrim' :
                       categoryCode === 'disabilityDiscrim' ? 'disabilityDiscrim' :
                       categoryCode === 'securityDeposit' ? 'securityDeposit' :
                       categoryCode;

        fieldName = prefix + option.code;
      }

      // Check if this checkbox is checked in formData
      if (formData[fieldName]) {
        selected.push(option.id);
      }
    });

    return selected;
  };

  /**
   * Get metadata for a category
   * NOTE: Each category gets its own independent metadata fields
   * (vermin and insects are SEPARATE for metadata, unlike option checkboxes)
   */
  const getCategoryMetadata = (categoryCode: string) => {
    // Backend has inconsistent field naming - use explicit mappings for each category
    // Format: { details, firstNoticed, repairHistory, severity }
    const fieldMappings: Record<string, { details: string; firstNoticed: string; repairHistory: string; severity: string }> = {
      'vermin': { details: 'verminDetails', firstNoticed: 'verminFirstNoticed', repairHistory: 'verminRepairHistory', severity: 'verminSeverity' },
      'insects': { details: 'insectsDetails', firstNoticed: 'insectsFirstNoticed', repairHistory: 'insectsRepairHistory', severity: 'insectsSeverity' },
      'hvac': { details: 'hvacDetails', firstNoticed: 'hvacFirstNoticed', repairHistory: 'hvacRepairHistory', severity: 'hvacSeverity' },
      'electrical': { details: 'electricalDetails', firstNoticed: 'electricalFirstNoticed', repairHistory: 'electricalRepairHistory', severity: 'electricalSeverity' },
      'fireHazard': { details: 'fireHazardDetails', firstNoticed: 'fireHazardFirstNoticed', repairHistory: 'fireHazardRepairHistory', severity: 'fireHazardSeverity' },
      'government': { details: 'governmentEntitiesDetails', firstNoticed: 'governmentFirstNoticed', repairHistory: 'governmentRepairHistory', severity: 'governmentSeverity' },
      'appliances': { details: 'applianceDetails', firstNoticed: 'applianceFirstNoticed', repairHistory: 'applianceRepairHistory', severity: 'appliancesSeverity' },
      'plumbing': { details: 'plumbingDetails', firstNoticed: 'plumbingFirstNoticed', repairHistory: 'plumbingRepairHistory', severity: 'plumbingSeverity' },
      'cabinets': { details: 'cabinetDetails', firstNoticed: 'cabinetFirstNoticed', repairHistory: 'cabinetsRepairHistory', severity: 'cabinetsSeverity' },
      'flooring': { details: 'flooringDetails', firstNoticed: 'flooringFirstNoticed', repairHistory: 'flooringRepairHistory', severity: 'flooringSeverity' },
      'windows': { details: 'windowDetails', firstNoticed: 'windowFirstNoticed', repairHistory: 'windowsRepairHistory', severity: 'windowsSeverity' },
      'doors': { details: 'doorDetails', firstNoticed: 'doorFirstNoticed', repairHistory: 'doorsRepairHistory', severity: 'doorsSeverity' },
      'structure': { details: 'structuralDetails', firstNoticed: 'structuralFirstNoticed', repairHistory: 'structuralRepairHistory', severity: 'structuralSeverity' },
      'commonAreas': { details: 'commonAreaDetails', firstNoticed: 'commonAreaFirstNoticed', repairHistory: 'commonAreasRepairHistory', severity: 'commonAreasSeverity' },
      'trash': { details: 'trashDetails', firstNoticed: 'trashFirstNoticed', repairHistory: 'trashRepairHistory', severity: 'trashSeverity' },
      'nuisance': { details: 'nuisanceDetails', firstNoticed: 'nuisanceFirstNoticed', repairHistory: 'nuisanceRepairHistory', severity: 'nuisanceSeverity' },
      'healthHazard': { details: 'healthHazardDetails', firstNoticed: 'healthHazardFirstNoticed', repairHistory: 'healthHazardRepairHistory', severity: 'healthHazardSeverity' },
      'harassment': { details: 'harassmentDetails', firstNoticed: 'harassmentFirstNoticed', repairHistory: 'harassmentRepairHistory', severity: 'harassmentSeverity' },
      'notices': { details: 'noticeDetails', firstNoticed: 'noticesFirstNoticed', repairHistory: 'noticesRepairHistory', severity: 'noticesSeverity' },
      'utility': { details: 'utilityDetails', firstNoticed: 'utilityFirstNoticed', repairHistory: 'utilityRepairHistory', severity: 'utilitySeverity' },
      'safety': { details: 'safetyDetails', firstNoticed: 'safetyFirstNoticed', repairHistory: 'safetyRepairHistory', severity: 'safetySeverity' },
      'injury': { details: 'injuryDetails', firstNoticed: 'injuryFirstNoticed', repairHistory: 'injuryRepairHistory', severity: 'injurySeverity' },
      'nonresponsive': { details: 'nonresponsiveDetails', firstNoticed: 'nonresponsiveFirstNoticed', repairHistory: 'nonresponsiveRepairHistory', severity: 'nonresponsiveSeverity' },
      'unauthorized': { details: 'unauthorizedDetails', firstNoticed: 'unauthorizedFirstNoticed', repairHistory: 'unauthorizedRepairHistory', severity: 'unauthorizedSeverity' },
      'stolen': { details: 'stolenDetails', firstNoticed: 'stolenFirstNoticed', repairHistory: 'stolenRepairHistory', severity: 'stolenSeverity' },
      'damaged': { details: 'damagedDetails', firstNoticed: 'damagedFirstNoticed', repairHistory: 'damagedRepairHistory', severity: 'damagedSeverity' },
      'ageDiscrim': { details: 'ageDiscrimDetails', firstNoticed: 'ageDiscrimFirstNoticed', repairHistory: 'ageDiscrimRepairHistory', severity: 'ageDiscrimSeverity' },
      'racialDiscrim': { details: 'racialDiscrimDetails', firstNoticed: 'racialDiscrimFirstNoticed', repairHistory: 'racialDiscrimRepairHistory', severity: 'racialDiscrimSeverity' },
      'disabilityDiscrim': { details: 'disabilityDiscrimDetails', firstNoticed: 'disabilityDiscrimFirstNoticed', repairHistory: 'disabilityDiscrimRepairHistory', severity: 'disabilityDiscrimSeverity' },
      'securityDeposit': { details: 'securityDepositDetails', firstNoticed: 'securityDepositFirstNoticed', repairHistory: 'securityDepositRepairHistory', severity: 'securityDepositSeverity' }
    };

    const mapping = fieldMappings[categoryCode];
    if (!mapping) {
      // Fallback for unknown categories
      return { details: '', firstNoticed: '', repairHistory: '', severity: '' };
    }

    return {
      details: formData[mapping.details] || '',
      firstNoticed: formData[mapping.firstNoticed] || '',
      repairHistory: formData[mapping.repairHistory] || '',
      severity: formData[mapping.severity] || ''
    };
  };

  /**
   * Handle master checkbox toggle
   */
  const handleToggle = (categoryCode: string, hasIssue: boolean) => {
    const categoryMasterFields: Record<string, string> = {
      'vermin': 'hasPestIssues',
      'insects': 'hasPestIssues',
      'hvac': 'hasHvacIssues',
      'electrical': 'hasElectricalIssues',
      'fireHazard': 'hasFireHazardIssues',
      'government': 'hasGovernmentEntitiesContacted',
      'appliances': 'hasApplianceIssues',
      'plumbing': 'hasPlumbingIssues',
      'cabinets': 'hasCabinetIssues',
      'flooring': 'hasFlooringIssues',
      'windows': 'hasWindowIssues',
      'doors': 'hasDoorIssues',
      'structure': 'hasStructuralIssues',
      'commonAreas': 'hasCommonAreaIssues',
      'trash': 'hasTrashProblems',
      'nuisance': 'hasNuisanceIssues',
      'healthHazard': 'hasHealthHazardIssues',
      'harassment': 'hasHarassmentIssues',
      'notices': 'hasNoticeIssues',
      'utility': 'hasUtilityIssues',
      'safety': 'hasSafetyIssues',
      'injury': 'hasInjuryIssues',
      'nonresponsive': 'hasNonresponsiveIssues',
      'unauthorized': 'hasUnauthorizedIssues',
      'stolen': 'hasStolenIssues',
      'damaged': 'hasDamagedIssues',
      'ageDiscrim': 'hasAgeDiscrimination',
      'racialDiscrim': 'hasRacialDiscrimination',
      'disabilityDiscrim': 'hasDisabilityDiscrimination',
      'securityDeposit': 'hasSecurityDepositIssues'
    };

    const fieldName = categoryMasterFields[categoryCode];
    if (fieldName) {
      handleChange({
        target: {
          name: fieldName,
          type: 'checkbox',
          checked: hasIssue
        }
      } as any);
    }
  };

  /**
   * Handle option checkbox change
   * Uses OPTION_TO_FIELD_MAP to handle mismatches between database codes and form field names
   */
  const handleOptionChange = (categoryCode: string, optionId: string, checked: boolean) => {
    const category = ISSUE_CATEGORIES.find(c => c.code === categoryCode);
    const option = category?.options.find(o => o.id === optionId);

    if (!option) return;

    // Check if there's an explicit mapping for this option
    const categoryMapping = OPTION_TO_FIELD_MAP[categoryCode] || {};
    let fieldName = categoryMapping[option.code];

    // If no explicit mapping, build the field name using prefix + option.code pattern
    if (!fieldName) {
      const prefix = categoryCode === 'vermin' || categoryCode === 'insects' ? 'pest' :
                     categoryCode === 'doors' ? 'door' :
                     categoryCode === 'commonAreas' ? 'commonArea' :
                     categoryCode === 'fireHazard' ? 'fireHazard' :
                     categoryCode === 'healthHazard' ? 'healthHazard' :
                     categoryCode === 'government' ? 'govEntity' :
                     categoryCode === 'injury' ? 'injury' :
                     categoryCode === 'nonresponsive' ? 'nonresponsive' :
                     categoryCode === 'unauthorized' ? 'unauthorized' :
                     categoryCode === 'stolen' ? 'stolen' :
                     categoryCode === 'damaged' ? 'damaged' :
                     categoryCode === 'ageDiscrim' ? 'ageDiscrim' :
                     categoryCode === 'racialDiscrim' ? 'racialDiscrim' :
                     categoryCode === 'disabilityDiscrim' ? 'disabilityDiscrim' :
                     categoryCode === 'securityDeposit' ? 'securityDeposit' :
                     categoryCode;

      fieldName = prefix + option.code;
    }

    handleChange({
      target: {
        name: fieldName,
        type: 'checkbox',
        checked
      }
    } as any);
  };

  /**
   * Handle metadata field changes
   * NOTE: Each category gets its own independent metadata fields
   * (vermin and insects are SEPARATE for metadata, unlike option checkboxes)
   * Uses explicit field mappings to match inconsistent backend naming
   */
  const handleMetadataChange = (categoryCode: string, field: string, value: any) => {
    // Backend has inconsistent field naming - use explicit mappings for each category
    // MUST match getCategoryMetadata() mappings exactly
    const fieldMappings: Record<string, { details: string; firstNoticed: string; repairHistory: string; severity: string }> = {
      'vermin': { details: 'verminDetails', firstNoticed: 'verminFirstNoticed', repairHistory: 'verminRepairHistory', severity: 'verminSeverity' },
      'insects': { details: 'insectsDetails', firstNoticed: 'insectsFirstNoticed', repairHistory: 'insectsRepairHistory', severity: 'insectsSeverity' },
      'hvac': { details: 'hvacDetails', firstNoticed: 'hvacFirstNoticed', repairHistory: 'hvacRepairHistory', severity: 'hvacSeverity' },
      'electrical': { details: 'electricalDetails', firstNoticed: 'electricalFirstNoticed', repairHistory: 'electricalRepairHistory', severity: 'electricalSeverity' },
      'fireHazard': { details: 'fireHazardDetails', firstNoticed: 'fireHazardFirstNoticed', repairHistory: 'fireHazardRepairHistory', severity: 'fireHazardSeverity' },
      'government': { details: 'governmentEntitiesDetails', firstNoticed: 'governmentFirstNoticed', repairHistory: 'governmentRepairHistory', severity: 'governmentSeverity' },
      'appliances': { details: 'applianceDetails', firstNoticed: 'applianceFirstNoticed', repairHistory: 'applianceRepairHistory', severity: 'appliancesSeverity' },
      'plumbing': { details: 'plumbingDetails', firstNoticed: 'plumbingFirstNoticed', repairHistory: 'plumbingRepairHistory', severity: 'plumbingSeverity' },
      'cabinets': { details: 'cabinetDetails', firstNoticed: 'cabinetFirstNoticed', repairHistory: 'cabinetsRepairHistory', severity: 'cabinetsSeverity' },
      'flooring': { details: 'flooringDetails', firstNoticed: 'flooringFirstNoticed', repairHistory: 'flooringRepairHistory', severity: 'flooringSeverity' },
      'windows': { details: 'windowDetails', firstNoticed: 'windowFirstNoticed', repairHistory: 'windowsRepairHistory', severity: 'windowsSeverity' },
      'doors': { details: 'doorDetails', firstNoticed: 'doorFirstNoticed', repairHistory: 'doorsRepairHistory', severity: 'doorsSeverity' },
      'structure': { details: 'structuralDetails', firstNoticed: 'structuralFirstNoticed', repairHistory: 'structuralRepairHistory', severity: 'structuralSeverity' },
      'commonAreas': { details: 'commonAreaDetails', firstNoticed: 'commonAreaFirstNoticed', repairHistory: 'commonAreasRepairHistory', severity: 'commonAreasSeverity' },
      'trash': { details: 'trashDetails', firstNoticed: 'trashFirstNoticed', repairHistory: 'trashRepairHistory', severity: 'trashSeverity' },
      'nuisance': { details: 'nuisanceDetails', firstNoticed: 'nuisanceFirstNoticed', repairHistory: 'nuisanceRepairHistory', severity: 'nuisanceSeverity' },
      'healthHazard': { details: 'healthHazardDetails', firstNoticed: 'healthHazardFirstNoticed', repairHistory: 'healthHazardRepairHistory', severity: 'healthHazardSeverity' },
      'harassment': { details: 'harassmentDetails', firstNoticed: 'harassmentFirstNoticed', repairHistory: 'harassmentRepairHistory', severity: 'harassmentSeverity' },
      'notices': { details: 'noticeDetails', firstNoticed: 'noticesFirstNoticed', repairHistory: 'noticesRepairHistory', severity: 'noticesSeverity' },
      'utility': { details: 'utilityDetails', firstNoticed: 'utilityFirstNoticed', repairHistory: 'utilityRepairHistory', severity: 'utilitySeverity' },
      'safety': { details: 'safetyDetails', firstNoticed: 'safetyFirstNoticed', repairHistory: 'safetyRepairHistory', severity: 'safetySeverity' },
      'injury': { details: 'injuryDetails', firstNoticed: 'injuryFirstNoticed', repairHistory: 'injuryRepairHistory', severity: 'injurySeverity' },
      'nonresponsive': { details: 'nonresponsiveDetails', firstNoticed: 'nonresponsiveFirstNoticed', repairHistory: 'nonresponsiveRepairHistory', severity: 'nonresponsiveSeverity' },
      'unauthorized': { details: 'unauthorizedDetails', firstNoticed: 'unauthorizedFirstNoticed', repairHistory: 'unauthorizedRepairHistory', severity: 'unauthorizedSeverity' },
      'stolen': { details: 'stolenDetails', firstNoticed: 'stolenFirstNoticed', repairHistory: 'stolenRepairHistory', severity: 'stolenSeverity' },
      'damaged': { details: 'damagedDetails', firstNoticed: 'damagedFirstNoticed', repairHistory: 'damagedRepairHistory', severity: 'damagedSeverity' },
      'ageDiscrim': { details: 'ageDiscrimDetails', firstNoticed: 'ageDiscrimFirstNoticed', repairHistory: 'ageDiscrimRepairHistory', severity: 'ageDiscrimSeverity' },
      'racialDiscrim': { details: 'racialDiscrimDetails', firstNoticed: 'racialDiscrimFirstNoticed', repairHistory: 'racialDiscrimRepairHistory', severity: 'racialDiscrimSeverity' },
      'disabilityDiscrim': { details: 'disabilityDiscrimDetails', firstNoticed: 'disabilityDiscrimFirstNoticed', repairHistory: 'disabilityDiscrimRepairHistory', severity: 'disabilityDiscrimSeverity' },
      'securityDeposit': { details: 'securityDepositDetails', firstNoticed: 'securityDepositFirstNoticed', repairHistory: 'securityDepositRepairHistory', severity: 'securityDepositSeverity' }
    };

    const mapping = fieldMappings[categoryCode];
    if (!mapping) {
      console.warn(`No field mapping found for category: ${categoryCode}`);
      return;
    }

    const fieldName = mapping[field as keyof typeof mapping];
    if (fieldName) {
      handleChange({
        target: {
          name: fieldName,
          value,
          type: field === 'details' || field === 'repairHistory' ? 'textarea' :
                field === 'severity' ? 'select' : 'date'
        }
      } as any);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 border-b-2 pb-3">
          Building & Housing Issues
        </h2>
        <p className="text-sm text-gray-600 mt-2">
          Select all issues that apply to your housing situation. Check the relevant category,
          then select specific problems within each category.
        </p>
      </div>

      <div className="space-y-6">
        {ISSUE_CATEGORIES.map((category) => (
          <IssueCategorySection
            key={category.code}
            category={category}
            hasIssue={getCategoryState(category.code)}
            onToggle={(hasIssue) => handleToggle(category.code, hasIssue)}
            selectedOptions={getSelectedOptions(category.code)}
            onOptionChange={(optionId, checked) => handleOptionChange(category.code, optionId, checked)}
            showIntakeExtras={true}
            metadata={getCategoryMetadata(category.code)}
            onMetadataChange={(field, value) => handleMetadataChange(category.code, field as string, value)}
            defaultExpanded={getCategoryState(category.code)}
          />
        ))}
      </div>

      <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mt-6">
        <p className="text-sm text-blue-800">
          <strong>Note:</strong> These issues will be used to build your housing habitability case.
          Be as detailed as possible in describing the problems and their impact on your living conditions.
        </p>
      </div>
    </div>
  );
}
