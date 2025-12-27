import { useState } from "react";
import { useContractActions } from "../hooks/useContract";
import { GAME_PHASES } from "../config/contracts";
import type { GameState, SeatInfo } from "../types";
import { Hand, X, Check, Phone, TrendingUp, Zap } from "lucide-react";
import "./ActionPanel.css";

interface ActionPanelProps {
    tableAddress: string;
    seatIndex: number;
    gameState: GameState;
    seatInfo: SeatInfo;
    onAction: () => void;
}

export function ActionPanel({ tableAddress, gameState, seatInfo, onAction }: ActionPanelProps) {
    const { fold, check, call, raiseTo, allIn } = useContractActions();
    const [raiseAmount, setRaiseAmount] = useState(0); // Will be set properly once we know minRaiseTotal
    const [loading, setLoading] = useState(false);

    const isMyTurn = gameState.actionOn?.playerAddress?.toLowerCase() === seatInfo.player?.toLowerCase();
    const callAmount = gameState.maxCurrentBet - seatInfo.currentBet;
    const canCheck = callAmount === 0;
    const inBettingPhase = gameState.phase >= GAME_PHASES.PREFLOP && gameState.phase <= GAME_PHASES.RIVER;

    // Minimum valid total bet for a raise = current max bet + minimum raise increment
    const minRaiseTotal = gameState.maxCurrentBet + gameState.minRaise;

    const handleAction = async (action: () => Promise<unknown>) => {
        try {
            setLoading(true);
            await action();
            onAction();
        } catch (err) {
            console.error("Action failed:", err);
        } finally {
            setLoading(false);
        }
    };

    if (!inBettingPhase) {
        return (
            <div className="action-panel waiting">
                <Hand size={24} />
                <span>Waiting for betting round...</span>
            </div>
        );
    }

    if (!isMyTurn) {
        return (
            <div className="action-panel waiting">
                <Phone size={24} />
                <span>Waiting for your turn...</span>
            </div>
        );
    }

    return (
        <div className="action-panel">
            <div className="action-info">
                <span className="action-label">Your Action</span>
                <span className="action-chips">Stack: {seatInfo.chips.toLocaleString()}</span>
            </div>

            <div className="action-buttons">
                <button
                    className="action-btn fold"
                    onClick={() => handleAction(() => fold(tableAddress))}
                    disabled={loading}
                >
                    <X size={18} />
                    Fold
                </button>

                {canCheck ? (
                    <button
                        className="action-btn check"
                        onClick={() => handleAction(() => check(tableAddress))}
                        disabled={loading}
                    >
                        <Check size={18} />
                        Check
                    </button>
                ) : (
                    <button
                        className="action-btn call"
                        onClick={() => handleAction(() => call(tableAddress))}
                        disabled={loading || callAmount > seatInfo.chips}
                    >
                        <Phone size={18} />
                        Call {callAmount}
                    </button>
                )}

                <div className="raise-section">
                    <input
                        type="range"
                        min={minRaiseTotal}
                        max={seatInfo.chips + seatInfo.currentBet}
                        value={raiseAmount < minRaiseTotal ? minRaiseTotal : raiseAmount}
                        onChange={(e) => setRaiseAmount(Number(e.target.value))}
                        className="raise-slider"
                    />
                    <div className="raise-controls">
                        <input
                            type="number"
                            value={raiseAmount < minRaiseTotal ? minRaiseTotal : raiseAmount}
                            onChange={(e) => setRaiseAmount(Number(e.target.value))}
                            className="raise-input"
                            min={minRaiseTotal}
                            max={seatInfo.chips + seatInfo.currentBet}
                        />
                        <button
                            className="action-btn raise"
                            onClick={() => handleAction(() => raiseTo(tableAddress, raiseAmount < minRaiseTotal ? minRaiseTotal : raiseAmount))}
                            disabled={loading || raiseAmount > seatInfo.chips + seatInfo.currentBet}
                        >
                            <TrendingUp size={18} />
                            Raise to {raiseAmount < minRaiseTotal ? minRaiseTotal : raiseAmount}
                        </button>
                    </div>
                </div>

                <button
                    className="action-btn all-in"
                    onClick={() => handleAction(() => allIn(tableAddress))}
                    disabled={loading}
                >
                    <Zap size={18} />
                    All-In ({seatInfo.chips})
                </button>
            </div>
        </div>
    );
}
