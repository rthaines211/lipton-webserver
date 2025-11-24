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
        { id: 'electricalBrokenFans', label: 'Broken fans' },
        { id: 'electricalExteriorLighting', label: 'Exterior lighting issues' },
        { id: 'electricalBrokenLightFixtures', label: 'Broken light fixtures' },
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
        // Vermin (match doc-gen form categories)
        { id: 'pestRats', label: 'Rats' },
        { id: 'pestMice', label: 'Mice' },
        { id: 'pestBats', label: 'Bats' },
        { id: 'pestBirds', label: 'Pigeons/Birds' },
        { id: 'pestSkunks', label: 'Skunks' },
        { id: 'pestRaccoons', label: 'Raccoons' },
        { id: 'pestOpossums', label: 'Opossums' },
        { id: 'pestOtherVermin', label: 'Other vermin' },
        // Insects (match doc-gen form categories)
        { id: 'pestAnts', label: 'Ants' },
        { id: 'pestBedbugs', label: 'Bed bugs' },
        { id: 'pestSpiders', label: 'Spiders' },
        { id: 'pestMosquitos', label: 'Mosquitos' },
        { id: 'pestCockroaches', label: 'Roaches' },
        { id: 'pestWasps', label: 'Wasps' },
        { id: 'pestTermites', label: 'Termites' },
        { id: 'pestBees', label: 'Bees' },
        { id: 'pestFlies', label: 'Flies' },
        { id: 'pestHornets', label: 'Hornets' },
        { id: 'pestOtherInsects', label: 'Other insects' },
      ],
      detailsField: 'pestDetails',
      dateFields: {
        firstNoticed: 'pestFirstNoticed',
        reported: 'pestReportedDate',
      },
    },
    {
      id: 'fireHazard',
      title: 'Fire Hazard Issues',
      masterCheckbox: 'hasFireHazardIssues',
      checkboxes: [
        { id: 'fireHazardExposedWiring', label: 'Exposed wiring' },
        { id: 'fireHazardBlockedExits', label: 'Blocked exits' },
        { id: 'fireHazardNoSmokeDetectors', label: 'No smoke detectors' },
        { id: 'fireHazardBrokenSmokeDetectors', label: 'Broken smoke detectors' },
        { id: 'fireHazardNoFireExtinguisher', label: 'No fire extinguisher' },
        { id: 'fireHazardIneffective', label: 'Ineffective fire safety measures' },
        { id: 'fireHazardOther', label: 'Other fire hazards' },
      ],
      detailsField: 'fireHazardDetails',
      dateFields: {
        firstNoticed: 'fireHazardFirstNoticed',
        reported: 'fireHazardReportedDate',
      },
    },
    {
      id: 'utility',
      title: 'Utility Issues',
      masterCheckbox: 'hasUtilityIssues',
      checkboxes: [
        { id: 'utilityNoHotWater', label: 'No hot water' },
        { id: 'utilityNoHeat', label: 'No heat' },
        { id: 'utilityNoElectricity', label: 'No electricity' },
        { id: 'utilityNoGas', label: 'No gas' },
        { id: 'utilityOther', label: 'Other utility issues' },
      ],
      detailsField: 'utilityDetails',
      dateFields: {
        firstNoticed: 'utilityFirstNoticed',
        reported: 'utilityReportedDate',
      },
    },
    {
      id: 'flooring',
      title: 'Flooring Issues',
      masterCheckbox: 'hasFlooringIssues',
      checkboxes: [
        { id: 'flooringDamaged', label: 'Damaged flooring' },
        { id: 'flooringUneven', label: 'Uneven flooring' },
        { id: 'flooringMissing', label: 'Missing flooring' },
        { id: 'flooringOther', label: 'Other flooring issues' },
      ],
      detailsField: 'flooringDetails',
      dateFields: {
        firstNoticed: 'flooringFirstNoticed',
        reported: 'flooringReportedDate',
      },
    },
    {
      id: 'window',
      title: 'Window Issues',
      masterCheckbox: 'hasWindowIssues',
      checkboxes: [
        { id: 'windowBroken', label: 'Broken windows' },
        { id: 'windowMissing', label: 'Missing windows' },
        { id: 'windowDrafty', label: 'Drafty windows' },
        { id: 'windowNoScreens', label: 'No window screens' },
        { id: 'windowWontOpen', label: 'Windows won\'t open' },
        { id: 'windowOther', label: 'Other window issues' },
      ],
      detailsField: 'windowDetails',
      dateFields: {
        firstNoticed: 'windowFirstNoticed',
        reported: 'windowReportedDate',
      },
    },
    {
      id: 'door',
      title: 'Door Issues',
      masterCheckbox: 'hasDoorIssues',
      checkboxes: [
        { id: 'doorBroken', label: 'Broken doors' },
        { id: 'doorNoLock', label: 'No working lock' },
        { id: 'doorDamaged', label: 'Damaged doors' },
        { id: 'doorWontClose', label: 'Doors won\'t close' },
        { id: 'doorMissing', label: 'Missing doors' },
        { id: 'doorDrafty', label: 'Drafty doors' },
        { id: 'doorNoScreen', label: 'No screen door' },
        { id: 'doorOther', label: 'Other door issues' },
      ],
      detailsField: 'doorDetails',
      dateFields: {
        firstNoticed: 'doorFirstNoticed',
        reported: 'doorReportedDate',
      },
    },
    {
      id: 'cabinet',
      title: 'Cabinet Issues',
      masterCheckbox: 'hasCabinetIssues',
      checkboxes: [
        { id: 'cabinetBroken', label: 'Broken cabinets' },
        { id: 'cabinetMissing', label: 'Missing cabinets' },
        { id: 'cabinetOther', label: 'Other cabinet issues' },
      ],
      detailsField: 'cabinetDetails',
      dateFields: {
        firstNoticed: 'cabinetFirstNoticed',
        reported: 'cabinetReportedDate',
      },
    },
    {
      id: 'commonArea',
      title: 'Common Area Issues',
      masterCheckbox: 'hasCommonAreaIssues',
      checkboxes: [
        { id: 'commonAreaHallwayDirty', label: 'Dirty hallways' },
        { id: 'commonAreaStairsDamaged', label: 'Damaged stairs' },
        { id: 'commonAreaElevatorBroken', label: 'Broken elevator' },
        { id: 'commonAreaLaundryBroken', label: 'Broken laundry' },
        { id: 'commonAreaMailboxBroken', label: 'Broken mailbox' },
        { id: 'commonAreaLightingBroken', label: 'Broken lighting' },
        { id: 'commonAreaNoSecurity', label: 'No security' },
        { id: 'commonAreaDoorsUnlocked', label: 'Building doors unlocked' },
        { id: 'commonAreaIntercomBroken', label: 'Broken intercom' },
        { id: 'commonAreaRoofLeaking', label: 'Roof leaking' },
        { id: 'commonAreaBasementFlooded', label: 'Basement flooded' },
        { id: 'commonAreaGarbageNotCollected', label: 'Garbage not collected' },
        { id: 'commonAreaSnowNotRemoved', label: 'Snow not removed' },
        { id: 'commonAreaNoHeat', label: 'No heat in common areas' },
        { id: 'commonAreaNoHotWater', label: 'No hot water in common areas' },
        { id: 'commonAreaOther', label: 'Other common area issues' },
      ],
      detailsField: 'commonAreaDetails',
      dateFields: {
        firstNoticed: 'commonAreaFirstNoticed',
        reported: 'commonAreaReportedDate',
      },
    },
    {
      id: 'trash',
      title: 'Trash Problems',
      masterCheckbox: 'hasTrashProblems',
      checkboxes: [
        { id: 'trashNotCollected', label: 'Trash not collected' },
        { id: 'trashOverflowing', label: 'Trash overflowing' },
      ],
      detailsField: 'trashDetails',
      dateFields: {
        firstNoticed: 'trashFirstNoticed',
        reported: 'trashReportedDate',
      },
    },
    {
      id: 'nuisance',
      title: 'Nuisance Issues',
      masterCheckbox: 'hasNuisanceIssues',
      checkboxes: [
        { id: 'nuisanceNoise', label: 'Excessive noise' },
        { id: 'nuisanceSmell', label: 'Bad smells' },
        { id: 'nuisanceSmoke', label: 'Smoke' },
        { id: 'nuisanceOther', label: 'Other nuisances' },
      ],
      detailsField: 'nuisanceDetails',
      dateFields: {
        firstNoticed: 'nuisanceFirstNoticed',
        reported: 'nuisanceReportedDate',
      },
    },
    {
      id: 'healthHazard',
      title: 'Health Hazard Issues',
      masterCheckbox: 'hasHealthHazardIssues',
      checkboxes: [
        { id: 'healthHazardMold', label: 'Mold' },
        { id: 'healthHazardLeadPaint', label: 'Lead paint' },
        { id: 'healthHazardAsbestos', label: 'Asbestos' },
        { id: 'healthHazardPoorVentilation', label: 'Poor ventilation' },
        { id: 'healthHazardChemicalSmell', label: 'Chemical smell' },
        { id: 'healthHazardContaminatedWater', label: 'Contaminated water' },
        { id: 'healthHazardOther', label: 'Other health hazards' },
      ],
      detailsField: 'healthHazardDetails',
      dateFields: {
        firstNoticed: 'healthHazardFirstNoticed',
        reported: 'healthHazardReportedDate',
      },
    },
    {
      id: 'governmentEntities',
      title: 'Government Entities Contacted',
      masterCheckbox: 'hasGovernmentEntitiesContacted',
      checkboxes: [
        { id: 'govEntityHPD', label: 'HPD (Housing Preservation & Development)' },
        { id: 'govEntityDOB', label: 'DOB (Department of Buildings)' },
        { id: 'govEntityOATH', label: 'OATH (Office of Administrative Trials & Hearings)' },
        { id: 'govEntityDHCR', label: 'DHCR (Division of Housing & Community Renewal)' },
        { id: 'govEntityDHS', label: 'DHS (Department of Homeless Services)' },
        { id: 'govEntity311', label: '311' },
        { id: 'govEntityOther', label: 'Other government entity' },
      ],
      detailsField: 'governmentEntitiesDetails',
      // NOTE: Government Entities category does NOT have date fields
    },
    {
      id: 'notice',
      title: 'Notice Issues',
      masterCheckbox: 'hasNoticeIssues',
      checkboxes: [
        { id: 'noticeEviction', label: 'Eviction notice' },
        { id: 'noticeRentIncrease', label: 'Rent increase notice' },
        { id: 'noticeLeaseTerm', label: 'Lease termination notice' },
        { id: 'noticeEntry', label: 'Entry notice' },
        { id: 'noticeRepair', label: 'Repair notice' },
        { id: 'noticeOther', label: 'Other notice' },
      ],
      detailsField: 'noticeDetails',
      // NOTE: Notice category does NOT have date fields
    },
    {
      id: 'safety',
      title: 'Safety Issues',
      masterCheckbox: 'hasSafetyIssues',
      checkboxes: [
        { id: 'safetyNoFireExtinguisher', label: 'No fire extinguisher' },
        { id: 'safetyNoEmergencyLighting', label: 'No emergency lighting' },
        { id: 'safetyNoFireEscape', label: 'No fire escape' },
        { id: 'safetyBlockedFireEscape', label: 'Blocked fire escape' },
        { id: 'safetyDamagedFireEscape', label: 'Damaged fire escape' },
        { id: 'safetyOther', label: 'Other safety issues' },
      ],
      detailsField: 'safetyDetails',
      dateFields: {
        firstNoticed: 'safetyFirstNoticed',
        reported: 'safetyReportedDate',
      },
    },
    {
      id: 'harassment',
      title: 'Harassment Issues',
      masterCheckbox: 'hasHarassmentIssues',
      checkboxes: [
        { id: 'harassmentUnlawfulDetainer', label: 'Unlawful Detainer' },
        { id: 'harassmentEvictionThreats', label: 'Eviction threats' },
        { id: 'harassmentByDefendant', label: 'By defendant' },
        { id: 'harassmentByMaintenance', label: 'By maintenance/workers' },
        { id: 'harassmentByManager', label: 'By manager/building staff' },
        { id: 'harassmentByOwner', label: 'By owner' },
        { id: 'harassmentByOtherTenants', label: 'By other tenants' },
        { id: 'harassmentIllegitimateNotices', label: 'Illegitimate notices' },
        { id: 'harassmentRefusalToRepair', label: 'Refusal to make timely repairs' },
        { id: 'harassmentWrittenThreats', label: 'Written threats' },
        { id: 'harassmentAggressiveLanguage', label: 'Aggressive/inappropriate language' },
        { id: 'harassmentPhysicalThreats', label: 'Physical threats or touching' },
        { id: 'harassmentSinglingOut', label: 'Notices singling out one tenant' },
        { id: 'harassmentDuplicativeNotices', label: 'Duplicative notices' },
        { id: 'harassmentUntimelyResponse', label: 'Untimely response from landlord' },
      ],
      detailsField: 'harassmentDetails',
      dateFields: {
        firstNoticed: 'harassmentStartDate',
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
                        {category.id === 'harassment' ? 'When did harassment start?' : 'When did you first notice?'}
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

                    {category.dateFields.reported && (
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
                    )}
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
