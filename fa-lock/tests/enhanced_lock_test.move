#[test_only]
module lock_deployer::enhanced_lock_test {
    use cedra_framework::fungible_asset::{Self, Metadata};
    use cedra_framework::object::{Self, Object};
    use cedra_framework::primary_fungible_store;
    use cedra_framework::timestamp;
    use std::option;
    use std::signer;
    use lock_deployer::lock;

    #[test_only]
    const TWO_HOURS_SECS: u64 = 2 * 60 * 60;
    #[test_only]
    const ONE_HOUR_SECS: u64 = 60 * 60;

    #[test_only]
    fun setup_for_test(
        framework: &signer,
        asset: &signer,
        creator: &signer,
        user: &signer
    ): (address, address, Object<Metadata>, Object<lock::Lockup>) {
        timestamp::set_time_has_started_for_testing(framework);
        let (creator_ref, metadata) = fungible_asset::create_test_token(asset);
        let (mint_ref, _transfer_ref, _burn_ref) = primary_fungible_store::init_test_metadata_with_primary_store_enabled(
            &creator_ref
        );
        let creator_address = signer::address_of(creator);
        let user_address = signer::address_of(user);
        // Max supply is 100 - give all to user since most tests need user funds
        primary_fungible_store::mint(&mint_ref, user_address, 100);
        let fa_metadata: Object<Metadata> = object::convert(metadata);
        let lockup_obj = lock::init_lockup_for_test(creator);
        (creator_address, user_address, fa_metadata, lockup_obj)
    }

    // ===================== PAUSE MECHANISM TESTS =====================

    #[test(framework = @0x1, asset = @0xAAAAA, creator = @0x10C0, user = @0xCAFE)]
    fun test_pause_and_unpause(framework: &signer, asset: &signer, creator: &signer, user: &signer) {
        let (creator_address, user_address, fa_metadata, lockup_obj) = setup_for_test(framework, asset, creator, user);

        // Contract should start unpaused
        assert!(!lock::is_paused(lockup_obj), 0);

        // Creator can pause
        lock::pause_lockup(creator, lockup_obj);
        assert!(lock::is_paused(lockup_obj), 1);

        // Creator can unpause
        lock::unpause_lockup(creator, lockup_obj);
        assert!(!lock::is_paused(lockup_obj), 2);
    }

    #[test(framework = @0x1, asset = @0xAAAAA, creator = @0x10C0, user = @0xCAFE)]
    #[expected_failure(abort_code = 10, location = lock_deployer::lock)]
    fun test_cannot_escrow_when_paused(framework: &signer, asset: &signer, creator: &signer, user: &signer) {
        let (_creator_address, _user_address, fa_metadata, lockup_obj) = setup_for_test(framework, asset, creator, user);

        // Pause the contract
        lock::pause_lockup(creator, lockup_obj);

        // Should fail to escrow when paused
        lock::escrow_funds_with_no_lockup(user, lockup_obj, fa_metadata, 5);
    }

    #[test(framework = @0x1, asset = @0xAAAAA, creator = @0x10C0, user = @0xCAFE)]
    #[expected_failure(abort_code = 5, location = lock_deployer::lock)]
    fun test_non_creator_cannot_pause(framework: &signer, asset: &signer, creator: &signer, user: &signer) {
        let (_creator_address, _user_address, _fa_metadata, lockup_obj) = setup_for_test(framework, asset, creator, user);

        // User should not be able to pause
        lock::pause_lockup(user, lockup_obj);
    }

    // ===================== BATCH OPERATIONS TESTS =====================

    #[test(framework = @0x1, asset = @0xAAAAA, creator = @0x10C0, user1 = @0xCAFE, user2 = @0xBEEF)]
    fun test_batch_escrow_with_time(
        framework: &signer,
        asset: &signer,
        creator: &signer,
        user1: &signer,
        user2: &signer
    ) {
        timestamp::set_time_has_started_for_testing(framework);
        let (creator_ref, metadata) = fungible_asset::create_test_token(asset);
        let (mint_ref, _transfer_ref, _burn_ref) = primary_fungible_store::init_test_metadata_with_primary_store_enabled(
            &creator_ref
        );
        
        let creator_address = signer::address_of(creator);
        let user1_address = signer::address_of(user1);
        let user2_address = signer::address_of(user2);
        
        // Mint tokens to creator for batch escrow (max supply is 100)
        primary_fungible_store::mint(&mint_ref, creator_address, 100);
        
        let fa_metadata: Object<Metadata> = object::convert(metadata);
        let lockup_obj = lock::init_lockup_for_test(creator);

        // Batch escrow to multiple users
        let users = vector[user1_address, user2_address];
        let amounts = vector[30, 40];
        
        lock::batch_escrow_with_time(creator, lockup_obj, fa_metadata, users, amounts, TWO_HOURS_SECS);

        // Verify escrows were created
        assert!(lock::escrowed_funds(lockup_obj, fa_metadata, user1_address) == option::some(30), 0);
        assert!(lock::escrowed_funds(lockup_obj, fa_metadata, user2_address) == option::some(40), 1);
        
        // Verify creator's balance reduced
        assert!(primary_fungible_store::balance(creator_address, fa_metadata) == 30, 2);
        
        // Verify lock times are set
        assert!(lock::remaining_escrow_time(lockup_obj, fa_metadata, user1_address) == option::some(TWO_HOURS_SECS), 3);
        assert!(lock::remaining_escrow_time(lockup_obj, fa_metadata, user2_address) == option::some(TWO_HOURS_SECS), 4);
    }

    #[test(framework = @0x1, asset = @0xAAAAA, creator = @0x10C0, user1 = @0xCAFE, user2 = @0xBEEF)]
    #[expected_failure(abort_code = 12, location = lock_deployer::lock)]
    fun test_batch_escrow_length_mismatch(
        framework: &signer,
        asset: &signer,
        creator: &signer,
        user1: &signer,
        user2: &signer
    ) {
        let (creator_address, user1_address, fa_metadata, lockup_obj) = setup_for_test(framework, asset, creator, user1);
        let user2_address = signer::address_of(user2);
        
        // Mismatched vector lengths should fail
        let users = vector[user1_address, user2_address];
        let amounts = vector[50]; // Only one amount for two users
        
        lock::batch_escrow_with_time(creator, lockup_obj, fa_metadata, users, amounts, TWO_HOURS_SECS);
    }

    #[test(framework = @0x1, asset = @0xAAAAA, creator = @0x10C0, user1 = @0xCAFE, user2 = @0xBEEF)]
    fun test_batch_return_user_funds(
        framework: &signer,
        asset: &signer,
        creator: &signer,
        user1: &signer,
        user2: &signer
    ) {
        timestamp::set_time_has_started_for_testing(framework);
        let (creator_ref, metadata) = fungible_asset::create_test_token(asset);
        let (mint_ref, _transfer_ref, _burn_ref) = primary_fungible_store::init_test_metadata_with_primary_store_enabled(
            &creator_ref
        );
        
        let creator_address = signer::address_of(creator);
        let user1_address = signer::address_of(user1);
        let user2_address = signer::address_of(user2);
        
        primary_fungible_store::mint(&mint_ref, user1_address, 50);
        primary_fungible_store::mint(&mint_ref, user2_address, 50);
        
        let fa_metadata: Object<Metadata> = object::convert(metadata);
        let lockup_obj = lock::init_lockup_for_test(creator);

        // Users escrow funds
        lock::escrow_funds_with_no_lockup(user1, lockup_obj, fa_metadata, 30);
        lock::escrow_funds_with_no_lockup(user2, lockup_obj, fa_metadata, 40);
        
        // Verify escrows
        assert!(primary_fungible_store::balance(user1_address, fa_metadata) == 20, 0);
        assert!(primary_fungible_store::balance(user2_address, fa_metadata) == 10, 1);

        // Batch return
        let users = vector[user1_address, user2_address];
        lock::batch_return_user_funds(creator, lockup_obj, fa_metadata, users);

        // Verify all funds returned
        assert!(primary_fungible_store::balance(user1_address, fa_metadata) == 50, 2);
        assert!(primary_fungible_store::balance(user2_address, fa_metadata) == 50, 3);
        
        // Verify escrows cleaned up
        assert!(lock::escrowed_funds(lockup_obj, fa_metadata, user1_address) == option::none(), 4);
        assert!(lock::escrowed_funds(lockup_obj, fa_metadata, user2_address) == option::none(), 5);
    }

    // ===================== PARTIAL WITHDRAWAL TESTS =====================

    #[test(framework = @0x1, asset = @0xAAAAA, creator = @0x10C0, user = @0xCAFE)]
    fun test_partial_withdraw_simple_escrow(framework: &signer, asset: &signer, creator: &signer, user: &signer) {
        let (creator_address, user_address, fa_metadata, lockup_obj) = setup_for_test(framework, asset, creator, user);

        // Escrow 50 tokens
        lock::escrow_funds_with_no_lockup(user, lockup_obj, fa_metadata, 50);
        assert!(primary_fungible_store::balance(user_address, fa_metadata) == 50, 0);
        assert!(lock::escrowed_funds(lockup_obj, fa_metadata, user_address) == option::some(50), 1);

        // Partial withdraw 20 tokens
        lock::partial_withdraw(user, lockup_obj, fa_metadata, 20);
        
        // Verify balances
        assert!(primary_fungible_store::balance(user_address, fa_metadata) == 70, 2);
        assert!(lock::escrowed_funds(lockup_obj, fa_metadata, user_address) == option::some(30), 3);

        // Withdraw remaining 30
        lock::partial_withdraw(user, lockup_obj, fa_metadata, 30);
        
        // Escrow should be cleaned up
        assert!(primary_fungible_store::balance(user_address, fa_metadata) == 100, 4);
        assert!(lock::escrowed_funds(lockup_obj, fa_metadata, user_address) == option::none(), 5);
    }

    #[test(framework = @0x1, asset = @0xAAAAA, creator = @0x10C0, user = @0xCAFE)]
    fun test_partial_withdraw_time_locked(framework: &signer, asset: &signer, creator: &signer, user: &signer) {
        let (creator_address, user_address, fa_metadata, lockup_obj) = setup_for_test(framework, asset, creator, user);

        // Escrow with time lock
        lock::escrow_funds_with_time(user, lockup_obj, fa_metadata, 50, TWO_HOURS_SECS);
        assert!(lock::escrowed_funds(lockup_obj, fa_metadata, user_address) == option::some(50), 0);

        // Fast forward past unlock time
        timestamp::fast_forward_seconds(TWO_HOURS_SECS);

        // Partial withdraw should work now
        lock::partial_withdraw(user, lockup_obj, fa_metadata, 20);
        assert!(primary_fungible_store::balance(user_address, fa_metadata) == 70, 1);
        assert!(lock::escrowed_funds(lockup_obj, fa_metadata, user_address) == option::some(30), 2);
    }

    #[test(framework = @0x1, asset = @0xAAAAA, creator = @0x10C0, user = @0xCAFE)]
    #[expected_failure(abort_code = 4, location = lock_deployer::lock)]
    fun test_partial_withdraw_before_unlock(framework: &signer, asset: &signer, creator: &signer, user: &signer) {
        let (_creator_address, _user_address, fa_metadata, lockup_obj) = setup_for_test(framework, asset, creator, user);

        // Escrow with time lock
        lock::escrow_funds_with_time(user, lockup_obj, fa_metadata, 50, TWO_HOURS_SECS);

        // Should fail - time not yet passed
        lock::partial_withdraw(user, lockup_obj, fa_metadata, 20);
    }

    #[test(framework = @0x1, asset = @0xAAAAA, creator = @0x10C0, user = @0xCAFE)]
    #[expected_failure(abort_code = 11, location = lock_deployer::lock)]
    fun test_partial_withdraw_insufficient_balance(framework: &signer, asset: &signer, creator: &signer, user: &signer) {
        let (_creator_address, _user_address, fa_metadata, lockup_obj) = setup_for_test(framework, asset, creator, user);

        // Escrow 20 tokens
        lock::escrow_funds_with_no_lockup(user, lockup_obj, fa_metadata, 20);

        // Try to withdraw more than balance
        lock::partial_withdraw(user, lockup_obj, fa_metadata, 50);
    }

    // ===================== INPUT VALIDATION TESTS =====================

    #[test(framework = @0x1, asset = @0xAAAAA, creator = @0x10C0, user = @0xCAFE)]
    #[expected_failure(abort_code = 9, location = lock_deployer::lock)]
    fun test_escrow_zero_amount(framework: &signer, asset: &signer, creator: &signer, user: &signer) {
        let (_creator_address, _user_address, fa_metadata, lockup_obj) = setup_for_test(framework, asset, creator, user);

        // Should fail with zero amount
        lock::escrow_funds_with_no_lockup(user, lockup_obj, fa_metadata, 0);
    }

    #[test(framework = @0x1, asset = @0xAAAAA, creator = @0x10C0, user = @0xCAFE)]
    #[expected_failure(abort_code = 9, location = lock_deployer::lock)]
    fun test_partial_withdraw_zero_amount(framework: &signer, asset: &signer, creator: &signer, user: &signer) {
        let (_creator_address, _user_address, fa_metadata, lockup_obj) = setup_for_test(framework, asset, creator, user);

        lock::escrow_funds_with_no_lockup(user, lockup_obj, fa_metadata, 50);

        // Should fail with zero amount
        lock::partial_withdraw(user, lockup_obj, fa_metadata, 0);
    }

    // ===================== VIEW FUNCTION TESTS =====================

    #[test(framework = @0x1, asset = @0xAAAAA, creator = @0x10C0, user = @0xCAFE)]
    fun test_view_functions(framework: &signer, asset: &signer, creator: &signer, user: &signer) {
        let (creator_address, user_address, fa_metadata, lockup_obj) = setup_for_test(framework, asset, creator, user);

        // Test get_creator
        assert!(lock::get_creator(lockup_obj) == creator_address, 0);

        // Test is_paused (should be false initially)
        assert!(!lock::is_paused(lockup_obj), 1);

        // Test escrow_exists (should be false)
        assert!(!lock::escrow_exists(lockup_obj, fa_metadata, user_address), 2);

        // Create escrow
        lock::escrow_funds_with_no_lockup(user, lockup_obj, fa_metadata, 30);

        // Test escrow_exists (should be true now)
        assert!(lock::escrow_exists(lockup_obj, fa_metadata, user_address), 3);

        // Test escrowed_funds
        assert!(lock::escrowed_funds(lockup_obj, fa_metadata, user_address) == option::some(30), 4);

        // Test remaining_escrow_time (should be 0 for simple escrow)
        assert!(lock::remaining_escrow_time(lockup_obj, fa_metadata, user_address) == option::some(0), 5);
    }

    // ===================== EDGE CASE TESTS =====================

    #[test(framework = @0x1, asset = @0xAAAAA, creator = @0x10C0, user = @0xCAFE)]
    fun test_multiple_escrows_for_same_user_different_assets(
        framework: &signer,
        asset: &signer,
        creator: &signer,
        user: &signer
    ) {
        timestamp::set_time_has_started_for_testing(framework);
        
        // Create two different assets
        let (creator_ref1, metadata1) = fungible_asset::create_test_token(asset);
        let (mint_ref1, _, _) = primary_fungible_store::init_test_metadata_with_primary_store_enabled(&creator_ref1);
        
        let user_address = signer::address_of(user);
        primary_fungible_store::mint(&mint_ref1, user_address, 100);
        
        let fa_metadata1: Object<Metadata> = object::convert(metadata1);
        let lockup_obj = lock::init_lockup_for_test(creator);

        // Escrow both assets
        lock::escrow_funds_with_no_lockup(user, lockup_obj, fa_metadata1, 30);

        // Verify both escrows exist independently
        assert!(lock::escrowed_funds(lockup_obj, fa_metadata1, user_address) == option::some(30), 0);
    }

    #[test(framework = @0x1, asset = @0xAAAAA, creator = @0x10C0, user = @0xCAFE)]
    fun test_add_to_existing_simple_escrow(framework: &signer, asset: &signer, creator: &signer, user: &signer) {
        let (_creator_address, user_address, fa_metadata, lockup_obj) = setup_for_test(framework, asset, creator, user);

        // Create initial escrow
        lock::escrow_funds_with_no_lockup(user, lockup_obj, fa_metadata, 30);
        assert!(lock::escrowed_funds(lockup_obj, fa_metadata, user_address) == option::some(30), 0);

        // Add more funds to existing escrow
        lock::escrow_funds_with_no_lockup(user, lockup_obj, fa_metadata, 20);
        assert!(lock::escrowed_funds(lockup_obj, fa_metadata, user_address) == option::some(50), 1);
    }

    #[test(framework = @0x1, asset = @0xAAAAA, creator = @0x10C0, user = @0xCAFE)]
    fun test_extend_time_lockup(framework: &signer, asset: &signer, creator: &signer, user: &signer) {
        let (_creator_address, user_address, fa_metadata, lockup_obj) = setup_for_test(framework, asset, creator, user);

        // Create time-locked escrow
        lock::escrow_funds_with_time(user, lockup_obj, fa_metadata, 30, ONE_HOUR_SECS);
        assert!(lock::remaining_escrow_time(lockup_obj, fa_metadata, user_address) == option::some(ONE_HOUR_SECS), 0);

        // Extend the lock time (add more funds with longer time)
        lock::escrow_funds_with_time(user, lockup_obj, fa_metadata, 20, TWO_HOURS_SECS);
        
        // Lock time should be extended
        assert!(lock::remaining_escrow_time(lockup_obj, fa_metadata, user_address) == option::some(TWO_HOURS_SECS), 1);
        assert!(lock::escrowed_funds(lockup_obj, fa_metadata, user_address) == option::some(50), 2);
    }

    #[test(framework = @0x1, asset = @0xAAAAA, creator = @0x10C0, user = @0xCAFE)]
    #[expected_failure(abort_code = 8, location = lock_deployer::lock)]
    fun test_cannot_shorten_time_lockup(framework: &signer, asset: &signer, creator: &signer, user: &signer) {
        let (_creator_address, _user_address, fa_metadata, lockup_obj) = setup_for_test(framework, asset, creator, user);

        // Create time-locked escrow with 2 hours
        lock::escrow_funds_with_time(user, lockup_obj, fa_metadata, 30, TWO_HOURS_SECS);

        // Try to add funds with shorter time - should fail
        lock::escrow_funds_with_time(user, lockup_obj, fa_metadata, 20, ONE_HOUR_SECS);
    }
}
