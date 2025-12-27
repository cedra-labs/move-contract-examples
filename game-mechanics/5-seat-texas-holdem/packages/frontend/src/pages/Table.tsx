import { useParams } from "react-router-dom";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import { Shield, X } from "lucide-react";
import { useWallet } from "../components/wallet-provider";
import { useChipsView, useContractActions, useTableView, useEventView } from "../hooks/useContract";
import { PokerTable } from "../components/PokerTable";
import { ActionPanel } from "../components/ActionPanel";
import { TableInfo } from "../components/TableInfo";
import { LifecyclePanel } from "../components/LifecyclePanel";
import { AdminPanel } from "../components/AdminPanel";
import { ShowdownModal, type HandResultData } from "../components/ShowdownModal";
import { GAME_PHASES } from "../config/contracts";
import type { TableConfig, TableState, SeatInfo, GameState } from "../types";
import "./Table.css";

export function Table() {
    const { address } = useParams<{ address: string }>();
    const { connected, account } = useWallet();
    const { getTableConfig, getTableState, getAllSeats, getFullGameState, getAdmin, isPaused, isAdminOnlyStart, getPendingLeaves, getEncryptedHoleCards, getPlayersInHand, getCommitStatus } = useTableView();
    const { joinTable } = useContractActions();
    const { getBalance } = useChipsView();
    const { getHandResultEvents } = useEventView();

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [config, setConfig] = useState<TableConfig | null>(null);
    const [tableState, setTableState] = useState<TableState | null>(null);
    const [seats, setSeats] = useState<(SeatInfo | null)[]>([]);
    const [gameState, setGameState] = useState<GameState | null>(null);
    const [playerSeat, setPlayerSeat] = useState<number | null>(null);
    const [selectedSeat, setSelectedSeat] = useState<number | null>(null);
    const [buyIn, setBuyIn] = useState<number>(0);
    const [balance, setBalance] = useState<number>(0);
    const [joinError, setJoinError] = useState<string | null>(null);
    const [joinSuccess, setJoinSuccess] = useState<string | null>(null);
    const [joining, setJoining] = useState(false);
    const [adminAddress, setAdminAddress] = useState<string>("");
    const [tablePaused, setTablePaused] = useState(false);
    const [adminOnlyStart, setAdminOnlyStart] = useState(false);
    const [pendingLeaves, setPendingLeaves] = useState<boolean[]>([false, false, false, false, false]);
    const [adminOpen, setAdminOpen] = useState(false);
    const [encryptedHoleCards, setEncryptedHoleCards] = useState<number[][]>([]);
    const [playersInHand, setPlayersInHand] = useState<number[]>([]);
    const [commitStatus, setCommitStatus] = useState<boolean[]>([]);

    // Hand result data - captured when a hand ends, used for showdown modal
    const [handResult, setHandResult] = useState<HandResultData | null>(null);
    const previousPhaseRef = useRef<number | null>(null);
    const handNumberRef = useRef<number>(0);

    const isAdmin = useMemo(() => {
        if (!connected || !account?.address || !adminAddress) return false;
        return adminAddress.toLowerCase() === account.address.toString().toLowerCase();
    }, [connected, account?.address, adminAddress]);

    const loadTableData = async (isBackground = false) => {
        if (!address) return;

        try {
            if (!isBackground) {
                setLoading(true);
                setError(null);
            }

            const [configData, stateData, seatsData, gameData, admin, paused, adminOnly, leaves, holeCardsData, playersData, commitStatusData] = await Promise.all([
                getTableConfig(address),
                getTableState(address),
                getAllSeats(address),
                getFullGameState(address),
                getAdmin(address),
                isPaused(address),
                isAdminOnlyStart(address),
                getPendingLeaves(address),
                getEncryptedHoleCards(address),
                getPlayersInHand(address),
                getCommitStatus(address),
            ]) as [Awaited<ReturnType<typeof getTableConfig>>, Awaited<ReturnType<typeof getTableState>>, Awaited<ReturnType<typeof getAllSeats>>, Awaited<ReturnType<typeof getFullGameState>>, string, boolean, boolean, boolean[], number[][], number[], boolean[]];

            // Detect hand completion: phase transitions from active to WAITING
            // Active phases are PREFLOP (3) through SHOWDOWN (7)
            const prevPhase = previousPhaseRef.current;
            const newPhase = gameData.phase;
            const wasInActiveHand = prevPhase !== null && prevPhase >= GAME_PHASES.PREFLOP;
            const handJustEnded = wasInActiveHand && newPhase === GAME_PHASES.WAITING;

            // Track hand number for display
            if (gameData.phase >= GAME_PHASES.PREFLOP && stateData.handNumber > handNumberRef.current) {
                handNumberRef.current = stateData.handNumber;
            }

            // Debug: Log phase transition
            console.log("DEBUG phase:", { prevPhase, newPhase, wasInActiveHand, handJustEnded, handResult: !!handResult });

            // Fetch hand result events when hand ends
            if (handJustEnded && !handResult && address) {
                console.log("DEBUG: Hand ended, fetching HandResult events...");

                // Fetch the most recent HandResult event from the blockchain
                const events = await getHandResultEvents(address, 1);

                if (events.length > 0) {
                    const eventData = events[0];
                    console.log("DEBUG: HandResult event found:", eventData);
                    setHandResult(eventData);
                } else {
                    console.log("DEBUG: No HandResult event found, falling back to snapshot");
                    // Fallback: Use snapshot data if no event found (shouldn't happen normally)
                    const snapshotPot = gameState?.potSize || 0;
                    if (snapshotPot > 0) {
                        setHandResult({
                            tableAddr: address,
                            handNumber: handNumberRef.current,
                            timestamp: Math.floor(Date.now() / 1000),
                            communityCards: gameState?.communityCards || [],
                            showdownSeats: [],
                            showdownPlayers: [],
                            showdownHoleCards: [],
                            showdownHandTypes: [],
                            winnerSeats: [],
                            winnerPlayers: [],
                            winnerAmounts: [],
                            totalPot: snapshotPot,
                            totalFees: 0,
                            resultType: 0,
                        });
                    }
                }
            }

            // Update the previous phase ref
            previousPhaseRef.current = newPhase;

            setConfig(configData);
            setTableState(stateData);
            setSeats(seatsData);
            setGameState(gameData);
            setAdminAddress(admin);
            setTablePaused(paused);
            setAdminOnlyStart(adminOnly);
            setPendingLeaves(leaves);
            setEncryptedHoleCards(holeCardsData);
            setPlayersInHand(playersData);
            setCommitStatus(commitStatusData);

            // Debug: Log hole cards data
            console.log("DEBUG hole cards:", { holeCardsData, playersData, phase: gameData.phase });

            // Default to first available seat if none selected
            const firstEmptySeat = seatsData.findIndex((s) => !s);
            setSelectedSeat((prev) => (prev === null && firstEmptySeat >= 0 ? firstEmptySeat : prev));

            // Find player's seat
            if (account?.address) {
                const accountAddr = account.address.toString().toLowerCase();
                const seatIdx = seatsData.findIndex(
                    (s) => s?.player?.toLowerCase() === accountAddr
                );
                setPlayerSeat(seatIdx >= 0 ? seatIdx : null);
            }
        } catch (err) {
            console.error("Failed to load table:", err);
            // Only show full page error on initial load
            if (!isBackground) {
                setError("Failed to load table data. Please check the address.");
            }
        } finally {
            if (!isBackground) {
                setLoading(false);
            }
        }
    };

    useEffect(() => {
        loadTableData();

        // Poll for updates every 3 seconds
        const interval = setInterval(() => loadTableData(true), 3000);
        return () => clearInterval(interval);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [address, account?.address]);

    useEffect(() => {
        if (config?.minBuyIn) {
            setBuyIn((prev) => (prev > 0 ? prev : config.minBuyIn));
        }
    }, [config?.minBuyIn]);

    const refreshBalance = useCallback(async () => {
        if (connected) {
            const value = await getBalance();
            setBalance(value);
        } else {
            setBalance(0);
        }
    }, [connected, getBalance]);

    useEffect(() => {
        refreshBalance();
    }, [refreshBalance, account?.address]);

    useEffect(() => {
        if (typeof window === "undefined") return;

        const handleChipsUpdate = () => {
            refreshBalance();
        };

        window.addEventListener("chips:updated", handleChipsUpdate);
        return () => window.removeEventListener("chips:updated", handleChipsUpdate);
    }, [refreshBalance]);

    // ESC key handler for admin modal
    useEffect(() => {
        if (!adminOpen) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") setAdminOpen(false);
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [adminOpen]);

    const handleSeatSelect = (seatIndex: number) => {
        setSelectedSeat(seatIndex);
        setJoinError(null);
        setJoinSuccess(null);
    };

    const handleJoin = async (event: FormEvent) => {
        event.preventDefault();
        setJoinError(null);
        setJoinSuccess(null);

        if (!connected || !account) {
            setJoinError("Connect your wallet to join the table.");
            return;
        }

        if (!address) {
            setJoinError("Table address is missing.");
            return;
        }

        if (selectedSeat === null) {
            setJoinError("Select an empty seat to join.");
            return;
        }

        if (!config) {
            setJoinError("Table configuration unavailable.");
            return;
        }

        if (seats[selectedSeat]) {
            setJoinError("That seat is already occupied.");
            return;
        }

        if (buyIn < config.minBuyIn || buyIn > config.maxBuyIn) {
            setJoinError(`Buy-in must be between ${config.minBuyIn} and ${config.maxBuyIn}.`);
            return;
        }

        if (buyIn > balance) {
            setJoinError("Insufficient chip balance for this buy-in.");
            return;
        }

        try {
            setJoining(true);
            await joinTable(address, selectedSeat, buyIn);
            setJoinSuccess("Joined table successfully!");
            await Promise.all([loadTableData(), refreshBalance()]);
        } catch (err) {
            const message = err instanceof Error ? err.message : "Failed to join the table.";
            setJoinError(message);
        } finally {
            setJoining(false);
        }
    };

    const emptySeats = useMemo(() => seats.map((seat, idx) => (!seat ? idx : null)).filter((idx) => idx !== null) as number[], [seats]);

    const joinDisabled =
        !connected ||
        selectedSeat === null ||
        joining ||
        !config ||
        !!seats[selectedSeat ?? -1] ||
        buyIn < (config?.minBuyIn ?? 0) ||
        buyIn > (config?.maxBuyIn ?? Infinity) ||
        buyIn > balance;

    if (loading && !config) {
        return (
            <div className="table-page loading">
                <div className="spinner" />
                <p>Loading table...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="table-page error">
                <p>{error}</p>
                <button className="btn btn-primary" onClick={() => loadTableData()}>
                    Retry
                </button>
            </div>
        );
    }

    return (
        <div className="table-page">
            <div className="table-layout">
                <aside className="table-sidebar">
                    {config && tableState && (
                        <TableInfo config={config} state={tableState} address={address!} />
                    )}

                    {isAdmin && config && (
                        <button
                            type="button"
                            className={`admin-trigger${adminOpen ? " active" : ""}`}
                            onClick={() => setAdminOpen(true)}
                            aria-expanded={adminOpen}
                            aria-haspopup="dialog"
                        >
                            <Shield size={16} />
                            Admin
                        </button>
                    )}

                    <section className="join-panel">
                        <div className="panel-header">
                            <h3>Join this table</h3>
                            <p>Choose an empty seat and set your buy-in.</p>
                        </div>

                        <form className="join-form" onSubmit={handleJoin}>
                            <label className="form-field">
                                <span>Seat</span>
                                <select
                                    value={selectedSeat ?? ""}
                                    onChange={(e) => handleSeatSelect(Number(e.target.value))}
                                    disabled={!connected || emptySeats.length === 0}
                                >
                                    <option value="" disabled>
                                        {emptySeats.length === 0 ? "No empty seats" : "Select a seat"}
                                    </option>
                                    {emptySeats.map((idx) => (
                                        <option key={idx} value={idx}>
                                            Seat {idx + 1}
                                        </option>
                                    ))}
                                </select>
                            </label>

                            <label className="form-field">
                                <span>Buy-in</span>
                                <div className="input-hint">
                                    <input
                                        type="number"
                                        min={config?.minBuyIn}
                                        max={config?.maxBuyIn}
                                        value={buyIn}
                                        onChange={(e) => setBuyIn(Number(e.target.value))}
                                        disabled={!connected}
                                    />
                                    {config && (
                                        <small>
                                            Min {config.minBuyIn.toLocaleString()} / Max {config.maxBuyIn.toLocaleString()}
                                        </small>
                                    )}
                                </div>
                            </label>

                            <div className="form-meta">
                                <span>Your chips: {balance.toLocaleString()}</span>
                                {!connected && <span className="warning">Connect your wallet to join.</span>}
                            </div>

                            {joinError && <div className="alert error">{joinError}</div>}
                            {joinSuccess && <div className="alert success">{joinSuccess}</div>}

                            <button type="submit" className="btn btn-primary" disabled={joinDisabled}>
                                {joining ? "Joining..." : "Join table"}
                            </button>
                        </form>
                    </section>
                </aside>

                <main className="table-main">
                    <section className="table-stage">
                        <div className="table-stage-inner">
                            <PokerTable
                                seats={seats}
                                gameState={gameState}
                                dealerSeat={tableState?.dealerSeat ?? 0}
                                playerSeat={playerSeat}
                                onSeatSelect={handleSeatSelect}
                                selectedSeat={selectedSeat}
                                encryptedHoleCards={encryptedHoleCards}
                                playersInHand={playersInHand}
                                tableAddress={address}
                                playerAddress={account?.address?.toString()}
                                handNumber={tableState?.handNumber ?? 0}
                            />
                        </div>
                    </section>

                    <section className="table-console">
                        {connected && playerSeat !== null && gameState && (
                            <ActionPanel
                                tableAddress={address!}
                                seatIndex={playerSeat}
                                gameState={gameState}
                                seatInfo={seats[playerSeat]!}
                                onAction={loadTableData}
                            />
                        )}

                        {gameState && (
                            <LifecyclePanel
                                tableAddress={address!}
                                gameState={gameState}
                                seats={seats}
                                playerSeat={playerSeat}
                                tableState={tableState}
                                pendingLeave={playerSeat !== null ? pendingLeaves[playerSeat] : false}
                                isAdmin={connected && !!account?.address && adminAddress.toLowerCase() === account.address.toString().toLowerCase()}
                                isAdminOnlyStart={adminOnlyStart}
                                isPaused={tablePaused}
                                playersInHand={playersInHand}
                                commitStatus={commitStatus}
                                onRefresh={loadTableData}
                            />
                        )}

                    </section>
                </main>
            </div>

            {/* Admin Modal */}
            {adminOpen && config && (
                <div className="admin-overlay" onClick={() => setAdminOpen(false)}>
                    <div
                        className="admin-modal"
                        role="dialog"
                        aria-label="Admin controls"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button
                            type="button"
                            className="admin-close"
                            onClick={() => setAdminOpen(false)}
                            aria-label="Close admin controls"
                        >
                            <X size={16} />
                        </button>
                        <AdminPanel
                            tableAddress={address!}
                            isAdmin={isAdmin}
                            isPaused={tablePaused}
                            isAdminOnlyStart={adminOnlyStart}
                            seats={seats}
                            smallBlind={config.smallBlind}
                            bigBlind={config.bigBlind}
                            minBuyIn={config.minBuyIn}
                            maxBuyIn={config.maxBuyIn}
                            onRefresh={loadTableData}
                        />
                    </div>
                </div>
            )}

            {/* Showdown Results Modal */}
            {handResult && (
                <ShowdownModal
                    handResult={handResult}
                    onDismiss={() => setHandResult(null)}
                />
            )}
        </div>
    );
}
