import React, { useState, useEffect } from 'react';
import {
  Plus,
  Clock,
  XCircle,
  Play,
  Pause,
  Target,
  BarChart3,
  RefreshCw,
  AlertCircle,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { FaCheckCircle } from 'react-icons/fa';
import { DAO } from '../../types/dao';
import { useWallet } from '../../contexts/CedraWalletProvider';
import { cedraClient } from '../../cedra_service/cedra-client';
import { safeView, batchSafeView } from '../../utils/rpcUtils';
import { MODULE_ADDRESS } from '../../cedra_service/constants';
import DAOProposalDetails from './DAOProposalDetails';
import { useDAOMembership } from '../../hooks/useDAOMembership';
import { useDAOState } from '../../contexts/DAOStateContext';
import { useWalletBalance } from '../../hooks/useWalletBalance';
import { useAlert } from '../alert/AlertContext';
import { useSectionLoader } from '../../hooks/useSectionLoader';
import SectionLoader from '../common/SectionLoader';

interface DAOProposalsProps {
  dao: DAO;
  sidebarCollapsed?: boolean;
}

interface ProposalData {
  id: string;
  title: string;
  description: string;
  proposer: string;
  status: string;
  contractStatus?: string; // Actual contract status
  category: string;
  votesFor: number;
  votesAgainst: number;
  abstainVotes: number;
  totalVotes: number;
  totalStaked: number;
  quorumRequired: number;
  quorumCurrent: number;
  votingStart: string;
  votingEnd: string;
  executionWindow: number;
  executionDeadline: string;
  created: string;
  userVotingPower: number;
  userVoted: boolean;
  userVoteType: string | null;
  needsActivation?: boolean; // Flag indicating if proposal needs manual activation
  needsFinalization?: boolean; // Flag indicating if proposal needs manual finalization
}

  // Simple in-memory cache for proposal data (keep legacy but extend session cache TTL)
  const proposalCache = new Map<string, { data: ProposalData[]; timestamp: number }>();
  const PROPOSAL_CACHE_TTL = 30000; // legacy

const DAOProposals: React.FC<DAOProposalsProps> = ({ dao, sidebarCollapsed = false }) => {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedProposal, setSelectedProposal] = useState<ProposalData | null>(null);
  // In-memory cache so tab switches are instant (session-scoped)
  // @ts-ignore
  const proposalsCache: Map<string, { items: ProposalData[]; timestamp: number }> = (window as any).__proposalsCache || ((window as any).__proposalsCache = new Map());
  const PROPOSALS_TTL_MS = 5 * 60 * 1000; // 5 minutes session TTL
  const PROPOSALS_MAX_STALE_MS = 10 * 60 * 1000; // 10 minutes stale window
  const nowForInit = Date.now();
  const cachedForInit = proposalsCache.get(dao.id);
  const initialProposals = cachedForInit && (nowForInit - cachedForInit.timestamp) < PROPOSALS_TTL_MS
    ? cachedForInit.items
    : [];
  const [proposals, setProposals] = useState<ProposalData[]>(initialProposals);
  const [, setProposalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  // Section-level loader for unified loading state (like Overview)
  const sectionLoader = useSectionLoader();
  const [isCreating, setIsCreating] = useState(false);
  const [userStatus, setUserStatus] = useState({ isAdmin: false, isMember: false, isStaker: false });
  const [newProposal, setNewProposal] = useState({
    title: '',
    description: '',
    category: 'general',
    votingDuration: 7,
    executionWindow: 3,
    minQuorum: 20,
    startTime: '',
    endTime: ''
  });

  const { account, signAndSubmitTransaction } = useWallet();
  
  // Use persistent membership state
  const { 
    membershipData, 
    isMember, 
    isStaker, 
    canJoinDAO 
  } = useDAOMembership(dao);
  
  // Get wallet balance from DAO state context and wallet balance hook
  const { userState } = useDAOState();
  const { 
    balance: hookWalletBalance, 
    isLoading: balanceLoading, 
    error: balanceError, 
    refresh: refreshBalance 
  } = useWalletBalance();
  // Membership and proposal stakes use 6 decimals (1e6), not 8 decimals (1e8) like Cedra coins
  const MEMBERSHIP_DECIMALS = 1e6;  // 6 decimals for membership/proposal stakes
  const toMOVE = (u64: number): number => u64 / MEMBERSHIP_DECIMALS;
  const [canCreateProposal, setCanCreateProposal] = useState(true);
  const [nextProposalTime, setNextProposalTime] = useState<Date | null>(null);
  const [stakeRequirements, setStakeRequirements] = useState({
    minStakeToJoin: 0,
    minStakeToPropose: 0,
    userCurrentStake: 0,
    isAdmin: false,
    isMember: false,
    canPropose: false
  });
  const [membershipConfigMissing, setMembershipConfigMissing] = useState(false);
  const [votingError, setVotingError] = useState<string>('');
  const [showVotingError, setShowVotingError] = useState(false);
  const { showAlert } = useAlert();

  // Status mappings from contract
  const statusMap: { [key: number]: string } = {
    0: 'draft',
    1: 'active', 
    2: 'passed',
    3: 'rejected',
    4: 'executed',
    5: 'cancelled'
  };

  // UI helpers
  const Pill: React.FC<{ className?: string; icon?: React.ReactNode; children: React.ReactNode }>
    = ({ className = '', icon, children }) => (
    <span className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-medium border ${className}`}>
      {icon ? <span className="-ml-0.5">{icon}</span> : null}
      <span>{children}</span>
    </span>
  );

  // Keep user status in sync with context membership state immediately
  useEffect(() => {
    setUserStatus(prev => ({
      ...prev,
      isMember,
      isStaker,
    }));
  }, [isMember, isStaker]);

  // Lightweight role re-check using a single ABI view; never downgrade on transient failures
  useEffect(() => {
    let cancelled = false;
    const recheck = async () => {
      try {
        if (!dao.id || !account?.address) return;
        const [statusRes, canCreateRes] = await Promise.allSettled([
          cedraClient.view({ payload: { function: `${MODULE_ADDRESS}::proposal::get_user_status_code`, functionArguments: [dao.id, account.address] } }),
          cedraClient.view({ payload: { function: `${MODULE_ADDRESS}::proposal::can_user_create_proposals`, functionArguments: [dao.id, account.address] } }),
        ]);
        if (cancelled) return;

        // Persistently set roles; if call fails, keep previous values
        setUserStatus(prev => {
          if (statusRes.status === 'fulfilled' && Array.isArray(statusRes.value)) {
            const code = Number(statusRes.value?.[0] || 0);
            return {
              ...prev,
              isAdmin: code === 3,
      // Treat admin as member for UI purposes
      isMember: code === 1 || code === 3 || prev.isMember,
            };
          }
          return prev;
        });

        const adminIs = statusRes.status === 'fulfilled' && Array.isArray(statusRes.value)
          ? Number(statusRes.value?.[0] || 0) === 3
          : userStatus.isAdmin;
        const canCreateNow = canCreateRes.status === 'fulfilled' && Array.isArray(canCreateRes.value)
          ? Boolean(canCreateRes.value?.[0])
          : null;
        setCanCreateProposal(prev => adminIs || (canCreateNow === null ? prev : canCreateNow));
      } catch {}
    };
    recheck();
    return () => { cancelled = true; };
  }, [dao.id, account?.address]);


  const checkProposalEligibility = async () => {
    if (!account?.address) {
      setCanCreateProposal(false);
      setStakeRequirements({
        minStakeToJoin: 0,
        minStakeToPropose: 0,
        userCurrentStake: 0,
        isAdmin: false,
        isMember: false,
        canPropose: false
      });
      setUserStatus({ isAdmin: false, isMember: false, isStaker: false });
      return;
    }

    try {
      // Batch fetch staking requirements and user status with timeout
      const eligibilityPromises = [
        safeView({ 
            function: `${MODULE_ADDRESS}::membership::get_min_stake`, 
            functionArguments: [dao.id] 
        }),
        safeView({ 
            function: `${MODULE_ADDRESS}::membership::get_min_proposal_stake`, 
            functionArguments: [dao.id] 
        }),
        safeView({ 
          function: `${MODULE_ADDRESS}::staking::get_dao_staked_balance`, 
            functionArguments: [dao.id, account.address] 
        }),
        safeView({ 
            function: `${MODULE_ADDRESS}::admin::is_admin`, 
            functionArguments: [dao.id, account.address] 
        }),
        safeView({ 
            function: `${MODULE_ADDRESS}::membership::is_member`, 
            functionArguments: [dao.id, account.address] 
        }),
        safeView({ 
            function: `${MODULE_ADDRESS}::membership::can_create_proposal`, 
            functionArguments: [dao.id, account.address] 
        }),
        cedraClient.getAccountResource({
          accountAddress: account.address,
          resourceType: `${MODULE_ADDRESS}::proposal::ProposerRecord`
        }).catch(() => null)
      ];

      // Add timeout to prevent hanging on slow calls (increased timeout)
      const [
        minStakeToJoinRes,
        minStakeToProposRes,
        userStakeRes,
        isAdminRes,
        isMemberRes,
        canProposeRes,
        proposerRecord
      ] = await Promise.race([
        Promise.allSettled(eligibilityPromises),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Eligibility check timeout')), 15000))
      ]) as any[];

      // Helpers for safe extraction from view responses
      const getU64 = (res: any): number => {
        return res && res.status === 'fulfilled' && Array.isArray(res.value)
          ? Number(res.value?.[0] ?? 0)
          : 0;
      };
      const getBool = (res: any): boolean => {
        return res && res.status === 'fulfilled' && Array.isArray(res.value)
          ? Boolean(res.value?.[0])
          : false;
      };
      
      // Check if membership config is missing and provide fallback values
      const membershipConfigMissingCheck = minStakeToJoinRes?.status === 'rejected' && 
        minStakeToJoinRes?.reason?.message?.includes('MISSING_DATA');
      setMembershipConfigMissing(membershipConfigMissingCheck);

      // Extract values with safe defaults - handle both raw and Octa values
      const rawMinStakeToJoin = getU64(minStakeToJoinRes);
      const rawMinStakeToPropose = getU64(minStakeToProposRes);
      const rawUserCurrentStake = getU64(userStakeRes);
      
      // IMPORTANT: The contract stores ALL stakes with 6 decimal places (1e6)
      // Convert all stake values consistently using the same decimal conversion:
      let minStakeToJoin = toMOVE(rawMinStakeToJoin); // Convert from 6-decimal to MOVE tokens
      let minStakeToPropose = toMOVE(rawMinStakeToPropose); // Convert from 6-decimal to MOVE tokens  
      const userCurrentStake = toMOVE(rawUserCurrentStake); // Convert from 6-decimal to MOVE
      const isAdmin = getBool(isAdminRes);
      const isMember = getBool(isMemberRes);
      
      // ADMIN BYPASS: If user is DAO creator (same address), they are admin
      const isDAOCreator = account.address === dao.id;
      
      // Handle missing membership configuration or admin bypass
      if (membershipConfigMissingCheck || isDAOCreator || isAdmin) {
        // Set reasonable defaults when calls fail
        if (minStakeToJoin === 0) minStakeToJoin = 6;
        if (minStakeToPropose === 0) minStakeToPropose = 6;
      }
      
      let canPropose = getBool(canProposeRes);
      
      // Handle missing membership configuration or RPC failures - allow proposal creation for:
      // 1. Admins (always allowed - bypass all stake requirements)
      // 2. Users with sufficient stake when config is missing or calls fail
      if (membershipConfigMissingCheck || canProposeRes?.status === 'rejected') {
        canPropose = isAdmin || isDAOCreator || userCurrentStake >= minStakeToPropose;
      }
      
      // CRITICAL: Admins and DAO creators should ALWAYS be able to create proposals regardless of config
      if (isAdmin || isDAOCreator) {
        canPropose = true;
      }
      
      // FALLBACK: If member and has enough stake but RPC failed, allow proposal creation
      if (isMember && userCurrentStake >= minStakeToPropose && !canPropose) {
        canPropose = true;
      }


      // Update stake requirements state using persistent data where available
      setStakeRequirements({
        minStakeToJoin: membershipData?.minStakeRequired || minStakeToJoin,
        minStakeToPropose,
        userCurrentStake: membershipData?.stakedAmount || userCurrentStake,
        isAdmin: isAdmin || isDAOCreator, // DAO creator is always admin
        isMember: membershipData?.isMember ?? isMember,
        canPropose: canPropose || isDAOCreator // DAO creator can always propose
      });

      setUserStatus({
        isAdmin,
        isMember: membershipData?.isMember ?? isMember,
        isStaker: membershipData?.isStaker || (userCurrentStake > 0)
      });

      // Check cooldown period
      let canCreateDueToCooldown = true;
      if (proposerRecord && proposerRecord.status === 'fulfilled' && proposerRecord.value?.data) {
        const lastProposalTime = Number((proposerRecord.value.data as any)?.last_proposal_time || 0);
        
        if (lastProposalTime > 0) {
        const cooldownPeriod = 24 * 60 * 60; // 24 hours in seconds
        const nowSeconds = Math.floor(Date.now() / 1000);
        const nextAllowedTime = lastProposalTime + cooldownPeriod;

        if (nowSeconds < nextAllowedTime) {
          canCreateDueToCooldown = false;
          setNextProposalTime(new Date(nextAllowedTime * 1000));
          } else {
            setNextProposalTime(null);
          }
        } else {
          setNextProposalTime(null);
        }
      } else {
        setNextProposalTime(null);
      }

      // Final eligibility: can propose (stake + membership) AND cooldown passed
      setCanCreateProposal((isAdmin || canPropose) && canCreateDueToCooldown);

    } catch (error) {
      console.warn('Failed to check proposal eligibility:', error);
      // Set safe defaults
      setCanCreateProposal(false);
      setStakeRequirements({
        minStakeToJoin: 0,
        minStakeToPropose: 0,
        userCurrentStake: 0,
        isAdmin: false,
        isMember: false,
        canPropose: false
      });
      setUserStatus({ isAdmin: false, isMember: false, isStaker: false });
    }
  };

  const fetchProposals = async (forceRefresh = false) => {
    try {
      // Persist roles before any list refresh to avoid UI flicker/down-grading
      try {
        if (dao.id && account?.address) {
          const status = await cedraClient.view({
            payload: { function: `${MODULE_ADDRESS}::proposal::get_user_status_code`, functionArguments: [dao.id, account.address] }
          }).catch(() => null);
          if (status && Array.isArray(status)) {
            const code = Number(status[0] || 0);
            setUserStatus(prev => ({
              ...prev,
              isAdmin: code === 3 || prev.isAdmin,
              isMember: code === 1 || code === 3 || prev.isMember,
            }));
          }
        }
      } catch {}

      // For connected users, prefer fresh data for voting status.
      // For guests, use cache.
      const cacheKey = `proposals_${dao.id}`;
      if (!forceRefresh && !account?.address) {
        // Only use cache if user is not connected (no need to check voting status)
        // legacy cache
        const cachedLegacy = proposalCache.get(cacheKey);
        if (cachedLegacy && Date.now() - cachedLegacy.timestamp < PROPOSAL_CACHE_TTL) {
          setProposals(cachedLegacy.data);
          setIsLoading(false);
          return;
        }
        // session cache
        const cached = proposalsCache.get(dao.id);
        const now = Date.now();
        if (cached && (now - cached.timestamp) < PROPOSALS_TTL_MS) {
          setProposals(cached.items);
          setIsLoading(false);
          return;
        }
        // Stale session cache - show instantly and refresh in background silently
        if (cached && (now - cached.timestamp) < PROPOSALS_MAX_STALE_MS) {
          setProposals(cached.items);
          setIsLoading(false);
          // Silent background refresh
          (async () => { try { await fetchProposals(true); } catch {} })();
          return;
        }
      }
      
      setIsLoading(true);
      
      // First, get the total number of proposals (with circuit breaker + cache)
      const countRes = await safeView({ 
        function: `${MODULE_ADDRESS}::proposal::get_proposals_count`, 
        functionArguments: [dao.id] 
      }, `proposals_count_${dao.id}`);
      
      const count = Number(countRes[0] || 0);
      setProposalCount(count);
      
      if (count === 0) {
        setProposals([]);
        return;
      }

      // Fetch individual proposals in optimized batches via managed request manager
      const batchSize = 20; // Increased batch size for faster parallel fetch
      const proposalResults: any[] = [];

      for (let i = 0; i < count; i += batchSize) {
        const batchEnd = Math.min(i + batchSize, count);
        const payloads = [] as any[];
        for (let j = i; j < batchEnd; j++) {
          payloads.push({
            function: `${MODULE_ADDRESS}::proposal::get_proposal`,
            functionArguments: [dao.id, j]
          });
        }
        const settled = await batchSafeView(payloads, { cachePrefix: `proposal_${dao.id}_${i}` });
        for (const s of settled) {
          if (s.status === 'fulfilled') proposalResults.push(s.value);
          else proposalResults.push(null);
        }
      }
      const validProposals: ProposalData[] = [];

      for (let i = 0; i < proposalResults.length; i++) {
        const result = proposalResults[i];
        if (!result || !result[0]) continue;

        const proposalData = result[0] as any;
        
        // Check if user can vote (is member with sufficient stake)
        let userCanVote = false;
        let userVoted = false;
        let userVoteType = null;
        
        if (account?.address) {
          // Use the dedicated ABI function to check if user has voted
          try {
            const hasVotedResult = await safeView({
              function: `${MODULE_ADDRESS}::proposal::has_user_voted_on_proposal`,
              functionArguments: [dao.id, i, account.address]
            });
            userVoted = Boolean(hasVotedResult[0]);

            if (userVoted) {
              // Get the vote details if they voted
              try {
                const voteDetails = await safeView({
                  function: `${MODULE_ADDRESS}::proposal::get_user_vote_on_proposal`,
                  functionArguments: [dao.id, i, account.address]
                });
                if (voteDetails && voteDetails[0]) {
                  userVoteType = Number(voteDetails[1] || 0);
                  userCanVote = true;
                }
              } catch (err) {
                console.warn(`Could not get vote details for proposal ${i}`, err);
              }
            } else {
              // Use persistent membership state
              userCanVote = isMember && isStaker;
            }
          } catch (error) {
            console.warn(`Error checking if user voted on proposal ${i}:`, error);
            // Fallback to old method
            const votes = proposalData.votes || [];
            const userVote = votes.find((vote: any) => vote.voter === account.address);
            if (userVote) {
              userVoted = true;
              userVoteType = userVote.vote_type.value;
              userCanVote = true;
            } else {
              userCanVote = isMember && isStaker;
            }
          }
        }

        // Tally vote COUNTS from the on-chain votes vector (individual voters)
        const votesVec = (proposalData.votes || []) as any[];
        let yesCount = 0;
        let noCount = 0;
        let abstainCount = 0;
        for (const v of votesVec) {
          const vt = typeof v.vote_type?.value === 'number' ? v.vote_type.value : v.vote_type;
          if (vt === 1) yesCount += 1;
          else if (vt === 2) noCount += 1;
          else if (vt === 3) abstainCount += 1;
        }
        const totalVoters = yesCount + noCount + abstainCount;

        // Keep turnout (quorum) based on WEIGHT (staked voting power)
        const totalVotingWeight = toMOVE(Number(proposalData.yes_votes || 0))
          + toMOVE(Number(proposalData.no_votes || 0))
          + toMOVE(Number(proposalData.abstain_votes || 0));
        const totalStaked = 85200; // TODO: Get from DAO stats
        const quorumCurrent = totalStaked > 0 ? (totalVotingWeight / totalStaked) * 100 : 0;

        // Calculate effective status with automatic transitions
        const contractStatus = statusMap[proposalData.status.value] || 'unknown';
        const now = Date.now();
        const votingStart = new Date((Number(proposalData.voting_start || 0)) * 1000).getTime();
        const votingEnd = new Date((Number(proposalData.voting_end || 0)) * 1000).getTime();
        
        let effectiveStatus = contractStatus;
        
        // Keep status constant with contract; do not auto-transition in UI
        effectiveStatus = contractStatus;

        const proposal: ProposalData = {
          id: proposalData.id.toString(),
          title: proposalData.title,
          description: proposalData.description,
          proposer: proposalData.proposer,
          status: effectiveStatus,
          contractStatus: contractStatus, // Keep track of actual contract status
          category: 'general', // TODO: Add category to contract or derive from title
          // Expose vote COUNTS for UI totals and distribution
          votesFor: yesCount,
          votesAgainst: noCount,
          abstainVotes: abstainCount,
          totalVotes: totalVoters,
          totalStaked,
          quorumRequired: Number(proposalData.min_quorum_percent || 0),
          quorumCurrent,
          votingStart: new Date((Number(proposalData.voting_start || 0)) * 1000).toISOString(),
          votingEnd: new Date((Number(proposalData.voting_end || 0)) * 1000).toISOString(),
          executionWindow: Number(proposalData.execution_window || 0) / (24 * 60 * 60), // Convert to days
          executionDeadline: new Date((Number(proposalData.voting_end || 0) + Number(proposalData.execution_window || 0)) * 1000).toISOString(),
          created: new Date((Number(proposalData.created_at || 0)) * 1000).toISOString(),
          userVotingPower: userCanVote ? (membershipData?.votingPower || 0) : 0,
          userVoted,
          userVoteType: userVoteType === 1 ? 'yes' : userVoteType === 2 ? 'no' : userVoteType === 3 ? 'abstain' : null,
          needsActivation: contractStatus === 'draft' && now >= votingStart, // Flag for UI to show activation needed
          needsFinalization: contractStatus === 'active' && now >= votingEnd // Flag for UI to show finalization needed
        };

        validProposals.push(proposal);
      }

      const finalProposals = validProposals.reverse(); // Show newest first
      setProposals(finalProposals);
      
      // Cache the results
      proposalCache.set(cacheKey, { data: finalProposals, timestamp: Date.now() });
      proposalsCache.set(dao.id, { items: finalProposals, timestamp: Date.now() });
      
    } catch (error: any) {
      console.error('Failed to fetch proposals:', error);
      const msg = String(error?.message || error);
      if (msg.includes('Circuit breaker is OPEN') || msg.includes('429') || msg.includes('Too Many Requests')) {
        // Silently retry without showing message to user
        const retryDelay = 5000;
        setTimeout(() => {
          fetchProposals(forceRefresh);
        }, retryDelay);
      }
      setProposals([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Load proposals once per DAO; avoid reloading on tab switches
  // Eligibility still updates with account changes
  useEffect(() => {
    sectionLoader.executeWithLoader(fetchProposals);
  }, [dao.id]);

  // Light, real‑time refresh triggers without over-modifying logic
  useEffect(() => {
    const onFocus = () => fetchProposals(true);
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [dao.id]);

  // Restore selected proposal on mount (persist detail view across refresh)
  useEffect(() => {
    try {
      const savedId = localStorage.getItem(`dao_${dao.id}_selected_proposal_id`);
      if (!savedId) return;
      const found = proposals.find(p => p.id === savedId);
      if (found) setSelectedProposal(found);
    } catch {}
  }, [dao.id, proposals]);

  useEffect(() => {
    checkProposalEligibility();
  }, [dao.id, account?.address]);

  // Auto-activation effect - runs when proposals change
  useEffect(() => {
    if (proposals.length > 0 && account?.address) {
      autoActivateEligibleProposals();
    }
  }, [proposals.length, account?.address]);

  // Periodic status sync effect
  useEffect(() => {
    if (proposals.length === 0) return;
    
    const intervalId = setInterval(() => {
      fetchProposals(); // Refresh proposals to sync status
    }, 15000); // 15s cadence for snappier updates
    
    return () => clearInterval(intervalId);
  }, [proposals.length]);

  // Proposal creation function
  // Start voting function
  const handleStartVoting = async (proposalId: string) => {
    if (!account || !signAndSubmitTransaction) {
      showAlert('Please connect your wallet to start voting', 'error');
      return;
    }
    
    try {
      const payload = {
        function: `${MODULE_ADDRESS}::proposal::start_voting`,
        typeArguments: [],
        functionArguments: [
          dao.id,
          parseInt(proposalId)
        ]
      };
      
      const response = await signAndSubmitTransaction({ payload } as any);
      
      // If user cancels or no hash, treat as cancelled
      if (!response || !(response as any).hash) {
        showAlert('Transaction cancelled', 'error');
        return;
      }
      
      // Refresh proposals to update status
      await fetchProposals();
      showAlert('Voting started successfully! The proposal is now active for voting.', 'success');
    } catch (error: any) {
      console.error('Failed to start voting:', error);
      
      // Handle specific errors
      let errorMessage = 'Failed to start voting. Please try again.';
      if (error?.message || error?.toString()) {
        const errorString = error.message || error.toString();
        
        if (errorString.includes('invalid_status') || errorString.includes('0xc5')) {
          errorMessage = 'This proposal is not in draft status and cannot be activated.';
        } else if (errorString.includes('not_admin_or_proposer') || errorString.includes('0xc6')) {
          errorMessage = 'Only the proposal creator or DAO admins can start voting.';
        }
      }
      
      showAlert(errorMessage, 'error');
    }
  };

  // Auto-activation function for proposals that should be active
  const autoActivateEligibleProposals = async () => {
    if (!account?.address) return;
    
    const eligibleProposals = proposals.filter(proposal => 
      proposal.needsActivation && 
      (proposal.proposer === account.address)
    );
    
    for (const proposal of eligibleProposals) {
      try {
        await handleStartVoting(proposal.id);
      } catch (error) {
        console.warn(`Failed to auto-activate proposal ${proposal.id}:`, error);
        // Continue with other proposals even if one fails
      }
    }
  };

  // Finalize proposal function
  const handleFinalizeProposal = async (proposalId: string) => {
    if (!account || !signAndSubmitTransaction) {
      showAlert('Please connect your wallet to finalize this proposal', 'error');
      return;
    }
    
    try {
      const proposal = proposals.find(p => p.id === proposalId);
      if (!proposal) {
        showAlert('Proposal not found. Please refresh the page.', 'error');
        return;
      }
      
      // Check if voting period has ended
      const now = Date.now();
      const votingEnd = new Date(proposal.votingEnd).getTime();
      
      if (now < votingEnd) {
        showAlert('Voting period has not ended yet. Please wait for the voting period to end before finalizing.', 'error');
        return;
      }
      
      // Authorization check - only admins can finalize
      try {
        const isAdminRes = await cedraClient.view({
          payload: {
            function: `${MODULE_ADDRESS}::admin::is_admin`,
            functionArguments: [dao.id, account.address]
          }
        });

        const isAdmin = Array.isArray(isAdminRes) ? Boolean(isAdminRes[0]) : false;


        if (!isAdmin) {
          showAlert('You are not authorized to finalize proposals. Only DAO admins can finalize proposals.', 'error');
          return;
        }
      } catch (authError) {
        console.warn('Authorization check failed, proceeding with transaction:', authError);
      }
      
      // Double-check proposal status and voting times on-chain before finalizing
      try {
        const [statusCheck, proposalDetails] = await Promise.allSettled([
          cedraClient.view({
            payload: {
              function: `${MODULE_ADDRESS}::proposal::get_proposal_status`,
              functionArguments: [dao.id, parseInt(proposalId)]
            }
          }),
          cedraClient.view({
            payload: {
              function: `${MODULE_ADDRESS}::proposal::get_proposal_details`,
              functionArguments: [dao.id, parseInt(proposalId)]
            }
          })
        ]);
        
        const currentStatus = statusCheck.status === 'fulfilled' && Array.isArray(statusCheck.value) 
          ? Number(statusCheck.value[0]) 
          : null;
        
        if (currentStatus !== 1) { // 1 = active status
          showAlert(`This proposal cannot be finalized. Current status: ${currentStatus === 0 ? 'draft' : currentStatus === 2 ? 'passed' : currentStatus === 3 ? 'rejected' : currentStatus === 4 ? 'executed' : 'unknown'}. Only active proposals can be finalized.`, 'error');
          return;
        }
        
        // Check voting end time on-chain
        if (proposalDetails.status === 'fulfilled' && Array.isArray(proposalDetails.value)) {
          const details = proposalDetails.value;
          // get_proposal_details returns: (id, title, description, proposer, status, yes_votes, no_votes, abstain_votes, created_at, voting_start, voting_end, execution_window, approved_by_admin, finalized_by_admin, vote_count, member_count)
          const votingEndOnChain = Number(details[10] || 0); // voting_end is at index 10
          const nowSeconds = Math.floor(Date.now() / 1000);

          if (nowSeconds < votingEndOnChain) {
            const endDate = new Date(votingEndOnChain * 1000).toLocaleString();
            showAlert(`Voting period has not ended yet. Voting ends at: ${endDate}. Current time: ${new Date().toLocaleString()}. Time remaining: ${Math.ceil((votingEndOnChain - nowSeconds) / 60)} minutes`, 'error');
            return;
          }
        }
        
        // Check if staking module is properly initialized (needed for finalization)
        try {
          const totalStaked = await cedraClient.view({
            payload: {
              function: `${MODULE_ADDRESS}::staking::get_total_staked`,
              functionArguments: [dao.id]
            }
          });
        } catch (stakingError) {
          console.warn('Could not check staking amount:', stakingError);
          showAlert('Warning: Could not verify staking module state. The finalization might fail if staking is not properly initialized.', 'error');
        }
      } catch (statusError) {
        console.warn('Status/time check failed, proceeding with transaction:', statusError);
      }

      const payload = {
        function: `${MODULE_ADDRESS}::proposal::finalize_proposal`,
        typeArguments: [],
        functionArguments: [
          dao.id,
          parseInt(proposalId)
        ]
      };
      
      const response = await signAndSubmitTransaction({ payload } as any);

      // Wait for transaction to be confirmed
      if (response?.hash) {
        try {
          await cedraClient.waitForTransaction({ transactionHash: response.hash });
        } catch (waitError) {
          console.warn('Wait for transaction failed, but continuing:', waitError);
        }
      }

      // Add a small delay to ensure indexer has processed the transaction
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Refresh proposals to update status
      await fetchProposals(true);

      showAlert('Proposal finalized successfully! The outcome has been determined based on votes and quorum.', 'success');
    } catch (error: any) {
      console.error('Failed to finalize proposal:', error);
      console.error('Error type:', typeof error);
      console.error('Error keys:', Object.keys(error || {}));
      console.error('Error stack:', error?.stack);
      
      // Try to extract more detailed error information
      let errorDetails = {};
      if (error) {
        errorDetails = {
          message: error.message,
          code: error.code,
          data: error.data,
          details: error.details,
          reason: error.reason,
          transaction: error.transaction,
          transactionHash: error.transactionHash
        };
      }
      console.error('Detailed error info:', errorDetails);
      
      let errorMessage = 'Failed to finalize proposal. ';
      if (error?.message || error?.toString()) {
        const errorString = error.message || error.toString();
        
        if (errorString.includes('User rejected')) {
          errorMessage = 'Transaction was cancelled by user.';
        } else if (errorString.includes('simulation')) {
          errorMessage = 'Transaction simulation failed. This usually means:\\n\\n1. You are not authorized to finalize this proposal\\n2. The proposal is not in the correct status\\n3. The voting period has not ended yet\\n\\nPlease check your authorization and try again.';
        } else if (errorString.includes('invalid_status') || errorString.includes('0xc5')) {
          errorMessage = 'This proposal is not in active status and cannot be finalized.';
        } else if (errorString.includes('not_authorized') || errorString.includes('0x9')) {
          errorMessage = 'You are not authorized to finalize this proposal. Only admins or members with proposal creation rights can finalize proposals.';
        } else if (errorString.includes('voting_ended') || errorString.includes('0xc9')) {
          errorMessage = 'Voting period has not ended yet. Please wait for the voting period to end before finalizing.';
        } else if (errorString.includes('EABORTED')) {
          // Move abort error
          errorMessage = `Contract execution failed: ${errorString}\\n\\nThis indicates a Move contract assertion failed. Check console for detailed error information.`;
        } else {
          errorMessage += `Error details: ${errorString}`;
        }
      } else {
        errorMessage += 'No error details available. Check console logs for more information.';
      }
      
      showAlert(errorMessage, 'error');
    }
  };

  // Enhanced voting function with automatic activation check
  const handleVoteWithActivation = async (proposalId: string, voteType: number) => {
    // Clear any previous errors
    setShowVotingError(false);
    setVotingError('');
    
    const proposal = proposals.find(p => p.id === proposalId);
    
    if (!proposal) {
      setVotingError('Proposal not found. Please refresh the page.');
      setShowVotingError(true);
      return;
    }
    
    // If proposal needs activation and user can activate it, try auto-activation first
    if (proposal.needsActivation && proposal.contractStatus === 'draft') {
      const canActivate = proposal.proposer === account?.address;
      
      if (canActivate) {
        try {
          await handleStartVoting(proposalId);
          // Wait a moment for status to update, then proceed with voting
          setTimeout(() => handleVote(proposalId, voteType), 1000);
          return;
        } catch (error) {
          console.warn('Auto-activation failed, proceeding with regular vote:', error);
        }
      }
    }
    
    // Proceed with regular voting
    await handleVote(proposalId, voteType);
  };

  // Voting functions
  const handleVote = async (proposalId: string, voteType: number) => {
    if (!account || !signAndSubmitTransaction) {
      throw new Error('Please connect your wallet to vote on this proposal');
    }

    try {
      // Pre-validate conditions by checking proposal status
      const proposal = proposals.find(p => p.id === proposalId);
      if (!proposal) {
        throw new Error('Proposal not found. Please refresh the page and try again.');
      }

      // Check if voting has started by examining the voting start time
      const now = Date.now();
      const votingStart = new Date(proposal.votingStart).getTime();
      const votingEnd = new Date(proposal.votingEnd).getTime();

      // Enforce strict time-based voting - only allow voting when the scheduled time has been reached
      if (now < votingStart) {
        const startDate = new Date(votingStart).toLocaleString();
        throw new Error(`Voting has not started yet. Voting begins on ${startDate}. Please wait for the voting period to begin before casting your vote.`);
      }

      if (now > votingEnd) {
        const endDate = new Date(votingEnd).toLocaleString();
        throw new Error(`Voting has ended on ${endDate}. This proposal is no longer accepting votes.`);
      }

      if (proposal.userVoted) {
        throw new Error('You have already voted on this proposal. Each member can only vote once per proposal.');
      }

      // Let the contract validate membership and voting power on-chain
      // Frontend checks can use stale cached data, so we skip them and let the contract decide

      const payload = {
          function: `${MODULE_ADDRESS}::proposal::cast_vote`,
        typeArguments: [],
          functionArguments: [
            dao.id,
            parseInt(proposalId),
            voteType // 1 = yes, 2 = no, 3 = abstain
          ]
      };

      const response = await signAndSubmitTransaction({ payload } as any);

      // Check if transaction was rejected by user - handle various rejection formats
      if (!response ||
          response?.status === 'Rejected' ||
          response?.status === 'rejected' ||
          String(response?.status || '').toLowerCase().includes('reject')) {
        return; // Exit silently without showing success message
      }

      // Only proceed if we have a valid successful response
      if (!response?.hash && !response?.success) {
        return;
      }

      // Update selected proposal to reflect voting status immediately (optimistic update)
      if (selectedProposal && selectedProposal.id === proposalId) {
        setSelectedProposal(prev => prev ? { ...prev, userVoted: true } : null);
      }

      showAlert('Vote cast successfully!', 'success');

      // Refresh proposals with force refresh to bypass cache and update from blockchain
      await fetchProposals(true); // Force refresh to bypass cache

      // Keep userVoted true - don't let refresh override it
      setSelectedProposal(prev => prev ? { ...prev, userVoted: true } : null);
    } catch (error: any) {
      console.error('Failed to cast vote:', error);

      // Check if user rejected/cancelled the transaction
      const errorString = error?.message || error?.toString() || '';
      const lowerErrorString = errorString.toLowerCase();

      // Check for various wallet rejection patterns
      if (
        lowerErrorString.includes('user rejected') ||
        lowerErrorString.includes('user cancelled') ||
        lowerErrorString.includes('user denied') ||
        lowerErrorString.includes('rejected by user') ||
        lowerErrorString.includes('cancelled by user') ||
        lowerErrorString.includes('user disapproved') ||
        lowerErrorString.includes('request rejected') ||
        lowerErrorString.includes('transaction rejected') ||
        lowerErrorString.includes('declined') ||
        error?.code === 4001 || // Standard wallet rejection code
        error?.code === 'ACTION_REJECTED'
      ) {
        // User cancelled - don't show error, just exit silently
        return;
      }

      // Handle user-friendly error messages for voting with enhanced membership context
      const isAdmin = userStatus.isAdmin || stakeRequirements.isAdmin;
      let errorMessage = `Unable to cast vote on this ${dao.name} proposal. `;

      // Add specific membership context to the error (skip membership check for admins)
      if (!isAdmin) {
        if (!isMember) {
          if (!isStaker) {
            errorMessage += `You are not a member - you need to stake at least ${membershipData?.minStakeRequired || 'some'} MOVE tokens to join and vote.`;
          } else {
            errorMessage += `You have ${membershipData?.stakedAmount || 0} MOVE staked but need to join the DAO to vote.`;
          }
        } else if ((membershipData?.votingPower || 0) <= 0) {
          errorMessage += `You are a member but have no voting power. Current stake: ${membershipData?.stakedAmount || 0} MOVE.`;
        } else {
          errorMessage += 'Please check your membership status and try again.';
        }
      } else {
        errorMessage += 'Please try again or check the contract logs for details.';
      }

      // If it's already a user-friendly error (like voting time validation), use it directly
      if (errorString.includes('Voting has not started yet') || errorString.includes('Voting begins on')) {
        errorMessage = errorString;
      } else if (errorString.includes('0xc8') || errorString.includes('200')) {
        errorMessage = 'Voting has not started yet for this proposal. Please wait for the voting period to begin before casting your vote.';
      } else if (errorString.includes('0xc9') || errorString.includes('201')) {
        errorMessage = 'Voting has ended for this proposal. This proposal is no longer accepting votes.';
      } else if (errorString.includes('0xca') || errorString.includes('202')) {
        errorMessage = 'You have already voted on this proposal. Each member can only vote once per proposal.';
      } else if (errorString.includes('0xcb') || errorString.includes('203')) {
        errorMessage = 'Proposal not found. The proposal may have been removed or the ID is invalid. Please refresh and try again.';
      } else if (errorString.includes('0xd0') || errorString.includes('208')) {
        errorMessage = 'Invalid vote selection. Please choose a valid voting option (Yes, No, or Abstain).';
      } else if (errorString.includes('0x9') || errorString.includes('not_authorized')) {
        errorMessage = 'You are not authorized to vote on this proposal. You may need to stake tokens to become a DAO member.';
      } else if (errorString.includes('0x97') || errorString.includes('151')) {
        errorMessage = 'You are not a member of this DAO. Only DAO members can participate in governance voting.';
      } else if (errorString.includes('0x99') || errorString.includes('153')) {
        errorMessage = 'Insufficient stake to vote. You need to stake more tokens to participate in DAO governance.';
      }

      // Show error to user instead of throwing
      setVotingError(errorMessage);
      setShowVotingError(true);

      // Auto-hide error after 8 seconds for longer messages
      setTimeout(() => {
        setShowVotingError(false);
        setVotingError('');
      }, 8000);
    }
  };

  const handleCreateProposal = async () => {
    if (!account || !signAndSubmitTransaction) {
      showAlert('Please connect your wallet to create a proposal', 'error');
      return;
    }

    if (!newProposal.title.trim() || !newProposal.description.trim()) {
      showAlert('Please fill in both title and description', 'error');
      return;
    }

    try {
      setIsCreating(true);

      // Enhanced stake validation with detailed feedback
      // ADMINS BYPASS FRONTEND CHECKS - no error messages shown to admins
      if (stakeRequirements.isAdmin) {
        // Admins proceed without any validation errors
      } else if (!stakeRequirements.canPropose) {
        // Only show staking errors to non-admin users
        let errorMessage = 'You cannot create proposals. ';
        
        // Check if membership config is missing and user has sufficient stake
        if (membershipConfigMissing && stakeRequirements.userCurrentStake >= 5) {
          errorMessage = 'DAO membership configuration is missing. You have sufficient stake but membership validation failed. Contact the DAO creator to initialize membership settings.';
        } else if (stakeRequirements.userCurrentStake === 0 && stakeRequirements.minStakeToJoin === 0) {
          errorMessage = ` DAO CONFIGURATION ISSUE: This DAO appears to be incorrectly configured or doesn't exist. Both your stake and minimum requirements show 0.00 MOVE. Please verify you're using the correct DAO address, or contact the DAO creator to properly initialize this DAO.`;
        } else if (!stakeRequirements.isMember) {
          errorMessage += `You need to be a DAO member first. Minimum stake to join: ${stakeRequirements.minStakeToJoin.toFixed(2)} MOVE tokens. Your current stake: ${stakeRequirements.userCurrentStake.toFixed(2)} MOVE tokens.`;
        } else {
          errorMessage += `You need to stake more tokens. Minimum stake for proposals: ${stakeRequirements.minStakeToPropose.toFixed(2)} MOVE tokens. Your current stake: ${stakeRequirements.userCurrentStake.toFixed(2)} MOVE tokens.`;
        }
        
        showAlert(errorMessage, 'error');
        return;
      }

      // Compute timing parameters
      const nowSeconds = Math.floor(Date.now() / 1000);
      let startDelaySeconds = 0;
      let votingDurationSeconds = newProposal.votingDuration * 24 * 60 * 60;

      const hasStart = Boolean(newProposal.startTime && newProposal.startTime.trim());
      const hasEnd = Boolean(newProposal.endTime && newProposal.endTime.trim());

      if (hasStart) {
        const startSeconds = Math.floor(new Date(newProposal.startTime).getTime() / 1000);
        startDelaySeconds = Math.max(0, startSeconds - nowSeconds);
      }

      if (hasEnd) {
        const endSeconds = Math.floor(new Date(newProposal.endTime).getTime() / 1000);
        const effectiveStart = hasStart ? Math.max(nowSeconds, Math.floor(new Date(newProposal.startTime).getTime() / 1000)) : nowSeconds;
        if (endSeconds <= effectiveStart) {
          showAlert('End time must be after the start time', 'error');
          return;
        }
        votingDurationSeconds = endSeconds - effectiveStart;
      }

      const executionWindowSeconds = newProposal.executionWindow * 24 * 60 * 60;
      // Convert percentage to basis points for future use if needed

      // Contract expects absolute timestamps for start and end
      // Ensure start timestamp is at least 30 seconds in the future to account for transaction time
      const minStartDelay = 30; // 30 seconds minimum delay
      const effectiveStartDelay = Math.max(startDelaySeconds, minStartDelay);
      const startTimestamp = Math.floor(Date.now() / 1000) + effectiveStartDelay;
      const endTimestamp = startTimestamp + votingDurationSeconds;

      // Validate all required values are present
      if (!dao.id) {
        showAlert('DAO ID is missing. Please refresh the page and try again.', 'error');
        return;
      }

      if (!MODULE_ADDRESS) {
        showAlert('Module address is not configured. Please check the application setup.', 'error');
        return;
      }

      const functionArguments = [
            dao.id,
            newProposal.title,
            newProposal.description,
        startTimestamp.toString(),
        endTimestamp.toString(),
        executionWindowSeconds.toString(),
        Math.floor(newProposal.minQuorum).toString()
      ];

      // Validate no arguments are undefined
      const undefinedIndex = functionArguments.findIndex(arg => arg === undefined || arg === null);
      if (undefinedIndex !== -1) {
        console.error('Undefined argument at index:', undefinedIndex, functionArguments);
        showAlert('Invalid proposal data. Please check all fields and try again.', 'error');
        return;
      }

      const payload = {
        function: `${MODULE_ADDRESS}::proposal::create_proposal`,
        typeArguments: [],
        functionArguments
      };

      const response = await signAndSubmitTransaction({ payload } as any);

      // Reset form and close
      setNewProposal({
        title: '',
        description: '',
        category: 'general',
        votingDuration: 7,
        executionWindow: 3,
        minQuorum: 20,
        startTime: '',
        endTime: ''
      });
      setShowCreateForm(false);

      // Refresh proposals, but do not downgrade roles on transient view failures
      await fetchProposals();
      // Re-evaluate create permission using single consolidated view with persistence
      try {
        const [statusRes, canCreateRes] = await Promise.allSettled([
          cedraClient.view({ payload: { function: `${MODULE_ADDRESS}::proposal::get_user_status_code`, functionArguments: [dao.id, account.address] } }),
          cedraClient.view({ payload: { function: `${MODULE_ADDRESS}::proposal::can_user_create_proposals`, functionArguments: [dao.id, account.address] } }),
        ]);
        setUserStatus(prev => {
          if (statusRes.status === 'fulfilled' && Array.isArray(statusRes.value)) {
            const code = Number(statusRes.value?.[0] || 0);
            return {
              ...prev,
              isAdmin: code === 3 || prev.isAdmin,
              isCouncil: code === 2 || prev.isCouncil,
              isMember: code === 1 || code === 2 || code === 3 || prev.isMember,
            };
          }
          return prev;
        });
        if (canCreateRes.status === 'fulfilled' && Array.isArray(canCreateRes.value)) {
          const can = Boolean(canCreateRes.value?.[0]);
          setCanCreateProposal(prev => userStatus.isAdmin || can || prev);
        }
      } catch {}
      
      showAlert('Proposal created successfully!', 'success');
    } catch (error: any) {
      console.error('Failed to create proposal:', error);
      let errorMessage = 'Failed to create proposal';
      
      // Check for specific error codes
      if (error?.message || error?.toString()) {
        const errorString = error.message || error.toString();
        
        if (errorString.includes('0x262') || errorString.includes('610')) {
          errorMessage = 'You can only create one proposal per 24 hours. Please wait before creating another proposal.';
        } else if (errorString.includes('insufficient') || errorString.includes('Not enough coins')) {
          errorMessage = 'Insufficient MOVE tokens. Creating a proposal requires 0.01 MOVE tokens as a fee (plus ~0.5 MOVE for gas). Please ensure you have at least 0.51 MOVE in your wallet.';
        } else if (errorString.includes('0x4') || errorString.includes('invalid_amount')) {
          errorMessage = 'Invalid proposal parameters. Please check your input values.';
        } else if (errorString.includes('0x9') || errorString.includes('not_authorized')) {
          errorMessage = 'You are not authorized to create proposals. You may need to stake more tokens or become a DAO member.';
        } else {
          errorMessage = `Failed to create proposal: ${errorString}`;
        }
      }
      
      showAlert(errorMessage, 'error');
    } finally {
      setIsCreating(false);
    }
  };

  // No filtering - show all proposals
  const filteredProposals = proposals;

  // Mobile stats carousel index
  const [carouselIndex, setCarouselIndex] = useState(0);

  // Proposal statistics
  const proposalStats = {
    total: proposals.length,
    active: proposals.filter(p => p.status === 'active').length,
    passed: proposals.filter(p => p.status === 'passed').length,
    rejected: proposals.filter(p => p.status === 'rejected').length,
    executed: proposals.filter(p => p.status === 'executed').length
  };

  // Utility functions
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-blue-400 bg-blue-500/20 border-blue-500/30';
      case 'passed': return 'text-green-400 bg-green-500/20 border-green-500/30';
      case 'rejected': return 'text-red-400 bg-red-500/20 border-red-500/30';
      case 'executed': return 'text-purple-400 bg-purple-500/20 border-purple-500/30';
      case 'cancelled': return 'text-gray-400 bg-gray-500/20 border-gray-500/30';
      default: return 'text-gray-400 bg-gray-500/20 border-gray-500/30';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <Play className="w-4 h-4" />;
              case 'passed': return <FaCheckCircle className="w-4 h-4" />;
      case 'rejected': return <XCircle className="w-4 h-4" />;
      case 'executed': return <Target className="w-4 h-4" />;
      case 'cancelled': return <Pause className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const formatProposalId = (idStr: string) => {
    const id = parseInt(idStr, 10);
    if (Number.isNaN(id)) return `#${idStr}`;
    const padded = String(id).padStart(5, '0');
    return `A-${padded}`;
  };

  const formatShortDate = (iso: string) => new Date(iso).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <div className="w-full px-4 sm:px-6 space-y-8">
      {/* Main wrapper with border */}
      <div className="border border-white/10 rounded-xl py-4 px-2 space-y-6" style={{ background: 'transparent' }}>
      {/* Details view when a proposal is selected */}
      {selectedProposal ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => {
                setSelectedProposal(null);
                try { localStorage.removeItem(`dao_${dao.id}_selected_proposal_id`); } catch {}
              }}
              className="px-3 py-2 bg-white/5 hover:bg.White/10 text-gray-300 rounded-lg text-sm"
            >
              ← Back to proposals
            </button>
          </div>
          
          {/* Voting Error Display - Proposal Details View */}
          {showVotingError && (
            <div className="mb-6 bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-start space-x-3">
              <XCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-red-300 font-medium mb-1">Voting Error</h3>
                <p className="text-red-200 text-sm">{votingError}</p>
              </div>
              <button
                onClick={() => {
                  setShowVotingError(false);
                  setVotingError('');
                }}
                className="text-red-400 hover:text-red-300 transition-colors"
              >
                <XCircle className="w-4 h-4" />
              </button>
            </div>
          )}
          
          <DAOProposalDetails
            title={selectedProposal.title}
            description={selectedProposal.description}
            proposer={selectedProposal.proposer}
            endsAt={selectedProposal.votingEnd}
            votingStart={selectedProposal.votingStart}
            votingEnd={selectedProposal.votingEnd}
            quorumCurrentPercent={selectedProposal.quorumCurrent}
            quorumRequiredPercent={selectedProposal.quorumRequired}
            category={selectedProposal.category}
            votesFor={selectedProposal.votesFor}
            votesAgainst={selectedProposal.votesAgainst}
            votesAbstain={selectedProposal.abstainVotes}
            status={selectedProposal.status}
            proposalId={selectedProposal.id}
            createdAt={selectedProposal.created}
            daoName={dao.name}
            onVote={(voteType: number) => handleVoteWithActivation(selectedProposal.id, voteType)}
            onStartVoting={() => handleStartVoting(selectedProposal.id)}
            onFinalize={() => handleFinalizeProposal(selectedProposal.id)}
            canVote={selectedProposal.userVotingPower > 0}
            hasVoted={selectedProposal.userVoted}
            canStartVoting={Boolean(selectedProposal.proposer === account?.address || userStatus.isAdmin)}
            canFinalize={Boolean(userStatus.isAdmin)}
            userAddress={account?.address}
            userIsAdmin={userStatus.isAdmin}
            userIsCouncil={false}
            userIsMember={userStatus.isMember}
          />
        </div>
      ) : (
        <>
          {/* Voting Error Display */}
          {showVotingError && (
            <div className="mb-6 bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-start space-x-3">
              <XCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-red-300 font-medium mb-1">Voting Error</h3>
                <p className="text-red-200 text-sm">{votingError}</p>
              </div>
              <button
                onClick={() => {
                  setShowVotingError(false);
                  setVotingError('');
                }}
                className="text-red-400 hover:text-red-300 transition-colors"
              >
                <XCircle className="w-4 h-4" />
              </button>
            </div>
          )}
          
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-lg sm:text-xl font-bold text-white leading-tight">Proposals</h1>
        <div className="flex items-center space-x-3 flex-shrink-0">
          <button
            onClick={() => fetchProposals(true)}
            disabled={isLoading}
            className="p-2 text-[#e1fd6a] hover:text-[#e1fd6a]/80 hover:bg-white/5 rounded-lg transition-all disabled:opacity-50"
            title="Refresh proposals"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
            {(() => {
              const canCreate = userStatus.isAdmin || stakeRequirements.canPropose; // ABI: admin OR can_create_proposal
              const isAdmin = userStatus.isAdmin;
              const isMember = userStatus.isMember;
              let tooltip = 'Create a new governance proposal';
              let label = 'New Proposal';
              let isBecomeMember = false;
              if (!canCreate) {
                if (nextProposalTime) {
                  tooltip = `You can create another proposal at ${nextProposalTime.toLocaleString()}`;
                  label = `Wait ${Math.ceil((nextProposalTime.getTime() - Date.now()) / (1000 * 60 * 60))}h`;
                } else {
                  // Minimal, ABI-aligned messaging (no hard join gate)
                  if (!isAdmin) {
                    if (!isMember) {
                      label = 'Become Member';
                      tooltip = `Become a member to propose. Minimum stake to join: ${stakeRequirements.minStakeToJoin.toFixed(2)} MOVE.`;
                      isBecomeMember = true;
                    } else {
                      label = 'Not Eligible';
                      tooltip = `Stake ≥ ${stakeRequirements.minStakeToPropose.toFixed(2)} MOVE to propose. Your stake: ${stakeRequirements.userCurrentStake.toFixed(2)} MOVE.`;
                    }
                  }
                }
              }
              return (
                <button
                  onClick={() => canCreate && setShowCreateForm(true)}
                  disabled={isBecomeMember || !canCreate}
                  title={tooltip}
                  className={`flex items-center space-x-2 px-4 py-2 font-semibold text-sm transition-all rounded-lg ${
                    canCreate || isBecomeMember
                      ? 'hover:opacity-80'
                      : 'cursor-not-allowed opacity-50'
                  }`}
                  style={
                    canCreate || isBecomeMember
                      ? { background: '#e1fd6a', color: '#000000' }
                      : { background: '#e1fd6a', color: '#000000' }
                  }
                >
                  <Plus className="w-4 h-4" />
                  <span>{label}</span>
                </button>
              );
            })()}
        </div>
      </div>

      {/* Stats - single card carousel on mobile, grid on larger screens */}
      <div className="sm:hidden">
        <div className="relative">
          {/* Total */}
          {carouselIndex === 0 && (
            <div className="professional-card p-4 text-center rounded-xl relative">
              <button
                type="button"
                className="absolute left-1.5 top-1/2 -translate-y-1/2 p-1"
                onClick={() => setCarouselIndex((i) => (i - 1 + 5) % 5)}
                aria-label="Previous stat"
              >
                <ChevronLeft className="w-5 h-5 text-black dark:text-white" style={{ color: 'inherit' }} />
              </button>
              <button
                type="button"
                className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1"
                onClick={() => setCarouselIndex((i) => (i + 1) % 5)}
                aria-label="Next stat"
              >
                <ChevronRight className="w-5 h-5 text-black dark:text-white" style={{ color: 'inherit' }} />
              </button>
              <div className="text-xl font-bold text-white">{proposalStats.total}</div>
              <div className="text-sm text-gray-400">Total</div>
            </div>
          )}
          {/* Active */}
          {carouselIndex === 1 && (
            <div className="professional-card p-4 text-center rounded-xl relative">
              <button
                type="button"
                className="absolute left-1.5 top-1/2 -translate-y-1/2 p-1"
                onClick={() => setCarouselIndex((i) => (i - 1 + 5) % 5)}
                aria-label="Previous stat"
              >
                <ChevronLeft className="w-5 h-5 text-black dark:text-white" style={{ color: 'inherit' }} />
              </button>
              <button
                type="button"
                className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1"
                onClick={() => setCarouselIndex((i) => (i + 1) % 5)}
                aria-label="Next stat"
              >
                <ChevronRight className="w-5 h-5 text-black dark:text-white" style={{ color: 'inherit' }} />
              </button>
              <div className="text-xl font-bold text-white">{proposalStats.active}</div>
              <div className="text-sm text-gray-400">Active</div>
            </div>
          )}
          {/* Passed */}
          {carouselIndex === 2 && (
            <div className="professional-card p-4 text-center rounded-xl relative">
              <button
                type="button"
                className="absolute left-1.5 top-1/2 -translate-y-1/2 p-1"
                onClick={() => setCarouselIndex((i) => (i - 1 + 5) % 5)}
                aria-label="Previous stat"
              >
                <ChevronLeft className="w-5 h-5 text-black dark:text-white" style={{ color: 'inherit' }} />
              </button>
              <button
                type="button"
                className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1"
                onClick={() => setCarouselIndex((i) => (i + 1) % 5)}
                aria-label="Next stat"
              >
                <ChevronRight className="w-5 h-5 text-black dark:text-white" style={{ color: 'inherit' }} />
              </button>
              <div className="text-xl font-bold text-white">{proposalStats.passed}</div>
              <div className="text-sm text-gray-400">Passed</div>
            </div>
          )}
          {/* Rejected */}
          {carouselIndex === 3 && (
            <div className="professional-card p-4 text-center rounded-xl relative">
              <button
                type="button"
                className="absolute left-1.5 top-1/2 -translate-y-1/2 p-1"
                onClick={() => setCarouselIndex((i) => (i - 1 + 5) % 5)}
                aria-label="Previous stat"
              >
                <ChevronLeft className="w-5 h-5 text-black dark:text-white" style={{ color: 'inherit' }} />
              </button>
              <button
                type="button"
                className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1"
                onClick={() => setCarouselIndex((i) => (i + 1) % 5)}
                aria-label="Next stat"
              >
                <ChevronRight className="w-5 h-5 text-black dark:text-white" style={{ color: 'inherit' }} />
              </button>
              <div className="text-xl font-bold text-white">{proposalStats.rejected}</div>
              <div className="text-sm text-gray-400">Rejected</div>
            </div>
          )}
          {/* Executed */}
          {carouselIndex === 4 && (
            <div className="professional-card p-4 text-center rounded-xl relative">
              <button
                type="button"
                className="absolute left-1.5 top-1/2 -translate-y-1/2 p-1"
                onClick={() => setCarouselIndex((i) => (i - 1 + 5) % 5)}
                aria-label="Previous stat"
              >
                <ChevronLeft className="w-5 h-5 text-black dark:text-white" style={{ color: 'inherit' }} />
              </button>
              <button
                type="button"
                className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1"
                onClick={() => setCarouselIndex((i) => (i + 1) % 5)}
                aria-label="Next stat"
              >
                <ChevronRight className="w-5 h-5 text-black dark:text-white" style={{ color: 'inherit' }} />
              </button>
              <div className="text-xl font-bold text-white">{proposalStats.executed}</div>
              <div className="text-sm text-gray-400">Executed</div>
            </div>
          )}
        </div>
      </div>

      {/* Grid for tablets and up */}
      <div className="hidden sm:grid grid-cols-3 md:grid-cols-5 gap-3 sm:gap-4">
        <div className="professional-card p-3 sm:p-4 text-center rounded-xl">
          <div className="text-lg sm:text-xl font-bold text-white">{proposalStats.total}</div>
          <div className="text-xs sm:text-sm text-gray-400">Total</div>
        </div>
        <div className="professional-card p-3 sm:p-4 text-center rounded-xl">
          <div className="text-lg sm:text-xl font-bold text-white">{proposalStats.active}</div>
          <div className="text-xs sm:text-sm text-gray-400">Active</div>
        </div>
        <div className="professional-card p-3 sm:p-4 text-center rounded-xl">
          <div className="text-lg sm:text-xl font-bold text-white">{proposalStats.passed}</div>
          <div className="text-xs sm:text-sm text-gray-400">Passed</div>
        </div>
        <div className="professional-card p-3 sm:p-4 text-center rounded-xl">
          <div className="text-lg sm:text-xl font-bold text-white">{proposalStats.rejected}</div>
          <div className="text-xs sm:text-sm text-gray-400">Rejected</div>
        </div>
        <div className="professional-card p-3 sm:p-4 text-center rounded-xl">
          <div className="text-lg sm:text-xl font-bold text-white">{proposalStats.executed}</div>
          <div className="text-xs sm:text-sm text-gray-400">Executed</div>
        </div>
      </div>


      {/* Create Proposal Inline (non-modal) */}
      {showCreateForm && (
        <div className="professional-card rounded-xl p-6 w-full">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-white">Create New Proposal</h2>
            <button
              onClick={() => setShowCreateForm(false)}
              className="text-gray-400 hover:text-white p-1"
            >
              <XCircle className="w-5 h-5" />
            </button>
                </div>

          {/* Comprehensive Proposal Requirements Notice - themed */}
          <div className="professional-card mb-6 p-4 rounded-xl">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-400 mt-0.5 flex-shrink-0" />
              <div className="space-y-2">
                <h3 className="text-white font-semibold">Important Requirements & Fees</h3>
                <div className="text-sm text-gray-300 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#facc16' }}></span>
                    <span><strong className="text-gray-100">Proposal Fee:</strong> 0.01 MOVE tokens (anti-spam fee)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#facc16' }}></span>
                    <span><strong className="text-gray-100">Gas Fees:</strong> ~0.5 MOVE for transaction</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#facc16' }}></span>
                    <span><strong className="text-gray-100">Cooldown:</strong> 24 hours between proposals</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#facc16' }}></span>
                    <span><strong className="text-gray-100">Total Needed:</strong> At least 0.51 MOVE in wallet</span>
                  </div>
                </div>
                {/* User Wallet Balance Status */}
                <div className="mt-3 p-3 professional-card rounded-lg">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-300">Your Wallet Balance:</span>
                    <div className="flex items-center gap-3">
                      {balanceLoading ? (
                        <span className="text-gray-400 font-mono"></span>
                      ) : (
                        <>
                          <span className={`font-mono font-bold ${
                            (hookWalletBalance || userState?.totalBalance || 0) >= 0.51 ? 'text-green-400' : 'text-red-400'
                          }`}>
                            {(hookWalletBalance || userState?.totalBalance || 0).toFixed(2)} MOVE
                          </span>
                          {(hookWalletBalance || userState?.totalBalance || 0) >= 0.51 ? (
                            <FaCheckCircle className="w-4 h-4 text-green-400" />
                          ) : (
                            <XCircle className="w-4 h-4 text-red-400" />
                          )}
                        </>
                      )}
                    </div>
                  </div>
                  {!balanceLoading && (hookWalletBalance || userState?.totalBalance || 0) < 0.51 && (
                    <div className="mt-2 text-xs text-red-300">
                       Insufficient funds. You need {(0.51 - (hookWalletBalance || userState?.totalBalance || 0)).toFixed(2)} more MOVE.
                    </div>
                  )}
                  {balanceError && (
                    <div className="mt-2 text-xs text-amber-300">
                       Unable to fetch balance: {balanceError}
                    </div>
                  )}
                </div>
                {nextProposalTime && (
                  <div className="mt-3 p-2 bg-red-500/10 border border-red-500/30 rounded">
                    <div className="flex items-center gap-2 text-red-300 text-sm">
                      <Clock className="w-4 h-4" />
                      <span>Next proposal available: {nextProposalTime.toLocaleString()}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
                </div>

          {/* Stake Requirements Info - themed */}
          {stakeRequirements.minStakeToPropose > 0 && (
            <div className="professional-card mb-6 p-4 rounded-xl">
              <h3 className="text-white font-medium mb-2">Proposal Creation Requirements</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                  <span className="text-gray-400">Your Current Stake:</span>
                  <div className={`font-mono font-bold ${
                    stakeRequirements.userCurrentStake >= stakeRequirements.minStakeToPropose 
                      ? 'text-green-400' 
                      : 'text-red-400'
                  }`}>
                    {stakeRequirements.userCurrentStake.toFixed(2)} MOVE
                    </div>
                    </div>
                    <div>
                  <span className="text-gray-400">Required for Proposals:</span>
                  <div className="text-blue-300 font-mono font-bold">
                    {stakeRequirements.minStakeToPropose.toFixed(2)} MOVE
                  </div>
                    </div>
                    <div>
                  <span className="text-gray-400">Status:</span>
                  <div className={`font-medium ${
                    stakeRequirements.isAdmin
                      ? 'text-purple-400'
                      : stakeRequirements.canPropose
                        ? 'text-green-400'
                        : 'text-red-400'
                  }`}>
                    {stakeRequirements.isAdmin 
                      ? 'Admin (No stake required)' 
                      : stakeRequirements.canPropose 
                        ? 'Eligible' 
                        : 'Need more stake'
                    }
                      </div>
                    </div>
                  </div>
              {!stakeRequirements.isAdmin && !stakeRequirements.canPropose && (
                <div className="mt-3 text-sm text-blue-200">
                  💡 You need to stake {(stakeRequirements.minStakeToPropose - stakeRequirements.userCurrentStake).toFixed(2)} more MOVE tokens to create proposals.
                      </div>
                    )}
                  </div>
                )}

          <div className="space-y-6">
              <div>
              <h3 className="text-sm font-semibold text-gray-300 mb-3">Basics</h3>
                <label className="block text-sm font-medium text-white mb-2">Title</label>
                <input
                  type="text"
                  value={newProposal.title}
                  onChange={(e) => setNewProposal({...newProposal, title: e.target.value})}
                  className="professional-input w-full px-3 py-2 rounded-xl text-sm"
                  placeholder="Enter proposal title"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">Description</label>
                <textarea
                  value={newProposal.description}
                  onChange={(e) => setNewProposal({...newProposal, description: e.target.value})}
                  className="professional-input w-full px-3 py-2 rounded-xl text-sm h-24 resize-none"
                  placeholder="Describe your proposal in detail"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">Category</label>
                <select
                  value={newProposal.category}
                  onChange={(e) => setNewProposal({...newProposal, category: e.target.value})}
                  className="professional-input w-full px-3 py-2 rounded-xl text-sm"
                >
                  <option value="general" className="text-white bg-[#121214]" style={{ backgroundColor: '#121214', color: '#ffffff' }}>General</option>
                  <option value="governance" className="text-white bg-[#121214]" style={{ backgroundColor: '#121214', color: '#ffffff' }}>Governance</option>
                  <option value="treasury" className="text-white bg-[#121214]" style={{ backgroundColor: '#121214', color: '#ffffff' }}>Treasury</option>
                  <option value="technical" className="text-white bg-[#121214]" style={{ backgroundColor: '#121214', color: '#ffffff' }}>Technical</option>
                  <option value="community" className="text-white bg-[#121214]" style={{ backgroundColor: '#121214', color: '#ffffff' }}>Community</option>
                </select>
              </div>

            <div className={`grid grid-cols-1 gap-4 ${
              sidebarCollapsed ? 'md:grid-cols-2' : 'md:grid-cols-1'
            }`}>
                <div>
                <h3 className="text-sm font-semibold text-gray-300 mb-3">Voting Schedule</h3>
                <label className="block text-sm font-medium text-white mb-2">Start Time</label>
                  <input
                  type="datetime-local"
                  value={newProposal.startTime}
                  onChange={(e) => setNewProposal({...newProposal, startTime: e.target.value})}
                    className="professional-input w-full px-3 py-2 rounded-xl text-sm"
                  min={new Date().toISOString().slice(0, 16)}
                  />
                </div>

                <div>
                <label className="block text-sm font-medium text-white mb-2">End Time</label>
                <input
                  type="datetime-local"
                  value={newProposal.endTime}
                  onChange={(e) => setNewProposal({...newProposal, endTime: e.target.value})}
                  className="professional-input w-full px-3 py-2 rounded-xl text-sm"
                  min={newProposal.startTime || new Date().toISOString().slice(0, 16)}
                />
              </div>
            </div>

            <div className={`grid grid-cols-1 gap-4 ${
              sidebarCollapsed ? 'md:grid-cols-2' : 'md:grid-cols-1'
            }`}>
              <div>
                <h3 className="text-sm font-semibold text-gray-300 mb-3">Governance Parameters</h3>
                <label className="block text-sm font-medium text-white mb-2">Minimum Quorum (%)</label>
                  <input
                    type="number"
                    value={newProposal.minQuorum}
                  onChange={(e) => setNewProposal({...newProposal, minQuorum: parseFloat(e.target.value) || 0})}
                    className="professional-input w-full px-3 py-2 rounded-xl text-sm"
                  placeholder="e.g., 25"
                    min="1"
                    max="100"
                  />
                </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">Execution Window (days)</label>
                <input
                  type="number"
                  value={newProposal.executionWindow}
                  onChange={(e) => setNewProposal({...newProposal, executionWindow: parseInt(e.target.value) || 7})}
                  className="professional-input w-full px-3 py-2 rounded-xl text-sm"
                  placeholder="e.g., 7"
                  min="1"
                  max="365"
                />
              </div>
              </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={handleCreateProposal}
                disabled={isCreating || !newProposal.title || !newProposal.description || !newProposal.startTime || !newProposal.endTime}
                className="px-6 py-2 rounded-xl text-sm font-semibold transition-all"
                style={{
                  backgroundColor: (isCreating || !newProposal.title || !newProposal.description || !newProposal.startTime || !newProposal.endTime) ? '#facc1660' : '#facc16',
                  color: '#0f172a',
                  cursor: (isCreating || !newProposal.title || !newProposal.description || !newProposal.startTime || !newProposal.endTime) ? 'not-allowed' : 'pointer'
                }}
              >
                {isCreating ? 'Creating...' : 'Create Proposal'}
              </button>
              <button
                onClick={() => setShowCreateForm(false)}
                className="px-5 py-2 rounded-xl text-sm font-semibold bg-white/10 text-gray-300 hover:bg-white/15 border border-white/15"
              >
                Cancel
              </button>
            </div>
            </div>
          </div>
      )}

      {/* Proposals List (compact rows) */}
      {sectionLoader.isLoading && proposals.length === 0 ? (
        <div></div>
      ) : filteredProposals.length === 0 ? (
        <div className="text-center py-12">
          {proposals.length > 0 ? (
            // When cached proposals exist but filter yields none, keep the area compact without the big empty-state
            <p className="text-gray-400">No results match your filters.</p>
          ) : (
            <>
              <h3 className="text-lg font-medium text-white mb-2">No proposals found</h3>
              <p className="text-gray-400 mb-4">
                This DAO has no proposals yet. Be the first to create one!
              </p>
            </>
          )}
        </div>
      ) : (
        <div className="professional-card rounded-xl p-0 overflow-hidden">
          <div className="divide-y divide-white/10">
            {filteredProposals.map((proposal) => (
              <div
                key={proposal.id}
                className="p-4 hover:bg-white/5 transition-all cursor-pointer"
                onClick={() => {
                  setSelectedProposal(proposal);
                  try { localStorage.setItem(`dao_${dao.id}_selected_proposal_id`, proposal.id); } catch {}
                }}
              >
                <div className="flex flex-col gap-3">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2 sm:gap-4 min-w-0">
                      <span className="text-xs sm:text-sm font-mono text-gray-400 w-16 shrink-0">{formatProposalId(proposal.id)}</span>
                      <Pill className={`${getStatusColor(proposal.status)} border-0 shrink-0`} icon={getStatusIcon(proposal.status)}>
                        <span className="capitalize">{proposal.status}</span>
                      </Pill>
                      <h3 className="text-white font-medium break-words text-sm sm:text-base">{proposal.title}</h3>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-3 sm:self-auto self-start">
                      {/* Finalize button for active proposals that have ended (Admin only) */}
                      {proposal.needsFinalization && userStatus.isAdmin && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleFinalizeProposal(proposal.id);
                          }}
                          className="px-3 py-1 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-xs font-medium transition-all"
                          title="Finalize proposal - voting period has ended"
                        >
                          Finalize
                        </button>
                      )}
                      {/* Status text for non-admins when proposal needs finalization */}
                      {proposal.needsFinalization && !userStatus.isAdmin && (
                        <span className="px-3 py-1 bg-gray-600/20 text-gray-300 rounded-lg text-xs font-medium border border-gray-600/30">
                          Awaiting finalization
                        </span>
                      )}
                      {/* Activation button for draft proposals */}
                      {proposal.needsActivation && (proposal.proposer === account?.address || userStatus.isAdmin) && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStartVoting(proposal.id);
                          }}
                          className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium transition-all"
                          title="Start voting for this proposal"
                        >
                          Start Voting
                        </button>
                      )}
                    <span className="text-xs sm:text-sm text-gray-400 whitespace-nowrap">{formatShortDate(proposal.created || proposal.votingEnd)}</span>
                    </div>
                  </div>

                  {/* Quorum Progress Bar */}
                  <div className="w-full">
                    <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
                      <span>Quorum Progress</span>
                      <span>{proposal.quorumCurrent.toFixed(1)}% / {proposal.quorumRequired.toFixed(1)}%</span>
                    </div>
                    <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{
                          width: `${Math.min((proposal.quorumCurrent / Math.max(proposal.quorumRequired, 0.001)) * 100, 100)}%`,
                          backgroundColor: '#facc16'
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        )}
        </>
      )}
      </div>
    </div>
  );
};

export default DAOProposals;
