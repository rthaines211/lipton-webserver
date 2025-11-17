import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { AlertTriangle } from "lucide-react";

interface Step3Props {
  isMobile?: boolean;
}

export function Step3SafetyHealth({ isMobile }: Step3Props) {
  return (
    <div className="space-y-5">
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3.5 flex gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div>
          <div className="text-amber-900 mb-1">Important Safety Notice</div>
          <p className="text-sm text-amber-800">
            If you are experiencing an immediate emergency or life-threatening situation, please call 911 or your local emergency services immediately.
          </p>
        </div>
      </div>

      <div>
        <h2 className="mb-3">Safety Concerns</h2>
        <div className="h-px bg-gray-200 mb-4" />
        
        <div className="space-y-1.5 mb-4">
          <Label>Are there any immediate safety hazards? *</Label>
          <div className="space-y-2.5 mt-2">
            <div className="flex items-center gap-3">
              <input 
                type="radio" 
                id="safety-yes" 
                name="safety-hazards"
                className="w-5 h-5 accent-blue-600 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2"
              />
              <Label htmlFor="safety-yes" className="cursor-pointer">Yes, there are immediate safety concerns</Label>
            </div>
            <div className="flex items-center gap-3">
              <input 
                type="radio" 
                id="safety-no" 
                name="safety-hazards"
                className="w-5 h-5 accent-blue-600 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2"
              />
              <Label htmlFor="safety-no" className="cursor-pointer">No immediate safety concerns</Label>
            </div>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Safety Issues Present (Select all that apply)</Label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 mt-2">
            {[
              'Exposed Wiring',
              'Gas Leaks',
              'Carbon Monoxide',
              'Fire Hazards',
              'Lack of Heat/AC',
              'Unsafe Stairs/Railings',
              'Lead Paint',
              'Asbestos',
            ].map((issue) => (
              <div key={issue} className="flex items-center gap-3">
                <input 
                  type="checkbox" 
                  id={`safety-${issue.toLowerCase().replace(/\s+/g, '-')}`}
                  className="w-5 h-5 accent-blue-600 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 rounded"
                />
                <Label htmlFor={`safety-${issue.toLowerCase().replace(/\s+/g, '-')}`} className="cursor-pointer">{issue}</Label>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div>
        <h2 className="mb-3">Health Impact</h2>
        <div className="h-px bg-gray-200 mb-4" />
        
        <div className="space-y-1.5 mb-4">
          <Label>Have the property issues affected your health or the health of household members? *</Label>
          <div className="space-y-2.5 mt-2">
            <div className="flex items-center gap-3">
              <input 
                type="radio" 
                id="health-yes" 
                name="health-impact"
                className="w-5 h-5 accent-blue-600 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2"
              />
              <Label htmlFor="health-yes" className="cursor-pointer">Yes</Label>
            </div>
            <div className="flex items-center gap-3">
              <input 
                type="radio" 
                id="health-no" 
                name="health-impact"
                className="w-5 h-5 accent-blue-600 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2"
              />
              <Label htmlFor="health-no" className="cursor-pointer">No</Label>
            </div>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Health Symptoms (Select all that apply)</Label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 mt-2">
            {[
              'Respiratory Issues',
              'Allergies',
              'Skin Irritation',
              'Headaches',
              'Nausea',
              'Dizziness',
              'Sleep Disruption',
              'Other Symptoms',
            ].map((symptom) => (
              <div key={symptom} className="flex items-center gap-3">
                <input 
                  type="checkbox" 
                  id={`health-${symptom.toLowerCase().replace(/\s+/g, '-')}`}
                  className="w-5 h-5 accent-blue-600 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 rounded"
                />
                <Label htmlFor={`health-${symptom.toLowerCase().replace(/\s+/g, '-')}`} className="cursor-pointer">{symptom}</Label>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-1.5 mt-4">
          <Label htmlFor="health-details">Please describe the health impacts in detail</Label>
          <Textarea 
            id="health-details"
            placeholder="Describe any health issues, symptoms, or medical conditions that have been affected by the property conditions..."
            rows={4}
            className="resize-none"
          />
        </div>
      </div>

      <div>
        <h2 className="mb-3">Vulnerable Household Members</h2>
        <div className="h-px bg-gray-200 mb-4" />
        
        <div className="space-y-1.5">
          <Label>Are there any of the following living in the household? (Select all that apply)</Label>
          <div className="space-y-2.5 mt-2">
            {[
              'Children under 5 years old',
              'Elderly residents (65+)',
              'Individuals with disabilities',
              'Individuals with chronic health conditions',
              'Pregnant women',
            ].map((member) => (
              <div key={member} className="flex items-center gap-3">
                <input 
                  type="checkbox" 
                  id={`vulnerable-${member.toLowerCase().replace(/\s+/g, '-')}`}
                  className="w-5 h-5 accent-blue-600 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 rounded"
                />
                <Label htmlFor={`vulnerable-${member.toLowerCase().replace(/\s+/g, '-')}`} className="cursor-pointer">{member}</Label>
              </div>
            ))}
          </div>
        </div>

        <div className={`grid gap-4 mt-4 ${isMobile ? 'grid-cols-1' : 'grid-cols-2'}`}>
          <div className="space-y-1.5">
            <Label htmlFor="household-size">Total Household Size</Label>
            <Input 
              id="household-size" 
              type="number"
              placeholder="Number of people"
              className="h-11"
              style={{ width: isMobile ? '100%' : '300px' }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
