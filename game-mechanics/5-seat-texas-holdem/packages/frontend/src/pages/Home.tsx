import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useWallet } from "../components/wallet-provider";
import { ChipsPanel } from "../components/ChipsPanel";
import { useContractActions } from "../hooks/useContract";
import { MODULES } from "../config/contracts";
import { Plus, Users, Coins, ArrowRight } from "lucide-react";
import "./Home.css";

export function Home() {
    const { connected } = useWallet();
    const navigate = useNavigate();
    const [tableAddress, setTableAddress] = useState("");
    const [showCreateModal, setShowCreateModal] = useState(false);

    const handleJoinTable = (e: React.FormEvent) => {
        e.preventDefault();
        if (tableAddress.trim()) {
            navigate(`/table/${tableAddress.trim()}`);
        }
    };

    return (
        <div className="home">
            <section className="hero">
                <h1 className="hero-title">
                    On-Chain <span className="text-accent">Texas Hold'em</span>
                </h1>
                <p className="hero-subtitle">
                    Fully decentralized 5-seat poker on Cedra blockchain.
                    Provably fair, trustless, and transparent.
                </p>
            </section>

            <section className="actions-section">
                <div className="action-card join-card">
                    <div className="action-header">
                        <Users size={24} />
                        <h2>Join a Table</h2>
                    </div>
                    <p className="action-desc">Enter a table address to join an existing game</p>
                    <form onSubmit={handleJoinTable} className="join-form">
                        <input
                            type="text"
                            placeholder="0x..."
                            value={tableAddress}
                            onChange={(e) => setTableAddress(e.target.value)}
                            className="table-input"
                        />
                        <button type="submit" className="btn btn-primary" disabled={!tableAddress.trim()}>
                            <ArrowRight size={18} />
                            Join
                        </button>
                    </form>
                </div>

                <div className="action-card create-card">
                    <div className="action-header">
                        <Plus size={24} />
                        <h2>Create Table</h2>
                    </div>
                    <p className="action-desc">Start a new poker table with custom blinds and limits</p>
                    <button
                        className="btn btn-secondary"
                        onClick={() => setShowCreateModal(true)}
                        disabled={!connected}
                    >
                        <Coins size={18} />
                        {connected ? "Create New Table" : "Connect Wallet First"}
                    </button>
                </div>
            </section>

            <section className="chips-section">
                <ChipsPanel />
            </section>

            <section className="info-section">
                <h2>How It Works</h2>
                <div className="info-grid">
                    <div className="info-card">
                        <div className="info-number">1</div>
                        <h3>Buy Chips</h3>
                        <p>Exchange CEDRA tokens for poker chips at 1:1000 rate</p>
                    </div>
                    <div className="info-card">
                        <div className="info-number">2</div>
                        <h3>Join Table</h3>
                        <p>Pick a seat and buy in with your chips</p>
                    </div>
                    <div className="info-card">
                        <div className="info-number">3</div>
                        <h3>Play Poker</h3>
                        <p>Standard Texas Hold'em rules with secure shuffle randomness</p>
                    </div>
                    <div className="info-card">
                        <div className="info-number">4</div>
                        <h3>Cash Out</h3>
                        <p>Convert chips back to CEDRA anytime</p>
                    </div>
                </div>
            </section>

            {showCreateModal && (
                <CreateTableModal onClose={() => setShowCreateModal(false)} />
            )}
        </div>
    );
}

function CreateTableModal({ onClose }: { onClose: () => void }) {
    const { createTable } = useContractActions();
    const navigate = useNavigate();
    const [config, setConfig] = useState({
        smallBlind: 5,
        bigBlind: 10,
        minBuyIn: 100,
        maxBuyIn: 10000,
        ante: 0,
        straddleEnabled: true,
    });

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [newTableAddress, setNewTableAddress] = useState<string | null>(null);



    const validationError = useMemo(() => {
        const errors: string[] = [];

        if (config.smallBlind <= 0 || config.bigBlind <= 0) {
            errors.push("Blinds must be greater than zero.");
        }
        if (config.bigBlind <= config.smallBlind) {
            errors.push("Big blind must be greater than small blind.");
        }
        if (config.minBuyIn <= 0 || config.maxBuyIn <= 0) {
            errors.push("Buy-in limits must be greater than zero.");
        }
        if (config.minBuyIn > config.maxBuyIn) {
            errors.push("Min buy-in cannot exceed max buy-in.");
        }

        return errors.join(" ");
    }, [config.bigBlind, config.maxBuyIn, config.minBuyIn, config.smallBlind]);

    const extractTableAddress = (txResult: unknown) => {
        const events = (txResult as { events?: { type?: string; data?: Record<string, unknown> }[] }).events || [];
        const creationEvent = events.find(
            (event) =>
                event.type === `${MODULES.POKER_EVENTS}::TableCreated` ||
                event.type?.toLowerCase().includes("tablecreated")
        );
        const data = creationEvent?.data as Record<string, unknown> | undefined;
        return (data?.table_addr as string) || (data?.tableAddress as string) || null;
    };

    const handleCreate = async () => {
        if (validationError) {
            setError(validationError);
            return;
        }

        try {
            setIsSubmitting(true);
            setError(null);
            setNewTableAddress(null);

            const response = await createTable(
                config.smallBlind,
                config.bigBlind,
                config.minBuyIn,
                config.maxBuyIn,
                config.ante,
                config.straddleEnabled
            );

            const tableAddr = extractTableAddress(response.result);

            if (tableAddr) {
                setNewTableAddress(tableAddr);
            } else {
                setError("Table created, but the table address was not found in the transaction events.");
            }
        } catch (err) {
            const message = err instanceof Error ? err.message : "Failed to create table.";
            setError(message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
                <h2>Create New Table</h2>



                <div className="form-group">
                    <label>Small Blind</label>
                    <input
                        type="number"
                        value={config.smallBlind}
                        onChange={(e) => setConfig({ ...config, smallBlind: Number(e.target.value) })}
                        min={1}
                        disabled={isSubmitting}
                    />
                </div>

                <div className="form-group">
                    <label>Big Blind</label>
                    <input
                        type="number"
                        value={config.bigBlind}
                        onChange={(e) => setConfig({ ...config, bigBlind: Number(e.target.value) })}
                        min={1}
                        disabled={isSubmitting}
                    />
                </div>

                <div className="form-row">
                    <div className="form-group">
                        <label>Min Buy-In</label>
                        <input
                            type="number"
                            value={config.minBuyIn}
                            onChange={(e) => setConfig({ ...config, minBuyIn: Number(e.target.value) })}
                            min={1}
                            disabled={isSubmitting}
                        />
                    </div>
                    <div className="form-group">
                        <label>Max Buy-In</label>
                        <input
                            type="number"
                            value={config.maxBuyIn}
                            onChange={(e) => setConfig({ ...config, maxBuyIn: Number(e.target.value) })}
                            min={1}
                            disabled={isSubmitting}
                        />
                    </div>
                </div>

                <div className="form-group">
                    <label>Ante (optional)</label>
                    <input
                        type="number"
                        value={config.ante}
                        onChange={(e) => setConfig({ ...config, ante: Number(e.target.value) })}
                        min={0}
                        disabled={isSubmitting}
                    />
                </div>

                <div className="form-group checkbox-group">
                    <label>
                        <input
                            type="checkbox"
                            checked={config.straddleEnabled}
                            onChange={(e) => setConfig({ ...config, straddleEnabled: e.target.checked })}
                            disabled={isSubmitting}
                        />
                        Allow Straddle
                    </label>
                </div>

                {validationError && <p className="error-text">{validationError}</p>}
                {error && !validationError && <p className="error-text">{error}</p>}

                {newTableAddress && (
                    <div className="success-box">
                        <p>Table created successfully!</p>
                        <div className="link-row">
                            <code className="table-link">{`/table/${newTableAddress}`}</code>
                            <button
                                className="btn btn-secondary"
                                onClick={() => navigator.clipboard?.writeText(`${window.location.origin}/table/${newTableAddress}`)}
                            >
                                Copy Link
                            </button>
                        </div>
                        <button
                            className="btn btn-primary"
                            onClick={() => navigate(`/table/${newTableAddress}`)}
                        >
                            Go to Table
                        </button>
                    </div>
                )}

                <div className="modal-actions">
                    <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
                    <button
                        className="btn btn-primary"
                        onClick={handleCreate}
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? "Creating..." : "Create Table"}
                    </button>
                </div>
            </div>
        </div>
    );
}
