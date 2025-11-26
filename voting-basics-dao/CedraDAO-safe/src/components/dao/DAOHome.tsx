import React, { useState, useEffect, useRef } from 'react';
import { Calendar, DollarSign, Users, Info, Activity, TrendingUp, Shield, Zap } from 'lucide-react';
import { DAO } from '../../types/dao';
import { useDAOActivities } from '../../useServices/useOptimizedActivityTracker';
import OptimizedActivityTable from '../OptimizedActivityTable';
import { cedraClient } from '../../cedra_service/cedra-client';
import { MODULE_ADDRESS } from '../../cedra_service/constants';
import { safeView } from '../../utils/rpcUtils';
import { ACTIVITY_CONFIG } from '../../constants/activityConstants';
import { useGetProfile } from '../../useServices/useProfile';
import { truncateAddress } from '../../utils/addressUtils';
import { useSectionLoader } from '../../hooks/useSectionLoader';
import SectionLoader from '../common/SectionLoader';
import MemberProfileCard from '../MemberProfileCard';

// Admin Display with Member-style avatar + lazy image + clickable profile card
const AdminDisplay: React.FC<{ address: string; onClick: (ref: React.RefObject<HTMLDivElement>, shortAddress: string) => void }>
  = ({ address, onClick }) => {
  const { data: profileData } = useGetProfile(address || null);
  const avatarRef = useRef<HTMLDivElement>(null);
  const shortAddress = `${address.slice(0, 6)}...${address.slice(-4)}`;

  const avatar = profileData?.avatarUrl ? (
    <img
      src={profileData.avatarUrl}
      alt={profileData.displayName || shortAddress}
      className="w-8 h-8 rounded-lg object-cover"
      loading="lazy"
      decoding="async"
      onError={(e) => {
        e.currentTarget.style.display = 'none';
        const fallback = e.currentTarget.nextElementSibling as HTMLElement;
        if (fallback) fallback.classList.remove('hidden');
      }}
    />
  ) : (
    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold" style={{ background: '#e1fd6a', color: '#000000' }}>
      {shortAddress.slice(2, 4).toUpperCase()}
    </div>
  );

  return (
    <div ref={avatarRef} className="flex items-center space-x-3 cursor-pointer" onClick={() => onClick(avatarRef, shortAddress)}>
      {avatar}
      {/* Hidden fallback holder to be revealed by onError above */}
      <div className="hidden w-8 h-8 rounded-lg" style={{ background: '#e1fd6a', color: '#000000' }} />
      <div className="flex flex-col">
        <span className="text-sm font-semibold text-white">
          {profileData?.displayName || shortAddress}
        </span>
        <span className="text-xs text-gray-400 font-mono">
          {truncateAddress(address)}
        </span>
      </div>
    </div>
  );
};

interface DAOHomeProps {
  dao: DAO;
}

const DAOHome: React.FC<DAOHomeProps> = ({ dao }) => {
  const [fullAdminAddress, setFullAdminAddress] = useState<string>('');
  const [treasuryBalance, setTreasuryBalance] = useState<string>('0.00');

  // Section loader for Overview tab
  const sectionLoader = useSectionLoader();

  const [page, setPage] = useState<number>(1);
  const PAGE_LIMIT = 10;

  // Profile card popup state (reused from Members behavior)
  const [selectedMember, setSelectedMember] = useState<{ address: string; shortAddress: string; ref: React.RefObject<HTMLDivElement> } | null>(null);
  const [isProfileCardOpen, setIsProfileCardOpen] = useState(false);

  const handleAvatarClick = (ref: React.RefObject<HTMLDivElement>, shortAddress: string) => {
    if (!fullAdminAddress) return;
    setSelectedMember({ address: fullAdminAddress, shortAddress, ref });
    setIsProfileCardOpen(true);
  };

  const { 
    activities, 
    isLoading, 
    error, 
    pagination,
    refetch
  } = useDAOActivities(dao.id, {
    limit: PAGE_LIMIT,
    page
  });

  // Fetch treasury balance from contract - professional cached approach
  const fetchTreasuryBalance = async () => {
    try {
      let balance = 0;
      let treasuryObject: any = null;

      // Step 1: Try to get treasury object first (modern DAOs) - with caching
      try {
        const objectResult = await safeView({
          function: `${MODULE_ADDRESS}::dao_core_file::get_treasury_object`,
          functionArguments: [dao.id]
        }, `treasury_object_${dao.id}`);
        treasuryObject = (objectResult as any)?.[0];
      } catch (error) {
        // Silent fallback to legacy method
      }

      // Step 2: If treasury object exists, get balance from it - with caching
      if (treasuryObject) {
        try {
          // Use the raw treasury object directly (it's already in the correct Object<Treasury> format)
          // Try comprehensive treasury info first - with caching
          try {
            const infoRes = await safeView({
              function: `${MODULE_ADDRESS}::treasury::get_treasury_info`,
              functionArguments: [treasuryObject]
            }, `treasury_info_${dao.id}`);
            if (Array.isArray(infoRes) && infoRes.length >= 1) {
              balance = Number(infoRes[0] || 0) / 1e8;
            }
          } catch (infoError: any) {
            // Fallback to direct object balance - with caching
            try {
              const balanceResult = await safeView({
                function: `${MODULE_ADDRESS}::treasury::get_balance_from_object`,
                functionArguments: [treasuryObject]
              }, `treasury_balance_obj_${dao.id}`);
              balance = Number(balanceResult[0] || 0) / 1e8;
            } catch (balError: any) {
              // Silent fallback to legacy
            }
          }
        } catch (objError: any) {
          // Silent fallback to legacy
        }
      }

      // Step 3: Fallback to legacy balance if no object approach worked - with caching
      if (balance === 0) {
        try {
          const balanceResult = await safeView({
            function: `${MODULE_ADDRESS}::treasury::get_balance`,
            functionArguments: [dao.id]
          }, `treasury_balance_legacy_${dao.id}`);

          if (balanceResult && Array.isArray(balanceResult) && balanceResult.length > 0) {
            balance = Number(balanceResult[0] || 0) / 1e8;
          }
        } catch (legacyError) {
          // Silent - will show 0 balance
        }
      }

      setTreasuryBalance(balance.toFixed(2));
      // Update session cache
      const existing = (window as any).__overviewCache?.get?.(dao.id) || {};
      // @ts-ignore
      const cacheMap: Map<string, any> = (window as any).__overviewCache || ((window as any).__overviewCache = new Map());
      cacheMap.set(dao.id, {
        admin: existing.admin || fullAdminAddress,
        treasuryBalance: balance.toFixed(2),
        timestamp: Date.now(),
      });
    } catch (error: any) {
      setTreasuryBalance('0.00');
    }
  };

  // Fetch admin address based on contract behavior
  useEffect(() => {
    const SESSION_TTL_MS = 5 * 60 * 1000;
    const MAX_STALE_MS = 10 * 60 * 1000;
    // Try session cache for instant tab switches
    // @ts-ignore
    const cacheMap: Map<string, any> = (window as any).__overviewCache || ((window as any).__overviewCache = new Map());
    const cached = cacheMap.get(dao.id);
    const now = Date.now();
    if (cached && (now - cached.timestamp) < SESSION_TTL_MS) {
      if (cached.admin) setFullAdminAddress(cached.admin);
      if (cached.treasuryBalance) setTreasuryBalance(cached.treasuryBalance);
      return;
    }
    if (cached && (now - cached.timestamp) < MAX_STALE_MS) {
      if (cached.admin) setFullAdminAddress(cached.admin);
      if (cached.treasuryBalance) setTreasuryBalance(cached.treasuryBalance);
      // Silent background refresh
      (async () => {
        try {
          await fetchTreasuryBalance();
        } catch {}
      })();
      return;
    }

    const fetchOverviewData = async () => {
      try {
        // Primary: Get admins from AdminList (contract initializes this during DAO creation)
        try {
          // First check if admin system exists - with caching
          const adminListExists = await safeView({
            function: `${MODULE_ADDRESS}::admin::exists_admin_list`,
            functionArguments: [dao.id]
          }, `admin_list_exists_${dao.id}`);
          
          if (adminListExists && adminListExists[0]) {
            // Get admins from the AdminList - with caching
            const adminResult = await safeView({
              function: `${MODULE_ADDRESS}::admin::get_admins`,
              functionArguments: [dao.id]
            }, `admin_list_${dao.id}`);
            
            // Parse admin list (vector<address>)
            const admins: string[] = (() => {
              if (Array.isArray(adminResult)) {
                if (adminResult.length === 1 && Array.isArray(adminResult[0])) return adminResult[0] as string[];
                if (adminResult.every((a: any) => typeof a === 'string')) return adminResult as string[];
              }
              return [];
            })();

            if (admins.length > 0) {
              // Show first admin (usually the creator/super admin)
            setFullAdminAddress(admins[0]);
            cacheMap.set(dao.id, {
              admin: admins[0],
              treasuryBalance: treasuryBalance,
              timestamp: Date.now(),
            });
              return;
            }
          }
        } catch (adminError) {
          console.warn('Admin system query failed:', adminError);
        }

        // Fallback: Get creator from DAOCreated event
        try {
          const events = await cedraClient.getModuleEventsByEventType({
            eventType: `${MODULE_ADDRESS}::dao_core_file::DAOCreated`,
            options: { limit: 100 },
          });

          const ev = (events as any[]).find(e => e?.data?.movedao_addrx === dao.id);
          const creator = ev?.data?.creator as string | undefined;
          if (creator) {
            setFullAdminAddress(creator);
            cacheMap.set(dao.id, {
              admin: creator,
              treasuryBalance: treasuryBalance,
              timestamp: Date.now(),
            });
            return;
          }
        } catch (eventError) {
          console.warn('Error fetching creator from events:', eventError);
        }

        // Final fallback: DAO creator is the admin (contract guarantees this)
        setFullAdminAddress(dao.id);
        cacheMap.set(dao.id, {
          admin: dao.id,
          treasuryBalance: treasuryBalance,
          timestamp: Date.now(),
        });
        
        // Also fetch treasury balance
        await fetchTreasuryBalance();

      } catch (error: any) {
        console.warn('Error fetching overview data:', error);
        // Contract guarantees DAO creator is admin, so use DAO address as fallback
        setFullAdminAddress(dao.id);
        sectionLoader.setError(error?.message || 'Failed to load overview data');
      }
    };

    sectionLoader.executeWithLoader(fetchOverviewData);
  }, [dao.id]);

  // Silent refresh on window focus if cache is stale
  useEffect(() => {
    const onFocus = () => {
      // @ts-ignore
      const cacheMap: Map<string, any> = (window as any).__overviewCache || ((window as any).__overviewCache = new Map());
      const cached = cacheMap.get(dao.id);
      const now = Date.now();
      const SESSION_TTL_MS = 5 * 60 * 1000;
      const MAX_STALE_MS = 10 * 60 * 1000;
      if (cached && (now - cached.timestamp) >= SESSION_TTL_MS && (now - cached.timestamp) < MAX_STALE_MS) {
        (async () => {
          try {
            await fetchTreasuryBalance();
          } catch {}
        })();
      }
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [dao.id]);

  const retryOverviewData = () => {
    sectionLoader.reset();
    const fetchOverviewData = async () => {
      // Re-fetch all overview data
      await fetchTreasuryBalance();
    };
    sectionLoader.executeWithLoader(fetchOverviewData);
  };

  return (
    <div className="w-full px-4 sm:px-6 space-y-8">
      {/* About Section + Activity in one wrapper with border */}
      <div className="border border-white/10 rounded-xl py-4 px-2 space-y-6" style={{ background: 'transparent' }}>
        {/* About Section */}
        <div className="border border-white/10 rounded-xl py-4 px-4 sm:py-6 sm:px-6 space-y-4 sm:space-y-6" style={{ background: 'transparent' }}>
          <div className="flex items-center justify-between">
            <h2 className="text-lg sm:text-xl font-bold text-white">
              About {dao.name}
            </h2>

            {/* Top-right status */}
            <div className="text-right">
              {sectionLoader.error && (
                <div className="text-xs text-red-300 cursor-pointer" onClick={retryOverviewData}>
                  Error - Click to retry
                </div>
              )}
            </div>
          </div>

          {/* Key Stats (Admin only – Treasury removed) */}
          <div className="grid grid-cols-1 gap-4 sm:gap-6">
            <div className="text-left">
              <div className="flex flex-col space-y-2">
                <span className="text-xs sm:text-sm font-medium text-white">Admin</span>
                {fullAdminAddress ? (
                  <AdminDisplay address={fullAdminAddress} onClick={handleAvatarClick} />
                ) : (
                  <span className="text-xs sm:text-sm text-white">Loading...</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="space-y-4">
          <OptimizedActivityTable
            activities={activities}
            isLoading={isLoading}
            error={error}
            onRefresh={refetch}
            showUserColumn={true}
            showAmountColumn={true}
            showDAOColumn={false}
            showActionColumn={false}
            maxRows={undefined}
            showingCountText={
              pagination?.totalItems > 0
                ? `Showing ${(page - 1) * PAGE_LIMIT + Math.min(PAGE_LIMIT, activities.length)} of ${pagination.totalItems} activities`
                : undefined
            }
            hasNextPage={Boolean(pagination?.hasNextPage)}
            hasPrevPage={Boolean(pagination?.hasPreviousPage)}
            onNextPage={() => setPage(p => p + 1)}
            onPrevPage={() => setPage(p => Math.max(1, p - 1))}
            title="Activity"
          />
        </div>
      </div>

      {/* Member Profile Card Popup (admin profile) */}
      {selectedMember && (
        <MemberProfileCard
          address={selectedMember.address}
          shortAddress={selectedMember.shortAddress}
          memberNumber={1}
          isOpen={isProfileCardOpen}
          onClose={() => setIsProfileCardOpen(false)}
          anchorRef={selectedMember.ref}
        />
      )}
    </div>
  );
};

export default DAOHome;