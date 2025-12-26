#[test_only]
module module_addr::lottery_test {
    use std::signer;
    use std::string;
    use std::option;
    use cedra_framework::account;
    use cedra_framework::timestamp;
    use cedra_framework::object::{Self, Object};
    use cedra_framework::fungible_asset::{Self, Metadata};
    use cedra_framework::primary_fungible_store;
    use module_addr::lottery;

    // Test constants
    const TICKET_PRICE: u64 = 1000000; // 1 token with 6 decimals
    const DURATION: u64 = 3600;        // 1 hour in seconds

    // Helper function to create test accounts
    fun setup_test(admin: &signer, organizer: &signer, participant1: &signer, participant2: &signer, framework: &signer) {
        timestamp::set_time_has_started_for_testing(framework);
        account::create_account_for_test(signer::address_of(admin));
        account::create_account_for_test(signer::address_of(organizer));
        account::create_account_for_test(signer::address_of(participant1));
        account::create_account_for_test(signer::address_of(participant2));
        lottery::init_for_test(admin);
    }

    // Helper function to create a test fungible asset
    fun create_test_token(admin: &signer): Object<Metadata> {
        let constructor_ref = &object::create_named_object(admin, b"TEST");
        primary_fungible_store::create_primary_store_enabled_fungible_asset(
            constructor_ref,
            option::none(),
            string::utf8(b"Test Token"),
            string::utf8(b"TEST"),
            6,
            string::utf8(b"https://test.com/token.json"),
            string::utf8(b"https://test.com"),
        );

        let mint_ref = fungible_asset::generate_mint_ref(constructor_ref);
        let metadata_addr = object::address_from_constructor_ref(constructor_ref);
        let metadata = object::address_to_object<Metadata>(metadata_addr);
        
        // Mint some tokens for testing
        let fa = fungible_asset::mint(&mint_ref, 100000000); // 100 tokens
        primary_fungible_store::deposit(signer::address_of(admin), fa);

        metadata
    }

    #[test(admin = @module_addr, organizer = @0x100, participant1 = @0x200, participant2 = @0x300, framework = @0x1)]
    fun test_create_lottery(admin: &signer, organizer: &signer, participant1: &signer, participant2: &signer, framework: &signer) {
        setup_test(admin, organizer, participant1, participant2, framework);
        
        let organizer_addr = signer::address_of(organizer);
        let payment_token = create_test_token(admin);

        lottery::create_lottery(organizer, TICKET_PRICE, DURATION, payment_token);

        // Verify lottery was created
        let lottery_addr = lottery::get_lottery_address(1);
        assert!(lottery::lottery_exists(lottery_addr), 0);
        
        // Verify lottery info
        let (lottery_id, org, ticket_price, end_time, num_participants, prize_pool, winner, is_drawn) = 
            lottery::get_lottery_info(lottery_addr);
        
        assert!(lottery_id == 1, 1);
        assert!(org == organizer_addr, 2);
        assert!(ticket_price == TICKET_PRICE, 3);
        assert!(num_participants == 0, 4);
        assert!(prize_pool == 0, 5);
        assert!(winner == @0x0, 6);
        assert!(!is_drawn, 7);
        assert!(end_time == timestamp::now_seconds() + DURATION, 8);
    }

    #[test(admin = @module_addr, organizer = @0x100, participant1 = @0x200, participant2 = @0x300, framework = @0x1)]
    fun test_buy_ticket(admin: &signer, organizer: &signer, participant1: &signer, participant2: &signer, framework: &signer) {
        setup_test(admin, organizer, participant1, participant2, framework);
        
        let participant1_addr = signer::address_of(participant1);
        let participant2_addr = signer::address_of(participant2);
        let payment_token = create_test_token(admin);
        
        // Give participants tokens
        primary_fungible_store::transfer(admin, payment_token, participant1_addr, TICKET_PRICE * 5);
        primary_fungible_store::transfer(admin, payment_token, participant2_addr, TICKET_PRICE * 5);

        lottery::create_lottery(organizer, TICKET_PRICE, DURATION, payment_token);
        let lottery_addr = lottery::get_lottery_address(1);

        // Buy tickets
        lottery::buy_ticket(participant1, 1, lottery_addr);
        lottery::buy_ticket(participant2, 1, lottery_addr);
        
        // Verify participants were added
        let (_, _, _, _, num_participants, prize_pool, _, _) = lottery::get_lottery_info(lottery_addr);
        assert!(num_participants == 2, 0);
        assert!(prize_pool == TICKET_PRICE * 2, 1);
        
        // Verify participants
        let p1 = lottery::get_participant(lottery_addr, 0);
        let p2 = lottery::get_participant(lottery_addr, 1);
        assert!(p1 == participant1_addr, 2);
        assert!(p2 == participant2_addr, 3);
    }

    #[test(admin = @module_addr, organizer = @0x100, participant1 = @0x200, participant2 = @0x300, framework = @0x1)]
    fun test_draw_winner(admin: &signer, organizer: &signer, participant1: &signer, participant2: &signer, framework: &signer) {
        setup_test(admin, organizer, participant1, participant2, framework);
        
        let participant1_addr = signer::address_of(participant1);
        let participant2_addr = signer::address_of(participant2);
        let payment_token = create_test_token(admin);
        
        // Give participants tokens
        primary_fungible_store::transfer(admin, payment_token, participant1_addr, TICKET_PRICE * 5);
        primary_fungible_store::transfer(admin, payment_token, participant2_addr, TICKET_PRICE * 5);

        lottery::create_lottery(organizer, TICKET_PRICE, DURATION, payment_token);
        let lottery_addr = lottery::get_lottery_address(1);

        // Buy tickets
        lottery::buy_ticket(participant1, 1, lottery_addr);
        lottery::buy_ticket(participant2, 1, lottery_addr);
        
        // Fast forward past end time
        timestamp::fast_forward_seconds(DURATION + 100);
        
        // Record balances before drawing
        let p1_balance_before = primary_fungible_store::balance(participant1_addr, payment_token);
        let p2_balance_before = primary_fungible_store::balance(participant2_addr, payment_token);
        
        // Draw winner
        lottery::draw_winner(1, lottery_addr);
        
        // Verify lottery is marked as drawn
        let (_, _, _, _, _, _, winner, is_drawn) = lottery::get_lottery_info(lottery_addr);
        assert!(is_drawn, 0);
        assert!(winner == participant1_addr || winner == participant2_addr, 1);
        
        // Verify winner received the prize
        let p1_balance_after = primary_fungible_store::balance(participant1_addr, payment_token);
        let p2_balance_after = primary_fungible_store::balance(participant2_addr, payment_token);
        
        if (winner == participant1_addr) {
            assert!(p1_balance_after == p1_balance_before + TICKET_PRICE * 2, 2);
            assert!(p2_balance_after == p2_balance_before, 3);
        } else {
            assert!(p2_balance_after == p2_balance_before + TICKET_PRICE * 2, 4);
            assert!(p1_balance_after == p1_balance_before, 5);
        };
    }

    #[test(admin = @module_addr, organizer = @0x100, participant1 = @0x200, participant2 = @0x300, framework = @0x1)]
    fun test_multiple_participants(admin: &signer, organizer: &signer, participant1: &signer, participant2: &signer, framework: &signer) {
        setup_test(admin, organizer, participant1, participant2, framework);
        
        let participant1_addr = signer::address_of(participant1);
        let participant2_addr = signer::address_of(participant2);
        let payment_token = create_test_token(admin);
        
        // Give participants tokens
        primary_fungible_store::transfer(admin, payment_token, participant1_addr, TICKET_PRICE * 10);
        primary_fungible_store::transfer(admin, payment_token, participant2_addr, TICKET_PRICE * 10);

        lottery::create_lottery(organizer, TICKET_PRICE, DURATION, payment_token);
        let lottery_addr = lottery::get_lottery_address(1);

        // Buy multiple tickets (each participant can buy multiple times)
        lottery::buy_ticket(participant1, 1, lottery_addr);
        lottery::buy_ticket(participant2, 1, lottery_addr);
        lottery::buy_ticket(participant1, 1, lottery_addr);
        lottery::buy_ticket(participant2, 1, lottery_addr);
        lottery::buy_ticket(participant1, 1, lottery_addr);
        
        // Verify participants count
        let (_, _, _, _, num_participants, prize_pool, _, _) = lottery::get_lottery_info(lottery_addr);
        assert!(num_participants == 5, 0);
        assert!(prize_pool == TICKET_PRICE * 5, 1);
    }

    #[test(admin = @module_addr, organizer = @0x100, participant1 = @0x200, participant2 = @0x300, framework = @0x1)]
    #[expected_failure(abort_code = 0x010005, location = module_addr::lottery)]
    fun test_invalid_ticket_price_fails(admin: &signer, organizer: &signer, participant1: &signer, participant2: &signer, framework: &signer) {
        setup_test(admin, organizer, participant1, participant2, framework);
        
        let payment_token = create_test_token(admin);

        // Try to create lottery with 0 ticket price - should fail
        lottery::create_lottery(organizer, 0, DURATION, payment_token);
    }

    #[test(admin = @module_addr, organizer = @0x100, participant1 = @0x200, participant2 = @0x300, framework = @0x1)]
    #[expected_failure(abort_code = 0x030008, location = module_addr::lottery)]
    fun test_buy_ticket_after_end_time_fails(admin: &signer, organizer: &signer, participant1: &signer, participant2: &signer, framework: &signer) {
        setup_test(admin, organizer, participant1, participant2, framework);
        
        let participant1_addr = signer::address_of(participant1);
        let payment_token = create_test_token(admin);
        
        primary_fungible_store::transfer(admin, payment_token, participant1_addr, TICKET_PRICE * 5);

        lottery::create_lottery(organizer, TICKET_PRICE, DURATION, payment_token);
        let lottery_addr = lottery::get_lottery_address(1);

        // Fast forward past end time
        timestamp::fast_forward_seconds(DURATION + 100);
        
        // Try to buy ticket after end time - should fail
        lottery::buy_ticket(participant1, 1, lottery_addr);
    }

    #[test(admin = @module_addr, organizer = @0x100, participant1 = @0x200, participant2 = @0x300, framework = @0x1)]
    #[expected_failure(abort_code = 0x030007, location = module_addr::lottery)]
    fun test_draw_without_participants_fails(admin: &signer, organizer: &signer, participant1: &signer, participant2: &signer, framework: &signer) {
        setup_test(admin, organizer, participant1, participant2, framework);
        
        let payment_token = create_test_token(admin);

        lottery::create_lottery(organizer, TICKET_PRICE, DURATION, payment_token);
        let lottery_addr = lottery::get_lottery_address(1);

        // Fast forward past end time
        timestamp::fast_forward_seconds(DURATION + 100);
        
        // Try to draw without any participants - should fail
        lottery::draw_winner(1, lottery_addr);
    }

    #[test(admin = @module_addr, organizer = @0x100, participant1 = @0x200, participant2 = @0x300, framework = @0x1)]
    #[expected_failure(abort_code = 0x030006, location = module_addr::lottery)]
    fun test_draw_before_end_time_fails(admin: &signer, organizer: &signer, participant1: &signer, participant2: &signer, framework: &signer) {
        setup_test(admin, organizer, participant1, participant2, framework);
        
        let participant1_addr = signer::address_of(participant1);
        let payment_token = create_test_token(admin);
        
        primary_fungible_store::transfer(admin, payment_token, participant1_addr, TICKET_PRICE * 5);

        lottery::create_lottery(organizer, TICKET_PRICE, DURATION, payment_token);
        let lottery_addr = lottery::get_lottery_address(1);

        // Buy ticket
        lottery::buy_ticket(participant1, 1, lottery_addr);
        
        // Try to draw before end time - should fail
        lottery::draw_winner(1, lottery_addr);
    }

    #[test(admin = @module_addr, organizer = @0x100, participant1 = @0x200, participant2 = @0x300, framework = @0x1)]
    #[expected_failure(abort_code = 0x030003, location = module_addr::lottery)]
    fun test_draw_twice_fails(admin: &signer, organizer: &signer, participant1: &signer, participant2: &signer, framework: &signer) {
        setup_test(admin, organizer, participant1, participant2, framework);
        
        let participant1_addr = signer::address_of(participant1);
        let payment_token = create_test_token(admin);
        
        primary_fungible_store::transfer(admin, payment_token, participant1_addr, TICKET_PRICE * 5);

        lottery::create_lottery(organizer, TICKET_PRICE, DURATION, payment_token);
        let lottery_addr = lottery::get_lottery_address(1);

        // Buy ticket
        lottery::buy_ticket(participant1, 1, lottery_addr);
        
        // Fast forward and draw
        timestamp::fast_forward_seconds(DURATION + 100);
        lottery::draw_winner(1, lottery_addr);
        
        // Try to draw again - should fail
        lottery::draw_winner(1, lottery_addr);
    }
}


