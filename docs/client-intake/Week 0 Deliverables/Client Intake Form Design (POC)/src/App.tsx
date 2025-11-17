import { useState, useEffect } from "react";
import { ProgressStepper } from "./components/ProgressStepper";
import { AutoSaveIndicator } from "./components/AutoSaveIndicator";
import { FormNavigation } from "./components/FormNavigation";
import { Step1PersonalContact } from "./components/Step1PersonalContact";
import { Step2BuildingIssues } from "./components/Step2BuildingIssues";
import { Step3SafetyHealth } from "./components/Step3SafetyHealth";
import { Step4LandlordLegal } from "./components/Step4LandlordLegal";
import { Step5Documents } from "./components/Step5Documents";
import { CaseListModal } from "./components/CaseListModal";
import { Button } from "./components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./components/ui/tabs";

type SaveStatus = 'saving' | 'saved' | 'error';

function App() {
  const [currentStep, setCurrentStep] = useState(1);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved');
  const [isMobile, setIsMobile] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [viewMode, setViewMode] = useState<'desktop-form-1' | 'desktop-form-3' | 'mobile-form' | 'desktop-modal' | 'mobile-modal'>('desktop-form-1');

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const steps = [
    { number: 1, title: 'Personal & Contact', completed: currentStep > 1, current: currentStep === 1 },
    { number: 2, title: 'Building Issues', completed: currentStep > 2, current: currentStep === 2 },
    { number: 3, title: 'Safety & Health', completed: currentStep > 3, current: currentStep === 3 },
    { number: 4, title: 'Landlord & Legal', completed: currentStep > 4, current: currentStep === 4 },
    { number: 5, title: 'Documents', completed: currentStep > 5, current: currentStep === 5 },
  ];

  const handleContinue = () => {
    if (currentStep < 5) {
      setSaveStatus('saving');
      setTimeout(() => {
        setSaveStatus('saved');
        setCurrentStep(currentStep + 1);
      }, 800);
    } else {
      alert('Form submitted successfully!');
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSaveExit = () => {
    setSaveStatus('saving');
    setTimeout(() => {
      setSaveStatus('saved');
      alert('Progress saved! You can return to complete the form later.');
    }, 800);
  };

  const renderStep = () => {
    const effectiveStep = viewMode === 'desktop-form-3' ? 3 : currentStep;
    const effectiveMobile = viewMode === 'mobile-form' ? true : isMobile;

    switch (effectiveStep) {
      case 1:
        return <Step1PersonalContact isMobile={effectiveMobile} />;
      case 2:
        return <Step2BuildingIssues isMobile={effectiveMobile} />;
      case 3:
        return <Step3SafetyHealth isMobile={effectiveMobile} />;
      case 4:
        return <Step4LandlordLegal isMobile={effectiveMobile} />;
      case 5:
        return <Step5Documents isMobile={effectiveMobile} />;
      default:
        return null;
    }
  };

  const renderForm = (forcedStep?: number, forcedMobile?: boolean) => {
    const displayStep = forcedStep || currentStep;
    const displayMobile = forcedMobile !== undefined ? forcedMobile : isMobile;
    
    const displaySteps = steps.map(step => ({
      ...step,
      completed: displayStep > step.number,
      current: displayStep === step.number
    }));

    return (
      <div className={`min-h-screen bg-gray-50 ${displayMobile ? 'p-4' : 'p-8'}`}>
        <AutoSaveIndicator status={saveStatus} />
        
        <div className={`bg-white rounded-lg shadow-sm ${displayMobile ? 'p-5' : 'p-8'} ${displayMobile ? 'max-w-full' : 'max-w-5xl mx-auto'}`}>
          <div className="mb-6">
            <h1 className="text-gray-900 mb-1.5">Client Intake Form</h1>
            <p className="text-gray-600">Please provide detailed information about your housing situation</p>
          </div>

          <ProgressStepper steps={displaySteps} isMobile={displayMobile} />

          {renderStep()}

          <FormNavigation
            onBack={handleBack}
            onSaveExit={handleSaveExit}
            onContinue={handleContinue}
            isFirstStep={displayStep === 1}
            isLastStep={displayStep === 5}
            isMobile={displayMobile}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* View Mode Selector */}
      <div className="bg-white border-b sticky top-0 z-40">
        <div className="max-w-7xl mx-auto p-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <h2 className="text-gray-900">Client Intake Form - Design Showcase</h2>
            <div className="flex gap-2 flex-wrap">
              <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as any)} className="w-full md:w-auto">
                <TabsList className="grid grid-cols-3 md:grid-cols-6 w-full">
                  <TabsTrigger value="desktop-form-1" className="text-xs md:text-sm">
                    Form Step 1
                  </TabsTrigger>
                  <TabsTrigger value="desktop-form-3" className="text-xs md:text-sm">
                    Form Step 3
                  </TabsTrigger>
                  <TabsTrigger value="mobile-form" className="text-xs md:text-sm">
                    Mobile Form
                  </TabsTrigger>
                  <TabsTrigger value="desktop-modal" className="text-xs md:text-sm">
                    Modal List
                  </TabsTrigger>
                  <TabsTrigger value="mobile-modal" className="text-xs md:text-sm">
                    Mobile Modal
                  </TabsTrigger>
                  <TabsTrigger value="desktop-form-1" className="text-xs md:text-sm" asChild>
                    <Button 
                      variant="outline"
                      onClick={() => setShowModal(true)}
                    >
                      View Cases
                    </Button>
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="p-0">
        {viewMode === 'desktop-form-1' && renderForm(1, false)}
        {viewMode === 'desktop-form-3' && renderForm(3, false)}
        {viewMode === 'mobile-form' && (
          <div className="max-w-[375px] mx-auto">
            {renderForm(2, true)}
          </div>
        )}
        {viewMode === 'desktop-modal' && (
          <div className="flex items-center justify-center min-h-[600px] p-8">
            <Button 
              className="bg-blue-600 hover:bg-blue-700 text-white h-11 px-8"
              onClick={() => setShowModal(true)}
            >
              Open Case List Modal (Desktop)
            </Button>
          </div>
        )}
        {viewMode === 'mobile-modal' && (
          <div className="max-w-[375px] mx-auto flex items-center justify-center min-h-[600px] p-8">
            <Button 
              className="bg-blue-600 hover:bg-blue-700 text-white h-11 px-8 w-full"
              onClick={() => setShowModal(true)}
            >
              Open Case List Modal (Mobile)
            </Button>
          </div>
        )}
      </div>

      {/* Modal */}
      <CaseListModal 
        open={showModal} 
        onOpenChange={setShowModal}
        isMobile={viewMode === 'mobile-modal'}
      />
    </div>
  );
}

export default App;
