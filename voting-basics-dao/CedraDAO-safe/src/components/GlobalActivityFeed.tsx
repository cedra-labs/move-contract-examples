import React from 'react';
import { Activity, Globe, RefreshCw } from 'lucide-react';
import { useGlobalActivities } from '../useServices/useOptimizedActivityTracker';
import OptimizedActivityTable from './OptimizedActivityTable';

interface GlobalActivityFeedProps {
  maxRows?: number;
  showHeader?: boolean;
  className?: string;
  paginationType?: 'pagination' | 'loadMore' | 'infinite' | 'none';
  enablePagination?: boolean;
}

const GlobalActivityFeed: React.FC<GlobalActivityFeedProps> = ({
  maxRows = 20,
  showHeader = true,
  className = '',
  paginationType = 'loadMore',
  enablePagination = true
}) => {
  const { 
    activities, 
    isLoading, 
    error, 
    pagination,
    refetch
  } = useGlobalActivities({
    limit: maxRows,
    page: 1
  });

  return (
    <div className={`space-y-4 ${className}`}>
      {showHeader && (
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Globe className="w-5 h-5 text-blue-400" />
            <h2 className="text-xl font-bold text-white">Global Activity Feed</h2>
          </div>
          <button
            onClick={refetch}
            disabled={isLoading}
            className="p-2 text-gray-400 hover:text-white transition-colors disabled:opacity-50"
            title="Refresh Global Activities"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      )}

      <OptimizedActivityTable
        activities={activities}
        isLoading={isLoading}
        error={error}
        onRefresh={refetch}
        showUserColumn={true}
        showDAOColumn={true}
        showAmountColumn={true}
        maxRows={maxRows}
        title="Global Activity Feed"
      />
    </div>
  );
};

export default GlobalActivityFeed;