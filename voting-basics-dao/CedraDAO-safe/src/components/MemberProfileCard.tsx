import React, { useState, useRef, useEffect } from 'react';
import { Copy, X } from 'lucide-react';
import { useGetProfile } from '../useServices/useProfile';

interface MemberProfileCardProps {
  address: string;
  shortAddress: string;
  memberNumber?: number;
  isOpen: boolean;
  onClose: () => void;
  anchorRef: React.RefObject<HTMLDivElement>;
}

const MemberProfileCard: React.FC<MemberProfileCardProps> = ({
  address,
  shortAddress,
  memberNumber,
  isOpen,
  onClose,
  anchorRef
}) => {
  const { data: profileData, isLoading } = useGetProfile(address || null);
  const cardRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        cardRef.current &&
        !cardRef.current.contains(event.target as Node) &&
        anchorRef.current &&
        !anchorRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose, anchorRef]);

  const handleCopy = () => {
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

  // Calculate position relative to anchor with flip detection
  const getPosition = () => {
    if (!anchorRef.current) return { top: 0, left: 0 };
    const rect = anchorRef.current.getBoundingClientRect();
    const cardHeight = 160; // Reduced estimated card height
    const viewportHeight = window.innerHeight;
    const spaceBelow = viewportHeight - rect.bottom;
    const spaceAbove = rect.top;

    // If not enough space below and more space above, show above
    if (spaceBelow < cardHeight && spaceAbove > spaceBelow) {
      return {
        top: rect.top - cardHeight - 8,
        left: rect.left
      };
    }

    // Default: show below
    return {
      top: rect.bottom + 8,
      left: rect.left
    };
  };

  const position = getPosition();
  const displayName = profileData?.displayName || shortAddress;
  const avatarUrl = profileData?.avatarUrl;

  return (
    <>
      {/* Backdrop for mobile */}
      <div className="fixed inset-0 z-40 sm:hidden" onClick={onClose} />

      {/* Profile Card */}
      <div
        ref={cardRef}
        className="fixed z-50 bg-[#1a1a1c] border border-white/10 rounded-xl shadow-2xl w-80 animate-in fade-in slide-in-from-top-2 duration-200"
        style={{
          top: `${position.top}px`,
          left: `${position.left}px`
        }}
      >
        {/* Content */}
        <div className="p-3">
          {isLoading ? (
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gray-600/50 rounded-lg animate-pulse"></div>
              <div className="flex-1">
                <div className="h-4 w-24 bg-gray-600/50 rounded animate-pulse mb-2"></div>
                <div className="h-3 w-32 bg-gray-600/50 rounded animate-pulse"></div>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-3">
              {/* Avatar on left */}
              <div className="flex-shrink-0">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={displayName}
                    className="w-12 h-12 rounded-lg object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                      if (fallback) fallback.classList.remove('hidden');
                    }}
                  />
                ) : null}
                <div className={`w-12 h-12 bg-gradient-to-br from-indigo-600 to-purple-700 rounded-lg flex items-center justify-center text-white text-sm font-bold ${avatarUrl ? 'hidden' : ''}`}>
                  {shortAddress.slice(2, 4).toUpperCase()}
                </div>
              </div>

              {/* Name and address on right */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div className="flex-1 min-w-0">
                    <h4 className="text-white font-semibold text-sm truncate">
                      {displayName}
                    </h4>
                    {memberNumber && (
                      <p className="text-xs text-gray-400">Member #{memberNumber}</p>
                    )}
                  </div>
                  <button
                    onClick={onClose}
                    className="p-1 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-all flex-shrink-0"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Address with copy button */}
                <div className="flex items-center gap-2">
                  <p className="text-xs text-gray-400 font-mono truncate flex-1">
                    {address}
                  </p>
                  <button
                    onClick={handleCopy}
                    className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-all flex-shrink-0"
                    title="Copy address"
                  >
                    {copied ? (
                      <span className="text-green-400 text-xs font-medium">✓</span>
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default MemberProfileCard;
