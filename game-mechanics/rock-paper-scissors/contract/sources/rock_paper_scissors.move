/// Rock-Paper-Scissors Game with Commit-Reveal Mechanism
/// 
/// Features:
/// - Commit-reveal scheme prevents cheating (players can't see opponent's move before committing)
/// - Two players can join a game
/// - Players commit their moves (hashed with a secret)
/// - Players reveal their moves after both have committed
/// - Winner determination based on classic rules
/// - Staking mechanism for competitive play
/// - Timeout mechanism to prevent stalling
/// - Gas-efficient design
module RockPaperScissors::RockPaperScissors {
    use std::signer;
    use std::error;
    use std::hash;
    use std::vector;
    use cedra_framework::object::{Self, Object, ExtendRef};
    use cedra_framework::event;
    use cedra_framework::account;
    use cedra_framework::timestamp;
    use cedra_framework::fungible_asset::{Self, Metadata, FungibleStore};
    use cedra_framework::primary_fungible_store;
    use cedra_framework::dispatchable_fungible_asset;

    /// Error codes
    const E_GAME_NOT_FOUND: u64 = 1;
    const E_GAME_ALREADY_STARTED: u64 = 2;
    const E_GAME_NOT_READY: u64 = 3;
    const E_INVALID_MOVE: u64 = 4;
    const E_INVALID_COMMIT: u64 = 5;
    const E_ALREADY_COMMITTED: u64 = 6;
    const E_NOT_PLAYER: u64 = 7;
    const E_INVALID_STAKE: u64 = 8;
    const E_REVEAL_TIMEOUT: u64 = 9;
    const E_ALREADY_REVEALED: u64 = 10;
    const E_NOT_COMMITTED: u64 = 11;
    const E_GAME_ALREADY_FINISHED: u64 = 12;
    const E_INSUFFICIENT_BALANCE: u64 = 13;

    /// Move types: 0 = Rock, 1 = Paper, 2 = Scissors
    const MOVE_ROCK: u8 = 0;
    const MOVE_PAPER: u8 = 1;
    const MOVE_SCISSORS: u8 = 2;

    /// Timeout for reveal phase (5 minutes)
    const REVEAL_TIMEOUT_SECONDS: u64 = 300;

    /// Game state
    struct Game has key {
        id: u64,
        player1: address,
        player2: address,
        stake_amount: u64,
        payment_asset: Object<Metadata>,
        extend_ref: ExtendRef,  // Needed to transfer funds from game object
        // Commit phase
        player1_commit: vector<u8>,  // Hash of (move + secret)
        player2_commit: vector<u8>,
        player1_committed: bool,
        player2_committed: bool,
        commit_time: u64,
        // Reveal phase
        player1_move: u8,
        player2_move: u8,
        player1_revealed: bool,
        player2_revealed: bool,
        reveal_time: u64,
        // Game state
        status: u8,  // 0 = Waiting, 1 = Committed, 2 = Revealed, 3 = Finished
        winner: address,  // Winner address or @0x0 for tie
        game_events: event::EventHandle<GameEvent>,
    }

    /// Global game counter
    struct GameState has key {
        next_game_id: u64,
    }

    /// Game event
    struct GameEvent has drop, store {
        game_id: u64,
        event_type: u8,  // 0 = Created, 1 = Committed, 2 = Revealed, 3 = Finished
        player: address,
        player_move: u8,
        winner: address,
    }

    /// Initialize the game module
    fun init_module(admin: &signer) {
        move_to(admin, GameState {
            next_game_id: 0,
        });
    }

    #[test_only]
    public fun init_for_testing(admin: &signer) {
        init_module(admin);
    }

    /// Create a new game
    /// @param stake_amount: Amount each player must stake (0 for no stakes)
    /// @param payment_asset: The fungible asset used for staking (if stake_amount > 0)
    public entry fun create_game(
        creator: &signer,
        stake_amount: u64,
        payment_asset: Object<Metadata>,
    ) acquires GameState, Game {
        let creator_addr = signer::address_of(creator);
        
        // Get next game ID
        let state = borrow_global_mut<GameState>(@RockPaperScissors);
        let game_id = state.next_game_id;
        state.next_game_id = game_id + 1;
        
        // Create game object
        let constructor_ref = &object::create_named_object(creator, b"Game");
        let game_signer = object::generate_signer(constructor_ref);
        let game_address = object::address_from_constructor_ref(constructor_ref);
        let extend_ref = object::generate_extend_ref(constructor_ref);
        
        // Create fungible store for game object to hold stakes (if staking)
        if (stake_amount > 0) {
            fungible_asset::create_store(constructor_ref, payment_asset);
            // Transfer stake from player 1 (creator)
            let player1_store = primary_fungible_store::primary_store_inlined(creator_addr, payment_asset);
            let game_store = object::address_to_object<FungibleStore>(game_address);
            dispatchable_fungible_asset::transfer(creator, player1_store, game_store, stake_amount);
        };
        
        move_to(&game_signer, Game {
            id: game_id,
            player1: creator_addr,
            player2: @0x0,
            stake_amount,
            payment_asset,
            extend_ref,
            player1_commit: vector::empty(),
            player2_commit: vector::empty(),
            player1_committed: false,
            player2_committed: false,
            commit_time: 0,
            player1_move: 255,  // Invalid move (not set)
            player2_move: 255,
            player1_revealed: false,
            player2_revealed: false,
            reveal_time: 0,
            status: 0,  // Waiting for player 2
            winner: @0x0,
            game_events: account::new_event_handle<GameEvent>(&game_signer),
        });

        // Emit game created event
        let game = borrow_global_mut<Game>(game_address);
        event::emit_event(&mut game.game_events, GameEvent {
            game_id,
            event_type: 0,
            player: creator_addr,
            player_move: 255,
            winner: @0x0,
        });
    }

    /// Join a game as player 2
    /// @param game_address: Address of the game object
    public entry fun join_game(
        player2: &signer,
        game_address: address,
    ) acquires Game {
        let player2_addr = signer::address_of(player2);
        
        assert!(exists<Game>(game_address), error::not_found(E_GAME_NOT_FOUND));
        let game = borrow_global_mut<Game>(game_address);
        
        // Check game is waiting for player 2
        assert!(game.status == 0, error::invalid_state(E_GAME_ALREADY_STARTED));
        assert!(game.player2 == @0x0, error::invalid_state(E_GAME_ALREADY_STARTED));
        assert!(game.player1 != player2_addr, error::invalid_argument(E_NOT_PLAYER));
        
        // If staking, transfer stake from player 2
        if (game.stake_amount > 0) {
            let player2_store = primary_fungible_store::primary_store_inlined(player2_addr, game.payment_asset);
            let game_store = object::address_to_object<FungibleStore>(game_address);
            dispatchable_fungible_asset::transfer(player2, player2_store, game_store, game.stake_amount);
        };
        
        game.player2 = player2_addr;
        game.status = 1;  // Ready for commits
        
        // Emit event
        event::emit_event(&mut game.game_events, GameEvent {
            game_id: game.id,
            event_type: 0,
            player: player2_addr,
            player_move: 255,
            winner: @0x0,
        });
    }

    /// Commit a move (hashed)
    /// @param game_address: Address of the game object
    /// @param commit_hash: Hash of (move + secret) - should be 32 bytes
    public entry fun commit_move(
        player: &signer,
        game_address: address,
        commit_hash: vector<u8>,
    ) acquires Game {
        let player_addr = signer::address_of(player);
        
        assert!(exists<Game>(game_address), error::not_found(E_GAME_NOT_FOUND));
        let game = borrow_global_mut<Game>(game_address);
        
        // Check game is ready for commits
        assert!(game.status == 1, error::invalid_state(E_GAME_NOT_READY));
        assert!(game.player2 != @0x0, error::invalid_state(E_GAME_NOT_READY));
        
        // Validate commit hash length (should be 32 bytes for SHA3-256)
        assert!(vector::length(&commit_hash) == 32, error::invalid_argument(E_INVALID_COMMIT));
        
        // Check player is part of the game
        assert!(player_addr == game.player1 || player_addr == game.player2, error::permission_denied(E_NOT_PLAYER));
        
        // Check player hasn't already committed
        let is_player1 = player_addr == game.player1;
        if (is_player1) {
            assert!(!game.player1_committed, error::invalid_state(E_ALREADY_COMMITTED));
            game.player1_commit = commit_hash;
            game.player1_committed = true;
        } else {
            assert!(!game.player2_committed, error::invalid_state(E_ALREADY_COMMITTED));
            game.player2_commit = commit_hash;
            game.player2_committed = true;
        };
        
        // If both players committed, move to reveal phase
        if (game.player1_committed && game.player2_committed) {
            game.status = 2;  // Ready for reveals
            game.commit_time = timestamp::now_seconds();
        };
        
        // Emit event
        event::emit_event(&mut game.game_events, GameEvent {
            game_id: game.id,
            event_type: 1,
            player: player_addr,
            player_move: 255,  // Move not revealed yet
            winner: @0x0,
        });
    }

    /// Reveal a move
    /// @param game_address: Address of the game object
    /// @param player_move: The move (0 = Rock, 1 = Paper, 2 = Scissors)
    /// @param secret: The secret used in the commit hash
    public entry fun reveal_move(
        player: &signer,
        game_address: address,
        player_move: u8,
        secret: vector<u8>,
    ) acquires Game {
        let player_addr = signer::address_of(player);
        
        assert!(exists<Game>(game_address), error::not_found(E_GAME_NOT_FOUND));
        
        // Check game is ready for reveals and get player info
        let (is_player1, both_revealed) = {
            let game = borrow_global<Game>(game_address);
            assert!(game.status == 2, error::invalid_state(E_GAME_NOT_READY));
            assert!(player_addr == game.player1 || player_addr == game.player2, error::permission_denied(E_NOT_PLAYER));
            let is_p1 = player_addr == game.player1;
            let both = if (is_p1) {
                game.player2_revealed
            } else {
                game.player1_revealed
            };
            (is_p1, both)
        };
        
        // Validate move
        assert!(player_move <= MOVE_SCISSORS, error::invalid_argument(E_INVALID_MOVE));
        
        // Update game state in a block scope to drop borrow before calling finish_game
        let should_finish = {
            let game = borrow_global_mut<Game>(game_address);
            
            // Check player hasn't already revealed and update state
            if (is_player1) {
                assert!(!game.player1_revealed, error::invalid_state(E_ALREADY_REVEALED));
                assert!(game.player1_committed, error::invalid_state(E_NOT_COMMITTED));
                
                // Verify commit hash matches (move + secret)
                let expected_hash = compute_commit_hash(player_move, secret);
                assert!(vector::length(&expected_hash) == 32, error::invalid_argument(E_INVALID_COMMIT));
                assert!(vectors_equal(&game.player1_commit, &expected_hash), error::invalid_argument(E_INVALID_COMMIT));
                
                game.player1_move = player_move;
                game.player1_revealed = true;
            } else {
                assert!(!game.player2_revealed, error::invalid_state(E_ALREADY_REVEALED));
                assert!(game.player2_committed, error::invalid_state(E_NOT_COMMITTED));
                
                // Verify commit hash matches (move + secret)
                let expected_hash = compute_commit_hash(player_move, secret);
                assert!(vector::length(&expected_hash) == 32, error::invalid_argument(E_INVALID_COMMIT));
                assert!(vectors_equal(&game.player2_commit, &expected_hash), error::invalid_argument(E_INVALID_COMMIT));
                
                game.player2_move = player_move;
                game.player2_revealed = true;
            };
            
            // Set reveal time
            if (game.reveal_time == 0) {
                game.reveal_time = timestamp::now_seconds();
            };
            
            // Emit event
            event::emit_event(&mut game.game_events, GameEvent {
                game_id: game.id,
                event_type: 2,
                player: player_addr,
                player_move: player_move,
                winner: @0x0,
            });
            
            // Return whether we should finish the game
            both_revealed
        };
        
        // If both players revealed, finish the game (borrow is now dropped)
        if (should_finish) {
            finish_game(game_address);
        };
    }

    /// Finish the game and determine winner
    fun finish_game(game_address: address) acquires Game {
        let game = borrow_global_mut<Game>(game_address);
        
        // Determine winner based on moves
        let winner = if (game.player1_move == game.player2_move) {
            @0x0  // Tie
        } else if (
            (game.player1_move == MOVE_ROCK && game.player2_move == MOVE_SCISSORS) ||
            (game.player1_move == MOVE_PAPER && game.player2_move == MOVE_ROCK) ||
            (game.player1_move == MOVE_SCISSORS && game.player2_move == MOVE_PAPER)
        ) {
            game.player1  // Player 1 wins
        } else {
            game.player2  // Player 2 wins
        };
        
        game.winner = winner;
        game.status = 3;  // Finished
        
        // Distribute stakes if applicable
        if (game.stake_amount > 0) {
            let game_signer = object::generate_signer_for_extending(&game.extend_ref);
            let game_store = object::address_to_object<FungibleStore>(game_address);
            
            if (winner == @0x0) {
                // Tie - refund both players
                let refund_amount = game.stake_amount;
                let player1_store = primary_fungible_store::ensure_primary_store_exists(game.player1, game.payment_asset);
                let player2_store = primary_fungible_store::ensure_primary_store_exists(game.player2, game.payment_asset);
                dispatchable_fungible_asset::transfer(&game_signer, game_store, player1_store, refund_amount);
                dispatchable_fungible_asset::transfer(&game_signer, game_store, player2_store, refund_amount);
            } else {
                // Winner takes all
                let total_stake = game.stake_amount * 2;
                let winner_store = primary_fungible_store::ensure_primary_store_exists(winner, game.payment_asset);
                dispatchable_fungible_asset::transfer(&game_signer, game_store, winner_store, total_stake);
            };
        };
        
        // Emit event
        event::emit_event(&mut game.game_events, GameEvent {
            game_id: game.id,
            event_type: 3,
            player: @0x0,
            player_move: 255,
            winner,
        });
    }

    /// Compute commit hash: SHA3-256(move || secret)
    fun compute_commit_hash(player_move: u8, secret: vector<u8>): vector<u8> {
        let data = vector::empty<u8>();
        vector::push_back(&mut data, player_move);
        vector::append(&mut data, secret);
        hash::sha3_256(data)
    }

    /// Compare two vectors byte by byte
    fun vectors_equal(v1: &vector<u8>, v2: &vector<u8>): bool {
        let len1 = vector::length(v1);
        let len2 = vector::length(v2);
        if (len1 != len2) {
            return false
        };
        let i = 0;
        while (i < len1) {
            if (*vector::borrow(v1, i) != *vector::borrow(v2, i)) {
                return false
            };
            i = i + 1;
        };
        true
    }

    /// Claim timeout forfeit - if opponent doesn't reveal in time
    public entry fun claim_timeout_forfeit(
        player: &signer,
        game_address: address,
    ) acquires Game {
        let player_addr = signer::address_of(player);
        
        assert!(exists<Game>(game_address), error::not_found(E_GAME_NOT_FOUND));
        let game = borrow_global_mut<Game>(game_address);
        
        // Check game is in reveal phase
        assert!(game.status == 2, error::invalid_state(E_GAME_NOT_READY));
        assert!(game.player1_committed && game.player2_committed, error::invalid_state(E_GAME_NOT_READY));
        
        // Check player is part of the game
        assert!(player_addr == game.player1 || player_addr == game.player2, error::permission_denied(E_NOT_PLAYER));
        
        // Check timeout has passed
        let now = timestamp::now_seconds();
        assert!(now >= game.reveal_time + REVEAL_TIMEOUT_SECONDS, error::invalid_state(E_REVEAL_TIMEOUT));
        
        // Determine who didn't reveal
        let is_player1 = player_addr == game.player1;
        let opponent_revealed = if (is_player1) {
            game.player2_revealed
        } else {
            game.player1_revealed
        };
        
        assert!(!opponent_revealed, error::invalid_state(E_GAME_ALREADY_FINISHED));
        
        // Claimant wins by forfeit
        game.winner = player_addr;
        game.status = 3;  // Finished
        
        // Distribute stakes
        if (game.stake_amount > 0) {
            let game_signer = object::generate_signer_for_extending(&game.extend_ref);
            let game_store = object::address_to_object<FungibleStore>(game_address);
            let total_stake = game.stake_amount * 2;
            let winner_store = primary_fungible_store::ensure_primary_store_exists(player_addr, game.payment_asset);
            dispatchable_fungible_asset::transfer(&game_signer, game_store, winner_store, total_stake);
        };
        
        // Emit event
        event::emit_event(&mut game.game_events, GameEvent {
            game_id: game.id,
            event_type: 3,
            player: @0x0,
            player_move: 255,
            winner: player_addr,
        });
    }

    #[view]
    /// Get game information
    public fun get_game_info(game_address: address): (
        u64,        // game_id
        address,    // player1
        address,    // player2
        u64,        // stake_amount
        address,    // payment_asset address
        u8,         // status (0=Waiting, 1=Committed, 2=Revealed, 3=Finished)
        bool,       // player1_committed
        bool,       // player2_committed
        bool,       // player1_revealed
        bool,       // player2_revealed
        u8,         // player1_move (255 if not revealed)
        u8,         // player2_move (255 if not revealed)
        address     // winner (@0x0 if tie or not finished)
    ) acquires Game {
        assert!(exists<Game>(game_address), error::not_found(E_GAME_NOT_FOUND));
        let game = borrow_global<Game>(game_address);
        (
            game.id,
            game.player1,
            game.player2,
            game.stake_amount,
            object::object_address(&game.payment_asset),
            game.status,
            game.player1_committed,
            game.player2_committed,
            game.player1_revealed,
            game.player2_revealed,
            game.player1_move,
            game.player2_move,
            game.winner
        )
    }

    #[view]
    /// Check if game exists
    public fun game_exists(game_address: address): bool {
        exists<Game>(game_address)
    }

    #[view]
    /// Check if reveal timeout has passed
    public fun is_reveal_timeout(game_address: address): bool acquires Game {
        if (!exists<Game>(game_address)) {
            return false
        };
        let game = borrow_global<Game>(game_address);
        if (game.status != 2 || game.reveal_time == 0) {
            return false
        };
        let now = timestamp::now_seconds();
        now >= game.reveal_time + REVEAL_TIMEOUT_SECONDS
    }
}

