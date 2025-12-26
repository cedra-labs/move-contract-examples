// # Comprehensive Test Suite for Referral Tracking Contract
#[test_only]
module module_addr::referral_tracking_test {
    use std::signer;
    use std::vector;
    use std::string;
    use std::option;
    use cedra_framework::account;
    use cedra_framework::fungible_asset::{Self, Metadata};
    use cedra_framework::object::{Self, Object};
    use cedra_framework::primary_fungible_store;
    use module_addr::referral_tracking;

    // ========== Test Setup Helpers ==========

    /// Create test accounts
    fun setup_accounts(admin: &signer) {
        account::create_account_for_test(signer::address_of(admin));
    }

    fun setup_accounts_with_user(admin: &signer, user: &signer) {
        account::create_account_for_test(signer::address_of(admin));
        account::create_account_for_test(signer::address_of(user));
    }

    fun setup_accounts_with_two_users(admin: &signer, user1: &signer, user2: &signer) {
        account::create_account_for_test(signer::address_of(admin));
        account::create_account_for_test(signer::address_of(user1));
        account::create_account_for_test(signer::address_of(user2));
    }

    fun setup_accounts_with_three_users(
        admin: &signer,
        user1: &signer,
        user2: &signer,
        user3: &signer
    ) {
        account::create_account_for_test(signer::address_of(admin));
        account::create_account_for_test(signer::address_of(user1));
        account::create_account_for_test(signer::address_of(user2));
        account::create_account_for_test(signer::address_of(user3));
    }

    /// Create a test fungible asset and mint tokens to admin
    fun create_test_token(creator: &signer): Object<Metadata> {
        let constructor_ref = object::create_named_object(creator, b"TEST_TOKEN");
        primary_fungible_store::create_primary_store_enabled_fungible_asset(
            &constructor_ref,
            option::none(), // Unlimited supply
            string::utf8(b"Test Reward Token"),
            string::utf8(b"REWARD"),
            8,
            string::utf8(b"http://example.com/icon"),
            string::utf8(b"http://example.com"),
        );

        let mint_ref = fungible_asset::generate_mint_ref(&constructor_ref);
        let metadata = object::address_to_object<Metadata>(
            object::address_from_constructor_ref(&constructor_ref)
        );

        // Mint large amount to admin for treasury funding
        let fa = fungible_asset::mint(&mint_ref, 10000000);
        primary_fungible_store::deposit(signer::address_of(creator), fa);

        metadata
    }

    // ========== Initialization Tests ==========

    #[test(admin = @module_addr)]
    fun test_initialize_system(admin: &signer) {
        setup_accounts(admin);
        let reward_token = create_test_token(admin);
        referral_tracking::initialize(admin, reward_token);
    }

    #[test(admin = @module_addr)]
    #[expected_failure(abort_code = 524290, location = module_addr::referral_tracking)]
    fun test_cannot_initialize_twice(admin: &signer) {
        setup_accounts(admin);
        let reward_token = create_test_token(admin);
        referral_tracking::initialize(admin, reward_token);
        referral_tracking::initialize(admin, reward_token); // Should fail
    }

    #[test(admin = @0x999)]
    #[expected_failure(abort_code = 327693, location = module_addr::referral_tracking)]
    fun test_initialize_must_be_module_address(admin: &signer) {
        setup_accounts(admin);
        let reward_token = create_test_token(admin);
        referral_tracking::initialize(admin, reward_token); // Should fail - admin != @module_addr
    }

    // ========== Register Referral Codes Tests ==========

    #[test(admin = @module_addr, user = @0x100)]
    fun test_register_code_success(admin: &signer, user: &signer) {
        setup_accounts_with_user(admin, user);
        let reward_token = create_test_token(admin);
        referral_tracking::initialize(admin, reward_token);

        referral_tracking::register_code(user, b"ABC123");

        let (code, referrer, count, pending, earned) = referral_tracking::get_user_stats(
            signer::address_of(user)
        );
        let expected_code = string::utf8(b"ABC123");
        assert!(code == expected_code, 0);
        assert!(referrer == @0x0, 1);
        assert!(count == 0, 2);
        assert!(pending == 0, 3);
        assert!(earned == 0, 4);
    }

    #[test(admin = @module_addr, user = @0x100)]
    #[expected_failure(abort_code = 65544, location = module_addr::referral_tracking)]
    fun test_register_code_too_short(admin: &signer, user: &signer) {
        setup_accounts_with_user(admin, user);
        let reward_token = create_test_token(admin);
        referral_tracking::initialize(admin, reward_token);

        referral_tracking::register_code(user, b"AB"); // Only 2 chars, min is 3
    }

    #[test(admin = @module_addr, user = @0x100)]
    #[expected_failure(abort_code = 65545, location = module_addr::referral_tracking)]
    fun test_register_code_too_long(admin: &signer, user: &signer) {
        setup_accounts_with_user(admin, user);
        let reward_token = create_test_token(admin);
        referral_tracking::initialize(admin, reward_token);

        // Create a 21-character code (max is 20)
        let long_code = vector::empty<u8>();
        let i = 0;
        while (i < 21) {
            vector::push_back(&mut long_code, 65); // 'A'
            i = i + 1;
        };
        referral_tracking::register_code(user, long_code);
    }

    #[test(admin = @module_addr, user = @0x100)]
    #[expected_failure(abort_code = 65548, location = module_addr::referral_tracking)]
    fun test_register_code_invalid_characters(admin: &signer, user: &signer) {
        setup_accounts_with_user(admin, user);
        let reward_token = create_test_token(admin);
        referral_tracking::initialize(admin, reward_token);

        referral_tracking::register_code(user, b"ABC-123"); // Contains '-' which is invalid
    }

    #[test(admin = @module_addr, user1 = @0x100, user2 = @0x200)]
    #[expected_failure(abort_code = 524291, location = module_addr::referral_tracking)]
    fun test_register_duplicate_code(admin: &signer, user1: &signer, user2: &signer) {
        setup_accounts_with_two_users(admin, user1, user2);
        let reward_token = create_test_token(admin);
        referral_tracking::initialize(admin, reward_token);

        referral_tracking::register_code(user1, b"UNIQUE");
        referral_tracking::register_code(user2, b"UNIQUE"); // Should fail - code taken
    }

    #[test(admin = @module_addr, user = @0x100)]
    #[expected_failure(abort_code = 524303, location = module_addr::referral_tracking)]
    fun test_register_code_when_already_has_code(admin: &signer, user: &signer) {
        setup_accounts_with_user(admin, user);
        let reward_token = create_test_token(admin);
        referral_tracking::initialize(admin, reward_token);

        referral_tracking::register_code(user, b"FIRST");
        referral_tracking::register_code(user, b"SECOND"); // Should fail - already has code
    }

    #[test(admin = @module_addr, user = @0x100)]
    fun test_register_code_min_length(admin: &signer, user: &signer) {
        setup_accounts_with_user(admin, user);
        let reward_token = create_test_token(admin);
        referral_tracking::initialize(admin, reward_token);

        referral_tracking::register_code(user, b"ABC"); // Exactly 3 chars (minimum)
    }

    #[test(admin = @module_addr, user = @0x100)]
    fun test_register_code_max_length(admin: &signer, user: &signer) {
        setup_accounts_with_user(admin, user);
        let reward_token = create_test_token(admin);
        referral_tracking::initialize(admin, reward_token);

        // Create a 20-character code (maximum)
        let max_code = vector::empty<u8>();
        let i = 0;
        while (i < 20) {
            vector::push_back(&mut max_code, 65); // 'A'
            i = i + 1;
        };
        referral_tracking::register_code(user, max_code);
    }

    #[test(admin = @module_addr, user = @0x100)]
    fun test_register_code_lowercase_valid(admin: &signer, user: &signer) {
        setup_accounts_with_user(admin, user);
        let reward_token = create_test_token(admin);
        referral_tracking::initialize(admin, reward_token);

        referral_tracking::register_code(user, b"abc123");
        let (code, _, _, _, _) = referral_tracking::get_user_stats(signer::address_of(user));
        let expected_code = string::utf8(b"abc123");
        assert!(code == expected_code, 0);
    }

    #[test(admin = @module_addr, user = @0x100)]
    fun test_register_code_mixed_case_valid(admin: &signer, user: &signer) {
        setup_accounts_with_user(admin, user);
        let reward_token = create_test_token(admin);
        referral_tracking::initialize(admin, reward_token);

        referral_tracking::register_code(user, b"AbC123XyZ");
        let (code, _, _, _, _) = referral_tracking::get_user_stats(signer::address_of(user));
        let expected_code = string::utf8(b"AbC123XyZ");
        assert!(code == expected_code, 0);
    }

    // ========== Track Referral Rewards Tests ==========

    #[test(admin = @module_addr, referrer = @0x100, new_user = @0x200)]
    fun test_register_with_code_success(admin: &signer, referrer: &signer, new_user: &signer) {
        setup_accounts_with_two_users(admin, referrer, new_user);
        let reward_token = create_test_token(admin);
        referral_tracking::initialize(admin, reward_token);

        // Referrer registers code
        referral_tracking::register_code(referrer, b"REF123");

        // New user registers with code
        referral_tracking::register_with_code(new_user, b"REF123");

        // Check new user stats
        let (code, ref_addr, count, pending, earned) = referral_tracking::get_user_stats(
            signer::address_of(new_user)
        );
        assert!(string::length(&code) == 0, 0); // Referred users don't get codes
        assert!(ref_addr == signer::address_of(referrer), 1);
        assert!(count == 0, 2);
        assert!(pending == 0, 3);
        assert!(earned == 0, 4);

        // Check referrer stats - should have pending reward
        let (_, _, ref_count, ref_pending, _) = referral_tracking::get_user_stats(
            signer::address_of(referrer)
        );
        assert!(ref_count == 1, 5);
        assert!(ref_pending == 1000, 6); // REFERRAL_REWARD = 1000
    }

    #[test(admin = @module_addr, referrer = @0x100, new_user = @0x200)]
    #[expected_failure(abort_code = 393220, location = module_addr::referral_tracking)]
    fun test_register_with_nonexistent_code(admin: &signer, referrer: &signer, new_user: &signer) {
        setup_accounts_with_two_users(admin, referrer, new_user);
        let reward_token = create_test_token(admin);
        referral_tracking::initialize(admin, reward_token);

        referral_tracking::register_with_code(new_user, b"FAKE"); // Code doesn't exist
    }

    #[test(admin = @module_addr, user = @0x100)]
    #[expected_failure(abort_code = 524290, location = module_addr::referral_tracking)]
    fun test_register_with_code_already_registered(admin: &signer, user: &signer) {
        setup_accounts_with_user(admin, user);
        let reward_token = create_test_token(admin);
        referral_tracking::initialize(admin, reward_token);

        referral_tracking::register_code(user, b"MYCODE");
        referral_tracking::register_with_code(user, b"OTHER"); // Already registered
    }

    #[test(admin = @module_addr, user1 = @0x100, user2 = @0x200, user3 = @0x300)]
    fun test_chain_referrals_tracks_correctly(admin: &signer, user1: &signer, user2: &signer, user3: &signer) {
        setup_accounts_with_three_users(admin, user1, user2, user3);
        let reward_token = create_test_token(admin);
        referral_tracking::initialize(admin, reward_token);

        // User1 registers code
        referral_tracking::register_code(user1, b"FIRST");

        // User2 registers with user1's code
        referral_tracking::register_with_code(user2, b"FIRST");

        // User3 also registers with user1's code
        referral_tracking::register_with_code(user3, b"FIRST");

        // User1 should have 2 referrals
        let (_, _, count, pending, _) = referral_tracking::get_user_stats(
            signer::address_of(user1)
        );
        assert!(count == 2, 0);
        assert!(pending == 2000, 1);

        // User2 and user3 have no code and no referrals
        let (code2, _, count2, _, _) = referral_tracking::get_user_stats(
            signer::address_of(user2)
        );
        assert!(string::length(&code2) == 0, 2);
        assert!(count2 == 0, 3);
    }

    #[test(admin = @module_addr, user = @0x100)]
    fun test_code_registration_after_referral(admin: &signer, user: &signer) {
        setup_accounts_with_user(admin, user);
        let reward_token = create_test_token(admin);
        referral_tracking::initialize(admin, reward_token);

        // User registers code first, then later someone uses it
        referral_tracking::register_code(user, b"LATER");

        // Verify the code was registered
        let (code, _, _, _, _) = referral_tracking::get_user_stats(
            signer::address_of(user)
        );
        let expected_code = string::utf8(b"LATER");
        assert!(code == expected_code, 0);

        // User can't register another code (this is tested in test_register_code_when_already_has_code)
        // But they can have their code used by others
    }

    // ========== Treasury Deposit Tests ==========

    #[test(admin = @module_addr)]
    fun test_deposit_rewards_success(admin: &signer) {
        setup_accounts(admin);
        let reward_token = create_test_token(admin);
        referral_tracking::initialize(admin, reward_token);

        referral_tracking::deposit_rewards(admin, 5000);

        let (balance, deposited) = referral_tracking::get_treasury_stats();
        assert!(balance == 5000, 0);
        assert!(deposited == 5000, 1);
    }

    #[test(admin = @module_addr, non_admin = @0x100)]
    #[expected_failure(abort_code = 327693, location = module_addr::referral_tracking)]
    fun test_deposit_rewards_unauthorized(admin: &signer, non_admin: &signer) {
        setup_accounts_with_user(admin, non_admin);
        let reward_token = create_test_token(admin);
        referral_tracking::initialize(admin, reward_token);

        // Non-admin tries to deposit
        referral_tracking::deposit_rewards(non_admin, 1000);
    }

    #[test(admin = @module_addr)]
    fun test_deposit_rewards_multiple_times(admin: &signer) {
        setup_accounts(admin);
        let reward_token = create_test_token(admin);
        referral_tracking::initialize(admin, reward_token);

        referral_tracking::deposit_rewards(admin, 3000);
        referral_tracking::deposit_rewards(admin, 2000);

        let (balance, deposited) = referral_tracking::get_treasury_stats();
        assert!(balance == 5000, 0);
        assert!(deposited == 5000, 1);
    }

    // ========== Claim Rewards Function Tests ==========

    #[test(admin = @module_addr, referrer = @0x100, new_user = @0x200)]
    fun test_claim_rewards_full_amount(admin: &signer, referrer: &signer, new_user: &signer) {
        setup_accounts_with_two_users(admin, referrer, new_user);
        let reward_token = create_test_token(admin);
        referral_tracking::initialize(admin, reward_token);

        // Setup: referrer has code, new user registers with it
        referral_tracking::register_code(referrer, b"REF123");
        referral_tracking::register_with_code(new_user, b"REF123");

        // Fund treasury
        referral_tracking::deposit_rewards(admin, 5000);

        // Claim full pending reward
        referral_tracking::claim_rewards(referrer, 1000);

        // Check balances
        let user_balance = primary_fungible_store::balance(
            signer::address_of(referrer),
            reward_token
        );
        assert!(user_balance == 1000, 0);

        // Check user stats
        let (_, _, count, pending, earned) = referral_tracking::get_user_stats(
            signer::address_of(referrer)
        );
        assert!(count == 1, 1);
        assert!(pending == 0, 2);
        assert!(earned == 1000, 3);

        // Check treasury
        let (treasury_balance, _) = referral_tracking::get_treasury_stats();
        assert!(treasury_balance == 4000, 4);

        // Check global stats
        let (_, _, _, total_paid, _) = referral_tracking::get_global_stats();
        assert!(total_paid == 1000, 5);
    }

    #[test(admin = @module_addr, referrer = @0x100, new_user = @0x200)]
    fun test_claim_rewards_partial(admin: &signer, referrer: &signer, new_user: &signer) {
        setup_accounts_with_two_users(admin, referrer, new_user);
        let reward_token = create_test_token(admin);
        referral_tracking::initialize(admin, reward_token);

        referral_tracking::register_code(referrer, b"REF123");
        referral_tracking::register_with_code(new_user, b"REF123");
        referral_tracking::deposit_rewards(admin, 5000);

        // Claim partial amount
        referral_tracking::claim_rewards(referrer, 300);

        let (_, _, _, pending, earned) = referral_tracking::get_user_stats(
            signer::address_of(referrer)
        );
        assert!(pending == 700, 0); // 1000 - 300
        assert!(earned == 300, 1);

        // Claim more
        referral_tracking::claim_rewards(referrer, 500);
        let (_, _, _, pending2, earned2) = referral_tracking::get_user_stats(
            signer::address_of(referrer)
        );
        assert!(pending2 == 200, 2); // 700 - 500
        assert!(earned2 == 800, 3); // 300 + 500
    }

    #[test(admin = @module_addr, user = @0x100)]
    #[expected_failure(abort_code = 393226, location = module_addr::referral_tracking)]
    fun test_claim_rewards_user_not_found(admin: &signer, user: &signer) {
        setup_accounts_with_user(admin, user);
        let reward_token = create_test_token(admin);
        referral_tracking::initialize(admin, reward_token);
        referral_tracking::deposit_rewards(admin, 1000);

        referral_tracking::claim_rewards(user, 100); // User not registered
    }

    #[test(admin = @module_addr, referrer = @0x100, new_user = @0x200)]
    #[expected_failure(abort_code = 196615, location = module_addr::referral_tracking)]
    fun test_claim_rewards_no_pending(admin: &signer, referrer: &signer, new_user: &signer) {
        setup_accounts_with_two_users(admin, referrer, new_user);
        let reward_token = create_test_token(admin);
        referral_tracking::initialize(admin, reward_token);

        referral_tracking::register_code(referrer, b"REF123");
        referral_tracking::deposit_rewards(admin, 1000);

        // Referrer has no pending rewards (no one used their code yet)
        referral_tracking::claim_rewards(referrer, 100);
    }

    #[test(admin = @module_addr, referrer = @0x100, new_user = @0x200)]
    #[expected_failure(abort_code = 65550, location = module_addr::referral_tracking)]
    fun test_claim_rewards_exceeds_pending(admin: &signer, referrer: &signer, new_user: &signer) {
        setup_accounts_with_two_users(admin, referrer, new_user);
        let reward_token = create_test_token(admin);
        referral_tracking::initialize(admin, reward_token);

        referral_tracking::register_code(referrer, b"REF123");
        referral_tracking::register_with_code(new_user, b"REF123");
        referral_tracking::deposit_rewards(admin, 5000);

        // Try to claim more than pending (1000)
        referral_tracking::claim_rewards(referrer, 2000);
    }

    #[test(admin = @module_addr, referrer = @0x100, new_user = @0x200)]
    #[expected_failure(abort_code = 65547, location = module_addr::referral_tracking)]
    fun test_claim_rewards_zero_amount(admin: &signer, referrer: &signer, new_user: &signer) {
        setup_accounts_with_two_users(admin, referrer, new_user);
        let reward_token = create_test_token(admin);
        referral_tracking::initialize(admin, reward_token);

        referral_tracking::register_code(referrer, b"REF123");
        referral_tracking::register_with_code(new_user, b"REF123");
        referral_tracking::deposit_rewards(admin, 1000);

        referral_tracking::claim_rewards(referrer, 0); // Zero amount
    }

    #[test(admin = @module_addr, referrer = @0x100, new_user = @0x200)]
    #[expected_failure(abort_code = 589841, location = module_addr::referral_tracking)]
    fun test_claim_rewards_insufficient_treasury(admin: &signer, referrer: &signer, new_user: &signer) {
        setup_accounts_with_two_users(admin, referrer, new_user);
        let reward_token = create_test_token(admin);
        referral_tracking::initialize(admin, reward_token);

        referral_tracking::register_code(referrer, b"REF123");
        referral_tracking::register_with_code(new_user, b"REF123");

        // Don't fund treasury enough
        referral_tracking::deposit_rewards(admin, 500); // Only 500, but need 1000

        // Should fail - treasury has insufficient balance
        referral_tracking::claim_rewards(referrer, 1000);
    }

    #[test(admin = @module_addr, referrer = @0x100, user1 = @0x200, user2 = @0x300)]
    fun test_claim_rewards_after_multiple_referrals(admin: &signer, referrer: &signer, user1: &signer, user2: &signer) {
        setup_accounts_with_three_users(admin, referrer, user1, user2);
        let reward_token = create_test_token(admin);
        referral_tracking::initialize(admin, reward_token);

        referral_tracking::register_code(referrer, b"REF123");
        referral_tracking::register_with_code(user1, b"REF123");
        referral_tracking::register_with_code(user2, b"REF123");

        referral_tracking::deposit_rewards(admin, 5000);

        // Claim all rewards
        referral_tracking::claim_rewards(referrer, 2000);

        let (_, _, count, pending, earned) = referral_tracking::get_user_stats(
            signer::address_of(referrer)
        );
        assert!(count == 2, 0);
        assert!(pending == 0, 1);
        assert!(earned == 2000, 2);
    }

    // ========== View Function Tests ==========

    #[test(admin = @module_addr)]
    fun test_get_global_stats(admin: &signer) {
        setup_accounts(admin);
        let reward_token = create_test_token(admin);
        referral_tracking::initialize(admin, reward_token);

        let (admin_addr, _token, is_active, total_paid, reward) = referral_tracking::get_global_stats();
        assert!(admin_addr == @module_addr, 0);
        assert!(is_active == true, 1);
        assert!(total_paid == 0, 2);
        assert!(reward == 1000, 3); // REFERRAL_REWARD
    }

    #[test(admin = @module_addr)]
    fun test_get_treasury_stats(admin: &signer) {
        setup_accounts(admin);
        let reward_token = create_test_token(admin);
        referral_tracking::initialize(admin, reward_token);

        let (balance, deposited) = referral_tracking::get_treasury_stats();
        assert!(balance == 0, 0);
        assert!(deposited == 0, 1);

        referral_tracking::deposit_rewards(admin, 3000);
        let (balance2, deposited2) = referral_tracking::get_treasury_stats();
        assert!(balance2 == 3000, 2);
        assert!(deposited2 == 3000, 3);
    }

    #[test(admin = @module_addr, user = @0x100)]
    fun test_get_user_stats_unregistered(admin: &signer, user: &signer) {
        setup_accounts_with_user(admin, user);
        let reward_token = create_test_token(admin);
        referral_tracking::initialize(admin, reward_token);

        let (code, referrer, count, pending, earned) = referral_tracking::get_user_stats(
            signer::address_of(user)
        );
        assert!(string::length(&code) == 0, 0);
        assert!(referrer == @0x0, 1);
        assert!(count == 0, 2);
        assert!(pending == 0, 3);
        assert!(earned == 0, 4);
    }

    #[test(admin = @module_addr, user = @0x100)]
    fun test_get_pending_rewards_unregistered(admin: &signer, user: &signer) {
        setup_accounts_with_user(admin, user);
        let reward_token = create_test_token(admin);
        referral_tracking::initialize(admin, reward_token);

        let pending = referral_tracking::get_pending_rewards(signer::address_of(user));
        assert!(pending == 0, 0);
    }

    #[test(admin = @module_addr, referrer = @0x100, new_user = @0x200)]
    fun test_get_pending_rewards_registered(admin: &signer, referrer: &signer, new_user: &signer) {
        setup_accounts_with_two_users(admin, referrer, new_user);
        let reward_token = create_test_token(admin);
        referral_tracking::initialize(admin, reward_token);

        referral_tracking::register_code(referrer, b"REF123");
        referral_tracking::register_with_code(new_user, b"REF123");

        let pending = referral_tracking::get_pending_rewards(signer::address_of(referrer));
        assert!(pending == 1000, 0);
    }

    // ========== Integration Tests ==========

    #[test(admin = @module_addr, referrer = @0x100, user1 = @0x200, user2 = @0x300)]
    fun test_complete_flow_multiple_users(admin: &signer, referrer: &signer, user1: &signer, user2: &signer) {
        setup_accounts_with_three_users(admin, referrer, user1, user2);
        let reward_token = create_test_token(admin);
        referral_tracking::initialize(admin, reward_token);

        // Referrer registers code
        referral_tracking::register_code(referrer, b"PROMO");

        // Two users register with code
        referral_tracking::register_with_code(user1, b"PROMO");
        referral_tracking::register_with_code(user2, b"PROMO");

        // Admin funds treasury
        referral_tracking::deposit_rewards(admin, 10000);

        // Referrer claims partial
        referral_tracking::claim_rewards(referrer, 500);

        // Verify state
        let (_, _, count, pending, earned) = referral_tracking::get_user_stats(
            signer::address_of(referrer)
        );
        assert!(count == 2, 0);
        assert!(pending == 1500, 1); // 2000 - 500
        assert!(earned == 500, 2);

        // Claim remaining
        referral_tracking::claim_rewards(referrer, 1500);
        let (_, _, _, pending2, earned2) = referral_tracking::get_user_stats(
            signer::address_of(referrer)
        );
        assert!(pending2 == 0, 3);
        assert!(earned2 == 2000, 4);

        // Check treasury
        let (treasury_balance, _) = referral_tracking::get_treasury_stats();
        assert!(treasury_balance == 8000, 5); // 10000 - 2000

        // Check global stats
        let (_, _, _, total_paid, _) = referral_tracking::get_global_stats();
        assert!(total_paid == 2000, 6);
    }

    #[test(admin = @module_addr, referrer = @0x100, new_user = @0x200)]
    fun test_multiple_claims_until_zero(admin: &signer, referrer: &signer, new_user: &signer) {
        setup_accounts_with_two_users(admin, referrer, new_user);
        let reward_token = create_test_token(admin);
        referral_tracking::initialize(admin, reward_token);

        referral_tracking::register_code(referrer, b"MULTI");
        referral_tracking::register_with_code(new_user, b"MULTI");
        referral_tracking::deposit_rewards(admin, 5000);

        // Multiple small claims
        referral_tracking::claim_rewards(referrer, 100);
        referral_tracking::claim_rewards(referrer, 200);
        referral_tracking::claim_rewards(referrer, 300);
        referral_tracking::claim_rewards(referrer, 400);

        let (_, _, _, pending, earned) = referral_tracking::get_user_stats(
            signer::address_of(referrer)
        );
        assert!(pending == 0, 0); // 1000 - 100 - 200 - 300 - 400 = 0
        assert!(earned == 1000, 1);
    }
}
