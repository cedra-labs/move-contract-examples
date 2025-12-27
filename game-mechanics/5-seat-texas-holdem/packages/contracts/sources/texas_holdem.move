/// Casino-Grade 5-Seat Texas Hold'em
/// 
/// A fully on-chain Texas Hold'em poker game with:
/// - Configurable blinds (small/big)
/// - 4 betting rounds (pre-flop, flop, turn, river)
/// - All player actions (fold, check, call, raise, all-in)
/// - Side pots and pot distribution
/// - Full poker hand evaluation
/// - Commit-reveal card shuffling
module holdemgame::texas_holdem {
    use std::vector;
    use std::signer;
    use std::option::{Self, Option};
    use cedra_std::hash;
    use cedra_framework::timestamp;
    use cedra_framework::block;
    use cedra_std::bcs;
    use cedra_framework::object::{Self, ExtendRef};
    use holdemgame::chips;
    use holdemgame::hand_eval;
    use holdemgame::pot_manager::{Self, PotState};
    use holdemgame::poker_events;

    // ============================================
    // ERROR CODES
    // ============================================
    
    const E_NOT_ADMIN: u64 = 1;
    const E_TABLE_EXISTS: u64 = 2;
    const E_TABLE_NOT_FOUND: u64 = 3;
    const E_SEAT_TAKEN: u64 = 4;
    const E_NOT_AT_TABLE: u64 = 5;
    const E_GAME_IN_PROGRESS: u64 = 6;
    const E_NO_GAME: u64 = 7;
    const E_NOT_YOUR_TURN: u64 = 8;
    const E_INVALID_ACTION: u64 = 9;
    const E_INSUFFICIENT_CHIPS: u64 = 10;
    const E_INVALID_RAISE: u64 = 11;
    const E_NOT_ENOUGH_PLAYERS: u64 = 12;
    const E_ALREADY_COMMITTED: u64 = 13;
    const E_INVALID_SECRET: u64 = 15;
    const E_WRONG_PHASE: u64 = 16;
    const E_TABLE_FULL: u64 = 17;
    const E_BUY_IN_TOO_LOW: u64 = 18;
    const E_BUY_IN_TOO_HIGH: u64 = 19;
    const E_ALREADY_REVEALED: u64 = 20;
    const E_NO_TIMEOUT: u64 = 21;
    const E_STRADDLE_NOT_ALLOWED: u64 = 22;
    const E_STRADDLE_ALREADY_POSTED: u64 = 23;
    const E_NOT_UTG: u64 = 24;
    const E_INVALID_BLINDS: u64 = 25;        // big_blind must be > small_blind
    const E_INVALID_BUY_IN: u64 = 26;        // max_buy_in must be >= min_buy_in
    const E_ZERO_VALUE: u64 = 27;            // Values must be non-zero
    const E_FEE_CONFIG_EXISTS: u64 = 28;     // FeeConfig already initialized
    const E_FEE_CONFIG_NOT_FOUND: u64 = 29;  // FeeConfig not initialized
    const E_NOT_FEE_ADMIN: u64 = 30;         // Not authorized to manage fees
    const E_INVALID_COMMIT_SIZE: u64 = 31;   // Commit hash must be exactly 32 bytes
    const E_INVALID_SECRET_SIZE: u64 = 32;   // Secret must be 16-32 bytes
    const E_ALREADY_SEATED: u64 = 33;        // Address already occupies a seat
    const TIMEOUT_PENALTY_PERCENT: u64 = 10;  // 10% of stack as timeout penalty
    
    // Size validation constants
    const COMMIT_HASH_SIZE: u64 = 32;        // SHA3-256 output size
    const MIN_SECRET_SIZE: u64 = 16;         // Minimum secret length
    const MAX_SECRET_SIZE: u64 = 32;         // Maximum secret length

    // ============================================
    // GAME STATE CONSTANTS
    // ============================================
    
    const PHASE_WAITING: u8 = 0;
    const PHASE_COMMIT: u8 = 1;
    const PHASE_REVEAL: u8 = 2;
    const PHASE_PREFLOP: u8 = 3;
    const PHASE_FLOP: u8 = 4;
    const PHASE_TURN: u8 = 5;
    const PHASE_RIVER: u8 = 6;
    const PHASE_SHOWDOWN: u8 = 7;

    const STATUS_WAITING: u8 = 0;
    const STATUS_ACTIVE: u8 = 1;
    const STATUS_FOLDED: u8 = 2;
    const STATUS_ALL_IN: u8 = 3;

    const MAX_PLAYERS: u64 = 5;
    const ACTION_TIMEOUT_SECS: u64 = 60;
    const COMMIT_REVEAL_TIMEOUT_SECS: u64 = 120; // 2 minutes for commit/reveal phases
    const FEE_BASIS_POINTS: u64 = 50; // 0.5% service fee (50 / 10000)

    // ============================================
    // DATA STRUCTURES
    // ============================================

    struct TableConfig has store, copy, drop {
        small_blind: u64,
        big_blind: u64,
        min_buy_in: u64,
        max_buy_in: u64,
        ante: u64,              // Optional ante (0 = no ante)
        straddle_enabled: bool, // Allow voluntary straddle
    }

    struct Seat has store, copy, drop {
        player: address,
        chip_count: u64,
        is_sitting_out: bool,
    }

    struct Game has store, drop {
        phase: u8,
        encrypted_hole_cards: vector<vector<u8>>,  // Encrypted with per-player keys
        community_cards: vector<u8>,
        deck: vector<u8>,
        deck_index: u64,
        player_status: vector<u8>,
        pot_state: PotState,
        players_in_hand: vector<u64>,
        action_on: u64,
        action_deadline: u64,
        dealer_position: u64,
        min_raise: u64,
        last_aggressor: Option<u64>,
        has_acted_mask: vector<bool>,  // Track who has acted this betting round
        straddle_hand_idx: Option<u64>, // Who straddled (if any)
        straddle_amount: u64,           // Straddle amount (0 if none)
        commits: vector<vector<u8>>,
        secrets: vector<vector<u8>>,
        // Timeout deadlines
        commit_deadline: u64,
        reveal_deadline: u64,
    }

    /// Global fee configuration - stored at @holdemgame
    struct FeeConfig has key {
        fee_collector: address,  // Where all table fees are sent
        admin: address,          // Who can update fee settings (module deployer)
    }

    /// Reference stored at admin's address pointing to their table object
    struct TableRef has key {
        table_address: address,
    }

    struct Table has key {
        config: TableConfig,
        admin: address,
        seats: vector<Option<Seat>>,
        game: Option<Game>,
        dealer_button: u64,
        hand_number: u64,
        total_fees_collected: u64,
        fee_accumulator: u64,        // Accumulated fee in basis-points (1/10000 chips)
        // Dead button tracking
        next_bb_seat: u64,           // Seat that owes big blind next
        missed_blinds: vector<u64>,  // Missed blind amounts per seat
        // New fields for deferred features
        is_paused: bool,             // Table paused (no new hands)
        pending_leaves: vector<bool>, // Players who want to leave after hand
        admin_only_start: bool,       // Only admin can start hands
        // Object control for escrow
        extend_ref: ExtendRef,       // For generating signer to move chips
    }

    // ============================================
    // TABLE MANAGEMENT
    // ============================================

    public entry fun create_table(
        admin: &signer,
        small_blind: u64,
        big_blind: u64,
        min_buy_in: u64,
        max_buy_in: u64,
        ante: u64,
        straddle_enabled: bool
    ) {
        let admin_addr = signer::address_of(admin);
        
        // Prevent duplicate tables per admin (check TableRef instead of Table)
        assert!(!exists<TableRef>(admin_addr), E_TABLE_EXISTS);
        
        // Validate config
        assert!(small_blind > 0, E_ZERO_VALUE);
        assert!(big_blind > small_blind, E_INVALID_BLINDS);
        assert!(min_buy_in > 0, E_ZERO_VALUE);
        assert!(max_buy_in >= min_buy_in, E_INVALID_BUY_IN);
        
        // Create a Move Object for the table (escrow pattern)
        let constructor_ref = object::create_object(admin_addr);
        let table_address = object::address_from_constructor_ref(&constructor_ref);
        let extend_ref = object::generate_extend_ref(&constructor_ref);
        let obj_signer = object::generate_signer(&constructor_ref);
        
        // Initialize vectors
        let seats = vector::empty<Option<Seat>>();
        let missed_blinds = vector::empty<u64>();
        let pending_leaves = vector::empty<bool>();
        let i = 0u64;
        while (i < MAX_PLAYERS) {
            vector::push_back(&mut seats, option::none());
            vector::push_back(&mut missed_blinds, 0);
            vector::push_back(&mut pending_leaves, false);
            i = i + 1;
        };
        
        // Store Table resource on the object (not admin's address)
        move_to(&obj_signer, Table {
            config: TableConfig { small_blind, big_blind, min_buy_in, max_buy_in, ante, straddle_enabled },
            admin: admin_addr,
            seats,
            game: option::none(),
            dealer_button: 0,
            hand_number: 0,
            total_fees_collected: 0,
            fee_accumulator: 0,
            next_bb_seat: 0,
            missed_blinds,
            is_paused: false,
            pending_leaves,
            admin_only_start: false,
            extend_ref,
        });
        
        // Store reference at admin's address for lookup
        move_to(admin, TableRef { table_address });
        
        poker_events::emit_table_created(
            table_address, admin_addr, small_blind, big_blind, 
            min_buy_in, max_buy_in, ante, straddle_enabled
        );
    }

    public entry fun join_table(
        player: &signer,
        table_addr: address,
        seat_idx: u64,
        buy_in_chips: u64
    ) acquires Table {
        assert!(exists<Table>(table_addr), E_TABLE_NOT_FOUND);
        let table = borrow_global_mut<Table>(table_addr);
        
        // Prevent joining while table is paused
        assert!(!table.is_paused, E_INVALID_ACTION);
        
        assert!(seat_idx < MAX_PLAYERS, E_TABLE_FULL);
        assert!(option::is_none(vector::borrow(&table.seats, seat_idx)), E_SEAT_TAKEN);
        assert!(buy_in_chips >= table.config.min_buy_in, E_BUY_IN_TOO_LOW);
        assert!(buy_in_chips <= table.config.max_buy_in, E_BUY_IN_TOO_HIGH);
        
        let player_addr = signer::address_of(player);
        
        // MEDIUM-2 Fix: Prevent same address from occupying multiple seats
        let existing_seat = find_player_seat_in_table(table, player_addr);
        assert!(existing_seat >= MAX_PLAYERS, E_ALREADY_SEATED); // MAX_PLAYERS means "not found"
        
        let player_balance = chips::balance(player_addr);
        assert!(player_balance >= buy_in_chips, E_INSUFFICIENT_CHIPS);
        
        chips::transfer_chips(player_addr, table_addr, buy_in_chips);
        
        *vector::borrow_mut(&mut table.seats, seat_idx) = option::some(Seat {
            player: player_addr,
            chip_count: buy_in_chips,
            is_sitting_out: false,
        });
        
        poker_events::emit_player_joined(table_addr, seat_idx, player_addr, buy_in_chips);
    }

    public entry fun leave_table(player: &signer, table_addr: address) acquires Table {
        assert!(exists<Table>(table_addr), E_TABLE_NOT_FOUND);
        let table = borrow_global_mut<Table>(table_addr);
        assert!(option::is_none(&table.game), E_GAME_IN_PROGRESS);
        
        let player_addr = signer::address_of(player);
        let seat_idx = find_player_seat_in_table(table, player_addr);
        assert!(seat_idx < MAX_PLAYERS, E_NOT_AT_TABLE);
        
        let seat = option::extract(vector::borrow_mut(&mut table.seats, seat_idx));
        chips::transfer_chips(table_addr, player_addr, seat.chip_count);
        
        poker_events::emit_player_left(table_addr, seat_idx, player_addr, seat.chip_count);
    }

    /// Sit out - player stays at table but won't be dealt into new hands
    public entry fun sit_out(player: &signer, table_addr: address) acquires Table {
        assert!(exists<Table>(table_addr), E_TABLE_NOT_FOUND);
        let table = borrow_global_mut<Table>(table_addr);
        
        let player_addr = signer::address_of(player);
        let seat_idx = find_player_seat_in_table(table, player_addr);
        assert!(seat_idx < MAX_PLAYERS, E_NOT_AT_TABLE);
        
        let seat = option::borrow_mut(vector::borrow_mut(&mut table.seats, seat_idx));
        seat.is_sitting_out = true;
        
        // Track missed blind (one big blind, capped - standard cash game rule)
        let bb = table.config.big_blind;
        let current_missed = *vector::borrow(&table.missed_blinds, seat_idx);
        if (current_missed == 0) {
            *vector::borrow_mut(&mut table.missed_blinds, seat_idx) = bb;
        };
        
        poker_events::emit_player_sat_out(table_addr, seat_idx, player_addr);
    }

    /// Sit back in - player will be dealt into the next hand
    public entry fun sit_in(player: &signer, table_addr: address) acquires Table {
        assert!(exists<Table>(table_addr), E_TABLE_NOT_FOUND);
        let table = borrow_global_mut<Table>(table_addr);
        
        let player_addr = signer::address_of(player);
        let seat_idx = find_player_seat_in_table(table, player_addr);
        assert!(seat_idx < MAX_PLAYERS, E_NOT_AT_TABLE);
        
        // Collect missed blinds if any (deduct from stack as "dead" money)
        let missed = *vector::borrow(&table.missed_blinds, seat_idx);
        if (missed > 0) {
            let seat = option::borrow_mut(vector::borrow_mut(&mut table.seats, seat_idx));
            if (seat.chip_count >= missed) {
                seat.chip_count = seat.chip_count - missed;
                // Note: Missed blind goes into pot at start of next hand the player is in
                // For simplicity, we just deduct it here as a penalty
            };
            *vector::borrow_mut(&mut table.missed_blinds, seat_idx) = 0;
        };
        
        let seat = option::borrow_mut(vector::borrow_mut(&mut table.seats, seat_idx));
        seat.is_sitting_out = false;
        
        poker_events::emit_player_sat_in(table_addr, seat_idx, player_addr);
    }

    /// Top up chips between hands (add more chips without leaving table)
    public entry fun top_up(player: &signer, table_addr: address, amount: u64) acquires Table {
        assert!(exists<Table>(table_addr), E_TABLE_NOT_FOUND);
        let table = borrow_global_mut<Table>(table_addr);
        assert!(option::is_none(&table.game), E_GAME_IN_PROGRESS);
        
        let player_addr = signer::address_of(player);
        let seat_idx = find_player_seat_in_table(table, player_addr);
        assert!(seat_idx < MAX_PLAYERS, E_NOT_AT_TABLE);
        
        // Check player has enough chips in their account
        let player_balance = chips::balance(player_addr);
        assert!(player_balance >= amount, E_INSUFFICIENT_CHIPS);
        
        // Check new total doesn't exceed max buy-in
        let seat = option::borrow(vector::borrow(&table.seats, seat_idx));
        let new_total = seat.chip_count + amount;
        assert!(new_total <= table.config.max_buy_in, E_BUY_IN_TOO_HIGH);
        
        // Transfer chips
        chips::transfer_chips(player_addr, table_addr, amount);
        let seat = option::borrow_mut(vector::borrow_mut(&mut table.seats, seat_idx));
        seat.chip_count = seat.chip_count + amount;
        
        poker_events::emit_player_topped_up(table_addr, seat_idx, player_addr, amount, seat.chip_count);
    }

    /// Cleanup orphaned TableRef when the actual Table no longer exists.
    /// This is a migration fix for tables closed before v7.0.1 that didn't remove TableRef.
    public entry fun cleanup_table_ref(admin: &signer) acquires TableRef {
        let admin_addr = signer::address_of(admin);
        assert!(exists<TableRef>(admin_addr), E_TABLE_NOT_FOUND);
        
        let table_ref = borrow_global<TableRef>(admin_addr);
        let table_addr = table_ref.table_address;
        
        // Only allow cleanup if the actual Table no longer exists
        assert!(!exists<Table>(table_addr), E_GAME_IN_PROGRESS);
        
        // Remove the orphaned TableRef
        let TableRef { table_address: _ } = move_from<TableRef>(admin_addr);
    }

    /// Close and delete a table (admin only)
    /// 
    /// Returns chips to any seated players and removes the Table resource.
    /// Cannot be called while a hand is in progress.
    public entry fun close_table(admin: &signer, table_addr: address) acquires Table, TableRef, FeeConfig {
        assert!(exists<Table>(table_addr), E_TABLE_NOT_FOUND);
        
        let admin_addr = signer::address_of(admin);
        let table = borrow_global<Table>(table_addr);
        assert!(table.admin == admin_addr, E_NOT_ADMIN);
        assert!(option::is_none(&table.game), E_GAME_IN_PROGRESS);
        
        // Remove the TableRef from admin's address so they can create a new table
        let TableRef { table_address: _ } = move_from<TableRef>(admin_addr);
        
        // Move out and destroy the table
        let Table {
            config: _,
            admin: _,
            seats,
            game: _,
            dealer_button: _,
            hand_number: _,
            total_fees_collected: _,
            fee_accumulator,
            next_bb_seat: _,
            missed_blinds: _,
            is_paused: _,
            pending_leaves: _,
            admin_only_start: _,
            extend_ref: _,
        } = move_from<Table>(table_addr);
        
        // Collect any residual fees from accumulator before closing
        // Maximum loss is 0.9999 chips which is acceptable
        let final_fee = fee_accumulator / 10000;
        if (final_fee > 0 && exists<FeeConfig>(@holdemgame)) {
            let fee_collector = borrow_global<FeeConfig>(@holdemgame).fee_collector;
            chips::transfer_chips(table_addr, fee_collector, final_fee);
        };
        
        // Return chips to any seated players
        let i = 0u64;
        while (i < vector::length(&seats)) {
            let seat_opt = vector::borrow(&seats, i);
            if (option::is_some(seat_opt)) {
                let seat = option::borrow(seat_opt);
                if (seat.chip_count > 0) {
                    chips::transfer_chips(table_addr, seat.player, seat.chip_count);
                };
            };
            i = i + 1;
        };
    }

    // ============================================
    // ADMIN CONTROLS
    // ============================================

    /// Update blind levels (admin only, between hands)
    public entry fun update_blinds(admin: &signer, table_addr: address, small_blind: u64, big_blind: u64) acquires Table {
        assert!(exists<Table>(table_addr), E_TABLE_NOT_FOUND);
        let table = borrow_global_mut<Table>(table_addr);
        assert!(table.admin == signer::address_of(admin), E_NOT_ADMIN);
        assert!(option::is_none(&table.game), E_GAME_IN_PROGRESS);
        
        // Validate config
        assert!(small_blind > 0, E_ZERO_VALUE);
        assert!(big_blind > small_blind, E_INVALID_BLINDS);
        
        table.config.small_blind = small_blind;
        table.config.big_blind = big_blind;
    }

    /// Update ante amount (admin only, between hands)
    public entry fun update_ante(admin: &signer, table_addr: address, ante: u64) acquires Table {
        assert!(exists<Table>(table_addr), E_TABLE_NOT_FOUND);
        let table = borrow_global_mut<Table>(table_addr);
        assert!(table.admin == signer::address_of(admin), E_NOT_ADMIN);
        assert!(option::is_none(&table.game), E_GAME_IN_PROGRESS);
        
        table.config.ante = ante;
    }

    /// Toggle straddle enabled (admin only, between hands)
    public entry fun toggle_straddle(admin: &signer, table_addr: address, enabled: bool) acquires Table {
        assert!(exists<Table>(table_addr), E_TABLE_NOT_FOUND);
        let table = borrow_global_mut<Table>(table_addr);
        assert!(table.admin == signer::address_of(admin), E_NOT_ADMIN);
        assert!(option::is_none(&table.game), E_GAME_IN_PROGRESS);
        
        table.config.straddle_enabled = enabled;
    }

    /// Update buy-in limits (admin only, between hands)
    public entry fun update_buy_in_limits(admin: &signer, table_addr: address, min_buy_in: u64, max_buy_in: u64) acquires Table {
        assert!(exists<Table>(table_addr), E_TABLE_NOT_FOUND);
        let table = borrow_global_mut<Table>(table_addr);
        assert!(table.admin == signer::address_of(admin), E_NOT_ADMIN);
        assert!(option::is_none(&table.game), E_GAME_IN_PROGRESS);
        
        // Validate config
        assert!(min_buy_in > 0, E_ZERO_VALUE);
        assert!(max_buy_in >= min_buy_in, E_INVALID_BUY_IN);
        
        table.config.min_buy_in = min_buy_in;
        table.config.max_buy_in = max_buy_in;
    }

    /// Kick a player from the table (admin only, between hands)
    public entry fun kick_player(admin: &signer, table_addr: address, seat_idx: u64) acquires Table {
        assert!(exists<Table>(table_addr), E_TABLE_NOT_FOUND);
        let table = borrow_global_mut<Table>(table_addr);
        assert!(table.admin == signer::address_of(admin), E_NOT_ADMIN);
        assert!(option::is_none(&table.game), E_GAME_IN_PROGRESS);
        assert!(seat_idx < MAX_PLAYERS, E_INVALID_ACTION);
        assert!(option::is_some(vector::borrow(&table.seats, seat_idx)), E_NOT_AT_TABLE);
        
        let seat = option::extract(vector::borrow_mut(&mut table.seats, seat_idx));
        let player_addr = seat.player;
        let chips_returned = seat.chip_count;
        chips::transfer_chips(table_addr, player_addr, chips_returned);
        
        poker_events::emit_player_kicked(table_addr, seat_idx, player_addr, chips_returned);
    }

    /// Force a player to sit out (admin only)
    public entry fun force_sit_out(admin: &signer, table_addr: address, seat_idx: u64) acquires Table {
        assert!(exists<Table>(table_addr), E_TABLE_NOT_FOUND);
        let table = borrow_global_mut<Table>(table_addr);
        assert!(table.admin == signer::address_of(admin), E_NOT_ADMIN);
        assert!(seat_idx < MAX_PLAYERS, E_INVALID_ACTION);
        assert!(option::is_some(vector::borrow(&table.seats, seat_idx)), E_NOT_AT_TABLE);
        
        let seat = option::borrow_mut(vector::borrow_mut(&mut table.seats, seat_idx));
        seat.is_sitting_out = true;
    }

    /// Transfer table ownership (admin only)
    public entry fun transfer_ownership(admin: &signer, table_addr: address, new_admin: address) acquires Table {
        assert!(exists<Table>(table_addr), E_TABLE_NOT_FOUND);
        let table = borrow_global_mut<Table>(table_addr);
        assert!(table.admin == signer::address_of(admin), E_NOT_ADMIN);
        let old_admin = table.admin;
        table.admin = new_admin;
        
        poker_events::emit_ownership_transferred(table_addr, old_admin, new_admin);
    }

    // ============================================
    // GLOBAL FEE CONFIGURATION
    // ============================================

    /// Initialize global fee config - can only be called once by module deployer
    public entry fun init_fee_config(deployer: &signer, fee_collector: address) {
        let deployer_addr = signer::address_of(deployer);
        assert!(deployer_addr == @holdemgame, E_NOT_FEE_ADMIN);
        assert!(!exists<FeeConfig>(@holdemgame), E_FEE_CONFIG_EXISTS);
        
        move_to(deployer, FeeConfig {
            fee_collector,
            admin: deployer_addr,
        });
    }

    /// Update the global fee collector address (fee admin only)
    public entry fun update_fee_collector(admin: &signer, new_collector: address) acquires FeeConfig {
        let admin_addr = signer::address_of(admin);
        assert!(exists<FeeConfig>(@holdemgame), E_FEE_CONFIG_NOT_FOUND);
        let config = borrow_global_mut<FeeConfig>(@holdemgame);
        assert!(admin_addr == config.admin, E_NOT_FEE_ADMIN);
        
        let old_collector = config.fee_collector;
        config.fee_collector = new_collector;
        
        // Emit event using the existing fee recipient updated event
        poker_events::emit_fee_recipient_updated(@holdemgame, old_collector, new_collector);
    }

    /// Transfer fee admin rights to a new address
    public entry fun transfer_fee_admin(admin: &signer, new_admin: address) acquires FeeConfig {
        let admin_addr = signer::address_of(admin);
        assert!(exists<FeeConfig>(@holdemgame), E_FEE_CONFIG_NOT_FOUND);
        let config = borrow_global_mut<FeeConfig>(@holdemgame);
        assert!(admin_addr == config.admin, E_NOT_FEE_ADMIN);
        
        config.admin = new_admin;
    }

    #[view]
    public fun get_fee_collector(): address acquires FeeConfig {
        assert!(exists<FeeConfig>(@holdemgame), E_FEE_CONFIG_NOT_FOUND);
        borrow_global<FeeConfig>(@holdemgame).fee_collector
    }

    #[view]
    public fun get_fee_admin(): address acquires FeeConfig {
        assert!(exists<FeeConfig>(@holdemgame), E_FEE_CONFIG_NOT_FOUND);
        borrow_global<FeeConfig>(@holdemgame).admin
    }

    #[view]
    public fun is_fee_config_initialized(): bool {
        exists<FeeConfig>(@holdemgame)
    }

    #[view]
    public fun get_fee_accumulator(table_addr: address): u64 acquires Table {
        assert!(exists<Table>(table_addr), E_TABLE_NOT_FOUND);
        borrow_global<Table>(table_addr).fee_accumulator
    }

    #[view]
    public fun get_fee_basis_points(): u64 {
        FEE_BASIS_POINTS
    }

    #[view]
    /// Get table address from admin's TableRef
    public fun get_table_address(admin_addr: address): address acquires TableRef {
        assert!(exists<TableRef>(admin_addr), E_TABLE_NOT_FOUND);
        borrow_global<TableRef>(admin_addr).table_address
    }

    /// MEDIUM-3 Fix: Safely transfer fees if FeeConfig exists, otherwise skip
    /// Returns the amount actually collected (0 if no FeeConfig)
    fun try_transfer_fee(table_addr: address, amount: u64): u64 acquires FeeConfig {
        if (amount == 0) { return 0 };
        
        if (exists<FeeConfig>(@holdemgame)) {
            let fee_collector = borrow_global<FeeConfig>(@holdemgame).fee_collector;
            chips::transfer_chips(table_addr, fee_collector, amount);
            amount
        } else {
            // No FeeConfig: fee goes back to pot/winner
            0
        }
    }

    /// Pause the table - no new hands can start (admin only)
    public entry fun pause_table(admin: &signer, table_addr: address) acquires Table {
        assert!(exists<Table>(table_addr), E_TABLE_NOT_FOUND);
        let table = borrow_global_mut<Table>(table_addr);
        assert!(table.admin == signer::address_of(admin), E_NOT_ADMIN);
        
        table.is_paused = true;
    }

    /// Resume the table - hands can start again (admin only)
    public entry fun resume_table(admin: &signer, table_addr: address) acquires Table {
        assert!(exists<Table>(table_addr), E_TABLE_NOT_FOUND);
        let table = borrow_global_mut<Table>(table_addr);
        assert!(table.admin == signer::address_of(admin), E_NOT_ADMIN);
        
        table.is_paused = false;
    }

    /// Toggle admin-only hand start (admin only)
    public entry fun toggle_admin_only_start(admin: &signer, table_addr: address, enabled: bool) acquires Table {
        assert!(exists<Table>(table_addr), E_TABLE_NOT_FOUND);
        let table = borrow_global_mut<Table>(table_addr);
        assert!(table.admin == signer::address_of(admin), E_NOT_ADMIN);
        
        table.admin_only_start = enabled;
    }

    /// Request to leave after current hand completes
    public entry fun leave_after_hand(player: &signer, table_addr: address) acquires Table {
        assert!(exists<Table>(table_addr), E_TABLE_NOT_FOUND);
        let table = borrow_global_mut<Table>(table_addr);
        
        let player_addr = signer::address_of(player);
        let seat_idx = find_player_seat_in_table(table, player_addr);
        assert!(seat_idx < MAX_PLAYERS, E_NOT_AT_TABLE);
        
        // Mark this player as wanting to leave
        *vector::borrow_mut(&mut table.pending_leaves, seat_idx) = true;
    }

    /// Cancel request to leave after hand
    public entry fun cancel_leave_after_hand(player: &signer, table_addr: address) acquires Table {
        assert!(exists<Table>(table_addr), E_TABLE_NOT_FOUND);
        let table = borrow_global_mut<Table>(table_addr);
        
        let player_addr = signer::address_of(player);
        let seat_idx = find_player_seat_in_table(table, player_addr);
        assert!(seat_idx < MAX_PLAYERS, E_NOT_AT_TABLE);
        
        *vector::borrow_mut(&mut table.pending_leaves, seat_idx) = false;
    }

    /// Emergency abort hand and refund all players (admin only)
    /// 
    /// Use when commit/reveal is stuck. Returns all bets to players proportionally.
    public entry fun emergency_abort(admin: &signer, table_addr: address) acquires Table {
        assert!(exists<Table>(table_addr), E_TABLE_NOT_FOUND);
        let table = borrow_global_mut<Table>(table_addr);
        assert!(table.admin == signer::address_of(admin), E_NOT_ADMIN);
        assert!(option::is_some(&table.game), E_NO_GAME);
        
        let hand_number = table.hand_number;
        
        // Get pot info before clearing
        let game = option::borrow(&table.game);
        let total_invested = pot_manager::get_total_invested(&game.pot_state);
        let players_in_hand = game.players_in_hand;
        
        // Refund each player their total invested amount
        let i = 0u64;
        while (i < vector::length(&players_in_hand)) {
            let seat_idx = *vector::borrow(&players_in_hand, i);
            let refund = *vector::borrow(&total_invested, i);
            if (refund > 0 && option::is_some(vector::borrow(&table.seats, seat_idx))) {
                let seat = option::borrow_mut(vector::borrow_mut(&mut table.seats, seat_idx));
                seat.chip_count = seat.chip_count + refund;
            };
            i = i + 1;
        };
        
        // Clear the game
        table.game = option::none();
        
        poker_events::emit_hand_aborted(table_addr, hand_number, 2); // 2 = emergency_abort
    }

    // ============================================
    // HAND LIFECYCLE
    // ============================================

    public entry fun start_hand(caller: &signer, table_addr: address) acquires Table {
        assert!(exists<Table>(table_addr), E_TABLE_NOT_FOUND);
        let table = borrow_global_mut<Table>(table_addr);
        assert!(option::is_none(&table.game), E_GAME_IN_PROGRESS);
        assert!(!table.is_paused, E_INVALID_ACTION);  // Table must not be paused
        
        // Enforce admin_only_start if enabled
        if (table.admin_only_start) {
            assert!(signer::address_of(caller) == table.admin, E_NOT_ADMIN);
        };
        
        let active_seats = get_active_seat_indices_internal(table);
        assert!(vector::length(&active_seats) >= 2, E_NOT_ENOUGH_PLAYERS);
        
        table.dealer_button = next_active_seat_internal(table, table.dealer_button);
        table.hand_number = table.hand_number + 1;
        
        let num_players = vector::length(&active_seats);
        let player_status = vector::empty<u8>();
        let commits = vector::empty<vector<u8>>();
        let secrets = vector::empty<vector<u8>>();
        let encrypted_hole_cards = vector::empty<vector<u8>>();
        let has_acted_mask = vector::empty<bool>();
        
        let i = 0u64;
        while (i < num_players) {
            vector::push_back(&mut player_status, STATUS_ACTIVE);
            vector::push_back(&mut commits, vector::empty());
            vector::push_back(&mut secrets, vector::empty());
            vector::push_back(&mut encrypted_hole_cards, vector::empty());
            vector::push_back(&mut has_acted_mask, false);
            i = i + 1;
        };
        
        table.game = option::some(Game {
            phase: PHASE_COMMIT,
            encrypted_hole_cards,
            community_cards: vector::empty(),
            deck: vector::empty(),
            deck_index: 0,
            player_status,
            pot_state: pot_manager::new(num_players),
            players_in_hand: active_seats,
            action_on: 0,
            action_deadline: 0,
            dealer_position: table.dealer_button,
            min_raise: table.config.big_blind,
            last_aggressor: option::none(),
            has_acted_mask,
            straddle_hand_idx: option::none(),
            straddle_amount: 0,
            commits,
            secrets,
            commit_deadline: timestamp::now_seconds() + COMMIT_REVEAL_TIMEOUT_SECS,
            reveal_deadline: 0, // Set when all commits are in
        });
        
        // Emit HandStarted event
        let game = option::borrow(&table.game);
        poker_events::emit_hand_started(table_addr, table.hand_number, table.dealer_button, game.players_in_hand);
    }

    public entry fun submit_commit(
        player: &signer,
        table_addr: address,
        commit_hash: vector<u8>
    ) acquires Table {
        assert!(exists<Table>(table_addr), E_TABLE_NOT_FOUND);
        
        // MEDIUM-1 Fix: Validate commit hash size (must be exactly 32 bytes for SHA3-256)
        assert!(vector::length(&commit_hash) == COMMIT_HASH_SIZE, E_INVALID_COMMIT_SIZE);
        
        let table = borrow_global_mut<Table>(table_addr);
        assert!(option::is_some(&table.game), E_NO_GAME);
        
        // Enforce commit deadline - reject late commits
        let game = option::borrow(&table.game);
        assert!(game.phase == PHASE_COMMIT, E_WRONG_PHASE);
        assert!(timestamp::now_seconds() <= game.commit_deadline, E_NO_TIMEOUT);
        
        let player_addr = signer::address_of(player);
        let hand_idx = find_player_hand_idx(&game.players_in_hand, &table.seats, player_addr);
        
        // Check not already committed  
        assert!(vector::is_empty(vector::borrow(&game.commits, hand_idx)), E_ALREADY_COMMITTED);
        
        // Now mutate
        let game_mut = option::borrow_mut(&mut table.game);
        *vector::borrow_mut(&mut game_mut.commits, hand_idx) = commit_hash;
        
        if (all_committed_internal(game_mut)) {
            game_mut.phase = PHASE_REVEAL;
            game_mut.reveal_deadline = timestamp::now_seconds() + COMMIT_REVEAL_TIMEOUT_SECS;
        };
    }

    public entry fun reveal_secret(
        player: &signer,
        table_addr: address,
        secret: vector<u8>
    ) acquires Table {
        assert!(exists<Table>(table_addr), E_TABLE_NOT_FOUND);
        
        // MEDIUM-1 Fix: Validate secret size (16-32 bytes)
        let secret_len = vector::length(&secret);
        assert!(secret_len >= MIN_SECRET_SIZE && secret_len <= MAX_SECRET_SIZE, E_INVALID_SECRET_SIZE);
        
        let table = borrow_global_mut<Table>(table_addr);
        assert!(option::is_some(&table.game), E_NO_GAME);
        
        let player_addr = signer::address_of(player);
        
        // Read-only access first
        let game = option::borrow(&table.game);
        assert!(game.phase == PHASE_REVEAL, E_WRONG_PHASE);
        // Enforce reveal deadline - reject late reveals
        assert!(timestamp::now_seconds() <= game.reveal_deadline, E_NO_TIMEOUT);
        
        let hand_idx = find_player_hand_idx(&game.players_in_hand, &table.seats, player_addr);
        
        assert!(vector::is_empty(vector::borrow(&game.secrets, hand_idx)), E_ALREADY_REVEALED);
        
        let computed_hash = hash::sha3_256(secret);
        let stored_commit = *vector::borrow(&game.commits, hand_idx);
        assert!(computed_hash == stored_commit, E_INVALID_SECRET);
        
        let all_revealed_flag: bool;
        {
            let game_mut = option::borrow_mut(&mut table.game);
            *vector::borrow_mut(&mut game_mut.secrets, hand_idx) = secret;
            all_revealed_flag = all_revealed_internal(game_mut);
        };
        
        if (all_revealed_flag) {
            let game_mut = option::borrow_mut(&mut table.game);
            shuffle_deck_internal(game_mut);
            deal_hole_cards_internal(game_mut);
            
            // Post antes first (if configured)
            let ante = table.config.ante;
            post_antes_internal(game_mut, &mut table.seats, ante);
            
            // Then post blinds
            let bb_amount = table.config.big_blind;
            let sb_amount = table.config.small_blind;
            post_blinds_internal(game_mut, &mut table.seats, sb_amount, bb_amount);
            
            // Update next_bb_seat - tracks who should have BB next hand (for dead button)
            let bb_hand_idx = get_big_blind_hand_idx_internal(game_mut);
            let bb_seat_idx = *vector::borrow(&game_mut.players_in_hand, bb_hand_idx);
            table.next_bb_seat = (bb_seat_idx + 1) % MAX_PLAYERS;
            
            game_mut.phase = PHASE_PREFLOP;
            let num_players = vector::length(&game_mut.players_in_hand);
            let bb_hand_idx = get_big_blind_hand_idx_internal(game_mut);
            // Heads-up: dealer (SB) acts first preflop
            if (num_players == 2) {
                game_mut.action_on = get_small_blind_hand_idx_internal(game_mut);
            } else {
                game_mut.action_on = (bb_hand_idx + 1) % num_players;
            };
            game_mut.action_deadline = timestamp::now_seconds() + ACTION_TIMEOUT_SECS;
        };
    }

    // ============================================
    // PLAYER ACTIONS
    // ============================================

    public entry fun fold(player: &signer, table_addr: address) acquires Table, FeeConfig {
        assert!(exists<Table>(table_addr), E_TABLE_NOT_FOUND);
        let table = borrow_global_mut<Table>(table_addr);
        assert!(option::is_some(&table.game), E_NO_GAME);
        
        let player_addr = signer::address_of(player);
        let game = option::borrow(&table.game);
        check_action_allowed_internal(game, &table.seats, player_addr);
        let hand_idx = find_player_hand_idx(&game.players_in_hand, &table.seats, player_addr);
        
        let game_mut = option::borrow_mut(&mut table.game);
        *vector::borrow_mut(&mut game_mut.player_status, hand_idx) = STATUS_FOLDED;
        *vector::borrow_mut(&mut game_mut.has_acted_mask, hand_idx) = true;
        
        advance_action_internal(table, table_addr);
    }

    public entry fun check(player: &signer, table_addr: address) acquires Table, FeeConfig {
        assert!(exists<Table>(table_addr), E_TABLE_NOT_FOUND);
        let table = borrow_global_mut<Table>(table_addr);
        assert!(option::is_some(&table.game), E_NO_GAME);
        
        let player_addr = signer::address_of(player);
        let game = option::borrow(&table.game);
        check_action_allowed_internal(game, &table.seats, player_addr);
        let hand_idx = find_player_hand_idx(&game.players_in_hand, &table.seats, player_addr);
        
        let call_amount = pot_manager::get_call_amount(&game.pot_state, hand_idx);
        assert!(call_amount == 0, E_INVALID_ACTION);
        
        // Mark player as having acted
        let game_mut = option::borrow_mut(&mut table.game);
        *vector::borrow_mut(&mut game_mut.has_acted_mask, hand_idx) = true;
        
        advance_action_internal(table, table_addr);
    }

    public entry fun call(player: &signer, table_addr: address) acquires Table, FeeConfig {
        assert!(exists<Table>(table_addr), E_TABLE_NOT_FOUND);
        let table = borrow_global_mut<Table>(table_addr);
        assert!(option::is_some(&table.game), E_NO_GAME);
        
        let player_addr = signer::address_of(player);
        let game = option::borrow(&table.game);
        check_action_allowed_internal(game, &table.seats, player_addr);
        let hand_idx = find_player_hand_idx(&game.players_in_hand, &table.seats, player_addr);
        let seat_idx = *vector::borrow(&game.players_in_hand, hand_idx);
        
        let call_amount = pot_manager::get_call_amount(&game.pot_state, hand_idx);
        let seat = option::borrow(vector::borrow(&table.seats, seat_idx));
        let actual_amount = if (call_amount > seat.chip_count) { seat.chip_count } else { call_amount };
        
        {
            let game_mut = option::borrow_mut(&mut table.game);
            let seat_mut = option::borrow_mut(vector::borrow_mut(&mut table.seats, seat_idx));
            seat_mut.chip_count = seat_mut.chip_count - actual_amount;
            pot_manager::add_bet(&mut game_mut.pot_state, hand_idx, actual_amount);
            *vector::borrow_mut(&mut game_mut.has_acted_mask, hand_idx) = true;
            if (seat_mut.chip_count == 0) {
                *vector::borrow_mut(&mut game_mut.player_status, hand_idx) = STATUS_ALL_IN;
            };
        };
        
        advance_action_internal(table, table_addr);
    }

    public entry fun raise_to(player: &signer, table_addr: address, total_bet: u64) acquires Table, FeeConfig {
        assert!(exists<Table>(table_addr), E_TABLE_NOT_FOUND);
        let table = borrow_global_mut<Table>(table_addr);
        assert!(option::is_some(&table.game), E_NO_GAME);
        
        let player_addr = signer::address_of(player);
        let game = option::borrow(&table.game);
        check_action_allowed_internal(game, &table.seats, player_addr);
        let hand_idx = find_player_hand_idx(&game.players_in_hand, &table.seats, player_addr);
        let seat_idx = *vector::borrow(&game.players_in_hand, hand_idx);
        
        let current_bet = pot_manager::get_current_bet(&game.pot_state, hand_idx);
        let max_bet = pot_manager::get_max_current_bet(&game.pot_state);
        let min_raise = game.min_raise;
        
        // Underflow protection: total_bet must be >= current_bet (what player already has in)
        assert!(total_bet >= current_bet, E_INVALID_RAISE);
        // A raise must exceed the current max bet
        assert!(total_bet > max_bet, E_INVALID_RAISE);
        
        let raise_amount = total_bet - max_bet;
        let seat = option::borrow(vector::borrow(&table.seats, seat_idx));
        let is_all_in = (total_bet == seat.chip_count + current_bet);
        
        // Raise validation:
        // 1. If max_bet < min_raise (short all-in situation), allow bet completing to min_raise
        // 2. Otherwise, raise_amount must be >= min_raise, or player is all-in
        let is_valid_raise = if (max_bet < min_raise) {
            // After a short all-in, allow betting up to min_raise (completing the bet)
            total_bet >= min_raise || is_all_in
        } else {
            // Normal case: raise must be at least min_raise, or all-in
            raise_amount >= min_raise || is_all_in
        };
        assert!(is_valid_raise, E_INVALID_RAISE);
        
        let add_amount = total_bet - current_bet;
        assert!(seat.chip_count >= add_amount, E_INSUFFICIENT_CHIPS);
        
        {
            let game_mut = option::borrow_mut(&mut table.game);
            let seat_mut = option::borrow_mut(vector::borrow_mut(&mut table.seats, seat_idx));
            seat_mut.chip_count = seat_mut.chip_count - add_amount;
            pot_manager::add_bet(&mut game_mut.pot_state, hand_idx, add_amount);
            
            // Only full raises (>= min_raise) reopen betting and update min_raise
            if (raise_amount >= min_raise) {
                game_mut.min_raise = raise_amount;
                game_mut.last_aggressor = option::some(hand_idx);
                reset_acted_mask_except(game_mut, hand_idx);
            } else {
                // Short all-in: just mark as acted, don't reopen betting
                *vector::borrow_mut(&mut game_mut.has_acted_mask, hand_idx) = true;
            };
            
            if (seat_mut.chip_count == 0) {
                *vector::borrow_mut(&mut game_mut.player_status, hand_idx) = STATUS_ALL_IN;
            };
        };
        
        advance_action_internal(table, table_addr);
    }

    public entry fun all_in(player: &signer, table_addr: address) acquires Table, FeeConfig {
        assert!(exists<Table>(table_addr), E_TABLE_NOT_FOUND);
        let table = borrow_global_mut<Table>(table_addr);
        assert!(option::is_some(&table.game), E_NO_GAME);
        
        let player_addr = signer::address_of(player);
        let game = option::borrow(&table.game);
        check_action_allowed_internal(game, &table.seats, player_addr);
        let hand_idx = find_player_hand_idx(&game.players_in_hand, &table.seats, player_addr);
        let seat_idx = *vector::borrow(&game.players_in_hand, hand_idx);
        
        let seat = option::borrow(vector::borrow(&table.seats, seat_idx));
        let all_in_amount = seat.chip_count;
        
        let max_bet = pot_manager::get_max_current_bet(&game.pot_state);
        let current_bet = pot_manager::get_current_bet(&game.pot_state, hand_idx);
        let min_raise = game.min_raise;
        
        {
            let game_mut = option::borrow_mut(&mut table.game);
            let seat_mut = option::borrow_mut(vector::borrow_mut(&mut table.seats, seat_idx));
            seat_mut.chip_count = 0;
            pot_manager::add_bet(&mut game_mut.pot_state, hand_idx, all_in_amount);
            *vector::borrow_mut(&mut game_mut.player_status, hand_idx) = STATUS_ALL_IN;
            
            // Calculate the new bet total after adding all_in_amount
            let new_total_bet = current_bet + all_in_amount;
            
            // Only set last_aggressor and reopen betting if this constitutes a valid raise
            // (new total bet exceeds max_bet by at least min_raise)
            if (new_total_bet > max_bet && (new_total_bet - max_bet) >= min_raise) {
                game_mut.last_aggressor = option::some(hand_idx);
                game_mut.min_raise = new_total_bet - max_bet;
                // Valid raise reopens betting
                reset_acted_mask_except(game_mut, hand_idx);
            } else {
                // Short all-in: just mark as acted, don't reopen betting
                *vector::borrow_mut(&mut game_mut.has_acted_mask, hand_idx) = true;
            };
        };
        
        advance_action_internal(table, table_addr);
    }

    /// Post a straddle (voluntary third blind, 2x big blind)
    /// 
    /// Can only be called by UTG player during preflop before any other action.
    /// Straddler gets last action preflop (acts as if they posted BB).
    public entry fun straddle(player: &signer, table_addr: address) acquires Table {
        assert!(exists<Table>(table_addr), E_TABLE_NOT_FOUND);
        let table = borrow_global_mut<Table>(table_addr);
        assert!(option::is_some(&table.game), E_NO_GAME);
        assert!(table.config.straddle_enabled, E_STRADDLE_NOT_ALLOWED);
        
        let player_addr = signer::address_of(player);
        let game = option::borrow(&table.game);
        
        // Must be preflop
        assert!(game.phase == PHASE_PREFLOP, E_WRONG_PHASE);
        // No straddle already posted
        assert!(option::is_none(&game.straddle_hand_idx), E_STRADDLE_ALREADY_POSTED);
        
        // Must be UTG (player whose turn it is at start of preflop action)
        let hand_idx = find_player_hand_idx(&game.players_in_hand, &table.seats, player_addr);
        assert!(game.action_on == hand_idx, E_NOT_YOUR_TURN);
        
        // Verify player hasn't acted yet (straddle must be first action)
        assert!(!*vector::borrow(&game.has_acted_mask, hand_idx), E_INVALID_ACTION);
        
        let straddle_amount = table.config.big_blind * 2;
        let seat_idx = *vector::borrow(&game.players_in_hand, hand_idx);
        
        // Check sufficient chips
        let seat = option::borrow(vector::borrow(&table.seats, seat_idx));
        assert!(seat.chip_count >= straddle_amount, E_INSUFFICIENT_CHIPS);
        
        {
            let game_mut = option::borrow_mut(&mut table.game);
            let seat_mut = option::borrow_mut(vector::borrow_mut(&mut table.seats, seat_idx));
            
            seat_mut.chip_count = seat_mut.chip_count - straddle_amount;
            pot_manager::add_bet(&mut game_mut.pot_state, hand_idx, straddle_amount);
            
            game_mut.straddle_hand_idx = option::some(hand_idx);
            game_mut.straddle_amount = straddle_amount;
            game_mut.min_raise = straddle_amount;  // New min raise = straddle amount
            
            // Mark straddle as NOT acted (they get option to raise later)
            // Move action to next player after straddler
            let num_players = vector::length(&game_mut.players_in_hand);
            game_mut.action_on = (hand_idx + 1) % num_players;
            
            // Skip non-active players
            while (*vector::borrow(&game_mut.player_status, game_mut.action_on) != STATUS_ACTIVE) {
                game_mut.action_on = (game_mut.action_on + 1) % num_players;
            };
            
            game_mut.action_deadline = timestamp::now_seconds() + ACTION_TIMEOUT_SECS;
        };
    }

    /// Handle timeouts for commit/reveal/action phases
    /// 
    /// Anyone can call this to enforce timeouts. Effects depend on phase:
    /// - COMMIT/REVEAL: Apply 10% penalty, mark as sitting out, abort if <2 players remain
    /// - PREFLOP-RIVER: Auto-fold the timed-out player
    public entry fun handle_timeout(table_addr: address) acquires Table, FeeConfig {
        assert!(exists<Table>(table_addr), E_TABLE_NOT_FOUND);
        let table = borrow_global_mut<Table>(table_addr);
        assert!(option::is_some(&table.game), E_NO_GAME);
        
        let now = timestamp::now_seconds();
        let game = option::borrow(&table.game);
        let phase = game.phase;
        
        if (phase == PHASE_COMMIT) {
            // Check commit timeout
            assert!(now > game.commit_deadline, E_NO_TIMEOUT);
            
            let penalized = 0u64;
            let i = 0u64;
            while (i < vector::length(&game.commits)) {
                if (vector::is_empty(vector::borrow(&game.commits, i))) {
                    let seat_idx = *vector::borrow(&game.players_in_hand, i);
                    let seat = option::borrow_mut(vector::borrow_mut(&mut table.seats, seat_idx));
                    
                    // Apply 10% penalty
                    let penalty = (seat.chip_count * TIMEOUT_PENALTY_PERCENT) / 100;
                    if (penalty > 0) {
                        seat.chip_count = seat.chip_count - penalty;
                        let fee_collector = borrow_global<FeeConfig>(@holdemgame).fee_collector;
                        chips::transfer_chips(table_addr, fee_collector, penalty);
                        table.total_fees_collected = table.total_fees_collected + penalty;
                    };
                    
                    seat.is_sitting_out = true;
                    penalized = penalized + 1;
                };
                i = i + 1;
            };
            // Abort the hand (can't continue without all entropy)
            table.game = option::none();
            
        } else if (phase == PHASE_REVEAL) {
            // Check reveal timeout
            assert!(now > game.reveal_deadline, E_NO_TIMEOUT);
            
            let i = 0u64;
            while (i < vector::length(&game.secrets)) {
                if (vector::is_empty(vector::borrow(&game.secrets, i))) {
                    let seat_idx = *vector::borrow(&game.players_in_hand, i);
                    let seat = option::borrow_mut(vector::borrow_mut(&mut table.seats, seat_idx));
                    
                    // Apply 10% penalty
                    let penalty = (seat.chip_count * TIMEOUT_PENALTY_PERCENT) / 100;
                    if (penalty > 0) {
                        seat.chip_count = seat.chip_count - penalty;
                        let fee_collector = borrow_global<FeeConfig>(@holdemgame).fee_collector;
                        chips::transfer_chips(table_addr, fee_collector, penalty);
                        table.total_fees_collected = table.total_fees_collected + penalty;
                    };
                    
                    seat.is_sitting_out = true;
                };
                i = i + 1;
            };
            // Abort the hand
            table.game = option::none();
            
        } else if (phase >= PHASE_PREFLOP && phase <= PHASE_RIVER) {
            // Check action timeout
            assert!(now > game.action_deadline, E_NO_TIMEOUT);
            // Auto-fold the player who timed out
            let action_on = game.action_on;
            {
                let game_mut = option::borrow_mut(&mut table.game);
                *vector::borrow_mut(&mut game_mut.player_status, action_on) = STATUS_FOLDED;
                *vector::borrow_mut(&mut game_mut.has_acted_mask, action_on) = true;
            };
            advance_action_internal(table, table_addr);
        };
    }

    // ============================================
    // INTERNAL GAME LOGIC
    // ============================================

    fun advance_action_internal(table: &mut Table, table_addr: address) acquires FeeConfig {
        let game = option::borrow(&table.game);
        let active_count = count_active_players_internal(game);
        
        if (active_count <= 1) {
            end_hand_fold_internal(table, table_addr);
            return
        };
        
        let game = option::borrow(&table.game);
        if (is_betting_complete_internal(game)) {
            collect_and_advance_phase(table, table_addr);
        } else {
            let game_mut = option::borrow_mut(&mut table.game);
            game_mut.action_on = next_active_hand_idx_internal(game_mut);
            game_mut.action_deadline = timestamp::now_seconds() + ACTION_TIMEOUT_SECS;
        };
    }

    fun collect_and_advance_phase(table: &mut Table, table_addr: address) acquires FeeConfig {
        {
            let game_mut = option::borrow_mut(&mut table.game);
            let non_folded = get_non_folded_mask_internal(game_mut);
            pot_manager::collect_bets(&mut game_mut.pot_state, &non_folded);
        };
        advance_phase_internal(table, table_addr);
    }

    fun advance_phase_internal(table: &mut Table, table_addr: address) acquires FeeConfig {
        let bb = table.config.big_blind;
        let game_mut = option::borrow_mut(&mut table.game);
        game_mut.last_aggressor = option::none();
        
        // Reset min_raise to big blind for new street
        game_mut.min_raise = bb;
        
        // Reset has_acted_mask for new betting round
        let num_players = vector::length(&game_mut.players_in_hand);
        let i = 0u64;
        while (i < num_players) {
            *vector::borrow_mut(&mut game_mut.has_acted_mask, i) = false;
            i = i + 1;
        };
        
        // Count ACTIVE players (not ALL_IN, not FOLDED)
        let active_count = 0u64;
        let j = 0u64;
        while (j < num_players) {
            if (*vector::borrow(&game_mut.player_status, j) == STATUS_ACTIVE) {
                active_count = active_count + 1;
            };
            j = j + 1;
        };
        
        // If 0 or 1 ACTIVE players remain, runout remaining cards and go to showdown
        // (no more betting possible when all-in or only one player can act)
        if (active_count <= 1) {
            run_all_in_runout_internal(game_mut);
            game_mut.phase = PHASE_SHOWDOWN;
            run_showdown_internal(table, table_addr);
            return
        };
        
        let game_mut = option::borrow_mut(&mut table.game);
        let dealer_hand_idx = get_dealer_hand_idx_internal(game_mut);
        
        // Heads-up: dealer (SB) acts first on ALL postflop streets
        // Multi-way: player left of dealer acts first
        if (num_players == 2) {
            game_mut.action_on = dealer_hand_idx;
        } else {
            game_mut.action_on = (dealer_hand_idx + 1) % num_players;
        };
        
        // Skip non-active players
        let start = game_mut.action_on;
        while (*vector::borrow(&game_mut.player_status, game_mut.action_on) != STATUS_ACTIVE) {
            game_mut.action_on = (game_mut.action_on + 1) % num_players;
            if (game_mut.action_on == start) {
                // No active players - run out remaining community cards before showdown
                run_all_in_runout_internal(game_mut);
                game_mut.phase = PHASE_SHOWDOWN;
                run_showdown_internal(table, table_addr);
                return
            };
        };
        
        let game_mut = option::borrow_mut(&mut table.game);
        if (game_mut.phase == PHASE_PREFLOP) {
            deal_community_cards_internal(game_mut, 3);
            game_mut.phase = PHASE_FLOP;
        } else if (game_mut.phase == PHASE_FLOP) {
            deal_community_cards_internal(game_mut, 1);
            game_mut.phase = PHASE_TURN;
        } else if (game_mut.phase == PHASE_TURN) {
            deal_community_cards_internal(game_mut, 1);
            game_mut.phase = PHASE_RIVER;
        } else {
            game_mut.phase = PHASE_SHOWDOWN;
            run_showdown_internal(table, table_addr);
            return
        };
        
        game_mut.action_deadline = timestamp::now_seconds() + ACTION_TIMEOUT_SECS;
    }

    /// Deal remaining community cards when all players are all-in
    fun run_all_in_runout_internal(game: &mut Game) {
        let community_len = vector::length(&game.community_cards);
        if (community_len < 5) {
            let remaining = 5 - community_len;
            deal_community_cards_internal(game, remaining);
        };
    }

    fun run_showdown_internal(table: &mut Table, table_addr: address) acquires FeeConfig {
        let game = option::borrow(&table.game);
        let hand_rankings = vector::empty<pot_manager::HandRanking>();
        let num_players = vector::length(&game.players_in_hand);
        
        // Build hand rankings and collect showdown data
        let showdown_seats = vector::empty<u64>();
        let showdown_players = vector::empty<address>();
        let showdown_hole_cards = vector::empty<vector<u8>>();
        let showdown_hand_types = vector::empty<u8>();
        
        let i = 0u64;
        while (i < num_players) {
            let status = *vector::borrow(&game.player_status, i);
            let seat_idx = *vector::borrow(&game.players_in_hand, i);
            
            if (status == STATUS_ACTIVE || status == STATUS_ALL_IN) {
                // Decrypt the hole cards for hand evaluation
                let encrypted_hole = vector::borrow(&game.encrypted_hole_cards, i);
                let secret = vector::borrow(&game.secrets, i);
                let card_key = derive_card_key(secret, seat_idx);
                let decrypted_hole = xor_encrypt_cards(encrypted_hole, &card_key);
                
                let cards = vector::empty<u8>();
                vector::append(&mut cards, decrypted_hole);
                vector::append(&mut cards, game.community_cards);
                
                let (hand_type, tiebreaker) = hand_eval::evaluate_hand(cards);
                vector::push_back(&mut hand_rankings, pot_manager::new_hand_ranking(hand_type, tiebreaker));
                
                // Collect showdown data for non-folded players (use decrypted cards)
                vector::push_back(&mut showdown_seats, seat_idx);
                let seat = option::borrow(vector::borrow(&table.seats, seat_idx));
                vector::push_back(&mut showdown_players, seat.player);
                vector::push_back(&mut showdown_hole_cards, xor_encrypt_cards(encrypted_hole, &card_key));
                vector::push_back(&mut showdown_hand_types, hand_type);
            } else {
                vector::push_back(&mut hand_rankings, pot_manager::new_hand_ranking(0, 0));
            };
            i = i + 1;
        };
        
        let active = get_non_folded_mask_internal(game);
        let game = option::borrow(&table.game);
        let dealer_hand_idx = get_dealer_hand_idx_internal(game);
        let distributions = pot_manager::calculate_distribution(
            &game.pot_state, 
            &hand_rankings, 
            &active,
            dealer_hand_idx,
            num_players
        );
        
        let game = option::borrow(&table.game);
        let players_in_hand = game.players_in_hand;
        let community_cards = game.community_cards;
        let total_pot = pot_manager::get_total_pot(&game.pot_state);
        let fee_collector = borrow_global<FeeConfig>(@holdemgame).fee_collector;
        let hand_number = table.hand_number;
        
        // Process distributions and build winner data
        let winner_seats = vector::empty<u64>();
        let winner_players = vector::empty<address>();
        let winner_amounts = vector::empty<u64>();
        
        // Calculate fee using accumulator for fractional precision
        // Add pot fee contribution to accumulator (in basis-points units)
        let pot_fee_contribution = total_pot * FEE_BASIS_POINTS;
        table.fee_accumulator = table.fee_accumulator + pot_fee_contribution;
        
        // Collect whole chips from accumulator
        let fee_to_collect = table.fee_accumulator / 10000;
        table.fee_accumulator = table.fee_accumulator % 10000;  // Keep fractional remainder
        
        // Calculate net pot after fee
        let net_pot = if (fee_to_collect > total_pot) { 0 } else { total_pot - fee_to_collect };
        
        // Track original total pot for proportional distribution
        let original_total = total_pot;
        
        let d = 0u64;
        while (d < vector::length(&distributions)) {
            let dist = vector::borrow(&distributions, d);
            let hand_idx = pot_manager::get_distribution_player(dist);
            let amount = pot_manager::get_distribution_amount(dist);
            
            // Calculate proportional share of net pot (after fee)
            // net_amount = (amount / original_total) * net_pot
            let net_amount = if (original_total > 0) {
                (amount * net_pot) / original_total
            } else { 0 };
            
            let seat_idx = *vector::borrow(&players_in_hand, hand_idx);
            let seat = option::borrow_mut(vector::borrow_mut(&mut table.seats, seat_idx));
            seat.chip_count = seat.chip_count + net_amount;
            
            // Record winner data
            vector::push_back(&mut winner_seats, seat_idx);
            vector::push_back(&mut winner_players, seat.player);
            vector::push_back(&mut winner_amounts, net_amount);
            
            d = d + 1;
        };
        
        // Transfer fees to fee recipient
        if (fee_to_collect > 0) {
            chips::transfer_chips(table_addr, fee_collector, fee_to_collect);
            table.total_fees_collected = table.total_fees_collected + fee_to_collect;
        };
        
        // Emit comprehensive hand result event
        poker_events::emit_hand_result(
            table_addr,
            hand_number,
            timestamp::now_seconds(),
            community_cards,
            showdown_seats,
            showdown_players,
            showdown_hole_cards,
            showdown_hand_types,
            winner_seats,
            winner_players,
            winner_amounts,
            total_pot,
            fee_to_collect,
            0, // result_type: showdown
        );
        
        // Process pending leaves before clearing the game
        process_pending_leaves(table, table_addr);
        
        table.game = option::none();
    }

    fun end_hand_fold_internal(table: &mut Table, table_addr: address) acquires FeeConfig {
        {
            let game_mut = option::borrow_mut(&mut table.game);
            let non_folded = get_non_folded_mask_internal(game_mut);
            pot_manager::collect_bets(&mut game_mut.pot_state, &non_folded);
        };
        
        let game = option::borrow(&table.game);
        let num_players = vector::length(&game.players_in_hand);
        let winner_hand_idx = 0u64;
        let i = 0u64;
        while (i < num_players) {
            if (*vector::borrow(&game.player_status, i) != STATUS_FOLDED) {
                winner_hand_idx = i;
                break
            };
            i = i + 1;
        };
        
        let game = option::borrow(&table.game);
        let total = pot_manager::get_total_pot(&game.pot_state);
        let community_cards = game.community_cards;
        let seat_idx = *vector::borrow(&game.players_in_hand, winner_hand_idx);
        let hand_number = table.hand_number;
        
        // Calculate fee using accumulator for fractional precision
        // Add pot fee contribution to accumulator (in basis-points units)
        let pot_fee_contribution = total * FEE_BASIS_POINTS;
        table.fee_accumulator = table.fee_accumulator + pot_fee_contribution;
        
        // Collect whole chips from accumulator
        let fee_to_collect = table.fee_accumulator / 10000;
        table.fee_accumulator = table.fee_accumulator % 10000;  // Keep fractional remainder
        
        // Calculate net amount after fee
        let net_amount = if (fee_to_collect > total) { 0 } else { total - fee_to_collect };
        
        let seat = option::borrow_mut(vector::borrow_mut(&mut table.seats, seat_idx));
        seat.chip_count = seat.chip_count + net_amount;
        let winner_player = seat.player;
        
        // Transfer fees to fee recipient
        if (fee_to_collect > 0) {
            let fee_collector = borrow_global<FeeConfig>(@holdemgame).fee_collector;
            chips::transfer_chips(table_addr, fee_collector, fee_to_collect);
            table.total_fees_collected = table.total_fees_collected + fee_to_collect;
        };
        
        // Emit hand result event for fold win
        // For fold wins, showdown arrays are empty (cards not revealed)
        poker_events::emit_hand_result(
            table_addr,
            hand_number,
            timestamp::now_seconds(),
            community_cards,
            vector::empty<u64>(),           // showdown_seats (empty - no showdown)
            vector::empty<address>(),       // showdown_players
            vector::empty<vector<u8>>(),    // showdown_hole_cards
            vector::empty<u8>(),            // showdown_hand_types
            vector::singleton(seat_idx),    // winner_seats
            vector::singleton(winner_player), // winner_players
            vector::singleton(net_amount),  // winner_amounts
            total,
            fee_to_collect,
            1, // result_type: fold_win
        );
        
        // Process pending leaves before clearing the game
        process_pending_leaves(table, table_addr);
        
        table.game = option::none();
    }

    /// Process pending leaves - auto-remove players who requested to leave after hand
    fun process_pending_leaves(table: &mut Table, table_addr: address) {
        let i = 0u64;
        while (i < MAX_PLAYERS) {
            if (*vector::borrow(&table.pending_leaves, i) && 
                option::is_some(vector::borrow(&table.seats, i))) {
                let seat = option::extract(vector::borrow_mut(&mut table.seats, i));
                if (seat.chip_count > 0) {
                    chips::transfer_chips(table_addr, seat.player, seat.chip_count);
                };
                *vector::borrow_mut(&mut table.pending_leaves, i) = false;
                poker_events::emit_player_left(table_addr, i, seat.player, seat.chip_count);
            };
            i = i + 1;
        };
    }

    // ============================================
    // HELPER FUNCTIONS
    // ============================================

    fun find_player_seat_in_table(table: &Table, player: address): u64 {
        let i = 0u64;
        while (i < MAX_PLAYERS) {
            if (option::is_some(vector::borrow(&table.seats, i))) {
                let seat = option::borrow(vector::borrow(&table.seats, i));
                if (seat.player == player) { return i };
            };
            i = i + 1;
        };
        MAX_PLAYERS
    }

    fun find_player_hand_idx(players_in_hand: &vector<u64>, seats: &vector<Option<Seat>>, player: address): u64 {
        let num = vector::length(players_in_hand);
        let i = 0u64;
        while (i < num) {
            let seat_idx = *vector::borrow(players_in_hand, i);
            let seat = option::borrow(vector::borrow(seats, seat_idx));
            if (seat.player == player) { return i };
            i = i + 1;
        };
        num
    }

    fun check_action_allowed_internal(game: &Game, seats: &vector<Option<Seat>>, player: address) {
        assert!(game.phase >= PHASE_PREFLOP && game.phase <= PHASE_RIVER, E_WRONG_PHASE);
        let hand_idx = find_player_hand_idx(&game.players_in_hand, seats, player);
        assert!(game.action_on == hand_idx, E_NOT_YOUR_TURN);
        assert!(*vector::borrow(&game.player_status, hand_idx) == STATUS_ACTIVE, E_INVALID_ACTION);
    }

    /// Reset has_acted_mask for all players except the specified one (the raiser).
    /// Called when a raise reopens betting.
    fun reset_acted_mask_except(game: &mut Game, except_idx: u64) {
        let num = vector::length(&game.has_acted_mask);
        let i = 0u64;
        while (i < num) {
            if (i == except_idx) {
                *vector::borrow_mut(&mut game.has_acted_mask, i) = true;
            } else {
                let status = *vector::borrow(&game.player_status, i);
                // Only reset for ACTIVE players (folded/all-in don't need to act)
                if (status == STATUS_ACTIVE) {
                    *vector::borrow_mut(&mut game.has_acted_mask, i) = false;
                };
            };
            i = i + 1;
        };
    }

    fun get_active_seat_indices_internal(table: &Table): vector<u64> {
        let active = vector::empty<u64>();
        let i = 0u64;
        while (i < MAX_PLAYERS) {
            if (option::is_some(vector::borrow(&table.seats, i))) {
                let seat = option::borrow(vector::borrow(&table.seats, i));
                if (!seat.is_sitting_out && seat.chip_count > 0) {
                    vector::push_back(&mut active, i);
                };
            };
            i = i + 1;
        };
        active
    }

    fun next_active_seat_internal(table: &Table, from: u64): u64 {
        let i = (from + 1) % MAX_PLAYERS;
        while (i != from) {
            if (option::is_some(vector::borrow(&table.seats, i))) {
                let seat = option::borrow(vector::borrow(&table.seats, i));
                if (!seat.is_sitting_out && seat.chip_count > 0) { return i };
            };
            i = (i + 1) % MAX_PLAYERS;
        };
        from
    }

    fun all_committed_internal(game: &Game): bool {
        let len = vector::length(&game.commits);
        let i = 0u64;
        while (i < len) {
            if (vector::is_empty(vector::borrow(&game.commits, i))) { return false };
            i = i + 1;
        };
        true
    }

    fun all_revealed_internal(game: &Game): bool {
        let len = vector::length(&game.secrets);
        let i = 0u64;
        while (i < len) {
            if (vector::is_empty(vector::borrow(&game.secrets, i))) { return false };
            i = i + 1;
        };
        true
    }

    fun shuffle_deck_internal(game: &mut Game) {
        // Build seed from all player secrets
        let seed = vector::empty<u8>();
        let i = 0u64;
        while (i < vector::length(&game.secrets)) {
            vector::append(&mut seed, *vector::borrow(&game.secrets, i));
            i = i + 1;
        };
        
        // MEDIUM-4 Fix: Use fixed deadlines + block height for unbiased entropy
        // Deadlines are fixed when phases end, not player-controlled
        let deadline_bytes = bcs::to_bytes(&game.commit_deadline);
        vector::append(&mut seed, deadline_bytes);
        
        let reveal_deadline_bytes = bcs::to_bytes(&game.reveal_deadline);
        vector::append(&mut seed, reveal_deadline_bytes);
        
        // Block height provides additional entropy not directly controllable by players
        let block_height = block::get_current_block_height();
        let block_bytes = bcs::to_bytes(&block_height);
        vector::append(&mut seed, block_bytes);
        
        let seed_hash = hash::sha3_256(seed);
        
        let deck = vector::empty<u8>();
        let c = 0u8;
        while ((c as u64) < 52) {
            vector::push_back(&mut deck, c);
            c = c + 1;
        };
        
        let hash_state = seed_hash;
        let n = 52u64;
        while (n > 1) {
            hash_state = hash::sha3_256(hash_state);
            // Use 8 bytes for better entropy distribution (u64 instead of u8)
            let rand: u64 = 0;
            let byte_idx = 0u64;
            while (byte_idx < 8) {
                rand = (rand << 8) | (*vector::borrow(&hash_state, byte_idx) as u64);
                byte_idx = byte_idx + 1;
            };
            let j = rand % n;
            n = n - 1;
            vector::swap(&mut deck, n, j);
        };
        
        game.deck = deck;
        game.deck_index = 0;
    }

    /// Generate per-player card encryption key from their secret and seat index
    fun derive_card_key(secret: &vector<u8>, seat_idx: u64): vector<u8> {
        let key_material = vector::empty<u8>();
        vector::append(&mut key_material, *secret);
        // Append a domain separator
        vector::append(&mut key_material, b"HOLECARDS");
        // Append seat index bytes
        let seat_bytes = bcs::to_bytes(&seat_idx);
        vector::append(&mut key_material, seat_bytes);
        hash::sha3_256(key_material)
    }
    
    /// XOR encrypt/decrypt cards (symmetric operation)
    fun xor_encrypt_cards(cards: &vector<u8>, key: &vector<u8>): vector<u8> {
        let result = vector::empty<u8>();
        let i = 0u64;
        let key_len = vector::length(key);
        while (i < vector::length(cards)) {
            let card_byte = *vector::borrow(cards, i);
            let key_byte = *vector::borrow(key, i % key_len);
            vector::push_back(&mut result, card_byte ^ key_byte);
            i = i + 1;
        };
        result
    }

    fun deal_hole_cards_internal(game: &mut Game) {
        let num = vector::length(&game.players_in_hand);
        let p = 0u64;
        while (p < num) {
            // Deal 2 cards
            let card1 = *vector::borrow(&game.deck, game.deck_index);
            let card2 = *vector::borrow(&game.deck, game.deck_index + 1);
            game.deck_index = game.deck_index + 2;
            
            let plain_cards = vector::empty<u8>();
            vector::push_back(&mut plain_cards, card1);
            vector::push_back(&mut plain_cards, card2);
            
            // CRITICAL-1 Fix: Encrypt cards with player's derived key
            let secret = vector::borrow(&game.secrets, p);
            let seat_idx = *vector::borrow(&game.players_in_hand, p);
            let card_key = derive_card_key(secret, seat_idx);
            
            let encrypted = xor_encrypt_cards(&plain_cards, &card_key);
            *vector::borrow_mut(&mut game.encrypted_hole_cards, p) = encrypted;
            
            p = p + 1;
        };
    }

    fun deal_community_cards_internal(game: &mut Game, count: u64) {
        let i = 0u64;
        while (i < count) {
            vector::push_back(&mut game.community_cards, *vector::borrow(&game.deck, game.deck_index));
            game.deck_index = game.deck_index + 1;
            i = i + 1;
        };
    }

    fun post_blinds_internal(game: &mut Game, seats: &mut vector<Option<Seat>>, sb: u64, bb: u64) {
        let _num_players = vector::length(&game.players_in_hand);
        let sb_hand_idx = get_small_blind_hand_idx_internal(game);
        let bb_hand_idx = get_big_blind_hand_idx_internal(game);
        
        let sb_seat_idx = *vector::borrow(&game.players_in_hand, sb_hand_idx);
        let bb_seat_idx = *vector::borrow(&game.players_in_hand, bb_hand_idx);
        
        let sb_amount = sb;
        {
            let seat = option::borrow_mut(vector::borrow_mut(seats, sb_seat_idx));
            if (seat.chip_count < sb_amount) {
                sb_amount = seat.chip_count;
                *vector::borrow_mut(&mut game.player_status, sb_hand_idx) = STATUS_ALL_IN;
            };
            seat.chip_count = seat.chip_count - sb_amount;
        };
        pot_manager::add_bet(&mut game.pot_state, sb_hand_idx, sb_amount);
        
        let bb_amount = bb;
        {
            let seat = option::borrow_mut(vector::borrow_mut(seats, bb_seat_idx));
            if (seat.chip_count < bb_amount) {
                bb_amount = seat.chip_count;
                *vector::borrow_mut(&mut game.player_status, bb_hand_idx) = STATUS_ALL_IN;
            };
            seat.chip_count = seat.chip_count - bb_amount;
        };
        pot_manager::add_bet(&mut game.pot_state, bb_hand_idx, bb_amount);
        
        game.min_raise = bb;
    }

    /// Post antes from all players (called before blinds)
    fun post_antes_internal(game: &mut Game, seats: &mut vector<Option<Seat>>, ante: u64) {
        if (ante == 0) { return };
        
        let num_players = vector::length(&game.players_in_hand);
        let i = 0u64;
        while (i < num_players) {
            let seat_idx = *vector::borrow(&game.players_in_hand, i);
            let ante_amount = ante;
            {
                let seat = option::borrow_mut(vector::borrow_mut(seats, seat_idx));
                if (seat.chip_count < ante_amount) {
                    ante_amount = seat.chip_count;
                    *vector::borrow_mut(&mut game.player_status, i) = STATUS_ALL_IN;
                };
                seat.chip_count = seat.chip_count - ante_amount;
            };
            pot_manager::add_bet(&mut game.pot_state, i, ante_amount);
            i = i + 1;
        };
    }

    fun get_dealer_hand_idx_internal(game: &Game): u64 {
        let num = vector::length(&game.players_in_hand);
        let i = 0u64;
        while (i < num) {
            if (*vector::borrow(&game.players_in_hand, i) == game.dealer_position) { return i };
            i = i + 1;
        };
        0
    }

    fun get_small_blind_hand_idx_internal(game: &Game): u64 {
        let dealer_idx = get_dealer_hand_idx_internal(game);
        let num = vector::length(&game.players_in_hand);
        // Heads-up: dealer posts the small blind
        if (num == 2) {
            return dealer_idx
        };
        (dealer_idx + 1) % num
    }

    fun get_big_blind_hand_idx_internal(game: &Game): u64 {
        let dealer_idx = get_dealer_hand_idx_internal(game);
        let num = vector::length(&game.players_in_hand);
        // Heads-up: non-dealer posts the big blind
        if (num == 2) {
            return (dealer_idx + 1) % num
        };
        (dealer_idx + 2) % num
    }

    fun count_active_players_internal(game: &Game): u64 {
        let count = 0u64;
        let i = 0u64;
        while (i < vector::length(&game.player_status)) {
            let status = *vector::borrow(&game.player_status, i);
            if (status == STATUS_ACTIVE || status == STATUS_ALL_IN) { count = count + 1; };
            i = i + 1;
        };
        count
    }

    fun is_betting_complete_internal(game: &Game): bool {
        let max_bet = pot_manager::get_max_current_bet(&game.pot_state);
        let num = vector::length(&game.player_status);
        
        let i = 0u64;
        while (i < num) {
            let status = *vector::borrow(&game.player_status, i);
            if (status == STATUS_ACTIVE) {
                // Player must have acted this round
                if (!*vector::borrow(&game.has_acted_mask, i)) { return false };
                // All bets must be matched
                let bet = pot_manager::get_current_bet(&game.pot_state, i);
                if (bet < max_bet) { return false };
            };
            i = i + 1;
        };
        true
    }

    fun next_active_hand_idx_internal(game: &Game): u64 {
        let num = vector::length(&game.player_status);
        let next = (game.action_on + 1) % num;
        while (next != game.action_on) {
            if (*vector::borrow(&game.player_status, next) == STATUS_ACTIVE) { return next };
            next = (next + 1) % num;
        };
        game.action_on
    }

    fun get_active_mask_internal(game: &Game): vector<bool> {
        let mask = vector::empty<bool>();
        let i = 0u64;
        while (i < vector::length(&game.player_status)) {
            let status = *vector::borrow(&game.player_status, i);
            vector::push_back(&mut mask, status == STATUS_ACTIVE);
            i = i + 1;
        };
        mask
    }

    fun get_all_in_mask_internal(game: &Game): vector<bool> {
        let mask = vector::empty<bool>();
        let i = 0u64;
        while (i < vector::length(&game.player_status)) {
            let status = *vector::borrow(&game.player_status, i);
            vector::push_back(&mut mask, status == STATUS_ALL_IN);
            i = i + 1;
        };
        mask
    }

    fun get_non_folded_mask_internal(game: &Game): vector<bool> {
        let mask = vector::empty<bool>();
        let i = 0u64;
        while (i < vector::length(&game.player_status)) {
            let status = *vector::borrow(&game.player_status, i);
            vector::push_back(&mut mask, status != STATUS_FOLDED);
            i = i + 1;
        };
        mask
    }

    // ============================================
    // VIEW FUNCTIONS
    // ============================================

    #[view]
    public fun get_table_config(table_addr: address): (u64, u64, u64, u64) acquires Table {
        let table = borrow_global<Table>(table_addr);
        (table.config.small_blind, table.config.big_blind, table.config.min_buy_in, table.config.max_buy_in)
    }

    #[view]
    public fun get_game_phase(table_addr: address): u8 acquires Table {
        let table = borrow_global<Table>(table_addr);
        if (option::is_none(&table.game)) { PHASE_WAITING }
        else { option::borrow(&table.game).phase }
    }

    #[view]
    public fun get_pot_size(table_addr: address): u64 acquires Table {
        let table = borrow_global<Table>(table_addr);
        if (option::is_none(&table.game)) { 0 }
        else { pot_manager::get_total_pot(&option::borrow(&table.game).pot_state) }
    }

    #[view]
    public fun get_community_cards(table_addr: address): vector<u8> acquires Table {
        let table = borrow_global<Table>(table_addr);
        if (option::is_none(&table.game)) { vector::empty() }
        else { option::borrow(&table.game).community_cards }
    }

    #[view]
    public fun get_seat_info(table_addr: address, seat_idx: u64): (address, u64, bool) acquires Table {
        let table = borrow_global<Table>(table_addr);
        if (option::is_some(vector::borrow(&table.seats, seat_idx))) {
            let seat = option::borrow(vector::borrow(&table.seats, seat_idx));
            (seat.player, seat.chip_count, seat.is_sitting_out)
        } else {
            (@0x0, 0, true)
        }
    }

    // ============================================
    // EXTENDED VIEW FUNCTIONS (Frontend Integration)
    // ============================================

    #[view]
    /// Get full table config including ante, straddle, and fee info
    public fun get_table_config_full(table_addr: address): (u64, u64, u64, u64, u64, bool, u64) acquires Table {
        let table = borrow_global<Table>(table_addr);
        (
            table.config.small_blind,
            table.config.big_blind,
            table.config.min_buy_in,
            table.config.max_buy_in,
            table.config.ante,
            table.config.straddle_enabled,
            FEE_BASIS_POINTS
        )
    }

    #[view]
    /// Get table state (hand number, dealer, next BB seat)
    public fun get_table_state(table_addr: address): (u64, u64, u64, u64) acquires Table {
        let table = borrow_global<Table>(table_addr);
        (table.hand_number, table.dealer_button, table.next_bb_seat, table.total_fees_collected)
    }

    #[view]
    /// Get whose turn it is (seat index and address)
    public fun get_action_on(table_addr: address): (u64, address, u64) acquires Table {
        let table = borrow_global<Table>(table_addr);
        if (option::is_none(&table.game)) {
            return (0, @0x0, 0)
        };
        let game = option::borrow(&table.game);
        let hand_idx = game.action_on;
        let seat_idx = *vector::borrow(&game.players_in_hand, hand_idx);
        let player_addr = if (option::is_some(vector::borrow(&table.seats, seat_idx))) {
            option::borrow(vector::borrow(&table.seats, seat_idx)).player
        } else { @0x0 };
        (seat_idx, player_addr, game.action_deadline)
    }

    #[view]
    /// Get action deadline
    public fun get_action_deadline(table_addr: address): u64 acquires Table {
        let table = borrow_global<Table>(table_addr);
        if (option::is_none(&table.game)) { 0 }
        else { option::borrow(&table.game).action_deadline }
    }

    #[view]
    /// Get current min raise amount
    public fun get_min_raise(table_addr: address): u64 acquires Table {
        let table = borrow_global<Table>(table_addr);
        if (option::is_none(&table.game)) { 0 }
        else { option::borrow(&table.game).min_raise }
    }

    #[view]
    /// Get max current bet this round
    public fun get_max_current_bet(table_addr: address): u64 acquires Table {
        let table = borrow_global<Table>(table_addr);
        if (option::is_none(&table.game)) { 0 }
        else { pot_manager::get_max_current_bet(&option::borrow(&table.game).pot_state) }
    }

    #[view]
    /// Get commit deadline
    public fun get_commit_deadline(table_addr: address): u64 acquires Table {
        let table = borrow_global<Table>(table_addr);
        if (option::is_none(&table.game)) { 0 }
        else { option::borrow(&table.game).commit_deadline }
    }

    #[view]
    /// Get reveal deadline
    public fun get_reveal_deadline(table_addr: address): u64 acquires Table {
        let table = borrow_global<Table>(table_addr);
        if (option::is_none(&table.game)) { 0 }
        else { option::borrow(&table.game).reveal_deadline }
    }

    #[view]
    /// Get player's seat index from their address
    public fun get_player_seat(table_addr: address, player_addr: address): u64 acquires Table {
        let table = borrow_global<Table>(table_addr);
        find_player_seat_in_table(table, player_addr)
    }

    #[view]
    /// Get seat indices of players in current hand
    public fun get_players_in_hand(table_addr: address): vector<u64> acquires Table {
        let table = borrow_global<Table>(table_addr);
        if (option::is_none(&table.game)) { vector::empty() }
        else { option::borrow(&table.game).players_in_hand }
    }

    #[view]
    /// Get encrypted hole cards for all players in hand
    /// Frontend decrypts using player's secret + seat index
    /// Note: This returns ENCRYPTED data - only the player with the matching secret can decrypt
    public fun get_encrypted_hole_cards(table_addr: address): vector<vector<u8>> acquires Table {
        let table = borrow_global<Table>(table_addr);
        if (option::is_none(&table.game)) { vector::empty() }
        else { option::borrow(&table.game).encrypted_hole_cards }
    }


    #[view]
    /// Get status of each player in hand (0=waiting, 1=active, 2=folded, 3=all-in)
    public fun get_player_statuses(table_addr: address): vector<u8> acquires Table {
        let table = borrow_global<Table>(table_addr);
        if (option::is_none(&table.game)) { vector::empty() }
        else { option::borrow(&table.game).player_status }
    }

    #[view]
    /// Get commit status as boolean array (true = committed)
    public fun get_commit_status(table_addr: address): vector<bool> acquires Table {
        let table = borrow_global<Table>(table_addr);
        if (option::is_none(&table.game)) { return vector::empty() };
        let game = option::borrow(&table.game);
        let result = vector::empty<bool>();
        let i = 0u64;
        while (i < vector::length(&game.commits)) {
            vector::push_back(&mut result, !vector::is_empty(vector::borrow(&game.commits, i)));
            i = i + 1;
        };
        result
    }

    #[view]
    /// Get reveal status as boolean array (true = revealed)
    public fun get_reveal_status(table_addr: address): vector<bool> acquires Table {
        let table = borrow_global<Table>(table_addr);
        if (option::is_none(&table.game)) { return vector::empty() };
        let game = option::borrow(&table.game);
        let result = vector::empty<bool>();
        let i = 0u64;
        while (i < vector::length(&game.secrets)) {
            vector::push_back(&mut result, !vector::is_empty(vector::borrow(&game.secrets, i)));
            i = i + 1;
        };
        result
    }

    #[view]
    /// Get current bets per player in hand
    public fun get_current_bets(table_addr: address): vector<u64> acquires Table {
        let table = borrow_global<Table>(table_addr);
        if (option::is_none(&table.game)) { vector::empty() }
        else { pot_manager::get_current_bets(&option::borrow(&table.game).pot_state) }
    }

    #[view]
    /// Get total invested per player in hand
    public fun get_total_invested(table_addr: address): vector<u64> acquires Table {
        let table = borrow_global<Table>(table_addr);
        if (option::is_none(&table.game)) { vector::empty() }
        else { pot_manager::get_total_invested(&option::borrow(&table.game).pot_state) }
    }

    #[view]
    /// Get call amount for a specific player (by hand index)
    public fun get_call_amount(table_addr: address, hand_idx: u64): u64 acquires Table {
        let table = borrow_global<Table>(table_addr);
        if (option::is_none(&table.game)) { 0 }
        else { pot_manager::get_call_amount(&option::borrow(&table.game).pot_state, hand_idx) }
    }

    #[view]
    /// Get last aggressor (seat index, or MAX if none)
    public fun get_last_aggressor(table_addr: address): u64 acquires Table {
        let table = borrow_global<Table>(table_addr);
        if (option::is_none(&table.game)) { return MAX_PLAYERS };
        let game = option::borrow(&table.game);
        if (option::is_none(&game.last_aggressor)) { MAX_PLAYERS }
        else {
            let hand_idx = *option::borrow(&game.last_aggressor);
            *vector::borrow(&game.players_in_hand, hand_idx)
        }
    }

    #[view]
    /// Get extended seat info including current bet and status
    public fun get_seat_info_full(table_addr: address, seat_idx: u64): (address, u64, bool, u64, u8) acquires Table {
        let table = borrow_global<Table>(table_addr);
        if (option::is_none(vector::borrow(&table.seats, seat_idx))) {
            return (@0x0, 0, true, 0, STATUS_WAITING)
        };
        
        let seat = option::borrow(vector::borrow(&table.seats, seat_idx));
        let current_bet = 0u64;
        let status = STATUS_WAITING;
        
        if (option::is_some(&table.game)) {
            let game = option::borrow(&table.game);
            // Find this seat's hand_idx
            let i = 0u64;
            while (i < vector::length(&game.players_in_hand)) {
                if (*vector::borrow(&game.players_in_hand, i) == seat_idx) {
                    current_bet = pot_manager::get_current_bet(&game.pot_state, i);
                    status = *vector::borrow(&game.player_status, i);
                    break
                };
                i = i + 1;
            };
        };
        
        (seat.player, seat.chip_count, seat.is_sitting_out, current_bet, status)
    }

    #[view]
    /// Get timeout penalty percentage
    public fun get_timeout_penalty_percent(): u64 {
        TIMEOUT_PENALTY_PERCENT
    }

    #[view]
    /// Get action timeout in seconds
    public fun get_action_timeout_secs(): u64 {
        ACTION_TIMEOUT_SECS
    }

    #[view]
    /// Check if table is paused
    public fun is_table_paused(table_addr: address): bool acquires Table {
        let table = borrow_global<Table>(table_addr);
        table.is_paused
    }

    #[view]
    /// Check if admin-only start is enabled
    public fun is_admin_only_start(table_addr: address): bool acquires Table {
        let table = borrow_global<Table>(table_addr);
        table.admin_only_start
    }

    #[view]
    /// Get pending leaves (players who want to leave after hand)
    public fun get_pending_leaves(table_addr: address): vector<bool> acquires Table {
        let table = borrow_global<Table>(table_addr);
        table.pending_leaves
    }

    #[view]
    /// Check if table is paused
    public fun is_paused(table_addr: address): bool acquires Table {
        let table = borrow_global<Table>(table_addr);
        table.is_paused
    }

    #[view]
    /// Get missed blinds for all seats
    public fun get_missed_blinds(table_addr: address): vector<u64> acquires Table {
        let table = borrow_global<Table>(table_addr);
        table.missed_blinds
    }

    #[view]
    /// Get seat count (occupied, total)
    public fun get_seat_count(table_addr: address): (u64, u64) acquires Table {
        let table = borrow_global<Table>(table_addr);
        let occupied = 0u64;
        let i = 0u64;
        while (i < MAX_PLAYERS) {
            if (option::is_some(vector::borrow(&table.seats, i))) {
                occupied = occupied + 1;
            };
            i = i + 1;
        };
        (occupied, MAX_PLAYERS)
    }

    #[view]
    /// Get the admin address for a table
    public fun get_admin(table_addr: address): address acquires Table {
        let table = borrow_global<Table>(table_addr);
        table.admin
    }
}
