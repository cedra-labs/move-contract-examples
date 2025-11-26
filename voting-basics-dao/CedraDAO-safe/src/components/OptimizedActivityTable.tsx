import React, { useState, useEffect, useRef } from 'react';
import { Activity, OptimizedActivityTracker } from '../useServices/useOptimizedActivityTracker';
import { Clock, ExternalLink, RefreshCw, AlertCircle, Activity as ActivityIcon, ChevronDown, ChevronUp, ChevronLeft, ChevronRight } from 'lucide-react';
import { getActivityColor } from '../constants/activityConstants';
import { useGetProfile } from '../useServices/useProfile';
import { truncateAddress } from '../utils/addressUtils';

interface OptimizedActivityTableProps {
  activities: Activity[];
  isLoading?: boolean;
  error?: string | null;
  onRefresh?: () => void;
  onNextPage?: () => void;
  onPrevPage?: () => void;
  hasNextPage?: boolean;
  hasPrevPage?: boolean;
  showingCountText?: string; // optional custom text like "Showing 10 of 12 activities"
  showUserColumn?: boolean;
  showDAOColumn?: boolean;
  showAmountColumn?: boolean;
  showActionColumn?: boolean;
  maxRows?: number;
  className?: string;
  title?: string;
}

// User display without profile pictures (as requested)
const UserDisplay: React.FC<{ address: string; isCompact?: boolean }> = ({ address }) => {
  const { data: profileData, isLoading } = useGetProfile(address || null);
  const label = profileData?.displayName && !isLoading ? profileData.displayName : truncateAddress(address);
  return (
    <span className="text-xs sm:text-sm font-mono text-white truncate">{label}</span>
  );
};

// Global flag to track if activities have ever been loaded (persists across component unmounts)
const hasLoadedActivitiesOnce = (() => {
  let loaded = false;
  return {
    get: () => loaded,
    set: (value: boolean) => { loaded = value; }
  };
})();

const OptimizedActivityTable: React.FC<OptimizedActivityTableProps> = ({
  activities,
  isLoading = false,
  error = null,
  onRefresh,
  onNextPage,
  onPrevPage,
  hasNextPage,
  hasPrevPage,
  showingCountText,
  showUserColumn = false,
  showDAOColumn = false,
  showAmountColumn = true,
  showActionColumn = true,
  maxRows,
  className = '',
  title = 'Recent Activity'
}) => {
  // Keep track of cached activities to show while loading
  const [cachedActivities, setCachedActivities] = useState<Activity[]>(activities);
  const hasEverLoaded = useRef(hasLoadedActivitiesOnce.get());

  // Update cached activities when new data arrives
  useEffect(() => {
    if (activities.length > 0) {
      setCachedActivities(activities);
      hasEverLoaded.current = true;
      hasLoadedActivitiesOnce.set(true);
    }
  }, [activities]);

  // Use cached activities while loading (after first load)
  const displayActivities = maxRows
    ? (isLoading && hasEverLoaded.current ? cachedActivities : activities).slice(0, maxRows)
    : (isLoading && hasEverLoaded.current ? cachedActivities : activities);

  // Use the utility function instead of local implementation

  const formatAmount = (amount?: number) => {
    if (!amount) return null;

    // Remove trailing zeros and unnecessary decimal points
    const formattedNumber = amount % 1 === 0 ? amount.toString() : parseFloat(amount.toFixed(4)).toString();

    return (
      <span>{formattedNumber} CEDRA</span>
    );
  };

  const getExplorerUrl = (activity: Activity) => {
    return `https://cedrascan.com/txn/${activity.transactionHash}`;
  };

  if (error) {
    return (
      <div className={`bg-red-500/10 border border-red-500/30 rounded-xl p-6 ${className}`}>
        <div className="flex items-center space-x-3">
          <AlertCircle className="w-5 h-5 text-red-400" />
          <div>
            <p className="text-red-300 font-medium">Error Loading Activities</p>
            <p className="text-red-200 text-sm">{error}</p>
            {onRefresh && (
              <button
                onClick={onRefresh}
                className="mt-2 px-3 py-1 bg-red-600/20 text-red-300 rounded text-sm hover:bg-red-600/30 transition-colors"
              >
                Try Again
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Remove skeleton: show minimal container while loading first time
  if (isLoading && !hasEverLoaded.current && cachedActivities.length === 0) {
    return (
      <div className={`p-4 ${className}`}>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm sm:text-base md:text-lg font-semibold text-white flex items-center gap-2">
            <ActivityIcon className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="truncate">{title}</span>
          </h3>
          <div className="animate-spin rounded-full h-3 w-3 sm:h-4 sm:w-4 border-b-2 border-blue-400"></div>
        </div>
      </div>
    );
  }

  return (
    <div className={`border border-white/5 rounded-xl p-4 w-full max-w-full overflow-hidden ${className}`} style={{ maxWidth: '100vw' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <div className="flex items-center gap-2">
          <h3 className="text-sm sm:text-base md:text-lg font-semibold flex items-center gap-2 text-white">
            <ActivityIcon className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0 text-white" />
            <span className="truncate">{title}</span>
          </h3>
        </div>
        <div className="flex items-center space-x-1 sm:space-x-2">
          {isLoading && (
            <div className="animate-spin rounded-full h-3 w-3 sm:h-4 sm:w-4 border-b-2 border-blue-400"></div>
          )}
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={isLoading}
              className="p-1 sm:p-2 text-[#e1fd6a] hover:text-[#e1fd6a]/80 transition-colors disabled:opacity-50 rounded-lg hover:bg-white/5"
              title="Refresh Activities"
            >
              <RefreshCw className="w-3 h-3 sm:w-4 sm:h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Desktop Table View */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full text-sm text-white">
          <thead>
            <tr className="border-b border-white/10">
              <th className="text-left py-4 px-4 font-medium text-white">Activity</th>
              <th className="text-right py-4 px-4 font-medium text-white">Type</th>
              {showUserColumn && (
                <th className="text-right py-4 px-4 font-medium text-white">User</th>
              )}
              {showAmountColumn && (
                <th className="text-right py-4 px-4 font-medium text-white">Amount</th>
              )}
              <th className="text-right py-4 px-4 font-medium text-white">Time</th>
              {showDAOColumn && (
                <th className="text-left py-4 px-4 font-medium text-white hidden md:table-cell">DAO</th>
              )}
              {showActionColumn && (
                <th className="text-right py-4 px-4 font-medium text-white">Action</th>
              )}
            </tr>
          </thead>
          <tbody>
            {displayActivities.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 px-4 text-center">
                  <ActivityIcon className="w-12 h-12 text-gray-500 mx-auto mb-3" />
                  <p className="text-gray-400 text-sm">No recent activities found</p>
                  <p className="text-gray-500 text-xs mt-1">
                    Activities will appear here as users interact with the DAO
                  </p>
                </td>
              </tr>
            ) : (
              displayActivities.map((activity, index) => {
                const display = OptimizedActivityTracker.getActivityDisplay(activity);
                
                return (
                  <tr key={activity.id || index} className="border-b border-white/5 hover:bg-white/5 transition-all">
                    {/* Activity */}
                    <td className="py-4 px-4">
                      <div className="min-w-0">
                        <h4 className="font-medium text-sm leading-tight truncate text-white">{activity.title}</h4>
                        <p className="text-xs leading-tight truncate text-gray-400">{activity.description}</p>
                      </div>
                    </td>

                    {/* Type */}
                    <td className="py-4 px-4 text-right">
                      <span className="text-sm text-white">
                        {display.displayType}
                      </span>
                    </td>

                    {/* User */}
                    {showUserColumn && (
                      <td className="py-4 px-4 text-right">
                        <div className="flex justify-end">
                          <UserDisplay address={activity.user} />
                        </div>
                      </td>
                    )}

                    {/* Amount */}
                    {showAmountColumn && (
                      <td className="py-4 px-4">
                        <div className="flex justify-end">
                          {activity.amount ? (
                            <span className="text-sm font-medium text-white">{formatAmount(activity.amount)}</span>
                          ) : (
                            <span className="text-sm text-gray-500">-</span>
                          )}
                        </div>
                      </td>
                    )}

                    {/* Time */}
                    <td className="py-4 px-4 text-right">
                      <div className="flex items-center justify-end space-x-1 text-white">
                        <Clock className="w-3 h-3" />
                        <span className="text-xs">{OptimizedActivityTracker.formatTimeAgo(activity.timestamp)}</span>
                      </div>
                    </td>

                    {/* DAO */}
                    {showDAOColumn && (
                      <td className="py-4 px-4 hidden md:table-cell">
                        <span className="text-sm font-mono text-white">{truncateAddress(activity.dao)}</span>
                      </td>
                    )}

                    {/* Action */}
                    {showActionColumn && (
                      <td className="py-4 px-4 text-right">
                        {activity.transactionHash && activity.transactionHash !== '0x' ? (
                          <a
                            href={getExplorerUrl(activity)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex p-2 rounded-lg transition-all text-white hover:text-white hover:bg-white/5"
                            title="View on Explorer"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        ) : (
                          <span className="text-xs text-gray-500">-</span>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="sm:hidden">
        {displayActivities.length === 0 ? (
          <div className="text-center py-8">
            <ActivityIcon className="w-12 h-12 text-gray-500 mx-auto mb-3" />
            <p className="text-white text-sm">No recent activities found</p>
            <p className="text-gray-500 text-xs mt-1">
              Activities will appear here as users interact with the DAO
            </p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {displayActivities.map((activity, index) => {
              const display = OptimizedActivityTracker.getActivityDisplay(activity);

              return (
                <div
                  key={activity.id || index}
                  className="p-2.5 transition-all border-b last:border-b-0 hover:bg-white/5 border-white/5"
                >
                  <div className="flex items-center justify-between">
                    {/* Left Side */}
                    <div className="flex items-center space-x-2 flex-1 min-w-0">
                      <div className="min-w-0 flex-1">
                        <div className="mb-1">
                          <h4 className="font-medium text-sm leading-tight truncate text-white">{activity.title}</h4>
                        </div>
                        <div className="flex items-center space-x-3 text-xs">
                          {showUserColumn && (
                            <UserDisplay address={activity.user} isCompact={true} />
                          )}
                          {showAmountColumn && activity.amount && (
                            <div className="font-medium text-white">{formatAmount(activity.amount)}</div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right Side */}
                    <div className="flex flex-col items-end space-y-1 flex-shrink-0">
                      <span className="text-xs text-white">
                        {display.displayType}
                      </span>
                      <div className="flex items-center space-x-1 text-white">
                        <Clock className="w-3 h-3" />
                        <span className="text-xs">{OptimizedActivityTracker.formatTimeAgo(activity.timestamp)}</span>
                      </div>
                      {showActionColumn && activity.transactionHash && activity.transactionHash !== '0x' && (
                        <a
                          href={getExplorerUrl(activity)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-shrink-0 p-1 text-white hover:text-white hover:bg-white/10 rounded-lg transition-all"
                          title="View on Explorer"
                        >
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer: count and pagination */}
      {(showingCountText || hasNextPage || hasPrevPage || (maxRows && activities.length > maxRows)) && (
        <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="text-xs sm:text-sm text-white text-center sm:text-left">
            {showingCountText
              ? showingCountText
              : maxRows && activities.length > maxRows
                ? `Showing ${maxRows} of ${activities.length} activities`
                : null}
          </div>

          {(onPrevPage || onNextPage) && (
            <div className="flex items-center gap-2 w-full sm:w-auto justify-center sm:justify-end">
              {onPrevPage && (
                <button
                  onClick={onPrevPage}
                  disabled={isLoading || !hasPrevPage}
                  className="px-3 py-1.5 text-xs sm:text-sm rounded-lg border border-white/10 text-white hover:bg-white/10 disabled:opacity-50 whitespace-nowrap inline-flex items-center gap-1"
                  aria-label="Previous page"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span className="hidden sm:inline">Previous page</span>
                  <span className="sm:hidden">Prev</span>
                </button>
              )}
              {onNextPage && (
                <button
                  onClick={onNextPage}
                  disabled={isLoading || !hasNextPage}
                  className="px-3 py-1.5 text-xs sm:text-sm rounded-lg border border-white/10 text-white hover:bg-white/10 disabled:opacity-50 whitespace-nowrap inline-flex items-center gap-1"
                  aria-label="Next page"
                >
                  <span className="hidden sm:inline">Next page</span>
                  <span className="sm:hidden">Next</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default OptimizedActivityTable;