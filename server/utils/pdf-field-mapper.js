/**
 * PDF Field Mapper Utility
 * Maps form submission JSON data to PDF form fields with transformations
 *
 * @module server/utils/pdf-field-mapper
 */

const logger = require('../../monitoring/logger');
const path = require('path');
const fs = require('fs');

// Load default CM-110 config
const fieldMappingConfig = require('../config/cm110-field-mapping.json');

// Cache for loaded field mapping configs
const fieldMappingCache = {
  'cm110': fieldMappingConfig,
  'cm110-decrypted': fieldMappingConfig
};

/**
 * Load field mapping configuration for a document type
 * @param {string} documentType - Document type (e.g., 'cm110', 'civ109')
 * @returns {Object} Field mapping configuration
 */
function loadFieldMapping(documentType) {
  // Return cached config if available
  if (fieldMappingCache[documentType]) {
    return fieldMappingCache[documentType];
  }

  // Try to load config from file
  const configPath = path.join(__dirname, `../config/${documentType}-field-mapping.json`);

  try {
    if (fs.existsSync(configPath)) {
      const config = require(configPath);
      fieldMappingCache[documentType] = config;
      logger.info(`Loaded field mapping config for ${documentType}`);
      return config;
    }
  } catch (error) {
    logger.warn(`Could not load field mapping for ${documentType}`, { error: error.message });
  }

  // Fall back to default CM-110 config
  logger.warn(`No field mapping found for ${documentType}, using CM-110 default`);
  return fieldMappingConfig;
}

/**
 * Map form data to PDF fields for CIV-109 (Civil Case Addendum)
 * @param {Object} formData - Form submission data
 * @returns {Object} Mapped PDF field values
 */
function mapCiv109Fields(formData) {
  const pdfFields = {};

  try {
    logger.info('Starting CIV-109 field mapping');

    // 1. SHORT TITLE - Format: SMITH v. JONES (with et al. for multiple parties)
    const plaintiffs = formData.PlaintiffDetails || [];
    const defendants = formData.DefendantDetails2 || [];
    const plaintiffLastNames = plaintiffs.map(p => p.PlaintiffItemNumberName?.Last).filter(n => n);
    const defendantLastNames = defendants.map(d => d.DefendantItemNumberName?.Last).filter(n => n);
    const firstPlaintiffLast = plaintiffLastNames[0] || 'PLAINTIFF';
    const firstDefendantLast = defendantLastNames[0] || 'DEFENDANT';
    const plaintiffPart = plaintiffLastNames.length > 1
      ? `${firstPlaintiffLast.toUpperCase()}, et al.`
      : firstPlaintiffLast.toUpperCase();
    const defendantPart = defendantLastNames.length > 1
      ? `${firstDefendantLast.toUpperCase()}, et al.`
      : firstDefendantLast.toUpperCase();
    pdfFields['SHORT TITLE'] = `${plaintiffPart} v. ${defendantPart}`;

    // 2. CITY
    if (formData.Full_Address?.City) {
      pdfFields['CITY'] = formData.Full_Address.City;
    }

    // 3. STATE
    pdfFields['STATE'] = formData.Full_Address?.State || 'CA';

    // 4. ZIP
    if (formData.Full_Address?.PostalCode) {
      pdfFields['ZIP'] = formData.Full_Address.PostalCode;
    }

    // 5. ADDRESSZIP CODE (actually street address)
    if (formData.Full_Address?.Line1) {
      pdfFields['ADDRESSZIP CODE'] = formData.Full_Address.Line1;
    }

    // 6. County/Court field
    const county = formData.FilingCounty || formData['Filing county'];
    if (county) {
      pdfFields['the Superior Court of California County of Los Angeles Code Civ Proc 392 et seq and Local Rule 23a1E'] = county;
    }

    // Skipped fields: CASE NUMBER, Dated, PARCELS1

    logger.info('CIV-109 field mapping complete', { fieldCount: Object.keys(pdfFields).length });
    return pdfFields;
  } catch (error) {
    logger.error('Error mapping CIV-109 fields', { error: error.message });
    throw new Error(`CIV-109 field mapping failed: ${error.message}`);
  }
}

/**
 * Map form data to PDF fields for CM-010 (Civil Case Cover Sheet)
 * @param {Object} formData - Form submission data
 * @returns {Object} Mapped PDF field values
 */
function mapCm010Fields(formData) {
  const pdfFields = {};

  try {
    logger.info('Starting CM-010 field mapping');

    // 1. Court County
    const county = formData.FilingCounty || formData['Filing county'] || '';
    if (county) {
      pdfFields['CM-010[0].Page1[0].P1Caption[0].CourtInfo[0].CrtCounty[0]'] = county;
    }

    // 2. Case Name - Format: SMITH v. JONES (with et al. for multiple parties)
    const plaintiffs = formData.PlaintiffDetails || [];
    const defendants = formData.DefendantDetails2 || [];
    const plaintiffLastNames = plaintiffs.map(p => p.PlaintiffItemNumberName?.Last).filter(n => n);
    const defendantLastNames = defendants.map(d => d.DefendantItemNumberName?.Last).filter(n => n);
    const firstPlaintiffLast = plaintiffLastNames[0] || 'PLAINTIFF';
    const firstDefendantLast = defendantLastNames[0] || 'DEFENDANT';
    const plaintiffPart = plaintiffLastNames.length > 1
      ? `${firstPlaintiffLast.toUpperCase()}, et al.`
      : firstPlaintiffLast.toUpperCase();
    const defendantPart = defendantLastNames.length > 1
      ? `${firstDefendantLast.toUpperCase()}, et al.`
      : firstDefendantLast.toUpperCase();
    pdfFields['CM-010[0].Page1[0].P1Caption[0].TitlePartyName[0].Party1[0]'] =
      `${plaintiffPart} v. ${defendantPart}`;

    logger.info('CM-010 field mapping complete', { fieldCount: Object.keys(pdfFields).length });
    return pdfFields;
  } catch (error) {
    logger.error('Error mapping CM-010 fields', { error: error.message });
    throw new Error(`CM-010 field mapping failed: ${error.message}`);
  }
}

/**
 * Map form data to PDF fields for SUM-100 (Summons)
 * @param {Object} formData - Form submission data
 * @returns {Object} Mapped PDF field values
 */
function mapSum100Fields(formData) {
  const pdfFields = {};

  try {
    logger.info('Starting SUM-100 field mapping');

    // Get all plaintiff names
    const plaintiffs = formData.PlaintiffDetails || [];
    const plaintiffNames = plaintiffs
      .map(p => p.PlaintiffItemNumberName?.FirstAndLast)
      .filter(name => name && name.length > 0);

    // Get all defendant names
    const defendants = formData.DefendantDetails2 || [];
    const defendantNames = defendants
      .map(d => d.DefendantItemNumberName?.FirstAndLast)
      .filter(name => name && name.length > 0);

    // Format plaintiff string with "et al." if 3+ parties
    let plaintiffText = '';
    if (plaintiffNames.length === 0) {
      plaintiffText = 'PLAINTIFF';
    } else if (plaintiffNames.length === 1) {
      plaintiffText = plaintiffNames[0].toUpperCase();
    } else if (plaintiffNames.length === 2) {
      plaintiffText = plaintiffNames.map(n => n.toUpperCase()).join(' AND ');
    } else {
      plaintiffText = `${plaintiffNames[0].toUpperCase()}, et al.`;
    }

    // Format defendant string with "et al." if 3+ parties
    let defendantText = '';
    if (defendantNames.length === 0) {
      defendantText = 'DEFENDANT';
    } else if (defendantNames.length === 1) {
      defendantText = defendantNames[0].toUpperCase();
    } else if (defendantNames.length === 2) {
      defendantText = defendantNames.map(n => n.toUpperCase()).join(' AND ');
    } else {
      defendantText = `${defendantNames[0].toUpperCase()}, et al.`;
    }

    // 1. "YOU ARE BEING SUED BY" - Plaintiff(s)
    pdfFields['SUM-100[0].Page1[0].Notice[0].FillText180[0]'] = plaintiffText;

    // 2. "NOTICE TO DEFENDANT" - Defendant(s)
    pdfFields['SUM-100[0].Page1[0].Notice[0].FillText25[0]'] = defendantText;

    logger.info('SUM-100 field mapping complete', { fieldCount: Object.keys(pdfFields).length });
    return pdfFields;
  } catch (error) {
    logger.error('Error mapping SUM-100 fields', { error: error.message });
    throw new Error(`SUM-100 field mapping failed: ${error.message}`);
  }
}

/**
 * Map form data to PDF fields for SUM-200A (Additional Parties Attachment)
 * @param {Object} formData - Form submission data
 * @returns {Object} Mapped PDF field values
 */
function mapSum200aFields(formData) {
  const pdfFields = {};

  try {
    logger.info('Starting SUM-200A field mapping');

    // Get party names
    const plaintiffs = formData.PlaintiffDetails || [];
    const defendants = formData.DefendantDetails2 || [];

    // Get last names for short title
    const plaintiffLastNames = plaintiffs
      .map(p => p.PlaintiffItemNumberName?.Last)
      .filter(name => name && name.length > 0);

    const defendantLastNames = defendants
      .map(d => d.DefendantItemNumberName?.Last)
      .filter(name => name && name.length > 0);

    // Get full names for additional parties list
    const plaintiffNames = plaintiffs
      .map(p => p.PlaintiffItemNumberName?.FirstAndLast)
      .filter(name => name && name.length > 0);

    const defendantNames = defendants
      .map(d => d.DefendantItemNumberName?.FirstAndLast)
      .filter(name => name && name.length > 0);

    // 1. SHORT TITLE - Format: SMITH v. JONES (with et al. for multiple parties)
    // Single v Single: SMITH v. JONES
    // Multiple v Single: SMITH, et al. v. JONES
    // Single v Multiple: SMITH v. JONES, et al.
    // Multiple v Multiple: SMITH, et al. v. JONES, et al.
    const firstPlaintiffLast = plaintiffLastNames[0] || 'PLAINTIFF';
    const firstDefendantLast = defendantLastNames[0] || 'DEFENDANT';
    const plaintiffPart = plaintiffLastNames.length > 1
      ? `${firstPlaintiffLast.toUpperCase()}, et al.`
      : firstPlaintiffLast.toUpperCase();
    const defendantPart = defendantLastNames.length > 1
      ? `${firstDefendantLast.toUpperCase()}, et al.`
      : firstDefendantLast.toUpperCase();
    pdfFields['SUM-200A[0].Page1[0].pxCaption[0].TitlePartyName[0].ShortTitle[0]'] =
      `${plaintiffPart} v. ${defendantPart}`;

    // 2. CASE NUMBER - Leave blank for pre-filing
    // pdfFields['SUM-200A[0].Page1[0].pxCaption[0].CaseNumber[0].CaseNumber[0]'] = '';

    // 3. Determine if this is for additional plaintiffs or defendants
    // If more than 1 plaintiff, list additional plaintiffs
    // If more than 1 defendant, list additional defendants
    // Priority: defendants (more common to have multiple defendants)
    let additionalPartiesText = '';
    let partyTypeCheckbox = null;

    if (defendantNames.length > 1) {
      // List additional defendants (skip first one)
      additionalPartiesText = defendantNames.slice(1).join('\n');
      partyTypeCheckbox = 1; // Defendant checkbox
    } else if (plaintiffNames.length > 1) {
      // List additional plaintiffs (skip first one)
      additionalPartiesText = plaintiffNames.slice(1).join('\n');
      partyTypeCheckbox = 0; // Plaintiff checkbox
    }

    // 4. Additional Parties List
    if (additionalPartiesText) {
      pdfFields['SUM-200A[0].Page1[0].List[0].items[0].FillText5[0]'] = additionalPartiesText;
    }

    // 5. Party Type Checkboxes (Plaintiff=0, Defendant=1, Cross-Complainant=2, Cross-Defendant=3)
    if (partyTypeCheckbox !== null) {
      pdfFields[`SUM-200A[0].Page1[0].List[0].items[0].Ch1[${partyTypeCheckbox}]`] = '1';
    }

    logger.info('SUM-200A field mapping complete', {
      fieldCount: Object.keys(pdfFields).length,
      additionalParties: additionalPartiesText ? additionalPartiesText.split('\n').length : 0
    });
    return pdfFields;
  } catch (error) {
    logger.error('Error mapping SUM-200A fields', { error: error.message });
    throw new Error(`SUM-200A field mapping failed: ${error.message}`);
  }
}

/**
 * Map form data to PDF fields for CIV-010 (Application for Appointment of Guardian Ad Litem)
 * @param {Object} formData - Form submission data
 * @param {Object} childPlaintiffData - Optional specific child plaintiff data (for multi-child cases)
 * @returns {Object} Mapped PDF field values
 */
function mapCiv010Fields(formData, childPlaintiffData = null) {
  const pdfFields = {};

  try {
    logger.info('Starting CIV-010 field mapping');

    // If specific child plaintiff data is passed, use it; otherwise find first child
    let childPlaintiff = childPlaintiffData;
    if (!childPlaintiff) {
      const plaintiffs = formData.PlaintiffDetails || [];
      // PlaintiffItemNumberAgeCategory is an array (e.g., ["Child"] or ["Adult"])
      childPlaintiff = plaintiffs.find(p => {
        const ageCategory = p.PlaintiffItemNumberAgeCategory;
        return Array.isArray(ageCategory) && ageCategory.includes('Child');
      });
    }
    const childName = childPlaintiff?.PlaintiffItemNumberName?.FirstAndLast || '';

    // Get all defendant names
    const defendants = formData.DefendantDetails2 || [];
    const defendantNames = defendants
      .map(d => d.DefendantItemNumberName?.FirstAndLast)
      .filter(name => name && name.length > 0)
      .join('; ');

    // 1. Court County (Page 1)
    const county = formData.FilingCounty || formData['Filing county'] || '';
    if (county) {
      pdfFields['CIV-010[0].Page1[0].P1Header_sf[0].CourtInfo[0].CrtCounty[0]'] = county;
    }

    // 2. Plaintiff/Petitioner - Child plaintiff name only (Page 1)
    if (childName) {
      pdfFields['CIV-010[0].Page1[0].P1Header_sf[0].TitlePartyName[0].Party1_ft[0]'] = childName;
    }

    // 3. Defendant/Respondent - All defendants (Page 1)
    if (defendantNames) {
      pdfFields['CIV-010[0].Page1[0].P1Header_sf[0].TitlePartyName[0].Party2_ft[0]'] = defendantNames;
    }

    // 4. Page 2 Caption - Same as Page 1
    if (childName) {
      pdfFields['CIV-010[0].Page2[0].P2Caption_sf[0].TitlePartyName[0].Party1_ft[0]'] = childName;
    }
    if (defendantNames) {
      pdfFields['CIV-010[0].Page2[0].P2Caption_sf[0].TitlePartyName[0].Party2_ft[0]'] = defendantNames;
    }

    // 5. Attorney Information - Kevin Lipton, ESQ
    pdfFields['CIV-010[0].Page1[0].P1Header_sf[0].AttyPartyInfo[0].Name[0]'] = 'Kevin Lipton, ESQ';
    pdfFields['CIV-010[0].Page1[0].P1Header_sf[0].AttyPartyInfo[0].AttyBarNo[0]'] = '291739';
    pdfFields['CIV-010[0].Page1[0].P1Header_sf[0].AttyPartyInfo[0].AttyFirm[0]'] = 'Lipton Legal Group, A PC';
    pdfFields['CIV-010[0].Page1[0].P1Header_sf[0].AttyPartyInfo[0].Street[0]'] = '9478 W. Olympic Blvd., Suite 308';
    pdfFields['CIV-010[0].Page1[0].P1Header_sf[0].AttyPartyInfo[0].City[0]'] = 'Beverly Hills';
    pdfFields['CIV-010[0].Page1[0].P1Header_sf[0].AttyPartyInfo[0].State[0]'] = 'CA';
    pdfFields['CIV-010[0].Page1[0].P1Header_sf[0].AttyPartyInfo[0].Zip[0]'] = '90212';

    // 6. Attorney For - Child plaintiff name
    if (childName) {
      pdfFields['CIV-010[0].Page1[0].P1Header_sf[0].AttyPartyInfo[0].AttyFor[0]'] = childName;
    }

    logger.info('CIV-010 field mapping complete', {
      fieldCount: Object.keys(pdfFields).length,
      childPlaintiff: childName,
      defendantCount: defendants.length
    });
    return pdfFields;
  } catch (error) {
    logger.error('Error mapping CIV-010 fields', { error: error.message });
    throw new Error(`CIV-010 field mapping failed: ${error.message}`);
  }
}

/**
 * Map form data to PDF fields based on document type
 * @param {Object} formData - Form submission data
 * @param {string} documentType - Document type (e.g., 'cm110', 'civ109')
 * @returns {Object} Mapped PDF field values
 */
function mapFieldsForDocumentType(formData, documentType) {
  logger.info(`Mapping fields for document type: ${documentType}`);

  switch (documentType) {
    case 'civ109':
      return mapCiv109Fields(formData);
    case 'cm010':
      return mapCm010Fields(formData);
    case 'sum100':
      return mapSum100Fields(formData);
    case 'sum200a':
      return mapSum200aFields(formData);
    case 'civ010':
      return mapCiv010Fields(formData);
    case 'cm110':
    case 'cm110-decrypted':
      return mapFormDataToPdfFields(formData, fieldMappingConfig);
    default:
      // Try to load custom mapping, fall back to CM-110
      const fieldMapping = loadFieldMapping(documentType);
      return mapFormDataToPdfFields(formData, fieldMapping);
  }
}

/**
 * Map form data to PDF fields based on configuration
 * @param {Object} formData - Form submission data
 * @param {Object} fieldMapping - Field mapping configuration (optional, defaults to cm110-field-mapping.json)
 * @returns {Object} Mapped PDF field values
 */
function mapFormDataToPdfFields(formData, fieldMapping = fieldMappingConfig) {
  const pdfFields = {};

  try {
    logger.info('Starting PDF field mapping', {
      hasPlaintiffs: !!formData.PlaintiffDetails,
      hasDefendants: !!formData.DefendantDetails2
    });

    // 1. Map plaintiff fields (all 5 pages)
    mapPlaintiffFields(formData, pdfFields, fieldMapping);

    // 2. Map defendant fields (all 5 pages)
    mapDefendantFields(formData, pdfFields, fieldMapping);

    // 3. Map court fields (county, city/zip)
    mapCourtFields(formData, pdfFields, fieldMapping);

    // 4. Map attorney fields (hardcoded Lipton Legal Group)
    mapAttorneyFields(formData, pdfFields, fieldMapping);

    // 5. Map party statement field
    mapPartyStatementFields(formData, pdfFields, fieldMapping);

    logger.info('PDF field mapping complete', { fieldCount: Object.keys(pdfFields).length });

    return pdfFields;
  } catch (error) {
    logger.error('Error mapping form data to PDF fields', { error: error.message, stack: error.stack });
    throw new Error(`Field mapping failed: ${error.message}`);
  }
}

/**
 * Map plaintiff fields to all 5 pages
 * Source: PlaintiffDetails[*].PlaintiffItemNumberName.FirstAndLast
 * Transform: joinMultipleParties (semicolon-separated)
 */
function mapPlaintiffFields(formData, pdfFields, fieldMapping) {
  const plaintiffNames = getPlaintiffNames(formData);

  if (!plaintiffNames) {
    throw new Error('Required field missing: PlaintiffDetails with names');
  }

  // Map to all 5 pages
  Object.entries(fieldMapping.plaintiffFields).forEach(([key, config]) => {
    if (key === 'description') return;

    pdfFields[config.pdfField] = truncateText(plaintiffNames, config.maxLength);
  });

  logger.debug('Mapped plaintiff fields', { plaintiffNames, pages: 5 });
}

/**
 * Map defendant fields to all 5 pages
 * Source: DefendantDetails2[*].DefendantItemNumberName.FirstAndLast
 * Transform: joinMultipleParties (semicolon-separated)
 */
function mapDefendantFields(formData, pdfFields, fieldMapping) {
  const defendantNames = getDefendantNames(formData);

  if (!defendantNames) {
    throw new Error('Required field missing: DefendantDetails2 with names');
  }

  // Map to all 5 pages
  Object.entries(fieldMapping.defendantFields).forEach(([key, config]) => {
    if (key === 'description') return;

    pdfFields[config.pdfField] = truncateText(defendantNames, config.maxLength);
  });

  logger.debug('Mapped defendant fields', { defendantNames, pages: 5 });
}

/**
 * Map court fields (county, city + zip)
 */
function mapCourtFields(formData, pdfFields, fieldMapping) {
  const config = fieldMapping.courtFields;

  // County (required) - check both camelCase (FilingCounty) and spaced ('Filing county') formats
  const county = formData.FilingCounty || formData['Filing county'];
  if (!county) {
    throw new Error('Required field missing: Filing county');
  }
  pdfFields[config.county.pdfField] = truncateText(county, config.county.maxLength);

  // City + Zip (extract zip from Full_Address.PostalCode)
  // Check both camelCase (FilingCity) and spaced ('Filing city') formats
  const city = formData.FilingCity || formData['Filing city'];
  const zip = formData.Full_Address?.PostalCode;

  if (city || zip) {
    const cityZip = cityZipFormat(city, zip);
    pdfFields[config.courtCityZip.pdfField] = truncateText(cityZip, config.courtCityZip.maxLength);
  }

  logger.debug('Mapped court fields', { county, city, zip });

  // Court street, mailing address, branch - skip (not in form data)
}

/**
 * Map attorney fields (hardcoded Lipton Legal Group info)
 */
function mapAttorneyFields(formData, pdfFields, fieldMapping) {
  const config = fieldMapping.attorneyFields;

  // Hardcoded attorney information
  const attorneyInfo = {
    firmName: 'Lipton Legal Group, APC',
    street: '9478 W. Olympic Blvd. Suite #308',
    city: 'Beverly Hills',
    state: 'CA', // 2-letter abbreviation for PDF field maxLength=2
    zip: '90212',
    fax: '(310) 788-3840'
  };

  // Map hardcoded fields
  pdfFields[config.firmName.pdfField] = attorneyInfo.firmName;
  pdfFields[config.street.pdfField] = attorneyInfo.street;
  pdfFields[config.city.pdfField] = attorneyInfo.city;
  pdfFields[config.state.pdfField] = attorneyInfo.state;
  pdfFields[config.zip.pdfField] = attorneyInfo.zip;
  pdfFields[config.fax.pdfField] = attorneyInfo.fax;

  // Attorney For: all plaintiff names (semicolon-separated)
  const plaintiffNames = getPlaintiffNames(formData);
  if (plaintiffNames) {
    pdfFields[config.attorneyFor.pdfField] = truncateText(plaintiffNames, config.attorneyFor.maxLength);
  }

  logger.debug('Mapped attorney fields', { firmName: attorneyInfo.firmName });

  // Leave blank: barNumber, name, phone, email
}

/**
 * Map party statement fields (Section 1, Page 1)
 */
function mapPartyStatementFields(formData, pdfFields, fieldMapping) {
  const config = fieldMapping.partyStatementFields;

  // "This statement is submitted by party [name]"
  // Use first plaintiff name
  if (formData.PlaintiffDetails && formData.PlaintiffDetails.length > 0) {
    const firstPlaintiff = formData.PlaintiffDetails[0].PlaintiffItemNumberName?.FirstAndLast;
    if (firstPlaintiff) {
      pdfFields[config.submittedByPartyName.pdfField] = truncateText(
        firstPlaintiff,
        config.submittedByPartyName.maxLength
      );
      logger.debug('Mapped party statement field', { submittedBy: firstPlaintiff });
    }
  }

  // Complaint filed date and cross-complaint date - skip (leave blank)
}

/**
 * Get all plaintiff names joined with semicolons
 * @param {Object} formData - Form submission data
 * @returns {string|null} Joined plaintiff names or null
 */
function getPlaintiffNames(formData) {
  if (!formData.PlaintiffDetails || !Array.isArray(formData.PlaintiffDetails)) {
    return null;
  }

  const names = formData.PlaintiffDetails
    .map(plaintiff => plaintiff.PlaintiffItemNumberName?.FirstAndLast)
    .filter(name => name && name.length > 0);

  return names.length > 0 ? names.join('; ') : null;
}

/**
 * Get all defendant names joined with semicolons
 * @param {Object} formData - Form submission data
 * @returns {string|null} Joined defendant names or null
 */
function getDefendantNames(formData) {
  if (!formData.DefendantDetails2 || !Array.isArray(formData.DefendantDetails2)) {
    return null;
  }

  const names = formData.DefendantDetails2
    .map(defendant => defendant.DefendantItemNumberName?.FirstAndLast)
    .filter(name => name && name.length > 0);

  return names.length > 0 ? names.join('; ') : null;
}

/**
 * Format city and zip code
 * @param {string} city - City name
 * @param {string} zip - Zip code
 * @returns {string} Formatted city and zip
 */
function cityZipFormat(city, zip) {
  if (!city && !zip) return '';
  if (!zip) return city || '';
  if (!city) return zip || '';
  return `${city} ${zip}`;
}

/**
 * Truncate text to fit PDF field character limits with smart word boundary detection
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Maximum character length
 * @returns {string} Truncated text
 */
function truncateText(text, maxLength) {
  // Handle non-string values
  if (text === null || text === undefined) return '';
  if (typeof text !== 'string') text = String(text);

  // No truncation needed
  if (!maxLength || text.length <= maxLength) return text;

  // Truncate at word boundary if possible
  const truncated = text.substring(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');

  // If there's a space in the last 20% of the string, break there
  if (lastSpace > maxLength * 0.8) {
    return truncated.substring(0, lastSpace) + '...';
  }

  // Otherwise hard truncate with ellipsis
  return truncated.substring(0, maxLength - 3) + '...';
}

/**
 * Map discovery issues to PDF checkboxes
 * @param {Object} discoveryIssues - Discovery issues from form data
 * @returns {Object} Checkbox field mappings
 */
function mapDiscoveryIssuesToCheckboxes(discoveryIssues) {
  // T038: Implement mapDiscoveryIssuesToCheckboxes()
  // Currently skipped per user requirements
  logger.debug('Discovery checkbox mapping skipped (not yet implemented)');
  return {};
}

/**
 * Map discovery issues to PDF text fields
 * @param {Object} discoveryIssues - Discovery issues from form data
 * @returns {Object} Text field mappings for free-form descriptions
 */
function mapDiscoveryIssuesToTextFields(discoveryIssues) {
  // T039: Implement mapDiscoveryIssuesToTextFields()
  // Currently skipped per user requirements
  logger.debug('Discovery text field mapping skipped (not yet implemented)');
  return {};
}

/**
 * Format address for PDF fields
 * @param {Object} addressData - Address data from form submission
 * @returns {Object} Formatted address fields (street, city, county, postalCode)
 */
function formatAddressForPdf(addressData) {
  // T040: Implement formatAddressForPdf()
  if (!addressData) return {};

  return {
    street: addressData.StreetAddress || addressData.Line1 || '',
    city: addressData.City || '',
    state: addressData.State || '',
    postalCode: addressData.PostalCode || '',
    fullAddress: addressData.FullAddress || ''
  };
}

/**
 * Format date for PDF date field requirements
 * @param {string|Date} dateValue - Date value from form submission
 * @returns {string} Formatted date string
 */
function formatDateForPdf(dateValue) {
  // T041: Implement formatDateForPdf()
  if (!dateValue) return '';

  try {
    const date = dateValue instanceof Date ? dateValue : new Date(dateValue);
    if (isNaN(date.getTime())) return '';

    // Format as MM/DD/YYYY for PDF forms
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const year = date.getFullYear();

    return `${month}/${day}/${year}`;
  } catch (error) {
    logger.warn('Date formatting failed', { dateValue, error: error.message });
    return '';
  }
}

/**
 * Convert array to comma-separated list
 * @param {Array} array - Array of items
 * @returns {string} Comma-separated string
 */
function arrayToCommaList(array) {
  if (!Array.isArray(array) || array.length === 0) return '';
  return array.filter(item => item).join(', ');
}

/**
 * Resolve nested JSON path (e.g., "Full_Address.City")
 * @param {Object} obj - Object to traverse
 * @param {string} path - Dot-notation path
 * @returns {*} Value at path or null
 */
function getNestedValue(obj, path) {
  if (!path) return null;

  return path.split('.').reduce((current, key) => {
    return current?.[key];
  }, obj);
}

/**
 * Get all child plaintiffs from form data
 * Used to generate multiple CIV-010 forms for multi-child cases
 * @param {Object} formData - Form submission data
 * @returns {Array} Array of child plaintiff objects
 */
function getChildPlaintiffs(formData) {
  const plaintiffs = formData.PlaintiffDetails || [];
  // PlaintiffItemNumberAgeCategory is an array (e.g., ["Child"] or ["Adult"])
  return plaintiffs.filter(p => {
    const ageCategory = p.PlaintiffItemNumberAgeCategory;
    return Array.isArray(ageCategory) && ageCategory.includes('Child');
  });
}

module.exports = {
  mapFormDataToPdfFields,
  mapFieldsForDocumentType,
  mapCiv109Fields,
  mapCm010Fields,
  mapSum100Fields,
  mapSum200aFields,
  mapCiv010Fields,
  getChildPlaintiffs,
  loadFieldMapping,
  truncateText,
  mapDiscoveryIssuesToCheckboxes,
  mapDiscoveryIssuesToTextFields,
  formatAddressForPdf,
  formatDateForPdf,
  // Export utility functions for testing
  getPlaintiffNames,
  getDefendantNames,
  cityZipFormat,
  arrayToCommaList,
  getNestedValue
};
