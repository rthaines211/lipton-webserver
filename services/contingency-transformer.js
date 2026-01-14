/**
 * Contingency Agreement Form Data Transformer
 *
 * Transforms raw form data from the contingency agreement form into
 * structured format for document generation using docxtemplater.
 *
 * Template Placeholders:
 * - <Plaintiff Full Name>
 * - <Plaintiff Full Address>
 * - <Plaintiff Email Address>
 * - <Plaintiff Phone Number>
 */

class ContingencyTransformer {
  /**
   * Transform raw form data into structured format for document generation
   * @param {Object} formData - Raw form data from HTML form
   * @returns {Object} Transformed data ready for document generation
   */
  static transform(formData) {
    const plaintiffs = this.extractPlaintiffs(formData);
    const defendants = this.extractDefendants(formData);

    return {
      id: formData.id || `CA-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      submittedAt: new Date().toISOString(),
      propertyAddress: formData['property-address'] || formData.propertyAddress || '',
      plaintiffs,
      defendants,
      notificationEmail: formData.notificationEmail || null,
      notificationName: formData.notificationName || null
    };
  }

  /**
   * Extract plaintiffs from form data
   * @param {Object} formData - Raw form data
   * @returns {Array} Array of plaintiff objects
   */
  static extractPlaintiffs(formData) {
    const plaintiffs = [];
    const plaintiffCount = parseInt(formData.plaintiffCount) || 1;

    for (let i = 1; i <= plaintiffCount; i++) {
      const firstName = formData[`plaintiff-${i}-first-name`] || '';
      const lastName = formData[`plaintiff-${i}-last-name`] || '';
      const address = formData[`plaintiff-${i}-address`] || '';
      const unitNumber = formData[`plaintiff-${i}-unit`] || '';
      const email = formData[`plaintiff-${i}-email`] || '';
      const phone = formData[`plaintiff-${i}-phone`] || '';
      const isMinor = formData[`plaintiff-${i}-is-minor`] === 'true' ||
                      formData[`plaintiff-${i}-is-minor`] === true;
      const guardianId = formData[`plaintiff-${i}-guardian`] ?
                         parseInt(formData[`plaintiff-${i}-guardian`]) : null;

      // Format full address with unit number if provided
      let fullAddress = address;
      if (unitNumber) {
        fullAddress += ` Unit ${unitNumber}`;
      }

      const plaintiff = {
        index: i,
        firstName,
        lastName,
        fullName: `${firstName} ${lastName}`.trim(),
        address,
        unitNumber: unitNumber || null,
        fullAddress,
        email,
        phone,
        isMinor,
        guardianId,
        // Document template fields
        plaintiffFullName: `${firstName} ${lastName}`.trim(),
        plaintiffFullAddress: fullAddress,
        plaintiffEmailAddress: email,
        plaintiffPhoneNumber: phone
      };

      plaintiffs.push(plaintiff);
    }

    return plaintiffs;
  }

  /**
   * Extract defendants from form data
   * @param {Object} formData - Raw form data
   * @returns {Array} Array of defendant objects
   */
  static extractDefendants(formData) {
    const defendants = [];
    const defendantCount = parseInt(formData.defendantCount) || 1;

    for (let i = 1; i <= defendantCount; i++) {
      const firstName = formData[`defendant-${i}-first-name`] || '';
      const lastName = formData[`defendant-${i}-last-name`] || '';

      const defendant = {
        index: i,
        firstName,
        lastName,
        fullName: `${firstName} ${lastName}`.trim()
      };

      defendants.push(defendant);
    }

    return defendants;
  }

  /**
   * Transform plaintiff data for docxtemplater template
   * Each plaintiff gets their own agreement document
   * @param {Object} plaintiff - Plaintiff object from extractPlaintiffs
   * @returns {Object} Template data for docxtemplater
   */
  static prepareTemplateData(plaintiff) {
    return {
      'Plaintiff Full Name': plaintiff.plaintiffFullName,
      'Plaintiff Full Address': plaintiff.plaintiffFullAddress,
      'Plaintiff Email Address': plaintiff.plaintiffEmailAddress,
      'Plaintiff Phone Number': plaintiff.plaintiffPhoneNumber
    };
  }

  /**
   * Get file-safe plaintiff name for document naming
   * @param {Object} plaintiff - Plaintiff object
   * @returns {String} File-safe name
   */
  static getPlaintiffFileName(plaintiff) {
    const name = plaintiff.fullName
      .replace(/[^a-zA-Z0-9\s]/g, '')
      .replace(/\s+/g, '_')
      .substring(0, 50);
    return name || `Plaintiff_${plaintiff.index}`;
  }
}

module.exports = ContingencyTransformer;
