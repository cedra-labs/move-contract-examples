import React, { useState, useEffect } from 'react';
import {
  Coins,
  Lock,
  Unlock,
  AlertCircle,
  Award
} from 'lucide-react';
import { DAO } from '../../types/dao';
import { useWallet } from '../../contexts/CedraWalletProvider';
import { cedraClient } from '../../cedra_service/cedra-client';
import { MODULE_ADDRESS } from '../../cedra_service/constants';
import { useDAOMembership, useDAOPortfolio } from '../../hooks/useDAOMembership';
import { BalanceService } from '../../useServices/useBalance';
import { useWalletBalance } from '../../hooks/useWalletBalance';
import { useAlert } from '../alert/AlertContext';
import { useSectionLoader } from '../../hooks/useSectionLoader';
import SectionLoader from '../common/SectionLoader';

interface DAOStakingProps {
  dao: DAO;
  sidebarCollapsed?: boolean;
}

const DAOStaking: React.FC<DAOStakingProps> = ({ dao, sidebarCollapsed = false }) => {
  // State for navigation between Stake, Unstake, and Membership sections
  const [activeSection, setActiveSection] = useState<'stake' | 'unstake' | 'membership'>('stake');

  const [stakeAmount, setStakeAmount] = useState('');
  const [unstakeAmount, setUnstakeAmount] = useState('');
  const [isStaking, setIsStaking] = useState(false);
  const [isUnstaking, setIsUnstaking] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [wasEverMember, setWasEverMember] = useState(false);
  const [errors, setErrors] = useState<{[key: string]: string}>({});
  const { showAlert } = useAlert();
  const [rewardsState, setRewardsState] = useState({ totalClaimable: 0, totalClaimed: 0, lastDistribution: '' });
  const [stakingReady, setStakingReady] = useState(true);
  const [totalStakedInDAO, setTotalStakedInDAO] = useState(0);
  const [totalStakers, setTotalStakers] = useState(0);
  const [lastStakeTime, setLastStakeTime] = useState<number>(0);
  const [independentMinStake, setIndependentMinStake] = useState<number | null>(null);
  const [minStakeFetchAttempted, setMinStakeFetchAttempted] = useState(false);

  // Session cache for staking tab (instant tab switches)
  // @ts-ignore
  const stakingSessionCache: Map<string, any> = (window as any).__stakingCache || ((window as any).__stakingCache = new Map());
  const SESSION_TTL_MS = 5 * 60 * 1000;
  const MAX_STALE_MS = 10 * 60 * 1000;

  // Section loader for Staking tab
  const sectionLoader = useSectionLoader();
  
  // Use BalanceService for consistent OCTAS conversion
  const toMOVE = (u64: number): number => BalanceService.octasToCedra(u64);

  const { account, signAndSubmitTransaction } = useWallet();

  // Use the new persistent state hooks
  const { 
    membershipData, 
    isLoading: membershipLoading, 
    isMember, 
    isStaker,
    canJoinDAO,
    needsMoreStake,
    refresh: refreshMembership,
    updateLocalState 
  } = useDAOMembership(dao);
  
  const { walletBalance, refresh: refreshPortfolio } = useDAOPortfolio();
  const { 
    balance: hookBalance, 
    refresh: refreshBalance 
  } = useWalletBalance();

  // Balance sources prioritized: hookBalance (fresh) > walletBalance (cached)

  // Fetch minimum stake requirement independently of wallet connection
  const fetchMinStakeIndependently = async () => {
    if (minStakeFetchAttempted) return; // Prevent multiple attempts
    
    setMinStakeFetchAttempted(true);
    try {
      const minStakeRes = await cedraClient.view({
        payload: {
          function: `${MODULE_ADDRESS}::membership::get_min_stake`,
          functionArguments: [dao.id]
        }
      });
      // Use correct 6-decimal conversion for contract values (divide by 1,000,000)
      const minStake = Number(minStakeRes[0] || 0) / 1000000;
      setIndependentMinStake(minStake);
    } catch (error) {
      // Silently fail and use fallback value - don't log network errors to prevent spam
      setIndependentMinStake(7); // Default to 7 for MoveDAO_v2 - adjust based on your DAO
    }
  };

  // Derive data from persistent state
  const daoStakingData = {
    daoAddress: dao.id,
    daoName: dao.name,
    minStakeRequired: independentMinStake !== null ? independentMinStake : (membershipData?.minStakeRequired || 0),
    totalStakedInDAO: totalStakedInDAO,
    totalStakers: totalStakers,
    // Use the freshest balance available and ensure gas reserve is subtracted only once
    userBalance: Math.max(0, (hookBalance || walletBalance || 0)),
    userDaoStaked: membershipData?.stakedAmount || 0,
    userVotingPower: membershipData?.votingPower || 0,
    isMember,
    isStaker,
    memberSince: membershipData?.memberSince ? new Date(membershipData.memberSince).toLocaleDateString() : ''
  };

  const refreshOnChain = async () => {
    // Refresh DAO-specific aggregated data (total staked, staker count)
    try {
      // Check if staking is initialized
      const initCheckPromise = cedraClient
        .view({ payload: { function: `${MODULE_ADDRESS}::staking::is_staking_initialized`, functionArguments: [dao.id] } })
        .then(res => Boolean(res?.[0]))
        .catch(() => false);

      // Kick off independent reads in parallel for speed
      const totalStakedPromise = cedraClient
        .view({ payload: { function: `${MODULE_ADDRESS}::staking::get_total_staked`, functionArguments: [dao.id] } })
        .then(res => toMOVE(Number(res?.[0] || 0)))
        .catch(() => 0);

      const registryPromise = cedraClient
        .getAccountResource({ accountAddress: dao.id, resourceType: `${MODULE_ADDRESS}::staking::StakerRegistry` })
        .then((registryRes: any) => Number(registryRes?.data?.total_stakers ?? 0))
        .catch(() => null);

      const [isInitialized, totalStakedVal, registryStakers] = await Promise.all([initCheckPromise, totalStakedPromise, registryPromise]);
      setIsStakingInitialized(isInitialized);
      setTotalStakedInDAO(totalStakedVal);

      if (registryStakers === null) {
        // Fallback via view
        const stakerCountRes = await cedraClient
          .view({ payload: { function: `${MODULE_ADDRESS}::staking::get_staker_count`, functionArguments: [dao.id] } })
          .catch(() => null);
        setTotalStakers(stakerCountRes ? Number(stakerCountRes?.[0] || 0) : 0);
      } else {
        setTotalStakers(registryStakers);
      }

      // Refresh user-specific data through the persistent state system
      await refreshMembership();

      // Rewards in parallel as well
      if (account?.address) {
        try {
          const [claimableRes, claimedRes] = await Promise.all([
            cedraClient.view({ payload: { function: `${MODULE_ADDRESS}::rewards::get_total_claimable`, functionArguments: [dao.id, account.address] } }),
            cedraClient.view({ payload: { function: `${MODULE_ADDRESS}::rewards::get_total_claimed`, functionArguments: [dao.id, account.address] } }),
          ]);
          const totalClaimable = BalanceService.octasToCedra(Number(claimableRes?.[0] || 0));
          const totalClaimed = BalanceService.octasToCedra(Number(claimedRes?.[0] || 0));
          setRewardsState(prev => ({ ...prev, totalClaimable, totalClaimed }));
        } catch (e) {
          console.warn('Failed to refresh rewards state:', e);
          setRewardsState(prev => ({ ...prev, totalClaimable: 0 }));
        }
      } else {
        setRewardsState(prev => ({ ...prev, totalClaimable: 0, totalClaimed: 0 }));
      }
    } catch (e) {
      console.warn('Failed to refresh staking state (non-fatal):', e);
    }

    // Detect staking readiness (Vault + Registry exist). Run independently so earlier failures don't block this.
    try {
      const vaultAddrRes = await cedraClient.view({ payload: { function: `${MODULE_ADDRESS}::staking::get_vault_addr`, functionArguments: [dao.id] } });
      const vaultAddr = String(vaultAddrRes?.[0] || '');
      if (!vaultAddr) throw new Error('no vault addr');
      const vaultPromise = cedraClient.getAccountResource({
        accountAddress: vaultAddr,
        resourceType: `${MODULE_ADDRESS}::staking::Vault`,
      });
      const registryPromise = cedraClient.getAccountResource({
        accountAddress: dao.id,
        resourceType: `${MODULE_ADDRESS}::staking::StakerRegistry`,
      });
      await Promise.all([vaultPromise, registryPromise]);
      setStakingReady(true);
    } catch (e) {
      setStakingReady(false);
    }

    // Persist fresh snapshot to session cache for instant tab switches
    try {
      stakingSessionCache.set(dao.id, {
        totalStakedInDAO,
        totalStakers,
        independentMinStake,
        timestamp: Date.now()
      });
    } catch {}
  };


  // Track if user was ever a member (to detect inactive state)
  useEffect(() => {
    if (isMember) {
      setWasEverMember(true);
    }
  }, [isMember]);

  // Initial load - this will use cached data if available
  useEffect(() => {
    // Hydrate from session cache for instant display
    const cached = stakingSessionCache.get(dao.id);
    const now = Date.now();
    if (cached && (now - cached.timestamp) < SESSION_TTL_MS) {
      if (typeof cached.totalStakedInDAO === 'number') setTotalStakedInDAO(cached.totalStakedInDAO);
      if (typeof cached.totalStakers === 'number') setTotalStakers(cached.totalStakers);
      if (typeof cached.independentMinStake === 'number') setIndependentMinStake(cached.independentMinStake);
    } else if (cached && (now - cached.timestamp) < MAX_STALE_MS) {
      if (typeof cached.totalStakedInDAO === 'number') setTotalStakedInDAO(cached.totalStakedInDAO);
      if (typeof cached.totalStakers === 'number') setTotalStakers(cached.totalStakers);
      if (typeof cached.independentMinStake === 'number') setIndependentMinStake(cached.independentMinStake);
      // Silent background refresh
      (async () => { try { await refreshOnChain(); } catch {} })();
    }
    // Always fetch minimum stake independently (only once per DAO)
    fetchMinStakeIndependently();

    if (account?.address) {
      // Refresh both DAO-specific data and wallet balance
      Promise.all([
        refreshOnChain(),
        refreshPortfolio(),
        refreshBalance()
      ]).catch(error => {
        console.warn('Failed to refresh initial data:', error);
      });
    }
  }, [dao.id]); // Removed account?.address dependency to prevent refetching

  // Background refresh on window focus if cache is stale
  useEffect(() => {
    const onFocus = () => {
      const cached = stakingSessionCache.get(dao.id);
      const now = Date.now();
      if (!cached || (now - cached.timestamp) > SESSION_TTL_MS) {
        refreshOnChain();
      }
      // Always refresh wallet balance when window regains focus for real-time top-ups
      refreshBalance();
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [dao.id]);

  // Periodic background refresh (no loader)
  useEffect(() => {
    const interval = setInterval(() => {
      refreshOnChain();
    }, 60000);
    return () => clearInterval(interval);
  }, [dao.id]);

  // High-frequency wallet balance refresher (does not touch staking cache)
  // Ensures immediate reflection of externally received funds without a full page refresh
  useEffect(() => {
    // Only run when an account is connected
    if (!account?.address) return;
    const refresh = () => Promise.resolve(refreshBalance()).catch(() => {});
    const id = setInterval(refresh, 10000); // 10 seconds cadence for wallet balance only
    const onVisibility = () => { if (document.visibilityState === 'visible') refresh(); };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisibility);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account?.address]);

  // Lightweight readiness checker to absorb indexer lag
  const checkStakingReadiness = async () => {
    try {
      const vaultAddrRes = await cedraClient.view({ payload: { function: `${MODULE_ADDRESS}::staking::get_vault_addr`, functionArguments: [dao.id] } });
      const vaultAddr = String(vaultAddrRes?.[0] || '');
      if (!vaultAddr) throw new Error('no vault addr');
      const [vaultOk, registryOk] = await Promise.all([
        cedraClient.getAccountResource({ accountAddress: vaultAddr, resourceType: `${MODULE_ADDRESS}::staking::Vault` }).then(() => true).catch(async () => {
          // Fallback: scan all resources at vault address for any staking::Vault type
          try {
            const resources: any[] = await (cedraClient as any).getAccountResources?.({ accountAddress: vaultAddr });
            if (Array.isArray(resources)) {
              return resources.some((r: any) => typeof r?.type === 'string' && r.type.endsWith('::staking::Vault'));
            }
          } catch {}
          return false;
        }),
        cedraClient.getAccountResource({ accountAddress: dao.id, resourceType: `${MODULE_ADDRESS}::staking::StakerRegistry` }).then(() => true).catch(() => false),
      ]);
      if (vaultOk && registryOk) {
        setStakingReady(true);
        return;
      }
      // Soft fallback: if total_staked view works, consider pool usable while indexer catches up
      try {
        const totalStakedRes = await cedraClient.view({ payload: { function: `${MODULE_ADDRESS}::staking::get_total_staked`, functionArguments: [dao.id] } });
        const ok = typeof totalStakedRes?.[0] !== 'undefined';
        setStakingReady(Boolean(ok));
      } catch {
        setStakingReady(false);
      }
    } catch {
      setStakingReady(false);
    }
  };

  useEffect(() => {
    let canceled = false;
    let attempts = 0;
    const run = async () => {
      while (!canceled && attempts < 5) {
        attempts += 1;
        await checkStakingReadiness();
        await new Promise(r => setTimeout(r, 800));
      }
    };
    run();
    return () => { canceled = true; };
  }, [dao.id]);

  const daoRewardsData = {
    votingRewards: 0,
    proposalRewards: 0,
    stakingRewards: 0,
    get totalClaimable() { return rewardsState.totalClaimable; },
    get totalClaimed() { return rewardsState.totalClaimed; },
    lastDistribution: rewardsState.lastDistribution || ''
  } as any;

  // History/activities view removed; no per-DAO activities needed here

  const validateStakeAmount = (amount: string): boolean => {
    const newErrors: {[key: string]: string} = {};
    const numAmount = parseFloat(amount);

    if (!amount || isNaN(numAmount)) {
      newErrors.stake = 'Please enter a valid amount';
    } else if (numAmount <= 0) {
      newErrors.stake = 'Amount must be greater than 0';
    } else {
      const gasReserve = 0.02; // keep ~0.02 CEDRA for gas
      const availableBalance = Math.max(0, daoStakingData.userBalance - gasReserve);
      
      if (numAmount > availableBalance) {
        newErrors.stake = `Insufficient balance. Available: ${availableBalance.toFixed(2)} CEDRA (after gas reserve)`;
      }
      
      // Enhanced validation: Check against both contract minimum (6 CEDRA) and DAO-specific minimum
      const contractMinimum = 6; // Contract enforces 6 CEDRA minimum
      const daoMinimum = Math.max(daoStakingData.minStakeRequired, contractMinimum);
      
      if (numAmount < contractMinimum) {
        newErrors.stake = `Contract minimum is ${contractMinimum} CEDRA tokens. You're trying to stake ${numAmount.toFixed(2)} CEDRA.`;
      } else if (numAmount < daoMinimum && daoStakingData.userDaoStaked === 0) {
        newErrors.stake = `${dao.name} requires ${daoMinimum} CEDRA minimum stake. You're trying to stake ${numAmount.toFixed(2)} CEDRA.`;
      }
    } 
    
    // Check if after staking, user will meet DAO minimum (for membership status display)
    const newTotalStaked = daoStakingData.userDaoStaked + numAmount;
    if (newTotalStaked < daoStakingData.minStakeRequired) {
      newErrors.stake = `Total stake of ${newTotalStaked.toFixed(2)} tokens would be below ${daoStakingData.minStakeRequired} tokens minimum for ${dao.name} membership`;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateUnstakeAmount = (amount: string): boolean => {
    const newErrors: {[key: string]: string} = {};
    const numAmount = parseFloat(amount);

    if (!amount || isNaN(numAmount)) {
      newErrors.unstake = 'Please enter a valid amount';
    } else if (numAmount <= 0) {
      newErrors.unstake = 'Amount must be greater than 0';
    } else if (numAmount > daoStakingData.userDaoStaked) {
      newErrors.unstake = 'Cannot unstake more than your staked amount';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleStake = async () => {
    if (!validateStakeAmount(stakeAmount)) return;

    setIsStaking(true);
    try {
      if (!account || !signAndSubmitTransaction) throw new Error('Wallet not connected');
      const raw = parseFloat(stakeAmount);
      if (!Number.isFinite(raw) || raw <= 0) {
        setErrors({ stake: 'Enter a valid amount' });
        return;
      }

      // Check balance sufficiency using BalanceService BEFORE attempting register (avoid simulation error when 0 balance)
      const balanceCheck = await BalanceService.hasSufficientBalance(account.address, raw, 0.02);
      if (!balanceCheck.sufficient) {
        setErrors({ stake: `Insufficient balance. Available: ${BalanceService.formatBalance(balanceCheck.available)} CEDRA, Required: ${BalanceService.formatBalance(balanceCheck.required)} CEDRA` });
        return;
      }
      
      // Do not block on coin registration: if the wallet shows a balance, proceed.
      // Some wallets/networks auto-register, and registration endpoints may not be needed.
      // If registration is required and missing, the stake tx will surface a clear error.
      
      const amountOctas = BalanceService.cedraToOctas(raw);
      if (amountOctas === '0') {
        setErrors({ stake: 'Amount too small' });
        return;
      }
      const payload = {
        function: `${MODULE_ADDRESS}::staking::stake`,
        typeArguments: [],
        functionArguments: [dao.id, amountOctas],
      };

      // Add gas options for new RPC compatibility
      const tx = await signAndSubmitTransaction({
        payload,
        options: {
          max_gas_amount: "200000",
          gas_unit_price: "100"
        }
      } as any);
      if (!tx || !(tx as any).hash) {
        setErrors({ stake: 'Transaction cancelled' });
        return;
      }
      if (tx && (tx as any).hash) {
        await cedraClient.waitForTransaction({ transactionHash: (tx as any).hash, options: { checkSuccess: true } });
      }
      
      // Optimistically update local state
      const stakeAmountNumber = parseFloat(stakeAmount);
      const newStakedAmount = daoStakingData.userDaoStaked + stakeAmountNumber;
      updateLocalState({
        stakedAmount: newStakedAmount,
        votingPower: newStakedAmount,
        isStaker: true,
        isMember: newStakedAmount >= daoStakingData.minStakeRequired
      });

      // Update last stake time to current time (for unstaking timer)
      setLastStakeTime(Math.floor(Date.now() / 1000));

      // Optimistically update wallet balance in the global state
      // Note: We'll refresh from blockchain shortly, this is just for immediate UI feedback

      setStakeAmount('');

      // Reset loading state immediately after successful transaction
      setIsStaking(false);

      // Show success alert
      showAlert(` Successfully staked ${stakeAmountNumber.toFixed(2)} CEDRA in ${dao.name}!`, 'success');

      // Refresh to get accurate on-chain state (in background, don't block UI)
      Promise.all([
        refreshOnChain(),
        refreshPortfolio(), // Refresh wallet balance
        refreshBalance(), // Refresh wallet balance using hook
      ]).catch(err => console.warn('Background refresh failed:', err));

    } catch (error: any) {
      const msg = String(error?.message || error || '');
      console.error('Staking failed:', error);
      // Specific guidance when staking pool/registry is not initialized
      if (msg.includes('Table:') || msg.toLowerCase().includes('table') || msg.toLowerCase().includes('not found')) {
        setErrors({ stake: 'Staking pool not initialized for this DAO. Ask an admin to initialize staking (vault and registry) before staking.' });
        return;
      }

      if (msg.includes('User rejected') || msg.includes('0x131')) {
        console.info('Stake canceled by user');
      } else if (msg.includes('insufficient') || msg.includes('balance') || msg.includes('0x6507')) {
        // Error 0x6507 = Insufficient balance for withdrawal
        const gasReserve = 0.02;
        const availableBalance = Math.max(0, daoStakingData.userBalance - gasReserve);
        setErrors({ stake: `Insufficient CEDRA balance. Available: ${availableBalance.toFixed(2)} CEDRA (need ${parseFloat(stakeAmount || '0').toFixed(2)} + gas)` });
      } else if (msg.includes('0x153') || msg.includes('min_stake_required')) {
        // Minimum stake requirement not met
        setErrors({ stake: `Must stake at least ${daoStakingData.minStakeRequired} CEDRA to join ${dao.name}` });
      } else if (msg.includes('0x7') || msg.includes('already_exists')) {
        // User already has staked balance, this shouldn't happen but handle gracefully
        setErrors({ stake: 'Staking resource conflict. Please refresh and try again.' });
      } else {
        setErrors({ stake: `Staking failed: ${msg.substring(0, 100)}...` });
      }
    } finally {
      setIsStaking(false);
    }
  };

  const handleUnstake = async () => {
    if (!validateUnstakeAmount(unstakeAmount)) return;

    setIsUnstaking(true);
    try {
      if (!account || !signAndSubmitTransaction) throw new Error('Wallet not connected');
      const raw = parseFloat(unstakeAmount);
      if (!Number.isFinite(raw) || raw <= 0) {
        setErrors({ unstake: 'Enter a valid amount' });
        return;
      }
      const amountOctas = BalanceService.cedraToOctas(raw);
      if (amountOctas === '0') {
        setErrors({ unstake: 'Amount too small' });
        return;
      }
      const stakedOctas = BalanceService.cedraToOctas(daoStakingData.userDaoStaked);
      if (Number(amountOctas) > Number(stakedOctas)) {
        setErrors({ unstake: 'Cannot unstake more than your staked amount' });
        return;
      }
      const payload = {
        function: `${MODULE_ADDRESS}::staking::unstake`,
        typeArguments: [],
        functionArguments: [dao.id, amountOctas],
      };

      // Add gas options for new RPC compatibility
      const tx = await signAndSubmitTransaction({
        payload,
        options: {
          max_gas_amount: "200000",
          gas_unit_price: "100"
        }
      } as any);
      if (!tx || !(tx as any).hash) {
        setErrors({ unstake: 'Transaction cancelled' });
        return;
      }
      if (tx && (tx as any).hash) {
        await cedraClient.waitForTransaction({ transactionHash: (tx as any).hash, options: { checkSuccess: true } });
      }
      
      // Optimistically update local state
      const unstakeAmountNumber = parseFloat(unstakeAmount);
      const newStakedAmount = daoStakingData.userDaoStaked - unstakeAmountNumber;
      updateLocalState({
        stakedAmount: newStakedAmount,
        votingPower: newStakedAmount,
        isStaker: newStakedAmount > 0,
        isMember: newStakedAmount >= daoStakingData.minStakeRequired
      });
      
      // Optimistically update wallet balance in the global state
      // Note: We'll refresh from blockchain shortly, this is just for immediate UI feedback

      setUnstakeAmount('');

      // Reset loading state immediately after successful transaction
      setIsUnstaking(false);

      // Show success alert
      showAlert(` Successfully unstaked ${unstakeAmountNumber.toFixed(2)} CEDRA from ${dao.name}!`, 'success');

      // Refresh to get accurate on-chain state (in background, don't block UI)
      Promise.all([
        refreshOnChain(),
        refreshPortfolio(), // Refresh wallet balance
        refreshBalance(), // Refresh wallet balance using hook
      ]).catch(err => console.warn('Background refresh failed:', err));

    } catch (error: any) {
      const msg = String(error?.message || error || '');
      if (msg.includes('User rejected') || msg.includes('0x131')) {
        console.info('Unstake canceled by user');
      } else if (msg.includes('0x305') || msg.toLowerCase().includes('time_lock_active') || msg.includes('invalid_time')) {
        setErrors({ unstake: 'Unstaking is locked for 1 hour after your last stake transaction. Please try again later.' });
      } else if (msg.includes('0x301') || msg.toLowerCase().includes('invalid_unstake_amount')) {
        setErrors({ unstake: 'Invalid amount to unstake.' });
      } else {
        console.error('Unstaking failed:', error);
        setErrors({ unstake: 'Unstaking transaction failed. Please try again.' });
      }
    } finally {
      setIsUnstaking(false);
    }
  };

  // Rewards claim removed (not supported by current contract/ABI)

  const handleJoinDAO = async () => {
    try {
      if (!account || !signAndSubmitTransaction) throw new Error('Wallet not connected');
      if (daoStakingData.userDaoStaked < daoStakingData.minStakeRequired) {
        setErrors({ stake: `Stake at least ${daoStakingData.minStakeRequired} CEDRA to join.` });
        return;
      }
      setIsJoining(true);
      const payload = {
        function: `${MODULE_ADDRESS}::membership::join`,
        typeArguments: [],
        functionArguments: [dao.id],
      };
      const tx = await signAndSubmitTransaction({ payload } as any);
      if (!tx || !(tx as any).hash) {
        setErrors({ stake: 'Transaction cancelled' });
        return;
      }
      if (tx && (tx as any).hash) {
        await cedraClient.waitForTransaction({ transactionHash: (tx as any).hash, options: { checkSuccess: true } });
      }
      
      // Optimistically update membership status
      updateLocalState({
        isMember: true,
        memberSince: Date.now()
      });
      
      await Promise.all([
        refreshOnChain(),
        refreshPortfolio(), // Refresh wallet balance
        refreshBalance(), // Refresh wallet balance using hook
      ]);
    } catch (e) {
      console.error('Join DAO failed:', e);
      setErrors({ stake: 'Join transaction failed. Please try again.' });
    } finally {
      setIsJoining(false);
    }
  };

  const handleLeaveDAO = async () => {
    try {
      if (!account || !signAndSubmitTransaction) throw new Error('Wallet not connected');

      setIsLeaving(true);
      const payload = {
        function: `${MODULE_ADDRESS}::membership::leave`,
        typeArguments: [],
        functionArguments: [dao.id],
      };

      const tx = await signAndSubmitTransaction({ payload } as any);
      if (tx && (tx as any).hash) {
        await cedraClient.waitForTransaction({ transactionHash: (tx as any).hash, options: { checkSuccess: true } });
      }

      // Optimistically update - user is now fully removed from registry
      updateLocalState({
        isMember: false,
        memberSince: undefined
      });

      showAlert(` Successfully left ${dao.name}. You can rejoin anytime by staking.`, 'success');

      await Promise.all([
        refreshOnChain(),
        refreshPortfolio(),
        refreshBalance(),
      ]);
    } catch (e: any) {
      console.error('Leave DAO failed:', e);
      const msg = String(e?.message || e || '');
      if (msg.includes('User rejected') || msg.includes('0x131')) {
        console.info('Leave canceled by user');
      } else {
        showAlert('Failed to leave DAO. Please try again.', 'error');
      }
    } finally {
      setIsLeaving(false);
    }
  };

  // Manual staking initialization for DAO admin
  const handleInitializeStaking = async () => {
    try {
      if (!account || !signAndSubmitTransaction) throw new Error('Wallet not connected');

      // Check if user is the DAO creator/admin
      if (account.address.toLowerCase() !== dao.id.toLowerCase()) {
        showAlert('Only the DAO creator can initialize staking.', 'error');
        return;
      }

      setIsStaking(true);
      const payload = {
        function: `${MODULE_ADDRESS}::staking::init_staking`,
        typeArguments: [],
        functionArguments: [],
      };

      const tx = await signAndSubmitTransaction({ payload } as any);

      if (tx && (tx as any).hash) {
        await cedraClient.waitForTransaction({ transactionHash: (tx as any).hash, options: { checkSuccess: true } });
        showAlert(' Staking initialized successfully! You can now stake tokens.', 'success');

        // Refresh data
        await refreshOnChain();
      }
    } catch (e: any) {
      console.error('Initialize staking failed:', e);
      const msg = String(e?.message || e || '');
      if (msg.includes('0x80001') || msg.includes('EOBJECT_EXISTS') || msg.includes('object already exists')) {
        showAlert(' Staking is already initialized for this DAO!', 'success');
        await refreshOnChain();
      } else if (msg.includes('1')) {
        showAlert('Staking is already initialized for this DAO.', 'info');
      } else if (msg.includes('User rejected')) {
        console.info('Initialization canceled by user');
      } else {
        showAlert(`Failed to initialize staking: ${msg.substring(0, 100)}`, 'error');
      }
    } finally {
      setIsStaking(false);
    }
  };

  const calculateProjectedRewards = () => {
    // Note: Rewards would be calculated based on participation in THIS DAO
    // but staking amount is global, so this is an estimate for this DAO only
    const stakingYield = 8.5; // This DAO's reward rate
    const dailyRate = stakingYield / 365 / 100;
    const dailyRewards = daoStakingData.userDaoStaked * dailyRate;
    const monthlyRewards = dailyRewards * 30;
    const yearlyRewards = daoStakingData.userDaoStaked * (stakingYield / 100);
    
    return {
      daily: dailyRewards,
      monthly: monthlyRewards,
      yearly: yearlyRewards
    };
  };

  const projectedRewards = calculateProjectedRewards();

  // Check unstaking availability
  const getUnstakingStatus = () => {
    if (lastStakeTime === 0) {
      return { canUnstake: true, waitTime: 0, message: 'Available' };
    }

    const now = Math.floor(Date.now() / 1000); // Current time in seconds
    const timeSinceStake = now - lastStakeTime;
    const requiredWaitTime = 3600; // 1 hour in seconds
    const remainingTime = Math.max(0, requiredWaitTime - timeSinceStake);

    if (remainingTime <= 0) {
      return { canUnstake: true, waitTime: 0, message: 'Available' };
    } else {
      const minutes = Math.ceil(remainingTime / 60);
      return { 
        canUnstake: false, 
        waitTime: remainingTime, 
        message: `Wait ${minutes} minute${minutes !== 1 ? 's' : ''}` 
      };
    }
  };

  const unstakingStatus = getUnstakingStatus();

  // Initialize section loading
  useEffect(() => {
    const loadStakingData = async () => {
      // Only refresh if wallet is connected, otherwise just load basic data
      if (account?.address) {
        try {
          // Add timeout to prevent hanging
          const timeout = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Loading timeout')), 10000)
          );

          await Promise.race([
            Promise.all([refreshMembership(), refreshPortfolio()]),
            timeout
          ]);
        } catch (error) {
          console.warn('Failed to refresh membership/portfolio:', error);
          // Continue anyway - don't block the UI
        }
      }
      // Always complete loading even if no wallet
    };

    sectionLoader.executeWithLoader(loadStakingData);
  }, [dao.id, account?.address]);

  // Persist core staking figures in session cache whenever they change
  useEffect(() => {
    stakingSessionCache.set(dao.id, {
      totalStakedInDAO,
      totalStakers,
      independentMinStake,
      timestamp: Date.now(),
    });
  }, [dao.id, totalStakedInDAO, totalStakers, independentMinStake]);

  // Silent refresh on window focus if cache is stale
  useEffect(() => {
    const onFocus = () => {
      const cached = stakingSessionCache.get(dao.id);
      const now = Date.now();
      if (cached && (now - cached.timestamp) >= SESSION_TTL_MS && (now - cached.timestamp) < MAX_STALE_MS) {
        (async () => { try { await refreshOnChain(); } catch {} })();
      }
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [dao.id]);

  const retryStakingData = () => {
    const loadStakingData = async () => {
      if (account?.address) {
        await refreshMembership();
        await refreshPortfolio();
      }
    };
    sectionLoader.executeWithLoader(loadStakingData);
  };

  return (
    <div className="w-full px-4 sm:px-6 space-y-8">
      {/* Main wrapper with border - same as Overview and Proposals */}
      <div className="border border-white/10 rounded-xl py-4 px-2 space-y-6" style={{ background: 'transparent' }}>

        {/* Error indicator only; loading runs silently */}
        {sectionLoader.error && (
          <div className="text-center text-sm text-red-300 mb-4 cursor-pointer" onClick={retryStakingData}>
            Error loading data - Click to retry
          </div>
        )}

        {/* Single card with navigation between sections */}
        <div className="max-w-md mx-auto px-4">
          <div className="border border-white/10 rounded-xl py-4 px-4 sm:py-6 sm:px-6" style={{ background: 'transparent' }}>

            {/* Tab Navigation - DEX Style */}
            <div className="flex items-center justify-end gap-2 mb-6">
              <button
                onClick={() => setActiveSection('stake')}
                className="px-3 py-1.5 rounded-lg font-medium text-xs transition-colors"
                style={{
                  background: activeSection === 'stake' ? '#e1fd6a' : 'transparent',
                  color: activeSection === 'stake' ? '#000000' : '#ffffff',
                  border: `1px solid ${activeSection === 'stake' ? '#e1fd6a' : '#ffffff20'}`
                }}
              >
                Stake
              </button>
              <button
                onClick={() => setActiveSection('unstake')}
                className="px-3 py-1.5 rounded-lg font-medium text-xs transition-colors"
                style={{
                  background: activeSection === 'unstake' ? '#e1fd6a' : 'transparent',
                  color: activeSection === 'unstake' ? '#000000' : '#ffffff',
                  border: `1px solid ${activeSection === 'unstake' ? '#e1fd6a' : '#ffffff20'}`
                }}
              >
                Unstake
              </button>
              <button
                onClick={() => setActiveSection('membership')}
                className={`px-3 py-1.5 rounded-lg font-medium text-xs transition-colors ${activeSection === 'membership' ? 'text-black' : 'text-white'}`}
                style={{
                  background: activeSection === 'membership' ? '#e1fd6a' : 'transparent',
                  border: `1px solid ${activeSection === 'membership' ? '#e1fd6a' : '#ffffff20'}`
                }}
              >
                {daoStakingData.isMember ? 'Member' : 'Join'}
              </button>
            </div>

            {/* Stake Section */}
            {activeSection === 'stake' && (
              <div className="space-y-4 px-4">
                <div>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max={daoStakingData.userBalance}
                      value={stakeAmount}
                      onChange={(e) => setStakeAmount(e.target.value)}
                    className={`w-full px-4 py-3 bg-white/10 border ${errors.stake ? 'border-red-500' : 'border-white/20'} rounded-xl text-white placeholder-gray-400`}
                      placeholder="Enter amount to stake"
                    />
                  {errors.stake && <p className="text-red-400 text-sm mt-1">{errors.stake}</p>}
                </div>

                  <div className="grid grid-cols-2 gap-4 text-sm px-2">
                  <div>
                    <div className="text-gray-400 mb-1">Balance:</div>
                    <div className="text-xs font-bold text-white">
                      {Math.max(0, daoStakingData.userBalance - 0.02).toFixed(2)} CEDRA
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-400 mb-1">Required:</div>
                    <div className="text-xs font-bold text-white">
                      {daoStakingData.minStakeRequired} CEDRA
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleStake}
                  disabled={isStaking || !stakeAmount || parseFloat(stakeAmount) <= 0}
                  className="w-full px-6 py-3 disabled:cursor-not-allowed rounded-xl font-semibold text-sm sm:text-base"
                  style={{
                    background: '#e1fd6a',
                    color: '#000000',
                    opacity: (isStaking || !stakeAmount || parseFloat(stakeAmount) <= 0) ? 0.5 : 1
                  }}
                >
                  {isStaking ? 'Staking...' : 'Stake CEDRA'}
                </button>
              </div>
            )}

            {/* Unstake Section */}
            {activeSection === 'unstake' && (
              <div className="space-y-4 px-4">
                <div>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max={daoStakingData.userDaoStaked}
                      value={unstakeAmount}
                      onChange={(e) => setUnstakeAmount(e.target.value)}
                    className={`w-full px-4 py-3 bg-white/10 border ${errors.unstake ? 'border-red-500' : 'border-white/20'} rounded-xl text-white placeholder-gray-400`}
                      placeholder="Enter amount to unstake"
                    />
                  {errors.unstake && <p className="text-red-400 text-sm mt-1">{errors.unstake}</p>}
                </div>

                {!unstakingStatus.canUnstake && (
                  <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-3">
                    <div className="text-yellow-300 text-sm">
                      ⏱️ Wait {unstakingStatus.message.toLowerCase()} before unstaking
                    </div>
                  </div>
                )}

                <div className="text-sm px-2">
                  <div className="text-gray-400 mb-1">Available:</div>
                  <div className="text-xs font-bold text-white">
                    {daoStakingData.userDaoStaked.toFixed(2)} CEDRA
                  </div>
                </div>

                <button
                  onClick={handleUnstake}
                  disabled={isUnstaking || !unstakeAmount || !unstakingStatus.canUnstake}
                  className="w-full px-6 py-3 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-xl font-medium text-sm sm:text-base"
                >
                  {isUnstaking ? 'Unstaking...' : 'Unstake CEDRA'}
                </button>
              </div>
            )}

            {/* Membership Section */}
            {activeSection === 'membership' && (
              <div className="space-y-4 px-4">
                {daoStakingData.isMember ? (
                  // User is a full member (in registry AND meets min stake)
                  <div className="text-center">
                    <div className="text-lg font-bold text-green-400 mb-3">✓ Member</div>
                    <div className="text-sm text-gray-300">
                      You are a member of this DAO
                    </div>
                  </div>
                ) : !daoStakingData.isMember && daoStakingData.userDaoStaked < daoStakingData.minStakeRequired && membershipData?.memberSince ? (
                  // User is in registry (has memberSince) but stake dropped below minimum - Inactive member
                  <div className="text-center">
                    <div className="text-lg font-bold text-yellow-400 mb-3">⚠ Inactive Member</div>
                    <div className="text-sm text-gray-300 mb-4">
                      Your stake ({daoStakingData.userDaoStaked.toFixed(2)} CEDRA) is below <span className="font-bold text-white">{Number(daoStakingData.minStakeRequired||0).toFixed(0)} CEDRA</span> minimum. Stake more to regain privileges, or fully leave.
                    </div>
                    <button
                      onClick={handleLeaveDAO}
                      disabled={isLeaving}
                      className="w-full px-6 py-3 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-colors hover:brightness-110 text-sm sm:text-base"
                      style={{ backgroundColor: '#2b2b2d' }}
                    >
                      {isLeaving ? 'Leaving...' : 'Leave DAO Completely'}
                    </button>
                  </div>
                ) : (
                  // User is not in registry at all
                  <div className="text-center">
                    <div className="text-lg font-bold text-orange-400 mb-3">Not a Member</div>
                    <div className="text-sm text-gray-300 mb-4">
                      Stake at least <span className="font-bold text-white">{Number(daoStakingData.minStakeRequired||0).toFixed(0)} CEDRA</span> to join
                    </div>
                    <button
                      onClick={handleJoinDAO}
                      disabled={isJoining || daoStakingData.userDaoStaked < daoStakingData.minStakeRequired}
                      className="w-full px-6 py-3 disabled:opacity-50 disabled:cursor-not-allowed text-black rounded-xl font-medium transition-colors text-sm sm:text-base"
                      style={{
                        background: '#e1fd6a'
                      }}
                    >
                      {isJoining ? 'Joining...' : daoStakingData.userDaoStaked < daoStakingData.minStakeRequired ? `Stake ${Number(daoStakingData.minStakeRequired||0).toFixed(0)} CEDRA First` : 'Join DAO'}
                    </button>
                    {daoStakingData.userDaoStaked === 0 && account?.address && (
                      <button
                        onClick={handleLeaveDAO}
                        disabled={isLeaving}
                        className="w-full px-6 py-3 mt-3 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-colors hover:brightness-110 text-sm sm:text-base"
                        style={{ backgroundColor: '#2b2b2d' }}
                      >
                        {isLeaving ? 'Leaving...' : 'Leave DAO Completely'}
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
};

export default DAOStaking;