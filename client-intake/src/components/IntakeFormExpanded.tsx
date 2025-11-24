import { useState } from 'react'
import { BuildingIssuesRefactored } from './BuildingIssuesRefactored'

interface IntakeFormProps {
  onSubmit: (data: any) => void
}

export function IntakeFormExpanded({ onSubmit }: IntakeFormProps) {
  const [currentStep, setCurrentStep] = useState(1)
  const totalSteps = 3 // Simplified to 3 sections
  const [errors, setErrors] = useState<string[]>([])

  // Simplified form data with fields removed per Phase 3.5
  const [formData, setFormData] = useState({
    // Section 1: Personal Information (simplified - removed 12 fields)
    firstName: '',
    middleName: '',
    lastName: '',
    preferredName: '',
    dateOfBirth: '',
    isHeadOfHousehold: true,

    // Section 2: Contact Information (simplified - removed 9 fields, renamed 1)
    phone: '', // Renamed from primaryPhone
    emailAddress: '',
    preferredContactMethod: 'phone',

    // Section 2: Property & Lease Information (merged and simplified)
    propertyStreetAddress: '',
    propertyUnitNumber: '',
    propertyCity: '',
    propertyState: 'CA',
    propertyZipCode: '',
    propertyCounty: '',
    propertyType: '',
    numberOfUnitsInBuilding: '',
    currentRent: '', // Renamed from monthlyRent
    moveInDate: '',
    hasSignedRetainer: '', // Renamed from hasRetainerWithAnotherAttorney

    // Section 3: Building Issues (all categories kept as-is)
    // Structural Issues (16 fields)
    hasStructuralIssues: false,
    structuralCeilingDamage: false,
    structuralWallCracks: false,
    structuralFloorDamage: false,
    structuralFoundationIssues: false,
    structuralRoofLeaks: false,
    structuralWindowDamage: false,
    structuralDoorDamage: false,
    structuralStairsUnsafe: false,
    structuralBalconyUnsafe: false,
    structuralRailingMissing: false,
    structuralOther: false,
    structuralOtherDetails: '',
    structuralDetails: '',
    structuralFirstNoticed: '',
    structuralReportedDate: '',

    // Plumbing Issues (19 fields)
    hasPlumbingIssues: false,
    plumbingNoHotWater: false,
    plumbingNoWater: false,
    plumbingLowPressure: false,
    plumbingLeaks: false,
    plumbingBurstPipes: false,
    plumbingCloggedDrains: false,
    plumbingToiletNotWorking: false,
    plumbingShowerNotWorking: false,
    plumbingSinkNotWorking: false,
    plumbingSewerBackup: false,
    plumbingWaterDamage: false,
    plumbingFlooding: false,
    plumbingWaterDiscoloration: false,
    plumbingOther: false,
    plumbingOtherDetails: '',
    plumbingDetails: '',
    plumbingFirstNoticed: '',
    plumbingReportedDate: '',

    // Electrical Issues (15 checkboxes)
    hasElectricalIssues: false,
    electricalNoPower: false,
    electricalPartialOutages: false,
    electricalExposedWiring: false,
    electricalSparkingOutlets: false,
    electricalBrokenOutlets: false,
    electricalBrokenSwitches: false,
    electricalFlickeringLights: false,
    electricalCircuitBreakerIssues: false,
    electricalInsufficientOutlets: false,
    electricalBurningSmell: false,
    electricalBrokenFans: false,
    electricalExteriorLighting: false,
    electricalBrokenLightFixtures: false,
    electricalOther: false,
    electricalOtherDetails: '',
    electricalDetails: '',
    electricalFirstNoticed: '',
    electricalReportedDate: '',

    // HVAC Issues (10 checkboxes)
    hasHvacIssues: false,
    hvacNoHeat: false,
    hvacInadequateHeat: false,
    hvacNoAirConditioning: false,
    hvacInadequateCooling: false,
    hvacBrokenThermostat: false,
    hvacGasSmell: false,
    hvacCarbonMonoxideDetectorMissing: false,
    hvacVentilationPoor: false,
    hvacOther: false,
    hvacOtherDetails: '',
    hvacDetails: '',
    hvacFirstNoticed: '',
    hvacReportedDate: '',

    // Appliance Issues (8 checkboxes)
    hasApplianceIssues: false,
    applianceRefrigeratorBroken: false,
    applianceStoveBroken: false,
    applianceOvenBroken: false,
    applianceDishwasherBroken: false,
    applianceGarbageDisposalBroken: false,
    applianceWasherBroken: false,
    applianceDryerBroken: false,
    applianceOther: false,
    applianceOtherDetails: '',
    applianceDetails: '',

    // Security Issues (10 checkboxes)
    hasSecurityIssues: false,
    securityBrokenLocks: false,
    securityBrokenWindows: false,
    securityBrokenDoors: false,
    securityNoDeadbolt: false,
    securityBrokenGate: false,
    securityBrokenIntercom: false,
    securityInadequateLighting: false,
    securityNoSmokeDetector: false,
    securityBreakIns: false,
    securityOther: false,
    securityOtherDetails: '',
    securityDetails: '',

    // Pest Issues (21 checkboxes)
    hasPestIssues: false,
    // Vermin
    pestRats: false,
    pestMice: false,
    pestBats: false,
    pestBirds: false,
    pestSkunks: false,
    pestRaccoons: false,
    pestOpossums: false,
    pestOtherVermin: false,
    // Insects
    pestAnts: false,
    pestBedbugs: false,
    pestSpiders: false,
    pestMosquitos: false,
    pestCockroaches: false,
    pestWasps: false,
    pestTermites: false,
    pestBees: false,
    pestFlies: false,
    pestHornets: false,
    pestFleas: false,
    pestOtherInsects: false,
    // Details
    pestOtherDetails: '',
    pestDetails: '',
    pestFirstNoticed: '',
    pestReportedDate: '',

    // Fire Hazard Issues (7 checkboxes + dates)
    hasFireHazardIssues: false,
    fireHazardExposedWiring: false,
    fireHazardBlockedExits: false,
    fireHazardNoSmokeDetectors: false,
    fireHazardBrokenSmokeDetectors: false,
    fireHazardNoFireExtinguisher: false,
    fireHazardIneffective: false,
    fireHazardOther: false,
    fireHazardDetails: '',
    fireHazardFirstNoticed: '',
    fireHazardReportedDate: '',

    // Utility Issues (5 checkboxes + dates)
    hasUtilityIssues: false,
    utilityNoHotWater: false,
    utilityNoHeat: false,
    utilityNoElectricity: false,
    utilityNoGas: false,
    utilityOther: false,
    utilityDetails: '',
    utilityFirstNoticed: '',
    utilityReportedDate: '',

    // Flooring Issues (4 checkboxes + dates)
    hasFlooringIssues: false,
    flooringDamaged: false,
    flooringUneven: false,
    flooringMissing: false,
    flooringOther: false,
    flooringDetails: '',
    flooringFirstNoticed: '',
    flooringReportedDate: '',

    // Window Issues (6 checkboxes + dates)
    hasWindowIssues: false,
    windowBroken: false,
    windowMissing: false,
    windowDrafty: false,
    windowNoScreens: false,
    windowWontOpen: false,
    windowOther: false,
    windowDetails: '',
    windowFirstNoticed: '',
    windowReportedDate: '',

    // Door Issues (8 checkboxes + dates)
    hasDoorIssues: false,
    doorBroken: false,
    doorNoLock: false,
    doorDamaged: false,
    doorWontClose: false,
    doorMissing: false,
    doorDrafty: false,
    doorNoScreen: false,
    doorOther: false,
    doorDetails: '',
    doorFirstNoticed: '',
    doorReportedDate: '',

    // Cabinet Issues (3 checkboxes + dates)
    hasCabinetIssues: false,
    cabinetBroken: false,
    cabinetMissing: false,
    cabinetOther: false,
    cabinetDetails: '',
    cabinetFirstNoticed: '',
    cabinetReportedDate: '',

    // Common Area Issues (16 checkboxes + dates)
    hasCommonAreaIssues: false,
    commonAreaHallwayDirty: false,
    commonAreaStairsDamaged: false,
    commonAreaElevatorBroken: false,
    commonAreaLaundryBroken: false,
    commonAreaMailboxBroken: false,
    commonAreaLightingBroken: false,
    commonAreaNoSecurity: false,
    commonAreaDoorsUnlocked: false,
    commonAreaIntercomBroken: false,
    commonAreaRoofLeaking: false,
    commonAreaBasementFlooded: false,
    commonAreaGarbageNotCollected: false,
    commonAreaSnowNotRemoved: false,
    commonAreaNoHeat: false,
    commonAreaNoHotWater: false,
    commonAreaOther: false,
    commonAreaDetails: '',
    commonAreaFirstNoticed: '',
    commonAreaReportedDate: '',

    // Trash Problems (2 checkboxes + dates)
    hasTrashProblems: false,
    trashNotCollected: false,
    trashOverflowing: false,
    trashDetails: '',
    trashFirstNoticed: '',
    trashReportedDate: '',

    // Nuisance Issues (4 checkboxes + dates)
    hasNuisanceIssues: false,
    nuisanceNoise: false,
    nuisanceSmell: false,
    nuisanceSmoke: false,
    nuisanceOther: false,
    nuisanceDetails: '',
    nuisanceFirstNoticed: '',
    nuisanceReportedDate: '',

    // Health Hazard Issues (7 checkboxes + dates)
    hasHealthHazardIssues: false,
    healthHazardMold: false,
    healthHazardLeadPaint: false,
    healthHazardAsbestos: false,
    healthHazardPoorVentilation: false,
    healthHazardChemicalSmell: false,
    healthHazardContaminatedWater: false,
    healthHazardOther: false,
    healthHazardDetails: '',
    healthHazardFirstNoticed: '',
    healthHazardReportedDate: '',

    // Government Entities Contacted (7 checkboxes, NO dates)
    hasGovernmentEntitiesContacted: false,
    govEntityHPD: false,
    govEntityDOB: false,
    govEntityOATH: false,
    govEntityDHCR: false,
    govEntityDHS: false,
    govEntity311: false,
    govEntityOther: false,
    governmentEntitiesDetails: '',

    // Notice Issues (6 checkboxes, NO dates)
    hasNoticeIssues: false,
    noticeEviction: false,
    noticeRentIncrease: false,
    noticeLeaseTerm: false,
    noticeEntry: false,
    noticeRepair: false,
    noticeOther: false,
    noticeDetails: '',

    // Safety Issues (6 checkboxes + dates)
    hasSafetyIssues: false,
    safetyNoFireExtinguisher: false,
    safetyNoEmergencyLighting: false,
    safetyNoFireEscape: false,
    safetyBlockedFireEscape: false,
    safetyDamagedFireEscape: false,
    safetyOther: false,
    safetyDetails: '',
    safetyFirstNoticed: '',
    safetyReportedDate: '',

    // Harassment Issues (15 checkboxes + 1 date)
    hasHarassmentIssues: false,
    harassmentUnlawfulDetainer: false,
    harassmentEvictionThreats: false,
    harassmentByDefendant: false,
    harassmentByMaintenance: false,
    harassmentByManager: false,
    harassmentByOwner: false,
    harassmentByOtherTenants: false,
    harassmentIllegitimateNotices: false,
    harassmentRefusalToRepair: false,
    harassmentWrittenThreats: false,
    harassmentAggressiveLanguage: false,
    harassmentPhysicalThreats: false,
    harassmentSinglingOut: false,
    harassmentDuplicativeNotices: false,
    harassmentUntimelyResponse: false,
    harassmentDetails: '',
    harassmentStartDate: '',
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement> | any) => {
    const { name, value, type } = e.target

    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked
      setFormData(prev => ({ ...prev, [name]: checked }))
    } else if (type === 'radio' && name === 'isHeadOfHousehold') {
      // Special handling for isHeadOfHousehold boolean radio button
      setFormData(prev => ({ ...prev, [name]: value }))
    } else {
      setFormData(prev => ({ ...prev, [name]: value }))
    }
  }

  const validateStep = (step: number): string[] => {
    const errors: string[] = []

    switch(step) {
      case 1: // Personal Information + Contact Information
        // Personal Info
        if (!formData.firstName.trim()) errors.push('First Name is required')
        if (!formData.lastName.trim()) errors.push('Last Name is required')
        // Contact Info
        if (!formData.phone.trim()) errors.push('Phone is required')
        if (!formData.emailAddress.trim()) errors.push('Email Address is required')
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.emailAddress)) {
          errors.push('Email Address must be valid')
        }
        break

      case 2: // Property & Lease Information
        if (!formData.propertyStreetAddress.trim()) errors.push('Property Street Address is required')
        if (!formData.propertyCity.trim()) errors.push('Property City is required')
        if (!formData.propertyState.trim()) errors.push('Property State is required')
        if (!formData.propertyZipCode.trim()) errors.push('Property ZIP Code is required')
        if (!formData.currentRent || formData.currentRent === '') errors.push('Current Rent is required')
        break

      case 3: // Building Issues - optional
        break
    }

    return errors
  }

  const nextStep = () => {
    const validationErrors = validateStep(currentStep)

    if (validationErrors.length > 0) {
      setErrors(validationErrors)
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }

    setErrors([])
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const prevStep = () => {
    setErrors([]) // Clear errors when going back
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    // If not on last step, advance to next step (handles Enter key navigation)
    if (currentStep < totalSteps) {
      nextStep()
      return
    }

    // On last step - validate all required fields before submitting
    const allErrors: string[] = []

    if (!formData.firstName.trim()) allErrors.push('First Name is required')
    if (!formData.lastName.trim()) allErrors.push('Last Name is required')
    if (!formData.phone.trim()) allErrors.push('Phone is required')
    if (!formData.emailAddress.trim()) allErrors.push('Email Address is required')
    if (!formData.propertyStreetAddress.trim()) allErrors.push('Property Street Address is required')
    if (!formData.propertyCity.trim()) allErrors.push('Property City is required')
    if (!formData.propertyState.trim()) allErrors.push('Property State is required')
    if (!formData.propertyZipCode.trim()) allErrors.push('Property ZIP Code is required')
    if (!formData.currentRent || formData.currentRent === '') allErrors.push('Current Rent is required')

    if (allErrors.length > 0) {
      setErrors(allErrors)
      alert('Please complete all required fields:\n\n' + allErrors.join('\n'))
      return
    }

    // Submit form data
    onSubmit(formData)
  }

  // Progress bar component with proper 3-step percentages
  const ProgressBar = () => {
    const percentage = Math.round((currentStep / totalSteps) * 100)
    return (
      <div className="mb-8">
        <div className="flex justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Step {currentStep} of {totalSteps}</span>
          <span className="text-sm font-medium text-gray-700">{percentage}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2.5">
          <div
            className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
            style={{ width: `${percentage}%` }}
          />
        </div>
        <div className="mt-2 text-xs text-gray-600">
          {getStepTitle(currentStep)}
        </div>
      </div>
    )
  }

  const getStepTitle = (step: number) => {
    const titles = [
      'Personal & Contact Information',
      'Property & Lease Information',
      'Building & Housing Issues'
    ]
    return titles[step - 1]
  }

  const renderStep = () => {
    switch(currentStep) {
      case 1:
        return (
          <>
            <PersonalInformation formData={formData} handleChange={handleChange} />
            <div className="mt-8 border-t pt-8">
              <ContactInformation formData={formData} handleChange={handleChange} />
            </div>
          </>
        )
      case 2:
        return <PropertyLeaseInformation formData={formData} handleChange={handleChange} />
      case 3:
        return <BuildingIssuesRefactored formData={formData} handleChange={handleChange} />
      default:
        return null
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <ProgressBar />

      {/* Error Display */}
      {errors.length > 0 && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                Please correct the following errors:
              </h3>
              <div className="mt-2 text-sm text-red-700">
                <ul className="list-disc list-inside space-y-1">
                  {errors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {renderStep()}

      {/* Navigation Buttons */}
      <div className="flex justify-between border-t pt-6 mt-8">
        <button
          type="button"
          onClick={prevStep}
          disabled={currentStep === 1}
          className={`px-6 py-2 rounded-md font-medium ${
            currentStep === 1
              ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
              : 'bg-gray-300 hover:bg-gray-400 text-gray-800'
          }`}
        >
          ← Previous
        </button>

        {currentStep < totalSteps ? (
          <button
            type="submit"
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium"
          >
            Next →
          </button>
        ) : (
          <button
            type="submit"
            className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md font-medium"
          >
            Submit Intake Form
          </button>
        )}
      </div>
    </form>
  )
}

// SECTION COMPONENTS

// Section 1: Personal Information (simplified)
function PersonalInformation({ formData, handleChange }: any) {
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-gray-900 border-b-2 pb-3">Section 1: Personal Information</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">
            First Name <span className="text-red-600">*</span>
          </label>
          <input
            type="text"
            id="firstName"
            name="firstName"
            required
            value={formData.firstName}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label htmlFor="middleName" className="block text-sm font-medium text-gray-700 mb-1">
            Middle Name
          </label>
          <input
            type="text"
            id="middleName"
            name="middleName"
            value={formData.middleName}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">
            Last Name <span className="text-red-600">*</span>
          </label>
          <input
            type="text"
            id="lastName"
            name="lastName"
            required
            value={formData.lastName}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="preferredName" className="block text-sm font-medium text-gray-700 mb-1">
            Preferred Name (if different)
          </label>
          <input
            type="text"
            id="preferredName"
            name="preferredName"
            value={formData.preferredName}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label htmlFor="dateOfBirth" className="block text-sm font-medium text-gray-700 mb-1">
            Date of Birth
          </label>
          <input
            type="date"
            id="dateOfBirth"
            name="dateOfBirth"
            value={formData.dateOfBirth}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Are you the Head of Household?
        </label>
        <div className="flex gap-4 mt-2">
          <label className="flex items-center">
            <input
              type="radio"
              name="isHeadOfHousehold"
              value="true"
              checked={formData.isHeadOfHousehold === true}
              onChange={() => handleChange({ target: { name: 'isHeadOfHousehold', value: true, type: 'radio' } })}
              className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
            />
            <span className="ml-2 text-sm text-gray-700">Yes</span>
          </label>
          <label className="flex items-center">
            <input
              type="radio"
              name="isHeadOfHousehold"
              value="false"
              checked={formData.isHeadOfHousehold === false}
              onChange={() => handleChange({ target: { name: 'isHeadOfHousehold', value: false, type: 'radio' } })}
              className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
            />
            <span className="ml-2 text-sm text-gray-700">No</span>
          </label>
        </div>
      </div>
    </div>
  )
}

// Section 2: Contact Information (simplified)
function ContactInformation({ formData, handleChange }: any) {
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-gray-900 border-b-2 pb-3">Section 2: Contact Information</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
            Phone <span className="text-red-600">*</span>
          </label>
          <input
            type="tel"
            id="phone"
            name="phone"
            required
            value={formData.phone}
            onChange={handleChange}
            placeholder="(555) 123-4567"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label htmlFor="emailAddress" className="block text-sm font-medium text-gray-700 mb-1">
            Email Address <span className="text-red-600">*</span>
          </label>
          <input
            type="email"
            id="emailAddress"
            name="emailAddress"
            required
            value={formData.emailAddress}
            onChange={handleChange}
            placeholder="your.email@example.com"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div>
        <label htmlFor="preferredContactMethod" className="block text-sm font-medium text-gray-700 mb-1">
          Preferred Contact Method
        </label>
        <select
          id="preferredContactMethod"
          name="preferredContactMethod"
          value={formData.preferredContactMethod}
          onChange={handleChange}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="phone">Phone</option>
          <option value="email">Email</option>
          <option value="text">Text Message</option>
        </select>
      </div>
    </div>
  )
}

// Section 3: Property & Lease Information (merged and simplified)
function PropertyLeaseInformation({ formData, handleChange }: any) {
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-gray-900 border-b-2 pb-3">Section 3: Property & Lease Information</h2>

      {/* Property Address */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-800">Property Address</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="propertyStreetAddress" className="block text-sm font-medium text-gray-700 mb-1">
              Street Address <span className="text-red-600">*</span>
            </label>
            <input
              type="text"
              id="propertyStreetAddress"
              name="propertyStreetAddress"
              required
              value={formData.propertyStreetAddress}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label htmlFor="propertyUnitNumber" className="block text-sm font-medium text-gray-700 mb-1">
              Unit/Apartment Number
            </label>
            <input
              type="text"
              id="propertyUnitNumber"
              name="propertyUnitNumber"
              value={formData.propertyUnitNumber}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label htmlFor="propertyCity" className="block text-sm font-medium text-gray-700 mb-1">
              City <span className="text-red-600">*</span>
            </label>
            <input
              type="text"
              id="propertyCity"
              name="propertyCity"
              required
              value={formData.propertyCity}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label htmlFor="propertyState" className="block text-sm font-medium text-gray-700 mb-1">
              State <span className="text-red-600">*</span>
            </label>
            <select
              id="propertyState"
              name="propertyState"
              required
              value={formData.propertyState}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="CA">California</option>
              <option value="NY">New York</option>
              <option value="TX">Texas</option>
              <option value="FL">Florida</option>
              <option value="IL">Illinois</option>
            </select>
          </div>

          <div>
            <label htmlFor="propertyZipCode" className="block text-sm font-medium text-gray-700 mb-1">
              ZIP Code <span className="text-red-600">*</span>
            </label>
            <input
              type="text"
              id="propertyZipCode"
              name="propertyZipCode"
              required
              value={formData.propertyZipCode}
              onChange={handleChange}
              pattern="[0-9]{5}(-[0-9]{4})?"
              placeholder="12345"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="propertyCounty" className="block text-sm font-medium text-gray-700 mb-1">
              County
            </label>
            <input
              type="text"
              id="propertyCounty"
              name="propertyCounty"
              value={formData.propertyCounty}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label htmlFor="propertyType" className="block text-sm font-medium text-gray-700 mb-1">
              Property Type
            </label>
            <select
              id="propertyType"
              name="propertyType"
              value={formData.propertyType}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select type...</option>
              <option value="apartment">Apartment</option>
              <option value="house">House</option>
              <option value="condo">Condominium</option>
              <option value="townhouse">Townhouse</option>
              <option value="mobile_home">Mobile Home</option>
              <option value="room">Room (Shared Housing)</option>
              <option value="commercial">Commercial</option>
              <option value="mixed_use">Mixed Use</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>
      </div>

      {/* Lease Information */}
      <div className="space-y-4 border-t pt-4">
        <h3 className="text-lg font-semibold text-gray-800">Lease Information</h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label htmlFor="currentRent" className="block text-sm font-medium text-gray-700 mb-1">
              Current Monthly Rent <span className="text-red-600">*</span>
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">$</span>
              <input
                type="number"
                id="currentRent"
                name="currentRent"
                required
                value={formData.currentRent}
                onChange={handleChange}
                min="0"
                step="1"
                className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label htmlFor="moveInDate" className="block text-sm font-medium text-gray-700 mb-1">
              Move-in Date
            </label>
            <input
              type="date"
              id="moveInDate"
              name="moveInDate"
              value={formData.moveInDate}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label htmlFor="numberOfUnitsInBuilding" className="block text-sm font-medium text-gray-700 mb-1">
              Number of Units in Building
            </label>
            <input
              type="number"
              id="numberOfUnitsInBuilding"
              name="numberOfUnitsInBuilding"
              value={formData.numberOfUnitsInBuilding}
              onChange={handleChange}
              min="1"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div>
          <label htmlFor="hasSignedRetainer" className="block text-sm font-medium text-gray-700 mb-1">
            Have you signed a retainer with another attorney for this matter?
          </label>
          <select
            id="hasSignedRetainer"
            name="hasSignedRetainer"
            value={formData.hasSignedRetainer}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select...</option>
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </select>
        </div>
      </div>
    </div>
  )
}

