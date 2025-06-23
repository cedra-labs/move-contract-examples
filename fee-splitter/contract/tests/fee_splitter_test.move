#[test_only]
module fee_splitter::fee_splitter_test {
    use aptos_framework::fungible_asset::{Self, Metadata};
    use aptos_framework::primary_fungible_store;
    use aptos_framework::object::{Self, Object};
    use std::vector;
    use fee_splitter::fee_splitter;

    // Test-only constants
    #[test_only]
    const INITIAL_BALANCE: u64 = 100;

    // Test setup function
    #[test_only]
    fun setup_for_test(
        _framework: &signer,
        asset: &signer,
        _creator: &signer,
        _alice: &signer,
        _bob: &signer,
        _charlie: &signer,
        _distributor: &signer
    ): (address, address, address, address, address, Object<Metadata>) {
        let creator_addr = @0x10C0;
        let alice_addr = @0xA11CE;
        let bob_addr = @0xB0B;
        let charlie_addr = @0xCCCC;
        let distributor_addr = @0xD15C;

        // Create test token
        let (creator_ref, metadata) = fungible_asset::create_test_token(asset);
        let (mint_ref, _transfer_ref, _burn_ref) = primary_fungible_store::init_test_metadata_with_primary_store_enabled(&creator_ref);
        
        // Convert to proper metadata type
        let fa_metadata: Object<Metadata> = object::convert(metadata);

        // Mint tokens to distributor for testing
        primary_fungible_store::mint(&mint_ref, distributor_addr, INITIAL_BALANCE);

        (creator_addr, alice_addr, bob_addr, charlie_addr, distributor_addr, fa_metadata)
    }

    #[test(framework = @0x1, asset = @0xAAAAA, creator = @0x10C0, alice = @0xA11CE, bob = @0xB0B, charlie = @0xCCCC, distributor = @0xD15C)]
    fun test_create_single_recipient_splitter(
        framework: &signer,
        asset: &signer,
        creator: &signer,
        alice: &signer,
        bob: &signer,
        charlie: &signer,
        distributor: &signer
    ) {
        let (creator_addr, alice_addr, _bob_addr, _charlie_addr, _distributor_addr, _metadata) = 
            setup_for_test(framework, asset, creator, alice, bob, charlie, distributor);

        // Create splitter with single recipient
        let addresses = vector[alice_addr];
        let shares = vector[100];
        
        fee_splitter::create_splitter(creator, addresses, shares);

        // Verify splitter exists
        assert!(fee_splitter::splitter_exists(creator_addr), 0);

        // Verify splitter info
        let (recipients, total_shares) = fee_splitter::get_splitter_info(creator_addr);
        assert!(vector::length(&recipients) == 1, 1);
        assert!(total_shares == 100, 2);

        // Verify alice is a recipient
        assert!(fee_splitter::is_recipient(creator_addr, alice_addr), 3);
    }

    #[test(framework = @0x1, asset = @0xAAAAA, creator = @0x10C0, alice = @0xA11CE, bob = @0xB0B, charlie = @0xCCCC, distributor = @0xD15C)]
    fun test_create_multiple_recipients_splitter(
        framework: &signer,
        asset: &signer,
        creator: &signer,
        alice: &signer,
        bob: &signer,
        charlie: &signer,
        distributor: &signer
    ) {
        let (creator_addr, alice_addr, bob_addr, charlie_addr, _distributor_addr, _metadata) = 
            setup_for_test(framework, asset, creator, alice, bob, charlie, distributor);

        // Create splitter with multiple recipients
        let addresses = vector[alice_addr, bob_addr, charlie_addr];
        let shares = vector[30, 50, 20]; // Total: 100
        
        fee_splitter::create_splitter(creator, addresses, shares);

        // Verify splitter exists
        assert!(fee_splitter::splitter_exists(creator_addr), 0);

        // Verify splitter info
        let (recipients, total_shares) = fee_splitter::get_splitter_info(creator_addr);
        assert!(vector::length(&recipients) == 3, 1);
        assert!(total_shares == 100, 2);

        // Verify all recipients
        assert!(fee_splitter::is_recipient(creator_addr, alice_addr), 3);
        assert!(fee_splitter::is_recipient(creator_addr, bob_addr), 4);
        assert!(fee_splitter::is_recipient(creator_addr, charlie_addr), 5);
    }

    #[test(framework = @0x1, asset = @0xAAAAA, creator = @0x10C0, alice = @0xA11CE, bob = @0xB0B, charlie = @0xCCCC, distributor = @0xD15C)]
    fun test_create_max_shares_splitter(
        framework: &signer,
        asset: &signer,
        creator: &signer,
        alice: &signer,
        bob: &signer,
        charlie: &signer,
        distributor: &signer
    ) {
        let (creator_addr, alice_addr, bob_addr, _charlie_addr, _distributor_addr, _metadata) = 
            setup_for_test(framework, asset, creator, alice, bob, charlie, distributor);

        // Create splitter with maximum total shares (10000)
        let addresses = vector[alice_addr, bob_addr];
        let shares = vector[7000, 3000]; // Total: 10000 (MAX_TOTAL_SHARES)
        
        fee_splitter::create_splitter(creator, addresses, shares);

        // Verify splitter creation succeeded
        assert!(fee_splitter::splitter_exists(creator_addr), 0);
        
        let (_recipients, total_shares) = fee_splitter::get_splitter_info(creator_addr);
        assert!(total_shares == 10000, 1);
    }

    #[test(framework = @0x1, asset = @0xAAAAA, creator = @0x10C0, alice = @0xA11CE, bob = @0xB0B, charlie = @0xCCCC, distributor = @0xD15C)]
    fun test_distribute_fees_multiple_times(
        framework: &signer,
        asset: &signer,
        creator: &signer,
        alice: &signer,
        bob: &signer,
        charlie: &signer,
        distributor: &signer
    ) {
        let (creator_addr, alice_addr, bob_addr, _charlie_addr, distributor_addr, metadata) = 
            setup_for_test(framework, asset, creator, alice, bob, charlie, distributor);

        // Create splitter
        let addresses = vector[alice_addr, bob_addr];
        let shares = vector[70, 30];
        
        fee_splitter::create_splitter(creator, addresses, shares);

        // First distribution: 30 tokens
        fee_splitter::distribute_fees(distributor, creator_addr, metadata, 30);
        assert!(primary_fungible_store::balance(alice_addr, metadata) == 21, 0); // 30 * 70/100 = 21
        assert!(primary_fungible_store::balance(bob_addr, metadata) == 9, 1); // 30 * 30/100 = 9

        // Second distribution: 20 tokens
        fee_splitter::distribute_fees(distributor, creator_addr, metadata, 20);
        assert!(primary_fungible_store::balance(alice_addr, metadata) == 21 + 14, 2); // 35 (20 * 70/100 = 14)
        assert!(primary_fungible_store::balance(bob_addr, metadata) == 9 + 6, 3); // 15 (20 * 30/100 = 6)

        // Verify distributor balance
        assert!(primary_fungible_store::balance(distributor_addr, metadata) == INITIAL_BALANCE - 50, 4);
    }

    // Error test cases
    #[test(framework = @0x1, asset = @0xAAAAA, creator = @0x10C0, alice = @0xA11CE, bob = @0xB0B, charlie = @0xCCCC, distributor = @0xD15C)]
    #[expected_failure(abort_code = 65538, location = fee_splitter::fee_splitter)]
    fun test_create_splitter_empty_addresses(
        framework: &signer,
        asset: &signer,
        creator: &signer,
        alice: &signer,
        bob: &signer,
        charlie: &signer,
        distributor: &signer
    ) {
        let (_creator_addr, _alice_addr, _bob_addr, _charlie_addr, _distributor_addr, _metadata) = 
            setup_for_test(framework, asset, creator, alice, bob, charlie, distributor);

        // Empty addresses vector should fail
        let addresses = vector::empty<address>();
        let shares = vector[100];
        
        fee_splitter::create_splitter(creator, addresses, shares);
    }

    #[test(framework = @0x1, asset = @0xAAAAA, creator = @0x10C0, alice = @0xA11CE, bob = @0xB0B, charlie = @0xCCCC, distributor = @0xD15C)]
    #[expected_failure(abort_code = 65538, location = fee_splitter::fee_splitter)]
    fun test_create_splitter_empty_shares(
        framework: &signer,
        asset: &signer,
        creator: &signer,
        alice: &signer,
        bob: &signer,
        charlie: &signer,
        distributor: &signer
    ) {
        let (_creator_addr, alice_addr, _bob_addr, _charlie_addr, _distributor_addr, _metadata) = 
            setup_for_test(framework, asset, creator, alice, bob, charlie, distributor);

        // Empty shares vector should fail
        let addresses = vector[alice_addr];
        let shares = vector::empty<u64>();
        
        fee_splitter::create_splitter(creator, addresses, shares);
    }

    #[test(framework = @0x1, asset = @0xAAAAA, creator = @0x10C0, alice = @0xA11CE, bob = @0xB0B, charlie = @0xCCCC, distributor = @0xD15C)]
    #[expected_failure(abort_code = 65537, location = fee_splitter::fee_splitter)]
    fun test_create_splitter_zero_share(
        framework: &signer,
        asset: &signer,
        creator: &signer,
        alice: &signer,
        bob: &signer,
        charlie: &signer,
        distributor: &signer
    ) {
        let (_creator_addr, alice_addr, bob_addr, _charlie_addr, _distributor_addr, _metadata) = 
            setup_for_test(framework, asset, creator, alice, bob, charlie, distributor);

        // Zero share should fail
        let addresses = vector[alice_addr, bob_addr];
        let shares = vector[50, 0]; // Zero share for second recipient
        
        fee_splitter::create_splitter(creator, addresses, shares);
    }

    #[test(framework = @0x1, asset = @0xAAAAA, creator = @0x10C0, alice = @0xA11CE, bob = @0xB0B, charlie = @0xCCCC, distributor = @0xD15C)]
    #[expected_failure(abort_code = 65542, location = fee_splitter::fee_splitter)]
    fun test_create_splitter_excessive_total_shares(
        framework: &signer,
        asset: &signer,
        creator: &signer,
        alice: &signer,
        bob: &signer,
        charlie: &signer,
        distributor: &signer
    ) {
        let (_creator_addr, alice_addr, bob_addr, _charlie_addr, _distributor_addr, _metadata) = 
            setup_for_test(framework, asset, creator, alice, bob, charlie, distributor);

        // Total shares exceeding MAX_TOTAL_SHARES (10000) should fail
        let addresses = vector[alice_addr, bob_addr];
        let shares = vector[5001, 5000]; // Total: 10001 > 10000
        
        fee_splitter::create_splitter(creator, addresses, shares);
    }

    #[test(framework = @0x1, asset = @0xAAAAA, creator = @0x10C0, alice = @0xA11CE, bob = @0xB0B, charlie = @0xCCCC, distributor = @0xD15C)]
    #[expected_failure(abort_code = 393221, location = fee_splitter::fee_splitter)]
    fun test_distribute_fees_splitter_not_found(
        framework: &signer,
        asset: &signer,
        creator: &signer,
        alice: &signer,
        bob: &signer,
        charlie: &signer,
        distributor: &signer
    ) {
        let (creator_addr, _alice_addr, _bob_addr, _charlie_addr, _distributor_addr, metadata) = 
            setup_for_test(framework, asset, creator, alice, bob, charlie, distributor);

        // Try to distribute without creating splitter - should fail
        fee_splitter::distribute_fees(distributor, creator_addr, metadata, 10);
    }

    #[test(framework = @0x1, asset = @0xAAAAA, creator = @0x10C0, alice = @0xA11CE, bob = @0xB0B, charlie = @0xCCCC, distributor = @0xD15C)]
    #[expected_failure(abort_code = 65539, location = fee_splitter::fee_splitter)]
    fun test_distribute_fees_zero_amount(
        framework: &signer,
        asset: &signer,
        creator: &signer,
        alice: &signer,
        bob: &signer,
        charlie: &signer,
        distributor: &signer
    ) {
        let (creator_addr, alice_addr, _bob_addr, _charlie_addr, _distributor_addr, metadata) = 
            setup_for_test(framework, asset, creator, alice, bob, charlie, distributor);

        // Create splitter first
        let addresses = vector[alice_addr];
        let shares = vector[100];
        fee_splitter::create_splitter(creator, addresses, shares);

        // Try to distribute zero amount - should fail
        fee_splitter::distribute_fees(distributor, creator_addr, metadata, 0);
    }

    // View function tests
    #[test(framework = @0x1, asset = @0xAAAAA, creator = @0x10C0, alice = @0xA11CE, bob = @0xB0B, charlie = @0xCCCC, distributor = @0xD15C)]
    fun test_view_functions(
        framework: &signer,
        asset: &signer,
        creator: &signer,
        alice: &signer,
        bob: &signer,
        charlie: &signer,
        distributor: &signer
    ) {
        let (creator_addr, alice_addr, bob_addr, charlie_addr, _distributor_addr, _metadata) = 
            setup_for_test(framework, asset, creator, alice, bob, charlie, distributor);

        // Test splitter_exists for non-existing splitter
        assert!(!fee_splitter::splitter_exists(creator_addr), 0);

        // Create splitter
        let addresses = vector[alice_addr, bob_addr, charlie_addr];
        let shares = vector[25, 35, 40];
        fee_splitter::create_splitter(creator, addresses, shares);

        // Test splitter_exists for existing splitter
        assert!(fee_splitter::splitter_exists(creator_addr), 1);

        // Test get_splitter_info
        let (recipients, total_shares) = fee_splitter::get_splitter_info(creator_addr);
        assert!(vector::length(&recipients) == 3, 2);
        assert!(total_shares == 100, 3);

        // Test is_recipient
        assert!(fee_splitter::is_recipient(creator_addr, alice_addr), 4);
        assert!(fee_splitter::is_recipient(creator_addr, bob_addr), 5);
        assert!(fee_splitter::is_recipient(creator_addr, charlie_addr), 6);
        assert!(!fee_splitter::is_recipient(creator_addr, @0x999), 7); // Non-recipient
    }

    #[test(framework = @0x1, asset = @0xAAAAA, creator = @0x10C0, alice = @0xA11CE, bob = @0xB0B, charlie = @0xCCCC, distributor = @0xD15C)]
    fun test_is_recipient_non_existing_splitter(
        framework: &signer,
        asset: &signer,
        creator: &signer,
        alice: &signer,
        bob: &signer,
        charlie: &signer,
        distributor: &signer
    ) {
        let (creator_addr, alice_addr, _bob_addr, _charlie_addr, _distributor_addr, _metadata) = 
            setup_for_test(framework, asset, creator, alice, bob, charlie, distributor);

        // is_recipient should return false for non-existing splitter (doesn't throw error)
        assert!(!fee_splitter::is_recipient(creator_addr, alice_addr), 0);
    }

    #[test(framework = @0x1, asset = @0xAAAAA, creator = @0x10C0, alice = @0xA11CE, bob = @0xB0B, charlie = @0xCCCC, distributor = @0xD15C)]
    #[expected_failure(abort_code = 65538, location = fee_splitter::fee_splitter)]
    fun test_create_splitter_mismatched_vectors(
        framework: &signer,
        asset: &signer,
        creator: &signer,
        alice: &signer,
        bob: &signer,
        charlie: &signer,
        distributor: &signer
    ) {
        let (_creator_addr, alice_addr, bob_addr, _charlie_addr, _distributor_addr, _metadata) = 
            setup_for_test(framework, asset, creator, alice, bob, charlie, distributor);

        // Mismatched vector lengths should fail
        let addresses = vector[alice_addr, bob_addr]; // 2 addresses
        let shares = vector[50]; // 1 share - mismatch!
        
        fee_splitter::create_splitter(creator, addresses, shares);
    }

    #[test(framework = @0x1, asset = @0xAAAAA, creator = @0x10C0, alice = @0xA11CE, bob = @0xB0B, charlie = @0xCCCC, distributor = @0xD15C)]
    #[expected_failure(abort_code = 393221, location = fee_splitter::fee_splitter)]
    fun test_get_splitter_info_not_found(
        framework: &signer,
        asset: &signer,
        creator: &signer,
        alice: &signer,
        bob: &signer,
        charlie: &signer,
        distributor: &signer
    ) {
        let (_creator_addr, _alice_addr, _bob_addr, _charlie_addr, _distributor_addr, _metadata) = 
            setup_for_test(framework, asset, creator, alice, bob, charlie, distributor);

        // Try to get info for non-existent splitter - should fail
        fee_splitter::get_splitter_info(@0x999);
    }

    #[test(framework = @0x1, asset = @0xAAAAA, creator = @0x10C0, alice = @0xA11CE, bob = @0xB0B, charlie = @0xCCCC, distributor = @0xD15C)]
    fun test_debug_loops_execution(
        framework: &signer,
        asset: &signer,
        creator: &signer,
        alice: &signer,
        bob: &signer,
        charlie: &signer,
        distributor: &signer
    ) {
        let (creator_addr, alice_addr, bob_addr, charlie_addr, distributor_addr, metadata) = 
            setup_for_test(framework, asset, creator, alice, bob, charlie, distributor);

        // Create splitter with 3 recipients to ensure loops execute
        let addresses = vector[alice_addr, bob_addr, charlie_addr];
        let shares = vector[30, 40, 30];
        
        fee_splitter::create_splitter(creator, addresses, shares);
        
        // Verify the splitter was created correctly (this should exercise the create loop)
        let (recipients, total_shares) = fee_splitter::get_splitter_info(creator_addr);
        assert!(vector::length(&recipients) == 3, 0);
        assert!(total_shares == 100, 1);
        
        // Test is_recipient to exercise that loop
        assert!(fee_splitter::is_recipient(creator_addr, alice_addr), 2);
        assert!(fee_splitter::is_recipient(creator_addr, bob_addr), 3);
        assert!(fee_splitter::is_recipient(creator_addr, charlie_addr), 4);
        assert!(!fee_splitter::is_recipient(creator_addr, @0x999), 5);
        
        // Test distribution to exercise distribution loop
        fee_splitter::distribute_fees(distributor, creator_addr, metadata, 90);
        
        // Verify distribution worked
        assert!(primary_fungible_store::balance(alice_addr, metadata) == 27, 6); // 90 * 30/100
        assert!(primary_fungible_store::balance(bob_addr, metadata) == 36, 7);   // 90 * 40/100  
        assert!(primary_fungible_store::balance(charlie_addr, metadata) == 27, 8); // 90 * 30/100
    }

    #[test(framework = @0x1, asset = @0xAAAAA, creator = @0x10C0, alice = @0xA11CE, bob = @0xB0B, charlie = @0xCCCC, distributor = @0xD15C)]
    fun test_zero_share_amount_distribution(
        framework: &signer,
        asset: &signer,
        creator: &signer,
        alice: &signer,
        bob: &signer,
        charlie: &signer,
        distributor: &signer
    ) {
        let (creator_addr, alice_addr, bob_addr, _charlie_addr, _distributor_addr, metadata) = 
            setup_for_test(framework, asset, creator, alice, bob, charlie, distributor);

        // Create splitter
        let addresses = vector[alice_addr, bob_addr];
        let shares = vector[1, 9999]; // Very uneven distribution
        
        fee_splitter::create_splitter(creator, addresses, shares);
        
        // Distribute very small amount to test share_amount = 0 path
        fee_splitter::distribute_fees(distributor, creator_addr, metadata, 1);
        
        // This should exercise the distribution loop including the if condition
    }

    #[test(framework = @0x1, asset = @0xAAAAA, creator = @0x10C0, alice = @0xA11CE, bob = @0xB0B, charlie = @0xCCCC, distributor = @0xD15C)]
    fun test_distribution_with_zero_amounts(
        framework: &signer,
        asset: &signer,
        creator: &signer,
        alice: &signer,
        bob: &signer,
        charlie: &signer,
        distributor: &signer
    ) {
        let (creator_addr, alice_addr, bob_addr, charlie_addr, _distributor_addr, metadata) = 
            setup_for_test(framework, asset, creator, alice, bob, charlie, distributor);

        // Create splitter with very uneven shares to force zero amounts
        let addresses = vector[alice_addr, bob_addr, charlie_addr];
        let shares = vector[1, 2, 9997]; // Charlie gets almost everything
        
        fee_splitter::create_splitter(creator, addresses, shares);
        
        // Distribute amount that will result in 0 for alice and bob due to rounding
        // 1 * 1 / 10000 = 0, 1 * 2 / 10000 = 0, 1 * 9997 / 10000 = 0
        fee_splitter::distribute_fees(distributor, creator_addr, metadata, 1);
        
        // Verify no transfers happened due to all amounts being 0
        assert!(primary_fungible_store::balance(alice_addr, metadata) == 0, 0);
        assert!(primary_fungible_store::balance(bob_addr, metadata) == 0, 1);
        assert!(primary_fungible_store::balance(charlie_addr, metadata) == 0, 2);
        
        // Now test with slightly larger amount that will give some recipients 0
        // 2 * 1 / 10000 = 0, 2 * 2 / 10000 = 0, 2 * 9997 / 10000 = 1
        fee_splitter::distribute_fees(distributor, creator_addr, metadata, 2);
        
        assert!(primary_fungible_store::balance(alice_addr, metadata) == 0, 3);
        assert!(primary_fungible_store::balance(bob_addr, metadata) == 0, 4);
        assert!(primary_fungible_store::balance(charlie_addr, metadata) == 1, 5);
    }

    #[test(framework = @0x1, asset = @0xAAAAA, creator = @0x10C0, alice = @0xA11CE, bob = @0xB0B, charlie = @0xCCCC, distributor = @0xD15C)]
    fun test_recipient_search_positions(
        framework: &signer,
        asset: &signer,
        creator: &signer,
        alice: &signer,
        bob: &signer,
        charlie: &signer,
        distributor: &signer
    ) {
        let (creator_addr, alice_addr, bob_addr, charlie_addr, _distributor_addr, _metadata) = 
            setup_for_test(framework, asset, creator, alice, bob, charlie, distributor);

        // Create splitter with multiple recipients
        let addresses = vector[alice_addr, bob_addr, charlie_addr];
        let shares = vector[30, 40, 30];
        
        fee_splitter::create_splitter(creator, addresses, shares);

        // Test finding recipient at first position (early return)
        assert!(fee_splitter::is_recipient(creator_addr, alice_addr), 0);
        
        // Test finding recipient at middle position
        assert!(fee_splitter::is_recipient(creator_addr, bob_addr), 1);
        
        // Test finding recipient at last position (full loop execution)
        assert!(fee_splitter::is_recipient(creator_addr, charlie_addr), 2);
        
        // Test non-existent recipient (complete loop execution, returns false)
        assert!(!fee_splitter::is_recipient(creator_addr, @0x999), 3);
        assert!(!fee_splitter::is_recipient(creator_addr, @0x888), 4);
    }

    #[test(framework = @0x1, asset = @0xAAAAA, creator = @0x10C0, alice = @0xA11CE, bob = @0xB0B, charlie = @0xCCCC, distributor = @0xD15C)]
    fun test_maximum_recipients(
        framework: &signer,
        asset: &signer,
        creator: &signer,
        alice: &signer,
        bob: &signer,
        charlie: &signer,
        distributor: &signer
    ) {
        let (creator_addr, alice_addr, bob_addr, charlie_addr, distributor_addr, metadata) = 
            setup_for_test(framework, asset, creator, alice, bob, charlie, distributor);

        // Create splitter with many recipients to stress test loops
        let addresses = vector[
            alice_addr, bob_addr, charlie_addr, distributor_addr,
            @0x1001, @0x1002, @0x1003, @0x1004, @0x1005
        ];
        let shares = vector[1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000, 2000]; // Total: 10000
        
        fee_splitter::create_splitter(creator, addresses, shares);

        // Verify all recipients were added (tests creation loop with many iterations)
        let (recipients, total_shares) = fee_splitter::get_splitter_info(creator_addr);
        assert!(vector::length(&recipients) == 9, 0);
        assert!(total_shares == 10000, 1);

        // Test is_recipient with many recipients (tests search loop thoroughly)
        assert!(fee_splitter::is_recipient(creator_addr, alice_addr), 2);
        assert!(fee_splitter::is_recipient(creator_addr, @0x1005), 3); // Last recipient
        assert!(!fee_splitter::is_recipient(creator_addr, @0x9999), 4);

        // Test distribution with many recipients (tests distribution loop)
        fee_splitter::distribute_fees(distributor, creator_addr, metadata, 90);
        
        // Verify some distributions
        assert!(primary_fungible_store::balance(alice_addr, metadata) == 9, 5); // 90 * 1000/10000 = 9
        assert!(primary_fungible_store::balance(@0x1005, metadata) == 18, 6); // 90 * 2000/10000 = 18
    }

    #[test(framework = @0x1, asset = @0xAAAAA, creator = @0x10C0, alice = @0xA11CE, bob = @0xB0B, charlie = @0xCCCC, distributor = @0xD15C)]
    fun test_rounding_edge_cases(
        framework: &signer,
        asset: &signer,
        creator: &signer,
        alice: &signer,
        bob: &signer,
        charlie: &signer,
        distributor: &signer
    ) {
        let (creator_addr, alice_addr, bob_addr, charlie_addr, _distributor_addr, metadata) = 
            setup_for_test(framework, asset, creator, alice, bob, charlie, distributor);

        // Create splitter with shares that will cause interesting rounding
        let addresses = vector[alice_addr, bob_addr, charlie_addr];
        let shares = vector[3333, 3333, 3334]; // Total: 10000
        
        fee_splitter::create_splitter(creator, addresses, shares);

        // Test with amount that causes rounding issues
        fee_splitter::distribute_fees(distributor, creator_addr, metadata, 10);
        
        // 10 * 3333 / 10000 = 3.333 -> 3 (rounded down)
        // 10 * 3334 / 10000 = 3.334 -> 3 (rounded down)
        assert!(primary_fungible_store::balance(alice_addr, metadata) == 3, 0);
        assert!(primary_fungible_store::balance(bob_addr, metadata) == 3, 1);
        assert!(primary_fungible_store::balance(charlie_addr, metadata) == 3, 2);

        // Test with prime number distribution
        fee_splitter::distribute_fees(distributor, creator_addr, metadata, 7);
        
        // Previous + new: 7 * 3333 / 10000 = 2.331 -> 2
        assert!(primary_fungible_store::balance(alice_addr, metadata) == 3 + 2, 3);
        assert!(primary_fungible_store::balance(bob_addr, metadata) == 3 + 2, 4);
        assert!(primary_fungible_store::balance(charlie_addr, metadata) == 3 + 2, 5);
    }

    #[test(framework = @0x1, asset = @0xAAAAA, creator = @0x10C0, alice = @0xA11CE, bob = @0xB0B, charlie = @0xCCCC, distributor = @0xD15C)]
    fun test_comprehensive_loop_coverage(
        framework: &signer,
        asset: &signer,
        creator: &signer,
        alice: &signer,
        bob: &signer,
        charlie: &signer,
        distributor: &signer
    ) {
        let (creator_addr, alice_addr, bob_addr, charlie_addr, _distributor_addr, metadata) = 
            setup_for_test(framework, asset, creator, alice, bob, charlie, distributor);

        // Test creation loop - create splitter with exactly 3 recipients
        let addresses = vector[alice_addr, bob_addr, charlie_addr];
        let shares = vector[1000, 2000, 3000]; // Total: 6000
        fee_splitter::create_splitter(creator, addresses, shares);

        // Verify creation worked
        assert!(fee_splitter::splitter_exists(creator_addr), 0);
        let (recipients, total_shares) = fee_splitter::get_splitter_info(creator_addr);
        assert!(vector::length(&recipients) == 3, 1);
        assert!(total_shares == 6000, 2);

        // Test is_recipient loop thoroughly
        // Test finding each recipient at different positions
        assert!(fee_splitter::is_recipient(creator_addr, alice_addr), 3);   // position 0
        assert!(fee_splitter::is_recipient(creator_addr, bob_addr), 4);     // position 1  
        assert!(fee_splitter::is_recipient(creator_addr, charlie_addr), 5); // position 2
        assert!(!fee_splitter::is_recipient(creator_addr, @0xDEAD), 6);     // not found

        // Test distribution loop with all recipients getting non-zero amounts
        fee_splitter::distribute_fees(distributor, creator_addr, metadata, 60);
        
        // Verify distributions: 60 * share / 6000
        // alice: 60 * 1000 / 6000 = 10
        // bob: 60 * 2000 / 6000 = 20  
        // charlie: 60 * 3000 / 6000 = 30
        assert!(primary_fungible_store::balance(alice_addr, metadata) == 10, 7);
        assert!(primary_fungible_store::balance(bob_addr, metadata) == 20, 8);
        assert!(primary_fungible_store::balance(charlie_addr, metadata) == 30, 9);

        // Test distribution loop with some zero amounts
        fee_splitter::distribute_fees(distributor, creator_addr, metadata, 1);
        // 1 * 1000 / 6000 = 0.166 -> 0
        // 1 * 2000 / 6000 = 0.333 -> 0
        // 1 * 3000 / 6000 = 0.5 -> 0
        // All should remain the same since all amounts round to 0
        assert!(primary_fungible_store::balance(alice_addr, metadata) == 10, 10);
        assert!(primary_fungible_store::balance(bob_addr, metadata) == 20, 11);
        assert!(primary_fungible_store::balance(charlie_addr, metadata) == 30, 12);
    }

    #[test(framework = @0x1, asset = @0xAAAAA, creator = @0x10C0, alice = @0xA11CE, bob = @0xB0B, charlie = @0xCCCC, distributor = @0xD15C)]
    fun test_simple_loop_execution(
        framework: &signer,
        asset: &signer,
        creator: &signer,
        alice: &signer,
        bob: &signer,
        charlie: &signer,
        distributor: &signer
    ) {
        let (_creator_addr, alice_addr, _bob_addr, _charlie_addr, _distributor_addr, _metadata) = 
            setup_for_test(framework, asset, creator, alice, bob, charlie, distributor);

        // Minimal test - single recipient to ensure loop executes at least once
        let addresses = vector[alice_addr];
        let shares = vector[100];
        
        // This MUST execute the creation loop exactly once
        fee_splitter::create_splitter(creator, addresses, shares);
        
        // This MUST execute the is_recipient loop 
        let creator_addr = @0x10C0;
        assert!(fee_splitter::is_recipient(creator_addr, alice_addr), 0);
        
        // This MUST execute the distribution loop exactly once
        fee_splitter::distribute_fees(distributor, creator_addr, _metadata, 10);
    }
}