import { useMemo } from "react";
import { decodeCard, PHASE_NAMES, STATUS_NAMES, GAME_PHASES } from "../config/contracts";
import { decryptHoleCards, getStoredSecret, areCardsValid } from "../utils/cardCrypto";
import type { SeatInfo, GameState } from "../types";
import "./PokerTable.css";

interface PokerTableProps {
    seats: (SeatInfo | null)[];
    gameState: GameState | null;
    dealerSeat: number;
    playerSeat: number | null;
    onSeatSelect?: (seatIndex: number) => void;
    selectedSeat?: number | null;
    encryptedHoleCards?: number[][];
    playersInHand?: number[];
    // New props for decryption
    tableAddress?: string;
    playerAddress?: string;
    handNumber?: number;
}

export function PokerTable({
    seats,
    gameState,
    dealerSeat,
    playerSeat,
    onSeatSelect,
    selectedSeat,
    encryptedHoleCards = [],
    playersInHand = [],
    tableAddress = "",
    playerAddress = "",
    handNumber = 0,
}: PokerTableProps) {
    // Position seats around an oval table (visual positions)
    // Position 0 = bottom center (where the connected player should always be)
    // Position 1 = bottom-left, 2 = top-left, 3 = top-right, 4 = bottom-right
    const seatPositions = [
        { left: "50%", bottom: "-8%", transform: "translateX(-50%)" },     // 0: bottom center (player's seat) - below felt
        { left: "4%", bottom: "22%", transform: "none" },                   // 1: bottom-left
        { left: "12%", top: "2%", transform: "none" },                      // 2: top-left
        { right: "12%", top: "2%", transform: "none" },                     // 3: top-right
        { right: "4%", bottom: "22%", transform: "none" },                  // 4: bottom-right
    ];

    // Calculate rotation offset so player's seat maps to visual position 0 (bottom center)
    // If playerSeat is null, no rotation (default view)
    const rotationOffset = playerSeat !== null ? playerSeat : 0;

    // Get actual seat index from visual position (rotated around the table)
    // This makes the player's seat always appear at the bottom center
    const getActualSeatIdx = (visualPos: number): number => {
        return (visualPos + rotationOffset) % 5;
    };

    const isActionOn = (seatIdx: number) =>
        gameState?.actionOn?.seatIndex === seatIdx;

    // Decrypt player's own hole cards using stored secret
    const decryptedPlayerCards = useMemo(() => {
        if (playerSeat === null || !tableAddress || !playerAddress || handNumber <= 0) {
            return null;
        }

        const handIdx = playersInHand.indexOf(playerSeat);
        if (handIdx === -1 || handIdx >= encryptedHoleCards.length) {
            return null;
        }

        const encryptedCards = encryptedHoleCards[handIdx];
        if (!encryptedCards || encryptedCards.length !== 2) {
            return null;
        }

        // Retrieve the stored secret for this hand
        const secret = getStoredSecret(tableAddress, playerAddress, handNumber);
        if (!secret) {
            console.log("[DEBUG] No stored secret found for decryption");
            return null;
        }

        // Decrypt the cards
        const decrypted = decryptHoleCards(encryptedCards, secret, playerSeat);

        // Validate decryption result
        if (areCardsValid(decrypted)) {
            console.log("[DEBUG] Decrypted cards:", decrypted);
            return decrypted;
        } else {
            console.warn("[DEBUG] Decrypted cards invalid:", decrypted);
            return null;
        }
    }, [playerSeat, tableAddress, playerAddress, handNumber, playersInHand, encryptedHoleCards]);

    // Get hole cards for a specific seat index
    // For player's own seat, returns decrypted cards; for others, returns encrypted (displayed as backs)
    const getHoleCardsForSeat = (seatIdx: number): { cards: number[]; isDecrypted: boolean } => {
        // Cards are only dealt in PREFLOP phase or later (phase >= 3)
        if (!gameState || gameState.phase < GAME_PHASES.PREFLOP) {
            return { cards: [], isDecrypted: false };
        }

        const handIdx = playersInHand.indexOf(seatIdx);
        if (handIdx === -1 || handIdx >= encryptedHoleCards.length) {
            return { cards: [], isDecrypted: false };
        }

        // For player's own seat, use decrypted cards if available
        if (seatIdx === playerSeat && decryptedPlayerCards) {
            return { cards: decryptedPlayerCards, isDecrypted: true };
        }

        // For other seats, return encrypted cards (will be shown as backs)
        return { cards: encryptedHoleCards[handIdx] || [], isDecrypted: false };
    };

    // Create array of visual positions [0,1,2,3,4] and render seats in that order
    // Each visual position maps back to an actual seat index
    const visualPositions = [0, 1, 2, 3, 4];

    return (
        <div className="poker-table-container">
            <div className="poker-table">
                {/* Felt surface */}
                <div className="felt">
                    {/* Pot display */}
                    {gameState && gameState.potSize > 0 && (
                        <div className="pot-display">
                            <span className="pot-label">POT</span>
                            <span className="pot-amount">{gameState.potSize.toLocaleString()}</span>
                        </div>
                    )}

                    {/* Community cards */}
                    <div className="community-cards">
                        {gameState?.communityCards.map((card, idx) => (
                            <Card key={idx} value={card} />
                        ))}
                        {/* Empty card slots */}
                        {Array.from({ length: 5 - (gameState?.communityCards.length || 0) }).map((_, idx) => (
                            <div key={`empty-${idx}`} className="card-slot" />
                        ))}
                    </div>

                    {/* Game phase */}
                    {gameState && (
                        <div className="phase-indicator">
                            {PHASE_NAMES[gameState.phase] || "Unknown"}
                        </div>
                    )}
                </div>

                {/* Seats - rendered by visual position, mapped to actual seat indices */}
                {visualPositions.map((visualPos) => {
                    const actualIdx = getActualSeatIdx(visualPos);
                    const seat = seats[actualIdx];
                    const holeCardData = getHoleCardsForSeat(actualIdx);

                    return (
                        <div
                            key={actualIdx}
                            className={`seat ${seat ? "occupied" : "empty"} ${isActionOn(actualIdx) ? "action-on" : ""} ${actualIdx === playerSeat ? "player-seat" : ""} ${selectedSeat === actualIdx ? "selected" : ""}`}
                            style={seatPositions[visualPos]}
                            onClick={() => !seat && onSeatSelect?.(actualIdx)}
                            onKeyDown={(event) => {
                                if (!seat && onSeatSelect && (event.key === "Enter" || event.key === " ")) {
                                    event.preventDefault();
                                    onSeatSelect(actualIdx);
                                }
                            }}
                            role={!seat && onSeatSelect ? "button" : undefined}
                            tabIndex={!seat && onSeatSelect ? 0 : undefined}
                        >
                            {actualIdx === dealerSeat && <div className="dealer-button">D</div>}

                            {seat ? (
                                <div className="seat-content">
                                    {/* Hole cards display */}
                                    {holeCardData.cards.length === 2 && (
                                        <div className="hole-cards">
                                            {/* Show face-up cards for own seat (if decrypted) or at showdown, otherwise show card backs */}
                                            {(actualIdx === playerSeat && holeCardData.isDecrypted) || gameState?.phase === GAME_PHASES.SHOWDOWN ? (
                                                <>
                                                    <Card value={holeCardData.cards[0]} size="small" />
                                                    <Card value={holeCardData.cards[1]} size="small" />
                                                </>
                                            ) : (
                                                <>
                                                    <Card value={0} size="small" faceDown />
                                                    <Card value={0} size="small" faceDown />
                                                </>
                                            )}
                                        </div>
                                    )}

                                    <div className="player-avatar">
                                        {(seat.player ?? "").slice(2, 4).toUpperCase()}
                                    </div>
                                    <div className="player-info">
                                        <span className="player-address">
                                            {(seat.player ?? "").slice(0, 6)}...{(seat.player ?? "").slice(-4)}
                                        </span>
                                        <span className="player-chips">{seat.chips.toLocaleString()}</span>
                                    </div>
                                    <div className="player-status">
                                        {seat.sittingOut ? "Sitting Out" : STATUS_NAMES[seat.status]}
                                    </div>
                                    {seat.currentBet > 0 && (
                                        <div className="player-bet">{seat.currentBet}</div>
                                    )}
                                </div>
                            ) : (
                                <div className="empty-seat">
                                    <span>Seat {actualIdx + 1}</span>
                                    <span className="join-hint">Click to join</span>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

function Card({ value, size = "normal", faceDown = false }: { value: number; size?: "normal" | "small"; faceDown?: boolean }) {
    // Render card back
    if (faceDown) {
        return (
            <div className={`poker-card poker-card-back ${size === "small" ? "poker-card-small" : ""}`}>
                <div className="poker-card-back-pattern" />
            </div>
        );
    }

    const card = decodeCard(value);
    const isRed = card.suit === "♥" || card.suit === "♦";
    const suitColor = isRed ? "red" : "black";

    // Get pip count for number cards
    const getPipCount = (rank: string): number => {
        const num = parseInt(rank, 10);
        if (!isNaN(num)) return num;
        if (rank === "A") return 1;
        return 0; // Face cards
    };

    const isFaceCard = ["K", "Q", "J"].includes(card.rank);
    const isAce = card.rank === "A";
    const pipCount = getPipCount(card.rank);

    // Render pip pattern for number cards
    const renderPips = () => {
        if (isFaceCard || isAce) return null;

        // Pip positions for each count (relative positions 0-100%)
        const pipLayouts: Record<number, { x: number; y: number }[]> = {
            2: [
                { x: 50, y: 20 },
                { x: 50, y: 80 },
            ],
            3: [
                { x: 50, y: 20 },
                { x: 50, y: 50 },
                { x: 50, y: 80 },
            ],
            4: [
                { x: 30, y: 20 },
                { x: 70, y: 20 },
                { x: 30, y: 80 },
                { x: 70, y: 80 },
            ],
            5: [
                { x: 30, y: 20 },
                { x: 70, y: 20 },
                { x: 50, y: 50 },
                { x: 30, y: 80 },
                { x: 70, y: 80 },
            ],
            6: [
                { x: 30, y: 20 },
                { x: 70, y: 20 },
                { x: 30, y: 50 },
                { x: 70, y: 50 },
                { x: 30, y: 80 },
                { x: 70, y: 80 },
            ],
            7: [
                { x: 30, y: 20 },
                { x: 70, y: 20 },
                { x: 50, y: 35 },
                { x: 30, y: 50 },
                { x: 70, y: 50 },
                { x: 30, y: 80 },
                { x: 70, y: 80 },
            ],
            8: [
                { x: 30, y: 20 },
                { x: 70, y: 20 },
                { x: 50, y: 35 },
                { x: 30, y: 50 },
                { x: 70, y: 50 },
                { x: 50, y: 65 },
                { x: 30, y: 80 },
                { x: 70, y: 80 },
            ],
            9: [
                { x: 30, y: 16 },
                { x: 70, y: 16 },
                { x: 30, y: 38 },
                { x: 70, y: 38 },
                { x: 50, y: 50 },
                { x: 30, y: 62 },
                { x: 70, y: 62 },
                { x: 30, y: 84 },
                { x: 70, y: 84 },
            ],
            10: [
                { x: 30, y: 16 },
                { x: 70, y: 16 },
                { x: 50, y: 28 },
                { x: 30, y: 40 },
                { x: 70, y: 40 },
                { x: 30, y: 60 },
                { x: 70, y: 60 },
                { x: 50, y: 72 },
                { x: 30, y: 84 },
                { x: 70, y: 84 },
            ],
        };

        const positions = pipLayouts[pipCount] || [];
        return positions.map((pos, i) => (
            <span
                key={i}
                className="poker-card-pip"
                style={{
                    position: "absolute",
                    left: `${pos.x}%`,
                    top: `${pos.y}%`,
                    transform: `translate(-50%, -50%)${pos.y > 50 ? " rotate(180deg)" : ""}`,
                }}
            >
                {card.suit}
            </span>
        ));
    };

    return (
        <div className={`poker-card ${suitColor} ${size === "small" ? "poker-card-small" : ""}`}>
            {/* Top-left corner */}
            <div className="poker-card-corner poker-card-corner-tl">
                <span className="poker-card-corner-rank">{card.rank}</span>
                <span className="poker-card-corner-suit">{card.suit}</span>
            </div>

            {/* Center content */}
            <div className="poker-card-center">
                {isAce && <span className="poker-card-ace-suit">{card.suit}</span>}
                {isFaceCard && (
                    <div className="poker-card-face">
                        <span className="poker-card-face-letter">{card.rank}</span>
                        <span className="poker-card-face-suit">{card.suit}</span>
                    </div>
                )}
                {!isFaceCard && !isAce && renderPips()}
            </div>

            {/* Bottom-right corner (inverted) */}
            <div className="poker-card-corner poker-card-corner-br">
                <span className="poker-card-corner-rank">{card.rank}</span>
                <span className="poker-card-corner-suit">{card.suit}</span>
            </div>
        </div>
    );
}


