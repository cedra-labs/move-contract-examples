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
    const TIMEOUT_PENALTY_PERCENT: u64 = 10;  // 10% of stack as timeout penalty

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
    const FEE_BASIS_POINTS: u64 = 30; // 0.3% service fee (30 / 10000)

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
        hole_cards: vector<vector<u8>>,
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

    struct Table has key {
        config: TableConfig,
        admin: address,
        seats: vector<Option<Seat>>,
        game: Option<Game>,
        dealer_button: u64,
        hand_number: u64,
        fee_recipient: address,
        total_fees_collected: u64,
        // Dead button tracking
        next_bb_seat: u64,           // Seat that owes big blind next
        missed_blinds: vector<u64>,  // Missed blind amounts per seat
        // New fields for deferred features
        is_paused: bool,             // Table paused (no new hands)
        pending_leaves: vector<bool>, // Players who want to leave after hand
        admin_only_start: bool,       // Only admin can start hands
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
        fee_recipient: address,
        ante: u64,
        straddle_enabled: bool
    ) {
        let admin_addr = signer::address_of(admin);
        assert!(!exists<Table>(admin_addr), E_TABLE_EXISTS);
        
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
        
        move_to(admin, Table {
            config: TableConfig { small_blind, big_blind, min_buy_in, max_buy_in, ante, straddle_enabled },
            admin: admin_addr,
            seats,
            game: option::none(),
            dealer_button: 0,
            hand_number: 0,
            fee_recipient,
            total_fees_collected: 0,
            next_bb_seat: 0,
            missed_blinds,
            is_paused: false,
            pending_leaves,
            admin_only_start: false,
        });
        
        poker_events::emit_table_created(
            admin_addr, admin_addr, small_blind, big_blind, 
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
        
        assert!(seat_idx < MAX_PLAYERS, E_TABLE_FULL);
        assert!(option::is_none(vector::borrow(&table.seats, seat_idx)), E_SEAT_TAKEN);
        assert!(buy_in_chips >= table.config.min_buy_in, E_BUY_IN_TOO_LOW);
        assert!(buy_in_chips <= table.config.max_buy_in, E_BUY_IN_TOO_HIGH);
        
        let player_addr = signer::address_of(player);
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
        
        poker_events::emit_player_sat_out(table_addr, seat_idx, player_addr);
    }

    /// Sit back in - player will be dealt into the next hand
    public entry fun sit_in(player: &signer, table_addr: address) acquires Table {
        assert!(exists<Table>(table_addr), E_TABLE_NOT_FOUND);
        let table = borrow_global_mut<Table>(table_addr);
        
        let player_addr = signer::address_of(player);
        let seat_idx = find_player_seat_in_table(table, player_addr);
        assert!(seat_idx < MAX_PLAYERS, E_NOT_AT_TABLE);
        
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

    /// Close and delete a table (admin only)
    /// 
    /// Returns chips to any seated players and removes the Table resource.
    /// Cannot be called while a hand is in progress.
    public entry fun close_table(admin: &signer, table_addr: address) acquires Table {
        assert!(exists<Table>(table_addr), E_TABLE_NOT_FOUND);
        
        let admin_addr = signer::address_of(admin);
        let table = borrow_global<Table>(table_addr);
        assert!(table.admin == admin_addr, E_NOT_ADMIN);
        assert!(option::is_none(&table.game), E_GAME_IN_PROGRESS);
        
        // Move out and destroy the table
        let Table {
            config: _,
            admin: _,
            seats,
            game: _,
            dealer_button: _,
            hand_number: _,
            fee_recipient: _,
            total_fees_collected: _,
            next_bb_seat: _,
            missed_blinds: _,
            is_paused: _,
            pending_leaves: _,
            admin_only_start: _,
        } = move_from<Table>(table_addr);
        
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

    /// Update fee recipient (admin only)
    public entry fun update_fee_recipient(admin: &signer, table_addr: address, new_recipient: address) acquires Table {
        assert!(exists<Table>(table_addr), E_TABLE_NOT_FOUND);
        let table = borrow_global_mut<Table>(table_addr);
        assert!(table.admin == signer::address_of(admin), E_NOT_ADMIN);
        let old_recipient = table.fee_recipient;
        table.fee_recipient = new_recipient;
        
        poker_events::emit_fee_recipient_updated(table_addr, old_recipient, new_recipient);
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

    public entry fun start_hand(table_addr: address) acquires Table {
        assert!(exists<Table>(table_addr), E_TABLE_NOT_FOUND);
        let table = borrow_global_mut<Table>(table_addr);
        assert!(option::is_none(&table.game), E_GAME_IN_PROGRESS);
        assert!(!table.is_paused, E_INVALID_ACTION);  // Table must not be paused
        // Note: admin_only_start check would require passing caller signer
        // For now, anyone can call if not paused
        
        let active_seats = get_active_seat_indices_internal(table);
        assert!(vector::length(&active_seats) >= 2, E_NOT_ENOUGH_PLAYERS);
        
        table.dealer_button = next_active_seat_internal(table, table.dealer_button);
        table.hand_number = table.hand_number + 1;
        
        let num_players = vector::length(&active_seats);
        let player_status = vector::empty<u8>();
        let commits = vector::empty<vector<u8>>();
        let secrets = vector::empty<vector<u8>>();
        let hole_cards = vector::empty<vector<u8>>();
        let has_acted_mask = vector::empty<bool>();
        
        let i = 0u64;
        while (i < num_players) {
            vector::push_back(&mut player_status, STATUS_ACTIVE);
            vector::push_back(&mut commits, vector::empty());
            vector::push_back(&mut secrets, vector::empty());
            vector::push_back(&mut hole_cards, vector::empty());
            vector::push_back(&mut has_acted_mask, false);
            i = i + 1;
        };
        
        table.game = option::some(Game {
            phase: PHASE_COMMIT,
            hole_cards,
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
    }

    public entry fun submit_commit(
        player: &signer,
        table_addr: address,
        commit_hash: vector<u8>
    ) acquires Table {
        assert!(exists<Table>(table_addr), E_TABLE_NOT_FOUND);
        let table = borrow_global_mut<Table>(table_addr);
        assert!(option::is_some(&table.game), E_NO_GAME);
        
        let player_addr = signer::address_of(player);
        
        // Find player's hand index using seats directly
        let game = option::borrow(&table.game);
        assert!(game.phase == PHASE_COMMIT, E_WRONG_PHASE);
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
        let table = borrow_global_mut<Table>(table_addr);
        assert!(option::is_some(&table.game), E_NO_GAME);
        
        let player_addr = signer::address_of(player);
        
        // Read-only access first
        let game = option::borrow(&table.game);
        assert!(game.phase == PHASE_REVEAL, E_WRONG_PHASE);
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

    public entry fun fold(player: &signer, table_addr: address) acquires Table {
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
        
        advance_action_internal(table);
    }

    public entry fun check(player: &signer, table_addr: address) acquires Table {
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
        
        advance_action_internal(table);
    }

    public entry fun call(player: &signer, table_addr: address) acquires Table {
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
        
        advance_action_internal(table);
    }

    public entry fun raise_to(player: &signer, table_addr: address, total_bet: u64) acquires Table {
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
        
        advance_action_internal(table);
    }

    public entry fun all_in(player: &signer, table_addr: address) acquires Table {
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
        
        advance_action_internal(table);
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
    public entry fun handle_timeout(table_addr: address) acquires Table {
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
            advance_action_internal(table);
        };
    }

    // ============================================
    // INTERNAL GAME LOGIC
    // ============================================

    fun advance_action_internal(table: &mut Table) {
        let game = option::borrow(&table.game);
        let active_count = count_active_players_internal(game);
        
        if (active_count <= 1) {
            end_hand_fold_internal(table);
            return
        };
        
        let game = option::borrow(&table.game);
        if (is_betting_complete_internal(game)) {
            collect_and_advance_phase(table);
        } else {
            let game_mut = option::borrow_mut(&mut table.game);
            game_mut.action_on = next_active_hand_idx_internal(game_mut);
            game_mut.action_deadline = timestamp::now_seconds() + ACTION_TIMEOUT_SECS;
        };
    }

    fun collect_and_advance_phase(table: &mut Table) {
        {
            let game_mut = option::borrow_mut(&mut table.game);
            let non_folded = get_non_folded_mask_internal(game_mut);
            pot_manager::collect_bets(&mut game_mut.pot_state, &non_folded);
        };
        advance_phase_internal(table);
    }

    fun advance_phase_internal(table: &mut Table) {
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
            run_showdown_internal(table);
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
                run_showdown_internal(table);
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
            run_showdown_internal(table);
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

    fun run_showdown_internal(table: &mut Table) {
        let game = option::borrow(&table.game);
        let hand_rankings = vector::empty<pot_manager::HandRanking>();
        let num_players = vector::length(&game.players_in_hand);
        
        let i = 0u64;
        while (i < num_players) {
            let status = *vector::borrow(&game.player_status, i);
            if (status == STATUS_ACTIVE || status == STATUS_ALL_IN) {
                let cards = vector::empty<u8>();
                let hole = vector::borrow(&game.hole_cards, i);
                vector::append(&mut cards, *hole);
                vector::append(&mut cards, game.community_cards);
                
                let (hand_type, tiebreaker) = hand_eval::evaluate_hand(cards);
                vector::push_back(&mut hand_rankings, pot_manager::new_hand_ranking(hand_type, tiebreaker));
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
        let fee_recipient = table.fee_recipient;
        
        let d = 0u64;
        let total_fee = 0u64;
        while (d < vector::length(&distributions)) {
            let dist = vector::borrow(&distributions, d);
            let hand_idx = pot_manager::get_distribution_player(dist);
            let amount = pot_manager::get_distribution_amount(dist);
            
            // Calculate 0.3% service fee (30 basis points)
            let fee = (amount * FEE_BASIS_POINTS) / 10000;
            let net_amount = amount - fee;
            total_fee = total_fee + fee;
            
            let seat_idx = *vector::borrow(&players_in_hand, hand_idx);
            let seat = option::borrow_mut(vector::borrow_mut(&mut table.seats, seat_idx));
            seat.chip_count = seat.chip_count + net_amount;
            d = d + 1;
        };
        
        // Transfer fees to fee recipient
        if (total_fee > 0) {
            chips::transfer_chips(table.admin, fee_recipient, total_fee);
            table.total_fees_collected = table.total_fees_collected + total_fee;
        };
        
        table.game = option::none();
    }

    fun end_hand_fold_internal(table: &mut Table) {
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
        let seat_idx = *vector::borrow(&game.players_in_hand, winner_hand_idx);
        
        // Calculate 0.3% service fee
        let fee = (total * FEE_BASIS_POINTS) / 10000;
        let net_amount = total - fee;
        
        let seat = option::borrow_mut(vector::borrow_mut(&mut table.seats, seat_idx));
        seat.chip_count = seat.chip_count + net_amount;
        
        // Transfer fees to fee recipient
        if (fee > 0) {
            chips::transfer_chips(table.admin, table.fee_recipient, fee);
            table.total_fees_collected = table.total_fees_collected + fee;
        };
        
        table.game = option::none();
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
        let seed = vector::empty<u8>();
        let i = 0u64;
        while (i < vector::length(&game.secrets)) {
            vector::append(&mut seed, *vector::borrow(&game.secrets, i));
            i = i + 1;
        };
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

    fun deal_hole_cards_internal(game: &mut Game) {
        let num = vector::length(&game.players_in_hand);
        let p = 0u64;
        while (p < num) {
            let cards = vector::empty<u8>();
            vector::push_back(&mut cards, *vector::borrow(&game.deck, game.deck_index));
            vector::push_back(&mut cards, *vector::borrow(&game.deck, game.deck_index + 1));
            *vector::borrow_mut(&mut game.hole_cards, p) = cards;
            game.deck_index = game.deck_index + 2;
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
}
