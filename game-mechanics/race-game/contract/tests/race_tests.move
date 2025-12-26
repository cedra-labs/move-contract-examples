#[test_only]
module race::race_tests {
    use cedra_framework::timestamp;
    use cedra_framework::account;
    use std::signer;
    use std::vector;
    use race::race::{
        Self,
        init_collection,
        create_game,
        play_game,
        reset_game,
        get_game_info,
        game_exists,
        is_game_won,
        get_winner,
        get_attempts_count,
        simulate_moves,
        get_collection_stats,
        collection_exists,
        get_collection_data,
    };

    // ==================== Test Constants ====================
    
    const MOVE_UP: u8 = 1;
    const MOVE_DOWN: u8 = 2;
    const MOVE_LEFT: u8 = 3;
    const MOVE_RIGHT: u8 = 4;
    const GRID_SIZE: u8 = 10;
    const CURRENT_TIME: u64 = 1000000;

    // ==================== Helper Functions ====================

    #[test_only]
    fun setup_test(
        creator: &signer,
        framework: &signer,
    ): address {
        let creator_addr = signer::address_of(creator);
        
        account::create_account_for_test(creator_addr);
        timestamp::set_time_has_started_for_testing(framework);
        timestamp::update_global_time_for_test(CURRENT_TIME);
        
        creator_addr
    }

    #[test_only]
    fun setup_player(player: &signer): address {
        let player_addr = signer::address_of(player);
        account::create_account_for_test(player_addr);
        player_addr
    }

    // ==================== Collection Tests ====================

    #[test(creator = @0x100, framework = @0x1)]
    /// Test NFT collection initialization
    public fun test_init_collection_success(
        creator: &signer,
        framework: &signer,
    ) {
        let creator_addr = setup_test(creator, framework);
        
        init_collection(creator);
        
        let total_minted = get_collection_stats(creator_addr);
        assert!(total_minted == 0, 0);
        assert!(collection_exists(creator_addr), 1);
    }

    #[test(creator = @0x100, framework = @0x1)]
    #[expected_failure(abort_code = 0x80008, location = race::race)]
    /// Test double collection initialization fails
    public fun test_init_collection_twice_fails(
        creator: &signer,
        framework: &signer,
    ) {
        setup_test(creator, framework);
        
        init_collection(creator);
        init_collection(creator); // Should fail
    }

    #[test(creator = @0x100, framework = @0x1)]
    /// Test get collection data
    public fun test_get_collection_data(
        creator: &signer,
        framework: &signer,
    ) {
        let creator_addr = setup_test(creator, framework);
        
        init_collection(creator);
        
        let (name, desc, uri) = get_collection_data(creator_addr);
        assert!(name == std::string::utf8(b"Race Winners Collection"), 0);
    }

    // ==================== Game Creation Tests ====================

    #[test(creator = @0x100, framework = @0x1)]
    /// Test successful game creation
    public fun test_create_game_success(
        creator: &signer,
        framework: &signer,
    ) {
        let creator_addr = setup_test(creator, framework);
        
        create_game(creator, 0, 0, 3, 3);
        
        assert!(game_exists(creator_addr), 0);
        
        let (game_id, game_creator, start_x, start_y, dest_x, dest_y, winner_vec, created_at) = 
            get_game_info(creator_addr);
        
        assert!(game_creator == creator_addr, 1);
        assert!(start_x == 0, 2);
        assert!(start_y == 0, 3);
        assert!(dest_x == 3, 4);
        assert!(dest_y == 3, 5);
        assert!(vector::is_empty(&winner_vec), 6);
        // Timestamp can vary slightly, just check it's reasonable
        assert!(created_at > 0, 7);
        assert!(game_id > 0, 8);
    }

    #[test(creator = @0x100, framework = @0x1)]
    #[expected_failure(abort_code = 0x80008, location = race::race)]
    /// Test creating duplicate game fails
    public fun test_create_game_twice_fails(
        creator: &signer,
        framework: &signer,
    ) {
        setup_test(creator, framework);
        
        create_game(creator, 0, 0, 3, 3);
        create_game(creator, 1, 1, 4, 4); // Should fail
    }

    #[test(creator = @0x100, framework = @0x1)]
    #[expected_failure(abort_code = 0x10006, location = race::race)]
    /// Test game creation with invalid position
    public fun test_create_game_invalid_position(
        creator: &signer,
        framework: &signer,
    ) {
        setup_test(creator, framework);
        
        create_game(creator, 15, 0, 3, 3); // Invalid start_x
    }

    #[test(creator = @0x100, framework = @0x1)]
    #[expected_failure(abort_code = 0x10006, location = race::race)]
    /// Test game creation with invalid destination
    public fun test_create_game_invalid_destination(
        creator: &signer,
        framework: &signer,
    ) {
        setup_test(creator, framework);
        
        create_game(creator, 0, 0, 20, 3); // Invalid dest_x
    }

    // ==================== Movement Tests ====================

    #[test(creator = @0x100, player = @0x200, framework = @0x1)]
    /// Test simple successful game completion
    public fun test_play_game_simple_success(
        creator: &signer,
        player: &signer,
        framework: &signer,
    ) {
        let creator_addr = setup_test(creator, framework);
        setup_player(player);
        
        init_collection(creator);
        create_game(creator, 0, 0, 3, 0);
        
        // Right, Right, Right - should reach (3, 0)
        let moves = vector::empty<u8>();
        vector::push_back(&mut moves, MOVE_RIGHT);
        vector::push_back(&mut moves, MOVE_RIGHT);
        vector::push_back(&mut moves, MOVE_RIGHT);
        
        play_game(player, creator_addr, moves);
        
        assert!(is_game_won(creator_addr), 0);
        assert!(get_attempts_count(creator_addr) == 1, 1);
    }

    #[test(creator = @0x100, player = @0x200, framework = @0x1)]
    /// Test diagonal movement to destination
    public fun test_play_game_diagonal_success(
        creator: &signer,
        player: &signer,
        framework: &signer,
    ) {
        let creator_addr = setup_test(creator, framework);
        let player_addr = setup_player(player);
        
        init_collection(creator);
        create_game(creator, 0, 0, 2, 2);
        
        // Right, Up, Right, Up - should reach (2, 2) but 4 steps > 3
        let moves = vector::empty<u8>();
        vector::push_back(&mut moves, MOVE_RIGHT);
        vector::push_back(&mut moves, MOVE_UP);
        vector::push_back(&mut moves, MOVE_RIGHT);
        vector::push_back(&mut moves, MOVE_UP);
        
        play_game(player, creator_addr, moves);
        
        // Should not win because > 3 steps
        assert!(!is_game_won(creator_addr), 0);
    }

    #[test(creator = @0x100, player = @0x200, framework = @0x1)]
    /// Test winning with exactly 3 steps
    public fun test_play_game_win_three_steps(
        creator: &signer,
        player: &signer,
        framework: &signer,
    ) {
        let creator_addr = setup_test(creator, framework);
        let player_addr = setup_player(player);
        
        init_collection(creator);
        create_game(creator, 0, 0, 3, 0);
        
        // Right, Right, Right - exactly 3 steps
        let moves = vector::empty<u8>();
        vector::push_back(&mut moves, MOVE_RIGHT);
        vector::push_back(&mut moves, MOVE_RIGHT);
        vector::push_back(&mut moves, MOVE_RIGHT);
        
        play_game(player, creator_addr, moves);
        
        assert!(is_game_won(creator_addr), 0);
        
        let winner_vec = get_winner(creator_addr);
        assert!(vector::length(&winner_vec) == 1, 1);
        assert!(*vector::borrow(&winner_vec, 0) == player_addr, 2);
        assert!(get_collection_stats(creator_addr) == 1, 3);
    }

    #[test(creator = @0x100, player = @0x200, framework = @0x1)]
    /// Test failed attempt - wrong destination
    public fun test_play_game_failed_attempt(
        creator: &signer,
        player: &signer,
        framework: &signer,
    ) {
        let creator_addr = setup_test(creator, framework);
        setup_player(player);
        
        create_game(creator, 0, 0, 5, 5);
        
        // Only move right twice - won't reach (5, 5)
        let moves = vector::empty<u8>();
        vector::push_back(&mut moves, MOVE_RIGHT);
        vector::push_back(&mut moves, MOVE_RIGHT);
        
        play_game(player, creator_addr, moves);
        
        assert!(!is_game_won(creator_addr), 0);
        assert!(get_attempts_count(creator_addr) == 1, 1);
    }

    #[test(creator = @0x100, player = @0x200, framework = @0x1)]
    /// Test too many steps - no NFT reward
    public fun test_play_game_too_many_steps(
        creator: &signer,
        player: &signer,
        framework: &signer,
    ) {
        let creator_addr = setup_test(creator, framework);
        setup_player(player);
        
        init_collection(creator);
        create_game(creator, 0, 0, 2, 0);
        
        // Right, Left, Right, Right, Right - 5 steps to reach (2, 0)
        // Success but more than 3 steps, so no NFT
        let moves = vector::empty<u8>();
        vector::push_back(&mut moves, MOVE_RIGHT);
        vector::push_back(&mut moves, MOVE_LEFT);
        vector::push_back(&mut moves, MOVE_RIGHT);
        vector::push_back(&mut moves, MOVE_RIGHT);
        vector::push_back(&mut moves, MOVE_RIGHT);
        
        play_game(player, creator_addr, moves);
        
        // Should reach destination but not win (too many steps)
        assert!(!is_game_won(creator_addr), 0);
        assert!(get_collection_stats(creator_addr) == 0, 1);
    }

    #[test(creator = @0x100, player = @0x200, framework = @0x1)]
    #[expected_failure(abort_code = 0x10003, location = race::race)]
    /// Test invalid move direction
    public fun test_play_game_invalid_move(
        creator: &signer,
        player: &signer,
        framework: &signer,
    ) {
        let creator_addr = setup_test(creator, framework);
        setup_player(player);
        
        create_game(creator, 0, 0, 3, 3);
        
        let moves = vector::empty<u8>();
        vector::push_back(&mut moves, 99); // Invalid move
        
        play_game(player, creator_addr, moves); // Should fail
    }

    #[test(creator = @0x100, player = @0x200, framework = @0x1)]
    #[expected_failure(abort_code = 0x10004, location = race::race)]
    /// Test empty moves vector
    public fun test_play_game_no_moves(
        creator: &signer,
        player: &signer,
        framework: &signer,
    ) {
        let creator_addr = setup_test(creator, framework);
        setup_player(player);
        
        create_game(creator, 0, 0, 3, 3);
        
        let moves = vector::empty<u8>();
        
        play_game(player, creator_addr, moves); // Should fail
    }

    #[test(creator = @0x100, player = @0x200, framework = @0x1)]
    #[expected_failure(abort_code = 0x10004, location = race::race)]
    /// Test too many moves
    public fun test_play_game_too_many_moves(
        creator: &signer,
        player: &signer,
        framework: &signer,
    ) {
        let creator_addr = setup_test(creator, framework);
        setup_player(player);
        
        create_game(creator, 0, 0, 3, 3);
        
        let moves = vector::empty<u8>();
        let i = 0;
        while (i < 11) { // More than MAX_STEPS (10)
            vector::push_back(&mut moves, MOVE_RIGHT);
            i = i + 1;
        };
        
        play_game(player, creator_addr, moves); // Should fail
    }

    #[test(creator = @0x100, player1 = @0x200, player2 = @0x300, framework = @0x1)]
    #[expected_failure(abort_code = 196613 , location = race::race)]
    /// Test game already won
    public fun test_play_game_already_won(
        creator: &signer,
        player1: &signer,
        player2: &signer,
        framework: &signer,
    ) {
        let creator_addr = setup_test(creator, framework);
        setup_player(player1);
        setup_player(player2);
        
        init_collection(creator);
        create_game(creator, 0, 0, 2, 0);
        
        // Player 1 wins
        let moves1 = vector::empty<u8>();
        vector::push_back(&mut moves1, MOVE_RIGHT);
        vector::push_back(&mut moves1, MOVE_RIGHT);
        
        play_game(player1, creator_addr, moves1);
        assert!(is_game_won(creator_addr), 0);
        
        // Player 2 tries to play - should fail
        let moves2 = vector::empty<u8>();
        vector::push_back(&mut moves2, MOVE_RIGHT);
        vector::push_back(&mut moves2, MOVE_RIGHT);
        
        play_game(player2, creator_addr, moves2); // Should fail
    }

    // ==================== Boundary Tests ====================

    #[test(creator = @0x100, player = @0x200, framework = @0x1)]
    /// Test movement at grid boundaries
    public fun test_play_game_boundary_movement(
        creator: &signer,
        player: &signer,
        framework: &signer,
    ) {
        let creator_addr = setup_test(creator, framework);
        setup_player(player);
        
        init_collection(creator);
        create_game(creator, 0, 0, 0, 0);
        
        // Try to move left and down from (0,0) - should stay at (0,0)
        let moves = vector::empty<u8>();
        vector::push_back(&mut moves, MOVE_LEFT);
        vector::push_back(&mut moves, MOVE_DOWN);
        
        play_game(player, creator_addr, moves);
        
        // Should succeed since we're still at start position
        assert!(is_game_won(creator_addr), 0);
    }

    #[test(creator = @0x100, player = @0x200, framework = @0x1)]
    /// Test movement at upper boundary
    public fun test_play_game_upper_boundary(
        creator: &signer,
        player: &signer,
        framework: &signer,
    ) {
        let creator_addr = setup_test(creator, framework);
        setup_player(player);
        
        init_collection(creator);
        create_game(creator, 9, 9, 9, 9); // Start at max position
        
        // Try to move up and right - should stay at (9,9)
        let moves = vector::empty<u8>();
        vector::push_back(&mut moves, MOVE_UP);
        vector::push_back(&mut moves, MOVE_RIGHT);
        
        play_game(player, creator_addr, moves);
        
        assert!(is_game_won(creator_addr), 0);
    }

    // ==================== Reset Tests ====================

    #[test(creator = @0x100, player = @0x200, framework = @0x1)]
    /// Test game reset functionality
    public fun test_reset_game_success(
        creator: &signer,
        player: &signer,
        framework: &signer,
    ) {
        let creator_addr = setup_test(creator, framework);
        setup_player(player);
        
        init_collection(creator);
        create_game(creator, 0, 0, 1, 0);
        
        // Win the game
        let moves = vector::empty<u8>();
        vector::push_back(&mut moves, MOVE_RIGHT);
        play_game(player, creator_addr, moves);
        assert!(is_game_won(creator_addr), 0);
        
        // Reset game
        reset_game(creator);
        
        assert!(!is_game_won(creator_addr), 1);
        assert!(get_attempts_count(creator_addr) == 0, 2);
    }

    #[test(creator = @0x100, unauthorized = @0x999, framework = @0x1)]
    #[expected_failure(abort_code = 393217, location = race::race)]
    /// Test unauthorized reset
    public fun test_reset_game_unauthorized(
        creator: &signer,
        unauthorized: &signer,
        framework: &signer,
    ) {
        setup_test(creator, framework);
        setup_player(unauthorized);
        
        create_game(creator, 0, 0, 1, 0);
        
        reset_game(unauthorized); // Should fail
    }

    // ==================== View Function Tests ====================

    #[test(creator = @0x100, framework = @0x1)]
    /// Test simulate_moves view function
    public fun test_simulate_moves(
        creator: &signer,
        framework: &signer,
    ) {
        let creator_addr = setup_test(creator, framework);
        
        create_game(creator, 0, 0, 2, 2);
        
        let moves = vector::empty<u8>();
        vector::push_back(&mut moves, MOVE_RIGHT);
        vector::push_back(&mut moves, MOVE_UP);
        vector::push_back(&mut moves, MOVE_RIGHT);
        vector::push_back(&mut moves, MOVE_UP);
        
        let (final_x, final_y, reached) = simulate_moves(creator_addr, moves);
        
        assert!(final_x == 2, 0);
        assert!(final_y == 2, 1);
        assert!(reached, 2);
    }

    #[test(creator = @0x100, framework = @0x1)]
    /// Test simulate with failed path
    public fun test_simulate_moves_failed(
        creator: &signer,
        framework: &signer,
    ) {
        let creator_addr = setup_test(creator, framework);
        
        create_game(creator, 0, 0, 5, 5);
        
        let moves = vector::empty<u8>();
        vector::push_back(&mut moves, MOVE_RIGHT);
        vector::push_back(&mut moves, MOVE_RIGHT);
        
        let (final_x, final_y, reached) = simulate_moves(creator_addr, moves);
        
        assert!(final_x == 2, 0);
        assert!(final_y == 0, 1);
        assert!(!reached, 2);
    }

    #[test(creator = @0x100, framework = @0x1)]
    /// Test game_exists for non-existent game
    public fun test_game_not_exists(
        creator: &signer,
        framework: &signer,
    ) {
        let creator_addr = setup_test(creator, framework);
        assert!(!game_exists(creator_addr), 0);
    }

    #[test(creator = @0x100, framework = @0x1)]
    /// Test get_winner for non-won game
    public fun test_get_winner_empty(
        creator: &signer,
        framework: &signer,
    ) {
        let creator_addr = setup_test(creator, framework);
        
        create_game(creator, 0, 0, 3, 3);
        
        let winner_vec = get_winner(creator_addr);
        assert!(vector::is_empty(&winner_vec), 0);
    }

    // ==================== Complex Scenario Tests ====================

    #[test(creator = @0x100, p1 = @0x201, p2 = @0x202, p3 = @0x203, framework = @0x1)]
    /// Test multiple players attempting
    public fun test_multiple_players_attempts(
        creator: &signer,
        p1: &signer,
        p2: &signer,
        p3: &signer,
        framework: &signer,
    ) {
        let creator_addr = setup_test(creator, framework);
        let p3_addr = setup_player(p3);
        setup_player(p1);
        setup_player(p2);
        
        init_collection(creator);
        create_game(creator, 0, 0, 3, 0);
        
        // Player 1 fails
        let moves1 = vector::empty<u8>();
        vector::push_back(&mut moves1, MOVE_RIGHT);
        vector::push_back(&mut moves1, MOVE_RIGHT);
        play_game(p1, creator_addr, moves1);
        assert!(!is_game_won(creator_addr), 0);
        
        // Player 2 fails
        let moves2 = vector::empty<u8>();
        vector::push_back(&mut moves2, MOVE_UP);
        play_game(p2, creator_addr, moves2);
        assert!(!is_game_won(creator_addr), 1);
        
        // Player 3 wins
        let moves3 = vector::empty<u8>();
        vector::push_back(&mut moves3, MOVE_RIGHT);
        vector::push_back(&mut moves3, MOVE_RIGHT);
        vector::push_back(&mut moves3, MOVE_RIGHT);
        play_game(p3, creator_addr, moves3);
        assert!(is_game_won(creator_addr), 2);
        
        let winner_vec = get_winner(creator_addr);
        assert!(*vector::borrow(&winner_vec, 0) == p3_addr, 3);
        assert!(get_attempts_count(creator_addr) == 3, 4);
    }

    #[test(creator = @0x100, player = @0x200, framework = @0x1)]
    /// Test complete game lifecycle
    public fun test_complete_game_lifecycle(
        creator: &signer,
        player: &signer,
        framework: &signer,
    ) {
        let creator_addr = setup_test(creator, framework);
        setup_player(player);
        
        // 1. Initialize collection
        init_collection(creator);
        assert!(get_collection_stats(creator_addr) == 0, 0);
        
        // 2. Create game
        create_game(creator, 0, 0, 2, 0);
        assert!(game_exists(creator_addr), 1);
        
        // 3. Player wins in 2 steps
        let moves = vector::empty<u8>();
        vector::push_back(&mut moves, MOVE_RIGHT);
        vector::push_back(&mut moves, MOVE_RIGHT);
        
        play_game(player, creator_addr, moves);
        
        // 4. Verify win and NFT
        assert!(is_game_won(creator_addr), 2);
        assert!(get_collection_stats(creator_addr) == 1, 3);
        
        // 5. Reset and try again
        reset_game(creator);
        assert!(!is_game_won(creator_addr), 4);
        
        // 6. Win again
        play_game(player, creator_addr, moves);
        assert!(is_game_won(creator_addr), 5);
        assert!(get_collection_stats(creator_addr) == 2, 6);
    }

    #[test(creator = @0x100, player = @0x200, framework = @0x1)]
    /// Test NFT collection minting increments
    public fun test_nft_collection_minting(
        creator: &signer,
        player: &signer,
        framework: &signer,
    ) {
        let creator_addr = setup_test(creator, framework);
        setup_player(player);
        
        init_collection(creator);
        
        // Create first game
        create_game(creator, 0, 0, 1, 0);
        
        let moves = vector::empty<u8>();
        vector::push_back(&mut moves, MOVE_RIGHT);
        
        play_game(player, creator_addr, moves);
        
        assert!(is_game_won(creator_addr), 0);
        assert!(get_collection_stats(creator_addr) == 1, 1);
    }

    #[test(creator = @0x100, framework = @0x1)]
    /// Test collection data retrieval for non-existent collection
    public fun test_get_collection_data_non_existent(
        creator: &signer,
        framework: &signer,
    ) {
        let creator_addr = setup_test(creator, framework);
        
        let (name, desc, uri) = get_collection_data(creator_addr);
        assert!(name == std::string::utf8(b""), 0);
        assert!(desc == std::string::utf8(b""), 1);
        assert!(uri == std::string::utf8(b""), 2);
    }
}