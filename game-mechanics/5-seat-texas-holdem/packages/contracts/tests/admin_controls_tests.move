// ============================================
// Admin Controls Tests
// ============================================
// Tests for admin-only functions and table management

#[test_only]
module holdemgame::admin_controls_tests {
    use std::signer;
    use holdemgame::texas_holdem;
    use holdemgame::chips;

    // Helper to setup a table and return its Object address
    fun setup_table(admin: &signer): address {
        chips::init_for_test(admin);
        texas_holdem::create_table(admin, 5, 10, 50, 1000, 0, false);
        // Table is now an Object - get its address via TableRef
        texas_holdem::get_table_address(signer::address_of(admin))
    }

    // ============================================
    // BLIND UPDATES
    // ============================================

    #[test(admin = @holdemgame)]
    fun test_update_blinds_success(admin: &signer) {
        let table_addr = setup_table(admin);
        
        texas_holdem::update_blinds(admin, table_addr, 10, 20);
        
        let (small, big, _, _) = texas_holdem::get_table_config(table_addr);
        assert!(small == 10, 1);
        assert!(big == 20, 2);
    }

    #[test(admin = @holdemgame, other = @0xBEEF)]
    #[expected_failure(abort_code = 1, location = holdemgame::texas_holdem)] // E_NOT_ADMIN
    fun test_update_blinds_non_admin_fails(admin: &signer, other: &signer) {
        let table_addr = setup_table(admin);
        
        // Non-admin tries to update blinds
        texas_holdem::update_blinds(other, table_addr, 10, 20);
    }

    // ============================================
    // BUY-IN LIMITS
    // ============================================

    #[test(admin = @holdemgame)]
    fun test_update_buyin_limits_success(admin: &signer) {
        let table_addr = setup_table(admin);
        
        texas_holdem::update_buy_in_limits(admin, table_addr, 100, 2000);
        
        let (_, _, min_buy, max_buy) = texas_holdem::get_table_config(table_addr);
        assert!(min_buy == 100, 1);
        assert!(max_buy == 2000, 2);
    }

    #[test(admin = @holdemgame, other = @0xBEEF)]
    #[expected_failure(abort_code = 1, location = holdemgame::texas_holdem)] // E_NOT_ADMIN
    fun test_update_buyin_non_admin_fails(admin: &signer, other: &signer) {
        let table_addr = setup_table(admin);
        
        texas_holdem::update_buy_in_limits(other, table_addr, 100, 2000);
    }

    // ============================================
    // ANTE & STRADDLE
    // ============================================

    #[test(admin = @holdemgame)]
    fun test_update_ante_success(admin: &signer) {
        let table_addr = setup_table(admin);
        
        texas_holdem::update_ante(admin, table_addr, 2);
        
        // Verify via table config (if exposed) - for now just confirm no abort
    }

    #[test(admin = @holdemgame)]
    fun test_toggle_straddle_success(admin: &signer) {
        let table_addr = setup_table(admin);
        
        // Enable straddle
        texas_holdem::toggle_straddle(admin, table_addr, true);
        // Disable straddle
        texas_holdem::toggle_straddle(admin, table_addr, false);
    }

    // ============================================
    // OWNERSHIP TRANSFER
    // ============================================

    #[test(admin = @holdemgame, new_admin = @0xBEEF)]
    fun test_transfer_ownership_success(admin: &signer, new_admin: &signer) {
        let table_addr = setup_table(admin);
        let new_admin_addr = signer::address_of(new_admin);
        
        // Transfer ownership
        texas_holdem::transfer_ownership(admin, table_addr, new_admin_addr);
        
        // New admin should be able to update blinds
        texas_holdem::update_blinds(new_admin, table_addr, 10, 20);
        
        let (small, big, _, _) = texas_holdem::get_table_config(table_addr);
        assert!(small == 10, 1);
        assert!(big == 20, 2);
    }

    #[test(admin = @holdemgame, new_admin = @0xBEEF)]
    #[expected_failure(abort_code = 1, location = holdemgame::texas_holdem)] // E_NOT_ADMIN
    fun test_old_admin_cannot_update_after_transfer(admin: &signer, new_admin: &signer) {
        let table_addr = setup_table(admin);
        let new_admin_addr = signer::address_of(new_admin);
        
        texas_holdem::transfer_ownership(admin, table_addr, new_admin_addr);
        
        // Old admin should not be able to update anymore
        texas_holdem::update_blinds(admin, table_addr, 15, 30);
    }

    // ============================================
    // FEE COLLECTOR (GLOBAL)
    // ============================================

    #[test(admin = @holdemgame)]
    fun test_init_fee_config_success(admin: &signer) {
        chips::init_for_test(admin);
        
        // Initialize fee config
        texas_holdem::init_fee_config(admin, @0xFEE);
        
        // Verify
        assert!(texas_holdem::is_fee_config_initialized() == true, 1);
        assert!(texas_holdem::get_fee_collector() == @0xFEE, 2);
    }

    #[test(admin = @holdemgame)]
    fun test_update_fee_collector_success(admin: &signer) {
        chips::init_for_test(admin);
        texas_holdem::init_fee_config(admin, @0xFEE);
        
        // Update fee collector
        texas_holdem::update_fee_collector(admin, @0xFEE2);
        
        assert!(texas_holdem::get_fee_collector() == @0xFEE2, 1);
    }

    #[test(admin = @holdemgame, other = @0xBEEF)]
    #[expected_failure(abort_code = 30, location = holdemgame::texas_holdem)] // E_NOT_FEE_ADMIN
    fun test_update_fee_collector_non_admin_fails(admin: &signer, other: &signer) {
        chips::init_for_test(admin);
        texas_holdem::init_fee_config(admin, @0xFEE);
        
        // Non-admin tries to update fee collector
        texas_holdem::update_fee_collector(other, @0xFEE2);
    }

    // ============================================
    // PAUSE/RESUME
    // ============================================

    #[test(admin = @holdemgame)]
    fun test_pause_resume_table_success(admin: &signer) {
        let table_addr = setup_table(admin);
        
        // Pause
        texas_holdem::pause_table(admin, table_addr);
        assert!(texas_holdem::is_paused(table_addr) == true, 1);
        
        // Resume
        texas_holdem::resume_table(admin, table_addr);
        assert!(texas_holdem::is_paused(table_addr) == false, 2);
    }

    // ============================================
    // ADMIN-ONLY START
    // ============================================

    #[test(admin = @holdemgame)]
    fun test_toggle_admin_only_start(admin: &signer) {
        let table_addr = setup_table(admin);
        
        // Enable admin-only start
        texas_holdem::toggle_admin_only_start(admin, table_addr, true);
        assert!(texas_holdem::is_admin_only_start(table_addr) == true, 1);
        
        // Disable
        texas_holdem::toggle_admin_only_start(admin, table_addr, false);
        assert!(texas_holdem::is_admin_only_start(table_addr) == false, 2);
    }

    // ============================================
    // KICK PLAYER
    // ============================================

    #[test(admin = @holdemgame, player = @0xBEEF)]
    fun test_kick_player_success(admin: &signer, player: &signer) {
        let table_addr = setup_table(admin);
        let player_addr = signer::address_of(player);
        
        chips::mint_test_chips(player_addr, 500);
        texas_holdem::join_table(player, table_addr, 0, 200);
        
        // Kick player
        texas_holdem::kick_player(admin, table_addr, 0);
        
        // Player should have their 200 chips back
        assert!(chips::balance(player_addr) == 500, 1); // 300 remained + 200 returned
    }

    #[test(admin = @holdemgame, player = @0xBEEF, other = @0xDEAD)]
    #[expected_failure(abort_code = 1, location = holdemgame::texas_holdem)] // E_NOT_ADMIN
    fun test_kick_player_non_admin_fails(admin: &signer, player: &signer, other: &signer) {
        let table_addr = setup_table(admin);
        let player_addr = signer::address_of(player);
        
        chips::mint_test_chips(player_addr, 500);
        texas_holdem::join_table(player, table_addr, 0, 200);
        
        // Non-admin tries to kick
        texas_holdem::kick_player(other, table_addr, 0);
    }

    // ============================================
    // FORCE SIT OUT
    // ============================================

    #[test(admin = @holdemgame, player = @0xBEEF)]
    fun test_force_sit_out_success(admin: &signer, player: &signer) {
        let table_addr = setup_table(admin);
        let player_addr = signer::address_of(player);
        
        chips::mint_test_chips(player_addr, 500);
        texas_holdem::join_table(player, table_addr, 0, 200);
        
        // Force sit out
        texas_holdem::force_sit_out(admin, table_addr, 0);
        
        let (_, _, sitting_out) = texas_holdem::get_seat_info(table_addr, 0);
        assert!(sitting_out == true, 1);
    }

    // ============================================
    // GET ADMIN VIEW
    // ============================================

    #[test(admin = @holdemgame)]
    fun test_get_admin_returns_admin_address(admin: &signer) {
        let table_addr = setup_table(admin);
        let admin_addr = signer::address_of(admin);
        
        assert!(texas_holdem::get_admin(table_addr) == admin_addr, 1);
    }

    #[test(admin = @holdemgame, new_admin = @0xBEEF)]
    fun test_get_admin_after_transfer(admin: &signer, new_admin: &signer) {
        let table_addr = setup_table(admin);
        let new_admin_addr = signer::address_of(new_admin);
        
        texas_holdem::transfer_ownership(admin, table_addr, new_admin_addr);
        assert!(texas_holdem::get_admin(table_addr) == new_admin_addr, 1);
    }

    // ============================================
    // CONFIG VALIDATION
    // ============================================

    #[test(admin = @holdemgame)]
    #[expected_failure(abort_code = 27, location = holdemgame::texas_holdem)] // E_ZERO_VALUE
    fun test_create_table_zero_small_blind_fails(admin: &signer) {
        chips::init_for_test(admin);
        texas_holdem::create_table(admin, 0, 10, 50, 1000, 0, false);
    }

    #[test(admin = @holdemgame)]
    #[expected_failure(abort_code = 25, location = holdemgame::texas_holdem)] // E_INVALID_BLINDS
    fun test_create_table_equal_blinds_fails(admin: &signer) {
        chips::init_for_test(admin);
        texas_holdem::create_table(admin, 10, 10, 50, 1000, 0, false);
    }

    #[test(admin = @holdemgame)]
    #[expected_failure(abort_code = 25, location = holdemgame::texas_holdem)] // E_INVALID_BLINDS
    fun test_create_table_small_blind_greater_than_big_fails(admin: &signer) {
        chips::init_for_test(admin);
        texas_holdem::create_table(admin, 20, 10, 50, 1000, 0, false);
    }

    #[test(admin = @holdemgame)]
    #[expected_failure(abort_code = 27, location = holdemgame::texas_holdem)] // E_ZERO_VALUE
    fun test_create_table_zero_min_buyin_fails(admin: &signer) {
        chips::init_for_test(admin);
        texas_holdem::create_table(admin, 5, 10, 0, 1000, 0, false);
    }

    #[test(admin = @holdemgame)]
    #[expected_failure(abort_code = 26, location = holdemgame::texas_holdem)] // E_INVALID_BUY_IN
    fun test_create_table_max_less_than_min_buyin_fails(admin: &signer) {
        chips::init_for_test(admin);
        texas_holdem::create_table(admin, 5, 10, 1000, 500, 0, false);
    }

    #[test(admin = @holdemgame)]
    #[expected_failure(abort_code = 25, location = holdemgame::texas_holdem)] // E_INVALID_BLINDS
    fun test_update_blinds_invalid_fails(admin: &signer) {
        let table_addr = setup_table(admin);
        texas_holdem::update_blinds(admin, table_addr, 20, 10);
    }

    #[test(admin = @holdemgame)]
    #[expected_failure(abort_code = 27, location = holdemgame::texas_holdem)] // E_ZERO_VALUE
    fun test_update_blinds_zero_fails(admin: &signer) {
        let table_addr = setup_table(admin);
        texas_holdem::update_blinds(admin, table_addr, 0, 10);
    }

    #[test(admin = @holdemgame)]
    #[expected_failure(abort_code = 26, location = holdemgame::texas_holdem)] // E_INVALID_BUY_IN
    fun test_update_buyin_invalid_fails(admin: &signer) {
        let table_addr = setup_table(admin);
        texas_holdem::update_buy_in_limits(admin, table_addr, 1000, 500);
    }

    #[test(admin = @holdemgame)]
    #[expected_failure(abort_code = 27, location = holdemgame::texas_holdem)] // E_ZERO_VALUE
    fun test_update_buyin_zero_fails(admin: &signer) {
        let table_addr = setup_table(admin);
        texas_holdem::update_buy_in_limits(admin, table_addr, 0, 500);
    }
}

