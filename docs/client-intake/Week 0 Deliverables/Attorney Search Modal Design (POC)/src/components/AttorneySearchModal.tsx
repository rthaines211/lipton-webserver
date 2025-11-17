import { useState } from "react";
import { Dialog, DialogContent } from "./ui/dialog";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { ScrollArea } from "./ui/scroll-area";
import { 
  Search, 
  User, 
  Home, 
  AlertTriangle, 
  Users, 
  ChevronLeft, 
  ChevronRight,
  X
} from "lucide-react";

interface IntakeCard {
  id: string;
  clientName: string;
  email: string;
  phone: string;
  propertyAddress: string;
  submissionDate: string;
  status: "NEW" | "IN REVIEW" | "CONTACTED";
  fullAddress: string;
  unit?: string;
  landlord: string;
  issues: string[];
  householdMembers: number;
}

const mockIntakes: IntakeCard[] = [
  {
    id: "1",
    clientName: "Maria Rodriguez",
    email: "maria.rodriguez@email.com",
    phone: "(555) 123-4567",
    propertyAddress: "1234 Main St, Apt 5B",
    submissionDate: "Nov 14, 2025",
    status: "NEW",
    fullAddress: "1234 Main Street",
    unit: "Apt 5B",
    landlord: "Property Management Inc.",
    issues: ["Water damage in bathroom", "Broken heating system", "Mold in bedroom closet"],
    householdMembers: 4
  },
  {
    id: "2",
    clientName: "James Wilson",
    email: "jwilson@email.com",
    phone: "(555) 234-5678",
    propertyAddress: "789 Oak Avenue, Unit 12",
    submissionDate: "Nov 13, 2025",
    status: "IN REVIEW",
    fullAddress: "789 Oak Avenue",
    unit: "Unit 12",
    landlord: "ABC Properties LLC",
    issues: ["Pest infestation", "Leaking roof", "No hot water"],
    householdMembers: 2
  },
  {
    id: "3",
    clientName: "Sarah Chen",
    email: "sarah.chen@email.com",
    phone: "(555) 345-6789",
    propertyAddress: "456 Elm Street",
    submissionDate: "Nov 12, 2025",
    status: "CONTACTED",
    fullAddress: "456 Elm Street",
    landlord: "Green Housing Co.",
    issues: ["Electrical hazards", "Broken windows"],
    householdMembers: 3
  },
  {
    id: "4",
    clientName: "Michael Brown",
    email: "mbrown@email.com",
    phone: "(555) 456-7890",
    propertyAddress: "2345 Pine Road, #208",
    submissionDate: "Nov 11, 2025",
    status: "NEW",
    fullAddress: "2345 Pine Road",
    unit: "#208",
    landlord: "Summit Rentals",
    issues: ["Unsafe stairwell", "Carbon monoxide detector not working"],
    householdMembers: 5
  },
  {
    id: "5",
    clientName: "Jennifer Taylor",
    email: "jtaylor@email.com",
    phone: "(555) 567-8901",
    propertyAddress: "678 Maple Drive",
    submissionDate: "Nov 10, 2025",
    status: "IN REVIEW",
    fullAddress: "678 Maple Drive",
    landlord: "Riverside Properties",
    issues: ["No working smoke detectors", "Broken door locks"],
    householdMembers: 1
  },
  {
    id: "6",
    clientName: "David Martinez",
    email: "dmartinez@email.com",
    phone: "(555) 678-9012",
    propertyAddress: "910 Cedar Lane, Apt 3A",
    submissionDate: "Nov 9, 2025",
    status: "CONTACTED",
    fullAddress: "910 Cedar Lane",
    unit: "Apt 3A",
    landlord: "Metro Housing Group",
    issues: ["Sewage backup", "Cracked foundation"],
    householdMembers: 2
  }
];

interface AttorneySearchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AttorneySearchModal({ open, onOpenChange }: AttorneySearchModalProps) {
  const [selectedCard, setSelectedCard] = useState<IntakeCard | null>(mockIntakes[0]);
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const filteredIntakes = mockIntakes.filter(intake => {
    const matchesSearch = intake.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         intake.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         intake.propertyAddress.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || intake.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.ceil(filteredIntakes.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedIntakes = filteredIntakes.slice(startIndex, startIndex + itemsPerPage);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "NEW":
        return "bg-green-100 text-green-800 border-green-200";
      case "IN REVIEW":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "CONTACTED":
        return "bg-blue-100 text-blue-800 border-blue-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const handleLoadIntoForm = () => {
    if (selectedCard) {
      console.log("Loading intake into form:", selectedCard);
      // Here you would typically navigate to a form with pre-filled data
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-[960px] w-full h-[720px] p-0 gap-0 md:h-[720px] max-h-[90vh] md:max-h-[720px] [&>button]:hidden">
        {/* Desktop Layout */}
        <div className="hidden md:flex h-full">
          {/* Left Pane */}
          <div className="w-[460px] border-r border-[#E0E0E0] flex flex-col bg-white">
            {/* Header with Search and Filters */}
            <div className="p-4 border-b border-[#E0E0E0] space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#757575] w-5 h-5" />
                <Input
                  placeholder="Search by name, email, or address..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 border-[#E0E0E0]"
                />
              </div>
              <div className="flex gap-2">
                <Select value={dateFilter} onValueChange={setDateFilter}>
                  <SelectTrigger className="flex-1 border-[#E0E0E0]">
                    <SelectValue placeholder="Date range" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All dates</SelectItem>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="week">This week</SelectItem>
                    <SelectItem value="month">This month</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="flex-1 border-[#E0E0E0]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    <SelectItem value="NEW">New</SelectItem>
                    <SelectItem value="IN REVIEW">In Review</SelectItem>
                    <SelectItem value="CONTACTED">Contacted</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Scrollable List */}
            <ScrollArea className="flex-1">
              <div className="p-4 space-y-2">
                {paginatedIntakes.map((intake) => (
                  <button
                    key={intake.id}
                    onClick={() => setSelectedCard(intake)}
                    className={`w-full text-left p-4 rounded-lg border transition-all ${
                      selectedCard?.id === intake.id
                        ? "border-[#1976D2] bg-[#E3F2FD]"
                        : "border-[#E0E0E0] hover:bg-[#F0F7FF]"
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-[#212121]">{intake.clientName}</h3>
                        <Badge className={getStatusColor(intake.status)}>
                          {intake.status}
                        </Badge>
                      </div>
                      <p className="text-[#757575] text-sm">{intake.email}</p>
                      <p className="text-[#757575] text-sm">{intake.phone}</p>
                      <p className="text-[#212121] text-sm">{intake.propertyAddress}</p>
                      <p className="text-[#757575] text-xs">{intake.submissionDate}</p>
                    </div>
                  </button>
                ))}
              </div>
            </ScrollArea>

            {/* Pagination */}
            <div className="p-4 border-t border-[#E0E0E0]">
              <div className="flex items-center justify-between">
                <p className="text-sm text-[#757575]">
                  Page {currentPage} of {totalPages}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="border-[#E0E0E0]"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="border-[#E0E0E0]"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Right Pane */}
          <div className="w-[500px] flex flex-col bg-white">
            {selectedCard ? (
              <>
                <ScrollArea className="flex-1">
                  <div className="p-6 space-y-6">
                    <div className="flex items-start justify-between">
                      <h2 className="text-[#212121]">Intake Details</h2>
                      <button
                        onClick={() => onOpenChange(false)}
                        className="text-[#757575] hover:text-[#212121] transition-colors"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    {/* Contact Information */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-[#1976D2]">
                        <User className="w-5 h-5" />
                        <h3>Contact Information</h3>
                      </div>
                      <div className="pl-7 space-y-1">
                        <p className="text-[#212121]">{selectedCard.clientName}</p>
                        <p className="text-[#757575] text-sm">{selectedCard.email}</p>
                        <p className="text-[#757575] text-sm">{selectedCard.phone}</p>
                      </div>
                    </div>

                    {/* Property Details */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-[#1976D2]">
                        <Home className="w-5 h-5" />
                        <h3>Property Details</h3>
                      </div>
                      <div className="pl-7 space-y-1">
                        <p className="text-[#212121]">{selectedCard.fullAddress}</p>
                        {selectedCard.unit && (
                          <p className="text-[#757575] text-sm">Unit: {selectedCard.unit}</p>
                        )}
                        <p className="text-[#757575] text-sm">Landlord: {selectedCard.landlord}</p>
                      </div>
                    </div>

                    {/* Reported Issues */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-[#1976D2]">
                        <AlertTriangle className="w-5 h-5" />
                        <h3>Reported Issues</h3>
                      </div>
                      <ul className="pl-7 space-y-2">
                        {selectedCard.issues.map((issue, index) => (
                          <li key={index} className="text-[#212121] text-sm list-disc">
                            {issue}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Household Members */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-[#1976D2]">
                        <Users className="w-5 h-5" />
                        <h3>Household Members</h3>
                      </div>
                      <div className="pl-7">
                        <p className="text-[#212121]">
                          {selectedCard.householdMembers} {selectedCard.householdMembers === 1 ? 'member' : 'members'}
                        </p>
                      </div>
                    </div>
                  </div>
                </ScrollArea>

                {/* Action Button */}
                <div className="p-6 border-t border-[#E0E0E0]">
                  <Button
                    onClick={handleLoadIntoForm}
                    className="w-full bg-[#1976D2] hover:bg-[#1565C0] text-white"
                  >
                    Load into Form →
                  </Button>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-[#757575]">
                <p>Select an intake to view details</p>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Layout */}
        <div className="md:hidden flex flex-col h-full bg-white">
          {/* Mobile Header */}
          <div className="p-4 border-b border-[#E0E0E0] flex items-center justify-between">
            <h2 className="text-[#212121]">Attorney Intake Search</h2>
            <button
              onClick={() => onOpenChange(false)}
              className="text-[#757575] hover:text-[#212121] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Mobile Search and Filters */}
          <div className="p-4 border-b border-[#E0E0E0] space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#757575] w-5 h-5" />
              <Input
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 border-[#E0E0E0] min-h-[44px]"
              />
            </div>
            <div className="flex gap-2">
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger className="flex-1 border-[#E0E0E0] min-h-[44px]">
                  <SelectValue placeholder="Date" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All dates</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">This week</SelectItem>
                  <SelectItem value="month">This month</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="flex-1 border-[#E0E0E0] min-h-[44px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="NEW">New</SelectItem>
                  <SelectItem value="IN REVIEW">In Review</SelectItem>
                  <SelectItem value="CONTACTED">Contacted</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Mobile List */}
          <ScrollArea className="flex-1">
            <div className="p-4 space-y-3">
              {paginatedIntakes.map((intake) => (
                <button
                  key={intake.id}
                  onClick={() => setSelectedCard(intake)}
                  className={`w-full text-left p-4 rounded-lg border transition-all min-h-[44px] ${
                    selectedCard?.id === intake.id
                      ? "border-[#1976D2] bg-[#E3F2FD]"
                      : "border-[#E0E0E0] active:bg-[#F0F7FF]"
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-[#212121]">{intake.clientName}</h3>
                      <Badge className={getStatusColor(intake.status)}>
                        {intake.status}
                      </Badge>
                    </div>
                    <p className="text-[#757575] text-sm">{intake.email}</p>
                    <p className="text-[#757575] text-sm">{intake.phone}</p>
                    <p className="text-[#212121] text-sm">{intake.propertyAddress}</p>
                    <p className="text-[#757575] text-xs">{intake.submissionDate}</p>
                  </div>
                </button>
              ))}
            </div>
          </ScrollArea>

          {/* Mobile Preview - Expanded when card selected */}
          {selectedCard && (
            <div className="border-t border-[#E0E0E0] bg-white">
              <div className="p-4 space-y-4 max-h-[300px] overflow-y-auto">
                <h3 className="text-[#212121]">Selected Details</h3>
                
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-[#1976D2] text-sm">
                    <User className="w-4 h-4" />
                    <span>Contact</span>
                  </div>
                  <p className="text-[#212121] text-sm">{selectedCard.clientName}</p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-[#1976D2] text-sm">
                    <Home className="w-4 h-4" />
                    <span>Property</span>
                  </div>
                  <p className="text-[#212121] text-sm">{selectedCard.fullAddress}</p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-[#1976D2] text-sm">
                    <AlertTriangle className="w-4 h-4" />
                    <span>Issues</span>
                  </div>
                  <p className="text-[#212121] text-sm">{selectedCard.issues.length} reported</p>
                </div>
              </div>

              <div className="p-4 border-t border-[#E0E0E0]">
                <Button
                  onClick={handleLoadIntoForm}
                  className="w-full bg-[#1976D2] hover:bg-[#1565C0] text-white min-h-[44px]"
                >
                  Load into Form →
                </Button>
              </div>
            </div>
          )}

          {/* Mobile Pagination */}
          <div className="p-4 border-t border-[#E0E0E0]">
            <div className="flex items-center justify-between">
              <p className="text-sm text-[#757575]">
                Page {currentPage} of {totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="border-[#E0E0E0] min-h-[44px]"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="border-[#E0E0E0] min-h-[44px]"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
