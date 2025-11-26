import React, { useState } from 'react';
import StatsOverview from './StatsOverview';
import FeaturedDAOs from './FeaturedDAOs';
import { DAO } from '../types/dao';

interface MainDashboardProps {
  onDAOSelect: (dao: DAO) => void;
  onCreateDAO?: () => void;
  sidebarCollapsed?: boolean;
}

const MainDashboard: React.FC<MainDashboardProps> = ({ onDAOSelect, onCreateDAO, sidebarCollapsed = false }) => {
  const [mobileTab, setMobileTab] = useState<'daos' | 'feed'>('daos');

  return (
    <div className="w-full h-screen flex flex-col lg:flex-row">
      {/* Mobile Tab Switcher */}
      <div className="lg:hidden border-b border-gray-700/40 px-4">
        <div className="flex gap-4">
          <button
            onClick={() => setMobileTab('daos')}
            className={`px-4 py-3 font-medium transition-colors border-b-2 ${
              mobileTab === 'daos'
                ? 'text-[#e1fd6a] border-[#e1fd6a]'
                : 'text-gray-400 border-transparent hover:text-white'
            }`}
          >
            DAOs
          </button>
          <button
            onClick={() => setMobileTab('feed')}
            className={`px-4 py-3 font-medium transition-colors border-b-2 ${
              mobileTab === 'feed'
                ? 'text-[#e1fd6a] border-[#e1fd6a]'
                : 'text-gray-400 border-transparent hover:text-white'
            }`}
          >
            Live Feed
          </button>
        </div>
      </div>

      {/* DAOs Section */}
      <div className={`flex-1 min-w-0 overflow-y-auto px-6 py-6 sm:py-8 ${
        mobileTab === 'feed' ? 'hidden lg:block' : 'block'
      }`}>
        <FeaturedDAOs onDAOSelect={onDAOSelect} onCreateDAO={onCreateDAO} sidebarCollapsed={sidebarCollapsed} />
      </div>

      {/* Live Feed Section */}
      <div className={`lg:w-56 xl:w-64 2xl:w-[25rem] shrink-0 overflow-y-auto px-4 py-6 ${
        mobileTab === 'daos' ? 'hidden lg:block' : 'block'
      }`}>
        <StatsOverview />
      </div>
    </div>
  );
};

export default MainDashboard;