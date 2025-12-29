import { useEffect, useState } from "react";
import { WalletButton } from "./WalletButton";
import { ChipsPanel } from "./ChipsPanel";
import { Link } from "react-router-dom";
import { Coins, Spade, X } from "lucide-react";
import "./Header.css";

export function Header() {
    const [chipsOpen, setChipsOpen] = useState(false);

    useEffect(() => {
        if (!chipsOpen) return;

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                setChipsOpen(false);
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [chipsOpen]);

    return (
        <header className="header">
            <Link to="/" className="logo">
                <Spade className="logo-icon" size={28} />
                <span className="logo-text">5-Seat Hold'em</span>
            </Link>

            <nav className="nav">
                <Link to="/" className="nav-link">Tables</Link>
            </nav>

            <div className="header-actions">
                <button
                    type="button"
                    className={`chips-trigger${chipsOpen ? " active" : ""}`}
                    onClick={() => setChipsOpen((prev) => !prev)}
                    aria-expanded={chipsOpen}
                    aria-haspopup="dialog"
                >
                    <Coins size={16} />
                    Chips
                </button>
                <WalletButton />
            </div>

            {chipsOpen && (
                <div className="chips-overlay" onClick={() => setChipsOpen(false)}>
                    <div
                        className="chips-modal"
                        role="dialog"
                        aria-label="Chips exchange"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <button
                            type="button"
                            className="chips-close"
                            onClick={() => setChipsOpen(false)}
                            aria-label="Close chips exchange"
                        >
                            <X size={16} />
                        </button>
                        <ChipsPanel />
                    </div>
                </div>
            )}
        </header>
    );
}
