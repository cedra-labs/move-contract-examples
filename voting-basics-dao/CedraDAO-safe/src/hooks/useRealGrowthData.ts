import { useState, useEffect, useCallback } from 'react';
import { cedraClient } from '../cedra_service/cedra-client';
import { MODULE_ADDRESS } from '../cedra_service/constants';

export interface GrowthDataPoint {
  date: string;
  period: string; // "Jan", "Feb", etc. for display
  totalDAOs: number;
  newDAOs: number;
  totalUsers: number;
  totalVotes: number;
  treasuryValue: number;
  transactions: number;
}

export interface RealGrowthData {
  daoGrowth: GrowthDataPoint[];
  userGrowth: GrowthDataPoint[];
  votingActivity: GrowthDataPoint[];
  treasuryGrowth: GrowthDataPoint[];
  networkActivity: GrowthDataPoint[];
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
}

// We'll dynamically determine the start date from the first DAO creation event

export const useRealGrowthData = () => {
  const [data, setData] = useState<RealGrowthData>({
    daoGrowth: [],
    userGrowth: [],
    votingActivity: [],
    treasuryGrowth: [],
    networkActivity: [],
    isLoading: true,
    error: null,
    lastUpdated: null
  });

  const fetchDAOCreationEvents = useCallback(async () => {
    try {
      // Fetch DAO creation events from the platform
      const daoCreationEvents = await cedraClient.getModuleEventsByEventType({
        eventType: `${MODULE_ADDRESS}::dao_core_file::DAOCreatedEvent` as `${string}::${string}::${string}`,
        options: { limit: 1000 }
      });

      return daoCreationEvents;
    } catch (error) {
      console.error('Failed to fetch DAO creation events:', error);
      return [];
    }
  }, []);

  const fetchVotingEvents = useCallback(async () => {
    try {
      // Fetch voting events from proposals
      const votingEvents = await cedraClient.getModuleEventsByEventType({
        eventType: `${MODULE_ADDRESS}::proposal::VoteCastEvent` as `${string}::${string}::${string}`,
        options: { limit: 1000 }
      });

      return votingEvents;
    } catch (error) {
      console.error('Failed to fetch voting events:', error);
      return [];
    }
  }, []);

  const fetchTreasuryEvents = useCallback(async () => {
    try {
      // Fetch treasury deposit events
      const treasuryEvents = await cedraClient.getModuleEventsByEventType({
        eventType: `${MODULE_ADDRESS}::treasury::TreasuryDepositEvent` as `${string}::${string}::${string}`,
        options: { limit: 1000 }
      });

      return treasuryEvents;
    } catch (error) {
      console.error('Failed to fetch treasury events:', error);
      return [];
    }
  }, []);

  const aggregateDataByMonth = useCallback((events: any[], type: 'dao' | 'vote' | 'treasury') => {
    const monthlyData: { [key: string]: GrowthDataPoint } = {};
    
    // Find the earliest event to determine start date
    let earliestTimestamp = Infinity;
    events.forEach((event: any) => {
      const timestamp = Number(event.data?.timestamp || 0);
      if (timestamp > 0 && timestamp < earliestTimestamp) {
        earliestTimestamp = timestamp;
      }
    });

    // If no valid events, start from 2 months ago (reasonable default)
    const startDate = earliestTimestamp === Infinity 
      ? new Date(Date.now() - 60 * 24 * 60 * 60 * 1000) // 2 months ago
      : new Date(earliestTimestamp * 1000);
    
    const endDate = new Date();
    const current = new Date(startDate.getFullYear(), startDate.getMonth(), 1); // Start of month
    
    console.log(`[${type}] Date range: ${startDate.toISOString()} to ${endDate.toISOString()}`);
    console.log(`[${type}] Events found: ${events.length}`);
    
    // Initialize all months from start to end
    while (current <= endDate) {
      const monthKey = `${current.getFullYear()}-${(current.getMonth() + 1).toString().padStart(2, '0')}`;
      const monthLabel = current.toLocaleDateString('en-US', { month: 'short' });
      
      monthlyData[monthKey] = {
        date: monthKey,
        period: monthLabel,
        totalDAOs: 0,
        newDAOs: 0,
        totalUsers: 0,
        totalVotes: 0,
        treasuryValue: 0,
        transactions: 0
      };
      
      current.setMonth(current.getMonth() + 1);
    }

    // Process events and aggregate by month
    events.forEach((event: any) => {
      const timestamp = Number(event.data?.timestamp || 0);
      if (!timestamp) return;

      const eventDate = new Date(timestamp * 1000); // Convert seconds to milliseconds
      const monthKey = `${eventDate.getFullYear()}-${(eventDate.getMonth() + 1).toString().padStart(2, '0')}`;
      
      if (monthlyData[monthKey]) {
        switch (type) {
          case 'dao':
            monthlyData[monthKey].newDAOs += 1;
            break;
          case 'vote':
            monthlyData[monthKey].totalVotes += 1;
            monthlyData[monthKey].transactions += 1;
            break;
          case 'treasury':
            const amount = Number(event.data?.amount || 0) / 1e8; // Convert OCTAS to MOVE
            monthlyData[monthKey].treasuryValue += amount;
            monthlyData[monthKey].transactions += 1;
            break;
        }
      }
    });

    // Calculate cumulative values
    const sortedData = Object.values(monthlyData).sort((a, b) => a.date.localeCompare(b.date));
    let cumulativeDAOs = 0;
    let cumulativeTreasury = 0;

    const result = sortedData.map(point => {
      if (type === 'dao') {
        cumulativeDAOs += point.newDAOs;
        point.totalDAOs = cumulativeDAOs;
      }
      if (type === 'treasury') {
        cumulativeTreasury += point.treasuryValue;
        point.treasuryValue = cumulativeTreasury;
      }
      return point;
    });
    
    console.log(`[${type}] Final data points: ${result.length} months`);
    console.log(`[${type}] Sample data:`, result.slice(0, 3));
    
    return result;
  }, []);

  const fetchRealGrowthData = useCallback(async () => {
    try {
      setData(prev => ({ ...prev, isLoading: true, error: null }));

      // Fetch all event data in parallel
      const [daoEvents, votingEvents, treasuryEvents] = await Promise.all([
        fetchDAOCreationEvents(),
        fetchVotingEvents(),
        fetchTreasuryEvents()
      ]);

      // Aggregate data by month
      const daoGrowthData = aggregateDataByMonth(daoEvents, 'dao');
      const votingData = aggregateDataByMonth(votingEvents, 'vote');
      const treasuryData = aggregateDataByMonth(treasuryEvents, 'treasury');

      // Create user growth data based on DAO creation and voting activity
      const userGrowthData = daoGrowthData.map((point, index) => ({
        ...point,
        totalUsers: Math.max(point.totalDAOs * 3, votingData[index]?.totalVotes || 0) // Estimate 3 users per DAO minimum
      }));

      // Network activity combines voting and treasury transactions
      const networkActivityData = daoGrowthData.map((point, index) => ({
        ...point,
        transactions: (votingData[index]?.transactions || 0) + (treasuryData[index]?.transactions || 0)
      }));

      setData({
        daoGrowth: daoGrowthData,
        userGrowth: userGrowthData,
        votingActivity: votingData,
        treasuryGrowth: treasuryData,
        networkActivity: networkActivityData,
        isLoading: false,
        error: null,
        lastUpdated: new Date()
      });

    } catch (error: any) {
      console.error('Failed to fetch real growth data:', error);
      setData(prev => ({
        ...prev,
        isLoading: false,
        error: error.message || 'Failed to load growth data'
      }));
    }
  }, [fetchDAOCreationEvents, fetchVotingEvents, fetchTreasuryEvents, aggregateDataByMonth]);

  // Initial load and periodic refresh
  useEffect(() => {
    fetchRealGrowthData();
    
    // Refresh every 5 minutes
    const interval = setInterval(fetchRealGrowthData, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [fetchRealGrowthData]);

  return {
    ...data,
    refreshData: fetchRealGrowthData
  };
};