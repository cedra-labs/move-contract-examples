/**
 * Contract interaction hooks for Texas Hold'em
 * Uses Cedra Labs SDK for blockchain interaction
 */

import { useWallet } from "../components/wallet-provider";
import { Cedra, CedraConfig, Network } from "@cedra-labs/ts-sdk";
import { useCallback } from "react";
import { MODULES } from "../config/contracts";
import type { TableConfig, SeatInfo, GameState, ActionState, TableState } from "../types";

// Configure Cedra client for testnet
const config = new CedraConfig({
    network: Network.TESTNET,
});

const cedra = new Cedra(config);

/**
 * Normalize a Cedra SDK response to a number array.
 * Handles: Array, Uint8Array, hex strings, { vec: [...] } objects, or nested arrays.
 */
function normalizeU8Vector(value: unknown): number[] {
    // Already a plain array
    if (Array.isArray(value)) {
        return value.map((v) => {
            if (typeof v === "string") return parseInt(v, 10);
            if (typeof v === "number") return v;
            return 0;
        });
    }

    // Uint8Array (common from Cedra SDK)
    if (value instanceof Uint8Array) {
        return Array.from(value);
    }

    // Object with vec property (Move vector representation)
    if (value && typeof value === "object" && "vec" in value) {
        return normalizeU8Vector((value as { vec: unknown }).vec);
    }

    // Hex string (0x prefix)
    if (typeof value === "string" && value.startsWith("0x")) {
        const hex = value.slice(2);
        const bytes: number[] = [];
        for (let i = 0; i < hex.length; i += 2) {
            bytes.push(parseInt(hex.slice(i, i + 2), 16));
        }
        return bytes;
    }

    // Plain hex string (no prefix)
    if (typeof value === "string" && /^[0-9a-fA-F]+$/.test(value) && value.length % 2 === 0) {
        const bytes: number[] = [];
        for (let i = 0; i < value.length; i += 2) {
            bytes.push(parseInt(value.slice(i, i + 2), 16));
        }
        return bytes;
    }

    // Debug log for unexpected formats
    console.warn("normalizeU8Vector: unexpected format", typeof value, value);
    return [];
}

/**
 * Normalize nested vector (vector<vector<u8>>) to number[][].
 * For hole cards returns array of player card arrays.
 */
function normalizeNestedU8Vectors(value: unknown): number[][] {
    // Already a plain array of arrays
    if (Array.isArray(value)) {
        return value.map((inner) => normalizeU8Vector(inner));
    }

    // Object with vec property
    if (value && typeof value === "object" && "vec" in value) {
        return normalizeNestedU8Vectors((value as { vec: unknown }).vec);
    }

    console.warn("normalizeNestedU8Vectors: unexpected format", typeof value, value);
    return [];
}

/**
 * Normalize vector<bool> to boolean[].
 */
function normalizeBoolVector(value: unknown): boolean[] {
    if (Array.isArray(value)) {
        return value.map((v) => {
            if (typeof v === "boolean") return v;
            if (typeof v === "number") return v !== 0;
            if (typeof v === "string") return v === "true" || v === "1";
            return Boolean(v);
        });
    }

    if (value instanceof Uint8Array) {
        return Array.from(value).map((v) => v !== 0);
    }

    if (value && typeof value === "object" && "vec" in value) {
        return normalizeBoolVector((value as { vec: unknown }).vec);
    }

    console.warn("normalizeBoolVector: unexpected format", typeof value, value);
    return [];
}

/**
 * Hook for reading table data from the contract
 */
export function useTableView() {
    const getTableConfig = useCallback(async (tableAddress: string): Promise<TableConfig> => {
        const result = await cedra.view({
            payload: {
                function: `${MODULES.TEXAS_HOLDEM}::get_table_config_full`,
                functionArguments: [tableAddress],
            },
        });

        const [sb, bb, min, max, ante, straddle, feeBps] = result as [string, string, string, string, string, boolean, string];

        return {
            smallBlind: parseInt(sb),
            bigBlind: parseInt(bb),
            minBuyIn: parseInt(min),
            maxBuyIn: parseInt(max),
            ante: parseInt(ante),
            straddleEnabled: straddle,
            feeBasisPoints: parseInt(feeBps),
        };
    }, []);

    const getTableState = useCallback(async (tableAddress: string): Promise<TableState> => {
        const result = await cedra.view({
            payload: {
                function: `${MODULES.TEXAS_HOLDEM}::get_table_state`,
                functionArguments: [tableAddress],
            },
        });

        const [handNum, dealer, nextBb, fees] = result as [string, string, string, string];

        return {
            handNumber: parseInt(handNum),
            dealerSeat: parseInt(dealer),
            nextBigBlind: parseInt(nextBb),
            totalFeesCollected: parseInt(fees),
        };
    }, []);

    const getSeatInfo = useCallback(async (tableAddress: string, seatIndex: number): Promise<SeatInfo | null> => {
        try {
            const result = await cedra.view({
                payload: {
                    function: `${MODULES.TEXAS_HOLDEM}::get_seat_info_full`,
                    functionArguments: [tableAddress, seatIndex.toString()],
                },
            });

            const [player, chips, sittingOut, bet, status] = result as [string, string, boolean, string, string];

            if (player === "0x0" || player === "") {
                return null;
            }

            return {
                player,
                chips: parseInt(chips),
                sittingOut,
                currentBet: parseInt(bet),
                status: parseInt(status) as 0 | 1 | 2 | 3,
            };
        } catch {
            return null;
        }
    }, []);

    const getAllSeats = useCallback(async (tableAddress: string): Promise<(SeatInfo | null)[]> => {
        const seats: (SeatInfo | null)[] = [];
        for (let i = 0; i < 5; i++) {
            const seat = await getSeatInfo(tableAddress, i);
            seats.push(seat);
        }
        return seats;
    }, [getSeatInfo]);

    const getGamePhase = useCallback(async (tableAddress: string): Promise<number> => {
        const result = await cedra.view({
            payload: {
                function: `${MODULES.TEXAS_HOLDEM}::get_game_phase`,
                functionArguments: [tableAddress],
            },
        });
        return parseInt(result[0] as string);
    }, []);

    const getPotSize = useCallback(async (tableAddress: string): Promise<number> => {
        const result = await cedra.view({
            payload: {
                function: `${MODULES.TEXAS_HOLDEM}::get_pot_size`,
                functionArguments: [tableAddress],
            },
        });
        return parseInt(result[0] as string);
    }, []);

    const getCommunityCards = useCallback(async (tableAddress: string): Promise<number[]> => {
        try {
            const result = await cedra.view({
                payload: {
                    function: `${MODULES.TEXAS_HOLDEM}::get_community_cards`,
                    functionArguments: [tableAddress],
                },
            });
            // Debug log to trace the raw response
            console.log("[DEBUG] getCommunityCards raw result:", result[0]);
            return normalizeU8Vector(result[0]);
        } catch (e) {
            console.warn("Failed to get community cards:", e);
            return [];
        }
    }, []);

    const getActionOn = useCallback(async (tableAddress: string): Promise<ActionState | null> => {
        try {
            const result = await cedra.view({
                payload: {
                    function: `${MODULES.TEXAS_HOLDEM}::get_action_on`,
                    functionArguments: [tableAddress],
                },
            });

            const [seatIdx, playerAddr, deadline] = result as [string, string, string];

            return {
                seatIndex: parseInt(seatIdx),
                playerAddress: playerAddr,
                deadline: parseInt(deadline),
            };
        } catch {
            return null;
        }
    }, []);

    const getCurrentBets = useCallback(async (tableAddress: string): Promise<number[]> => {
        try {
            const result = await cedra.view({
                payload: {
                    function: `${MODULES.TEXAS_HOLDEM}::get_current_bets`,
                    functionArguments: [tableAddress],
                },
            });
            return normalizeU8Vector(result[0]);
        } catch (e) {
            console.warn("Failed to get current bets:", e);
            return [];
        }
    }, []);

    const getPlayerStatuses = useCallback(async (tableAddress: string): Promise<number[]> => {
        try {
            const result = await cedra.view({
                payload: {
                    function: `${MODULES.TEXAS_HOLDEM}::get_player_statuses`,
                    functionArguments: [tableAddress],
                },
            });
            return normalizeU8Vector(result[0]);
        } catch (e) {
            console.warn("Failed to get player statuses:", e);
            return [];
        }
    }, []);

    const getMinRaise = useCallback(async (tableAddress: string): Promise<number> => {
        const result = await cedra.view({
            payload: {
                function: `${MODULES.TEXAS_HOLDEM}::get_min_raise`,
                functionArguments: [tableAddress],
            },
        });
        return parseInt(result[0] as string);
    }, []);

    const getCallAmount = useCallback(async (tableAddress: string, seatIndex: number): Promise<number> => {
        const result = await cedra.view({
            payload: {
                function: `${MODULES.TEXAS_HOLDEM}::get_call_amount`,
                functionArguments: [tableAddress, seatIndex.toString()],
            },
        });
        return parseInt(result[0] as string);
    }, []);

    const getFullGameState = useCallback(async (tableAddress: string): Promise<GameState> => {
        const [phase, potSize, communityCards, currentBets, statuses, minRaise, actionOn] = await Promise.all([
            getGamePhase(tableAddress),
            getPotSize(tableAddress),
            getCommunityCards(tableAddress),
            getCurrentBets(tableAddress),
            getPlayerStatuses(tableAddress),
            getMinRaise(tableAddress),
            getActionOn(tableAddress),
        ]);

        // Get max current bet from current bets
        const maxCurrentBet = Math.max(...currentBets, 0);

        return {
            phase: phase as 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7,
            potSize,
            communityCards,
            currentBets,
            totalInvested: currentBets, // Simplified for now
            playerStatuses: statuses as (0 | 1 | 2 | 3)[],
            minRaise,
            maxCurrentBet,
            lastAggressor: 0, // Would need another call
            actionOn,
        };
    }, [getGamePhase, getPotSize, getCommunityCards, getCurrentBets, getPlayerStatuses, getMinRaise, getActionOn]);

    const isPaused = useCallback(async (tableAddress: string): Promise<boolean> => {
        try {
            const result = await cedra.view({
                payload: {
                    function: `${MODULES.TEXAS_HOLDEM}::is_paused`,
                    functionArguments: [tableAddress],
                },
            });
            return result[0] as boolean;
        } catch {
            return false;
        }
    }, []);

    const isAdminOnlyStart = useCallback(async (tableAddress: string): Promise<boolean> => {
        try {
            const result = await cedra.view({
                payload: {
                    function: `${MODULES.TEXAS_HOLDEM}::is_admin_only_start`,
                    functionArguments: [tableAddress],
                },
            });
            return result[0] as boolean;
        } catch {
            return false;
        }
    }, []);

    const getAdmin = useCallback(async (tableAddress: string): Promise<string> => {
        try {
            const result = await cedra.view({
                payload: {
                    function: `${MODULES.TEXAS_HOLDEM}::get_admin`,
                    functionArguments: [tableAddress],
                },
            });
            return result[0] as string;
        } catch {
            return "";
        }
    }, []);

    const getPendingLeaves = useCallback(async (tableAddress: string): Promise<boolean[]> => {
        try {
            const result = await cedra.view({
                payload: {
                    function: `${MODULES.TEXAS_HOLDEM}::get_pending_leaves`,
                    functionArguments: [tableAddress],
                },
            });
            const leaves = result[0];
            // Handle different response formats
            if (Array.isArray(leaves)) {
                return leaves.map((v) => Boolean(v));
            }
            if (leaves && typeof leaves === "object" && "vec" in leaves) {
                const vec = (leaves as { vec: unknown[] }).vec;
                return Array.isArray(vec) ? vec.map((v) => Boolean(v)) : [false, false, false, false, false];
            }
            return [false, false, false, false, false];
        } catch {
            return [false, false, false, false, false];
        }
    }, []);

    const getSeatCount = useCallback(async (tableAddress: string): Promise<{ occupied: number; total: number }> => {
        try {
            const result = await cedra.view({
                payload: {
                    function: `${MODULES.TEXAS_HOLDEM}::get_seat_count`,
                    functionArguments: [tableAddress],
                },
            });
            const [occupied, total] = result as [string, string];
            return { occupied: parseInt(occupied), total: parseInt(total) };
        } catch {
            return { occupied: 0, total: 5 };
        }
    }, []);

    const getEncryptedHoleCards = useCallback(async (tableAddress: string): Promise<number[][]> => {
        try {
            const result = await cedra.view({
                payload: {
                    function: `${MODULES.TEXAS_HOLDEM}::get_encrypted_hole_cards`,
                    functionArguments: [tableAddress],
                },
            });
            // Debug log to trace the raw response
            console.log("[DEBUG] getEncryptedHoleCards raw result:", result[0]);
            return normalizeNestedU8Vectors(result[0]);
        } catch (e) {
            console.warn("Failed to get encrypted hole cards:", e);
            return [];
        }
    }, []);

    const getPlayersInHand = useCallback(async (tableAddress: string): Promise<number[]> => {
        try {
            const result = await cedra.view({
                payload: {
                    function: `${MODULES.TEXAS_HOLDEM}::get_players_in_hand`,
                    functionArguments: [tableAddress],
                },
            });
            // Debug log to trace the raw response
            console.log("[DEBUG] getPlayersInHand raw result:", result[0]);
            return normalizeU8Vector(result[0]);
        } catch (e) {
            console.warn("Failed to get players in hand:", e);
            return [];
        }
    }, []);

    const getCommitStatus = useCallback(async (tableAddress: string): Promise<boolean[]> => {
        try {
            const result = await cedra.view({
                payload: {
                    function: `${MODULES.TEXAS_HOLDEM}::get_commit_status`,
                    functionArguments: [tableAddress],
                },
            });
            return normalizeBoolVector(result[0]);
        } catch (e) {
            console.warn("Failed to get commit status:", e);
            return [];
        }
    }, []);

    return {
        getTableConfig,
        getTableState,
        getSeatInfo,
        getAllSeats,
        getGamePhase,
        getPotSize,
        getCommunityCards,
        getActionOn,
        getCurrentBets,
        getPlayerStatuses,
        getMinRaise,
        getCallAmount,
        getFullGameState,
        isPaused,
        isAdminOnlyStart,
        getAdmin,
        getPendingLeaves,
        getSeatCount,
        getEncryptedHoleCards,
        getPlayersInHand,
        getCommitStatus,
    };
}

/**
 * Hook for reading chip balance
 */
export function useChipsView() {
    const { account } = useWallet();

    const getBalance = useCallback(async (address?: string): Promise<number> => {
        const addr = address || account?.address?.toString();
        if (!addr) return 0;

        try {
            const result = await cedra.view({
                payload: {
                    function: `${MODULES.CHIPS}::balance`,
                    functionArguments: [addr],
                },
            });
            return parseInt(result[0] as string);
        } catch {
            return 0;
        }
    }, [account?.address]);

    const getTreasuryBalance = useCallback(async (): Promise<number> => {
        const result = await cedra.view({
            payload: {
                function: `${MODULES.CHIPS}::get_treasury_balance`,
                functionArguments: [],
            },
        });
        return parseInt(result[0] as string);
    }, []);

    const getCedraBalance = useCallback(async (address?: string): Promise<number> => {
        const addr = address || account?.address?.toString();
        if (!addr) return 0;

        try {
            return await cedra.getAccountCEDRAAmount({ accountAddress: addr });
        } catch {
            return 0;
        }
    }, [account?.address]);

    return { getBalance, getTreasuryBalance, getCedraBalance };
}

/**
 * Hook for fetching blockchain events
 */
export function useEventView() {
    /**
     * Fetch HandResult events for a specific table address
     * Returns the most recent hand result events
     */
    const getHandResultEvents = useCallback(async (tableAddress: string, limit: number = 1) => {
        try {
            // Event type format: contract_address::module::EventName
            // Events are stored at the contract/module address, not the table address
            const eventType = `${MODULES.POKER_EVENTS}::HandResult`;

            console.log("DEBUG: Fetching events for type:", eventType, "table:", tableAddress);

            // Use the Cedra SDK to fetch events filtered by event type
            const events = await cedra.getEvents({
                options: {
                    limit: limit * 10, // Fetch more and filter client-side for the specific table
                    orderBy: [{ transaction_version: "desc" }],
                    where: {
                        indexed_type: { _eq: eventType }
                    }
                }
            });

            console.log("DEBUG: Raw events fetched:", events.length, events);

            // Filter events for this specific table and transform to our interface
            const tableEvents = events
                .filter((event: { data: Record<string, unknown> }) => {
                    const eventTableAddr = String(event.data.table_addr || "").toLowerCase();
                    return eventTableAddr === tableAddress.toLowerCase();
                })
                .slice(0, limit)
                .map((event: { data: Record<string, unknown>; transaction_version?: string }) => ({
                    tableAddr: String(event.data.table_addr || tableAddress),
                    handNumber: parseInt(String(event.data.hand_number || "0")),
                    timestamp: parseInt(String(event.data.timestamp || "0")),
                    communityCards: normalizeU8Vector(event.data.community_cards),
                    showdownSeats: (event.data.showdown_seats as string[] || []).map((s: string) => parseInt(s)),
                    showdownPlayers: (event.data.showdown_players as string[]) || [],
                    showdownHoleCards: ((event.data.showdown_hole_cards as unknown[][]) || []).map((cards: unknown) => normalizeU8Vector(cards)),
                    showdownHandTypes: normalizeU8Vector(event.data.showdown_hand_types),
                    winnerSeats: (event.data.winner_seats as string[] || []).map((s: string) => parseInt(s)),
                    winnerPlayers: (event.data.winner_players as string[]) || [],
                    winnerAmounts: (event.data.winner_amounts as string[] || []).map((a: string) => parseInt(a)),
                    totalPot: parseInt(String(event.data.total_pot || "0")),
                    totalFees: parseInt(String(event.data.total_fees || "0")),
                    resultType: parseInt(String(event.data.result_type || "0")),
                }));

            console.log("DEBUG: Filtered table events:", tableEvents);
            return tableEvents;
        } catch (err) {
            console.error("Failed to fetch HandResult events:", err);
            return [];
        }
    }, []);

    return { getHandResultEvents };
}

/**
 * Hook for executing contract transactions
 */
export function useContractActions() {
    const { signAndSubmitTransaction, account } = useWallet();

    const executeTransaction = useCallback(
        async (functionId: string, args: (string | number | boolean | Uint8Array)[]) => {
            if (!account) throw new Error("Wallet not connected");

            // Convert Uint8Array to array of numbers for vector<u8> params
            const serializedArgs = args.map((a) => {
                if (a instanceof Uint8Array) {
                    return Array.from(a);
                }
                return a;
            });

            const response = await signAndSubmitTransaction({
                data: {
                    function: functionId as `${string}::${string}::${string}`,
                    functionArguments: serializedArgs,
                },
            });

            // Wait for transaction confirmation
            const receipt = await cedra.waitForTransaction({ transactionHash: response.hash });

            return { hash: response.hash, result: receipt };
        },
        [signAndSubmitTransaction, account]
    );

    // Chip actions
    const buyChips = useCallback(
        (cedraAmount: number) => executeTransaction(`${MODULES.CHIPS}::buy_chips`, [cedraAmount]),
        [executeTransaction]
    );

    const cashOut = useCallback(
        (chipAmount: number) => executeTransaction(`${MODULES.CHIPS}::cash_out`, [chipAmount]),
        [executeTransaction]
    );

    // Table management
    const createTable = useCallback(
        (sb: number, bb: number, min: number, max: number, ante: number, straddleEnabled: boolean) =>
            executeTransaction(`${MODULES.TEXAS_HOLDEM}::create_table`, [sb, bb, min, max, ante, straddleEnabled]),
        [executeTransaction]
    );

    const joinTable = useCallback(
        (tableAddress: string, seatIndex: number, buyIn: number) =>
            executeTransaction(`${MODULES.TEXAS_HOLDEM}::join_table`, [tableAddress, seatIndex, buyIn]),
        [executeTransaction]
    );

    const leaveTable = useCallback(
        (tableAddress: string) => executeTransaction(`${MODULES.TEXAS_HOLDEM}::leave_table`, [tableAddress]),
        [executeTransaction]
    );

    // Player controls
    const sitOut = useCallback(
        (tableAddress: string) => executeTransaction(`${MODULES.TEXAS_HOLDEM}::sit_out`, [tableAddress]),
        [executeTransaction]
    );

    const sitIn = useCallback(
        (tableAddress: string) => executeTransaction(`${MODULES.TEXAS_HOLDEM}::sit_in`, [tableAddress]),
        [executeTransaction]
    );

    const topUp = useCallback(
        (tableAddress: string, amount: number) => executeTransaction(`${MODULES.TEXAS_HOLDEM}::top_up`, [tableAddress, amount]),
        [executeTransaction]
    );

    // Hand lifecycle
    const startHand = useCallback(
        (tableAddress: string) => executeTransaction(`${MODULES.TEXAS_HOLDEM}::start_hand`, [tableAddress]),
        [executeTransaction]
    );

    const submitCommit = useCallback(
        (tableAddress: string, hash: Uint8Array) => executeTransaction(`${MODULES.TEXAS_HOLDEM}::submit_commit`, [tableAddress, hash]),
        [executeTransaction]
    );

    const revealSecret = useCallback(
        (tableAddress: string, secret: Uint8Array) => executeTransaction(`${MODULES.TEXAS_HOLDEM}::reveal_secret`, [tableAddress, secret]),
        [executeTransaction]
    );

    // Player actions
    const fold = useCallback(
        (tableAddress: string) => executeTransaction(`${MODULES.TEXAS_HOLDEM}::fold`, [tableAddress]),
        [executeTransaction]
    );

    const check = useCallback(
        (tableAddress: string) => executeTransaction(`${MODULES.TEXAS_HOLDEM}::check`, [tableAddress]),
        [executeTransaction]
    );

    const call = useCallback(
        (tableAddress: string) => executeTransaction(`${MODULES.TEXAS_HOLDEM}::call`, [tableAddress]),
        [executeTransaction]
    );

    const raiseTo = useCallback(
        (tableAddress: string, amount: number) => executeTransaction(`${MODULES.TEXAS_HOLDEM}::raise_to`, [tableAddress, amount]),
        [executeTransaction]
    );

    const allIn = useCallback(
        (tableAddress: string) => executeTransaction(`${MODULES.TEXAS_HOLDEM}::all_in`, [tableAddress]),
        [executeTransaction]
    );

    const straddle = useCallback(
        (tableAddress: string) => executeTransaction(`${MODULES.TEXAS_HOLDEM}::straddle`, [tableAddress]),
        [executeTransaction]
    );

    // Leave after hand controls
    const leaveAfterHand = useCallback(
        (tableAddress: string) => executeTransaction(`${MODULES.TEXAS_HOLDEM}::leave_after_hand`, [tableAddress]),
        [executeTransaction]
    );

    const cancelLeaveAfterHand = useCallback(
        (tableAddress: string) => executeTransaction(`${MODULES.TEXAS_HOLDEM}::cancel_leave_after_hand`, [tableAddress]),
        [executeTransaction]
    );

    // Admin controls
    const pauseTable = useCallback(
        (tableAddress: string) => executeTransaction(`${MODULES.TEXAS_HOLDEM}::pause_table`, [tableAddress]),
        [executeTransaction]
    );

    const resumeTable = useCallback(
        (tableAddress: string) => executeTransaction(`${MODULES.TEXAS_HOLDEM}::resume_table`, [tableAddress]),
        [executeTransaction]
    );

    const kickPlayer = useCallback(
        (tableAddress: string, seatIndex: number) =>
            executeTransaction(`${MODULES.TEXAS_HOLDEM}::kick_player`, [tableAddress, seatIndex]),
        [executeTransaction]
    );

    const forceSitOut = useCallback(
        (tableAddress: string, seatIndex: number) =>
            executeTransaction(`${MODULES.TEXAS_HOLDEM}::force_sit_out`, [tableAddress, seatIndex]),
        [executeTransaction]
    );

    const toggleAdminOnlyStart = useCallback(
        (tableAddress: string, enabled: boolean) =>
            executeTransaction(`${MODULES.TEXAS_HOLDEM}::toggle_admin_only_start`, [tableAddress, enabled]),
        [executeTransaction]
    );

    const updateBlinds = useCallback(
        (tableAddress: string, smallBlind: number, bigBlind: number) =>
            executeTransaction(`${MODULES.TEXAS_HOLDEM}::update_blinds`, [tableAddress, smallBlind, bigBlind]),
        [executeTransaction]
    );

    const updateBuyInLimits = useCallback(
        (tableAddress: string, minBuyIn: number, maxBuyIn: number) =>
            executeTransaction(`${MODULES.TEXAS_HOLDEM}::update_buy_in_limits`, [tableAddress, minBuyIn, maxBuyIn]),
        [executeTransaction]
    );

    const closeTable = useCallback(
        (tableAddress: string) => executeTransaction(`${MODULES.TEXAS_HOLDEM}::close_table`, [tableAddress]),
        [executeTransaction]
    );

    const emergencyAbort = useCallback(
        (tableAddress: string) => executeTransaction(`${MODULES.TEXAS_HOLDEM}::emergency_abort`, [tableAddress]),
        [executeTransaction]
    );

    const handleTimeout = useCallback(
        (tableAddress: string) => executeTransaction(`${MODULES.TEXAS_HOLDEM}::handle_timeout`, [tableAddress]),
        [executeTransaction]
    );

    return {
        // Chips
        buyChips,
        cashOut,
        // Table management
        createTable,
        joinTable,
        leaveTable,
        // Player controls
        sitOut,
        sitIn,
        topUp,
        leaveAfterHand,
        cancelLeaveAfterHand,
        // Hand lifecycle
        startHand,
        submitCommit,
        revealSecret,
        handleTimeout,
        // Player actions
        fold,
        check,
        call,
        raiseTo,
        allIn,
        straddle,
        // Admin controls
        pauseTable,
        resumeTable,
        kickPlayer,
        forceSitOut,
        toggleAdminOnlyStart,
        updateBlinds,
        updateBuyInLimits,
        closeTable,
        emergencyAbort,
    };
}

export { cedra };
