import { useCallback, useEffect, useMemo, useState } from "react";
import { sha3_256 } from "@noble/hashes/sha3";
import { Clock3, Eye, KeyRound, Loader2, Play, Shield, LogOut, Power, PowerOff } from "lucide-react";
import { GAME_PHASES, PHASE_NAMES } from "../config/contracts";
import { useContractActions } from "../hooks/useContract";
import type { GameState, SeatInfo, TableState } from "../types";
import "./LifecyclePanel.css";

interface LifecyclePanelProps {
    tableAddress: string;
    gameState: GameState;
    seats: (SeatInfo | null)[];
    playerSeat: number | null;
    tableState: TableState | null;
    playersInHand?: number[];
    commitStatus?: boolean[];
    pendingLeave?: boolean;
    isAdmin?: boolean;
    isAdminOnlyStart?: boolean;
    isPaused?: boolean;
    onRefresh: () => void | Promise<void>;
}

function formatDeadline(deadline?: number | null) {
    if (!deadline || deadline <= 0) return null;
    try {
        const date = new Date(deadline * 1000);
        return `${date.toLocaleString()} (${date.toLocaleTimeString()})`;
    } catch {
        return null;
    }
}

// Returns the SHA3-256 hash as bytes for contract submission
function hashSecretToBytes(secret: string): Uint8Array | null {
    if (!secret) return null;
    const encoder = new TextEncoder();
    const data = encoder.encode(secret);
    return sha3_256(data);
}

function getSecretStorageKey(
    tableAddress: string,
    playerAddress: string | null | undefined,
    handNumber: number | null | undefined
): string | null {
    if (!tableAddress || !playerAddress || !handNumber || handNumber <= 0) return null;
    return `holdem_secret_${tableAddress}_${playerAddress}_${handNumber}`.toLowerCase();
}

function loadStoredSecret(tableAddress: string, playerAddress: string | null | undefined, handNumber: number | null | undefined): string {
    const key = getSecretStorageKey(tableAddress, playerAddress, handNumber);
    if (!key || typeof window === "undefined") return "";
    try {
        // LOW-2 Fix: Use sessionStorage (cleared when tab closes) instead of localStorage
        return sessionStorage.getItem(key) || "";
    } catch {
        return "";
    }
}

function saveSecret(
    tableAddress: string,
    playerAddress: string | null | undefined,
    handNumber: number | null | undefined,
    secret: string
): void {
    const key = getSecretStorageKey(tableAddress, playerAddress, handNumber);
    if (!key || typeof window === "undefined") return;
    try {
        // LOW-2 Fix: Use sessionStorage (cleared when tab closes) instead of localStorage
        if (secret) {
            sessionStorage.setItem(key, secret);
        } else {
            sessionStorage.removeItem(key);
        }
    } catch {
        // sessionStorage may be unavailable
    }
}

export function LifecyclePanel({
    tableAddress,
    gameState,
    seats,
    playerSeat,
    tableState,
    playersInHand = [],
    commitStatus = [],
    pendingLeave = false,
    isAdmin = false,
    isAdminOnlyStart = false,
    isPaused = false,
    onRefresh,
}: LifecyclePanelProps) {
    const { startHand, submitCommit, revealSecret, leaveTable, leaveAfterHand, cancelLeaveAfterHand, sitOut, sitIn } = useContractActions();

    const playerAddress = playerSeat !== null ? seats[playerSeat]?.player : null;
    const handNumber = tableState?.handNumber ?? 0;

    // Load secret from localStorage on mount, keyed by table + player + hand
    const [secret, setSecretInternal] = useState(() => loadStoredSecret(tableAddress, playerAddress, handNumber));
    const [status, setStatus] = useState<string | null>(null);
    const [activeAction, setActiveAction] = useState<"start" | "commit" | "reveal" | "leave" | "sitout" | null>(null);

    // Wrapper to persist secret to localStorage
    const setSecret = useCallback((newSecret: string) => {
        setSecretInternal(newSecret);
        saveSecret(tableAddress, playerAddress, handNumber, newSecret);
    }, [tableAddress, playerAddress, handNumber]);

    // Re-load secret if player/hand changes (e.g. wallet switch or new hand)
    useEffect(() => {
        const stored = loadStoredSecret(tableAddress, playerAddress, handNumber);
        if (stored !== secret) {
            setSecretInternal(stored);
        }
    }, [tableAddress, playerAddress, handNumber, secret]);

    const deadlineText = useMemo(() => formatDeadline(gameState.actionOn?.deadline), [gameState.actionOn?.deadline]);

    const generateSecret = useCallback(() => {
        const randomBytes = window.crypto?.getRandomValues(new Uint8Array(16));
        return randomBytes
            ? Array.from(randomBytes)
                .map((b) => b.toString(16).padStart(2, "0"))
                .join("")
            : Math.random().toString(36).slice(2);
    }, []);

    const runLifecycleAction = async (action: () => Promise<unknown>, actionName: "start" | "commit" | "reveal" | "leave" | "sitout") => {
        try {
            setActiveAction(actionName);
            setStatus(null);
            await action();
            setStatus("Action submitted. Refreshing table...");
            await onRefresh();
        } catch (err) {
            console.error(`Lifecycle action "${actionName}" failed:`, err);
            const message = err instanceof Error ? err.message : "Action failed.";
            setStatus(message);
        } finally {
            setActiveAction(null);
        }
    };

    // Count active (non-sitting-out) seats
    const activeSeats = useMemo(() => seats.filter(s => s && !s.sittingOut).length, [seats]);
    const isSeatedPlayer = playerSeat !== null && !!seats[playerSeat];
    const isActivePlayer = isSeatedPlayer && !seats[playerSeat!]?.sittingOut;
    const playerHandIndex = useMemo(() => {
        if (playerSeat === null) return null;
        const idx = playersInHand.indexOf(playerSeat);
        return idx >= 0 ? idx : null;
    }, [playerSeat, playersInHand]);
    const hasCommitStatus = commitStatus.length > 0;
    const alreadyCommitted = hasCommitStatus && playerHandIndex !== null ? Boolean(commitStatus[playerHandIndex]) : false;
    const allCommitted = hasCommitStatus ? commitStatus.every(Boolean) : true;
    const canReveal = !hasCommitStatus || alreadyCommitted;

    useEffect(() => {
        if (!tableAddress || !playerAddress || handNumber <= 0) return;
        if (gameState.phase !== GAME_PHASES.COMMIT) return;
        if (!isActivePlayer || alreadyCommitted) return;
        if (secret) return;
        setSecret(generateSecret());
    }, [
        tableAddress,
        playerAddress,
        handNumber,
        gameState.phase,
        isActivePlayer,
        alreadyCommitted,
        secret,
        generateSecret,
        setSecret,
    ]);

    // Admin can start when admin_only_start is on, otherwise any active player can start
    const canStartHand = isAdminOnlyStart ? isAdmin : isActivePlayer;

    const startDisabled =
        gameState.phase !== GAME_PHASES.WAITING ||
        isPaused ||
        activeSeats < 2 ||
        !canStartHand ||
        activeAction !== null;

    const startHint = useMemo(() => {
        if (gameState.phase !== GAME_PHASES.WAITING) return null;
        if (isPaused) return "Table is paused.";
        if (activeSeats < 2) return "Need at least 2 active players.";
        if (isAdminOnlyStart && !isAdmin) return "Only admin can start hands.";
        if (!isSeatedPlayer) return "Join the table to start.";
        if (!isActivePlayer) return "Sit in to start.";
        return null;
    }, [gameState.phase, isPaused, activeSeats, isAdminOnlyStart, isAdmin, isSeatedPlayer, isActivePlayer]);
    const commitDisabled =
        gameState.phase !== GAME_PHASES.COMMIT || !isActivePlayer || !secret || alreadyCommitted || activeAction !== null;
    const revealDisabled =
        gameState.phase !== GAME_PHASES.REVEAL || !isActivePlayer || !secret || !allCommitted || !canReveal || activeAction !== null;

    const commitHint = useMemo(() => {
        if (gameState.phase !== GAME_PHASES.COMMIT) return null;
        if (!isSeatedPlayer) return "Join the table to request cards.";
        if (!isActivePlayer) return "Sit in to request cards.";
        if (alreadyCommitted) return "Request submitted. Waiting on others.";
        if (!secret) return "Preparing your request...";
        return null;
    }, [gameState.phase, isSeatedPlayer, isActivePlayer, alreadyCommitted, secret]);

    const revealHint = useMemo(() => {
        if (gameState.phase !== GAME_PHASES.REVEAL) return null;
        if (!isSeatedPlayer) return "Join the table to accept cards.";
        if (!isActivePlayer) return "Sit in to accept cards.";
        if (!allCommitted) return "Waiting for all players to request cards.";
        if (!canReveal) return "Request cards before accepting.";
        if (!secret) return "Request key missing for this hand.";
        return null;
    }, [gameState.phase, isSeatedPlayer, isActivePlayer, allCommitted, canReveal, secret]);

    const phaseMessage = () => {
        switch (gameState.phase) {
            case GAME_PHASES.WAITING:
                return "Waiting for the next hand to start.";
            case GAME_PHASES.COMMIT:
                return "Request your cards to lock in the shuffle.";
            case GAME_PHASES.REVEAL:
                return "Accept cards once all players have requested.";
            case GAME_PHASES.PREFLOP:
            case GAME_PHASES.FLOP:
            case GAME_PHASES.TURN:
            case GAME_PHASES.RIVER:
                return "Betting round in progress.";
            case GAME_PHASES.SHOWDOWN:
                return "Hand resolving at showdown.";
            default:
                return "Game status updating.";
        }
    };

    return (
        <section className="lifecycle-panel">
            <div className="lifecycle-header">
                <Shield size={18} />
                <div>
                    <h3>Hand Lifecycle</h3>
                    <p>Control hand start, request, and accept steps.</p>
                </div>
                <span className="phase-pill">{PHASE_NAMES[gameState.phase] ?? "Unknown"}</span>
            </div>

            <div className="phase-status">
                <p className="phase-message">{phaseMessage()}</p>
                {gameState.actionOn && (
                    <p className="acting-player">
                        Acting seat: {gameState.actionOn.seatIndex + 1} ({gameState.actionOn.playerAddress.slice(0, 6)}...
                        {gameState.actionOn.playerAddress.slice(-4)})
                    </p>
                )}
                {deadlineText && (
                    <div className="deadline">
                        <Clock3 size={16} />
                        <span>Deadline: {deadlineText}</span>
                    </div>
                )}
            </div>

            {gameState.phase === GAME_PHASES.WAITING && (
                <div className="lifecycle-card">
                    <div className="card-header">
                        <Play size={18} />
                        <div>
                            <h4>Start Hand</h4>
                            <small>
                                Seat {tableState ? tableState.dealerSeat + 1 : "-"} dealer starts the next hand.
                            </small>
                        </div>
                    </div>
                    <button
                        className="btn action"
                        onClick={() => runLifecycleAction(() => startHand(tableAddress), "start")}
                        disabled={startDisabled}
                    >
                        {activeAction === "start" ? <Loader2 className="spin" size={16} /> : <Play size={16} />} Start Hand
                    </button>
                    {startHint && <small className="hint">{startHint}</small>}
                </div>
            )}

            {gameState.phase === GAME_PHASES.COMMIT && (
                <div className="lifecycle-card">
                    <div className="card-header">
                        <KeyRound size={18} />
                        <div>
                            <h4>Request Cards</h4>
                            <small>We generate your request automatically for this hand.</small>
                        </div>
                    </div>

                    <button
                        className="btn action"
                        onClick={() =>
                            runLifecycleAction(async () => {
                                const hashBytes = hashSecretToBytes(secret);
                                if (!hashBytes) throw new Error("Unable to prepare request.");
                                await submitCommit(tableAddress, hashBytes);
                            }, "commit")
                        }
                        disabled={commitDisabled}
                    >
                        {activeAction === "commit" ? <Loader2 className="spin" size={16} /> : <Shield size={16} />} Request Cards
                    </button>
                    {commitHint && <small className="hint">{commitHint}</small>}
                </div>
            )}

            {gameState.phase === GAME_PHASES.REVEAL && (
                <div className="lifecycle-card">
                    <div className="card-header">
                        <Eye size={18} />
                        <div>
                            <h4>Accept Cards</h4>
                            <small>Available once everyone has requested.</small>
                        </div>
                    </div>

                    <button
                        className="btn action"
                        onClick={() =>
                            runLifecycleAction(async () => {
                                if (!secret) throw new Error("Request key missing for this hand.");
                                const secretBytes = new TextEncoder().encode(secret);
                                await revealSecret(tableAddress, secretBytes);
                            }, "reveal")
                        }
                        disabled={revealDisabled}
                    >
                        {activeAction === "reveal" ? <Loader2 className="spin" size={16} /> : <Eye size={16} />} Accept Cards
                    </button>
                    {revealHint && <small className="hint">{revealHint}</small>}
                </div>
            )}

            {/* Player Controls - shown when player is seated */}
            {playerSeat !== null && seats[playerSeat] && (
                <div className="lifecycle-card player-controls">
                    <div className="card-header">
                        <Power size={18} />
                        <div>
                            <h4>Player Controls</h4>
                            <small>Manage your session at this table</small>
                        </div>
                    </div>
                    <div className="controls-grid">
                        {/* Sit Out / Sit In Toggle */}
                        <button
                            className={`btn ${seats[playerSeat]?.sittingOut ? "success" : "secondary"}`}
                            onClick={() =>
                                runLifecycleAction(
                                    () => seats[playerSeat]?.sittingOut ? sitIn(tableAddress) : sitOut(tableAddress),
                                    "sitout"
                                )
                            }
                            disabled={activeAction !== null}
                        >
                            {activeAction === "sitout" ? (
                                <Loader2 className="spin" size={16} />
                            ) : seats[playerSeat]?.sittingOut ? (
                                <Power size={16} />
                            ) : (
                                <PowerOff size={16} />
                            )}
                            {seats[playerSeat]?.sittingOut ? "Sit In" : "Sit Out"}
                        </button>

                        {/* Leave Table Now - only shown when no hand is in progress */}
                        {gameState.phase === GAME_PHASES.WAITING && (
                            <button
                                className="btn danger"
                                onClick={() =>
                                    runLifecycleAction(
                                        () => leaveTable(tableAddress),
                                        "leave"
                                    )
                                }
                                disabled={activeAction !== null}
                            >
                                {activeAction === "leave" ? (
                                    <Loader2 className="spin" size={16} />
                                ) : (
                                    <LogOut size={16} />
                                )}
                                Leave Table
                            </button>
                        )}

                        {/* Leave After Hand - only shown during active hand */}
                        {gameState.phase !== GAME_PHASES.WAITING && (
                            <button
                                className={`btn ${pendingLeave ? "warning" : "danger-outline"}`}
                                onClick={() =>
                                    runLifecycleAction(
                                        () => pendingLeave ? cancelLeaveAfterHand(tableAddress) : leaveAfterHand(tableAddress),
                                        "leave"
                                    )
                                }
                                disabled={activeAction !== null}
                            >
                                {activeAction === "leave" ? (
                                    <Loader2 className="spin" size={16} />
                                ) : (
                                    <LogOut size={16} />
                                )}
                                {pendingLeave ? "Cancel Leave" : "Leave After Hand"}
                            </button>
                        )}
                    </div>
                    {pendingLeave && gameState.phase !== GAME_PHASES.WAITING && (
                        <small className="pending-notice">
                            You will leave the table after the current hand ends.
                        </small>
                    )}
                </div>
            )}

            {status && <div className="lifecycle-status">{status}</div>}
        </section>
    );
}
