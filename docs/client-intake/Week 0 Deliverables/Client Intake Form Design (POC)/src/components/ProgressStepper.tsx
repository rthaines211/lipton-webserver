import { Check } from "lucide-react";

interface Step {
  number: number;
  title: string;
  completed: boolean;
  current: boolean;
}

interface ProgressStepperProps {
  steps: Step[];
  isMobile?: boolean;
}

export function ProgressStepper({ steps, isMobile }: ProgressStepperProps) {
  if (isMobile) {
    const currentStep = steps.find(s => s.current);
    const currentIndex = steps.findIndex(s => s.current);
    const progress = ((currentIndex) / (steps.length - 1)) * 100;

    return (
      <div className="mb-6">
        <div className="text-gray-600 mb-2">
          Step {currentStep?.number} of {steps.length}: {currentStep?.title}
        </div>
        <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
          <div 
            className="h-full bg-blue-600 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between max-w-4xl mx-auto">
        {steps.map((step, index) => (
          <div key={step.number} className="flex items-center flex-1">
            <div className="flex flex-col items-center">
              <div
                className={`
                  flex items-center justify-center rounded-full transition-all
                  ${step.completed 
                    ? 'w-10 h-10 bg-green-500 text-white' 
                    : step.current 
                    ? 'w-12 h-12 bg-blue-600 text-white' 
                    : 'w-10 h-10 border-2 border-dashed border-gray-300 bg-white text-gray-400'
                  }
                `}
              >
                {step.completed ? (
                  <Check className="w-5 h-5" />
                ) : (
                  <span>{step.number}</span>
                )}
              </div>
              <div className={`mt-2 text-center ${step.current ? 'text-blue-600' : 'text-gray-600'}`}>
                {step.title}
              </div>
            </div>
            {index < steps.length - 1 && (
              <div className="flex-1 h-0.5 mx-4 -mt-8">
                <div className={`h-full ${step.completed ? 'bg-green-500' : 'border-t-2 border-dashed border-gray-300'}`} />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
