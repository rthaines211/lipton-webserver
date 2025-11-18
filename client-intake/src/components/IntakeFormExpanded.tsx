import { useState } from 'react'
import { BuildingIssuesCompact } from './BuildingIssuesCompact'

interface HouseholdMember {
  memberType: string
  firstName: string
  lastName: string
  relationshipToClient: string
  age: string
  dateOfBirth: string
  hasDisability: boolean
  disabilityDescription: string
}

interface IntakeFormProps {
  onSubmit: (data: any) => void
}

export function IntakeFormExpanded({ onSubmit }: IntakeFormProps) {
  const [currentStep, setCurrentStep] = useState(1)
  const totalSteps = 9
  const [errors, setErrors] = useState<string[]>([])

  // Section 1-5: Basic Information
  const [formData, setFormData] = useState({
    // Section 1: Personal Information (10 fields)
    firstName: '',
    middleName: '',
    lastName: '',
    preferredName: '',
    dateOfBirth: '',
    gender: '',
    maritalStatus: '',
    languagePreference: 'English',
    requiresInterpreter: false,

    // Section 2: Contact Information (12 fields)
    primaryPhone: '',
    secondaryPhone: '',
    workPhone: '',
    emailAddress: '',
    preferredContactMethod: 'phone',
    preferredContactTime: '',
    emergencyContactName: '',
    emergencyContactRelationship: '',
    emergencyContactPhone: '',
    canTextPrimary: true,
    canLeaveVoicemail: true,
    communicationRestrictions: '',

    // Section 3: Current Address (8 fields)
    currentStreetAddress: '',
    currentUnitNumber: '',
    currentCity: '',
    currentState: 'CA',
    currentZipCode: '',
    currentCounty: '',
    yearsAtCurrentAddress: '',
    monthsAtCurrentAddress: '',

    // Section 4: Property Information (12 fields)
    propertyStreetAddress: '',
    propertyUnitNumber: '',
    propertyCity: '',
    propertyState: 'CA',
    propertyZipCode: '',
    propertyCounty: '',
    propertyType: '',
    numberOfUnitsInBuilding: '',
    floorNumber: '',
    totalFloorsInBuilding: '',
    propertyAgeYears: '',
    isRentControlled: false,

    // Section 5: Tenancy Details (10 fields)
    leaseStartDate: '',
    leaseEndDate: '',
    leaseType: '',
    monthlyRent: '',
    securityDeposit: '',
    lastRentIncreaseDate: '',
    lastRentIncreaseAmount: '',
    rentCurrent: true,
    monthsBehindRent: '0',
    receivedEvictionNotice: false,

    // Section 7: Landlord Information (10 fields)
    landlordType: '',
    landlordName: '',
    landlordCompanyName: '',
    landlordPhone: '',
    landlordEmail: '',
    landlordAddress: '',
    landlordCity: '',
    landlordState: '',
    landlordZip: '',
    landlordAttorneyName: '',

    // Section 8: Property Management (8 fields)
    hasPropertyManager: false,
    managerCompanyName: '',
    managerContactName: '',
    managerPhone: '',
    managerEmail: '',
    managerAddress: '',
    managerResponseTime: '',
    managerIsResponsive: true,

    // Section 9: Structural Issues (16 fields)
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

    // Section 10: Plumbing Issues (19 fields)
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

    // Section 11: Electrical Issues (12 checkboxes)
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
    electricalOther: false,
    electricalOtherDetails: '',
    electricalDetails: '',
    electricalFirstNoticed: '',
    electricalReportedDate: '',

    // Section 12: HVAC Issues (10 checkboxes)
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

    // Section 13: Appliance Issues (8 checkboxes)
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

    // Section 14: Security Issues (10 checkboxes)
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

    // Section 15: Pest Issues (15 checkboxes)
    hasPestIssues: false,
    pestRats: false,
    pestMice: false,
    pestCockroaches: false,
    pestBedbugs: false,
    pestFleas: false,
    pestAnts: false,
    pestTermites: false,
    pestSpiders: false,
    pestWasps: false,
    pestBees: false,
    pestOtherInsects: false,
    pestBirds: false,
    pestRaccoons: false,
    pestOtherVermin: false,
    pestOtherDetails: '',
    pestDetails: '',
    pestFirstNoticed: '',
    pestReportedDate: '',
  })

  // Section 6: Household Members (Dynamic)
  const [householdMembers, setHouseholdMembers] = useState<HouseholdMember[]>([])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target

    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked
      setFormData(prev => ({ ...prev, [name]: checked }))
    } else {
      setFormData(prev => ({ ...prev, [name]: value }))
    }
  }

  const addHouseholdMember = () => {
    setHouseholdMembers([...householdMembers, {
      memberType: '',
      firstName: '',
      lastName: '',
      relationshipToClient: '',
      age: '',
      dateOfBirth: '',
      hasDisability: false,
      disabilityDescription: ''
    }])
  }

  const removeHouseholdMember = (index: number) => {
    setHouseholdMembers(householdMembers.filter((_, i) => i !== index))
  }

  const updateHouseholdMember = (index: number, field: string, value: any) => {
    const updated = [...householdMembers]
    updated[index] = { ...updated[index], [field]: value }
    setHouseholdMembers(updated)
  }

  const validateStep = (step: number): string[] => {
    const errors: string[] = []

    switch(step) {
      case 1: // Personal Information
        if (!formData.firstName.trim()) errors.push('First Name is required')
        if (!formData.lastName.trim()) errors.push('Last Name is required')
        break

      case 2: // Contact Information
        if (!formData.primaryPhone.trim()) errors.push('Primary Phone is required')
        if (!formData.emailAddress.trim()) errors.push('Email Address is required')
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.emailAddress)) {
          errors.push('Email Address must be valid')
        }
        break

      case 3: // Address Information
        if (!formData.currentStreetAddress.trim()) errors.push('Street Address is required')
        if (!formData.currentCity.trim()) errors.push('City is required')
        if (!formData.currentState.trim()) errors.push('State is required')
        if (!formData.currentZipCode.trim()) errors.push('ZIP Code is required')
        break

      case 4: // Property & Tenancy Details
        if (!formData.propertyStreetAddress.trim()) errors.push('Property Street Address is required')
        if (!formData.propertyCity.trim()) errors.push('Property City is required')
        if (!formData.propertyState.trim()) errors.push('Property State is required')
        if (!formData.propertyZipCode.trim()) errors.push('Property ZIP Code is required')
        if (!formData.monthlyRent || formData.monthlyRent === '') errors.push('Monthly Rent is required')
        break

      // Steps 5-8 don't have strict required fields
      case 5: // Household Composition - optional
      case 6: // Landlord Information - optional
      case 7: // Building & Housing Issues - optional
      case 8: // Review - no validation needed
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

    // Validate all required fields before submitting
    const allErrors: string[] = []

    if (!formData.firstName.trim()) allErrors.push('First Name is required')
    if (!formData.lastName.trim()) allErrors.push('Last Name is required')
    if (!formData.primaryPhone.trim()) allErrors.push('Primary Phone is required')
    if (!formData.emailAddress.trim()) allErrors.push('Email Address is required')
    if (!formData.currentStreetAddress.trim()) allErrors.push('Current Street Address is required')
    if (!formData.currentCity.trim()) allErrors.push('Current City is required')
    if (!formData.currentState.trim()) allErrors.push('Current State is required')
    if (!formData.currentZipCode.trim()) allErrors.push('Current ZIP Code is required')
    if (!formData.propertyStreetAddress.trim()) allErrors.push('Property Street Address is required')
    if (!formData.propertyCity.trim()) allErrors.push('Property City is required')
    if (!formData.propertyState.trim()) allErrors.push('Property State is required')
    if (!formData.propertyZipCode.trim()) allErrors.push('Property ZIP Code is required')
    if (!formData.monthlyRent || formData.monthlyRent === '') allErrors.push('Monthly Rent is required')

    if (allErrors.length > 0) {
      setErrors(allErrors)
      alert('Please complete all required fields:\n\n' + allErrors.join('\n'))
      return
    }

    // Combine all data
    const completeData = {
      ...formData,
      householdMembers
    }

    onSubmit(completeData)
  }

  // Progress bar component
  const ProgressBar = () => (
    <div className="mb-8">
      <div className="flex justify-between mb-2">
        <span className="text-sm font-medium text-gray-700">Step {currentStep} of {totalSteps}</span>
        <span className="text-sm font-medium text-gray-700">{Math.round((currentStep / totalSteps) * 100)}%</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2.5">
        <div
          className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
          style={{ width: `${(currentStep / totalSteps) * 100}%` }}
        />
      </div>
      <div className="mt-2 text-xs text-gray-600">
        {getStepTitle(currentStep)}
      </div>
    </div>
  )

  const getStepTitle = (step: number) => {
    const titles = [
      'Personal Information',
      'Contact Information',
      'Address Information',
      'Property & Tenancy Details',
      'Household Composition',
      'Landlord & Property Management',
      'Building & Housing Issues',
      'Review & Additional Information',
      'Submit'
    ]
    return titles[step - 1]
  }

  const renderStep = () => {
    switch(currentStep) {
      case 1:
        return <PersonalInformation formData={formData} handleChange={handleChange} />
      case 2:
        return <ContactInformation formData={formData} handleChange={handleChange} />
      case 3:
        return <AddressInformation formData={formData} handleChange={handleChange} />
      case 4:
        return <PropertyTenancyDetails formData={formData} handleChange={handleChange} />
      case 5:
        return <HouseholdComposition members={householdMembers} addMember={addHouseholdMember} removeMember={removeHouseholdMember} updateMember={updateHouseholdMember} />
      case 6:
        return <LandlordInformation formData={formData} handleChange={handleChange} />
      case 7:
        return <BuildingIssuesCompact formData={formData} handleChange={handleChange} />
      case 8:
        return <ReviewInformation formData={formData} householdMembers={householdMembers} />
      case 9:
        return <FinalSubmit />
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
            type="button"
            onClick={nextStep}
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label htmlFor="gender" className="block text-sm font-medium text-gray-700 mb-1">
            Gender
          </label>
          <select
            id="gender"
            name="gender"
            value={formData.gender}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Prefer not to say</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="non-binary">Non-binary</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div>
          <label htmlFor="maritalStatus" className="block text-sm font-medium text-gray-700 mb-1">
            Marital Status
          </label>
          <select
            id="maritalStatus"
            name="maritalStatus"
            value={formData.maritalStatus}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select...</option>
            <option value="single">Single</option>
            <option value="married">Married</option>
            <option value="divorced">Divorced</option>
            <option value="widowed">Widowed</option>
            <option value="domestic_partnership">Domestic Partnership</option>
          </select>
        </div>

        <div>
          <label htmlFor="languagePreference" className="block text-sm font-medium text-gray-700 mb-1">
            Language Preference
          </label>
          <select
            id="languagePreference"
            name="languagePreference"
            value={formData.languagePreference}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="English">English</option>
            <option value="Spanish">Spanish</option>
            <option value="Chinese">Chinese</option>
            <option value="Vietnamese">Vietnamese</option>
            <option value="Korean">Korean</option>
            <option value="Other">Other</option>
          </select>
        </div>
      </div>

      <div className="flex items-center">
        <input
          type="checkbox"
          id="requiresInterpreter"
          name="requiresInterpreter"
          checked={formData.requiresInterpreter}
          onChange={handleChange}
          className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
        />
        <label htmlFor="requiresInterpreter" className="ml-2 text-sm text-gray-700">
          I require an interpreter for legal proceedings
        </label>
      </div>
    </div>
  )
}

function ContactInformation({ formData, handleChange }: any) {
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-gray-900 border-b-2 pb-3">Section 2: Contact Information</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label htmlFor="primaryPhone" className="block text-sm font-medium text-gray-700 mb-1">
            Primary Phone <span className="text-red-600">*</span>
          </label>
          <input
            type="tel"
            id="primaryPhone"
            name="primaryPhone"
            required
            value={formData.primaryPhone}
            onChange={handleChange}
            placeholder="(555) 555-5555"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label htmlFor="secondaryPhone" className="block text-sm font-medium text-gray-700 mb-1">
            Secondary Phone
          </label>
          <input
            type="tel"
            id="secondaryPhone"
            name="secondaryPhone"
            value={formData.secondaryPhone}
            onChange={handleChange}
            placeholder="(555) 555-5555"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label htmlFor="workPhone" className="block text-sm font-medium text-gray-700 mb-1">
            Work Phone
          </label>
          <input
            type="tel"
            id="workPhone"
            name="workPhone"
            value={formData.workPhone}
            onChange={handleChange}
            placeholder="(555) 555-5555"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
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
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            <option value="phone">Phone Call</option>
            <option value="email">Email</option>
            <option value="text">Text Message</option>
          </select>
        </div>

        <div>
          <label htmlFor="preferredContactTime" className="block text-sm font-medium text-gray-700 mb-1">
            Preferred Contact Time
          </label>
          <select
            id="preferredContactTime"
            name="preferredContactTime"
            value={formData.preferredContactTime}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Any time</option>
            <option value="morning">Morning (8am-12pm)</option>
            <option value="afternoon">Afternoon (12pm-5pm)</option>
            <option value="evening">Evening (5pm-8pm)</option>
            <option value="weekends">Weekends only</option>
          </select>
        </div>
      </div>

      <div className="flex gap-6">
        <div className="flex items-center">
          <input
            type="checkbox"
            id="canTextPrimary"
            name="canTextPrimary"
            checked={formData.canTextPrimary}
            onChange={handleChange}
            className="h-4 w-4 text-blue-600 border-gray-300 rounded"
          />
          <label htmlFor="canTextPrimary" className="ml-2 text-sm text-gray-700">
            OK to text primary phone
          </label>
        </div>

        <div className="flex items-center">
          <input
            type="checkbox"
            id="canLeaveVoicemail"
            name="canLeaveVoicemail"
            checked={formData.canLeaveVoicemail}
            onChange={handleChange}
            className="h-4 w-4 text-blue-600 border-gray-300 rounded"
          />
          <label htmlFor="canLeaveVoicemail" className="ml-2 text-sm text-gray-700">
            OK to leave voicemail
          </label>
        </div>
      </div>

      <div className="border-t pt-4 mt-4">
        <h3 className="text-lg font-semibold text-gray-800 mb-3">Emergency Contact</h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label htmlFor="emergencyContactName" className="block text-sm font-medium text-gray-700 mb-1">
              Name
            </label>
            <input
              type="text"
              id="emergencyContactName"
              name="emergencyContactName"
              value={formData.emergencyContactName}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label htmlFor="emergencyContactRelationship" className="block text-sm font-medium text-gray-700 mb-1">
              Relationship
            </label>
            <input
              type="text"
              id="emergencyContactRelationship"
              name="emergencyContactRelationship"
              value={formData.emergencyContactRelationship}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label htmlFor="emergencyContactPhone" className="block text-sm font-medium text-gray-700 mb-1">
              Phone
            </label>
            <input
              type="tel"
              id="emergencyContactPhone"
              name="emergencyContactPhone"
              value={formData.emergencyContactPhone}
              onChange={handleChange}
              placeholder="(555) 555-5555"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      <div>
        <label htmlFor="communicationRestrictions" className="block text-sm font-medium text-gray-700 mb-1">
          Communication Restrictions (Optional)
        </label>
        <textarea
          id="communicationRestrictions"
          name="communicationRestrictions"
          value={formData.communicationRestrictions}
          onChange={handleChange}
          rows={3}
          placeholder="Any restrictions on how or when we can contact you?"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
    </div>
  )
}

function AddressInformation({ formData, handleChange }: any) {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900 border-b-2 pb-3">Section 3: Current Address</h2>

      <div>
        <label htmlFor="currentStreetAddress" className="block text-sm font-medium text-gray-700 mb-1">
          Street Address <span className="text-red-600">*</span>
        </label>
        <input
          type="text"
          id="currentStreetAddress"
          name="currentStreetAddress"
          required
          value={formData.currentStreetAddress}
          onChange={handleChange}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="currentUnitNumber" className="block text-sm font-medium text-gray-700 mb-1">
            Unit/Apt Number
          </label>
          <input
            type="text"
            id="currentUnitNumber"
            name="currentUnitNumber"
            value={formData.currentUnitNumber}
            onChange={handleChange}
            placeholder="Apt 123, Unit B, etc."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label htmlFor="currentCity" className="block text-sm font-medium text-gray-700 mb-1">
            City <span className="text-red-600">*</span>
          </label>
          <input
            type="text"
            id="currentCity"
            name="currentCity"
            required
            value={formData.currentCity}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label htmlFor="currentState" className="block text-sm font-medium text-gray-700 mb-1">
            State <span className="text-red-600">*</span>
          </label>
          <select
            id="currentState"
            name="currentState"
            required
            value={formData.currentState}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="CA">California</option>
            <option value="NY">New York</option>
            <option value="TX">Texas</option>
          </select>
        </div>

        <div>
          <label htmlFor="currentZipCode" className="block text-sm font-medium text-gray-700 mb-1">
            ZIP Code <span className="text-red-600">*</span>
          </label>
          <input
            type="text"
            id="currentZipCode"
            name="currentZipCode"
            required
            value={formData.currentZipCode}
            onChange={handleChange}
            maxLength={10}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label htmlFor="currentCounty" className="block text-sm font-medium text-gray-700 mb-1">
            County
          </label>
          <input
            type="text"
            id="currentCounty"
            name="currentCounty"
            value={formData.currentCounty}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="yearsAtCurrentAddress" className="block text-sm font-medium text-gray-700 mb-1">
            Years at Current Address
          </label>
          <input
            type="number"
            id="yearsAtCurrentAddress"
            name="yearsAtCurrentAddress"
            value={formData.yearsAtCurrentAddress}
            onChange={handleChange}
            min="0"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label htmlFor="monthsAtCurrentAddress" className="block text-sm font-medium text-gray-700 mb-1">
            Additional Months
          </label>
          <input
            type="number"
            id="monthsAtCurrentAddress"
            name="monthsAtCurrentAddress"
            value={formData.monthsAtCurrentAddress}
            onChange={handleChange}
            min="0"
            max="11"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>
    </div>
  )
}

function PropertyTenancyDetails({ formData, handleChange }: any) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 border-b-2 pb-3">Section 4: Property Information</h2>
        <p className="text-sm text-gray-600 mt-2">If different from your current address</p>
      </div>

      <div>
        <label htmlFor="propertyStreetAddress" className="block text-sm font-medium text-gray-700 mb-1">
          Property Street Address <span className="text-red-600">*</span>
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="propertyUnitNumber" className="block text-sm font-medium text-gray-700 mb-1">
            Unit/Apt Number
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
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
            maxLength={10}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

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
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
            <option value="">Select...</option>
            <option value="apartment">Apartment</option>
            <option value="house">House</option>
            <option value="condo">Condo</option>
            <option value="mobile_home">Mobile Home</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div>
          <label htmlFor="numberOfUnitsInBuilding" className="block text-sm font-medium text-gray-700 mb-1">
            Units in Building
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

        <div>
          <label htmlFor="floorNumber" className="block text-sm font-medium text-gray-700 mb-1">
            Floor Number
          </label>
          <input
            type="number"
            id="floorNumber"
            name="floorNumber"
            value={formData.floorNumber}
            onChange={handleChange}
            min="0"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="flex items-center">
        <input
          type="checkbox"
          id="isRentControlled"
          name="isRentControlled"
          checked={formData.isRentControlled}
          onChange={handleChange}
          className="h-4 w-4 text-blue-600 border-gray-300 rounded"
        />
        <label htmlFor="isRentControlled" className="ml-2 text-sm text-gray-700">
          This property is rent controlled
        </label>
      </div>

      <div className="border-t pt-6 mt-6">
        <h2 className="text-2xl font-bold text-gray-900 border-b-2 pb-3 mb-4">Section 5: Tenancy Details</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label htmlFor="leaseStartDate" className="block text-sm font-medium text-gray-700 mb-1">
              Lease Start Date
            </label>
            <input
              type="date"
              id="leaseStartDate"
              name="leaseStartDate"
              value={formData.leaseStartDate}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label htmlFor="leaseEndDate" className="block text-sm font-medium text-gray-700 mb-1">
              Lease End Date
            </label>
            <input
              type="date"
              id="leaseEndDate"
              name="leaseEndDate"
              value={formData.leaseEndDate}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label htmlFor="leaseType" className="block text-sm font-medium text-gray-700 mb-1">
              Lease Type
            </label>
            <select
              id="leaseType"
              name="leaseType"
              value={formData.leaseType}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select...</option>
              <option value="month_to_month">Month-to-Month</option>
              <option value="fixed_term">Fixed Term</option>
              <option value="verbal">Verbal Agreement</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div>
            <label htmlFor="monthlyRent" className="block text-sm font-medium text-gray-700 mb-1">
              Monthly Rent <span className="text-red-600">*</span>
            </label>
            <input
              type="number"
              id="monthlyRent"
              name="monthlyRent"
              required
              value={formData.monthlyRent}
              onChange={handleChange}
              placeholder="1500.00"
              step="0.01"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label htmlFor="securityDeposit" className="block text-sm font-medium text-gray-700 mb-1">
              Security Deposit
            </label>
            <input
              type="number"
              id="securityDeposit"
              name="securityDeposit"
              value={formData.securityDeposit}
              onChange={handleChange}
              placeholder="1500.00"
              step="0.01"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div>
            <label htmlFor="lastRentIncreaseDate" className="block text-sm font-medium text-gray-700 mb-1">
              Last Rent Increase Date
            </label>
            <input
              type="date"
              id="lastRentIncreaseDate"
              name="lastRentIncreaseDate"
              value={formData.lastRentIncreaseDate}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label htmlFor="lastRentIncreaseAmount" className="block text-sm font-medium text-gray-700 mb-1">
              Increase Amount
            </label>
            <input
              type="number"
              id="lastRentIncreaseAmount"
              name="lastRentIncreaseAmount"
              value={formData.lastRentIncreaseAmount}
              onChange={handleChange}
              step="0.01"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="flex gap-6 mt-4">
          <div className="flex items-center">
            <input
              type="checkbox"
              id="rentCurrent"
              name="rentCurrent"
              checked={formData.rentCurrent}
              onChange={handleChange}
              className="h-4 w-4 text-blue-600 border-gray-300 rounded"
            />
            <label htmlFor="rentCurrent" className="ml-2 text-sm text-gray-700">
              Rent is current
            </label>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="receivedEvictionNotice"
              name="receivedEvictionNotice"
              checked={formData.receivedEvictionNotice}
              onChange={handleChange}
              className="h-4 w-4 text-blue-600 border-gray-300 rounded"
            />
            <label htmlFor="receivedEvictionNotice" className="ml-2 text-sm text-gray-700">
              Received eviction notice
            </label>
          </div>
        </div>

        {!formData.rentCurrent && (
          <div className="mt-4">
            <label htmlFor="monthsBehindRent" className="block text-sm font-medium text-gray-700 mb-1">
              Months Behind on Rent
            </label>
            <input
              type="number"
              id="monthsBehindRent"
              name="monthsBehindRent"
              value={formData.monthsBehindRent}
              onChange={handleChange}
              min="0"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        )}
      </div>
    </div>
  )
}

function HouseholdComposition({ members, addMember, removeMember, updateMember }: any) {
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-gray-900 border-b-2 pb-3">Section 6: Household Composition</h2>
      <p className="text-sm text-gray-600">Who else lives in the unit with you?</p>

      {members.map((member: HouseholdMember, index: number) => (
        <div key={index} className="p-4 border-2 border-gray-200 rounded-lg relative">
          <button
            type="button"
            onClick={() => removeMember(index)}
            className="absolute top-2 right-2 text-red-600 hover:text-red-800"
          >
            ✕ Remove
          </button>

          <h3 className="font-semibold text-gray-800 mb-3">Household Member #{index + 1}</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
              <input
                type="text"
                value={member.firstName}
                onChange={(e) => updateMember(index, 'firstName', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
              <input
                type="text"
                value={member.lastName}
                onChange={(e) => updateMember(index, 'lastName', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Relationship</label>
              <select
                value={member.relationshipToClient}
                onChange={(e) => updateMember(index, 'relationshipToClient', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select...</option>
                <option value="spouse">Spouse</option>
                <option value="child">Child</option>
                <option value="parent">Parent</option>
                <option value="sibling">Sibling</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Age</label>
              <input
                type="number"
                value={member.age}
                onChange={(e) => updateMember(index, 'age', e.target.value)}
                min="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="md:col-span-2">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={member.hasDisability}
                  onChange={(e) => updateMember(index, 'hasDisability', e.target.checked)}
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                />
                <label className="ml-2 text-sm text-gray-700">Has disability</label>
              </div>
            </div>

            {member.hasDisability && (
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Disability Description</label>
                <textarea
                  value={member.disabilityDescription}
                  onChange={(e) => updateMember(index, 'disabilityDescription', e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={addMember}
        className="w-full py-3 border-2 border-dashed border-blue-300 rounded-md text-blue-600 hover:bg-blue-50 font-medium"
      >
        + Add Household Member
      </button>
    </div>
  )
}

function LandlordInformation({ formData, handleChange }: any) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 border-b-2 pb-3">Section 7: Landlord Information</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="landlordType" className="block text-sm font-medium text-gray-700 mb-1">
            Landlord Type
          </label>
          <select
            id="landlordType"
            name="landlordType"
            value={formData.landlordType}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select...</option>
            <option value="individual">Individual</option>
            <option value="corporation">Corporation</option>
            <option value="llc">LLC</option>
            <option value="partnership">Partnership</option>
          </select>
        </div>

        <div>
          <label htmlFor="landlordName" className="block text-sm font-medium text-gray-700 mb-1">
            Landlord Name <span className="text-red-600">*</span>
          </label>
          <input
            type="text"
            id="landlordName"
            name="landlordName"
            required
            value={formData.landlordName}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div>
        <label htmlFor="landlordCompanyName" className="block text-sm font-medium text-gray-700 mb-1">
          Company Name (if applicable)
        </label>
        <input
          type="text"
          id="landlordCompanyName"
          name="landlordCompanyName"
          value={formData.landlordCompanyName}
          onChange={handleChange}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="landlordPhone" className="block text-sm font-medium text-gray-700 mb-1">
            Phone
          </label>
          <input
            type="tel"
            id="landlordPhone"
            name="landlordPhone"
            value={formData.landlordPhone}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label htmlFor="landlordEmail" className="block text-sm font-medium text-gray-700 mb-1">
            Email
          </label>
          <input
            type="email"
            id="landlordEmail"
            name="landlordEmail"
            value={formData.landlordEmail}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div>
        <label htmlFor="landlordAddress" className="block text-sm font-medium text-gray-700 mb-1">
          Landlord's Address
        </label>
        <input
          type="text"
          id="landlordAddress"
          name="landlordAddress"
          value={formData.landlordAddress}
          onChange={handleChange}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="border-t pt-6 mt-6">
        <h2 className="text-2xl font-bold text-gray-900 border-b-2 pb-3 mb-4">Section 8: Property Management</h2>

        <div className="flex items-center mb-4">
          <input
            type="checkbox"
            id="hasPropertyManager"
            name="hasPropertyManager"
            checked={formData.hasPropertyManager}
            onChange={handleChange}
            className="h-4 w-4 text-blue-600 border-gray-300 rounded"
          />
          <label htmlFor="hasPropertyManager" className="ml-2 text-sm text-gray-700">
            This property has a property manager
          </label>
        </div>

        {formData.hasPropertyManager && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="managerCompanyName" className="block text-sm font-medium text-gray-700 mb-1">
                  Management Company Name
                </label>
                <input
                  type="text"
                  id="managerCompanyName"
                  name="managerCompanyName"
                  value={formData.managerCompanyName}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label htmlFor="managerContactName" className="block text-sm font-medium text-gray-700 mb-1">
                  Contact Name
                </label>
                <input
                  type="text"
                  id="managerContactName"
                  name="managerContactName"
                  value={formData.managerContactName}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="managerPhone" className="block text-sm font-medium text-gray-700 mb-1">
                  Phone
                </label>
                <input
                  type="tel"
                  id="managerPhone"
                  name="managerPhone"
                  value={formData.managerPhone}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label htmlFor="managerEmail" className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  id="managerEmail"
                  name="managerEmail"
                  value={formData.managerEmail}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function StructuralIssues({ formData, handleChange }: any) {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900 border-b-2 pb-3">Section 9: Structural Issues</h2>

      <div className="flex items-center mb-4">
        <input
          type="checkbox"
          id="hasStructuralIssues"
          name="hasStructuralIssues"
          checked={formData.hasStructuralIssues}
          onChange={handleChange}
          className="h-4 w-4 text-blue-600 border-gray-300 rounded"
        />
        <label htmlFor="hasStructuralIssues" className="ml-2 font-medium text-gray-700">
          I have structural issues with my unit/building
        </label>
      </div>

      {formData.hasStructuralIssues && (
        <div className="space-y-4">
          <div className="bg-blue-50 p-4 rounded-md">
            <p className="text-sm text-gray-700 mb-3">Check all that apply:</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[
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
              ].map(item => (
                <div key={item.id} className="flex items-center">
                  <input
                    type="checkbox"
                    id={item.id}
                    name={item.id}
                    checked={formData[item.id]}
                    onChange={handleChange}
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                  />
                  <label htmlFor={item.id} className="ml-2 text-sm text-gray-700">
                    {item.label}
                  </label>
                </div>
              ))}
            </div>
          </div>

          {formData.structuralOther && (
            <div>
              <label htmlFor="structuralOtherDetails" className="block text-sm font-medium text-gray-700 mb-1">
                Please specify other structural issues
              </label>
              <textarea
                id="structuralOtherDetails"
                name="structuralOtherDetails"
                value={formData.structuralOtherDetails}
                onChange={handleChange}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}

          <div>
            <label htmlFor="structuralDetails" className="block text-sm font-medium text-gray-700 mb-1">
              Describe the structural issues in detail
            </label>
            <textarea
              id="structuralDetails"
              name="structuralDetails"
              value={formData.structuralDetails}
              onChange={handleChange}
              rows={4}
              placeholder="Please provide details about the structural issues..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="structuralFirstNoticed" className="block text-sm font-medium text-gray-700 mb-1">
                When did you first notice?
              </label>
              <input
                type="date"
                id="structuralFirstNoticed"
                name="structuralFirstNoticed"
                value={formData.structuralFirstNoticed}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label htmlFor="structuralReportedDate" className="block text-sm font-medium text-gray-700 mb-1">
                When did you report it to landlord?
              </label>
              <input
                type="date"
                id="structuralReportedDate"
                name="structuralReportedDate"
                value={formData.structuralReportedDate}
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

function PlumbingIssues({ formData, handleChange }: any) {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900 border-b-2 pb-3">Section 10: Plumbing & Water Issues</h2>

      <div className="flex items-center mb-4">
        <input
          type="checkbox"
          id="hasPlumbingIssues"
          name="hasPlumbingIssues"
          checked={formData.hasPlumbingIssues}
          onChange={handleChange}
          className="h-4 w-4 text-blue-600 border-gray-300 rounded"
        />
        <label htmlFor="hasPlumbingIssues" className="ml-2 font-medium text-gray-700">
          I have plumbing or water issues
        </label>
      </div>

      {formData.hasPlumbingIssues && (
        <div className="space-y-4">
          <div className="bg-green-50 p-4 rounded-md">
            <p className="text-sm text-gray-700 mb-3">Check all that apply:</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[
                { id: 'plumbingNoHotWater', label: 'No hot water' },
                { id: 'plumbingNoWater', label: 'No water at all' },
                { id: 'plumbingLowPressure', label: 'Low water pressure' },
                { id: 'plumbingLeakyPipes', label: 'Leaky pipes' },
                { id: 'plumbingBurstPipes', label: 'Burst pipes' },
                { id: 'plumbingCloggedDrains', label: 'Clogged drains' },
                { id: 'plumbingToiletNotWorking', label: 'Toilet not working' },
                { id: 'plumbingShowerNotWorking', label: 'Shower/bath not working' },
                { id: 'plumbingSinkNotWorking', label: 'Sink not working' },
                { id: 'plumbingSewageBackup', label: 'Sewage backup' },
                { id: 'plumbingWaterDamage', label: 'Water damage' },
                { id: 'plumbingFlooding', label: 'Flooding' },
                { id: 'plumbingWaterDiscoloration', label: 'Discolored water' },
                { id: 'plumbingOther', label: 'Other' },
              ].map(item => (
                <div key={item.id} className="flex items-center">
                  <input
                    type="checkbox"
                    id={item.id}
                    name={item.id}
                    checked={formData[item.id]}
                    onChange={handleChange}
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                  />
                  <label htmlFor={item.id} className="ml-2 text-sm text-gray-700">
                    {item.label}
                  </label>
                </div>
              ))}
            </div>
          </div>

          {formData.plumbingOther && (
            <div>
              <label htmlFor="plumbingOtherDetails" className="block text-sm font-medium text-gray-700 mb-1">
                Please specify other plumbing issues
              </label>
              <textarea
                id="plumbingOtherDetails"
                name="plumbingOtherDetails"
                value={formData.plumbingOtherDetails}
                onChange={handleChange}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}

          <div>
            <label htmlFor="plumbingDetails" className="block text-sm font-medium text-gray-700 mb-1">
              Describe the plumbing issues in detail
            </label>
            <textarea
              id="plumbingDetails"
              name="plumbingDetails"
              value={formData.plumbingDetails}
              onChange={handleChange}
              rows={4}
              placeholder="Please provide details about the plumbing issues..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="plumbingFirstNoticed" className="block text-sm font-medium text-gray-700 mb-1">
                When did you first notice?
              </label>
              <input
                type="date"
                id="plumbingFirstNoticed"
                name="plumbingFirstNoticed"
                value={formData.plumbingFirstNoticed}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label htmlFor="plumbingReportedDate" className="block text-sm font-medium text-gray-700 mb-1">
                When did you report it to landlord?
              </label>
              <input
                type="date"
                id="plumbingReportedDate"
                name="plumbingReportedDate"
                value={formData.plumbingReportedDate}
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

function ReviewInformation({ formData, householdMembers }: any) {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900 border-b-2 pb-3">Review Your Information</h2>
      <p className="text-gray-600">Please review the information below before submitting.</p>

      <div className="bg-gray-50 p-4 rounded-md space-y-3">
        <div>
          <span className="font-semibold">Name:</span> {formData.firstName} {formData.middleName} {formData.lastName}
        </div>
        <div>
          <span className="font-semibold">Email:</span> {formData.emailAddress}
        </div>
        <div>
          <span className="font-semibold">Phone:</span> {formData.primaryPhone}
        </div>
        <div>
          <span className="font-semibold">Property:</span> {formData.propertyStreetAddress}, {formData.propertyCity}, {formData.propertyState} {formData.propertyZipCode}
        </div>
        <div>
          <span className="font-semibold">Monthly Rent:</span> ${formData.monthlyRent}
        </div>
        <div>
          <span className="font-semibold">Landlord:</span> {formData.landlordName || 'Not provided'}
        </div>
        {householdMembers.length > 0 && (
          <div>
            <span className="font-semibold">Household Members:</span> {householdMembers.length} member(s)
          </div>
        )}
        {formData.hasStructuralIssues && (
          <div className="text-yellow-700">
            <span className="font-semibold">⚠ Structural Issues Reported</span>
          </div>
        )}
        {formData.hasPlumbingIssues && (
          <div className="text-yellow-700">
            <span className="font-semibold">⚠ Plumbing Issues Reported</span>
          </div>
        )}
      </div>

      <div className="bg-blue-50 border border-blue-200 p-4 rounded-md">
        <p className="text-sm text-blue-900">
          By proceeding, you confirm that the information provided is accurate to the best of your knowledge.
        </p>
      </div>
    </div>
  )
}

function FinalSubmit() {
  return (
    <div className="space-y-6 text-center py-8">
      <div className="text-6xl">📝</div>
      <h2 className="text-3xl font-bold text-gray-900">Ready to Submit</h2>
      <p className="text-lg text-gray-600 max-w-2xl mx-auto">
        Click the "Submit Intake Form" button below to send your information to our office.
        We will review your case and contact you within 1-2 business days.
      </p>
      <div className="bg-green-50 border border-green-200 p-4 rounded-md inline-block">
        <p className="text-sm text-green-900">
          ✓ All required information has been collected
        </p>
      </div>
    </div>
  )
}
