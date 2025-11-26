import { useCallback, useEffect, useState } from 'react';
import { useDAOState, DAOMembershipData } from '../contexts/DAOStateContext';
import { DAO } from '../types/dao';

export interface UseDAOMembershipReturn {
  membershipData: DAOMembershipData | null;
  isLoading: boolean;
  isMember: boolean;
  isStaker: boolean;
  canJoinDAO: boolean;
  needsMoreStake: number;
  refresh: () => Promise<void>;
  updateLocalState: (updates: Partial<DAOMembershipData>) => void;
}

export function useDAOMembership(dao: DAO): UseDAOMembershipReturn {
  const { userState, refreshDAOData, updateDAOMembership, isInitialized } = useDAOState();
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Get membership data for this DAO
  const membershipData = userState?.daoMemberships.get(dao.id) || null;

  // Derived state
  const isMember = membershipData?.isMember || false;
  const isStaker = membershipData?.isStaker || false;
  const stakedAmount = membershipData?.stakedAmount || 0;
  const minStakeRequired = membershipData?.minStakeRequired || 0;
  const userBalance = userState?.totalBalance || 0;

  // Check if user can join DAO (has enough balance + already staked enough)
  const canJoinDAO = stakedAmount >= minStakeRequired;
  
  // Calculate how much more the user needs to stake
  const needsMoreStake = Math.max(0, minStakeRequired - stakedAmount);

  // Refresh this DAO's data
  const refresh = useCallback(async () => {
    if (!dao.id) return;
    
    setIsRefreshing(true);
    try {
      await refreshDAOData(dao.id, dao.name);
    } finally {
      setIsRefreshing(false);
    }
  }, [dao.id, dao.name, refreshDAOData]);

  // Update local state (for optimistic updates)
  const updateLocalState = useCallback((updates: Partial<DAOMembershipData>) => {
    updateDAOMembership(dao.id, updates);
  }, [dao.id, updateDAOMembership]);

  // Auto-refresh if no data exists for this DAO and we're initialized
  useEffect(() => {
    if (isInitialized && !membershipData && !isRefreshing && dao.id) {
      refresh();
    }
  }, [isInitialized, membershipData, isRefreshing, dao.id, refresh]);

  return {
    membershipData,
    isLoading: isRefreshing || !isInitialized,
    isMember,
    isStaker,
    canJoinDAO,
    needsMoreStake,
    refresh,
    updateLocalState,
  };
}

// Hook for getting user's overall DAO portfolio
export function useDAOPortfolio() {
  const { userState, refreshWalletBalance } = useDAOState();

  const totalDAOs = userState?.daoMemberships.size || 0;
  const activeMemberships = Array.from(userState?.daoMemberships.values() || [])
    .filter(membership => membership.isMember).length;
  
  const totalStaked = Array.from(userState?.daoMemberships.values() || [])
    .reduce((sum, membership) => sum + membership.stakedAmount, 0);

  const totalVotingPower = Array.from(userState?.daoMemberships.values() || [])
    .reduce((sum, membership) => sum + membership.votingPower, 0);

  return {
    totalDAOs,
    activeMemberships,
    totalStaked,
    totalVotingPower,
    walletBalance: userState?.totalBalance || 0,
    refresh: refreshWalletBalance,
    memberships: Array.from(userState?.daoMemberships.values() || []),
  };
}

// Hook for checking if cached data needs refresh
export function useDAODataFreshness(daoId: string) {
  const { userState } = useDAOState();
  const membershipData = userState?.daoMemberships.get(daoId);
  
  if (!membershipData) return { isStale: true, age: 0 };
  
  const age = Date.now() - membershipData.lastUpdated;
  const isStale = age > 60000; // 1 minute
  
  return { isStale, age };
}