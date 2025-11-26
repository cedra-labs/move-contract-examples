import React, { useState, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import MainDashboard from './components/MainDashboard';
import CreateDAO from './components/CreateDAO';
import DAODetail from './components/DAODetail';
import PlatformGrowthCharts from './components/PlatformGrowthCharts';
import { UserProfile } from './components/profile';
import Onboard from './components/Onboard';
import Mosaic from './components/Onboard/Mosaic';
import Transfer from './components/Onboard/Transfer';
import { DAO } from './types/dao';
import { Home, FileText, Wallet, Users, Coins, Shield, Zap } from 'lucide-react';

function App() {
  // Persist and restore app navigation state across refreshes
  const [currentView, setCurrentView] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('app_current_view');
      return saved || 'home';
    } catch {
      return 'home';
    }
  });
  const [selectedDAO, setSelectedDAO] = useState<DAO | null>(() => {
    try {
      const saved = localStorage.getItem('app_selected_dao');
      return saved ? (JSON.parse(saved) as DAO) : null;
    } catch {
      return null;
    }
  });
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('sidebar_collapsed');
      if (saved !== null) return saved === 'true';
    } catch {}
    return true; // default collapsed
  });
  const [daoActiveTab, setDaoActiveTab] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('app_dao_active_tab');
      return saved || 'home';
    } catch {
      return 'home';
    }
  });

  // Clear hash from URL on mount
  useEffect(() => {
    if (window.location.hash) {
      window.history.replaceState(null, '', window.location.pathname);
    }
  }, []);

  const handleDAOSelect = (dao: DAO) => {
    setSelectedDAO(dao);
    setCurrentView('dao-detail');
    setDaoActiveTab('home'); // Reset to home tab when selecting a DAO
    // No URL hash updates
  };

  const handleBackToHome = () => {
    setCurrentView('home');
    setSelectedDAO(null);
    setDaoActiveTab('home'); // Reset tab when going back
    // No URL hash updates
  };

  const handleDaoTabChange = (_daoId: string, tabId: string) => {
    setDaoActiveTab(tabId);
    // No URL hash updates
  };

  // Keep navigation state in localStorage for full refresh resilience
  useEffect(() => {
    try {
      localStorage.setItem('app_current_view', currentView);
    } catch {}
  }, [currentView]);

  useEffect(() => {
    try {
      if (selectedDAO) {
        localStorage.setItem('app_selected_dao', JSON.stringify(selectedDAO));
      } else {
        localStorage.removeItem('app_selected_dao');
      }
    } catch {}
  }, [selectedDAO]);

  useEffect(() => {
    try {
      localStorage.setItem('app_dao_active_tab', daoActiveTab);
    } catch {}
  }, [daoActiveTab]);

  // Safety: If view is dao-detail but no DAO found, fallback to home
  useEffect(() => {
    if (currentView === 'dao-detail' && !selectedDAO) {
      setCurrentView('home');
    }
  }, [currentView, selectedDAO]);

  // Define DAO tabs
  const daoTabs = [
    { id: 'home', label: 'Overview', icon: Home, color: 'text-blue-400' },
    { id: 'proposals', label: 'Proposals', icon: FileText, color: 'text-green-400' },
    { id: 'staking', label: 'Staking', icon: Coins, color: 'text-orange-400' },
    { id: 'treasury', label: 'Treasury', icon: Wallet, color: 'text-yellow-400' },
    { id: 'members', label: 'Members', icon: Users, color: 'text-pink-400' },
    { id: 'admin', label: 'Admin', icon: Shield, color: 'text-purple-400' },
    { id: 'apps', label: 'Apps', icon: Zap, color: 'text-cyan-400' },
  ];


  const renderContent = () => {
    switch (currentView) {
      case 'home':
        return <MainDashboard onDAOSelect={handleDAOSelect} onCreateDAO={() => setCurrentView('create')} sidebarCollapsed={sidebarCollapsed} />;
      case 'create':
        return <CreateDAO onBack={handleBackToHome} />;
      case 'create-new':
        return <CreateDAO onBack={handleBackToHome} />;
      case 'dao-detail':
        return selectedDAO ? (
          <DAODetail
            dao={selectedDAO}
            onBack={handleBackToHome}
            sidebarCollapsed={sidebarCollapsed}
            onSidebarOpen={() => setSidebarOpen(true)}
            onActiveTabChange={handleDaoTabChange}
            activeTab={daoActiveTab}
          />
        ) : (
          <MainDashboard onDAOSelect={handleDAOSelect} onCreateDAO={() => setCurrentView('create')} />
        );
      case 'search':
        return (
          <div className="max-w-7xl mx-auto px-6 py-8">
            <div className="professional-card rounded-xl p-12 text-center">
              <h1 className="text-3xl font-bold text-white mb-4">Explore DAOs</h1>
              <p className="text-gray-400 mb-8">Advanced search and discovery features</p>
              <div className="w-16 h-16 bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-xl flex items-center justify-center mx-auto">
                <span className="text-2xl">Search</span>
              </div>
              <p className="text-gray-500 mt-4">Coming soon...</p>
            </div>
          </div>
        );
      case 'trending':
        return <PlatformGrowthCharts />;
      case 'community':
        return (
          <div className="max-w-7xl mx-auto px-6 py-8">
            <div className="professional-card rounded-xl p-12 text-center">
              <h1 className="text-3xl font-bold text-white mb-4">Community Hub</h1>
              <p className="text-gray-400 mb-8">Connect with other DAO members and builders</p>
              <div className="w-16 h-16 bg-gradient-to-br from-pink-500/20 to-rose-500/20 rounded-xl flex items-center justify-center mx-auto">
                <span className="text-2xl">👥</span>
              </div>
              <p className="text-gray-500 mt-4">Coming soon...</p>
            </div>
          </div>
        );
      case 'profile':
        return <UserProfile />;
      default:
        return <MainDashboard onDAOSelect={handleDAOSelect} />;
    }
  };

  return (
    <Routes>
      <Route path="/onboard" element={<Onboard />} />
      <Route path="/mosaic" element={<Mosaic />} />
      <Route path="/transfer" element={<Transfer />} />
      <Route path="*" element={
        <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--bg)' }}>
          {/* Header: always at the top */}
          <Header
            currentDAO={selectedDAO?.name}
            // Pass a prop to trigger sidebar open on mobile
            onMenuClick={() => setSidebarOpen(true)}
            onProfileClick={() => setCurrentView('profile')}
          />

          {/* Content area with sidebar below header */}
          <div className="flex flex-1 min-h-0">
            {/* Sidebar: below header on desktop, overlay on mobile */}
            <Sidebar
              currentView={currentView}
              onViewChange={(view) => {
                setCurrentView(view);
                setSidebarOpen(false); // close on mobile after selection
              }}
              isOpen={sidebarOpen}
              onClose={() => setSidebarOpen(false)}
              onCollapseChange={setSidebarCollapsed}
              daoTabs={currentView === 'dao-detail' ? daoTabs : undefined}
              activeTab={daoActiveTab}
              onTabChange={setDaoActiveTab}
            />
            <main className={`flex-1 overflow-auto transition-all duration-300 ${
              sidebarCollapsed ? 'md:ml-16' : 'md:ml-48'
            }`}>
              {renderContent()}
            </main>
          </div>
        </div>
      } />
    </Routes>
  );
}

export default App;