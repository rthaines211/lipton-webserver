import { useState } from 'react'
import { IntakeFormExpanded } from './components/IntakeFormExpanded'

function App() {
  const [submitted, setSubmitted] = useState(false)
  const [intakeNumber, setIntakeNumber] = useState('')

  const handleSubmit = async (formData: any) => {
    try {
      const response = await fetch('/api/intakes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        throw new Error('Failed to submit intake form')
      }

      const result = await response.json()
      setIntakeNumber(result.data.intakeNumber)
      setSubmitted(true)
    } catch (error) {
      console.error('Error submitting form:', error)
      alert('Failed to submit form. Please try again.')
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">Form Submitted Successfully!</h2>
          <p className="text-gray-600 mb-4">
            Your intake form has been submitted and an attorney will review it soon.
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <p className="text-sm text-gray-600 mb-1">Your Intake Number:</p>
            <p className="text-xl font-bold text-blue-700">{intakeNumber}</p>
          </div>
          <p className="text-sm text-gray-500">
            Please save this number for your records. You will be contacted within 2-3 business days.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto py-8 px-4">
        <div className="bg-white rounded-lg shadow-sm p-8">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Client Intake Form</h1>
            <p className="text-gray-600">Please provide your information so we can evaluate your case</p>
          </div>

          <IntakeFormExpanded onSubmit={handleSubmit} />
        </div>
      </div>
    </div>
  )
}

export default App
