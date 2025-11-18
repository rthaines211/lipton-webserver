/**
 * BuildingIssuesCompact.tsx
 *
 * Consolidated building issues component using compact checkbox grid layout
 * similar to the document selection UI. Combines all 5 issue categories
 * (Structural, Plumbing, Electrical, HVAC, Appliance, Security, Pest) into
 * a single step to reduce form screens.
 */

interface BuildingIssuesCompactProps {
  formData: any
  handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void
}

export function BuildingIssuesCompact({ formData, handleChange }: BuildingIssuesCompactProps) {
  // Define all issue categories with their checkboxes
  const issueCategories = [
    {
      id: 'structural',
      title: 'Structural Issues',
      masterCheckbox: 'hasStructuralIssues',
      checkboxes: [
        { id: 'structuralCeilingDamage', label: 'Ceiling damage' },
        { id: 'structuralWallCracks', label: 'Wall cracks' },
        { id: 'structuralFloorDamage', label: 'Floor damage' },
        { id: 'structuralFoundationIssues', label: 'Foundation issues' },
        { id: 'structuralRoofLeaks', label: 'Roof leaks' },
        { id: 'structuralWindowDamage', label: 'Window damage' },
        { id: 'structuralDoorDamage', label: 'Door damage' },
        { id: 'structuralStairsUnsafe', label: 'Unsafe stairs' },
        { id: 'structuralBalconyUnsafe', label: 'Unsafe balcony' },
        { id: 'structuralRailingMissing', label: 'Missing/broken railing' },
        { id: 'structuralOther', label: 'Other' },
      ],
      detailsField: 'structuralDetails',
      dateFields: {
        firstNoticed: 'structuralFirstNoticed',
        reported: 'structuralReportedDate',
      },
    },
    {
      id: 'plumbing',
      title: 'Plumbing & Water Issues',
      masterCheckbox: 'hasPlumbingIssues',
      checkboxes: [
        { id: 'plumbingNoHotWater', label: 'No hot water' },
        { id: 'plumbingNoWater', label: 'No water' },
        { id: 'plumbingLowPressure', label: 'Low water pressure' },
        { id: 'plumbingLeaks', label: 'Leaks' },
        { id: 'plumbingBurstPipes', label: 'Burst pipes' },
        { id: 'plumbingCloggedDrains', label: 'Clogged drains' },
        { id: 'plumbingToiletNotWorking', label: 'Toilet not working' },
        { id: 'plumbingShowerNotWorking', label: 'Shower/tub not working' },
        { id: 'plumbingSinkNotWorking', label: 'Sink not working' },
        { id: 'plumbingSewerBackup', label: 'Sewer backup' },
        { id: 'plumbingWaterDamage', label: 'Water damage' },
        { id: 'plumbingFlooding', label: 'Flooding' },
        { id: 'plumbingWaterDiscoloration', label: 'Water discoloration' },
        { id: 'plumbingOther', label: 'Other' },
      ],
      detailsField: 'plumbingDetails',
      dateFields: {
        firstNoticed: 'plumbingFirstNoticed',
        reported: 'plumbingReportedDate',
      },
    },
    {
      id: 'electrical',
      title: 'Electrical Issues',
      masterCheckbox: 'hasElectricalIssues',
      checkboxes: [
        { id: 'electricalNoPower', label: 'No power' },
        { id: 'electricalPartialOutages', label: 'Partial power outages' },
        { id: 'electricalExposedWiring', label: 'Exposed wiring' },
        { id: 'electricalSparkingOutlets', label: 'Sparking outlets' },
        { id: 'electricalBrokenOutlets', label: 'Broken outlets' },
        { id: 'electricalBrokenSwitches', label: 'Broken light switches' },
        { id: 'electricalFlickeringLights', label: 'Flickering lights' },
        { id: 'electricalCircuitBreakerIssues', label: 'Circuit breaker issues' },
        { id: 'electricalInsufficientOutlets', label: 'Insufficient outlets' },
        { id: 'electricalBurningSmell', label: 'Burning smell' },
        { id: 'electricalOther', label: 'Other' },
      ],
      detailsField: 'electricalDetails',
      dateFields: {
        firstNoticed: 'electricalFirstNoticed',
        reported: 'electricalReportedDate',
      },
    },
    {
      id: 'hvac',
      title: 'HVAC & Heating Issues',
      masterCheckbox: 'hasHvacIssues',
      checkboxes: [
        { id: 'hvacNoHeat', label: 'No heat' },
        { id: 'hvacInadequateHeat', label: 'Inadequate heat' },
        { id: 'hvacNoAirConditioning', label: 'No air conditioning' },
        { id: 'hvacInadequateCooling', label: 'Inadequate cooling' },
        { id: 'hvacBrokenThermostat', label: 'Broken thermostat' },
        { id: 'hvacGasSmell', label: 'Gas smell' },
        { id: 'hvacCarbonMonoxideDetectorMissing', label: 'Missing CO detector' },
        { id: 'hvacVentilationPoor', label: 'Poor ventilation' },
        { id: 'hvacOther', label: 'Other' },
      ],
      detailsField: 'hvacDetails',
      dateFields: {
        firstNoticed: 'hvacFirstNoticed',
        reported: 'hvacReportedDate',
      },
    },
    {
      id: 'appliance',
      title: 'Appliance Issues',
      masterCheckbox: 'hasApplianceIssues',
      checkboxes: [
        { id: 'applianceRefrigeratorBroken', label: 'Refrigerator broken' },
        { id: 'applianceStoveBroken', label: 'Stove broken' },
        { id: 'applianceOvenBroken', label: 'Oven broken' },
        { id: 'applianceDishwasherBroken', label: 'Dishwasher broken' },
        { id: 'applianceGarbageDisposalBroken', label: 'Garbage disposal broken' },
        { id: 'applianceWasherBroken', label: 'Washer broken' },
        { id: 'applianceDryerBroken', label: 'Dryer broken' },
        { id: 'applianceOther', label: 'Other' },
      ],
      detailsField: 'applianceDetails',
    },
    {
      id: 'security',
      title: 'Security Issues',
      masterCheckbox: 'hasSecurityIssues',
      checkboxes: [
        { id: 'securityBrokenLocks', label: 'Broken locks' },
        { id: 'securityBrokenWindows', label: 'Broken windows' },
        { id: 'securityBrokenDoors', label: 'Broken doors' },
        { id: 'securityNoDeadbolt', label: 'No deadbolt' },
        { id: 'securityBrokenGate', label: 'Broken gate/fence' },
        { id: 'securityBrokenIntercom', label: 'Broken intercom' },
        { id: 'securityInadequateLighting', label: 'Inadequate lighting' },
        { id: 'securityNoSmokeDetector', label: 'No smoke detector' },
        { id: 'securityBreakIns', label: 'Break-ins/intrusions' },
        { id: 'securityOther', label: 'Other' },
      ],
      detailsField: 'securityDetails',
    },
    {
      id: 'pest',
      title: 'Pest & Vermin Issues',
      masterCheckbox: 'hasPestIssues',
      checkboxes: [
        { id: 'pestRats', label: 'Rats' },
        { id: 'pestMice', label: 'Mice' },
        { id: 'pestCockroaches', label: 'Cockroaches' },
        { id: 'pestBedbugs', label: 'Bed bugs' },
        { id: 'pestFleas', label: 'Fleas' },
        { id: 'pestAnts', label: 'Ants' },
        { id: 'pestTermites', label: 'Termites' },
        { id: 'pestSpiders', label: 'Spiders' },
        { id: 'pestWasps', label: 'Wasps/hornets' },
        { id: 'pestBees', label: 'Bees' },
        { id: 'pestOtherInsects', label: 'Other insects' },
        { id: 'pestBirds', label: 'Birds' },
        { id: 'pestRaccoons', label: 'Raccoons/possums' },
        { id: 'pestOtherVermin', label: 'Other vermin' },
      ],
      detailsField: 'pestDetails',
      dateFields: {
        firstNoticed: 'pestFirstNoticed',
        reported: 'pestReportedDate',
      },
    },
  ]

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

      <div className="space-y-8">
        {issueCategories.map((category) => (
          <div key={category.id} className="border border-gray-200 rounded-lg p-5 bg-gray-50">
            {/* Category Header with Master Checkbox */}
            <div className="flex items-center mb-4">
              <input
                type="checkbox"
                id={category.masterCheckbox}
                name={category.masterCheckbox}
                checked={formData[category.masterCheckbox]}
                onChange={handleChange}
                className="h-5 w-5 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
              />
              <label
                htmlFor={category.masterCheckbox}
                className="ml-3 text-lg font-semibold text-gray-900 cursor-pointer"
              >
                {category.title}
              </label>
            </div>

            {/* Issue Checkboxes - Shown when master checkbox is checked */}
            {formData[category.masterCheckbox] && (
              <div className="ml-8 space-y-4 border-l-2 border-blue-300 pl-4">
                <p className="text-sm text-gray-600 mb-3">Select all that apply:</p>

                {/* Compact 3-column grid like document selection */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                  {category.checkboxes.map((checkbox) => (
                    <label
                      key={checkbox.id}
                      htmlFor={checkbox.id}
                      className="flex items-center p-2 rounded-md hover:bg-white cursor-pointer transition-colors"
                    >
                      <input
                        type="checkbox"
                        id={checkbox.id}
                        name={checkbox.id}
                        checked={formData[checkbox.id] || false}
                        onChange={handleChange}
                        className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">{checkbox.label}</span>
                    </label>
                  ))}
                </div>

                {/* Details Text Area */}
                <div className="mt-4">
                  <label
                    htmlFor={category.detailsField}
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Additional Details
                  </label>
                  <textarea
                    id={category.detailsField}
                    name={category.detailsField}
                    value={formData[category.detailsField] || ''}
                    onChange={handleChange}
                    rows={3}
                    placeholder="Describe the issues in detail..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Date Fields (if applicable) */}
                {category.dateFields && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    <div>
                      <label
                        htmlFor={category.dateFields.firstNoticed}
                        className="block text-sm font-medium text-gray-700 mb-1"
                      >
                        When did you first notice?
                      </label>
                      <input
                        type="date"
                        id={category.dateFields.firstNoticed}
                        name={category.dateFields.firstNoticed}
                        value={formData[category.dateFields.firstNoticed] || ''}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor={category.dateFields.reported}
                        className="block text-sm font-medium text-gray-700 mb-1"
                      >
                        When did you report it?
                      </label>
                      <input
                        type="date"
                        id={category.dateFields.reported}
                        name={category.dateFields.reported}
                        value={formData[category.dateFields.reported] || ''}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mt-6">
        <p className="text-sm text-blue-800">
          <strong>Note:</strong> These issues will be used to build your housing habitability case.
          Be as detailed as possible in describing the problems and their impact on your living conditions.
        </p>
      </div>
    </div>
  )
}
