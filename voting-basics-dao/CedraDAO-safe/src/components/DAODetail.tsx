import React, { useState, useEffect } from 'react';
import { ArrowLeft, ArrowDown, ArrowUp, Home, FileText, Wallet, Users, Zap, Coins, Shield } from 'lucide-react';
import { FaXTwitter, FaDiscord, FaTelegram, FaGlobe } from 'react-icons/fa6';
import { DAO } from '../types/dao';
import DAOHome from './dao/DAOHome';
import DAOProposals from './dao/DAOProposals';
import DAOTreasury from './dao/DAOTreasury';
import DAOMembers from './dao/DAOMembers';
import DAOStaking from './dao/DAOStaking';
import DAOAdmin from './dao/DAOAdmin';
import { updateMetaTags, generateDAOMetaTags, resetToDefaultMetaTags } from '../utils/metaTags';
import { useAlert } from './alert/AlertContext';
import { useDAOMembership } from '../hooks/useDAOMembership';
import { useDAOState } from '../contexts/DAOStateContext';
import { useWallet } from '../contexts/CedraWalletProvider';
import { BalanceService } from '../useServices/useBalance';
import { MODULE_ADDRESS } from '../cedra_service/constants';
import { cedraClient } from '../cedra_service/cedra-client';
import { useTreasury } from '../hooks/useTreasury';
import { useVault } from '../hooks/useVault';

interface DAODetailProps {
  dao: DAO;
  onBack: () => void;
  sidebarCollapsed?: boolean;
  onSidebarOpen?: () => void;
  onActiveTabChange?: (tabId: string, activeTab: string) => void;
  activeTab?: string;
}

const DAODetail: React.FC<DAODetailProps> = ({ dao, onBack, sidebarCollapsed = false, onSidebarOpen, onActiveTabChange, activeTab: externalActiveTab }) => {
  const [activeTab, setActiveTab] = useState('home');

  // Sync with external active tab (from sidebar on mobile)
  useEffect(() => {
    if (externalActiveTab) {
      setActiveTab(externalActiveTab);
    }
  }, [externalActiveTab]);
  const [avatarLoaded, setAvatarLoaded] = useState(false);
  const [avatarError, setAvatarError] = useState(false);
  const [bgLoaded, setBgLoaded] = useState(false);
  const [bgError, setBgError] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString());
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });

  // Membership for quick stake summary in test panel
  const { membershipData } = useDAOMembership(dao);
  const { refreshDAOData } = useDAOState();
  const tokenSymbol = dao.tokenSymbol || 'LABS';
  const votingPower = membershipData?.votingPower ?? 0;
  const formattedVotingPower = Intl.NumberFormat().format(votingPower);

  // Wallet for quick actions
  const { account, signAndSubmitTransaction } = useWallet();
  const { showAlert } = useAlert();
  const [stakeAmount, setStakeAmount] = useState('');
  const [unstakeAmount, setUnstakeAmount] = useState('');
  const [showStakeForm, setShowStakeForm] = useState(false);
  const [showUnstakeForm, setShowUnstakeForm] = useState(false);

  // Treasury data for test panel
  const { treasuryData } = useTreasury(dao.id);
  // Fetch DAO FA vaults to show in test panel holdings
  const { vaults } = useVault(dao.id, (treasuryData as any)?.treasuryObject);
  const [socialLinks, setSocialLinks] = useState<{ x?: string; discord?: string; telegram?: string; website?: string }>({});
  const [category, setCategory] = useState<string | null>(null);
  const [movePrice, setMovePrice] = useState<number | null>(null);
  const [isStaking, setIsStaking] = useState(false);
  const [isUnstaking, setIsUnstaking] = useState(false);
  const [stakeError, setStakeError] = useState('');
  const [unstakeError, setUnstakeError] = useState('');

  const handleQuickStake = async () => {
    setStakeError('');
    const raw = parseFloat(stakeAmount);
    
    // Enhanced validation: Check against both contract minimum (6 MOVE) and DAO-specific minimum
    const contractMinimum = 6; // Contract enforces 6 MOVE minimum
    const daoMinimum = Math.max(membershipData?.minStakeRequired || 6, contractMinimum);
    const currentStake = membershipData?.stakedAmount || 0;
    const totalStake = currentStake + raw;
    
    if (!Number.isFinite(raw) || raw <= 0) {
      setStakeError('Enter a valid amount');
      return;
    }
    if (!account || !signAndSubmitTransaction) {
      setStakeError('Connect wallet');
      return;
    }
    
    // Contract minimum check
    if (raw < contractMinimum) {
      setStakeError(`Contract minimum is ${contractMinimum} MOVE tokens. You're trying to stake ${raw.toFixed(2)} MOVE.`);
      return;
    }
    
    // DAO minimum check for new stakers
    if (raw < daoMinimum && currentStake === 0) {
      setStakeError(`${dao.name} requires ${daoMinimum} MOVE minimum stake. You're trying to stake ${raw.toFixed(2)} MOVE.`);
      return;
    }
    
    // Check if after staking, user will meet DAO minimum (for membership status display)
    if (totalStake < (membershipData?.minStakeRequired || 6)) {
      setStakeError(`Total stake of ${totalStake.toFixed(2)} tokens would be below ${membershipData?.minStakeRequired || 6} tokens minimum for ${dao.name} membership`);
      return;
    }

    try {
      setIsStaking(true);
      const balanceCheck = await BalanceService.hasSufficientBalance(account.address, raw, 0.02);
      if (!balanceCheck.sufficient) {
        setStakeError(`Insufficient balance. Available: ${BalanceService.formatBalance(balanceCheck.available)} MOVE`);
        return;
      }
      const amountOctas = BalanceService.cedraToOctas(raw);
      const payload = {
        function: `${MODULE_ADDRESS}::staking::stake`,
        typeArguments: [],
        functionArguments: [dao.id, amountOctas],
      } as any;
      const tx = await signAndSubmitTransaction({ payload } as any);
      if (!tx || !(tx as any).hash) {
        showAlert('Transaction cancelled', 'error');
        return;
      }
      // Optimistic success (no blocking wait)
      showAlert('Stake submitted', 'success');
      // Background confirmation + refresh
      (async () => {
        try {
          await cedraClient.waitForTransaction({ transactionHash: (tx as any).hash, options: { checkSuccess: true } });
        } catch {}
        try { await refreshDAOData(dao.id); } catch {}
      })();
    } catch (e:any) {
      setStakeError(e?.message || 'Stake failed');
    } finally {
      setIsStaking(false);
    }
  };

  const handleQuickUnstake = async () => {
    setUnstakeError('');
    const raw = parseFloat(unstakeAmount);
    if (!Number.isFinite(raw) || raw <= 0) {
      setUnstakeError('Enter a valid amount');
      return;
    }
    if (!account || !signAndSubmitTransaction) {
      setUnstakeError('Connect wallet');
      return;
    }

    // Check minimum stake requirement after unstaking
    const currentStake = membershipData?.stakedAmount || 0;
    const remainingStake = currentStake - raw;
    const minStakeRequired = membershipData?.minStakeRequired || 6;
    
    if (remainingStake < minStakeRequired && remainingStake > 0) {
      setUnstakeError(`Unstaking would leave ${remainingStake.toFixed(2)} tokens, below ${minStakeRequired} tokens minimum for ${dao.name} membership`);
      return;
    }

    try {
      setIsUnstaking(true);
      const amountOctas = BalanceService.cedraToOctas(raw);
      const payload = {
        function: `${MODULE_ADDRESS}::staking::unstake`,
        typeArguments: [],
        functionArguments: [dao.id, amountOctas],
      } as any;
      const tx = await signAndSubmitTransaction({ payload } as any);
      if (!tx || !(tx as any).hash) {
        showAlert('Transaction cancelled', 'error');
        return;
      }
      showAlert('Unstake submitted', 'success');
      (async () => {
        try {
          await cedraClient.waitForTransaction({ transactionHash: (tx as any).hash, options: { checkSuccess: true } });
        } catch {}
        try { await refreshDAOData(dao.id); } catch {}
      })();
    } catch (e:any) {
      setUnstakeError(e?.message || 'Unstake failed');
    } finally {
      setIsUnstaking(false);
    }
  };

  // Preload background and avatar to avoid flicker
  useEffect(() => {
    const fetchLinks = async () => {
      try {
        const res = await cedraClient.view({
          payload: { function: `${MODULE_ADDRESS}::dao_core_file::get_dao_all_links`, functionArguments: [dao.id] }
        });
        if (Array.isArray(res) && res.length >= 4) {
          const [x, discord, telegram, website] = res as string[];
          setSocialLinks({
            x: (x || '').trim() || undefined,
            discord: (discord || '').trim() || undefined,
            telegram: (telegram || '').trim() || undefined,
            website: (website || '').trim() || undefined,
          });
        }
      } catch {}
      try {
        const cat = await cedraClient.view({
          payload: { function: `${MODULE_ADDRESS}::dao_core_file::get_dao_category`, functionArguments: [dao.id] }
        });
        const value = Array.isArray(cat) ? String(cat[0] || '') : '';
        setCategory(value && value.trim() ? value.trim() : null);
      } catch {}
    };
    fetchLinks();
  }, [dao.id]);
  useEffect(() => {
    if (dao.background) {
      setBgLoaded(false);
      setBgError(false);
      const img = new Image();
      (img as any).decoding = 'async';
      img.onload = () => setBgLoaded(true);
      img.onerror = () => setBgError(true);
      img.src = dao.background;
    } else {
      setBgError(true);
    }
  }, [dao.background]);

  useEffect(() => {
    if (dao.image) {
      setAvatarLoaded(false);
      setAvatarError(false);
      const img = new Image();
      (img as any).decoding = 'async';
      img.onload = () => setAvatarLoaded(true);
      img.onerror = () => setAvatarError(true);
      img.src = dao.image;
    } else {
      setAvatarError(true);
    }
  }, [dao.image]);
  

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = 'unset';
      };
    }
  }, [isMobileMenuOpen]);

  // Update meta tags when DAO changes
  useEffect(() => {
    const metaConfig = generateDAOMetaTags(dao);
    updateMetaTags(metaConfig);

    // Cleanup: reset to default meta tags when component unmounts
    return () => {
      resetToDefaultMetaTags();
    };
  }, [dao]);

  // Fetch MOVE price for treasury display
  // useEffect(() => {
  //   const fetchMovePrice = async () => {
  //     try {
  //       const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=movement&vs_currencies=usd');
  //       const data = await response.json();
  //       if (data.movement && data.movement.usd) {
  //         setMovePrice(data.movement.usd);
  //       }
  //     } catch (error) {
  //       console.warn('Failed to fetch MOVE price from CoinGecko:', error);
  //       // Remove $1 fallback; keep price unset so UI shows $0.00
  //       setMovePrice(null);
  //     }
  //   };

  //   fetchMovePrice();
  //   // Refresh price every 5 minutes
  //   const interval = setInterval(fetchMovePrice, 5 * 60 * 1000);
  //   return () => clearInterval(interval);
  // }, []);

  // Update time and window size for debug panel
  useEffect(() => {
    const updateWindowSize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight
      });
    };

    const timeInterval = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString());
    }, 1000);

    // Set initial window size
    updateWindowSize();
    window.addEventListener('resize', updateWindowSize);

    return () => {
      clearInterval(timeInterval);
      window.removeEventListener('resize', updateWindowSize);
    };
  }, []);


  const tabs = [
    { id: 'home', label: 'Overview', icon: Home, color: 'text-blue-400' },
    { id: 'proposals', label: 'Proposals', icon: FileText, color: 'text-green-400' },
    { id: 'staking', label: 'Staking', icon: Coins, color: 'text-orange-400' },
    { id: 'treasury', label: 'Treasury', icon: Wallet, color: 'text-yellow-400' },
    { id: 'members', label: 'Members', icon: Users, color: 'text-pink-400' },
    { id: 'admin', label: 'Admin', icon: Shield, color: 'text-purple-400' },
    
  ];

  // Handle tab change and notify parent
  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    onActiveTabChange?.(dao.id, tabId);
    try {
      localStorage.setItem('app_selected_dao', JSON.stringify(dao));
      localStorage.setItem('app_dao_active_tab', tabId);
      localStorage.setItem('app_current_view', 'dao-detail');
    } catch {}
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'home':
        return <DAOHome dao={dao} />;
      case 'proposals':
        return <DAOProposals dao={dao} />;
      case 'staking':
        return <DAOStaking dao={dao} />;
      case 'treasury':
        return <DAOTreasury dao={dao} />;
      case 'members':
        return <DAOMembers dao={dao} />;
      case 'admin':
        return <DAOAdmin dao={dao} />;
      
      default:
        return (
          <div className="container mx-auto px-2 sm:px-6 max-w-screen-lg space-y-6">
            <div className="professional-card rounded-xl p-12 text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-indigo-500/20 to-purple-600/20 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Zap className="w-8 h-8 text-indigo-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Coming Soon</h3>
              <p className="text-gray-400">This feature is under development</p>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen w-full max-w-full flex overflow-x-hidden">
      {/* Main Content Area */}
      <div className="flex-1 min-w-0 overflow-x-hidden">
        {/* Header */}
        <div className="relative border-b border-white/10 overflow-hidden">
          {/* Twitter Banner Style Background */}
          {dao.background && !bgError && (
            <div 
              className={`absolute left-0 right-0 top-0 h-32 sm:h-40 md:h-48 bg-cover bg-center bg-no-repeat pointer-events-none transition-opacity duration-300 ${bgLoaded ? 'opacity-100' : 'opacity-0'}`}
              style={{ 
                backgroundImage: `url(${dao.background})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat'
              }}
            />
          )}
          {dao.background && !bgLoaded && !bgError && (
            <div className="absolute left-0 right-0 top-0 h-32 sm:h-40 md:h-48 bg-gradient-to-r from-indigo-600/30 to-purple-600/30 pointer-events-none" />
          )}
          {(!dao.background || bgError) && (
            <div className="absolute left-0 right-0 top-0 h-32 sm:h-40 md:h-48 bg-gradient-to-r from-indigo-600/30 to-purple-600/30 pointer-events-none" />
          )}
          
          <div className="relative z-10 max-w-7xl 2xl:mx-auto px-4 sm:px-6 no-px-override py-6">
            {/* Back button and mobile share */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center text-sm">
                <button
                  onClick={onBack}
                  className="p-2 rounded-lg transition-all"
                  style={{
                    background: 'var(--card-bg)',
                    color: 'var(--text)',
                    border: '1px solid var(--border)'
                  }}
                  title="Back"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
              </div>

              {/* Share button removed */}
            </div>

            {/* DAO Header */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6">
              <div className="flex flex-col items-start space-y-4 w-full">
                <div className="relative flex-shrink-0 mx-0 mt-4">
                  {dao.image && !avatarLoaded && !avatarError && (
                    <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-gray-600/70 to-gray-700/70 animate-pulse border-2 border-white/20" />
                  )}
                  {dao.image && (
                    <img 
                      src={dao.image} 
                      alt={dao.name}
                      loading="eager"
                      decoding="async"
                      className={`w-20 h-20 rounded-xl object-cover ${avatarLoaded ? '' : 'hidden'}`}
                      onLoad={() => setAvatarLoaded(true)}
                      onError={() => setAvatarError(true)}
                    />
                  )}
                  {(!dao.image || avatarError) && (
                    <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-gray-600 to-gray-700 flex items-center justify-center">
                      <span className="text-white text-2xl font-bold">
                        {dao.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                  {dao.subname && dao.subname.trim() && (
                    <div className="absolute -bottom-2 -right-2">
                      <span className="px-2 py-1 bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-xs rounded-lg font-medium">
                        {dao.subname}
                      </span>
                    </div>
                  )}
                </div>
                <div className="text-left w-full sm:max-w-xl">
                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                    <h1 className="text-3xl font-bold text-white">{dao.name}</h1>
                    {category && (
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-md" style={{ color: '#facc16' }}>
                        {category}
                      </span>
                    )}
                    <div className="flex items-center gap-2">
                      {socialLinks.x && (
                        <a href={socialLinks.x} target="_blank" rel="noreferrer" className="text-gray-300 hover:text-white">
                          <FaXTwitter className="w-5 h-5" />
                        </a>
                      )}
                      {socialLinks.discord && (
                        <a href={socialLinks.discord} target="_blank" rel="noreferrer" className="text-gray-300 hover:text-white">
                          <FaDiscord className="w-5 h-5" />
                        </a>
                      )}
                      {socialLinks.telegram && (
                        <a href={socialLinks.telegram} target="_blank" rel="noreferrer" className="text-gray-300 hover:text-white">
                          <FaTelegram className="w-5 h-5" />
                        </a>
                      )}
                      {socialLinks.website && (
                        <a href={socialLinks.website} target="_blank" rel="noreferrer" className="text-gray-300 hover:text-white">
                          <FaGlobe className="w-5 h-5" />
                        </a>
                      )}
                    </div>
                  </div>
                  <p className="text-white text-sm sm:text-base max-w-xl mx-0">{dao.description}</p>
                  <div className="flex flex-wrap items-center gap-2 mt-3 text-xs text-gray-400">
                    <span className="whitespace-nowrap">{dao.established}</span>
                    <span>•</span>
                    <span className="text-white whitespace-nowrap">{dao.members} members</span>
                    <span>•</span>
                    <span className="text-white whitespace-nowrap">{dao.proposals} proposals</span>
                  </div>
                </div>
              </div>
              
              {/* Share button removed */}
            </div>

            {/* Navigation Tabs - Desktop/Tablet */}
            <nav className="hidden sm:flex sm:flex-row sm:flex-wrap sm:gap-2 mt-6 md:mt-8 -mx-4 px-4 sm:mx-0 sm:px-0">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => handleTabChange(tab.id)}
                    className={`flex items-center space-x-1 md:space-x-1.5 px-2 py-1 md:px-3 md:py-1.5 rounded-lg font-medium justify-center transition-colors ${isActive ? 'text-black' : ''}`}
                    style={
                      isActive
                        ? {
                            background: '#e1fe67',
                            color: '#000000'
                          }
                        : {
                            color: 'var(--text-dim)'
                          }
                    }
                  >
                    <Icon className={`w-3 h-3 md:w-3.5 md:h-3.5 ${isActive ? 'text-black' : ''}`} />
                    <span className="text-[10px] md:text-xs">{tab.label}</span>
                  </button>
                );
              })}
            </nav>

          </div>
        </div>

        {/* Mobile Tabs: separate row below DAO details */}
        <div className="sm:hidden border-b border-white/10">
          <div
            className="overflow-x-auto overflow-y-hidden py-2"
            style={{
              WebkitOverflowScrolling: 'touch',
              scrollBehavior: 'smooth',
              maxWidth: '100vw',
              width: '100%'
            }}
          >
            <div className="flex items-center gap-2 px-4" style={{ width: 'max-content' }}>
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => handleTabChange(tab.id)}
                    className="flex items-center gap-1 px-3 py-2 rounded-lg font-medium whitespace-nowrap flex-shrink-0 transition-colors"
                    style={
                      isActive
                        ? { background: '#e1fd6a', color: '#000000', border: 'none' }
                        : { color: 'var(--text-dim)' }
                    }
                  >
                    <Icon className="w-3 h-3" />
                    <span className="text-xs">{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-7xl 2xl:mx-auto px-6 py-8 overflow-x-hidden">
          {renderContent()}
        </div>
      </div>

      {/* Right Test Panel - From Top */}
      <div
        className={`hidden md:block flex-shrink-0 border-l border-white/10 min-h-screen overflow-y-auto overflow-x-hidden transition-all duration-300 ease-in-out ${
          sidebarCollapsed ? 'md:w-64 lg:w-72 xl:w-80 2xl:w-96' : 'md:w-56 lg:w-64 xl:w-72 2xl:w-80'
        }`}
        style={{ willChange: 'width' }}
      >
        <div className="p-4">
          <div className="professional-card rounded-xl p-4 mb-6">

            {/* Quick Stake Summary */}
            <div className="mb-4">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-white">{formattedVotingPower}</span>
              </div>
            </div>

            {/* Deposit / Withdraw */}
            <div className="grid grid-cols-2 gap-3">
              <button
                className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg font-medium shadow-inner text-black hover:opacity-90"
                style={{ background: '#e1fe67' }}
                onClick={() => { setShowStakeForm(true); setShowUnstakeForm(false); }}
              >
                <ArrowDown className="w-4 h-4" />
                Stake
              </button>
              <button
                className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-white/5 text-gray-300 font-medium border border-white/10 hover:bg-white/10 transition-colors"
                onClick={() => { setShowUnstakeForm(true); setShowStakeForm(false); }}
              >
                <ArrowUp className="w-4 h-4" />
                Unstake
              </button>
            </div>

            {showStakeForm && (
              <div className="mt-3 space-y-2">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Amount"
                  value={stakeAmount}
                  onChange={(e)=>setStakeAmount(e.target.value)}
                  className="w-full professional-input px-3 py-2 rounded-lg"
                />
                {stakeError && <div className="text-red-400 text-xs">{stakeError}</div>}
                
                {/* Minimum stake warning */}
                {(() => {
                  const currentStake = membershipData?.stakedAmount || 0;
                  const newStakeAmount = parseFloat(stakeAmount) || 0;
                  const totalStake = currentStake + newStakeAmount;
                  const contractMinimum = 6;
                  const daoMinimum = Math.max(membershipData?.minStakeRequired || 6, contractMinimum);
                  const minStakeRequired = membershipData?.minStakeRequired || 6;
                  
                  if (newStakeAmount > 0) {
                    // Contract minimum warning
                    if (newStakeAmount < contractMinimum) {
                      return (
                        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                          <div className="flex items-center space-x-2">
                            <div className="w-4 h-4 bg-red-500 rounded-full flex-shrink-0"></div>
                            <div className="text-red-400 text-xs">
                              Contract minimum is {contractMinimum} CEDRA tokens. You're trying to stake {newStakeAmount.toFixed(2)} CEDRA.
                            </div>
                          </div>
                        </div>
                      );
                    }
                    
                    // DAO minimum warning for new stakers
                    if (newStakeAmount < daoMinimum && currentStake === 0) {
                      return (
                        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
                          <div className="flex items-center space-x-2">
                            <div className="w-4 h-4 bg-yellow-500 rounded-full flex-shrink-0"></div>
                            <div className="text-yellow-400 text-xs">
                              {dao.name} requires {daoMinimum} CEDRA minimum stake. You're trying to stake {newStakeAmount.toFixed(2)} CEDRA.
                            </div>
                          </div>
                        </div>
                      );
                    }
                    
                    // Total stake warning
                    if (totalStake < minStakeRequired) {
                      return (
                        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
                          <div className="flex items-center space-x-2">
                            <div className="w-4 h-4 bg-yellow-500 rounded-full flex-shrink-0"></div>
                            <div className="text-yellow-400 text-xs">
                              Total stake of {totalStake.toFixed(2)} tokens would be below {minStakeRequired} tokens minimum for {dao.name} membership
                            </div>
                          </div>
                        </div>
                      );
                    }
                  }
                  return null;
                })()}
                
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={handleQuickStake} disabled={isStaking} className="px-2 py-1.5 rounded-lg text-sm font-medium disabled:opacity-50 text-black hover:opacity-90" style={{ background: '#e1fe67' }}>
                    {isStaking ? 'Staking…' : 'Confirm Stake'}
                  </button>
                  <button onClick={() => { setShowStakeForm(false); setStakeAmount(''); setStakeError(''); }} className="px-2 py-1.5 rounded-lg bg-white/5 text-gray-300 text-sm font-medium border border-white/10 hover:bg-white/10 transition-colors">
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {showUnstakeForm && (
              <div className="mt-3 space-y-2">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Amount"
                  value={unstakeAmount}
                  onChange={(e)=>setUnstakeAmount(e.target.value)}
                  className="w-full professional-input px-3 py-2 rounded-lg"
                />
                {unstakeError && <div className="text-red-400 text-xs">{unstakeError}</div>}
                
                {/* Minimum stake warning for unstaking */}
                {(() => {
                  const currentStake = membershipData?.stakedAmount || 0;
                  const unstakeAmountValue = parseFloat(unstakeAmount) || 0;
                  const remainingStake = currentStake - unstakeAmountValue;
                  const minStakeRequired = membershipData?.minStakeRequired || 6;
                  
                  if (unstakeAmountValue > 0 && remainingStake < minStakeRequired && remainingStake > 0) {
                    return (
                      <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
                        <div className="flex items-center space-x-2">
                          <div className="w-4 h-4 bg-yellow-500 rounded-full flex-shrink-0"></div>
                          <div className="text-yellow-400 text-xs">
                            Unstaking would leave {remainingStake.toFixed(2)} tokens, below {minStakeRequired} tokens minimum for {dao.name} membership
                          </div>
                        </div>
                      </div>
                    );
                  }
                  return null;
                })()}
                
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={handleQuickUnstake} disabled={isUnstaking} className="px-2 py-1.5 rounded-lg bg-white/10 text-white text-sm font-medium border border-white/10 disabled:opacity-50">
                    {isUnstaking ? 'Unstaking…' : 'Confirm Unstake'}
                  </button>
                  <button onClick={() => { setShowUnstakeForm(false); setUnstakeAmount(''); setUnstakeError(''); }} className="px-2 py-1.5 rounded-lg bg-white/5 text-gray-300 text-sm font-medium border border-white/10 hover:bg-white/10 transition-colors">
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="mt-4 pt-3 border-t border-white/10 text-center text-gray-300 font-medium">
              My Governance
            </div>
          </div>

          {/* Treasury Card */}
          <div className="professional-card rounded-xl p-4 mb-6">
            {/* Treasury Balance */}
            <div className="mb-4">
              <div className="text-3xl font-bold text-white mb-1">
                {movePrice !== null 
                  ? `$${(treasuryData.balance * movePrice).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}` 
                  : `$0.00`}
              </div>
              <div className="text-sm text-gray-400">Treasury Balance</div>
              <div className="flex items-center gap-2 mt-1">
                <span className={`w-2 h-2 rounded-full ${account ? 'bg-green-400' : 'bg-red-400'}`}></span>
                <span className="text-xs text-gray-400">{account ? 'Wallet connected' : 'Wallet not connected'}</span>
              </div>
            </div>

            {/* Top Holdings */}
            <div className="mb-4">
              <h4 className="text-sm font-semibold text-white mb-3">Holdings</h4>
              <div className="space-y-3">
                {/* CEDRA */}
                {treasuryData.balance > 0 ? (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: '#e1fd6a', color: '#000000' }}>
                        <span className="text-xs font-bold">C</span>
                      </div>
                      <div>
                        <div className="text-white text-sm font-medium">CEDRA</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-white text-sm font-medium">
                        {movePrice !== null
                          ? `$${(treasuryData.balance * movePrice).toLocaleString(undefined, {maximumFractionDigits: 0})}`
                          : `$0`}
                      </div>
                      <div className="text-gray-400 text-xs">{treasuryData.balance.toFixed(2)}</div>
                    </div>
                  </div>
                ) : null}

                {/* Fungible Asset Vaults */}
                {vaults && vaults.length > 0 ? (
                  vaults.map((v) => (
                    <div key={v.address} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {v.iconUrl ? (
                          <img src={v.iconUrl} alt={v.tokenSymbol || 'FA'} className="w-6 h-6 rounded-full flex-shrink-0" onError={(e)=>{(e.currentTarget as HTMLImageElement).style.display='none';}} />
                        ) : (
                          <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{background:'#facc16',color:'#0f172a'}}>
                            <span className="text-xs font-bold">{(v.tokenSymbol||'FA').slice(0,2)}</span>
                          </div>
                        )}
                        <div>
                          <div className="text-white text-sm font-medium">{v.tokenSymbol || 'FA'}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-white text-sm font-medium">{v.totalAssets.toLocaleString(undefined,{maximumFractionDigits:2})}</div>
                        <div className="text-gray-400 text-xs">{v.tokenSymbol || 'FA'}</div>
                      </div>
                    </div>
                  ))
                ) : (
                  !treasuryData.balance && (
                    <div className="text-center py-4 text-gray-500 text-sm">No holdings yet</div>
                  )
                )}
              </div>
            </div>

            {/* View Treasury Button */}
            <button
              onClick={() => setActiveTab('treasury')}
              className="w-full py-2 px-3 rounded-lg text-sm font-medium transition-colors"
              style={{ background: 'rgba(225, 254, 103, 0.1)', color: '#e1fe67' }}
            >
              View Treasury
            </button>
          </div>

        </div>
      </div>

      {/* Share modal removed */}
    </div>
  );
};

export default DAODetail;
