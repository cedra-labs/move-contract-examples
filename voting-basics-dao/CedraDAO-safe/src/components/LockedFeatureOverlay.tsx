import React from 'react';
import { Lock } from 'lucide-react';

interface LockedFeatureOverlayProps {
  title?: string;
  description?: string;
  buttonText?: string;
  onButtonClick?: () => void;
  icon?: React.ReactNode;
  showOverlay?: boolean;
}

const LockedFeatureOverlay: React.FC<LockedFeatureOverlayProps> = ({
  title = 'Locked Feature',
  description = 'You must hold a Holders Tab Key NFT to unlock + view the holders stats',
  buttonText = 'Connect Wallet',
  onButtonClick,
  icon,
  showOverlay = true
}) => {
  if (!showOverlay) return null;

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center min-h-[400px]">
      {/* Backdrop with blur */}
      <div
        className="absolute inset-0 backdrop-blur-md"
        style={{
          backgroundColor: 'rgba(16, 16, 16, 0.85)'
        }}
      />

      {/* Lock Modal Card */}
      <div className="relative z-40 rounded-xl shadow-2xl p-8 max-w-md mx-4 text-center border border-white/10" style={{ backgroundColor: '#101010' }}>
        {/* Icon */}
        <div className="flex justify-center mb-4">
          {icon || (
            <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(225, 254, 103, 0.2)' }}>
              <Lock className="w-8 h-8" style={{ color: '#e1fe67' }} />
            </div>
          )}
        </div>

        {/* Title */}
        <h3 className="text-xl font-bold mb-3 text-white">
          {title}
        </h3>

        {/* Description */}
        <p className="text-sm mb-6 leading-relaxed text-gray-300">
          {description}
        </p>

        {/* Action Button - matches your app's orange button style */}
        {onButtonClick && (
          <button
            onClick={onButtonClick}
            className="px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg transition-all duration-200"
          >
            {buttonText}
          </button>
        )}
      </div>
    </div>
  );
};

export default LockedFeatureOverlay;
