import { Check, AlertCircle } from "lucide-react";

type SaveStatus = 'saving' | 'saved' | 'error';

interface AutoSaveIndicatorProps {
  status: SaveStatus;
  timestamp?: string;
}

export function AutoSaveIndicator({ status, timestamp = "Nov 14, 2:30pm" }: AutoSaveIndicatorProps) {
  return (
    <div className="fixed top-4 right-4 z-50">
      <div
        className={`
          flex items-center gap-2 px-4 py-2 rounded-lg shadow-lg text-white
          ${status === 'saved' ? 'bg-green-500' : status === 'error' ? 'bg-red-500' : 'bg-gray-500'}
        `}
      >
        {status === 'saved' && <Check className="w-4 h-4" />}
        {status === 'error' && <AlertCircle className="w-4 h-4" />}
        {status === 'saving' && (
          <div className="flex gap-1">
            <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" style={{ animationDelay: '0ms' }} />
            <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" style={{ animationDelay: '150ms' }} />
            <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" style={{ animationDelay: '300ms' }} />
          </div>
        )}
        <span className="text-sm">
          {status === 'saving' && 'Saving changes...'}
          {status === 'saved' && `All changes saved - ${timestamp}`}
          {status === 'error' && 'Error saving changes'}
        </span>
      </div>
    </div>
  );
}
