module lock_deployer::lock_test {
    use aptos_framework::fungible_asset::{Self, Metadata};
    use aptos_framework::object::{Self, Object};
    use aptos_framework::primary_fungible_store;
    use aptos_framework::timestamp;
    use std::option;
    use std::signer;
    use lock_deployer::lock;

    #[test_only]
    const TWO_HOURS_SECS: u64 = 2 * 60 * 60;

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
        primary_fungible_store::mint(&mint_ref, user_address, 100);
        let fa_metadata: Object<Metadata> = object::convert(metadata);
        let lockup_obj = lock::init_lockup_for_test(creator);
        (creator_address, user_address, fa_metadata, lockup_obj)
    }

    #[test(framework = @0x1, asset = @0xAAAAA, creator = @0x10C0, user = @0xCAFE)]
    fun test_out_flow(framework: &signer, asset: &signer, creator: &signer, user: &signer) {
        let (creator_address, user_address, fa_metadata, lockup_obj) = setup_for_test(framework, asset, creator, user);

        lock::escrow_funds_with_no_lockup(user, lockup_obj, fa_metadata, 5);

        assert!(primary_fungible_store::balance(user_address, fa_metadata) == 95);

        // Check view functions
        assert!(lock::remaining_escrow_time(lockup_obj, fa_metadata, user_address) == option::some(0));
        assert!(lock::escrowed_funds(lockup_obj, fa_metadata, user_address) == option::some(5));
        assert!(lock::remaining_escrow_time(lockup_obj, fa_metadata, @0x1234567) == option::none());
        assert!(lock::escrowed_funds(lockup_obj, fa_metadata, @0x1234567) == option::none());

        // Should be able to return funds immediately
        lock::return_user_funds(creator, lockup_obj, fa_metadata, user_address);
        assert!(primary_fungible_store::balance(user_address, fa_metadata) == 100);

        // Same with the user
        lock::escrow_funds_with_no_lockup(user, lockup_obj, fa_metadata, 5);
        lock::return_my_funds(user, lockup_obj, fa_metadata);
        assert!(primary_fungible_store::balance(user_address, fa_metadata) == 100);

        // Claim an escrow
        lock::escrow_funds_with_no_lockup(user, lockup_obj, fa_metadata, 5);
        lock::claim_escrow(creator, lockup_obj, fa_metadata, user_address);
        assert!(primary_fungible_store::balance(user_address, fa_metadata) == 95);
        assert!(primary_fungible_store::balance(creator_address, fa_metadata) == 5);

        // -- Now test with time lockup --

        lock::escrow_funds_with_time(user, lockup_obj, fa_metadata, 5, TWO_HOURS_SECS);
        assert!(primary_fungible_store::balance(user_address, fa_metadata) == 90);

        // Check view functions
        assert!(lock::remaining_escrow_time(lockup_obj, fa_metadata, user_address) == option::some(TWO_HOURS_SECS));
        assert!(lock::escrowed_funds(lockup_obj, fa_metadata, user_address) == option::some(5));

        // Should be able to return funds immediately
        lock::return_user_funds(creator, lockup_obj, fa_metadata, user_address);
        assert!(primary_fungible_store::balance(user_address, fa_metadata) == 95);

        lock::escrow_funds_with_time(user, lockup_obj, fa_metadata, 5, TWO_HOURS_SECS);

        // User can't unescrow without time passing, let's go forward 2 hours
        timestamp::fast_forward_seconds(TWO_HOURS_SECS);
        lock::return_my_funds(user, lockup_obj, fa_metadata);
        assert!(primary_fungible_store::balance(user_address, fa_metadata) == 95);

        // Claim an escrow, can be immediate
        lock::escrow_funds_with_time(user, lockup_obj, fa_metadata, 5, TWO_HOURS_SECS);
        lock::claim_escrow(creator, lockup_obj, fa_metadata, user_address);
        assert!(primary_fungible_store::balance(user_address, fa_metadata) == 90);
        assert!(primary_fungible_store::balance(creator_address, fa_metadata) == 10);
    }

    #[test(framework = @0x1, asset = @0xAAAAA, creator = @0x10C0, user = @0xCAFE)]
    #[expected_failure(abort_code = 4, location = lock_deployer::lock)]
    fun test_too_short_lockup(
        framework: &signer,
        asset: &signer,
        creator: &signer,
        user: &signer
    ) {
        let (_creator_address, _user_address, fa_metadata, lockup_obj) = setup_for_test(
            framework,
            asset,
            creator,
            user
        );

        lock::escrow_funds_with_time(user, lockup_obj, fa_metadata, 5, TWO_HOURS_SECS);

        // User can't return funds without waiting for lockup
        lock::return_my_funds(user, lockup_obj, fa_metadata);
    }
}