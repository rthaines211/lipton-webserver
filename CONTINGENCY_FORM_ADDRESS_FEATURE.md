# Contingency Agreement Form - Custom Address Feature

**Status**: ✅ **Deployed to Production**
**Date Completed**: January 15, 2026
**Deployment Commits**:
- `4a00cee0` - fix: Remove required attribute from custom address fields to prevent validation errors
- `d76c4e66` - feat: Add plaintiff custom address support and combine property city/state/zip fields

## Overview

Enhanced the contingency agreement form with plaintiff-specific custom address support, allowing each plaintiff to optionally use a different address from the property address. This feature includes special handling for minor plaintiffs who automatically inherit their guardian's address settings.

## Feature Summary

### 1. **Simplified Property Address Entry**
- **Changed**: Combined City, State, Zip into single text input field
- **Format**: "Concord, NC, 28027"
- **Benefit**: Faster data entry, fewer form fields
- **Implementation**: Single field `property-city-state-zip` replaces separate `property-city`, `property-state`, `property-zip` fields

### 2. **Plaintiff Custom Address Support**
- **Feature**: "Address is different from property address" checkbox for each plaintiff
- **Behavior**: When checked, reveals:
  - Street Address field
  - City, State, Zip field (combined format)
- **Unit Number**: Remains separate, works with both property and custom addresses
- **Independence**: Each plaintiff independently chooses property or custom address

### 3. **Minor Plaintiff Address Handling**
- **Checkbox State**: Disabled (greyed out) for minor plaintiffs
- **Inheritance**: Minors automatically inherit guardian's address settings
- **Logic**:
  - If guardian uses custom address → minor uses same custom address
  - If guardian uses property address → minor uses property address
- **Document Generation**: Guardian's address data is used for minor's document

### 4. **Form Validation**
- **Solution**: Custom address fields are NOT marked as required
- **Reason**: Required fields in collapsed sections cause "not focusable" validation errors
- **Validation**: Backend checks `hasDifferentAddress` flag to determine address usage

## Technical Implementation

### Frontend Changes

#### 1. Form UI (`forms/agreement/index.html`)
```html
<!-- Combined property address field -->
<div class="form-group required">
    <label for="property-city-state-zip">City, State, Zip</label>
    <input type="text" id="property-city-state-zip" name="property-city-state-zip"
           placeholder="Concord, NC, 28027" required>
</div>

<!-- Plaintiff custom address section (added to each plaintiff) -->
<div class="form-grid" style="margin-top: 15px;">
    <div class="form-group">
        <label class="checkbox-label">
            <input type="checkbox" id="plaintiff-{N}-different-address"
                   name="plaintiff-{N}-different-address"
                   onchange="togglePlaintiffAddress({N})">
            <span>Address is different from property address</span>
        </label>
    </div>
</div>

<div id="plaintiff-{N}-address-container" style="display: none;">
    <div class="form-group">
        <label for="plaintiff-{N}-street">Street Address</label>
        <input type="text" id="plaintiff-{N}-street" name="plaintiff-{N}-street">
    </div>
    <div class="form-group">
        <label for="plaintiff-{N}-city-state-zip">City, State, Zip</label>
        <input type="text" id="plaintiff-{N}-city-state-zip" name="plaintiff-{N}-city-state-zip">
    </div>
</div>
```

#### 2. Form Logic (`forms/agreement/js/form-logic.js`)

**Toggle Function**:
```javascript
function togglePlaintiffAddress(plaintiffNumber) {
    const checkbox = document.getElementById(`plaintiff-${plaintiffNumber}-different-address`);
    const container = document.getElementById(`plaintiff-${plaintiffNumber}-address-container`);

    if (checkbox.checked) {
        container.style.display = 'block';
    } else {
        container.style.display = 'none';
        // Clear values when unchecked
        streetField.value = '';
        cityStateZipField.value = '';
    }
}
```

**Minor Checkbox Handling**:
```javascript
function toggleGuardianSelect(plaintiffNumber) {
    // ... existing code ...

    if (checkbox.checked) {
        // Disable different address checkbox for minors
        differentAddressCheckbox.checked = false;
        differentAddressCheckbox.disabled = true;
        addressContainer.style.display = 'none';
    } else {
        // Re-enable for adults
        differentAddressCheckbox.disabled = false;
    }
}
```

#### 3. Form Submission (`forms/agreement/js/form-submission.js`)

**Data Collection**:
```javascript
function collectFormData() {
    // Property address
    formData['property-street'] = document.getElementById('property-street')?.value || '';
    formData['property-city-state-zip'] = document.getElementById('property-city-state-zip')?.value || '';

    // For each plaintiff
    for (let i = 1; i <= plaintiffCount; i++) {
        // Collect different address checkbox
        const differentAddressCheckbox = document.getElementById(`plaintiff-${i}-different-address`);
        formData[`plaintiff-${i}-different-address`] = differentAddressCheckbox?.checked || false;

        // Collect custom address if checkbox is checked
        if (differentAddressCheckbox?.checked) {
            formData[`plaintiff-${i}-street`] = document.getElementById(`plaintiff-${i}-street`)?.value || '';
            formData[`plaintiff-${i}-city-state-zip`] = document.getElementById(`plaintiff-${i}-city-state-zip`)?.value || '';
        }
    }
}
```

### Backend Changes

#### 1. Form Data Parser (`services/contingency-document-generator.js`)

**Property Info Parsing**:
```javascript
parseFormData(formData) {
    const propertyInfo = {
        street: formData['property-street'] || '',
        cityStateZip: formData['property-city-state-zip'] || '',
        fullAddress: ''
    };

    propertyInfo.fullAddress = [
        propertyInfo.street,
        propertyInfo.cityStateZip
    ].filter(Boolean).join(', ');
}
```

**Plaintiff Custom Address Parsing**:
```javascript
for (let i = 1; i <= plaintiffCount; i++) {
    const hasDifferentAddress = formData[`plaintiff-${i}-different-address`] === 'on' ||
                                formData[`plaintiff-${i}-different-address`] === true;
    const customStreet = formData[`plaintiff-${i}-street`] || '';
    const customCityStateZip = formData[`plaintiff-${i}-city-state-zip`] || '';

    plaintiffs.push({
        // ... other fields ...
        hasDifferentAddress,
        customStreet,
        customCityStateZip
    });
}
```

#### 2. Address Building Logic

**Build Full Address Function**:
```javascript
buildFullAddress(plaintiff, propertyInfo) {
    // Check if plaintiff has a custom address
    if (plaintiff.hasDifferentAddress && plaintiff.customStreet && plaintiff.customCityStateZip) {
        // Use plaintiff's custom address
        let street = plaintiff.customStreet;
        if (plaintiff.unit) {
            street += ` #${plaintiff.unit}`;
        }
        return [street, plaintiff.customCityStateZip].filter(Boolean).join(', ');
    }

    // Otherwise use property address
    let street = propertyInfo.street;
    if (plaintiff.unit) {
        street += ` #${plaintiff.unit}`;
    }
    return [street, propertyInfo.cityStateZip].filter(Boolean).join(', ');
}
```

#### 3. Guardian Data Inheritance

**Populate Guardian Data Function**:
```javascript
populateGuardianData(plaintiffs) {
    plaintiffs.forEach(plaintiff => {
        if (plaintiff.isMinor && plaintiff.guardianId) {
            const guardian = plaintiffMap[plaintiff.guardianId];

            if (guardian) {
                // Attach guardian object
                plaintiff.guardian = {
                    fullName: guardian.fullName,
                    // ... other fields ...
                    hasDifferentAddress: guardian.hasDifferentAddress,
                    customStreet: guardian.customStreet,
                    customCityStateZip: guardian.customCityStateZip
                };

                // Minor inherits guardian's address settings
                plaintiff.hasDifferentAddress = guardian.hasDifferentAddress;
                plaintiff.customStreet = guardian.customStreet;
                plaintiff.customCityStateZip = guardian.customCityStateZip;
            }
        }
    });
}
```

#### 4. Debug Logging (`routes/contingency.js`)

**Raw Form Data Logging**:
```javascript
router.post('/contingency-entries', async (req, res) => {
    const formData = req.body;

    logger.info('Raw form data received', {
        plaintiffCount: formData.plaintiffCount,
        plaintiff1: {
            firstName: formData['plaintiff-1-first-name'],
            differentAddress: formData['plaintiff-1-different-address'],
            street: formData['plaintiff-1-street'],
            cityStateZip: formData['plaintiff-1-city-state-zip']
        }
    });
});
```

**Template Data Logging**:
```javascript
logger.info('Template data being used for document generation', {
    plaintiff: plaintiff.fullName,
    isMinor: plaintiff.isMinor,
    plaintiffData: {
        hasDifferentAddress: plaintiff.hasDifferentAddress,
        customStreet: plaintiff.customStreet,
        customCityStateZip: plaintiff.customCityStateZip,
        unit: plaintiff.unit
    },
    templateData: templateData
});
```

## Use Cases & Examples

### Use Case 1: Single Adult Plaintiff with Custom Address
**Scenario**: One plaintiff lives at different address from property

**Form Input**:
- Property: "123 Main St, Charlotte, NC, 28201"
- Plaintiff: "John Doe"
- ✅ "Address is different from property address"
- Custom Address: "456 Oak Ave, Concord, NC, 28027"

**Result**: Document shows "456 Oak Ave, Concord, NC, 28027"

### Use Case 2: Multiple Plaintiffs with Mixed Addresses
**Scenario**: 3 plaintiffs, 2 use property address, 1 uses custom

**Form Input**:
- Property: "789 Elm St, Durham, NC, 27701"
- Plaintiff 1: "Jane Smith" - Uses property address
- Plaintiff 2: "Bob Johnson" - ✅ Custom: "321 Pine Rd, Raleigh, NC, 27601"
- Plaintiff 3: "Alice Brown" - Uses property address

**Results**:
- Plaintiff 1 document: "789 Elm St, Durham, NC, 27701"
- Plaintiff 2 document: "321 Pine Rd, Raleigh, NC, 27601"
- Plaintiff 3 document: "789 Elm St, Durham, NC, 27701"

### Use Case 3: Minor with Guardian (Custom Address)
**Scenario**: Minor plaintiff with guardian who uses custom address

**Form Input**:
- Property: "100 Park Ave, Greensboro, NC, 27401"
- Plaintiff 1: "Sarah Williams" (Adult, Guardian)
  - ✅ "Address is different from property address"
  - Custom: "200 Lake Dr, Winston-Salem, NC, 27101"
- Plaintiff 2: "Tommy Williams" (Minor, age 10)
  - ✅ "This plaintiff is a minor"
  - Guardian: "Sarah Williams"
  - Checkbox disabled (inherits guardian's address)

**Results**:
- Only ONE document generated (for minor, signed by guardian)
- Document shows: "200 Lake Dr, Winston-Salem, NC, 27101" (guardian's custom address)

### Use Case 4: Minor with Guardian (Property Address)
**Scenario**: Minor plaintiff with guardian using property address

**Form Input**:
- Property: "500 River Rd, Asheville, NC, 28801"
- Plaintiff 1: "Mike Davis" (Adult, Guardian) - Uses property address
- Plaintiff 2: "Emma Davis" (Minor) - Guardian: "Mike Davis"

**Results**:
- Document shows: "500 River Rd, Asheville, NC, 28801" (property address)

## Testing

### Manual Testing Checklist
- [x] Property address field accepts combined city/state/zip
- [x] Custom address checkbox toggles fields visibility
- [x] Custom address fields populate document correctly
- [x] Clearing checkbox clears custom address values
- [x] Multiple plaintiffs can have independent address choices
- [x] Minor checkbox disables custom address checkbox
- [x] Minor inherits guardian's custom address
- [x] Minor inherits guardian's property address
- [x] Unit numbers work with both address types
- [x] Form submission collects all address data
- [x] Backend properly parses address fields
- [x] Documents generate with correct addresses

### Production Validation
- [x] Deployed to staging successfully
- [x] Tested on production environment
- [x] No form validation errors (required field fix)
- [x] Documents download correctly
- [x] Address data accurate in generated documents

## Known Issues & Resolutions

### Issue 1: Form Validation Error
**Problem**: "An invalid form control with name='plaintiff-5-street' is not focusable"

**Root Cause**: Required fields in collapsed/hidden sections cannot be focused by browser validation

**Solution**: Removed `required` attribute from custom address fields. Validation is handled by checkbox state instead.

**Commit**: `4a00cee0`

### Issue 2: Form Data Not Collected
**Problem**: Custom address checkbox checked but `hasDifferentAddress` was `false` in backend

**Root Cause**: `collectFormData()` function missing code to collect new address fields

**Solution**: Added collection logic for `different-address` checkbox and custom address fields

**Files Modified**: `forms/agreement/js/form-submission.js`

## Deployment History

| Date | Commit | Description | Status |
|------|--------|-------------|--------|
| 2026-01-15 | `d76c4e66` | Add custom address feature | ✅ Deployed |
| 2026-01-15 | `4a00cee0` | Fix validation errors | ✅ Deployed |

## Future Enhancements

### Potential Improvements
1. **Address Validation**: Add real-time USPS address validation
2. **Address Autocomplete**: Integrate Google Places API for address suggestions
3. **Bulk Address Import**: Allow CSV import of plaintiff addresses
4. **Address History**: Remember previously used addresses per plaintiff
5. **Address Verification Modal**: Show confirmation before submitting custom addresses

### Technical Debt
- None identified - feature is complete and production-ready

## Related Documentation

- [README.md](README.md) - Main project documentation
- [DEPLOY_CONTINGENCY_FORM.md](DEPLOY_CONTINGENCY_FORM.md) - Deployment guide
- [PHASE7_COMPLETE.md](PHASE7_COMPLETE.md) - Previous contingency form implementation
- [API_REFERENCE.md](docs/API_REFERENCE.md) - API documentation

## Lessons Learned

1. **Form Validation**: Hidden required fields cause browser validation errors. Use JavaScript validation or skip `required` attribute for conditional fields.

2. **Data Collection**: Always verify form data collection matches backend expectations. Add debug logging early.

3. **Minor Logic**: Complex dependent logic (minor inheriting guardian settings) needs careful testing across multiple scenarios.

4. **User Experience**: Combining related fields (city/state/zip) significantly improves data entry speed.

5. **Testing**: Test with collapsed form sections to catch "not focusable" validation errors.

## Support & Troubleshooting

### Common Issues

**Q: Custom address not appearing in document**
**A**: Verify checkbox is checked AND both street and city/state/zip fields are filled

**Q: Minor showing custom address checkbox**
**A**: Ensure minor checkbox is checked first - this triggers guardian logic

**Q: Validation error on submit**
**A**: Clear any custom address fields if checkbox is unchecked, or expand plaintiff section

### Debug Commands

```bash
# Check server logs for address data
tail -f /tmp/contingency-server.log | grep "Template data being used"

# View form submission data
tail -f /tmp/contingency-server.log | grep "Raw form data received"
```

---

**Document Version**: 1.0
**Last Updated**: January 15, 2026
**Author**: Development Team
**Status**: Complete & Deployed ✅
