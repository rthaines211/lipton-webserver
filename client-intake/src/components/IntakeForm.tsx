import { useState } from 'react'

interface IntakeFormProps {
  onSubmit: (data: any) => void
}

export function IntakeForm({ onSubmit }: IntakeFormProps) {
  const [formData, setFormData] = useState({
    // Personal Information
    firstName: '',
    middleName: '',
    lastName: '',
    dateOfBirth: '',
    // Contact Information
    primaryPhone: '',
    emailAddress: '',
    // Current Address
    currentStreetAddress: '',
    currentCity: '',
    currentState: 'CA',
    currentZipCode: '',
    // Property Information
    propertyStreetAddress: '',
    propertyCity: '',
    propertyState: 'CA',
    propertyZipCode: '',
    // Tenancy Details
    monthlyRent: '',
    leaseStartDate: '',
    // Issue Description
    primaryIssue: '',
    issueDescription: '',
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(formData)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Personal Information */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-900 border-b pb-2">Personal Information</h2>

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
      </div>

      {/* Contact Information */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-900 border-b pb-2">Contact Information</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="primaryPhone" className="block text-sm font-medium text-gray-700 mb-1">
              Phone Number <span className="text-red-600">*</span>
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
        </div>
      </div>

      {/* Current Address */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-900 border-b pb-2">Current Address</h2>

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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
              {/* Add more states as needed */}
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
              maxLength={5}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Property Information */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-900 border-b pb-2">Property Information</h2>
        <p className="text-sm text-gray-600">If different from current address</p>

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
              maxLength={5}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
        </div>
      </div>

      {/* Issue Description */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-900 border-b pb-2">Issue Description</h2>

        <div>
          <label htmlFor="primaryIssue" className="block text-sm font-medium text-gray-700 mb-1">
            Primary Issue <span className="text-red-600">*</span>
          </label>
          <select
            id="primaryIssue"
            name="primaryIssue"
            required
            value={formData.primaryIssue}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select an issue...</option>
            <option value="habitability">Habitability Issues</option>
            <option value="repairs">Needed Repairs</option>
            <option value="harassment">Harassment</option>
            <option value="eviction">Eviction Notice</option>
            <option value="rent_increase">Rent Increase</option>
            <option value="security_deposit">Security Deposit</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div>
          <label htmlFor="issueDescription" className="block text-sm font-medium text-gray-700 mb-1">
            Please describe your issue <span className="text-red-600">*</span>
          </label>
          <textarea
            id="issueDescription"
            name="issueDescription"
            required
            value={formData.issueDescription}
            onChange={handleChange}
            rows={6}
            placeholder="Please provide as much detail as possible about your situation..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Submit Button */}
      <div className="border-t pt-6">
        <button
          type="submit"
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-md transition-colors duration-200"
        >
          Submit Intake Form
        </button>
      </div>
    </form>
  )
}
