import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Calendar } from "lucide-react";

interface Step2Props {
  isMobile?: boolean;
}

export function Step2BuildingIssues({ isMobile }: Step2Props) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="mb-3">Property Issues</h2>
        <div className="h-px bg-gray-200 mb-4" />
        
        <div className="space-y-1.5">
          <Label>Type of Issues (Select all that apply)</Label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 mt-2">
            {[
              'Heating/Cooling Problems',
              'Plumbing Issues',
              'Electrical Problems',
              'Pest Infestation',
              'Mold/Water Damage',
              'Broken Windows/Doors',
              'Roof Leaks',
              'Structural Damage',
            ].map((issue) => (
              <div key={issue} className="flex items-center gap-3">
                <input 
                  type="checkbox" 
                  id={issue.toLowerCase().replace(/\s+/g, '-')}
                  className="w-5 h-5 accent-blue-600 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 rounded"
                />
                <Label htmlFor={issue.toLowerCase().replace(/\s+/g, '-')} className="cursor-pointer">{issue}</Label>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div>
        <h2 className="mb-3">Issue Details</h2>
        <div className="h-px bg-gray-200 mb-4" />
        
        <div className={`grid gap-4 ${isMobile ? 'grid-cols-1' : 'grid-cols-2'}`}>
          <div className="space-y-1.5">
            <Label htmlFor="issue-date">When did the issue start? *</Label>
            <div className="relative" style={{ width: isMobile ? '100%' : '300px' }}>
              <Input 
                id="issue-date" 
                placeholder="MM/DD/YYYY"
                className="h-11 pr-10"
              />
              <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="severity">Severity Level *</Label>
            <Select>
              <SelectTrigger className="h-11" style={{ width: isMobile ? '100%' : '300px' }}>
                <SelectValue placeholder="Select severity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low - Minor inconvenience</SelectItem>
                <SelectItem value="medium">Medium - Significant issue</SelectItem>
                <SelectItem value="high">High - Urgent repair needed</SelectItem>
                <SelectItem value="emergency">Emergency - Immediate danger</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-1.5 mt-4">
          <Label htmlFor="issue-description">Detailed Description *</Label>
          <Textarea 
            id="issue-description"
            placeholder="Please describe the issue in detail, including how it affects your daily life..."
            rows={5}
            className="resize-none"
          />
        </div>

        <div className="space-y-1.5 mt-4">
          <Label htmlFor="repair-attempts">Have you attempted to repair this yourself?</Label>
          <Textarea 
            id="repair-attempts"
            placeholder="Describe any repair attempts or temporary fixes you've made..."
            rows={3}
            className="resize-none"
          />
        </div>
      </div>

      <div>
        <h2 className="mb-3">Location of Issues</h2>
        <div className="h-px bg-gray-200 mb-4" />
        
        <div className="space-y-1.5">
          <Label>Affected Areas (Select all that apply)</Label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
            {[
              'Kitchen',
              'Bathroom',
              'Bedroom',
              'Living Room',
              'Basement',
              'Attic',
              'Hallway',
              'Exterior',
              'Common Areas',
            ].map((area) => (
              <div key={area} className="flex items-center gap-3">
                <input 
                  type="checkbox" 
                  id={`area-${area.toLowerCase().replace(/\s+/g, '-')}`}
                  className="w-5 h-5 accent-blue-600 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 rounded"
                />
                <Label htmlFor={`area-${area.toLowerCase().replace(/\s+/g, '-')}`} className="cursor-pointer">{area}</Label>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
