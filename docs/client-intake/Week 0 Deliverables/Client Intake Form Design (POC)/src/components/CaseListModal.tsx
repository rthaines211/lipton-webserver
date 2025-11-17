import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Search, Filter, ChevronRight } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { useState } from "react";

interface CaseItem {
  id: string;
  name: string;
  email: string;
  issue: string;
  status: 'new' | 'in-review' | 'contacted';
  date: string;
  severity: string;
  preview?: string;
}

interface CaseListModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isMobile?: boolean;
}

export function CaseListModal({ open, onOpenChange, isMobile }: CaseListModalProps) {
  const [selectedCase, setSelectedCase] = useState<CaseItem | null>(null);

  const cases: CaseItem[] = [
    {
      id: "1",
      name: "Maria Rodriguez",
      email: "maria.r@email.com",
      issue: "Mold & Water Damage",
      status: 'new',
      date: "Nov 14, 2024",
      severity: "High",
      preview: "Severe mold growth in bathroom and bedroom affecting health of children. Issue started 3 months ago and landlord has not responded to multiple requests."
    },
    {
      id: "2",
      name: "James Chen",
      email: "jchen@email.com",
      issue: "Heating Problems",
      status: 'in-review',
      date: "Nov 13, 2024",
      severity: "Emergency",
      preview: "No heat in apartment for 2 weeks during winter. Elderly resident living alone. Landlord aware but no action taken."
    },
    {
      id: "3",
      name: "Sarah Johnson",
      email: "s.johnson@email.com",
      issue: "Pest Infestation",
      status: 'contacted',
      date: "Nov 12, 2024",
      severity: "Medium",
      preview: "Ongoing cockroach and rodent infestation. Multiple complaints to property management with minimal response."
    },
    {
      id: "4",
      name: "David Park",
      email: "dpark@email.com",
      issue: "Electrical Problems",
      status: 'new',
      date: "Nov 11, 2024",
      severity: "High",
      preview: "Frequent power outages and sparking outlets. Safety concern for young family."
    },
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'new':
        return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">NEW</Badge>;
      case 'in-review':
        return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">IN REVIEW</Badge>;
      case 'contacted':
        return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">CONTACTED</Badge>;
      default:
        return null;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'emergency':
        return 'text-red-600';
      case 'high':
        return 'text-orange-600';
      case 'medium':
        return 'text-yellow-600';
      default:
        return 'text-gray-600';
    }
  };

  if (isMobile) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-full h-full p-0 m-0">
          <div className="flex flex-col h-full">
            <DialogHeader className="p-4 border-b">
              <DialogTitle>Client Intake Cases</DialogTitle>
            </DialogHeader>
            
            <div className="flex-1 overflow-y-auto p-4">
              <div className="space-y-4 mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input 
                    placeholder="Search by name, email, or issue..."
                    className="pl-10 h-11"
                  />
                </div>
                
                <div className="flex gap-2">
                  <Select>
                    <SelectTrigger className="flex-1 h-11">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="new">New</SelectItem>
                      <SelectItem value="in-review">In Review</SelectItem>
                      <SelectItem value="contacted">Contacted</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Select>
                    <SelectTrigger className="flex-1 h-11">
                      <SelectValue placeholder="Severity" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Severities</SelectItem>
                      <SelectItem value="emergency">Emergency</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-3">
                {cases.map((caseItem) => (
                  <div
                    key={caseItem.id}
                    className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => setSelectedCase(caseItem)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="text-gray-900 mb-1">{caseItem.name}</div>
                        <div className="text-sm text-gray-500">{caseItem.email}</div>
                      </div>
                      {getStatusBadge(caseItem.status)}
                    </div>
                    <div className="text-sm text-gray-700 mb-2">{caseItem.issue}</div>
                    <div className="flex items-center justify-between text-sm">
                      <span className={getSeverityColor(caseItem.severity)}>
                        {caseItem.severity} Priority
                      </span>
                      <span className="text-gray-500">{caseItem.date}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] p-0">
        <DialogHeader className="p-6 pb-4 border-b">
          <DialogTitle>Client Intake Cases</DialogTitle>
        </DialogHeader>
        
        <div className="flex h-[calc(90vh-120px)]">
          {/* Left Panel - Case List */}
          <div className="w-1/2 border-r overflow-y-auto">
            <div className="p-6 space-y-4 border-b">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input 
                  placeholder="Search by name, email, or issue..."
                  className="pl-10 h-11"
                />
              </div>
              
              <div className="flex gap-3">
                <Select>
                  <SelectTrigger className="h-11">
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="new">New</SelectItem>
                    <SelectItem value="in-review">In Review</SelectItem>
                    <SelectItem value="contacted">Contacted</SelectItem>
                  </SelectContent>
                </Select>
                
                <Select>
                  <SelectTrigger className="h-11">
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="Severity" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Severities</SelectItem>
                    <SelectItem value="emergency">Emergency</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="divide-y">
              {cases.map((caseItem) => (
                <div
                  key={caseItem.id}
                  className={`p-4 cursor-pointer transition-colors hover:bg-gray-50 ${
                    selectedCase?.id === caseItem.id ? 'bg-blue-50 border-l-4 border-l-blue-600' : ''
                  }`}
                  onClick={() => setSelectedCase(caseItem)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="text-gray-900 mb-1">{caseItem.name}</div>
                      <div className="text-sm text-gray-500">{caseItem.email}</div>
                    </div>
                    {getStatusBadge(caseItem.status)}
                  </div>
                  <div className="text-sm text-gray-700 mb-2">{caseItem.issue}</div>
                  <div className="flex items-center justify-between text-sm">
                    <span className={getSeverityColor(caseItem.severity)}>
                      {caseItem.severity} Priority
                    </span>
                    <span className="text-gray-500">{caseItem.date}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Panel - Case Preview */}
          <div className="w-1/2 overflow-y-auto">
            {selectedCase ? (
              <div className="p-6">
                <div className="mb-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-gray-900 mb-2">{selectedCase.name}</h3>
                      <p className="text-gray-600">{selectedCase.email}</p>
                    </div>
                    {getStatusBadge(selectedCase.status)}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div>
                      <div className="text-sm text-gray-500 mb-1">Submitted</div>
                      <div className="text-gray-900">{selectedCase.date}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-500 mb-1">Priority</div>
                      <div className={getSeverityColor(selectedCase.severity)}>
                        {selectedCase.severity}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mb-6">
                  <h4 className="text-gray-900 mb-2">Primary Issue</h4>
                  <p className="text-gray-700">{selectedCase.issue}</p>
                </div>

                <div className="mb-6">
                  <h4 className="text-gray-900 mb-2">Case Summary</h4>
                  <p className="text-gray-700">{selectedCase.preview}</p>
                </div>

                <div className="space-y-3">
                  <Button className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white">
                    View Full Details
                    <ChevronRight className="w-4 h-4 ml-2" />
                  </Button>
                  <Button variant="outline" className="w-full h-11">
                    Contact Client
                  </Button>
                  <Button variant="outline" className="w-full h-11">
                    Update Status
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                Select a case to view details
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
