/**
 * TypeScript types for the Texas Hold'em game
 */

export interface TableConfig {
    smallBlind: number;
    bigBlind: number;
    minBuyIn: number;
    maxBuyIn: number;
    ante: number;
    straddleEnabled: boolean;
    feeBasisPoints: number;
}

export interface TableState {
    handNumber: number;
    dealerSeat: number;
    nextBigBlind: number;
    totalFeesCollected: number;
}

export interface SeatInfo {
    player: string | null;
    chips: number;
    sittingOut: boolean;
    currentBet: number;
    status: PlayerStatus;
}

export interface ActionState {
    seatIndex: number;
    playerAddress: string;
    deadline: number;
}

export interface GameState {
    phase: GamePhase;
    potSize: number;
    communityCards: number[];
    currentBets: number[];
    totalInvested: number[];
    playerStatuses: PlayerStatus[];
    minRaise: number;
    maxCurrentBet: number;
    lastAggressor: number;
    actionOn: ActionState | null;
}

export interface Table {
    address: string;
    config: TableConfig;
    state: TableState;
    seats: (SeatInfo | null)[];
    game: GameState | null;
}

export type GamePhase = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;
export type PlayerStatus = 0 | 1 | 2 | 3;

export interface Card {
    value: number;
    rank: string;
    suit: string;
    display: string;
}

export interface PlayerAction {
    type: "fold" | "check" | "call" | "raise" | "all_in" | "straddle";
    amount?: number;
}

export interface HandResult {
    winners: number[];
    amounts: number[];
    handRanking: number;
}
