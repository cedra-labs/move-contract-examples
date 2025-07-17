#[test_only]
module referral_example::referral_system_tests {
    use std::signer;
    use std::string;
    use std::option;
    use cedra_framework::account;
    use cedra_framework::fungible_asset::{Self, Metadata};
    use cedra_framework::object::{Self, Object};
    use cedra_framework::primary_fungible_store;
    use referral_example::referral_system;

    const REWARD_PERCENTAGE: u64 = 500; // 5%

    // Common test setup helper functions
    fun setup_accounts(admin: &signer) {
        account::create_account_for_test(signer::address_of(admin));
    }
    
    fun setup_accounts_with_users(admin: &signer, user1: &signer) {
        account::create_account_for_test(signer::address_of(admin));
        account::create_account_for_test(signer::address_of(user1));
    }
    
    fun setup_accounts_with_two_users(admin: &signer, user1: &signer, user2: &signer) {
        account::create_account_for_test(signer::address_of(admin));
        account::create_account_for_test(signer::address_of(user1));
        account::create_account_for_test(signer::address_of(user2));
    }
    
    fun setup_accounts_with_three_users(admin: &signer, user1: &signer, user2: &signer, user3: &signer) {
        account::create_account_for_test(signer::address_of(admin));
        account::create_account_for_test(signer::address_of(user1));
        account::create_account_for_test(signer::address_of(user2));
        account::create_account_for_test(signer::address_of(user3));
    }

    fun create_test_token(creator: &signer): Object<Metadata> {
        let constructor_ref = object::create_named_object(creator, b"TEST_TOKEN");
        primary_fungible_store::create_primary_store_enabled_fungible_asset(
            &constructor_ref,
            option::none(), // Maximum supply (none = unlimited)
            string::utf8(b"Test Token"),
            string::utf8(b"TEST"),
            8,
            string::utf8(b"http://example.com/icon"),
            string::utf8(b"http://example.com"),
        );

        let mint_ref = fungible_asset::generate_mint_ref(&constructor_ref);
        let metadata = object::address_to_object<Metadata>(object::address_from_constructor_ref(&constructor_ref));
        
        // Mint tokens to creator
        let fa = fungible_asset::mint(&mint_ref, 10000000);
        primary_fungible_store::deposit(signer::address_of(creator), fa);
        
        metadata
    }

    fun setup_and_fund(admin: &signer, user: &signer, amount: u64): Object<Metadata> {
        account::create_account_for_test(signer::address_of(admin));
        account::create_account_for_test(signer::address_of(user));
        
        let metadata = create_test_token(admin);
        
        // Transfer tokens to user
        primary_fungible_store::transfer(admin, metadata, signer::address_of(user), amount);
        
        metadata
    }

    #[test(admin = @referral_example)]
    fun test_initialize_referral_system_with_valid_percentage(admin: &signer) {
        setup_accounts(admin);
        referral_system::initialize(admin, REWARD_PERCENTAGE);
    }

    #[test(admin = @referral_example, user1 = @0x100)]
    fun test_user_can_register_without_referrer(admin: &signer, user1: &signer) {
        setup_accounts_with_users(admin, user1);
        referral_system::initialize(admin, REWARD_PERCENTAGE);
        
        referral_system::register_solo(user1);
        
        let (referrer, referred_count, total_earned) = referral_system::get_user_stats(signer::address_of(user1));
        assert!(referrer == @0x0, 0);
        assert!(referred_count == 0, 1);
        assert!(total_earned == 0, 2);
    }

    #[test(admin = @referral_example, user1 = @0x100, user2 = @0x200)]
    fun test_user_can_register_with_valid_referrer(admin: &signer, user1: &signer, user2: &signer) {
        setup_accounts_with_two_users(admin, user1, user2);
        referral_system::initialize(admin, REWARD_PERCENTAGE);
        
        // First user registers solo
        referral_system::register_solo(user1);
        
        // Second user registers with first user as referrer
        referral_system::register_with_referrer(user2, signer::address_of(user1));
        
        // Check user2's stats
        let (referrer, referred_count, total_earned) = referral_system::get_user_stats(signer::address_of(user2));
        assert!(referrer == signer::address_of(user1), 0);
        assert!(referred_count == 0, 1);
        assert!(total_earned == 0, 2);
        
        // Check user1's stats (should have 1 referred user)
        let (referrer, referred_count, total_earned) = referral_system::get_user_stats(signer::address_of(user1));
        assert!(referrer == @0x0, 3);
        assert!(referred_count == 1, 4);
        assert!(total_earned == 0, 5);
    }

    #[test(admin = @referral_example, user1 = @0x100)]
    #[expected_failure(abort_code = referral_example::referral_system::E_ALREADY_REGISTERED, location = referral_example::referral_system)]
    fun test_user_cannot_register_twice(admin: &signer, user1: &signer) {
        setup_accounts_with_users(admin, user1);
        referral_system::initialize(admin, REWARD_PERCENTAGE);
        
        referral_system::register_solo(user1);
        referral_system::register_solo(user1);
    }

    #[test(admin = @referral_example, user1 = @0x100, user2 = @0x200)]
    #[expected_failure(abort_code = referral_example::referral_system::E_INVALID_REFERRER, location = referral_example::referral_system)]
    fun test_user_cannot_register_with_non_existent_referrer(admin: &signer, user1: &signer, user2: &signer) {
        setup_accounts_with_two_users(admin, user1, user2);
        referral_system::initialize(admin, REWARD_PERCENTAGE);
        
        // Try to register with non-existent referrer
        referral_system::register_with_referrer(user1, signer::address_of(user2));
    }

    // Test for self-referral is commented out because it's difficult to test in practice
    // The condition requires: user not registered, referrer exists, user_addr == referrer_addr
    // This is hard to achieve in tests since we can't have two different signers with same address

    #[test(admin = @referral_example, buyer = @0x100, seller = @0x200, referrer = @0x300)]
    fun test_purchase_with_referral_pays_correct_reward(
        admin: &signer, 
        buyer: &signer, 
        seller: &signer, 
        referrer: &signer
    ) {
        // Setup accounts
        setup_accounts_with_three_users(admin, buyer, seller, referrer);
        
        referral_system::initialize(admin, REWARD_PERCENTAGE);
        
        // Create token and fund buyer
        let metadata = create_test_token(admin);
        primary_fungible_store::transfer(admin, metadata, signer::address_of(buyer), 1000000);
        
        // Setup referral chain
        referral_system::register_solo(referrer);
        referral_system::register_with_referrer(buyer, signer::address_of(referrer));
        
        let purchase_amount = 100000u64;
        
        // Record initial balances
        let buyer_initial = primary_fungible_store::balance(signer::address_of(buyer), metadata);
        let seller_initial = primary_fungible_store::balance(signer::address_of(seller), metadata);
        let referrer_initial = primary_fungible_store::balance(signer::address_of(referrer), metadata);
        
        // Process purchase
        referral_system::process_purchase_with_referral(
            buyer,
            signer::address_of(seller),
            metadata,
            purchase_amount
        );
        
        // Verify balances
        let buyer_final = primary_fungible_store::balance(signer::address_of(buyer), metadata);
        let seller_final = primary_fungible_store::balance(signer::address_of(seller), metadata);
        let referrer_final = primary_fungible_store::balance(signer::address_of(referrer), metadata);
        
        let reward_amount = (purchase_amount * REWARD_PERCENTAGE) / 10000; // 5% = 5000
        let seller_amount = purchase_amount - reward_amount; // 95000
        
        assert!(buyer_final == buyer_initial - purchase_amount, 0);
        assert!(seller_final == seller_initial + seller_amount, 1);
        assert!(referrer_final == referrer_initial + reward_amount, 2);
        
        // Check referrer stats
        let (_, _, total_earned) = referral_system::get_user_stats(signer::address_of(referrer));
        assert!(total_earned == reward_amount, 3);
    }

    #[test(admin = @referral_example, buyer = @0x100, seller = @0x200)]
    fun test_purchase_without_referral_pays_full_amount_to_seller(
        admin: &signer, 
        buyer: &signer, 
        seller: &signer
    ) {
        // Setup accounts
        setup_accounts_with_two_users(admin, buyer, seller);
        
        referral_system::initialize(admin, REWARD_PERCENTAGE);
        
        // Create token and fund buyer
        let metadata = create_test_token(admin);
        primary_fungible_store::transfer(admin, metadata, signer::address_of(buyer), 1000000);
        
        // Register buyer without referrer
        referral_system::register_solo(buyer);
        
        let purchase_amount = 100000u64;
        
        // Record initial balances
        let buyer_initial = primary_fungible_store::balance(signer::address_of(buyer), metadata);
        let seller_initial = primary_fungible_store::balance(signer::address_of(seller), metadata);
        
        // Process purchase
        referral_system::process_purchase_with_referral(
            buyer,
            signer::address_of(seller),
            metadata,
            purchase_amount
        );
        
        // Verify balances (full amount to seller)
        let buyer_final = primary_fungible_store::balance(signer::address_of(buyer), metadata);
        let seller_final = primary_fungible_store::balance(signer::address_of(seller), metadata);
        
        assert!(buyer_final == buyer_initial - purchase_amount, 0);
        assert!(seller_final == seller_initial + purchase_amount, 1);
    }

    #[test(admin = @referral_example, buyer = @0x100, seller = @0x200)]
    fun test_unregistered_buyer_purchase_bypasses_referral_system(
        admin: &signer, 
        buyer: &signer, 
        seller: &signer
    ) {
        // Setup accounts
        setup_accounts_with_two_users(admin, buyer, seller);
        
        referral_system::initialize(admin, REWARD_PERCENTAGE);
        
        // Create token and fund buyer
        let metadata = create_test_token(admin);
        primary_fungible_store::transfer(admin, metadata, signer::address_of(buyer), 1000000);
        
        let purchase_amount = 100000u64;
        
        // Record initial balances
        let buyer_initial = primary_fungible_store::balance(signer::address_of(buyer), metadata);
        let seller_initial = primary_fungible_store::balance(signer::address_of(seller), metadata);
        
        // Process purchase (buyer not registered)
        referral_system::process_purchase_with_referral(
            buyer,
            signer::address_of(seller),
            metadata,
            purchase_amount
        );
        
        // Verify balances (full amount to seller)
        let buyer_final = primary_fungible_store::balance(signer::address_of(buyer), metadata);
        let seller_final = primary_fungible_store::balance(signer::address_of(seller), metadata);
        
        assert!(buyer_final == buyer_initial - purchase_amount, 0);
        assert!(seller_final == seller_initial + purchase_amount, 1);
    }

    #[test(admin = @referral_example, user1 = @0x100)]
    fun test_unregistered_user_stats_return_zero_values(admin: &signer, user1: &signer) {
        setup_accounts_with_users(admin, user1);
        referral_system::initialize(admin, REWARD_PERCENTAGE);
        
        let (referrer, referred_count, total_earned) = referral_system::get_user_stats(signer::address_of(user1));
        assert!(referrer == @0x0, 0);
        assert!(referred_count == 0, 1);
        assert!(total_earned == 0, 2);
    }

    #[test(admin = @referral_example, user1 = @0x100, user2 = @0x200, user3 = @0x300)]
    fun test_referrer_can_have_multiple_referred_users(
        admin: &signer, 
        user1: &signer, 
        user2: &signer,
        user3: &signer
    ) {
        setup_accounts_with_three_users(admin, user1, user2, user3);
        referral_system::initialize(admin, REWARD_PERCENTAGE);
        
        // Create referral chain
        referral_system::register_solo(user1);
        referral_system::register_with_referrer(user2, signer::address_of(user1));
        referral_system::register_with_referrer(user3, signer::address_of(user1));
        
        // Check user1's referred count
        let (_, referred_count, _) = referral_system::get_user_stats(signer::address_of(user1));
        assert!(referred_count == 2, 0);
    }
    
    #[test(admin = @referral_example)]
    fun test_get_global_stats_returns_correct_values(admin: &signer) {
        setup_accounts(admin);
        referral_system::initialize(admin, REWARD_PERCENTAGE);
        
        let (reward_percentage, is_active, total_rewards_paid) = referral_system::get_global_stats(signer::address_of(admin));
        assert!(reward_percentage == REWARD_PERCENTAGE, 0);
        assert!(is_active == true, 1);
        assert!(total_rewards_paid == 0, 2);
    }
    
    #[test(admin = @referral_example)]
    #[expected_failure(abort_code = referral_example::referral_system::E_INVALID_REWARD_PERCENTAGE, location = referral_example::referral_system)]
    fun test_cannot_initialize_with_reward_percentage_over_100_percent(admin: &signer) {
        setup_accounts(admin);
        referral_system::initialize(admin, 10001); // 100.01%
    }
    
    #[test(admin = @referral_example)]
    fun test_can_initialize_with_100_percent_reward(admin: &signer) {
        setup_accounts(admin);
        referral_system::initialize(admin, 10000); // 100%
    }
    
    #[test(admin = @referral_example)]
    fun test_can_initialize_with_zero_percent_reward(admin: &signer) {
        setup_accounts(admin);
        referral_system::initialize(admin, 0); // 0%
    }
}