import React, { useState, useEffect, useRef } from 'react';
import { useSectionLoader } from '../../hooks/useSectionLoader';
import { Users, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
import { Member } from '../../types/dao';
import { DAO } from '../../types/dao';
import { useWallet } from '../../contexts/CedraWalletProvider';
import { cedraClient } from '../../cedra_service/cedra-client';
import { MODULE_ADDRESS } from '../../cedra_service/constants';
import { safeView, safeGetModuleEventsByEventType } from '../../utils/rpcUtils';
import { useGetProfile } from '../../useServices/useProfile';
import MemberProfileCard from '../MemberProfileCard';
import LockedFeatureOverlay from '../LockedFeatureOverlay';
import { useTradePortKeys } from '../../useServices/useTradePortKeys';

interface DAOMembersProps {
  dao: DAO;
}

// Member Avatar Component with Profile Image - Clickable
const MemberAvatar: React.FC<{
  address: string;
  shortAddress: string;
  onClick: (ref: React.RefObject<HTMLDivElement>) => void;
}> = ({ address, shortAddress, onClick }) => {
  const { data: profileData } = useGetProfile(address || null);
  const avatarRef = useRef<HTMLDivElement>(null);

  const content = profileData?.avatarUrl ? (
    <img
      src={profileData.avatarUrl}
      alt={profileData.displayName || shortAddress}
      className="w-8 h-8 rounded-lg object-cover cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all"
      loading="lazy"
      decoding="async"
      onError={(e) => {
        e.currentTarget.style.display = 'none';
        const fallback = e.currentTarget.nextElementSibling as HTMLElement;
        if (fallback) fallback.classList.remove('hidden');
      }}
    />
  ) : (
    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all" style={{ backgroundColor: '#e1ff62', color: '#000000' }}>
      {shortAddress.slice(2, 4).toUpperCase()}
    </div>
  );

  return (
    <div ref={avatarRef} onClick={() => onClick(avatarRef)}>
      {content}
    </div>
  );
};

const DAOMembers: React.FC<DAOMembersProps> = ({ dao }) => {
  // In-memory caches to keep member data stable between tab switches
  // Session TTL for instant returns and SWR background refresh
  const SESSION_TTL_MS = 5 * 60 * 1000; // 5 minutes
  const MAX_STALE_MS = 10 * 60 * 1000; // 10 minutes stale window
  // @ts-ignore - module-level singleton caches
  const membersCache: Map<string, { members: Member[]; timestamp: number }> = (window as any).__membersCache || ((window as any).__membersCache = new Map());
  // @ts-ignore
  const summaryCache: Map<string, { summary: any; timestamp: number }> = (window as any).__membersSummaryCache || ((window as any).__membersSummaryCache = new Map());
  const [membershipData, setMembershipData] = useState({
    totalMembers: 0,
    totalStakers: 0,
    totalStaked: 0,
    minStakeRequired: 1.0, // Default to 1 MOVE minimum
    minProposalStake: 6.0, // Default to 6 MOVE for proposals
    userIsMember: false,
    userStake: 0
  });
  const [actualMembers, setActualMembers] = useState<Member[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMembers, setIsLoadingMembers] = useState(true);
  const sectionLoader = useSectionLoader();

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const MEMBERS_PER_PAGE = 10;

  // Profile card popup state
  const [selectedMember, setSelectedMember] = useState<{ address: string; shortAddress: string; memberNumber: number; ref: React.RefObject<HTMLDivElement> } | null>(null);
  const [isProfileCardOpen, setIsProfileCardOpen] = useState(false);

  const handleAvatarClick = (member: Member, memberNumber: number, ref: React.RefObject<HTMLDivElement>) => {
    setSelectedMember({ address: member.address, shortAddress: member.shortAddress, memberNumber, ref });
    setIsProfileCardOpen(true);
  };

  const { account, signAndSubmitTransaction } = useWallet();

  // Check if user owns the Holders Tab Key NFT
  const { data: tradePortKeysData, isLoading: isCheckingNFT } = useTradePortKeys(account?.address);

  // Sticky lock: default to locked while checking, only unlock when explicitly confirmed
  const [isLocked, setIsLocked] = useState<boolean>(true);
  useEffect(() => {
    // If no wallet, keep locked
    if (!account?.address) {
      setIsLocked(true);
      return;
    }
    // When check completes with a definitive answer, update lock state
    if (!isCheckingNFT && typeof tradePortKeysData?.hasNFT === 'boolean') {
      setIsLocked(!tradePortKeysData.hasNFT);
    }
    // While loading, keep previous state (locked by default) to avoid flicker on tab switches
  }, [account?.address, isCheckingNFT, tradePortKeysData?.hasNFT]);
  const OCTAS = 1e8;
  const toMOVE = (u64: number): number => u64 / OCTAS;

  // Format totals with dynamic units (no misleading 0.0K)
  const formatCompact = (amount: number): string => {
    if (!Number.isFinite(amount)) return '0';
    if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)}M`;
    if (amount >= 1_000) return `${(amount / 1_000).toFixed(1)}K`;
    if (amount >= 1) return amount.toFixed(0);
    return amount.toFixed(2);
  };

  const fetchActualMembers = async () => {
    try {
      setIsLoadingMembers(true);
      const candidateAddresses = new Set<string>();

      // Query staking events to gather staker addresses for THIS DAO (they include movedao_addrx)
      const stakeType = `${MODULE_ADDRESS}::staking::StakeEvent` as `${string}::${string}::${string}`;
      const unstakeType = `${MODULE_ADDRESS}::staking::UnstakeEvent` as `${string}::${string}::${string}`;

      // Prefer module-level events (widely available), then filter by dao id
      const [stakeEvents, unstakeEvents] = await Promise.all([
        safeGetModuleEventsByEventType({ eventType: stakeType, options: { limit: 100 } }).catch(() => []),
        safeGetModuleEventsByEventType({ eventType: unstakeType, options: { limit: 100 } }).catch(() => []),
      ]);

      const pushIfForDAO = (ev: any) => {
        const d = ev?.data || {};
        if ((d.movedao_addrx || d.dao_address) === dao.id && typeof d.staker === 'string') {
          candidateAddresses.add(d.staker);
        }
      };

      (stakeEvents as any[]).forEach(pushIfForDAO);
      (unstakeEvents as any[]).forEach(pushIfForDAO);

      // Include the connected account if present, to reflect immediate membership
      if (account?.address) candidateAddresses.add(account.address);

      // Validate membership and fetch stake per candidate (optimized for maximum speed)
      const addresses = Array.from(candidateAddresses);
      const batchSize = 30; // Much larger batch size for faster loading
      const collected: Member[] = [];

      for (let i = 0; i < addresses.length; i += batchSize) {
        const batch = addresses.slice(i, i + batchSize);
        const batchPromises = batch.map(async (addr) => {
          try {
            const [isMemberRes, stakeRes] = await Promise.all([
              safeView({ function: `${MODULE_ADDRESS}::membership::is_member`, functionArguments: [dao.id, addr] }).catch(() => [false]),
              safeView({ function: `${MODULE_ADDRESS}::staking::get_dao_stake_direct`, functionArguments: [dao.id, addr] }).catch(() => [0]),
            ]);
            const isMember = Boolean(isMemberRes?.[0]);
            const stakeAmount = toMOVE(Number(stakeRes?.[0] || 0));
            if (isMember && stakeAmount > 0) {
              const member: Member = {
                id: addr,
                address: addr,
                shortAddress: `${addr.slice(0, 6)}...${addr.slice(-4)}`,
                votingPower: stakeAmount,
                tokensHeld: stakeAmount,
                joinDate: '-',
                isActive: true,
              };
              collected.push(member);
            }
          } catch (e) {
            // Ignore individual failures
          }
        });
        await Promise.allSettled(batchPromises);
        // No delay between batches for maximum speed
      }

      // Deduplicate by address
      const unique = new Map<string, Member>();
      collected.forEach((m) => unique.set(m.address, m));
      const members = Array.from(unique.values()).sort((a, b) => a.address.localeCompare(b.address));
      
      setActualMembers(members);
      // Save to cache
      membersCache.set(dao.id, { members, timestamp: Date.now() });
    } catch (error) {
      console.error('Failed to fetch actual members:', error);
      setActualMembers([]);
    } finally {
      setIsLoadingMembers(false);
    }
  };

  const fetchMembershipData = async () => {
    try {
      setIsLoading(true);
      
      // Fetch DAO membership statistics
      const [
        totalMembersRes,
        totalStakedRes,
        minStakeRes,
        minProposalStakeRes
      ] = await Promise.all([
        safeView({ function: `${MODULE_ADDRESS}::membership::total_members`, functionArguments: [dao.id] }).catch(() => [0]),
        safeView({ function: `${MODULE_ADDRESS}::staking::get_total_staked`, functionArguments: [dao.id] }).catch(() => [0]),
        safeView({ function: `${MODULE_ADDRESS}::membership::get_min_stake`, functionArguments: [dao.id] }).catch(() => [0]),
        safeView({ function: `${MODULE_ADDRESS}::membership::get_min_proposal_stake`, functionArguments: [dao.id] }).catch(() => [0])
      ]);

      // Note: get_staker_count is not a view function, so we use total_members as a proxy
      // since members need to stake to join. In most cases, members = stakers
      const totalStakersRes = totalMembersRes;

      // Check current user's membership status and stake
      let userIsMember = false;
      let userStake = 0;
      
      if (account?.address) {
        try {
          const [isMemberRes, userStakeRes] = await Promise.all([
            safeView({ function: `${MODULE_ADDRESS}::membership::is_member`, functionArguments: [dao.id, account.address] }),
            safeView({ function: `${MODULE_ADDRESS}::staking::get_dao_staked_balance`, functionArguments: [dao.id, account.address] })
          ]);
          userIsMember = Boolean(isMemberRes[0]);
          userStake = toMOVE(Number(userStakeRes[0] || 0));
        } catch (e) {
          console.warn('Failed to fetch user membership data:', e);
        }
      }

      // Handle min stake conversion - if it's 0 or very small, use a reasonable default
      const rawMinStake = Number(minStakeRes[0] || 0);
      const minStakeInMOVE = rawMinStake > 0 ? toMOVE(rawMinStake) : 1.0; // Default to 1 MOVE if not set or too small
      
      const rawMinProposalStake = Number(minProposalStakeRes[0] || 0);
      const minProposalStakeInMOVE = rawMinProposalStake > 0 ? toMOVE(rawMinProposalStake) : 6.0; // Default to 6 MOVE if not set
      
      const summary = {
        totalMembers: Number(totalMembersRes[0] || 0),
        totalStakers: Number(totalStakersRes[0] || 0),
        totalStaked: toMOVE(Number(totalStakedRes[0] || 0)),
        minStakeRequired: minStakeInMOVE,
        minProposalStake: minProposalStakeInMOVE,
        userIsMember,
        userStake
      };
      setMembershipData(summary);
      // Save to cache
      summaryCache.set(dao.id, { summary, timestamp: Date.now() });
      
    } catch (error) {
      console.error('Failed to fetch membership data:', error);
      // Set reasonable defaults when API calls fail (rate limiting, network issues, etc.)
      setMembershipData(prev => ({
        ...prev,
        minStakeRequired: prev.minStakeRequired || 1.0, // Default to 1 MOVE
        minProposalStake: prev.minProposalStake || 6.0, // Default to 6 MOVE
        totalMembers: prev.totalMembers || 0,
        totalStakers: prev.totalStakers || 0,
        totalStaked: prev.totalStaked || 0,
        userIsMember: prev.userIsMember || false,
        userStake: prev.userStake || 0
      }));
    } finally {
      setIsLoading(false);
    }
  };

  const [isLeaving, setIsLeaving] = useState(false);
  const handleLeaveDAO = async () => {
    if (!account || !signAndSubmitTransaction) return;
    try {
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
      await Promise.all([fetchMembershipData(), fetchActualMembers()]);
      alert(`You have left ${dao.name}.`);
    } catch (e: any) {
      const msg = String(e?.message || e || 'Failed to leave DAO');
      alert(msg.includes('User rejected') ? 'Transaction cancelled' : `Leave failed: ${msg}`);
    } finally {
      setIsLeaving(false);
    }
  };

  useEffect(() => {
    const now = Date.now();
    // Reset page when DAO changes
    setCurrentPage(1);

    const cachedMembers = membersCache.get(dao.id);
    const cachedSummary = summaryCache.get(dao.id);

    // Fresh session cache: hydrate instantly, no loader, no immediate fetch
    if (cachedMembers && now - cachedMembers.timestamp < SESSION_TTL_MS) {
      setActualMembers(cachedMembers.members);
      setIsLoadingMembers(false);
    }
    if (cachedSummary && now - cachedSummary.timestamp < SESSION_TTL_MS) {
      setMembershipData(cachedSummary.summary);
      setIsLoading(false);
    }

    // Stale but acceptable: show cached and refresh silently in background
    const isMembersStaleButAcceptable = cachedMembers && (now - cachedMembers.timestamp) >= SESSION_TTL_MS && (now - cachedMembers.timestamp) < MAX_STALE_MS;
    const isSummaryStaleButAcceptable = cachedSummary && (now - cachedSummary.timestamp) >= SESSION_TTL_MS && (now - cachedSummary.timestamp) < MAX_STALE_MS;
    if (isMembersStaleButAcceptable || isSummaryStaleButAcceptable) {
      if (cachedMembers) {
        setActualMembers(cachedMembers.members);
        setIsLoadingMembers(false);
      }
      if (cachedSummary) {
        setMembershipData(cachedSummary.summary);
        setIsLoading(false);
      }
      (async () => {
        try {
          await Promise.all([fetchMembershipData(), fetchActualMembers()]);
        } catch {}
      })();
      return;
    }

    // No cache or too old: show loader and fetch
    if (!cachedMembers || !cachedSummary ||
        (cachedMembers && now - cachedMembers.timestamp >= MAX_STALE_MS) ||
        (cachedSummary && now - cachedSummary.timestamp >= MAX_STALE_MS)) {
      sectionLoader.executeWithLoader(async () => {
        await Promise.all([fetchMembershipData(), fetchActualMembers()]);
      });
    }
  }, [dao.id]); // Fetch on DAO change only; cache keeps view instant between tabs

  // Silent refresh on window focus if cache is stale
  useEffect(() => {
    const onFocus = () => {
      const now = Date.now();
      const cachedMembers = membersCache.get(dao.id);
      const cachedSummary = summaryCache.get(dao.id);
      const membersStale = !cachedMembers || (now - cachedMembers.timestamp) >= SESSION_TTL_MS;
      const summaryStale = !cachedSummary || (now - cachedSummary.timestamp) >= SESSION_TTL_MS;
      if ((membersStale || summaryStale) && (!cachedMembers || now - (cachedMembers?.timestamp || 0) < MAX_STALE_MS)) {
        (async () => {
          try {
            await Promise.all([fetchMembershipData(), fetchActualMembers()]);
          } catch {}
        })();
      }
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [dao.id]);

  // Use actual members fetched from the blockchain
  const members = actualMembers;
  const filteredMembers = members; // No filtering since search was removed

  // Pagination logic
  const totalMembers = filteredMembers.length;
  const totalPages = Math.ceil(totalMembers / MEMBERS_PER_PAGE);
  const startIndex = (currentPage - 1) * MEMBERS_PER_PAGE;
  const endIndex = startIndex + MEMBERS_PER_PAGE;
  const paginatedMembers = filteredMembers.slice(startIndex, endIndex);

  const totalVotingPower = members.reduce((sum, member) => sum + member.votingPower, 0);
  const activeMembers = members.filter(m => m.isActive).length;

  return (
    <div className="w-full px-2 sm:px-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between pl-4 sm:pl-8 xl:pl-0">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">Members</h2>
        </div>
        <div className="text-right">
          {sectionLoader.error && (
            <div className="text-xs text-red-300">Error loading members</div>
          )}
        </div>
      </div>


      {/* Stats removed per request */}

      {/* Member Directory */}
      <div className="border border-white/5 rounded-xl p-4 w-full max-w-full overflow-hidden relative min-h-[600px]">
        {/* Locked Feature Overlay */}
        <LockedFeatureOverlay
          title="Locked Feature"
          description="You must hold a Holders Tab Key NFT to unlock + view the holders stats"
          showOverlay={isLocked}
        />

        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <div className="flex items-center gap-2">
            <h3 className="text-sm sm:text-base md:text-lg font-semibold text-white flex items-center gap-2">
              <Users className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
              <span className="truncate">Member Directory</span>
              {filteredMembers.length > 0 && (
                <span className="text-xs sm:text-sm text-white hidden sm:inline">({filteredMembers.length})</span>
              )}
            </h3>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => {
                fetchMembershipData();
                fetchActualMembers();
              }}
              disabled={isLoading || isLoadingMembers}
              className="p-2 text-[#e1fd6a] hover:text-[#e1fd6a]/80 hover:bg-white/5 rounded-lg transition-all disabled:opacity-50"
              title="Refresh member data"
            >
              <RefreshCw className={`w-4 h-4 ${(isLoading || isLoadingMembers) ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Desktop Table View */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left py-4 px-4 font-medium text-white">Member</th>
                <th className="text-left py-4 px-4 font-medium text-white">Staked</th>
                <th className="text-left py-4 px-4 font-medium text-white">Status</th>
                <th className="text-left py-4 px-4 font-medium text-white">Time</th>
              </tr>
            </thead>
            <tbody>
              {paginatedMembers.length === 0 ? (
                sectionLoader.isLoading ? null : (
                <tr>
                  <td colSpan={4} className="py-8 px-4 text-center">
                    <Users className="w-12 h-12 text-gray-500 mx-auto mb-3" />
                    <p className="text-white text-sm">No members found</p>
                    <p className="text-gray-500 text-xs mt-1">
                      {membershipData.totalMembers > 0
                        ? 'Try adjusting your search'
                        : 'No registered members yet'}
                    </p>
                  </td>
                </tr>
                )
              ) : (
                paginatedMembers.map((member, index) => (
                <tr key={member.id} className="border-b border-white/5 hover:bg-white/5 transition-all">
                  <td className="py-4 px-4">
                    <MemberAvatar
                      address={member.address}
                      shortAddress={member.shortAddress}
                      onClick={(ref) => handleAvatarClick(member, startIndex + index + 1, ref)}
                    />
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center space-x-1">
                      <span className="text-sm text-white font-medium">{member.tokensHeld.toFixed(3)}</span>
                      <img
                        src="https://ipfs.io/ipfs/QmUv8RVdgo6cVQzh7kxerWLatDUt4rCEFoCTkCVLuMAa27"
                        alt="MOVE"
                        className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                          if (fallback) fallback.classList.remove('hidden');
                        }}
                      />
                      <span className="hidden">MOVE</span>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <span className={`px-2 py-1 rounded-full text-xs border ${
                      member.isActive 
                        ? 'text-green-400 border-green-500/30 bg-green-500/10' 
                        : 'text-gray-400 border-gray-500/30 bg-gray-500/10'
                    }`}>
                      {member.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center space-x-1 text-white">
                      <span className="text-xs">{new Date().toLocaleDateString()}</span>
                    </div>
                  </td>
                </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="sm:hidden">
          {paginatedMembers.length === 0 ? (
            sectionLoader.isLoading ? null : (
            <div className="text-center py-8">
              <Users className="w-12 h-12 text-gray-500 mx-auto mb-3" />
              <p className="text-white text-sm">No members found</p>
              <p className="text-gray-500 text-xs mt-1">
                {membershipData.totalMembers > 0
                  ? 'Try adjusting your search'
                  : 'No registered members yet'}
              </p>
            </div>
            )
          ) : (
            <div className="space-y-1.5">
              {paginatedMembers.map((member, index) => (
                <div
                  key={member.id}
                  className="rounded-lg p-2.5 hover:bg-white/5 transition-all border-b border-white/5 last:border-b-0"
                >
                  <div className="flex items-center justify-between">
                    <MemberAvatar
                      address={member.address}
                      shortAddress={member.shortAddress}
                      onClick={(ref) => handleAvatarClick(member, startIndex + index + 1, ref)}
                    />
                    <div className="flex items-center gap-3">
                      <div className="flex items-center space-x-1">
                        <span className="text-sm font-medium text-white">{member.tokensHeld.toFixed(3)}</span>
                        <img
                          src="https://ipfs.io/ipfs/QmUv8RVdgo6cVQzh7kxerWLatDUt4rCEFoCTkCVLuMAa27"
                          alt="MOVE"
                          className="w-3 h-3 flex-shrink-0"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                            if (fallback) fallback.classList.remove('hidden');
                          }}
                        />
                        <span className="hidden">MOVE</span>
                      </div>
                      <span className={`px-1.5 py-0.5 rounded-full text-[10px] border flex-shrink-0 ${
                        member.isActive
                          ? 'text-green-400 border-green-500/30 bg-green-500/10'
                          : 'text-gray-400 border-gray-500/30 bg-gray-500/10'
                      }`}>
                        {member.isActive ? 'Active' : 'Inactive'}
                      </span>
                      <span className="text-xs text-white">{new Date().toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pagination Controls */}
        {totalMembers > MEMBERS_PER_PAGE && (
          <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-4">
            <div className="text-sm text-white">
              Showing {startIndex + 1} to {Math.min(endIndex, totalMembers)} of {totalMembers} members
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="flex items-center gap-1 px-3 py-1.5 text-sm text-white hover:text-white hover:bg-white/5 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Previous</span>
              </button>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="flex items-center gap-1 px-3 py-1.5 text-sm text-white hover:text-white hover:bg-white/5 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span>Next</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Member Profile Card Popup */}
      {selectedMember && (
        <MemberProfileCard
          address={selectedMember.address}
          shortAddress={selectedMember.shortAddress}
          memberNumber={selectedMember.memberNumber}
          isOpen={isProfileCardOpen}
          onClose={() => setIsProfileCardOpen(false)}
          anchorRef={selectedMember.ref}
        />
      )}
    </div>
  );
};

export default DAOMembers;