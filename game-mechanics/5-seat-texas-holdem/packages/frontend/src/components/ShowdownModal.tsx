import { decodeCard, HAND_RANKINGS } from "../config/contracts";
import "./ShowdownModal.css";

// Hand result data - matches the on-chain HandResult event structure
export interface HandResultData {
    tableAddr: string;
    handNumber: number;
    timestamp: number;
    communityCards: number[];
    // Players who reached showdown (didn't fold)
    showdownSeats: number[];
    showdownPlayers: string[];
    showdownHoleCards: number[][];
    showdownHandTypes: number[];
    // Winners
    winnerSeats: number[];
    winnerPlayers: string[];
    winnerAmounts: number[];
    // Summary
    totalPot: number;
    totalFees: number;
    resultType: number; // 0=showdown, 1=fold_win
}

interface ShowdownModalProps {
    handResult: HandResultData;
    onDismiss: () => void;
}

export function ShowdownModal({ handResult, onDismiss }: ShowdownModalProps) {
    const {
        communityCards,
        showdownSeats,
        showdownPlayers,
        showdownHoleCards,
        showdownHandTypes,
        winnerSeats,
        winnerPlayers,
        winnerAmounts,
        totalPot,
        resultType,
    } = handResult;

    const isWinner = (seatIdx: number) => winnerSeats.includes(seatIdx);
    const getWinnerAmount = (seatIdx: number) => {
        const idx = winnerSeats.indexOf(seatIdx);
        return idx >= 0 ? winnerAmounts[idx] : 0;
    };
    const getHandTypeName = (handType: number) => {
        // Hand types from contract: 0=High Card, 1=One Pair, 2=Two Pair, ..., 9=Royal Flush
        // (negative or out of range means not evaluated)
        if (handType < 0 || handType >= HAND_RANKINGS.length) return "";
        return HAND_RANKINGS[handType] || `Hand ${handType}`;
    };

    const isFoldWin = resultType === 1;

    return (
        <div className="showdown-overlay" onClick={onDismiss}>
            <div
                className="showdown-modal"
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-label="Hand Results"
            >
                <div className="showdown-header">
                    <h2>{isFoldWin ? "All Opponents Folded" : "Showdown"}</h2>
                    <span className="showdown-hand-num">Hand #{handResult.handNumber}</span>
                </div>

                <div className="showdown-content">
                    {/* Pot */}
                    <div className="showdown-pot">
                        <span className="pot-label">Final Pot</span>
                        <span className="pot-value">{totalPot.toLocaleString()}</span>
                    </div>

                    {/* Community Cards */}
                    <div className="showdown-board">
                        <h3>Board</h3>
                        <div className="showdown-cards community">
                            {communityCards.length > 0 ? (
                                communityCards.map((cardValue, idx) => (
                                    <CardDisplay key={idx} value={cardValue} delay={idx * 0.1} />
                                ))
                            ) : (
                                <span className="no-cards">No community cards dealt</span>
                            )}
                            {/* Fill empty slots */}
                            {Array.from({ length: Math.max(0, 5 - communityCards.length) }).map((_, idx) => (
                                <div key={`empty-${idx}`} className="showdown-card-slot" />
                            ))}
                        </div>
                    </div>

                    {/* Winners Section */}
                    <div className="showdown-winners">
                        <h3>Winner{winnerSeats.length > 1 ? "s" : ""}</h3>
                        <div className="winner-list">
                            {winnerSeats.map((seatIdx, i) => {
                                const winnerAddr = winnerPlayers[i] || "";
                                const displayAddr = winnerAddr.length > 10
                                    ? `${winnerAddr.slice(0, 6)}...${winnerAddr.slice(-4)}`
                                    : winnerAddr;
                                const amount = winnerAmounts[i] || 0;

                                // Find hand type for this winner
                                const showdownIdx = showdownSeats.indexOf(seatIdx);
                                const handType = showdownIdx >= 0 ? showdownHandTypes[showdownIdx] : 0;

                                return (
                                    <div key={seatIdx} className="winner-item">
                                        <div className="winner-info">
                                            <span className="winner-seat">Seat {seatIdx + 1}</span>
                                            <span className="winner-addr">{displayAddr}</span>
                                            {handType > 0 && (
                                                <span className="winner-hand-type">{getHandTypeName(handType)}</span>
                                            )}
                                        </div>
                                        <span className="winner-amount">+{amount.toLocaleString()}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Player Hands (only for showdowns with revealed cards) */}
                    {!isFoldWin && showdownSeats.length > 0 && (
                        <div className="showdown-hands">
                            <h3>Revealed Hands</h3>
                            <div className="showdown-players">
                                {showdownSeats.map((seatIdx, handIdx) => {
                                    const playerCards = showdownHoleCards[handIdx] || [];
                                    const playerAddr = showdownPlayers[handIdx] || "";
                                    const handType = showdownHandTypes[handIdx] || 0;
                                    const displayAddr = playerAddr.length > 10
                                        ? `${playerAddr.slice(0, 6)}...${playerAddr.slice(-4)}`
                                        : playerAddr;
                                    const playerIsWinner = isWinner(seatIdx);
                                    const winAmount = getWinnerAmount(seatIdx);

                                    return (
                                        <div
                                            key={seatIdx}
                                            className={`showdown-player ${playerIsWinner ? "winner" : ""}`}
                                        >
                                            <div className="player-label">
                                                <span className="seat-num">Seat {seatIdx + 1}</span>
                                                <span className="player-addr">{displayAddr}</span>
                                                {handType > 0 && (
                                                    <span className="hand-type">{getHandTypeName(handType)}</span>
                                                )}
                                            </div>
                                            <div className="showdown-cards hole">
                                                {playerCards.length === 2 ? (
                                                    <>
                                                        <CardDisplay value={playerCards[0]} delay={0.5 + handIdx * 0.2} />
                                                        <CardDisplay value={playerCards[1]} delay={0.6 + handIdx * 0.2} />
                                                    </>
                                                ) : (
                                                    <span className="no-cards">Cards not available</span>
                                                )}
                                            </div>
                                            {playerIsWinner && (
                                                <div className="player-win-badge">
                                                    🏆 +{winAmount.toLocaleString()}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>

                <div className="showdown-footer">
                    <button className="btn btn-primary showdown-dismiss" onClick={onDismiss}>
                        Continue
                    </button>
                </div>
            </div>
        </div>
    );
}

// Simple card display for the modal
function CardDisplay({ value, delay = 0 }: { value: number; delay?: number }) {
    const card = decodeCard(value);
    const isRed = card.suit === "♥" || card.suit === "♦";

    return (
        <div
            className={`showdown-card ${isRed ? "red" : "black"}`}
            style={{ animationDelay: `${delay}s` }}
        >
            <span className="showdown-card-rank">{card.rank}</span>
            <span className="showdown-card-suit">{card.suit}</span>
        </div>
    );
}
