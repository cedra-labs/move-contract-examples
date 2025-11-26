import React, { useState } from 'react';
import { DAO } from '../types/dao';

interface DAOCardProps {
  dao: DAO;
  onClick: () => void;
  sidebarCollapsed?: boolean;
}

const DAOCard: React.FC<DAOCardProps> = ({ dao, onClick, sidebarCollapsed = true }) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [backgroundLoaded, setBackgroundLoaded] = useState(false);
  const [backgroundError, setBackgroundError] = useState(false);
  const backgroundRetryRef = React.useRef(0);


  // Debug logging for subname (reduced verbosity)
  React.useEffect(() => {
    if (dao.subname) {
    }
  }, [dao.name, dao.subname]);

  // Optimized image preloading - keep images stable once loaded
  React.useEffect(() => {
    if (dao.image) {
      const img = new Image();
      img.decoding = 'async' as any;
      img.onload = () => setImageLoaded(true);
      img.onerror = () => setImageError(true);
      img.loading = 'eager';
      img.fetchPriority = 'high';
      img.src = dao.image;
    } else {
      setImageError(true);
    }
  }, [dao.image]);

  React.useEffect(() => {
    // Reset retry count when background changes
    backgroundRetryRef.current = 0;

    if (dao.background && dao.background.trim()) {

      // Validate background URL before attempting to load
      const isValidUrl = (url: string) => {
        try {
          // Check if it's a data URL
          if (url.startsWith('data:')) {
            return url.includes('image/');
          }
          // Check if it's a valid HTTP/HTTPS URL
          if (url.startsWith('http://') || url.startsWith('https://')) {
            new URL(url);
            return true;
          }
          return false;
        } catch {
          return false;
        }
      };

      if (!isValidUrl(dao.background)) {
        console.warn(` Invalid background URL for ${dao.name}:`, dao.background);
        setBackgroundError(true);
        return;
      }

      setBackgroundLoaded(false);
      setBackgroundError(false);

      const bgImg = new Image();
      bgImg.decoding = 'async' as any;
      bgImg.crossOrigin = 'anonymous'; // Add CORS support
      bgImg.loading = 'eager';
      bgImg.fetchPriority = 'high';

      // Add a timeout to detect hanging requests
      const timeoutId = setTimeout(() => {
        console.warn(`⏰ Background loading timeout for ${dao.name} after 5 seconds`);
        setBackgroundError(true);
      }, 5000); // Reduced timeout

      bgImg.onload = () => {
        clearTimeout(timeoutId);
        setBackgroundLoaded(true);
      };

      bgImg.onerror = () => {
        clearTimeout(timeoutId);
        setBackgroundError(true);
      };

      bgImg.src = dao.background;
    } else {
      setBackgroundError(true);
    }
  }, [dao.background]);

  return (
    <div
      onClick={onClick}
      className="bg-gray-900/60 backdrop-blur-sm border border-gray-700/40 hover:border-[#e1fd6a]/50 rounded-lg overflow-hidden cursor-pointer group animate-fade-in relative transition-colors w-full"
    >
      {/* Twitter-like banner */}
      {dao.background && !backgroundError && (
        <div
          className={`absolute left-0 right-0 top-0 h-20 bg-cover bg-center pointer-events-none transition-opacity duration-300 ${
            backgroundLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          style={{ backgroundImage: `url(${dao.background})` }}
        />
      )}

      {/* Loading background */}
      {dao.background && !backgroundLoaded && !backgroundError && (
        <div className="absolute left-0 right-0 top-0 h-20 bg-gradient-to-r from-purple-500/20 to-pink-500/20 pointer-events-none relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full animate-pulse"></div>
        </div>
      )}

      {/* Fallback gradient */}
      {(!dao.background || backgroundError) && (
        <div className="absolute left-0 right-0 top-0 h-20 bg-gradient-to-r from-indigo-500/30 to-purple-500/30 pointer-events-none" />
      )}

      {/* Content */}
      <div className="relative z-10 p-6">
        <div className="flex items-start justify-between mb-4 mt-4">
          <div className="relative">
            {/* Loading placeholder */}
            {dao.image && !imageLoaded && !imageError && (
              <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-gray-600/70 to-gray-700/70 animate-pulse border-2 border-white/30 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full animate-pulse"></div>
              </div>
            )}

            {/* Show image if loaded */}
            {dao.image && imageLoaded && !imageError && (
              <img
                src={dao.image}
                alt={dao.name}
                loading="eager"
                decoding="async"
                className="w-16 h-16 rounded-xl object-cover shadow-lg"
              />
            )}

            {/* Fallback to initials */}
            {(!dao.image || imageError) && (
              <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-700 shadow-lg flex items-center justify-center">
                <span className="text-white text-xl font-bold">
                  {dao.name.charAt(0).toUpperCase()}
                </span>
              </div>
            )}

            {/* Subname Badge */}
            {dao.subname && dao.subname.trim() && (
              <div className="absolute -bottom-2 -right-2">
                <span className="px-2 py-1 bg-gradient-to-r from-indigo-500 to-purple-600 text-white dark:text-black text-xs rounded-lg font-medium shadow-lg">
                  {dao.subname}
                </span>
              </div>
            )}
          </div>

          {dao.category !== 'featured' && (
            <div className="flex items-center space-x-2">
              <span className="px-3 py-1 bg-indigo-500/30 text-indigo-200 text-xs rounded-full border border-indigo-400/50 backdrop-blur-sm">
                {dao.chain}
              </span>
            </div>
          )}
        </div>

        <div className="mb-4 mt-6">
          <h3 className="text-white font-semibold text-lg mb-2">
            {dao.name}
          </h3>
          <p className="text-gray-400 text-sm line-clamp-2 leading-relaxed">
            {dao.description}
          </p>
        </div>

        <div className="space-y-3">
          <div className="flex items-start justify-between pt-3 border-t border-gray-700/30">
            <div>
              <div className="text-white text-sm font-semibold">
                {dao.members ?? 0}
              </div>
              <div className="text-gray-500 text-xs">
                Members
              </div>
            </div>
            <div>
              <div className="text-white text-sm font-semibold">
                {dao.proposals ?? 0}
              </div>
              <div className="text-gray-500 text-xs">
                Proposals
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DAOCard;