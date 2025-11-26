import { useState, useEffect, useCallback } from 'react';
import { useWallet } from '../contexts/CedraWalletProvider';
import { BalanceService } from '../useServices/useBalance';
import { cedraClient } from '../cedra_service/cedra-client';

export const useWalletBalance = () => {
  const { account } = useWallet();
  const [balance, setBalance] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBalance = useCallback(async () => {
    if (!account?.address) {
      setBalance(0);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      console.log(`Fetching balance for: ${account.address}`);
      const newBalance = await BalanceService.getWalletBalance(account.address);
      console.log(`Balance fetched: ${newBalance} CEDRA`);
      setBalance(newBalance);
    } catch (err) {
      console.error('Error fetching balance:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch balance');
      setBalance(0);
    } finally {
      setIsLoading(false);
    }
  }, [account?.address]);

  // Auto-fetch on account change
  useEffect(() => {
    fetchBalance();
  }, [fetchBalance]);

  const refresh = useCallback(() => {
    fetchBalance();
  }, [fetchBalance]);

  const formatBalance = useCallback((decimals: number = 2) => {
    return BalanceService.formatBalance(balance, decimals);
  }, [balance]);

  const hasSufficientBalance = useCallback(async (
    requiredAmount: number, 
    gasReserve: number = 0.02
  ) => {
    if (!account?.address) return { sufficient: false, available: 0, required: requiredAmount };
    return BalanceService.hasSufficientBalance(account.address, requiredAmount, gasReserve);
  }, [account?.address]);

  return {
    balance,
    isLoading,
    error,
    refresh,
    formatBalance,
    hasSufficientBalance,
    address: account?.address || null
  };
};