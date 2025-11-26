/**
 * Platform Statistics Service for Cedra Network
 *
 * Retrieves platform-wide statistics and metrics
 * Uses Cedra SDK for blockchain interactions
 *
 * @see https://docs.cedra.network/sdks/typescript-sdk
 */

import { useState, useEffect, useCallback } from 'react';
import { cedraClient } from '../cedra_service/cedra-client';
import { MODULE_ADDRESS } from '../cedra_service/constants';
import { fetchDAOCreationEvents } from '../services/graphqlService';

export interface PlatformStats {
  totalDAOs: number;
  activeProposals: number;
  totalVotes: number;
  totalMembers: number;
  lastUpdated: number;
}

export interface PlatformOverview {
  totalDAOs: number;
  activeProposals: number;
  totalVotes: number;
  totalMembers: number;
  lastUpdated: number;
}

export interface RealtimePlatformStats {
  totalDAOs: number;
  activeProposals: number;
  totalVotes: number;
  totalMembers: number;
}

export interface DAOStats {
  dao_address: string;
  active_proposals: number;
  total_proposals: number;
  total_members: number;
  total_votes: number;
}

export class PlatformStatsService {
  /**
   * Initialize the platform statistics system (should be called once)
   * This needs to be called by the platform admin before other functions work
   */
  static async initializePlatform(adminSigner: any): Promise<boolean> {
    try {
      console.log('🔧 Initializing platform statistics system...');
      
      const payload = {
        function: `${MODULE_ADDRESS}::platform_stats::initialize_platform`,
        typeArguments: [],
        functionArguments: []
      };

      const result = await adminSigner.signAndSubmitTransaction({ payload });
      console.log(' Platform statistics initialized:', result);
      return true;
    } catch (error) {
      console.error('Failed to initialize platform:', error);
      return false;
    }
  }

  /**
   * Get platform overview statistics using the updated contract
   * Returns: [total_daos, total_proposals, active_proposals, total_votes_cast, total_community_members]
   */
  static async getPlatformOverview(): Promise<PlatformOverview> {
    try {
      console.log('🔍 Fetching platform overview from latest contract...');
      
      const result = await cedraClient.view({
        payload: {
          function: `${MODULE_ADDRESS}::platform_stats::get_platform_overview`,
          functionArguments: [] // No arguments needed for the latest contract
        }
      });

      const [totalDAOs, _totalProposals, activeProposals, totalVotes, totalMembers] = result.map(val => Number(val));

      return {
        totalDAOs,
        activeProposals,
        totalVotes,
        totalMembers,
        lastUpdated: Date.now() // Generate timestamp on frontend
      };
    } catch (error) {
      console.error('Error fetching platform overview:', error);
      throw error;
    }
  }

  /**
   * Get platform statistics using the new struct-based function
   * Returns PlatformStatsData struct with all statistics
   */
  static async getPlatformStats(): Promise<RealtimePlatformStats> {
    try {
      console.log('🔍 Fetching platform stats from new contract function...');
      
      const result = await cedraClient.view({
        payload: {
          function: `${MODULE_ADDRESS}::platform_stats::get_platform_stats`,
          functionArguments: [] // No arguments needed
        }
      });

      // Result is a PlatformStatsData struct
      const statsData = result[0] as any;
      
      return {
        totalDAOs: Number(statsData.total_daos),
        activeProposals: Number(statsData.active_proposals),
        totalVotes: Number(statsData.total_votes_cast),
        totalMembers: Number(statsData.total_community_members)
      };
    } catch (error) {
      console.error('Error fetching platform stats:', error);
      throw error;
    }
  }

  /**
   * Get total number of registered DAOs
   */
  static async getTotalDAOs(): Promise<number> {
    try {
      const result = await cedraClient.view({
        payload: {
          function: `${MODULE_ADDRESS}::platform_stats::get_total_daos`,
          functionArguments: [] // No arguments needed for the updated contract
        }
      });

      return Number(result[0]);
    } catch (error) {
      console.error('Error fetching total DAOs:', error);
      throw error;
    }
  }

  /**
   * Get list of all registered DAO addresses
   */
  static async getRegisteredDAOs(): Promise<string[]> {
    try {
      const result = await cedraClient.view({
        payload: {
          function: `${MODULE_ADDRESS}::platform_stats::get_all_dao_addresses`,
          functionArguments: [] // No arguments needed for the updated contract
        }
      });

      return result[0] as string[];
    } catch (error: any) {
      // Handle platform not initialized gracefully
      if (error.message?.includes('ABORTED') && error.message?.includes('platform_stats')) {
        console.warn(' Platform statistics not initialized - returning empty list');
        return [];
      }
      console.error('Error fetching registered DAOs:', error);
      return []; // Return empty array instead of throwing
    }
  }

  /**
   * Get detailed stats for a specific DAO
   * Returns: [total_proposals, active_proposals, total_members, total_voting_power, total_votes]
   */
  static async getDAODetailedStats(daoAddress: string): Promise<{
    activeProposals: number;
    totalProposals: number;
    totalMembers: number;
    totalVotes: number;
    totalVotingPower: number;
  }> {
    try {
      const result = await cedraClient.view({
        payload: {
          function: `${MODULE_ADDRESS}::platform_stats::get_dao_detailed_stats`,
          functionArguments: [daoAddress]
        }
      });

      const [totalProposals, activeProposals, totalMembers, totalVotingPower, totalVotes] = result.map(val => Number(val));

      return {
        activeProposals,
        totalProposals,
        totalMembers,
        totalVotes,
        totalVotingPower
      };
    } catch (error) {
      console.error('Error fetching DAO detailed stats:', error);
      throw error;
    }
  }

  /**
   * Get stats for multiple DAOs
   */
  static async getMultipleDAOStats(daoAddresses: string[]): Promise<DAOStats[]> {
    try {
      const result = await cedraClient.view({
        payload: {
          function: `${MODULE_ADDRESS}::platform_stats::get_multiple_dao_stats`,
          functionArguments: [daoAddresses]
        }
      });

      // The result should be an array of DAOStats structs
      return (result[0] as any[]).map((stats: any) => ({
        dao_address: stats.movedao_addrx, // Updated field name in contract
        active_proposals: Number(stats.active_proposals),
        total_proposals: Number(stats.total_proposals),
        total_members: Number(stats.total_members),
        total_votes: Number(stats.total_votes)
      }));
    } catch (error) {
      console.error('Error fetching multiple DAO stats:', error);
      throw error;
    }
  }

  /**
   * Get platform stats with optimized DAO discovery (same pattern as useFetchDAOs)
   */
  static async getPlatformStatsWithFallback(): Promise<PlatformStats> {
    try {
      console.log('🔍 Fetching platform stats with optimized discovery...');
      
      // First check if registry is initialized with error handling
      let registryInitialized: any;
      try {
        registryInitialized = await cedraClient.view({
          payload: {
            function: `${MODULE_ADDRESS}::dao_core_file::is_registry_initialized`,
            functionArguments: []
          }
        });
      } catch (registryError: any) {
        console.log(' Contract not deployed yet - using fallback stats');
        // Fallback to event-based discovery when contract is not available
        const daoAddresses = await this.getDAOAddressesFromEvents();
        return {
          totalDAOs: daoAddresses.length,
          activeProposals: 0,
          totalVotes: 0,
          totalMembers: 0,
          lastUpdated: Date.now()
        };
      }
      
      if (!registryInitialized[0]) {
        console.log(' DAO registry not initialized - using event-based discovery');
        const daoAddresses = await this.getDAOAddressesFromEvents();
        const totalDAOs = daoAddresses.length;
        
        return {
          totalDAOs,
          activeProposals: 0,
          totalVotes: 0,
          totalMembers: 0,
          lastUpdated: Date.now()
        };
      }

      // Check if registry has DAOs with error handling
      let totalDAOsFromRegistry: any;
      try {
        totalDAOsFromRegistry = await cedraClient.view({
          payload: {
            function: `${MODULE_ADDRESS}::dao_core_file::get_total_dao_count`,
            functionArguments: []
          }
        });
      } catch (countError: any) {
        console.log(' Registry functions not available - using event discovery');
        // Fallback to event-based discovery
        const daoAddresses = await this.getDAOAddressesFromEvents();
        return {
          totalDAOs: daoAddresses.length,
          activeProposals: 0,
          totalVotes: 0,
          totalMembers: 0,
          lastUpdated: Date.now()
        };
      }
      
      const registryDAOCount = Number(totalDAOsFromRegistry[0]);
      console.log(' DAOs in registry:', registryDAOCount);
      
      if (registryDAOCount > 0) {
        // Registry has DAOs, use contract stats functions
        console.log(' Using registry-based platform stats...');
        
        try {
          const result = await cedraClient.view({
            payload: {
              function: `${MODULE_ADDRESS}::platform_stats::get_platform_stats`,
              functionArguments: []
            }
          });

          const statsData = result[0] as any;
          
          return {
            totalDAOs: Number(statsData.total_daos),
            activeProposals: Number(statsData.active_proposals),
            totalVotes: Number(statsData.total_votes_cast),
            totalMembers: Number(statsData.total_community_members),
            lastUpdated: Date.now()
          };
        } catch (contractError) {
          console.warn('Contract stats failed, trying tuple function:', contractError);
          
          const result = await cedraClient.view({
            payload: {
              function: `${MODULE_ADDRESS}::platform_stats::get_platform_overview`,
              functionArguments: []
            }
          });

          const [totalDAOs, _totalProposals, activeProposals, totalVotes, totalMembers] = result.map(val => Number(val));

          return {
            totalDAOs,
            activeProposals,
            totalVotes,
            totalMembers,
            lastUpdated: Date.now()
          };
        }
      } else {
        // Registry is empty, use event-based discovery (same as useFetchDAOs pattern)
        console.log('Registry empty, using event-based DAO discovery...');
        
        const daoAddresses = await this.getDAOAddressesFromEvents();
        const totalDAOs = daoAddresses.length;
        
        if (totalDAOs === 0) {
          return {
            totalDAOs: 0,
            activeProposals: 0,
            totalVotes: 0,
            totalMembers: 0,
            lastUpdated: Date.now()
          };
        }
        
        // Aggregate stats from discovered DAOs
        let totalMembers = 0;
        let activeProposals = 0;
        let totalVotes = 0;
        
        console.log(` Aggregating stats from ${totalDAOs} discovered DAOs...`);
        
        for (const daoAddress of daoAddresses) {
          try {
            // Check if DAO exists and get member count
            const memberCount = await cedraClient.view({
              payload: {
                function: `${MODULE_ADDRESS}::membership::total_members`,
                functionArguments: [daoAddress]
              }
            });
            totalMembers += Number(memberCount[0]);
            
            // Get proposal count if proposals exist
            try {
              const proposalCount = await cedraClient.view({
                payload: {
                  function: `${MODULE_ADDRESS}::proposal::get_proposals_count`,
                  functionArguments: [daoAddress]
                }
              });
              // For now, assume 10% of proposals are active (we can improve this later)
              const daoProposals = Number(proposalCount[0]);
              activeProposals += Math.ceil(daoProposals * 0.1);
            } catch {
              // Proposals not initialized for this DAO
            }
          } catch (error) {
            console.warn(`Failed to get stats for DAO ${daoAddress}:`, error);
          }
        }
        
        return {
          totalDAOs,
          activeProposals,
          totalVotes, // We'll implement vote counting later
          totalMembers,
          lastUpdated: Date.now()
        };
      }
    } catch (error) {
      console.error('All platform stats methods failed:', error);
      
      // Return zeros but indicate system is available
      return {
        totalDAOs: 0,
        activeProposals: 0,
        totalVotes: 0,
        totalMembers: 0,
        lastUpdated: Date.now()
      };
    }
  }

  /**
   * Get DAO addresses from events using Cedra GraphQL indexer
   * @see https://docs.cedra.network/indexer
   */
  static async getDAOAddressesFromEvents(): Promise<string[]> {
    try {
      console.log(' Discovering DAOs via Cedra GraphQL indexer...');

      // Use Cedra GraphQL indexer to fetch DAO creation events
      const daoAddresses = await fetchDAOCreationEvents(
        MODULE_ADDRESS,
        'dao_core_file::DAOCreated'
      );

      if (daoAddresses && daoAddresses.length > 0) {
        console.log(' Found DAOs via indexer:', daoAddresses.length);
        return daoAddresses;
      }

      // Fallback to empty array if no events found
      console.log(' No DAOs found in indexer');
      return [];

    } catch (error) {
      console.error('Event-based DAO discovery failed:', error);
      return [];
    }
  }
}

/**
 * React hook for platform statistics
 */
export const usePlatformStats = (refreshInterval: number = 30000) => {
  const [stats, setStats] = useState<PlatformStats>({
    totalDAOs: 0,
    activeProposals: 0,
    totalVotes: 0,
    totalMembers: 0,
    lastUpdated: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      setError(null);
      const platformStats = await PlatformStatsService.getPlatformStatsWithFallback();
      setStats(platformStats);
    } catch (err) {
      console.error('Error fetching platform stats:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch platform stats');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Auto refresh
  useEffect(() => {
    if (refreshInterval <= 0) return;

    const interval = setInterval(fetchStats, refreshInterval);
    return () => clearInterval(interval);
  }, [fetchStats, refreshInterval]);

  const refresh = useCallback(() => {
    setIsLoading(true);
    fetchStats();
  }, [fetchStats]);

  return {
    stats,
    isLoading,
    error,
    refresh,
    lastUpdated: new Date(stats.lastUpdated)
  };
};

/**
 * React hook for individual DAO statistics from platform contract
 */
/**
 * Get all DAO statistics from the platform
 */
export const useAllDAOStats = () => {
  const [stats, setStats] = useState<DAOStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAllDAOStats = useCallback(async () => {
    try {
      setError(null);
      setIsLoading(true);
      
      const result = await cedraClient.view({
        payload: {
          function: `${MODULE_ADDRESS}::platform_stats::get_all_dao_stats`,
          functionArguments: []
        }
      });

      // Result is an array of DAOStats structs
      const daoStatsArray = (result[0] as any[]).map((stats: any) => ({
        dao_address: stats.movedao_addrx,
        active_proposals: Number(stats.active_proposals),
        total_proposals: Number(stats.total_proposals),
        total_members: Number(stats.total_members),
        total_votes: Number(stats.total_votes)
      }));
      
      setStats(daoStatsArray);
    } catch (err) {
      console.error('Error fetching all DAO stats:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch all DAO stats');
      setStats([]); // Return empty array on error
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllDAOStats();
  }, [fetchAllDAOStats]);

  const refresh = useCallback(() => {
    setIsLoading(true);
    fetchAllDAOStats();
  }, [fetchAllDAOStats]);

  return {
    stats,
    isLoading,
    error,
    refresh
  };
};

export const useIndividualDAOStats = (daoAddress: string) => {
  const [stats, setStats] = useState<{
    activeProposals: number;
    totalProposals: number;
    totalMembers: number;
    totalVotes: number;
    totalVotingPower: number;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDAOStats = useCallback(async () => {
    if (!daoAddress) return;

    try {
      setError(null);
      setIsLoading(true);
      const daoStats = await PlatformStatsService.getDAODetailedStats(daoAddress);
      setStats(daoStats);
    } catch (err) {
      console.error('Error fetching DAO stats:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch DAO stats');
    } finally {
      setIsLoading(false);
    }
  }, [daoAddress]);

  useEffect(() => {
    fetchDAOStats();
  }, [fetchDAOStats]);

  const refresh = useCallback(() => {
    fetchDAOStats();
  }, [fetchDAOStats]);

  return {
    stats,
    isLoading,
    error,
    refresh
  };
};