#[test_only]
/// Test module for lottery_simple contract
/// Contains comprehensive test cases covering happy path and error scenarios
module lottery_simple::lottery_tests {
    use std::signer;
    use cedra_framework::coin;
    use cedra_framework::cedra_coin::{Self, CedraCoin};
    use cedra_framework::timestamp;
    use cedra_framework::account;
    
    // Import main lottery module
    use lottery_simple::lottery_simple;

    /// Test constants
    const TICKET_PRICE: u64 = 100;
    const INITIAL_BALANCE: u64 = 1000;

    /// Setup test environment with accounts and initial balances
    /// 
    /// Initializes:
    /// - Timestamp for testing
    /// - CedraCoin system
    /// - Creates accounts for admin and users
    /// - Mints initial balance for users
    /// - Initializes lottery with admin
    /// 
    /// # Arguments
    /// * `cedra_framework` - Framework signer for system initialization
    /// * `admin` - Admin account for lottery
    /// * `user1` - First test user
    /// * `user2` - Second test user
    fun setup_test(
        cedra_framework: &signer, 
        admin: &signer, 
        user1: &signer, 
        user2: &signer
    ) {
        // Initialize timestamp for testing environment
        timestamp::set_time_has_started_for_testing(cedra_framework);

        // Initialize CedraCoin system for testing
        let (burn_cap, mint_cap) = cedra_coin::initialize_for_test(cedra_framework);

        // Create accounts and fund Admin + Users
        // Setup admin account
        let admin_addr = signer::address_of(admin);
        account::create_account_for_test(admin_addr);
        coin::register<CedraCoin>(admin);

        // Setup user1 account with initial balance
        let u1_addr = signer::address_of(user1);
        account::create_account_for_test(u1_addr);
        coin::register<CedraCoin>(user1);
        let coins1 = coin::mint(INITIAL_BALANCE, &mint_cap);
        coin::deposit(u1_addr, coins1);

        // Setup user2 account with initial balance
        let u2_addr = signer::address_of(user2);
        account::create_account_for_test(u2_addr);
        coin::register<CedraCoin>(user2);
        let coins2 = coin::mint(INITIAL_BALANCE, &mint_cap);
        coin::deposit(u2_addr, coins2);

        // Clean up capabilities
        coin::destroy_burn_cap(burn_cap);
        coin::destroy_mint_cap(mint_cap);

        // Initialize lottery with admin
        lottery_simple::init_lottery(admin, TICKET_PRICE);
    }

    #[test(cedra_framework = @cedra_framework, admin = @lottery_simple, u1 = @0x123, u2 = @0x456)]
    fun test_lottery_flow_success(
        cedra_framework: &signer, 
        admin: &signer, 
        u1: &signer, 
        u2: &signer
    ) {
        setup_test(cedra_framework, admin, u1, u2);
        let admin_addr = signer::address_of(admin);
        let u1_addr = signer::address_of(u1);
        let u2_addr = signer::address_of(u2);

        // User 1 buys a ticket
        lottery_simple::buy_ticket(u1, TICKET_PRICE, admin_addr);
        // Verify user 1's balance decreased
        assert!(coin::balance<CedraCoin>(u1_addr) == INITIAL_BALANCE - TICKET_PRICE, 101);

        // User 2 buys a ticket
        lottery_simple::buy_ticket(u2, TICKET_PRICE, admin_addr);
        
        // Admin picks winner
        // Advance time to ensure randomness works
        timestamp::update_global_time_for_test_secs(100);
        
        lottery_simple::pick_winner(admin, admin_addr);

        // Verify results
        let bal_u1 = coin::balance<CedraCoin>(u1_addr);
        let bal_u2 = coin::balance<CedraCoin>(u2_addr);

        // Total prize is 200 (100 + 100)
        // One person will have 900 (lost), one person will have 1100 (won)
        let someone_won = (bal_u1 == INITIAL_BALANCE + TICKET_PRICE) || (bal_u2 == INITIAL_BALANCE + TICKET_PRICE);
        assert!(someone_won, 102);
    }

    #[test(cedra_framework = @cedra_framework, admin = @lottery_simple, u1 = @0x123, u2 = @0x456)]
    #[expected_failure(abort_code = 2, location = lottery_simple::lottery_simple)] 
    // abort_code = 2 corresponds to E_INVALID_AMOUNT in source
    fun test_buy_wrong_price(
        cedra_framework: &signer, 
        admin: &signer, 
        u1: &signer, 
        u2: &signer
    ) {
        setup_test(cedra_framework, admin, u1, u2);
        let admin_addr = signer::address_of(admin);

        // Attempt to buy with price 50 (ticket price is 100) - should fail
        lottery_simple::buy_ticket(u1, 50, admin_addr);
    }

    #[test(cedra_framework = @cedra_framework, admin = @lottery_simple, u1 = @0x123, u2 = @0x456)]
    #[expected_failure(abort_code = 4, location = lottery_simple::lottery_simple)]
    // abort_code = 4 corresponds to E_NOT_ADMIN
    fun test_user_cannot_pick_winner(
        cedra_framework: &signer, 
        admin: &signer, 
        u1: &signer, 
        u2: &signer
    ) {
        setup_test(cedra_framework, admin, u1, u2);
        let admin_addr = signer::address_of(admin);

        // User 1 buys ticket then attempts to pick winner - should fail
        lottery_simple::buy_ticket(u1, TICKET_PRICE, admin_addr);
        lottery_simple::pick_winner(u1, admin_addr);
    }

    #[test(cedra_framework = @cedra_framework, admin = @lottery_simple, u1 = @0x123, u2 = @0x456)]
    #[expected_failure(abort_code = 3, location = lottery_simple::lottery_simple)]
    // abort_code = 3 corresponds to E_NO_PARTICIPANTS
    fun test_pick_winner_no_players(
        cedra_framework: &signer, 
        admin: &signer, 
        u1: &signer, 
        u2: &signer
    ) {
        setup_test(cedra_framework, admin, u1, u2);
        let admin_addr = signer::address_of(admin);

        // Admin attempts to pick winner before anyone buys tickets - should fail
        lottery_simple::pick_winner(admin, admin_addr);
    }
}