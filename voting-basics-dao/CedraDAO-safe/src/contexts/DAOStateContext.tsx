import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useWallet } from './CedraWalletProvider';
import { BalanceService } from '../useServices/useBalance';
import { cedraClient } from '../cedra_service/cedra-client';
import { MODULE_ADDRESS } from '../cedra_service/constants';

export interface DAOMembershipData {
  daoId: string;
  daoName: string;
  isMember: boolean;
  isStaker: boolean;
  stakedAmount: number;
  votingPower: number;
  minStakeRequired: number;
  lastUpdated: number;
  memberSince?: number;
}

export interface DAOMemberList {
  members: any[];
  totalMembers: number;
  totalStakers: number;
  totalStaked: number;
  minStakeRequired: number;
  minProposalStake: number;
  lastUpdated: number;
}

export interface UserDAOState {
  walletAddress: string;
  totalBalance: number;
  lastBalanceUpdate: number;
  daoMemberships: Map<string, DAOMembershipData>;
  daoMemberLists: Map<string, DAOMemberList>;
  isLoading: boolean;
  lastGlobalUpdate: number;
}

interface DAOStateContextType {
  userState: UserDAOState | null;
  isInitialized: boolean;
  refreshUserState: () => Promise<void>;
  refreshWalletBalance: () => Promise<void>;
  refreshDAOData: (daoId: string) => Promise<void>;
  updateDAOMembership: (daoId: string, data: Partial<DAOMembershipData>) => void;
  updateDAOMemberList: (daoId: string, data: DAOMemberList) => void;
  getDAOMemberList: (daoId: string) => DAOMemberList | null;
  clearUserState: () => void;
}

const DAOStateContext = createContext<DAOStateContextType>({
  userState: null,
  isInitialized: false,
  refreshUserState: async () => {},
  refreshWalletBalance: async () => {},
  refreshDAOData: async () => {},
  updateDAOMembership: () => {},
  updateDAOMemberList: () => {},
  getDAOMemberList: () => null,
  clearUserState: () => {},
});

export const useDAOState = () => useContext(DAOStateContext);

// Storage keys
const STORAGE_KEY = 'dao_user_state';
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes (increased to reduce API calls)
const STALE_DURATION = 5 * 60 * 1000; // 5 minutes (increased to reduce API calls)
const BALANCE_STALE_DURATION = 2 * 60 * 1000; // 2 minutes for wallet balance (increased to reduce API calls)

export const DAOStateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { account } = useWallet();
  const [userState, setUserState] = useState<UserDAOState | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Helper functions (use BalanceService for consistency)
  const toMOVE = (u64: number): number => BalanceService.octasToCedra(u64);

  // Load state from localStorage
  const loadFromStorage = useCallback((walletAddress: string): UserDAOState | null => {
    try {
      const stored = localStorage.getItem(`${STORAGE_KEY}_${walletAddress}`);
      if (!stored) return null;

      const parsed = JSON.parse(stored);

      // Convert plain object back to Map
      const daoMemberships = new Map<string, DAOMembershipData>();
      if (parsed.daoMemberships) {
        Object.entries(parsed.daoMemberships).forEach(([key, value]) => {
          daoMemberships.set(key, value as DAOMembershipData);
        });
      }

      const daoMemberLists = new Map<string, DAOMemberList>();
      if (parsed.daoMemberLists) {
        Object.entries(parsed.daoMemberLists).forEach(([key, value]) => {
          daoMemberLists.set(key, value as DAOMemberList);
        });
      }

      return {
        ...parsed,
        daoMemberships,
        daoMemberLists,
      };
    } catch (error) {
      console.warn('Failed to load DAO state from storage:', error);
      return null;
    }
  }, []);

  // Save state to localStorage
  const saveToStorage = useCallback((state: UserDAOState) => {
    try {
      // Convert Map to plain object for JSON storage
      const stateToStore = {
        ...state,
        daoMemberships: Object.fromEntries(state.daoMemberships),
        daoMemberLists: Object.fromEntries(state.daoMemberLists),
      };

      localStorage.setItem(`${STORAGE_KEY}_${state.walletAddress}`, JSON.stringify(stateToStore));
    } catch (error) {
      console.warn('Failed to save DAO state to storage:', error);
    }
  }, []);

  // Simple rate limiter to prevent overwhelming the RPC
  const lastRequestTime = React.useRef(0);
  const requestQueue = React.useRef(Promise.resolve());
  
  const throttledRequest = useCallback(async (fn: () => Promise<any>): Promise<any> => {
    // Queue requests to prevent parallel bombardment
    const currentRequest = requestQueue.current.then(async () => {
      const now = Date.now();
      const timeSinceLastRequest = now - lastRequestTime.current;
      const minDelay = 100; // 100ms minimum between requests
      
      if (timeSinceLastRequest < minDelay) {
        await new Promise(resolve => setTimeout(resolve, minDelay - timeSinceLastRequest));
      }
      
      lastRequestTime.current = Date.now();
      return fn();
    });
    
    requestQueue.current = currentRequest.catch(() => {}); // Don't propagate errors to queue
    return currentRequest;
  }, []);

  // Helper function for retrying failed requests with exponential backoff
  const retryWithBackoff = useCallback(async (fn: () => Promise<any>, maxRetries = 3): Promise<any> => {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await throttledRequest(fn);
      } catch (error: any) {
        const isRateLimit = error?.message?.includes('429') || error?.message?.includes('Too Many Requests');
        const isNetworkError = error?.message?.includes('Network Error') || error?.code === 'ERR_NETWORK';
        const isCorsError = error?.message?.includes('CORS') || error?.message?.includes('Access-Control-Allow-Origin');
        
        if ((isRateLimit || isNetworkError || isCorsError) && attempt < maxRetries - 1) {
          const delay = Math.min(1000 * Math.pow(2, attempt), 10000); // Max 10 second delay
          console.log(`Request failed (attempt ${attempt + 1}/${maxRetries}), retrying in ${delay}ms...`, error.message);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        throw error;
      }
    }
  }, [throttledRequest]);

  // Fetch user's wallet balance
  const fetchWalletBalance = useCallback(async (walletAddress: string): Promise<number> => {
    console.log('Fetching wallet balance for:', walletAddress);
    
    try {
      // Use view function for new RPC compatibility (more reliable than getAccountResource)
      const balRes = await retryWithBackoff(() => cedraClient.view({
        payload: {
          function: '0x1::coin::balance',
          typeArguments: ['0x1::cedra_coin::CedraCoin'],
          functionArguments: [walletAddress]
        }
      }));
      const raw = Number(balRes?.[0] ?? 0);
      const balance = toMOVE(raw);
      console.log('Balance fetched via view function:', balance);
      return balance;
    } catch (error) {
      console.log('View function method failed, trying alternatives...');
      
      // Fallback 1: Scan resources for any CoinStore with non-zero value (robust on Cedra)
      try {
        const resources: any[] = await retryWithBackoff(() => (cedraClient as any).getAccountResources?.({ accountAddress: walletAddress }));
        if (Array.isArray(resources)) {
          // Prefer CedraCoin specifically if present
          const cedraCoinStore = resources.find(r => typeof r?.type === 'string'
            && r.type === `0x1::coin::CoinStore<0x1::cedra_coin::CedraCoin>`);
          const candidate = cedraCoinStore || resources.find(r => typeof r?.type === 'string'
            && r.type.startsWith('0x1::coin::CoinStore<') && r.data?.coin?.value);
          if (candidate?.data?.coin?.value) {
            const raw = Number(candidate.data.coin.value || 0);
            const balance = toMOVE(raw);
            console.log('Balance fetched via resource scan:', balance);
            return balance;
          }
        }
      } catch (err) {
        console.log('Resource scan failed:', err);
      }

      // Fallback 2: View function with retry logic
      try {
        const balRes = await retryWithBackoff(() => cedraClient.view({
          payload: {
            function: `0x1::coin::balance`,
            typeArguments: ["0x1::cedra_coin::CedraCoin"],
            functionArguments: [walletAddress],
          },
        }));
        const balance = toMOVE(Number(balRes[0] || 0));
        console.log('Balance fetched via view function:', balance);
        return balance;
      } catch (fallbackError) {
        console.warn('Failed to fetch wallet balance via all methods:', fallbackError);
        return 0;
      }
    }
  }, [retryWithBackoff]);

  // Fetch membership data for a specific DAO
  const fetchDAOMembership = useCallback(async (
    daoId: string, 
    walletAddress: string, 
    daoName?: string
  ): Promise<DAOMembershipData> => {
    const [minStakeRes, isMemberRes] = await Promise.all([
      retryWithBackoff(() => cedraClient.view({ 
        payload: { 
          function: `${MODULE_ADDRESS}::membership::get_min_stake`, 
          functionArguments: [daoId] 
        } 
      })).catch(() => [0]),
      retryWithBackoff(() => cedraClient.view({ 
        payload: { 
          function: `${MODULE_ADDRESS}::membership::is_member`, 
          functionArguments: [daoId, walletAddress] 
        } 
      })).catch(() => [false])
    ]);

    let userStakedInDAO = 0;
    let isStaker = false;
    let votingPower = 0;

    try {
      // Get user's stake in this DAO with retry logic
      const daoStakeRes = await retryWithBackoff(() => cedraClient.view({ 
        payload: { 
          function: `${MODULE_ADDRESS}::staking::get_dao_stake_direct`, 
          functionArguments: [daoId, walletAddress] 
        } 
      }));
      userStakedInDAO = toMOVE(Number(daoStakeRes[0] || 0));
      votingPower = userStakedInDAO;
    } catch {
      // Fallback to other staking functions
      try {
        const daoStakeRes = await retryWithBackoff(() => cedraClient.view({ 
          payload: { 
            function: `${MODULE_ADDRESS}::staking::get_dao_staked_balance`, 
            functionArguments: [daoId, walletAddress] 
          } 
        }));
        userStakedInDAO = toMOVE(Number(daoStakeRes[0] || 0));
        votingPower = userStakedInDAO;
      } catch {
        const votingPowerRes = await retryWithBackoff(() => cedraClient.view({ 
          payload: { 
            function: `${MODULE_ADDRESS}::membership::get_voting_power`, 
            functionArguments: [daoId, walletAddress] 
          } 
        }));
        votingPower = toMOVE(Number(votingPowerRes[0] || 0));
        userStakedInDAO = votingPower;
      }
    }

    // Check if user is a staker
    try {
      const isDaoStakerRes = await retryWithBackoff(() => cedraClient.view({ 
        payload: { 
          function: `${MODULE_ADDRESS}::staking::is_dao_staker`, 
          functionArguments: [daoId, walletAddress] 
        } 
      }));
      isStaker = Boolean(isDaoStakerRes[0]);
    } catch {
      isStaker = userStakedInDAO > 0;
    }

    return {
      daoId,
      daoName: daoName || daoId.slice(0, 10) + '...',
      isMember: Boolean(isMemberRes[0]),
      isStaker,
      stakedAmount: userStakedInDAO,
      votingPower,
      minStakeRequired: toMOVE(Number(minStakeRes[0] || 0)),
      lastUpdated: Date.now(),
    };
  }, [toMOVE, retryWithBackoff]);

  // Refresh data for a specific DAO
  const refreshDAOData = useCallback(async (daoId: string, daoName?: string) => {
    if (!account?.address) return;

    try {
      const membershipData = await fetchDAOMembership(daoId, account.address, daoName);
      
      setUserState(prevState => {
        if (!prevState) return null;
        
        const newMemberships = new Map(prevState.daoMemberships);
        newMemberships.set(daoId, membershipData);
        
        const newState = {
          ...prevState,
          daoMemberships: newMemberships,
          lastGlobalUpdate: Date.now(),
        };
        
        saveToStorage(newState);
        return newState;
      });
    } catch (error) {
      console.warn(`Failed to refresh DAO data for ${daoId}:`, error);
    }
  }, [account?.address, fetchDAOMembership, saveToStorage]);

  // Refresh entire user state
  const refreshUserState = useCallback(async () => {
    if (!account?.address) return;

    setUserState(prevState => prevState ? { ...prevState, isLoading: true } : null);

    try {
      const walletBalance = await fetchWalletBalance(account.address);
      
      setUserState(prevState => {
        // If we have existing state, update wallet balance and refresh stale DAOs
        if (prevState) {
          const staleDaos: string[] = [];
          const now = Date.now();
          
          prevState.daoMemberships.forEach((membership, daoId) => {
            if (now - membership.lastUpdated > STALE_DURATION) {
              staleDaos.push(daoId);
            }
          });

          // Note: We'll handle stale DAO refresh separately to avoid state mutation
          const updatedState = {
            ...prevState,
            totalBalance: walletBalance,
            lastBalanceUpdate: Date.now(),
            isLoading: false,
            lastGlobalUpdate: Date.now(),
          };

          saveToStorage(updatedState);
          
          // Asynchronously refresh stale DAOs without blocking state update
          if (staleDaos.length > 0) {
            setTimeout(async () => {
              for (const daoId of staleDaos) {
                const existingMembership = updatedState.daoMemberships.get(daoId);
                try {
                  const refreshedData = await fetchDAOMembership(daoId, account.address, existingMembership?.daoName);
                  setUserState(currentState => {
                    if (!currentState) return null;
                    const newMemberships = new Map(currentState.daoMemberships);
                    newMemberships.set(daoId, refreshedData);
                    const newState = {
                      ...currentState,
                      daoMemberships: newMemberships,
                      lastGlobalUpdate: Date.now(),
                    };
                    saveToStorage(newState);
                    return newState;
                  });
                } catch (error) {
                  console.warn(`Failed to refresh stale DAO ${daoId}:`, error);
                }
              }
            }, 100);
          }

          return updatedState;
        } else {
          // Create new state
          const newState: UserDAOState = {
            walletAddress: account.address,
            totalBalance: walletBalance,
            lastBalanceUpdate: Date.now(),
            daoMemberships: new Map(),
            daoMemberLists: new Map(),
            isLoading: false,
            lastGlobalUpdate: Date.now(),
          };

          saveToStorage(newState);
          return newState;
        }
      });
    } catch (error) {
      console.error('Failed to refresh user state:', error);
      setUserState(prevState => prevState ? { ...prevState, isLoading: false } : null);
    }
  }, [account?.address, fetchWalletBalance, fetchDAOMembership, saveToStorage]);

  // Update DAO membership data locally
  const updateDAOMembership = useCallback((daoId: string, data: Partial<DAOMembershipData>) => {
    setUserState(prevState => {
      if (!prevState) return null;

      const existingMembership = prevState.daoMemberships.get(daoId);
      if (!existingMembership) return prevState;

      const updatedMembership = {
        ...existingMembership,
        ...data,
        lastUpdated: Date.now(),
      };

      const newMemberships = new Map(prevState.daoMemberships);
      newMemberships.set(daoId, updatedMembership);

      const newState = {
        ...prevState,
        daoMemberships: newMemberships,
        lastGlobalUpdate: Date.now(),
      };

      saveToStorage(newState);
      return newState;
    });
  }, [saveToStorage]);

  // Refresh just the wallet balance
  const refreshWalletBalance = useCallback(async () => {
    if (!account?.address) return;

    try {
      const walletBalance = await fetchWalletBalance(account.address);
      
      setUserState(prevState => {
        if (!prevState) return null;
        
        const updatedState = {
          ...prevState,
          totalBalance: walletBalance,
          lastBalanceUpdate: Date.now(),
        };
        
        saveToStorage(updatedState);
        return updatedState;
      });
    } catch (error) {
      console.error('Failed to refresh wallet balance:', error);
    }
  }, [account?.address, fetchWalletBalance, saveToStorage]);

  // Update DAO member list
  const updateDAOMemberList = useCallback((daoId: string, data: DAOMemberList) => {
    setUserState(prevState => {
      if (!prevState) return null;

      const newMemberLists = new Map(prevState.daoMemberLists);
      newMemberLists.set(daoId, { ...data, lastUpdated: Date.now() });

      const newState = {
        ...prevState,
        daoMemberLists: newMemberLists,
      };

      saveToStorage(newState);
      return newState;
    });
  }, [saveToStorage]);

  // Get DAO member list
  const getDAOMemberList = useCallback((daoId: string): DAOMemberList | null => {
    return userState?.daoMemberLists.get(daoId) || null;
  }, [userState]);

  // Clear user state (on disconnect)
  const clearUserState = useCallback(() => {
    setUserState(null);
    setIsInitialized(false);
  }, []);

  // Initialize state when wallet address becomes available
  useEffect(() => {
    if (!account?.address) {
      setUserState(null);
      setIsInitialized(false);
      return;
    }

    const initializeState = async () => {
      // Load from storage first
      const storedState = loadFromStorage(account.address);
      
      if (storedState) {
        // Check if cached data is still valid
        const now = Date.now();
        const isStale = now - storedState.lastGlobalUpdate > CACHE_DURATION;
        
        if (!isStale) {
          setUserState(storedState);
          setIsInitialized(true);
          return;
        }
      }

      // Initialize fresh state inline to avoid dependency issues
      try {
        const walletBalance = await fetchWalletBalance(account.address);

        const newState: UserDAOState = {
          walletAddress: account.address,
          totalBalance: walletBalance,
          lastBalanceUpdate: Date.now(),
          daoMemberships: new Map(),
          daoMemberLists: new Map(),
          isLoading: false,
          lastGlobalUpdate: Date.now(),
        };

        setUserState(newState);
        saveToStorage(newState);
        setIsInitialized(true);
      } catch (error) {
        console.error('Failed to initialize user state:', error);
        setIsInitialized(true); // Still mark as initialized even if failed
      }
    };

    initializeState();
  }, [account?.address]);

  // Auto-refresh stale wallet balance
  useEffect(() => {
    if (!userState || !account?.address) return;

    const checkBalanceFreshness = () => {
      const now = Date.now();
      const balanceAge = now - (userState.lastBalanceUpdate || 0);
      
      // If balance is stale, refresh it
      if (balanceAge > BALANCE_STALE_DURATION) {
        console.log('Wallet balance is stale, refreshing...');
        refreshWalletBalance();
      }
    };

    // Check immediately
    checkBalanceFreshness();

    // Set up periodic checks
    const interval = setInterval(checkBalanceFreshness, BALANCE_STALE_DURATION);
    
    return () => clearInterval(interval);
  }, [userState?.lastBalanceUpdate, account?.address, refreshWalletBalance]);

  const contextValue: DAOStateContextType = {
    userState,
    isInitialized,
    refreshUserState,
    refreshWalletBalance,
    refreshDAOData,
    updateDAOMembership,
    updateDAOMemberList,
    getDAOMemberList,
    clearUserState,
  };

  return (
    <DAOStateContext.Provider value={contextValue}>
      {children}
    </DAOStateContext.Provider>
  );
};