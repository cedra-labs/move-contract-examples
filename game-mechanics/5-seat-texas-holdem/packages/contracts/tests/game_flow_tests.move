// ============================================
// Texas Hold'em Game Flow Tests
// ============================================
// Tests for table management, betting actions, and game flow

#[test_only]
module holdemgame::game_flow_tests {
    use std::signer;
    use holdemgame::texas_holdem;
    use holdemgame::chips;

    // Helper to setup a game environment and return table Object address
    fun setup_table(admin: &signer): address {
        chips::init_for_test(admin);
        
        // Create table with 5/10 blinds, min 50 max 1000 buy-in
        // ante=0, straddle_enabled=false
        texas_holdem::create_table(admin, 5, 10, 50, 1000, 0, false);
        // Table is now an Object - get its address via TableRef
        texas_holdem::get_table_address(signer::address_of(admin))
    }

    #[test(admin = @holdemgame)]
    fun test_create_table(admin: &signer) {
        let table_addr = setup_table(admin);
        
        // Table should exist - validate via view function
        let (small, big, min_buy, max_buy) = texas_holdem::get_table_config(table_addr);
        assert!(small == 5, 1);
        assert!(big == 10, 2);
        assert!(min_buy == 50, 3);
        assert!(max_buy == 1000, 4);
    }

    #[test(admin = @holdemgame)]
    #[expected_failure(abort_code = 2, location = holdemgame::texas_holdem)] // E_TABLE_EXISTS
    fun test_create_duplicate_table_fails(admin: &signer) {
        let _table_addr = setup_table(admin);
        // Try to create another table at same address
        texas_holdem::create_table(admin, 10, 20, 100, 2000, 0, false);
    }

    #[test(admin = @holdemgame, player = @0xBEEF)]
    #[expected_failure(abort_code = 10, location = holdemgame::texas_holdem)] // E_INSUFFICIENT_CHIPS
    fun test_join_without_chips_fails(admin: &signer, player: &signer) {
        let table_addr = setup_table(admin);
        
        // Player tries to join without any chips
        texas_holdem::join_table(player, table_addr, 0, 100);
    }

    #[test(admin = @holdemgame, player = @0xBEEF)]
    #[expected_failure(abort_code = 18, location = holdemgame::texas_holdem)] // E_BUY_IN_TOO_LOW
    fun test_join_with_low_buyin_fails(admin: &signer, player: &signer) {
        let table_addr = setup_table(admin);
        
        let player_addr = signer::address_of(player);
        chips::mint_test_chips(player_addr, 1000);
        
        // Try to buy in with less than minimum (50)
        texas_holdem::join_table(player, table_addr, 0, 25);
    }

    #[test(admin = @holdemgame, player = @0xBEEF)]
    #[expected_failure(abort_code = 19, location = holdemgame::texas_holdem)] // E_BUY_IN_TOO_HIGH
    fun test_join_with_high_buyin_fails(admin: &signer, player: &signer) {
        let table_addr = setup_table(admin);
        
        let player_addr = signer::address_of(player);
        chips::mint_test_chips(player_addr, 5000);
        
        // Try to buy in with more than maximum (1000)
        texas_holdem::join_table(player, table_addr, 0, 2000);
    }

    #[test(admin = @holdemgame, p1 = @0xAAA, p2 = @0xBBB)]
    fun test_join_table_success(admin: &signer, p1: &signer, p2: &signer) {
        let table_addr = setup_table(admin);
        let p1_addr = signer::address_of(p1);
        let p2_addr = signer::address_of(p2);
        
        // Give players chips
        chips::mint_test_chips(p1_addr, 500);
        chips::mint_test_chips(p2_addr, 500);
        
        // Join table
        texas_holdem::join_table(p1, table_addr, 0, 200);
        texas_holdem::join_table(p2, table_addr, 1, 200);
        
        // Verify seat info
        let (seat_player, seat_chips, _) = texas_holdem::get_seat_info(table_addr, 0);
        assert!(seat_player == p1_addr, 1);
        assert!(seat_chips == 200, 2);
        
        let (seat2_player, seat2_chips, _) = texas_holdem::get_seat_info(table_addr, 1);
        assert!(seat2_player == p2_addr, 3);
        assert!(seat2_chips == 200, 4);
    }

    #[test(admin = @holdemgame, p1 = @0xAAA, p2 = @0xBBB)]
    #[expected_failure(abort_code = 4, location = holdemgame::texas_holdem)] // E_SEAT_TAKEN
    fun test_join_taken_seat_fails(admin: &signer, p1: &signer, p2: &signer) {
        let table_addr = setup_table(admin);
        
        chips::mint_test_chips(signer::address_of(p1), 500);
        chips::mint_test_chips(signer::address_of(p2), 500);
        
        texas_holdem::join_table(p1, table_addr, 0, 200);
        // Try to take same seat
        texas_holdem::join_table(p2, table_addr, 0, 200);
    }

    // Note: Tests for start_hand, betting, and timeout require the Cedra
    // framework's timestamp module to be initialized, which cannot be done
    // in Move unit tests. Those tests must be performed on-chain via CLI
    // or integration tests.
    //
    // Covered by unit tests:
    // - Table creation and configuration
    // - Join/leave table mechanics
    // - Buy-in validation (min/max)
    // - Seat management
    //
    // Require on-chain testing:
    // - start_hand (uses timestamp)
    // - Betting rounds (requires game state)
    // - Timeout handling (uses timestamp)
    // - Commit/reveal flow

    // ============================================
    // PAUSED TABLE TESTS
    // ============================================

    #[test(admin = @holdemgame, player = @0xBEEF)]
    #[expected_failure(abort_code = 9, location = holdemgame::texas_holdem)]
    fun test_join_paused_table_fails(admin: &signer, player: &signer) {
        let table_addr = setup_table(admin);
        
        // Pause the table
        texas_holdem::pause_table(admin, table_addr);
        
        // Try to join - should fail with E_INVALID_ACTION
        let player_addr = signer::address_of(player);
        chips::mint_test_chips(player_addr, 500);
        texas_holdem::join_table(player, table_addr, 0, 200);
    }

    #[test(admin = @holdemgame, player = @0xBEEF)]
    fun test_join_after_resume_succeeds(admin: &signer, player: &signer) {
        let table_addr = setup_table(admin);
        
        // Pause then resume
        texas_holdem::pause_table(admin, table_addr);
        texas_holdem::resume_table(admin, table_addr);
        
        // Join should now succeed
        let player_addr = signer::address_of(player);
        chips::mint_test_chips(player_addr, 500);
        texas_holdem::join_table(player, table_addr, 0, 200);
        
        // Verify join succeeded
        let (seat_player, seat_chips, _) = texas_holdem::get_seat_info(table_addr, 0);
        assert!(seat_player == player_addr, 1);
        assert!(seat_chips == 200, 2);
    }
}

