import { Label } from "./ui/label";
import { Upload, FileText, X } from "lucide-react";
import { Button } from "./ui/button";

interface Step5Props {
  isMobile?: boolean;
}

export function Step5Documents({ isMobile }: Step5Props) {
  const uploadedFiles = [
    { name: "Lease_Agreement.pdf", size: "2.4 MB", type: "PDF" },
    { name: "Issue_Photo_1.jpg", size: "1.8 MB", type: "Image" },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h2 className="mb-3">Document Upload</h2>
        <div className="h-px bg-gray-200 mb-4" />
        
        <div className="space-y-3">
          <p className="text-gray-600">
            Please upload any relevant documents that support your case. This may include:
          </p>
          <ul className="list-disc list-inside space-y-1 text-gray-600 ml-4 text-sm">
            <li>Lease agreement</li>
            <li>Photos or videos of the issues</li>
            <li>Written communication with landlord (emails, letters, texts)</li>
            <li>Repair requests</li>
            <li>Medical records or doctor's notes</li>
            <li>Inspection reports</li>
            <li>Receipts for temporary repairs or expenses</li>
          </ul>
        </div>

        <div className="mt-4 border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors cursor-pointer bg-gray-50">
          <Upload className="w-10 h-10 text-gray-400 mx-auto mb-3" />
          <div className="mb-2 text-gray-700">Drag and drop files here, or click to browse</div>
          <p className="text-sm text-gray-500">Maximum file size: 10MB. Accepted formats: PDF, JPG, PNG, DOC, DOCX</p>
          <Button className="mt-3 bg-blue-600 hover:bg-blue-700 text-white h-11">
            Choose Files
          </Button>
        </div>
      </div>

      <div>
        <h2 className="mb-3">Uploaded Files</h2>
        <div className="h-px bg-gray-200 mb-4" />
        
        {uploadedFiles.length > 0 ? (
          <div className="space-y-3">
            {uploadedFiles.map((file, index) => (
              <div 
                key={index}
                className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded flex items-center justify-center">
                    <FileText className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <div className="text-gray-900">{file.name}</div>
                    <div className="text-sm text-gray-500">{file.size} • {file.type}</div>
                  </div>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon"
                  className="hover:bg-red-50 hover:text-red-600"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-center py-8">No files uploaded yet</p>
        )}
      </div>

      <div>
        <h2 className="mb-3">Additional Information</h2>
        <div className="h-px bg-gray-200 mb-4" />
        
        <div className="space-y-1.5">
          <Label>Is there anything else you would like us to know about your situation?</Label>
          <textarea 
            className="w-full min-h-24 p-3 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
            placeholder="Add any additional details, context, or concerns that haven't been covered in the previous sections..."
            rows={4}
          />
        </div>
      </div>

      <div>
        <h2 className="mb-3">Consent and Signature</h2>
        <div className="h-px bg-gray-200 mb-4" />
        
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <input 
              type="checkbox" 
              id="consent-accuracy"
              className="w-5 h-5 mt-0.5 accent-blue-600 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 rounded"
            />
            <Label htmlFor="consent-accuracy" className="cursor-pointer">
              I certify that the information provided in this intake form is true and accurate to the best of my knowledge.
            </Label>
          </div>
          
          <div className="flex items-start gap-3">
            <input 
              type="checkbox" 
              id="consent-share"
              className="w-5 h-5 mt-0.5 accent-blue-600 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 rounded"
            />
            <Label htmlFor="consent-share" className="cursor-pointer">
              I authorize the legal team to share this information with relevant parties as necessary for my case.
            </Label>
          </div>

          <div className="flex items-start gap-3">
            <input 
              type="checkbox" 
              id="consent-contact"
              className="w-5 h-5 mt-0.5 accent-blue-600 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 rounded"
            />
            <Label htmlFor="consent-contact" className="cursor-pointer">
              I consent to being contacted by the legal team regarding my case via the contact methods I have provided.
            </Label>
          </div>
        </div>

        <div className="mt-4 p-3.5 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-900">
            By submitting this form, you are requesting legal assistance. Our team will review your information and contact you within 2-3 business days to discuss your case and next steps.
          </p>
        </div>
      </div>
    </div>
  );
}
