import React from 'react';
import { Link } from 'react-router-dom';
import { Menu } from 'lucide-react';
import './styles/Header.css';
import WalletConnectButton from './WalletConnect';
import mainLogo from '../assets/Logonew.png';

interface HeaderProps {
  onMenuClick?: () => void;
  onProfileClick?: () => void;
  currentDAO?: string;
  disableTheme?: boolean;
}

const Header: React.FC<HeaderProps> = ({ onMenuClick, onProfileClick, disableTheme = false }) => {
  
  return (
    <header className="header">
      <div className="header-inner">
        <div className="header-left">
          <div className="header-logo">
            <img src={mainLogo} alt="MoveDAO" className="header-logo-image" />
            {/* Hide logo and subtitle on mobile, show on md+ */}
            <div className="header-title-group hidden md:block">
            </div>
          </div>
          <div className="header-menu-items hidden md:flex items-center gap-6 ml-2">
          </div>
        </div>
        <div className="header-actions">
          <WalletConnectButton onProfileClick={onProfileClick} />
          <button className="header-menu-btn md:hidden" onClick={onMenuClick} aria-label="Open Sidebar">
            <Menu className="w-5 h-5" />
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;