import { Button } from "./ui/button";

interface FormNavigationProps {
  onBack: () => void;
  onSaveExit: () => void;
  onContinue: () => void;
  isFirstStep: boolean;
  isLastStep: boolean;
  isMobile?: boolean;
}

export function FormNavigation({
  onBack,
  onSaveExit,
  onContinue,
  isFirstStep,
  isLastStep,
  isMobile
}: FormNavigationProps) {
  if (isMobile) {
    return (
      <div className="flex flex-col gap-3 mt-6">
        <Button onClick={onContinue} className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white">
          {isLastStep ? 'Submit' : 'Continue'}
        </Button>
        <Button onClick={onSaveExit} variant="outline" className="w-full h-11">
          Save & Exit
        </Button>
        {!isFirstStep && (
          <Button onClick={onBack} variant="outline" className="w-full h-11">
            Back
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between mt-8 pt-5 border-t border-gray-200">
      <div>
        {!isFirstStep && (
          <Button onClick={onBack} variant="outline" className="h-11 px-6">
            Back
          </Button>
        )}
      </div>
      <Button onClick={onSaveExit} variant="outline" className="h-11 px-6">
        Save & Exit
      </Button>
      <Button onClick={onContinue} className="h-11 px-6 bg-blue-600 hover:bg-blue-700 text-white">
        {isLastStep ? 'Submit' : 'Continue'}
      </Button>
    </div>
  );
}
