import React from 'react';
import { RefreshCw, AlertCircle } from 'lucide-react';

interface SectionLoaderProps {
  isLoading: boolean;
  error?: string | null;
  onRetry?: () => void;
  children: React.ReactNode;
  className?: string;
  minHeight?: string;
  loadingText?: string;
}

const SectionLoader: React.FC<SectionLoaderProps> = ({
  isLoading,
  error,
  onRetry,
  children,
  className = '',
  minHeight = '400px',
  loadingText = 'Loading...'
}) => {
  // Do not obstruct UI: render children without overlay while loading
  if (isLoading) {
    return <div className={className}>{children}</div>;
  }

  if (error) {
    return (
      <div
        className={`relative ${className}`}
        style={{ minHeight }}
      >
        <div className="absolute inset-0 bg-red-50/80 backdrop-blur-sm rounded-lg flex items-center justify-center z-10">
          <div className="text-center p-6">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-red-800 mb-2">Error Loading Section</h3>
            <p className="text-red-600 mb-4 max-w-md">{error}</p>
            {onRetry && (
              <button
                onClick={onRetry}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Try Again
              </button>
            )}
          </div>
        </div>
        {/* Render faded content underneath */}
        <div className="opacity-20 pointer-events-none">
          {children}
        </div>
      </div>
    );
  }

  return <div className={className}>{children}</div>;
};

export default SectionLoader;