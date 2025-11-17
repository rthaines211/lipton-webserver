import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Calendar } from "lucide-react";

interface Step4Props {
  isMobile?: boolean;
}

export function Step4LandlordLegal({ isMobile }: Step4Props) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="mb-3">Landlord Information</h2>
        <div className="h-px bg-gray-200 mb-4" />
        
        <div className={`grid gap-4 ${isMobile ? 'grid-cols-1' : 'grid-cols-2'}`}>
          <div className="space-y-1.5">
            <Label htmlFor="landlord-name">Landlord/Property Manager Name *</Label>
            <Input 
              id="landlord-name" 
              placeholder="Enter name"
              className="h-11"
              style={{ width: isMobile ? '100%' : '300px' }}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="landlord-phone">Landlord Phone Number *</Label>
            <Input 
              id="landlord-phone" 
              placeholder="(555) 555-5555"
              className="h-11"
              style={{ width: isMobile ? '100%' : '300px' }}
            />
          </div>
        </div>

        <div className={`grid gap-4 mt-4 ${isMobile ? 'grid-cols-1' : 'grid-cols-2'}`}>
          <div className="space-y-1.5">
            <Label htmlFor="landlord-email">Landlord Email</Label>
            <Input 
              id="landlord-email" 
              type="email"
              placeholder="landlord@example.com"
              className="h-11"
              style={{ width: isMobile ? '100%' : '300px' }}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="management-company">Management Company (if applicable)</Label>
            <Input 
              id="management-company" 
              placeholder="Enter company name"
              className="h-11"
              style={{ width: isMobile ? '100%' : '300px' }}
            />
          </div>
        </div>

        <div className="space-y-1.5 mt-4">
          <Label htmlFor="landlord-address">Landlord Mailing Address</Label>
          <Input 
            id="landlord-address" 
            placeholder="Enter street address"
            className="h-11"
            style={{ width: isMobile ? '100%' : '620px' }}
          />
        </div>
      </div>

      <div>
        <h2 className="mb-3">Lease Information</h2>
        <div className="h-px bg-gray-200 mb-4" />
        
        <div className={`grid gap-4 ${isMobile ? 'grid-cols-1' : 'grid-cols-2'}`}>
          <div className="space-y-1.5">
            <Label htmlFor="lease-start">Lease Start Date *</Label>
            <div className="relative" style={{ width: isMobile ? '100%' : '300px' }}>
              <Input 
                id="lease-start" 
                placeholder="MM/DD/YYYY"
                className="h-11 pr-10"
              />
              <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="lease-end">Lease End Date</Label>
            <div className="relative" style={{ width: isMobile ? '100%' : '300px' }}>
              <Input 
                id="lease-end" 
                placeholder="MM/DD/YYYY"
                className="h-11 pr-10"
              />
              <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            </div>
          </div>
        </div>

        <div className={`grid gap-4 mt-4 ${isMobile ? 'grid-cols-1' : 'grid-cols-2'}`}>
          <div className="space-y-1.5">
            <Label htmlFor="monthly-rent">Monthly Rent Amount *</Label>
            <Input 
              id="monthly-rent" 
              placeholder="$0.00"
              className="h-11"
              style={{ width: isMobile ? '100%' : '300px' }}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="security-deposit">Security Deposit Amount</Label>
            <Input 
              id="security-deposit" 
              placeholder="$0.00"
              className="h-11"
              style={{ width: isMobile ? '100%' : '300px' }}
            />
          </div>
        </div>

        <div className="space-y-1.5 mt-4">
          <Label>Lease Type *</Label>
          <div className="space-y-2.5 mt-2">
            <div className="flex items-center gap-3">
              <input 
                type="radio" 
                id="lease-written" 
                name="lease-type"
                className="w-5 h-5 accent-blue-600 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2"
              />
              <Label htmlFor="lease-written" className="cursor-pointer">Written Lease</Label>
            </div>
            <div className="flex items-center gap-3">
              <input 
                type="radio" 
                id="lease-verbal" 
                name="lease-type"
                className="w-5 h-5 accent-blue-600 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2"
              />
              <Label htmlFor="lease-verbal" className="cursor-pointer">Verbal Agreement</Label>
            </div>
            <div className="flex items-center gap-3">
              <input 
                type="radio" 
                id="lease-monthtomonth" 
                name="lease-type"
                className="w-5 h-5 accent-blue-600 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2"
              />
              <Label htmlFor="lease-monthtomonth" className="cursor-pointer">Month-to-Month</Label>
            </div>
          </div>
        </div>
      </div>

      <div>
        <h2 className="mb-3">Communication with Landlord</h2>
        <div className="h-px bg-gray-200 mb-4" />
        
        <div className="space-y-1.5 mb-4">
          <Label>Have you notified the landlord about these issues? *</Label>
          <div className="space-y-2.5 mt-2">
            <div className="flex items-center gap-3">
              <input 
                type="radio" 
                id="notified-yes" 
                name="notified-landlord"
                className="w-5 h-5 accent-blue-600 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2"
              />
              <Label htmlFor="notified-yes" className="cursor-pointer">Yes</Label>
            </div>
            <div className="flex items-center gap-3">
              <input 
                type="radio" 
                id="notified-no" 
                name="notified-landlord"
                className="w-5 h-5 accent-blue-600 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2"
              />
              <Label htmlFor="notified-no" className="cursor-pointer">No</Label>
            </div>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="notification-details">How and when did you notify the landlord?</Label>
          <Textarea 
            id="notification-details"
            placeholder="Describe how you contacted the landlord, dates of contact, and their response..."
            rows={4}
            className="resize-none"
          />
        </div>

        <div className={`grid gap-4 mt-4 ${isMobile ? 'grid-cols-1' : 'grid-cols-2'}`}>
          <div className="space-y-1.5">
            <Label htmlFor="first-notification">Date of First Notification</Label>
            <div className="relative" style={{ width: isMobile ? '100%' : '300px' }}>
              <Input 
                id="first-notification" 
                placeholder="MM/DD/YYYY"
                className="h-11 pr-10"
              />
              <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="last-notification">Date of Last Notification</Label>
            <div className="relative" style={{ width: isMobile ? '100%' : '300px' }}>
              <Input 
                id="last-notification" 
                placeholder="MM/DD/YYYY"
                className="h-11 pr-10"
              />
              <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            </div>
          </div>
        </div>

        <div className="space-y-1.5 mt-4">
          <Label htmlFor="landlord-response">Landlord's Response</Label>
          <Textarea 
            id="landlord-response"
            placeholder="Describe any actions taken or promises made by the landlord..."
            rows={4}
            className="resize-none"
          />
        </div>
      </div>
    </div>
  );
}
