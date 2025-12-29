import { useWallet } from "./wallet-provider";
import { Wallet, LogOut, Copy, Check, ChevronDown } from "lucide-react";
import { useState } from "react";
import "./WalletButton.css";

export function WalletButton() {
    const { connected, connecting, account, connect, disconnect, wallets } = useWallet();
    const [copied, setCopied] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);

    const handleCopy = async () => {
        if (account?.address) {
            await navigator.clipboard.writeText(account.address.toString());
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const truncateAddress = (address: string) => {
        return `${address.slice(0, 6)}...${address.slice(-4)}`;
    };

    // Connected state - show address with dropdown
    if (connected && account) {
        return (
            <div className="wallet-container">
                <button className="wallet-address" onClick={() => setShowDropdown(!showDropdown)}>
                    <Wallet size={18} />
                    <span>{truncateAddress(account.address.toString())}</span>
                    <ChevronDown size={16} />
                </button>

                {showDropdown && (
                    <div className="wallet-dropdown">
                        <button className="dropdown-item" onClick={handleCopy}>
                            {copied ? <Check size={16} /> : <Copy size={16} />}
                            <span>{copied ? "Copied!" : "Copy Address"}</span>
                        </button>
                        <button className="dropdown-item disconnect" onClick={disconnect}>
                            <LogOut size={16} />
                            <span>Disconnect</span>
                        </button>
                    </div>
                )}
            </div>
        );
    }

    // No wallets detected - show install link
    if (wallets.length === 0) {
        return (
            <div className="wallet-container">
                <a
                    href="https://chromewebstore.google.com/detail/zedra-wallet/pbeefngmcchkcibdodceimammkigfanl"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="wallet-btn"
                >
                    <Wallet size={18} />
                    <span>Install Wallet</span>
                </a>
            </div>
        );
    }

    // Wallets available - show connect button with dropdown
    return (
        <div className="wallet-container">
            <button
                className="wallet-btn"
                onClick={() => setShowDropdown(!showDropdown)}
                disabled={connecting}
            >
                <Wallet size={18} />
                <span>{connecting ? "Connecting..." : "Connect Wallet"}</span>
                <ChevronDown size={16} />
            </button>

            {showDropdown && (
                <div className="wallet-dropdown">
                    {wallets.map((wallet) => (
                        <button
                            key={wallet.name}
                            className="dropdown-item wallet-option"
                            onClick={() => {
                                connect(wallet.name);
                                setShowDropdown(false);
                            }}
                            disabled={connecting}
                        >
                            {wallet.icon && <img src={wallet.icon} alt={wallet.name} className="wallet-icon" />}
                            <span>{wallet.name}</span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
