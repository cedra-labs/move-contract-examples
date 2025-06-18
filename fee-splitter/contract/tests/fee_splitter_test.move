#[test_only]
module FeeSplitter::fee_splitter_test {
    use aptos_framework::fungible_asset::{Self, Metadata};
    use aptos_framework::primary_fungible_store;
    use aptos_framework::object::{Self, Object};
    use std::vector;
    use FeeSplitter::FeeSplitter;

    // Test-only constants
    #[test_only]
    const INITIAL_BALANCE: u64 = 100;

    // Test setup function
    #[test_only]
    fun setup_for_test(
        framework: &signer,
        asset: &signer,
        creator: &signer,
        alice: &signer,
        bob: &signer,
        charlie: &signer,
        distributor: &signer
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
        
        FeeSplitter::create_splitter(creator, addresses, shares);

        // Verify splitter exists
        assert!(FeeSplitter::splitter_exists(creator_addr), 0);

        // Verify splitter info
        let (recipients, total_shares) = FeeSplitter::get_splitter_info(creator_addr);
        assert!(vector::length(&recipients) == 1, 1);
        assert!(total_shares == 100, 2);

        // Verify alice is a recipient
        assert!(FeeSplitter::is_recipient(creator_addr, alice_addr), 3);
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
        
        FeeSplitter::create_splitter(creator, addresses, shares);

        // Verify splitter exists
        assert!(FeeSplitter::splitter_exists(creator_addr), 0);

        // Verify splitter info
        let (recipients, total_shares) = FeeSplitter::get_splitter_info(creator_addr);
        assert!(vector::length(&recipients) == 3, 1);
        assert!(total_shares == 100, 2);

        // Verify all recipients
        assert!(FeeSplitter::is_recipient(creator_addr, alice_addr), 3);
        assert!(FeeSplitter::is_recipient(creator_addr, bob_addr), 4);
        assert!(FeeSplitter::is_recipient(creator_addr, charlie_addr), 5);
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
        
        FeeSplitter::create_splitter(creator, addresses, shares);

        // Verify splitter creation succeeded
        assert!(FeeSplitter::splitter_exists(creator_addr), 0);
        
        let (_recipients, total_shares) = FeeSplitter::get_splitter_info(creator_addr);
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
        
        FeeSplitter::create_splitter(creator, addresses, shares);

        // First distribution: 30 tokens
        FeeSplitter::distribute_fees(distributor, creator_addr, metadata, 30);
        assert!(primary_fungible_store::balance(alice_addr, metadata) == 21, 0); // 30 * 70/100 = 21
        assert!(primary_fungible_store::balance(bob_addr, metadata) == 9, 1); // 30 * 30/100 = 9

        // Second distribution: 20 tokens
        FeeSplitter::distribute_fees(distributor, creator_addr, metadata, 20);
        assert!(primary_fungible_store::balance(alice_addr, metadata) == 21 + 14, 2); // 35 (20 * 70/100 = 14)
        assert!(primary_fungible_store::balance(bob_addr, metadata) == 9 + 6, 3); // 15 (20 * 30/100 = 6)

        // Verify distributor balance
        assert!(primary_fungible_store::balance(distributor_addr, metadata) == INITIAL_BALANCE - 50, 4);
    }

    // Error test cases
    #[test(framework = @0x1, asset = @0xAAAAA, creator = @0x10C0, alice = @0xA11CE, bob = @0xB0B, charlie = @0xCCCC, distributor = @0xD15C)]
    #[expected_failure(abort_code = 65538, location = FeeSplitter::FeeSplitter)]
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
        
        FeeSplitter::create_splitter(creator, addresses, shares);
    }

    #[test(framework = @0x1, asset = @0xAAAAA, creator = @0x10C0, alice = @0xA11CE, bob = @0xB0B, charlie = @0xCCCC, distributor = @0xD15C)]
    #[expected_failure(abort_code = 65538, location = FeeSplitter::FeeSplitter)]
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
        
        FeeSplitter::create_splitter(creator, addresses, shares);
    }

    #[test(framework = @0x1, asset = @0xAAAAA, creator = @0x10C0, alice = @0xA11CE, bob = @0xB0B, charlie = @0xCCCC, distributor = @0xD15C)]
    #[expected_failure(abort_code = 65537, location = FeeSplitter::FeeSplitter)]
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
        
        FeeSplitter::create_splitter(creator, addresses, shares);
    }

    #[test(framework = @0x1, asset = @0xAAAAA, creator = @0x10C0, alice = @0xA11CE, bob = @0xB0B, charlie = @0xCCCC, distributor = @0xD15C)]
    #[expected_failure(abort_code = 65542, location = FeeSplitter::FeeSplitter)]
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
        
        FeeSplitter::create_splitter(creator, addresses, shares);
    }

    #[test(framework = @0x1, asset = @0xAAAAA, creator = @0x10C0, alice = @0xA11CE, bob = @0xB0B, charlie = @0xCCCC, distributor = @0xD15C)]
    #[expected_failure(abort_code = 393221, location = FeeSplitter::FeeSplitter)]
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
        FeeSplitter::distribute_fees(distributor, creator_addr, metadata, 10);
    }

    #[test(framework = @0x1, asset = @0xAAAAA, creator = @0x10C0, alice = @0xA11CE, bob = @0xB0B, charlie = @0xCCCC, distributor = @0xD15C)]
    #[expected_failure(abort_code = 65539, location = FeeSplitter::FeeSplitter)]
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
        FeeSplitter::create_splitter(creator, addresses, shares);

        // Try to distribute zero amount - should fail
        FeeSplitter::distribute_fees(distributor, creator_addr, metadata, 0);
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
        assert!(!FeeSplitter::splitter_exists(creator_addr), 0);

        // Create splitter
        let addresses = vector[alice_addr, bob_addr, charlie_addr];
        let shares = vector[25, 35, 40];
        FeeSplitter::create_splitter(creator, addresses, shares);

        // Test splitter_exists for existing splitter
        assert!(FeeSplitter::splitter_exists(creator_addr), 1);

        // Test get_splitter_info
        let (recipients, total_shares) = FeeSplitter::get_splitter_info(creator_addr);
        assert!(vector::length(&recipients) == 3, 2);
        assert!(total_shares == 100, 3);

        // Test is_recipient
        assert!(FeeSplitter::is_recipient(creator_addr, alice_addr), 4);
        assert!(FeeSplitter::is_recipient(creator_addr, bob_addr), 5);
        assert!(FeeSplitter::is_recipient(creator_addr, charlie_addr), 6);
        assert!(!FeeSplitter::is_recipient(creator_addr, @0x999), 7); // Non-recipient
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
        assert!(!FeeSplitter::is_recipient(creator_addr, alice_addr), 0);
    }
}