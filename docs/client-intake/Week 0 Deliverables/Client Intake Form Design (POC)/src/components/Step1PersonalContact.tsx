import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Calendar } from "lucide-react";

interface Step1Props {
  isMobile?: boolean;
}

export function Step1PersonalContact({ isMobile }: Step1Props) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="mb-3">Personal Information</h2>
        <div className="h-px bg-gray-200 mb-4" />
        
        <div className={`grid gap-4 ${isMobile ? 'grid-cols-1' : 'grid-cols-2'}`}>
          <div className="space-y-1.5">
            <Label htmlFor="firstName">First Name *</Label>
            <Input 
              id="firstName" 
              placeholder="Enter first name"
              className="h-11"
              style={{ width: isMobile ? '100%' : '300px' }}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="lastName">Last Name *</Label>
            <Input 
              id="lastName" 
              placeholder="Enter last name"
              className="h-11"
              style={{ width: isMobile ? '100%' : '300px' }}
            />
          </div>
        </div>

        <div className={`grid gap-4 mt-4 ${isMobile ? 'grid-cols-1' : 'grid-cols-2'}`}>
          <div className="space-y-1.5">
            <Label htmlFor="dob">Date of Birth *</Label>
            <div className="relative" style={{ width: isMobile ? '100%' : '300px' }}>
              <Input 
                id="dob" 
                placeholder="MM/DD/YYYY"
                className="h-11 pr-10"
              />
              <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ssn">Social Security Number (Optional)</Label>
            <Input 
              id="ssn" 
              placeholder="XXX-XX-XXXX"
              className="h-11"
              style={{ width: isMobile ? '100%' : '300px' }}
            />
          </div>
        </div>
      </div>

      <div>
        <h2 className="mb-3">Contact Information</h2>
        <div className="h-px bg-gray-200 mb-4" />
        
        <div className={`grid gap-4 ${isMobile ? 'grid-cols-1' : 'grid-cols-2'}`}>
          <div className="space-y-1.5">
            <Label htmlFor="phone">Phone Number *</Label>
            <Input 
              id="phone" 
              placeholder="(555) 555-5555"
              className="h-11"
              style={{ width: isMobile ? '100%' : '300px' }}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email">Email Address *</Label>
            <Input 
              id="email" 
              type="email"
              placeholder="email@example.com"
              className="h-11"
              style={{ width: isMobile ? '100%' : '300px' }}
            />
          </div>
        </div>

        <div className="space-y-1.5 mt-4">
          <Label htmlFor="address">Street Address *</Label>
          <Input 
            id="address" 
            placeholder="Enter street address"
            className="h-11"
            style={{ width: isMobile ? '100%' : '620px' }}
          />
        </div>

        <div className={`grid gap-4 mt-4 ${isMobile ? 'grid-cols-1' : 'grid-cols-3'}`}>
          <div className="space-y-1.5">
            <Label htmlFor="city">City *</Label>
            <Input 
              id="city" 
              placeholder="Enter city"
              className="h-11"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="state">State *</Label>
            <Select>
              <SelectTrigger className="h-11">
                <SelectValue placeholder="Select state" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ca">California</SelectItem>
                <SelectItem value="ny">New York</SelectItem>
                <SelectItem value="tx">Texas</SelectItem>
                <SelectItem value="fl">Florida</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="zip">ZIP Code *</Label>
            <Input 
              id="zip" 
              placeholder="12345"
              className="h-11"
            />
          </div>
        </div>
      </div>

      <div>
        <h2 className="mb-3">Preferred Contact Method</h2>
        <div className="h-px bg-gray-200 mb-4" />
        
        <div className="space-y-2.5">
          <div className="flex items-center gap-3">
            <input 
              type="radio" 
              id="contact-phone" 
              name="contact-method"
              className="w-5 h-5 accent-blue-600 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2"
            />
            <Label htmlFor="contact-phone" className="cursor-pointer">Phone</Label>
          </div>
          <div className="flex items-center gap-3">
            <input 
              type="radio" 
              id="contact-email" 
              name="contact-method"
              className="w-5 h-5 accent-blue-600 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2"
            />
            <Label htmlFor="contact-email" className="cursor-pointer">Email</Label>
          </div>
          <div className="flex items-center gap-3">
            <input 
              type="radio" 
              id="contact-text" 
              name="contact-method"
              className="w-5 h-5 accent-blue-600 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2"
            />
            <Label htmlFor="contact-text" className="cursor-pointer">Text Message</Label>
          </div>
        </div>
      </div>
    </div>
  );
}
