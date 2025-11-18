// Temporary file with new issue components - to be merged into IntakeFormExpanded.tsx

function ElectricalIssues({ formData, handleChange }: any) {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900 border-b-2 pb-3">Section 11: Electrical Issues</h2>

      <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
        <p className="text-sm text-blue-700">
          Check all electrical problems you are experiencing in your unit.
        </p>
      </div>

      <div className="space-y-2">
        <label className="flex items-center space-x-3 p-3 bg-gray-50 rounded hover:bg-gray-100 cursor-pointer">
          <input
            type="checkbox"
            name="hasElectricalIssues"
            checked={formData.hasElectricalIssues}
            onChange={handleChange}
            className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
          />
          <span className="font-medium text-gray-900">I have electrical issues to report</span>
        </label>
      </div>

      {formData.hasElectricalIssues && (
        <div className="space-y-4 ml-8 border-l-2 border-gray-300 pl-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <label className="flex items-center space-x-2">
              <input type="checkbox" name="electricalNoPower" checked={formData.electricalNoPower} onChange={handleChange} className="w-4 h-4 text-blue-600 rounded" />
              <span className="text-gray-700">No Power/Complete Outage</span>
            </label>

            <label className="flex items-center space-x-2">
              <input type="checkbox" name="electricalPartialOutages" checked={formData.electricalPartialOutages} onChange={handleChange} className="w-4 h-4 text-blue-600 rounded" />
              <span className="text-gray-700">Partial Outages</span>
            </label>

            <label className="flex items-center space-x-2">
              <input type="checkbox" name="electricalExposedWiring" checked={formData.electricalExposedWiring} onChange={handleChange} className="w-4 h-4 text-blue-600 rounded" />
              <span className="text-gray-700">Exposed Wiring</span>
            </label>

            <label className="flex items-center space-x-2">
              <input type="checkbox" name="electricalSparkingOutlets" checked={formData.electricalSparkingOutlets} onChange={handleChange} className="w-4 h-4 text-blue-600 rounded" />
              <span className="text-gray-700">Sparking Outlets</span>
            </label>

            <label className="flex items-center space-x-2">
              <input type="checkbox" name="electricalBrokenOutlets" checked={formData.electricalBrokenOutlets} onChange={handleChange} className="w-4 h-4 text-blue-600 rounded" />
              <span className="text-gray-700">Broken Outlets</span>
            </label>

            <label className="flex items-center space-x-2">
              <input type="checkbox" name="electricalBrokenSwitches" checked={formData.electricalBrokenSwitches} onChange={handleChange} className="w-4 h-4 text-blue-600 rounded" />
              <span className="text-gray-700">Broken Switches</span>
            </label>

            <label className="flex items-center space-x-2">
              <input type="checkbox" name="electricalFlickeringLights" checked={formData.electricalFlickeringLights} onChange={handleChange} className="w-4 h-4 text-blue-600 rounded" />
              <span className="text-gray-700">Flickering Lights</span>
            </label>

            <label className="flex items-center space-x-2">
              <input type="checkbox" name="electricalCircuitBreakerIssues" checked={formData.electricalCircuitBreakerIssues} onChange={handleChange} className="w-4 h-4 text-blue-600 rounded" />
              <span className="text-gray-700">Circuit Breaker Issues</span>
            </label>

            <label className="flex items-center space-x-2">
              <input type="checkbox" name="electricalInsufficientOutlets" checked={formData.electricalInsufficientOutlets} onChange={handleChange} className="w-4 h-4 text-blue-600 rounded" />
              <span className="text-gray-700">Insufficient Outlets</span>
            </label>

            <label className="flex items-center space-x-2">
              <input type="checkbox" name="electricalBurningSmell" checked={formData.electricalBurningSmell} onChange={handleChange} className="w-4 h-4 text-blue-600 rounded" />
              <span className="text-gray-700">Burning Smell</span>
            </label>

            <label className="flex items-center space-x-2">
              <input type="checkbox" name="electricalOther" checked={formData.electricalOther} onChange={handleChange} className="w-4 h-4 text-blue-600 rounded" />
              <span className="text-gray-700">Other Electrical Issues</span>
            </label>
          </div>

          {formData.electricalOther && (
            <div>
              <label htmlFor="electricalOtherDetails" className="block text-sm font-medium text-gray-700 mb-1">
                Please specify other electrical issues
              </label>
              <textarea
                id="electricalOtherDetails"
                name="electricalOtherDetails"
                value={formData.electricalOtherDetails}
                onChange={handleChange}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}

          <div>
            <label htmlFor="electricalDetails" className="block text-sm font-medium text-gray-700 mb-1">
              Additional details about electrical issues
            </label>
            <textarea
              id="electricalDetails"
              name="electricalDetails"
              value={formData.electricalDetails}
              onChange={handleChange}
              rows={3}
              placeholder="Describe the electrical problems, their severity, and how they affect you..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="electricalFirstNoticed" className="block text-sm font-medium text-gray-700 mb-1">
                When did you first notice?
              </label>
              <input
                type="date"
                id="electricalFirstNoticed"
                name="electricalFirstNoticed"
                value={formData.electricalFirstNoticed}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label htmlFor="electricalReportedDate" className="block text-sm font-medium text-gray-700 mb-1">
                When did you report it to landlord?
              </label>
              <input
                type="date"
                id="electricalReportedDate"
                name="electricalReportedDate"
                value={formData.electricalReportedDate}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function HvacIssues({ formData, handleChange }: any) {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900 border-b-2 pb-3">Section 12: HVAC & Heating Issues</h2>

      <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
        <p className="text-sm text-blue-700">
          Check all heating, ventilation, and air conditioning problems you are experiencing.
        </p>
      </div>

      <div className="space-y-2">
        <label className="flex items-center space-x-3 p-3 bg-gray-50 rounded hover:bg-gray-100 cursor-pointer">
          <input
            type="checkbox"
            name="hasHvacIssues"
            checked={formData.hasHvacIssues}
            onChange={handleChange}
            className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
          />
          <span className="font-medium text-gray-900">I have HVAC/heating issues to report</span>
        </label>
      </div>

      {formData.hasHvacIssues && (
        <div className="space-y-4 ml-8 border-l-2 border-gray-300 pl-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <label className="flex items-center space-x-2">
              <input type="checkbox" name="hvacNoHeat" checked={formData.hvacNoHeat} onChange={handleChange} className="w-4 h-4 text-blue-600 rounded" />
              <span className="text-gray-700">No Heat</span>
            </label>

            <label className="flex items-center space-x-2">
              <input type="checkbox" name="hvacInadequateHeat" checked={formData.hvacInadequateHeat} onChange={handleChange} className="w-4 h-4 text-blue-600 rounded" />
              <span className="text-gray-700">Inadequate Heat</span>
            </label>

            <label className="flex items-center space-x-2">
              <input type="checkbox" name="hvacNoAirConditioning" checked={formData.hvacNoAirConditioning} onChange={handleChange} className="w-4 h-4 text-blue-600 rounded" />
              <span className="text-gray-700">No Air Conditioning</span>
            </label>

            <label className="flex items-center space-x-2">
              <input type="checkbox" name="hvacInadequateCooling" checked={formData.hvacInadequateCooling} onChange={handleChange} className="w-4 h-4 text-blue-600 rounded" />
              <span className="text-gray-700">Inadequate Cooling</span>
            </label>

            <label className="flex items-center space-x-2">
              <input type="checkbox" name="hvacBrokenThermostat" checked={formData.hvacBrokenThermostat} onChange={handleChange} className="w-4 h-4 text-blue-600 rounded" />
              <span className="text-gray-700">Broken Thermostat</span>
            </label>

            <label className="flex items-center space-x-2">
              <input type="checkbox" name="hvacGasSmell" checked={formData.hvacGasSmell} onChange={handleChange} className="w-4 h-4 text-blue-600 rounded" />
              <span className="text-gray-700">Gas Smell</span>
            </label>

            <label className="flex items-center space-x-2">
              <input type="checkbox" name="hvacCarbonMonoxideDetectorMissing" checked={formData.hvacCarbonMonoxideDetectorMissing} onChange={handleChange} className="w-4 h-4 text-blue-600 rounded" />
              <span className="text-gray-700">CO Detector Missing</span>
            </label>

            <label className="flex items-center space-x-2">
              <input type="checkbox" name="hvacVentilationPoor" checked={formData.hvacVentilationPoor} onChange={handleChange} className="w-4 h-4 text-blue-600 rounded" />
              <span className="text-gray-700">Poor Ventilation</span>
            </label>

            <label className="flex items-center space-x-2">
              <input type="checkbox" name="hvacOther" checked={formData.hvacOther} onChange={handleChange} className="w-4 h-4 text-blue-600 rounded" />
              <span className="text-gray-700">Other HVAC Issues</span>
            </label>
          </div>

          {formData.hvacOther && (
            <div>
              <label htmlFor="hvacOtherDetails" className="block text-sm font-medium text-gray-700 mb-1">
                Please specify other HVAC issues
              </label>
              <textarea
                id="hvacOtherDetails"
                name="hvacOtherDetails"
                value={formData.hvacOtherDetails}
                onChange={handleChange}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}

          <div>
            <label htmlFor="hvacDetails" className="block text-sm font-medium text-gray-700 mb-1">
              Additional details about HVAC issues
            </label>
            <textarea
              id="hvacDetails"
              name="hvacDetails"
              value={formData.hvacDetails}
              onChange={handleChange}
              rows={3}
              placeholder="Describe the HVAC problems and how they affect your living conditions..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="hvacFirstNoticed" className="block text-sm font-medium text-gray-700 mb-1">
                When did you first notice?
              </label>
              <input
                type="date"
                id="hvacFirstNoticed"
                name="hvacFirstNoticed"
                value={formData.hvacFirstNoticed}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label htmlFor="hvacReportedDate" className="block text-sm font-medium text-gray-700 mb-1">
                When did you report it to landlord?
              </label>
              <input
                type="date"
                id="hvacReportedDate"
                name="hvacReportedDate"
                value={formData.hvacReportedDate}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function ApplianceIssues({ formData, handleChange }: any) {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900 border-b-2 pb-3">Section 13: Appliance Issues</h2>

      <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
        <p className="text-sm text-blue-700">
          Check all appliance problems you are experiencing.
        </p>
      </div>

      <div className="space-y-2">
        <label className="flex items-center space-x-3 p-3 bg-gray-50 rounded hover:bg-gray-100 cursor-pointer">
          <input
            type="checkbox"
            name="hasApplianceIssues"
            checked={formData.hasApplianceIssues}
            onChange={handleChange}
            className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
          />
          <span className="font-medium text-gray-900">I have appliance issues to report</span>
        </label>
      </div>

      {formData.hasApplianceIssues && (
        <div className="space-y-4 ml-8 border-l-2 border-gray-300 pl-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <label className="flex items-center space-x-2">
              <input type="checkbox" name="applianceRefrigeratorBroken" checked={formData.applianceRefrigeratorBroken} onChange={handleChange} className="w-4 h-4 text-blue-600 rounded" />
              <span className="text-gray-700">Refrigerator Broken</span>
            </label>

            <label className="flex items-center space-x-2">
              <input type="checkbox" name="applianceStoveBroken" checked={formData.applianceStoveBroken} onChange={handleChange} className="w-4 h-4 text-blue-600 rounded" />
              <span className="text-gray-700">Stove Broken</span>
            </label>

            <label className="flex items-center space-x-2">
              <input type="checkbox" name="applianceOvenBroken" checked={formData.applianceOvenBroken} onChange={handleChange} className="w-4 h-4 text-blue-600 rounded" />
              <span className="text-gray-700">Oven Broken</span>
            </label>

            <label className="flex items-center space-x-2">
              <input type="checkbox" name="applianceDishwasherBroken" checked={formData.applianceDishwasherBroken} onChange={handleChange} className="w-4 h-4 text-blue-600 rounded" />
              <span className="text-gray-700">Dishwasher Broken</span>
            </label>

            <label className="flex items-center space-x-2">
              <input type="checkbox" name="applianceGarbageDisposalBroken" checked={formData.applianceGarbageDisposalBroken} onChange={handleChange} className="w-4 h-4 text-blue-600 rounded" />
              <span className="text-gray-700">Garbage Disposal Broken</span>
            </label>

            <label className="flex items-center space-x-2">
              <input type="checkbox" name="applianceWasherBroken" checked={formData.applianceWasherBroken} onChange={handleChange} className="w-4 h-4 text-blue-600 rounded" />
              <span className="text-gray-700">Washer Broken</span>
            </label>

            <label className="flex items-center space-x-2">
              <input type="checkbox" name="applianceDryerBroken" checked={formData.applianceDryerBroken} onChange={handleChange} className="w-4 h-4 text-blue-600 rounded" />
              <span className="text-gray-700">Dryer Broken</span>
            </label>

            <label className="flex items-center space-x-2">
              <input type="checkbox" name="applianceOther" checked={formData.applianceOther} onChange={handleChange} className="w-4 h-4 text-blue-600 rounded" />
              <span className="text-gray-700">Other Appliance Issues</span>
            </label>
          </div>

          {formData.applianceOther && (
            <div>
              <label htmlFor="applianceOtherDetails" className="block text-sm font-medium text-gray-700 mb-1">
                Please specify other appliance issues
              </label>
              <textarea
                id="applianceOtherDetails"
                name="applianceOtherDetails"
                value={formData.applianceOtherDetails}
                onChange={handleChange}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}

          <div>
            <label htmlFor="applianceDetails" className="block text-sm font-medium text-gray-700 mb-1">
              Additional details about appliance issues
            </label>
            <textarea
              id="applianceDetails"
              name="applianceDetails"
              value={formData.applianceDetails}
              onChange={handleChange}
              rows={3}
              placeholder="Describe the appliance problems and how they affect you..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      )}
    </div>
  )
}

function SecurityIssues({ formData, handleChange }: any) {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900 border-b-2 pb-3">Section 14: Security Issues</h2>

      <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
        <p className="text-sm text-blue-700">
          Check all security and safety problems you are experiencing.
        </p>
      </div>

      <div className="space-y-2">
        <label className="flex items-center space-x-3 p-3 bg-gray-50 rounded hover:bg-gray-100 cursor-pointer">
          <input
            type="checkbox"
            name="hasSecurityIssues"
            checked={formData.hasSecurityIssues}
            onChange={handleChange}
            className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
          />
          <span className="font-medium text-gray-900">I have security issues to report</span>
        </label>
      </div>

      {formData.hasSecurityIssues && (
        <div className="space-y-4 ml-8 border-l-2 border-gray-300 pl-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <label className="flex items-center space-x-2">
              <input type="checkbox" name="securityBrokenLocks" checked={formData.securityBrokenLocks} onChange={handleChange} className="w-4 h-4 text-blue-600 rounded" />
              <span className="text-gray-700">Broken Locks</span>
            </label>

            <label className="flex items-center space-x-2">
              <input type="checkbox" name="securityBrokenWindows" checked={formData.securityBrokenWindows} onChange={handleChange} className="w-4 h-4 text-blue-600 rounded" />
              <span className="text-gray-700">Broken Windows</span>
            </label>

            <label className="flex items-center space-x-2">
              <input type="checkbox" name="securityBrokenDoors" checked={formData.securityBrokenDoors} onChange={handleChange} className="w-4 h-4 text-blue-600 rounded" />
              <span className="text-gray-700">Broken Doors</span>
            </label>

            <label className="flex items-center space-x-2">
              <input type="checkbox" name="securityNoDeadbolt" checked={formData.securityNoDeadbolt} onChange={handleChange} className="w-4 h-4 text-blue-600 rounded" />
              <span className="text-gray-700">No Deadbolt</span>
            </label>

            <label className="flex items-center space-x-2">
              <input type="checkbox" name="securityBrokenGate" checked={formData.securityBrokenGate} onChange={handleChange} className="w-4 h-4 text-blue-600 rounded" />
              <span className="text-gray-700">Broken Gate</span>
            </label>

            <label className="flex items-center space-x-2">
              <input type="checkbox" name="securityBrokenIntercom" checked={formData.securityBrokenIntercom} onChange={handleChange} className="w-4 h-4 text-blue-600 rounded" />
              <span className="text-gray-700">Broken Intercom</span>
            </label>

            <label className="flex items-center space-x-2">
              <input type="checkbox" name="securityInadequateLighting" checked={formData.securityInadequateLighting} onChange={handleChange} className="w-4 h-4 text-blue-600 rounded" />
              <span className="text-gray-700">Inadequate Lighting</span>
            </label>

            <label className="flex items-center space-x-2">
              <input type="checkbox" name="securityNoSmokeDetector" checked={formData.securityNoSmokeDetector} onChange={handleChange} className="w-4 h-4 text-blue-600 rounded" />
              <span className="text-gray-700">No Smoke Detector</span>
            </label>

            <label className="flex items-center space-x-2">
              <input type="checkbox" name="securityBreakIns" checked={formData.securityBreakIns} onChange={handleChange} className="w-4 h-4 text-blue-600 rounded" />
              <span className="text-gray-700">History of Break-ins</span>
            </label>

            <label className="flex items-center space-x-2">
              <input type="checkbox" name="securityOther" checked={formData.securityOther} onChange={handleChange} className="w-4 h-4 text-blue-600 rounded" />
              <span className="text-gray-700">Other Security Issues</span>
            </label>
          </div>

          {formData.securityOther && (
            <div>
              <label htmlFor="securityOtherDetails" className="block text-sm font-medium text-gray-700 mb-1">
                Please specify other security issues
              </label>
              <textarea
                id="securityOtherDetails"
                name="securityOtherDetails"
                value={formData.securityOtherDetails}
                onChange={handleChange}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}

          <div>
            <label htmlFor="securityDetails" className="block text-sm font-medium text-gray-700 mb-1">
              Additional details about security issues
            </label>
            <textarea
              id="securityDetails"
              name="securityDetails"
              value={formData.securityDetails}
              onChange={handleChange}
              rows={3}
              placeholder="Describe the security problems and any safety concerns..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      )}
    </div>
  )
}

function PestIssues({ formData, handleChange }: any) {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900 border-b-2 pb-3">Section 15: Pest & Vermin Issues</h2>

      <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
        <p className="text-sm text-blue-700">
          Check all pest or vermin problems you are experiencing in your unit.
        </p>
      </div>

      <div className="space-y-2">
        <label className="flex items-center space-x-3 p-3 bg-gray-50 rounded hover:bg-gray-100 cursor-pointer">
          <input
            type="checkbox"
            name="hasPestIssues"
            checked={formData.hasPestIssues}
            onChange={handleChange}
            className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
          />
          <span className="font-medium text-gray-900">I have pest/vermin issues to report</span>
        </label>
      </div>

      {formData.hasPestIssues && (
        <div className="space-y-4 ml-8 border-l-2 border-gray-300 pl-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <label className="flex items-center space-x-2">
              <input type="checkbox" name="pestRats" checked={formData.pestRats} onChange={handleChange} className="w-4 h-4 text-blue-600 rounded" />
              <span className="text-gray-700">Rats</span>
            </label>

            <label className="flex items-center space-x-2">
              <input type="checkbox" name="pestMice" checked={formData.pestMice} onChange={handleChange} className="w-4 h-4 text-blue-600 rounded" />
              <span className="text-gray-700">Mice</span>
            </label>

            <label className="flex items-center space-x-2">
              <input type="checkbox" name="pestCockroaches" checked={formData.pestCockroaches} onChange={handleChange} className="w-4 h-4 text-blue-600 rounded" />
              <span className="text-gray-700">Cockroaches</span>
            </label>

            <label className="flex items-center space-x-2">
              <input type="checkbox" name="pestBedbugs" checked={formData.pestBedbugs} onChange={handleChange} className="w-4 h-4 text-blue-600 rounded" />
              <span className="text-gray-700">Bedbugs</span>
            </label>

            <label className="flex items-center space-x-2">
              <input type="checkbox" name="pestFleas" checked={formData.pestFleas} onChange={handleChange} className="w-4 h-4 text-blue-600 rounded" />
              <span className="text-gray-700">Fleas</span>
            </label>

            <label className="flex items-center space-x-2">
              <input type="checkbox" name="pestAnts" checked={formData.pestAnts} onChange={handleChange} className="w-4 h-4 text-blue-600 rounded" />
              <span className="text-gray-700">Ants</span>
            </label>

            <label className="flex items-center space-x-2">
              <input type="checkbox" name="pestTermites" checked={formData.pestTermites} onChange={handleChange} className="w-4 h-4 text-blue-600 rounded" />
              <span className="text-gray-700">Termites</span>
            </label>

            <label className="flex items-center space-x-2">
              <input type="checkbox" name="pestSpiders" checked={formData.pestSpiders} onChange={handleChange} className="w-4 h-4 text-blue-600 rounded" />
              <span className="text-gray-700">Spiders</span>
            </label>

            <label className="flex items-center space-x-2">
              <input type="checkbox" name="pestWasps" checked={formData.pestWasps} onChange={handleChange} className="w-4 h-4 text-blue-600 rounded" />
              <span className="text-gray-700">Wasps/Hornets</span>
            </label>

            <label className="flex items-center space-x-2">
              <input type="checkbox" name="pestBees" checked={formData.pestBees} onChange={handleChange} className="w-4 h-4 text-blue-600 rounded" />
              <span className="text-gray-700">Bees</span>
            </label>

            <label className="flex items-center space-x-2">
              <input type="checkbox" name="pestOtherInsects" checked={formData.pestOtherInsects} onChange={handleChange} className="w-4 h-4 text-blue-600 rounded" />
              <span className="text-gray-700">Other Insects</span>
            </label>

            <label className="flex items-center space-x-2">
              <input type="checkbox" name="pestBirds" checked={formData.pestBirds} onChange={handleChange} className="w-4 h-4 text-blue-600 rounded" />
              <span className="text-gray-700">Birds</span>
            </label>

            <label className="flex items-center space-x-2">
              <input type="checkbox" name="pestRaccoons" checked={formData.pestRaccoons} onChange={handleChange} className="w-4 h-4 text-blue-600 rounded" />
              <span className="text-gray-700">Raccoons/Possums</span>
            </label>

            <label className="flex items-center space-x-2">
              <input type="checkbox" name="pestOtherVermin" checked={formData.pestOtherVermin} onChange={handleChange} className="w-4 h-4 text-blue-600 rounded" />
              <span className="text-gray-700">Other Vermin</span>
            </label>
          </div>

          {formData.pestOtherVermin && (
            <div>
              <label htmlFor="pestOtherDetails" className="block text-sm font-medium text-gray-700 mb-1">
                Please specify other pest/vermin issues
              </label>
              <textarea
                id="pestOtherDetails"
                name="pestOtherDetails"
                value={formData.pestOtherDetails}
                onChange={handleChange}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}

          <div>
            <label htmlFor="pestDetails" className="block text-sm font-medium text-gray-700 mb-1">
              Additional details about pest issues
            </label>
            <textarea
              id="pestDetails"
              name="pestDetails"
              value={formData.pestDetails}
              onChange={handleChange}
              rows={3}
              placeholder="Describe the pest problems, their frequency, and how they affect your living conditions..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="pestFirstNoticed" className="block text-sm font-medium text-gray-700 mb-1">
                When did you first notice?
              </label>
              <input
                type="date"
                id="pestFirstNoticed"
                name="pestFirstNoticed"
                value={formData.pestFirstNoticed}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label htmlFor="pestReportedDate" className="block text-sm font-medium text-gray-700 mb-1">
                When did you report it to landlord?
              </label>
              <input
                type="date"
                id="pestReportedDate"
                name="pestReportedDate"
                value={formData.pestReportedDate}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export { ElectricalIssues, HvacIssues, ApplianceIssues, SecurityIssues, PestIssues }
