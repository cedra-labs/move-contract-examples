import { useState, useCallback } from "react";
import {
    Settings,
    Pause,
    Play,
    UserMinus,
    AlertTriangle,
    Power,
    Loader2,
    Shield,
    DollarSign,
    Users,
    Lock,
    Unlock,
} from "lucide-react";
import { useContractActions } from "../hooks/useContract";
import type { SeatInfo } from "../types";
import "./AdminPanel.css";

interface AdminPanelProps {
    tableAddress: string;
    isAdmin: boolean;
    isPaused: boolean;
    isAdminOnlyStart: boolean;
    seats: (SeatInfo | null)[];
    smallBlind: number;
    bigBlind: number;
    minBuyIn: number;
    maxBuyIn: number;
    onRefresh: () => void | Promise<void>;
}

export function AdminPanel({
    tableAddress,
    isAdmin,
    isPaused,
    isAdminOnlyStart,
    seats,
    smallBlind,
    bigBlind,
    minBuyIn,
    maxBuyIn,
    onRefresh,
}: AdminPanelProps) {
    const {
        pauseTable,
        resumeTable,
        kickPlayer,
        forceSitOut,
        toggleAdminOnlyStart,
        updateBlinds,
        updateBuyInLimits,
        closeTable,
        emergencyAbort,
    } = useContractActions();

    const [loading, setLoading] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [showBlindsModal, setShowBlindsModal] = useState(false);
    const [showBuyInModal, setShowBuyInModal] = useState(false);
    const [newSmallBlind, setNewSmallBlind] = useState(smallBlind);
    const [newBigBlind, setNewBigBlind] = useState(bigBlind);
    const [newMinBuyIn, setNewMinBuyIn] = useState(minBuyIn);
    const [newMaxBuyIn, setNewMaxBuyIn] = useState(maxBuyIn);

    const runAction = useCallback(
        async (actionName: string, action: () => Promise<unknown>) => {
            try {
                setLoading(actionName);
                setError(null);
                setSuccess(null);
                await action();
                setSuccess(`${actionName} successful!`);
                await onRefresh();
            } catch (err) {
                setError(err instanceof Error ? err.message : "Action failed");
            } finally {
                setLoading(null);
            }
        },
        [onRefresh]
    );

    if (!isAdmin) return null;

    type OccupiedSeat = SeatInfo & { index: number };
    const occupiedSeats: OccupiedSeat[] = seats
        .map((s, i) => (s ? { ...s, index: i } : null))
        .filter((s): s is OccupiedSeat => s !== null);

    return (
        <section className="admin-panel">
            <div className="admin-header">
                <div className="admin-title">
                    <Shield size={20} />
                    <div>
                        <h3>Admin Controls</h3>
                        <p>Manage your table settings and players</p>
                    </div>
                </div>
                <span className="admin-badge">Admin</span>
            </div>

            {/* Status Alerts */}
            {error && (
                <div className="admin-alert error">
                    <AlertTriangle size={16} />
                    {error}
                </div>
            )}
            {success && (
                <div className="admin-alert success">
                    <Shield size={16} />
                    {success}
                </div>
            )}

            {/* Quick Actions */}
            <div className="admin-section">
                <h4>Table Status</h4>
                <div className="admin-grid">
                    <button
                        className={`admin-btn ${isPaused ? "success" : "warning"}`}
                        onClick={() =>
                            runAction(isPaused ? "Resume" : "Pause", () =>
                                isPaused ? resumeTable(tableAddress) : pauseTable(tableAddress)
                            )
                        }
                        disabled={loading !== null}
                    >
                        {loading === "Pause" || loading === "Resume" ? (
                            <Loader2 className="spin" size={18} />
                        ) : isPaused ? (
                            <Play size={18} />
                        ) : (
                            <Pause size={18} />
                        )}
                        {isPaused ? "Resume Table" : "Pause Table"}
                    </button>

                    <button
                        className={`admin-btn ${isAdminOnlyStart ? "active" : ""}`}
                        onClick={() =>
                            runAction("Toggle Admin Start", () =>
                                toggleAdminOnlyStart(tableAddress, !isAdminOnlyStart)
                            )
                        }
                        disabled={loading !== null}
                    >
                        {loading === "Toggle Admin Start" ? (
                            <Loader2 className="spin" size={18} />
                        ) : isAdminOnlyStart ? (
                            <Lock size={18} />
                        ) : (
                            <Unlock size={18} />
                        )}
                        {isAdminOnlyStart ? "Admin Only: ON" : "Admin Only: OFF"}
                    </button>
                </div>
            </div>

            {/* Table Settings */}
            <div className="admin-section">
                <h4>Table Settings</h4>
                <div className="admin-grid">
                    <button
                        className="admin-btn secondary"
                        onClick={() => {
                            setNewSmallBlind(smallBlind);
                            setNewBigBlind(bigBlind);
                            setShowBlindsModal(true);
                        }}
                        disabled={loading !== null}
                    >
                        <DollarSign size={18} />
                        Update Blinds
                        <span className="btn-detail">{smallBlind}/{bigBlind}</span>
                    </button>

                    <button
                        className="admin-btn secondary"
                        onClick={() => {
                            setNewMinBuyIn(minBuyIn);
                            setNewMaxBuyIn(maxBuyIn);
                            setShowBuyInModal(true);
                        }}
                        disabled={loading !== null}
                    >
                        <Settings size={18} />
                        Buy-in Limits
                        <span className="btn-detail">{minBuyIn.toLocaleString()}-{maxBuyIn.toLocaleString()}</span>
                    </button>
                </div>
            </div>

            {/* Player Management */}
            {occupiedSeats.length > 0 && (
                <div className="admin-section">
                    <h4>Player Management</h4>
                    <div className="player-list">
                        {occupiedSeats.map((seat) => (
                            <div key={seat.index} className="player-row">
                                <div className="player-info">
                                    <Users size={16} />
                                    <span className="seat-num">Seat {seat.index + 1}</span>
                                    <span className="player-addr">
                                        {(seat.player ?? "").slice(0, 6)}...{(seat.player ?? "").slice(-4)}
                                    </span>
                                    <span className="player-chips">{seat.chips.toLocaleString()} chips</span>
                                </div>
                                <div className="player-actions">
                                    <button
                                        className="icon-btn warning"
                                        title="Force Sit Out"
                                        onClick={() =>
                                            runAction(`Sit Out ${seat.index + 1}`, () =>
                                                forceSitOut(tableAddress, seat.index)
                                            )
                                        }
                                        disabled={loading !== null || seat.sittingOut}
                                    >
                                        <Pause size={14} />
                                    </button>
                                    <button
                                        className="icon-btn danger"
                                        title="Kick Player"
                                        onClick={() =>
                                            runAction(`Kick ${seat.index + 1}`, () =>
                                                kickPlayer(tableAddress, seat.index)
                                            )
                                        }
                                        disabled={loading !== null}
                                    >
                                        <UserMinus size={14} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Danger Zone */}
            <div className="admin-section danger-zone">
                <h4>Danger Zone</h4>
                <div className="admin-grid">
                    <button
                        className="admin-btn danger"
                        onClick={() => {
                            if (confirm("Emergency abort the current hand? This cannot be undone.")) {
                                runAction("Emergency Abort", () => emergencyAbort(tableAddress));
                            }
                        }}
                        disabled={loading !== null}
                    >
                        {loading === "Emergency Abort" ? (
                            <Loader2 className="spin" size={18} />
                        ) : (
                            <AlertTriangle size={18} />
                        )}
                        Emergency Abort
                    </button>

                    <button
                        className="admin-btn danger"
                        onClick={() => {
                            if (confirm("Close this table permanently? All players will be refunded.")) {
                                runAction("Close Table", () => closeTable(tableAddress));
                            }
                        }}
                        disabled={loading !== null}
                    >
                        {loading === "Close Table" ? (
                            <Loader2 className="spin" size={18} />
                        ) : (
                            <Power size={18} />
                        )}
                        Close Table
                    </button>
                </div>
            </div>

            {/* Blinds Modal */}
            {showBlindsModal && (
                <div className="modal-overlay" onClick={() => setShowBlindsModal(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <h3>Update Blinds</h3>
                        <div className="modal-form">
                            <label>
                                <span>Small Blind</span>
                                <input
                                    type="number"
                                    value={newSmallBlind}
                                    onChange={(e) => setNewSmallBlind(Number(e.target.value))}
                                    min={1}
                                />
                            </label>
                            <label>
                                <span>Big Blind</span>
                                <input
                                    type="number"
                                    value={newBigBlind}
                                    onChange={(e) => setNewBigBlind(Number(e.target.value))}
                                    min={2}
                                />
                            </label>
                        </div>
                        <div className="modal-actions">
                            <button className="btn secondary" onClick={() => setShowBlindsModal(false)}>
                                Cancel
                            </button>
                            <button
                                className="btn primary"
                                onClick={() => {
                                    setShowBlindsModal(false);
                                    runAction("Update Blinds", () =>
                                        updateBlinds(tableAddress, newSmallBlind, newBigBlind)
                                    );
                                }}
                                disabled={newBigBlind <= newSmallBlind || newSmallBlind < 1}
                            >
                                Update
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Buy-in Modal */}
            {showBuyInModal && (
                <div className="modal-overlay" onClick={() => setShowBuyInModal(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <h3>Update Buy-in Limits</h3>
                        <div className="modal-form">
                            <label>
                                <span>Minimum Buy-in</span>
                                <input
                                    type="number"
                                    value={newMinBuyIn}
                                    onChange={(e) => setNewMinBuyIn(Number(e.target.value))}
                                    min={1}
                                />
                            </label>
                            <label>
                                <span>Maximum Buy-in</span>
                                <input
                                    type="number"
                                    value={newMaxBuyIn}
                                    onChange={(e) => setNewMaxBuyIn(Number(e.target.value))}
                                />
                            </label>
                        </div>
                        <div className="modal-actions">
                            <button className="btn secondary" onClick={() => setShowBuyInModal(false)}>
                                Cancel
                            </button>
                            <button
                                className="btn primary"
                                onClick={() => {
                                    setShowBuyInModal(false);
                                    runAction("Update Buy-in", () =>
                                        updateBuyInLimits(tableAddress, newMinBuyIn, newMaxBuyIn)
                                    );
                                }}
                                disabled={newMaxBuyIn < newMinBuyIn || newMinBuyIn < 1}
                            >
                                Update
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
}
