import React, { useEffect, useState } from 'react';
import { Home, Plus, TrendingUp, ChevronLeft, ChevronRight } from 'lucide-react';
import mainLogo from '../assets/Logonew.png';

interface SidebarProps {
  currentView: string;
  onViewChange: (view: string) => void;
  isOpen?: boolean;
  onClose?: () => void;
  onCollapseChange?: (isCollapsed: boolean) => void;
  daoTabs?: Array<{
    id: string;
    label: string;
    icon: React.ComponentType<any>;
    color: string;
  }>;
  activeTab?: string;
  onTabChange?: (tabId: string) => void;
  mobileOnly?: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, onViewChange, isOpen = false, onClose, onCollapseChange, daoTabs, activeTab, onTabChange, mobileOnly = false }) => {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('sidebar_collapsed');
      if (saved !== null) return saved === 'true';
    } catch {}
    return true; // Default collapsed on first load
  });
  
  const handleToggle = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    onCollapseChange?.(newState);
    try { localStorage.setItem('sidebar_collapsed', String(newState)); } catch {}
  };

  // Notify parent on mount and when state changes to keep layout in sync
  useEffect(() => {
    onCollapseChange?.(isCollapsed);
  }, [isCollapsed, onCollapseChange]);
  
  const menuItems = [
    {
      id: 'home',
      icon: Home,
      label: 'Dashboard',
      subtext: 'Overview of all DAOs and activities',
      color: 'text-white'
    },
    {
      id: 'create-new',
      icon: Plus,
      label: 'Create DAO',
      subtext: 'Launch your own decentralized organization',
      color: 'text-white'
    },
  ];

  // Desktop Sidebar (responsive)
  const desktopSidebar = (
    <div className={`fixed top-12 left-0 backdrop-blur-md flex flex-col py-6 space-y-4 hidden md:flex h-[calc(100vh-3rem)] transition-all duration-300 z-40 ${
      isCollapsed ? 'w-16' : 'w-48'
    }`}
         style={{
           background: '#101010',
           borderRight: '1px solid var(--border)'
         }}>
      {/* Toggle Button */}
      <div className="flex justify-end px-4 mb-2">
        <button
          onClick={handleToggle}
          className="p-1 rounded-lg transition-colors"
          style={{
            color: 'var(--text)'
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? (
            <ChevronRight className="w-4 h-4" style={{ color: 'var(--text)' }} />
          ) : (
            <ChevronLeft className="w-4 h-4" style={{ color: 'var(--text)' }} />
          )}
        </button>
      </div>

      {/* Menu Items */}
      <div className="flex flex-col space-y-2 px-2">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className="group relative transition-all duration-300 flex items-center space-x-3 px-3 py-2.5 rounded-lg"
              style={{
                background: isActive ? 'rgba(255,255,255,0.1)' : 'transparent',
                color: 'var(--text)'
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = 'transparent';
                }
              }}
              title={isCollapsed ? item.label : ''}
            >
              <Icon className={`w-5 h-5 flex-shrink-0`} style={{ color: 'var(--text)' }} />
              {!isCollapsed && (
                <div className="flex flex-col items-start text-left">
                  <span className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{item.label}</span>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Spacer */}
      <div className="flex-1"></div>
      
      {/* Trending Icon at Bottom */}
      <div className="px-2">
        <button
          onClick={() => onViewChange('trending')}
          className="group relative transition-all duration-300 flex items-center space-x-3 px-3 py-2.5 rounded-lg w-full"
          style={{
            background: currentView === 'trending' ? 'rgba(255,255,255,0.1)' : 'transparent',
            color: 'var(--text)'
          }}
          onMouseEnter={(e) => {
            if (currentView !== 'trending') {
              e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
            }
          }}
          onMouseLeave={(e) => {
            if (currentView !== 'trending') {
              e.currentTarget.style.background = 'transparent';
            }
          }}
          title={isCollapsed ? 'Trending' : ''}
        >
          <TrendingUp className="w-5 h-5 flex-shrink-0" style={{ color: 'var(--text)' }} />
          {!isCollapsed && (
            <div className="flex flex-col items-start text-left">
              <span className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Trending</span>
            </div>
          )}
        </button>
      </div>
    </div>
  );

  // Mobile Sidebar Modal
  const mobileSidebar = isOpen ? (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm sm:hidden" onClick={onClose} />
      {/* Sidebar Modal */}
      <div
        className="fixed inset-y-0 left-0 z-[60] w-4/5 max-w-xs flex flex-col animate-slide-in sm:hidden"
        style={{
          background: '#101010',
          borderRight: '1px solid var(--border)'
        }}
      >
        {/* Header with Logo and Close Button */}
        <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
          <img src={mainLogo} alt="MoveDAO" className="w-8 h-8 object-contain" />
          <button
            className="rounded-full p-1.5 transition-colors"
            style={{ color: 'var(--text)' }}
            onClick={onClose}
            aria-label="Close Sidebar"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Menu Items Container */}
        <div className="flex flex-col gap-2 mt-4 px-3 py-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onViewChange(item.id);
                  onClose?.();
                }}
                className={`flex items-start gap-3 px-3 py-2.5 rounded-lg transition-all duration-200`}
                style={{ color: 'var(--text)', background: 'transparent' }}
              >
                <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5`}
                      style={{ color: 'var(--text)' }} />
                <div className="flex flex-col items-start text-left">
                  <span className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{item.label}</span>
                  <span className="text-xs" style={{ color: 'var(--text-dim)' }}>{item.subtext}</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Spacer */}
        <div className="flex-1"></div>

        {/* Trending Button at Bottom */}
        <div className="px-3 py-2">
          <button
            onClick={() => {
              onViewChange('trending');
              onClose?.();
            }}
            className={`flex items-start gap-3 w-full px-3 py-2.5 rounded-lg transition-all duration-200`}
            style={{ color: 'var(--text)', background: 'transparent' }}
          >
            <TrendingUp className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: 'var(--text)' }} />
            <div className="flex flex-col items-start text-left">
              <span className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Trending</span>
              <span className="text-xs" style={{ color: 'var(--text-dim)' }}>Explore popular DAOs</span>
            </div>
          </button>
        </div>
      </div>
    </>
  ) : null;

  return (
    <>
      {!mobileOnly && desktopSidebar}
      {mobileSidebar}
    </>
  );
};

export default Sidebar;