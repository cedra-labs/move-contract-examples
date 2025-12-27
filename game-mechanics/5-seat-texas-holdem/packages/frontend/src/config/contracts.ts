/**
 * Contract configuration for the Texas Hold'em game
 */

// Deployed contract address on Cedra testnet (v7 profile - fresh deployment with close_table fix)
export const CONTRACT_ADDRESS = "0xa24365cad90b74eca7f078f8c91b327c0716bcea3ed64dc9d97027b605b4fcfa";

// Module names
export const MODULES = {
    TEXAS_HOLDEM: `${CONTRACT_ADDRESS}::texas_holdem`,
    CHIPS: `${CONTRACT_ADDRESS}::chips`,
    HAND_EVAL: `${CONTRACT_ADDRESS}::hand_eval`,
    POT_MANAGER: `${CONTRACT_ADDRESS}::pot_manager`,
    POKER_EVENTS: `${CONTRACT_ADDRESS}::poker_events`,
} as const;

// Game phases
export const GAME_PHASES = {
    WAITING: 0,
    COMMIT: 1,
    REVEAL: 2,
    PREFLOP: 3,
    FLOP: 4,
    TURN: 5,
    RIVER: 6,
    SHOWDOWN: 7,
} as const;

export const PHASE_NAMES: Record<number, string> = {
    0: "Waiting",
    1: "Request Cards",
    2: "Accept Cards",
    3: "Pre-Flop",
    4: "Flop",
    5: "Turn",
    6: "River",
    7: "Showdown",
};

// Player status
export const PLAYER_STATUS = {
    WAITING: 0,
    ACTIVE: 1,
    FOLDED: 2,
    ALL_IN: 3,
} as const;

export const STATUS_NAMES: Record<number, string> = {
    0: "Waiting",
    1: "Active",
    2: "Folded",
    3: "All-In",
};

// Card encoding helpers
export const SUITS = ["♣", "♦", "♥", "♠"] as const;
export const RANKS = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"] as const;

export function decodeCard(cardValue: number): { rank: string; suit: string; display: string } {
    const suit = Math.floor(cardValue / 13);
    const rank = cardValue % 13;
    return {
        rank: RANKS[rank],
        suit: SUITS[suit],
        display: `${RANKS[rank]}${SUITS[suit]}`,
    };
}

// Hand ranking names
export const HAND_RANKINGS = [
    "High Card",
    "One Pair",
    "Two Pair",
    "Three of a Kind",
    "Straight",
    "Flush",
    "Full House",
    "Four of a Kind",
    "Straight Flush",
    "Royal Flush",
] as const;

// Exchange rate
export const CHIPS_PER_CEDRA = 1000;

// Timeouts
export const ACTION_TIMEOUT_SECS = 60;
export const COMMIT_TIMEOUT_SECS = 120;
export const REVEAL_TIMEOUT_SECS = 120;

// Fee
export const FEE_BASIS_POINTS = 50; // 0.5%
