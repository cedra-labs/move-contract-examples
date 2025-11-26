/**
 * Contract Activity Service
 *
 * Handles fetching activity events from Cedra blockchain
 * Uses Cedra SDK for event queries
 *
 * @see https://docs.cedra.network/sdks/typescript-sdk
 */

import { cedraClient } from '../cedra_service/cedra-client';
import { getActivityEventType } from '../services_abi/activitytracker_abi';
import { Activity, PaginationOptions, PaginatedActivities } from './useActivityTracker';

export interface ContractActivity {
  activity_id: string;
  dao_address: string;
  activity_type: number;
  user_address: string;
  title: string;
  description: string;
  amount: string;
  metadata: string;
  timestamp: string;
  transaction_hash: string;
  block_number: string;
  version: string;
  sequence_number: string;
}

export interface ContractActivityQuery {
  dao_address?: string;
  user_address?: string;
  activity_type?: number;
  start_time?: number;
  end_time?: number;
  limit?: number;
  offset?: number;
}

export class ContractActivityService {
  /**
   * Get activities from contract events
   */
  static async getContractActivities(
    query: ContractActivityQuery = {}
  ): Promise<ContractActivity[]> {
    try {
      console.log('🔍 Fetching contract activities with query:', query);

      // Use helper function to get event type
      const eventType = getActivityEventType();

      // Prefer account-centric event query for modules that emit events from DAO addresses
      let events: any[] = [];
      try {
        // If a DAO is specified, read events from that account's module event handle
        if (query.dao_address) {
          events = await cedraClient.getAccountEventsByEventType({
            accountAddress: query.dao_address,
            eventType: eventType as `${string}::${string}::${string}`,
            options: { limit: query.limit || 100, offset: query.offset || 0 },
          });
        } else {
          // Fallback to module-level event query
          events = await cedraClient.getModuleEventsByEventType({
            eventType: eventType as `${string}::${string}::${string}`,
            options: { limit: query.limit || 100, offset: query.offset || 0 },
          });
        }
      } catch (e) {
        // If account-level query failed, rethrow to be handled by caller
        throw e;
      }

      console.log(` Found ${events.length} contract events`);

      // Filter events based on query parameters
      const filteredEvents = events.filter((event: any) => {
        const data = event.data as any;
        
        // Filter by DAO address
        if (query.dao_address && data.dao_address !== query.dao_address) {
          return false;
        }

        // Filter by user address
        if (query.user_address && data.user_address !== query.user_address) {
          return false;
        }

        // Filter by activity type
        if (query.activity_type !== undefined && data.activity_type !== query.activity_type) {
          return false;
        }

        // Filter by time range
        const timestamp = parseInt(data.timestamp);
        if (query.start_time && timestamp < query.start_time) {
          return false;
        }
        if (query.end_time && timestamp > query.end_time) {
          return false;
        }

        return true;
      });

      // Convert to ContractActivity format
      const activities: ContractActivity[] = filteredEvents.map((event: any) => ({
        activity_id: event.data.activity_id,
        dao_address: event.data.dao_address,
        activity_type: event.data.activity_type,
        user_address: event.data.user_address,
        title: event.data.title,
        description: event.data.description,
        amount: event.data.amount,
        metadata: event.data.metadata,
        timestamp: event.data.timestamp,
        transaction_hash: event.data.transaction_hash || event.guid?.creation_number || '',
        block_number: event.data.block_number,
        version: event.version || event.transaction_version || '',
        sequence_number: event.sequence_number || event.sequence_number || '',
      }));

      // Sort by timestamp descending (most recent first)
      activities.sort((a, b) => parseInt(b.timestamp) - parseInt(a.timestamp));

      console.log(` Processed ${activities.length} contract activities`);
      return activities;
    } catch (error) {
      console.error('Error fetching contract activities:', error);
      console.log(' Contract-based activities not available, will fallback to transaction parsing');
      
      // Check if it's a deployment issue
      if ((error as Error).message?.includes('not found') || (error as Error).message?.includes('does not exist')) {
        console.warn(' Activity tracker contract may not be deployed or initialized');
      }
      
      throw error;
    }
  }

  /**
   * Get activities for a specific DAO
   */
  static async getDAOContractActivities(
    daoAddress: string,
    options: PaginationOptions = {}
  ): Promise<ContractActivity[]> {
    return this.getContractActivities({
      dao_address: daoAddress,
      limit: options.limit || 50,
      offset: options.offset || 0,
    });
  }

  /**
   * Get activities for a specific user
   */
  static async getUserContractActivities(
    userAddress: string,
    options: PaginationOptions = {}
  ): Promise<ContractActivity[]> {
    return this.getContractActivities({
      user_address: userAddress,
      limit: options.limit || 50,
      offset: options.offset || 0,
    });
  }

  /**
   * Get recent activities across all DAOs
   */
  static async getGlobalContractActivities(
    options: PaginationOptions = {}
  ): Promise<ContractActivity[]> {
    return this.getContractActivities({
      limit: options.limit || 100,
      offset: options.offset || 0,
    });
  }

  /**
   * Convert contract activity to frontend Activity format
   */
  static convertToActivity(contractActivity: ContractActivity): Activity {
    const activityTypeMap: { [key: number]: Activity['type'] } = {
      1: 'proposal_created', // DAO_CREATED
      2: 'join_dao', // MEMBER_JOINED
      3: 'proposal_executed', // MEMBER_LEFT
      4: 'proposal_created', // PROPOSAL_CREATED
      5: 'vote', // PROPOSAL_VOTED
      6: 'proposal_executed', // PROPOSAL_EXECUTED
      7: 'stake', // STAKE
      8: 'unstake', // UNSTAKE
      9: 'treasury_deposit', // TREASURY_DEPOSIT
      10: 'treasury_withdrawal', // TREASURY_WITHDRAWAL
      11: 'reward_claimed', // REWARD_CLAIMED
      12: 'proposal_created', // LAUNCHPAD_CREATED
      13: 'treasury_deposit', // LAUNCHPAD_INVESTMENT
    };

    return {
      id: contractActivity.activity_id,
      type: activityTypeMap[contractActivity.activity_type] || 'proposal_created',
      title: contractActivity.title,
      description: contractActivity.description,
      amount: parseInt(contractActivity.amount) / 100000000, // Convert from octas
      user: contractActivity.user_address,
      dao: contractActivity.dao_address,
      timestamp: parseInt(contractActivity.timestamp) * 1000, // Convert to milliseconds
      transactionHash: contractActivity.transaction_hash,
      blockNumber: parseInt(contractActivity.block_number),
      status: 'success',
      metadata: {},
    };
  }

  /**
   * Get activities with pagination support
   */
  static async getContractActivitiesPaginated(
    query: ContractActivityQuery = {},
    options: PaginationOptions = {}
  ): Promise<PaginatedActivities> {
    const { page = 1, limit = 50 } = options;
    const offset = (page - 1) * limit;

    const activities = await this.getContractActivities({
      ...query,
      limit,
      offset,
    });

    // Convert to frontend Activity format
    const convertedActivities = activities.map(activity => 
      this.convertToActivity(activity)
    );

    return {
      activities: convertedActivities,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(activities.length / limit),
        totalItems: activities.length,
        hasNextPage: activities.length === limit,
        hasPreviousPage: page > 1,
        nextCursor: activities.length === limit ? (page + 1).toString() : undefined,
        previousCursor: page > 1 ? (page - 1).toString() : undefined,
        limit,
      },
    };
  }

  /**
   * Get real-time activity updates by polling recent events
   */
  static async getRecentActivities(
    sinceTimestamp?: number,
    limit: number = 20
  ): Promise<ContractActivity[]> {
    const query: ContractActivityQuery = {
      limit,
    };

    if (sinceTimestamp) {
      query.start_time = sinceTimestamp;
    }

    return this.getContractActivities(query);
  }

  /**
   * Subscribe to new activities (polling-based)
   */
  static subscribeToActivities(
    callback: (activities: ContractActivity[]) => void,
    interval: number = 10000 // 10 seconds
  ): () => void {
    let lastTimestamp = Math.floor(Date.now() / 1000);
    let isSubscribed = true;

    const poll = async () => {
      if (!isSubscribed) return;

      try {
        const newActivities = await this.getRecentActivities(lastTimestamp);
        if (newActivities.length > 0) {
          callback(newActivities);
          lastTimestamp = Math.floor(Date.now() / 1000);
        }
      } catch (error) {
        console.error('Error polling for new activities:', error);
      }

      if (isSubscribed) {
        setTimeout(poll, interval);
      }
    };

    poll();

    // Return unsubscribe function
    return () => {
      isSubscribed = false;
    };
  }
}
