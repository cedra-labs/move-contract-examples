import { useState, useEffect, useCallback } from 'react';
import { useWallet } from '../contexts/CedraWalletProvider';
import { ActivityTracker, Activity, PaginatedActivities, PaginationOptions } from '../useServices/useActivityTracker';
import { ACTIVITY_CONFIG } from '../constants/activityConstants';

interface UseActivitiesOptions {
  daoAddress?: string;
  userAddress?: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
  limit?: number;
  enablePagination?: boolean;
  loadMoreMode?: boolean; // For infinite scroll or load more
}

export const useActivities = (options: UseActivitiesOptions = {}) => {
  const { account } = useWallet();
  const {
    daoAddress,
    userAddress = account?.address,
    autoRefresh = true,
    refreshInterval = ACTIVITY_CONFIG.AUTO_REFRESH_INTERVAL,
    limit = ACTIVITY_CONFIG.DEFAULT_LIMIT,
    enablePagination = false,
    loadMoreMode = false
  } = options;

  const [activities, setActivities] = useState<Activity[]>([]);
  const [allActivities, setAllActivities] = useState<Activity[]>([]); // For load more mode
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(limit);
  const [pagination, setPagination] = useState<PaginatedActivities['pagination'] | null>(null);

  const fetchActivities = useCallback(async (page?: number, appendMode = false) => {
    if (!daoAddress && !userAddress) {
      setActivities([]);
      setPagination(null);
      return;
    }

    const targetPage = page ?? currentPage;
    const paginationOptions: PaginationOptions = enablePagination 
      ? {
          page: targetPage,
          limit: itemsPerPage
        }
      : { limit: itemsPerPage };

    if (!appendMode) {
      setIsLoading(true);
    }
    setError(null);

    try {
      let result: PaginatedActivities;

      if (daoAddress) {
        console.log(`🔍 Fetching activities for DAO: ${daoAddress} - Page: ${targetPage}`);
        result = await ActivityTracker.getDAOActivities(daoAddress, paginationOptions);
      } else if (userAddress) {
        console.log(`🔍 Fetching activities for user: ${userAddress} - Page: ${targetPage}`);
        result = await ActivityTracker.getUserActivities(userAddress, paginationOptions);
      } else {
        throw new Error('No address specified');
      }

      if (loadMoreMode && appendMode) {
        // Append new activities for infinite scroll/load more
        setAllActivities(prev => [...prev, ...result.activities]);
        setActivities(prev => [...prev, ...result.activities]);
      } else {
        // Replace activities for pagination
        setActivities(result.activities);
        setAllActivities(result.activities);
      }

      setPagination(result.pagination);
      setLastRefresh(Date.now());
      console.log(` Fetched ${result.activities.length} activities (Page ${targetPage})`);
    } catch (err) {
      console.error('Error fetching activities:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch activities');
    } finally {
      setIsLoading(false);
    }
  }, [daoAddress, userAddress, currentPage, itemsPerPage, enablePagination, loadMoreMode]);

  // Initial fetch
  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  // Auto-refresh setup
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchActivities();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, fetchActivities]);

  const refresh = useCallback(() => {
    setCurrentPage(1);
    setActivities([]);
    setAllActivities([]);
    fetchActivities(1);
  }, [fetchActivities]);

  const clearCache = useCallback(() => {
    ActivityTracker.clearCache();
    refresh();
  }, [refresh]);

  const goToPage = useCallback((page: number) => {
    setCurrentPage(page);
    fetchActivities(page);
  }, [fetchActivities]);

  const changeItemsPerPage = useCallback((newLimit: number) => {
    setItemsPerPage(newLimit);
    setCurrentPage(1);
    setActivities([]);
    setAllActivities([]);
    // Fetch will be triggered by useEffect when itemsPerPage changes
  }, []);

  const loadMore = useCallback(() => {
    if (pagination?.hasNextPage && !isLoading) {
      const nextPage = currentPage + 1;
      setCurrentPage(nextPage);
      fetchActivities(nextPage, true); // true for append mode
    }
  }, [pagination?.hasNextPage, isLoading, currentPage, fetchActivities]);

  // Trigger fetch when itemsPerPage changes
  useEffect(() => {
    if (currentPage === 1) {
      fetchActivities(1);
    }
  }, [itemsPerPage, fetchActivities]);

  return {
    activities,
    allActivities,
    isLoading,
    error,
    lastRefresh,
    pagination,
    currentPage,
    itemsPerPage,
    refresh,
    clearCache,
    goToPage,
    changeItemsPerPage,
    loadMore
  };
};

export const useGlobalActivities = (options: {
  limit?: number;
  enablePagination?: boolean;
  loadMoreMode?: boolean;
} = {}) => {
  const { limit = 100, enablePagination = false, loadMoreMode = false } = options;
  
  const [activities, setActivities] = useState<Activity[]>([]);
  const [allActivities, setAllActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(limit);
  const [pagination, setPagination] = useState<PaginatedActivities['pagination'] | null>(null);

  const fetchGlobalActivities = useCallback(async (page?: number, appendMode = false) => {
    const targetPage = page ?? currentPage;
    const paginationOptions: PaginationOptions = enablePagination 
      ? {
          page: targetPage,
          limit: itemsPerPage
        }
      : { limit: itemsPerPage };

    if (!appendMode) {
      setIsLoading(true);
    }
    setError(null);

    try {
      console.log(`🌍 Fetching global activities - Page: ${targetPage}`);
      const result = await ActivityTracker.getGlobalActivities(paginationOptions);
      
      if (loadMoreMode && appendMode) {
        setAllActivities(prev => [...prev, ...result.activities]);
        setActivities(prev => [...prev, ...result.activities]);
      } else {
        setActivities(result.activities);
        setAllActivities(result.activities);
      }

      setPagination(result.pagination);
      console.log(` Fetched ${result.activities.length} global activities (Page ${targetPage})`);
    } catch (err) {
      console.error('Error fetching global activities:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch global activities');
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, itemsPerPage, enablePagination, loadMoreMode]);

  useEffect(() => {
    fetchGlobalActivities();
  }, [fetchGlobalActivities]);

  const refresh = useCallback(() => {
    setCurrentPage(1);
    setActivities([]);
    setAllActivities([]);
    fetchGlobalActivities(1);
  }, [fetchGlobalActivities]);

  const goToPage = useCallback((page: number) => {
    setCurrentPage(page);
    fetchGlobalActivities(page);
  }, [fetchGlobalActivities]);

  const changeItemsPerPage = useCallback((newLimit: number) => {
    setItemsPerPage(newLimit);
    setCurrentPage(1);
    setActivities([]);
    setAllActivities([]);
  }, []);

  const loadMore = useCallback(() => {
    if (pagination?.hasNextPage && !isLoading) {
      const nextPage = currentPage + 1;
      setCurrentPage(nextPage);
      fetchGlobalActivities(nextPage, true);
    }
  }, [pagination?.hasNextPage, isLoading, currentPage, fetchGlobalActivities]);

  useEffect(() => {
    if (currentPage === 1) {
      fetchGlobalActivities(1);
    }
  }, [itemsPerPage, fetchGlobalActivities]);

  return {
    activities,
    allActivities,
    isLoading,
    error,
    pagination,
    currentPage,
    itemsPerPage,
    refresh,
    goToPage,
    changeItemsPerPage,
    loadMore
  };
};

export const useUserActivities = (
  userAddress?: string, 
  options: {
    limit?: number;
    enablePagination?: boolean;
    loadMoreMode?: boolean;
  } = {}
) => {
  const { account } = useWallet();
  const { limit = 50, enablePagination = false, loadMoreMode = false } = options;
  const address = userAddress || account?.address;

  return useActivities({
    userAddress: address,
    limit,
    enablePagination,
    loadMoreMode,
    autoRefresh: true,
    refreshInterval: 30000
  });
};

export const useDAOActivities = (
  daoAddress: string, 
  options: {
    limit?: number;
    enablePagination?: boolean;
    loadMoreMode?: boolean;
  } = {}
) => {
  const { limit = 50, enablePagination = false, loadMoreMode = false } = options;
  
  return useActivities({
    daoAddress,
    limit,
    enablePagination,
    loadMoreMode,
    autoRefresh: true,
    refreshInterval: 30000
  });
};