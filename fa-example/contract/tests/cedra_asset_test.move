#[test_only]
module CedraFungible::cedra_asset_test {
    use cedra_framework::fungible_asset::Metadata;
    use cedra_framework::object::{Self, Object};
    use cedra_framework::primary_fungible_store;
    use std::signer;
    use CedraFungible::CedraAsset;

    const INITIAL_MINT_AMOUNT: u64 = 1000;
    const TRANSFER_AMOUNT: u64 = 100;
    const BURN_AMOUNT: u64 = 50;

    // Setup function to initialize the module and return metadata
    #[test_only]
    fun setup_for_test(
        admin: &signer,
        alice: &signer,
        bob: &signer
    ): (address, address, address, Object<Metadata>) {
        let admin_addr = signer::address_of(admin);
        let alice_addr = signer::address_of(alice);
        let bob_addr = signer::address_of(bob);

        // Initialize the module for testing
        CedraAsset::init_for_test(admin);

        // Get metadata
        let metadata = CedraAsset::get_metadata();

        (admin_addr, alice_addr, bob_addr, metadata)
    }

    #[test(admin = @CedraFungible, alice = @0xA11CE, bob = @0xB0B)]
    fun test_init_module(admin: &signer, alice: &signer, bob: &signer) {
        let (_admin_addr, _alice_addr, _bob_addr, metadata) = setup_for_test(admin, alice, bob);

        // Verify metadata was created
        let metadata_addr = object::object_address(&metadata);
        assert!(metadata_addr != @0x0, 0);
    }

    #[test(admin = @CedraFungible, alice = @0xA11CE, bob = @0xB0B)]
    fun test_get_metadata(admin: &signer, alice: &signer, bob: &signer) {
        let (_admin_addr, _alice_addr, _bob_addr, metadata) = setup_for_test(admin, alice, bob);

        // Get metadata again and verify it's the same
        let metadata2 = CedraAsset::get_metadata();
        assert!(object::object_address(&metadata) == object::object_address(&metadata2), 0);
    }

    #[test(admin = @CedraFungible, alice = @0xA11CE, bob = @0xB0B)]
    fun test_mint(admin: &signer, alice: &signer, bob: &signer) {
        let (_admin_addr, alice_addr, _bob_addr, metadata) = setup_for_test(admin, alice, bob);

        // Mint tokens to Alice
        CedraAsset::mint(admin, alice_addr, INITIAL_MINT_AMOUNT);

        // Verify Alice's balance
        let balance = primary_fungible_store::balance(alice_addr, metadata);
        assert!(balance == INITIAL_MINT_AMOUNT, 0);
    }

    #[test(admin = @CedraFungible, alice = @0xA11CE, bob = @0xB0B)]
    fun test_mint_multiple_times(admin: &signer, alice: &signer, bob: &signer) {
        let (_admin_addr, alice_addr, _bob_addr, metadata) = setup_for_test(admin, alice, bob);

        // Mint tokens multiple times
        CedraAsset::mint(admin, alice_addr, 500);
        CedraAsset::mint(admin, alice_addr, 300);
        CedraAsset::mint(admin, alice_addr, 200);

        // Verify total balance
        let balance = primary_fungible_store::balance(alice_addr, metadata);
        assert!(balance == 1000, 0);
    }

    #[test(admin = @CedraFungible, alice = @0xA11CE, bob = @0xB0B)]
    fun test_transfer(admin: &signer, alice: &signer, bob: &signer) {
        let (_admin_addr, alice_addr, bob_addr, metadata) = setup_for_test(admin, alice, bob);

        // Mint tokens to Alice
        CedraAsset::mint(admin, alice_addr, INITIAL_MINT_AMOUNT);

        // Transfer from Alice to Bob
        CedraAsset::transfer(alice, bob_addr, TRANSFER_AMOUNT);

        // Verify balances
        let alice_balance = primary_fungible_store::balance(alice_addr, metadata);
        let bob_balance = primary_fungible_store::balance(bob_addr, metadata);
        assert!(alice_balance == INITIAL_MINT_AMOUNT - TRANSFER_AMOUNT, 0);
        assert!(bob_balance == TRANSFER_AMOUNT, 1);
    }

    #[test(admin = @CedraFungible, alice = @0xA11CE, bob = @0xB0B)]
    fun test_burn(admin: &signer, alice: &signer, bob: &signer) {
        let (_admin_addr, alice_addr, _bob_addr, metadata) = setup_for_test(admin, alice, bob);

        // Mint tokens to Alice
        CedraAsset::mint(admin, alice_addr, INITIAL_MINT_AMOUNT);

        // Alice burns her tokens
        CedraAsset::burn(alice, BURN_AMOUNT);

        // Verify balance decreased
        let balance = primary_fungible_store::balance(alice_addr, metadata);
        assert!(balance == INITIAL_MINT_AMOUNT - BURN_AMOUNT, 0);
    }

    #[test(admin = @CedraFungible, alice = @0xA11CE, bob = @0xB0B)]
    fun test_burn_all_tokens(admin: &signer, alice: &signer, bob: &signer) {
        let (_admin_addr, alice_addr, _bob_addr, metadata) = setup_for_test(admin, alice, bob);

        // Mint tokens to Alice
        CedraAsset::mint(admin, alice_addr, INITIAL_MINT_AMOUNT);

        // Burn all tokens
        CedraAsset::burn(alice, INITIAL_MINT_AMOUNT);

        // Verify balance is zero
        let balance = primary_fungible_store::balance(alice_addr, metadata);
        assert!(balance == 0, 0);
    }

    #[test(admin = @CedraFungible, alice = @0xA11CE, bob = @0xB0B)]
    fun test_mint_transfer_burn_flow(admin: &signer, alice: &signer, bob: &signer) {
        let (_admin_addr, alice_addr, bob_addr, metadata) = setup_for_test(admin, alice, bob);

        // Mint tokens to Alice
        CedraAsset::mint(admin, alice_addr, INITIAL_MINT_AMOUNT);
        assert!(primary_fungible_store::balance(alice_addr, metadata) == INITIAL_MINT_AMOUNT, 0);

        // Transfer some to Bob
        CedraAsset::transfer(alice, bob_addr, TRANSFER_AMOUNT);
        assert!(primary_fungible_store::balance(alice_addr, metadata) == INITIAL_MINT_AMOUNT - TRANSFER_AMOUNT, 1);
        assert!(primary_fungible_store::balance(bob_addr, metadata) == TRANSFER_AMOUNT, 2);

        // Alice burns some tokens
        CedraAsset::burn(alice, BURN_AMOUNT);
        assert!(primary_fungible_store::balance(alice_addr, metadata) == INITIAL_MINT_AMOUNT - TRANSFER_AMOUNT - BURN_AMOUNT, 3);

        // Bob burns his tokens
        CedraAsset::burn(bob, TRANSFER_AMOUNT);
        assert!(primary_fungible_store::balance(bob_addr, metadata) == 0, 4);
    }

    #[test(admin = @CedraFungible, alice = @0xA11CE, bob = @0xB0B)]
    #[expected_failure(abort_code = 327681, location = CedraFungible::CedraAsset)]
    fun test_mint_not_admin(admin: &signer, alice: &signer, bob: &signer) {
        let (_admin_addr, _alice_addr, bob_addr, _metadata) = setup_for_test(admin, alice, bob);

        // Alice tries to mint (should fail - not admin)
        CedraAsset::mint(alice, bob_addr, INITIAL_MINT_AMOUNT);
    }

    #[test(admin = @CedraFungible, alice = @0xA11CE, bob = @0xB0B)]
    #[expected_failure]
    fun test_transfer_insufficient_balance(admin: &signer, alice: &signer, bob: &signer) {
        let (_admin_addr, alice_addr, bob_addr, _metadata) = setup_for_test(admin, alice, bob);

        // Mint small amount
        CedraAsset::mint(admin, alice_addr, 50);

        // Try to transfer more than balance (should fail)
        CedraAsset::transfer(alice, bob_addr, 100);
    }

    #[test(admin = @CedraFungible, alice = @0xA11CE, bob = @0xB0B)]
    #[expected_failure]
    fun test_burn_insufficient_balance(admin: &signer, alice: &signer, bob: &signer) {
        let (_admin_addr, alice_addr, _bob_addr, _metadata) = setup_for_test(admin, alice, bob);

        // Mint small amount
        CedraAsset::mint(admin, alice_addr, 50);

        // Try to burn more than balance (should fail)
        CedraAsset::burn(alice, 100);
    }

    #[test(admin = @CedraFungible, alice = @0xA11CE, bob = @0xB0B)]
    fun test_zero_amounts(admin: &signer, alice: &signer, bob: &signer) {
        let (_admin_addr, alice_addr, bob_addr, metadata) = setup_for_test(admin, alice, bob);

        // Mint tokens
        CedraAsset::mint(admin, alice_addr, INITIAL_MINT_AMOUNT);

        // Transfer zero amount (should work but no change)
        let balance_before = primary_fungible_store::balance(alice_addr, metadata);
        CedraAsset::transfer(alice, bob_addr, 0);
        let balance_after = primary_fungible_store::balance(alice_addr, metadata);
        assert!(balance_before == balance_after, 0);

        // Burn zero amount (should work but no change)
        CedraAsset::burn(alice, 0);
        let balance_after_burn = primary_fungible_store::balance(alice_addr, metadata);
        assert!(balance_after_burn == balance_before, 1);
    }

    #[test(admin = @CedraFungible, alice = @0xA11CE, bob = @0xB0B)]
    fun test_multiple_users(admin: &signer, alice: &signer, bob: &signer) {
        let (_admin_addr, alice_addr, bob_addr, metadata) = setup_for_test(admin, alice, bob);

        // Mint to multiple users
        CedraAsset::mint(admin, alice_addr, 500);
        CedraAsset::mint(admin, bob_addr, 300);

        // Verify balances
        assert!(primary_fungible_store::balance(alice_addr, metadata) == 500, 0);
        assert!(primary_fungible_store::balance(bob_addr, metadata) == 300, 1);

        // Transfer between users
        CedraAsset::transfer(alice, bob_addr, 100);
        assert!(primary_fungible_store::balance(alice_addr, metadata) == 400, 2);
        assert!(primary_fungible_store::balance(bob_addr, metadata) == 400, 3);

        // Both burn some tokens
        CedraAsset::burn(alice, 50);
        CedraAsset::burn(bob, 50);
        assert!(primary_fungible_store::balance(alice_addr, metadata) == 350, 4);
        assert!(primary_fungible_store::balance(bob_addr, metadata) == 350, 5);
    }

    #[test(admin = @CedraFungible, alice = @0xA11CE, bob = @0xB0B)]
    fun test_self_transfer(admin: &signer, alice: &signer, bob: &signer) {
        let (_admin_addr, alice_addr, _bob_addr, metadata) = setup_for_test(admin, alice, bob);
        CedraAsset::mint(admin, alice_addr, 1000);

        // Transfer to self
        CedraAsset::transfer(alice, alice_addr, 100);

        // Balance should remain unchanged
        assert!(primary_fungible_store::balance(alice_addr, metadata) == 1000, 0);
    }

    #[test(admin = @CedraFungible, alice = @0xA11CE, bob = @0xB0B)]
    #[expected_failure]
    fun test_burn_zero_balance(admin: &signer, alice: &signer, bob: &signer) {
        let (_admin_addr, _alice_addr, _bob_addr, _metadata) = setup_for_test(admin, alice, bob);
        // Alice has no tokens, try to burn
        CedraAsset::burn(alice, 1);
    }

    #[test(admin = @CedraFungible, alice = @0xA11CE, bob = @0xB0B)]
    fun test_large_mint(admin: &signer, alice: &signer, bob: &signer) {
        let (_admin_addr, alice_addr, _bob_addr, metadata) = setup_for_test(admin, alice, bob);
        let large_amount: u64 = 18446744073709551615; // u64 max

        CedraAsset::mint(admin, alice_addr, large_amount);

        assert!(primary_fungible_store::balance(alice_addr, metadata) == large_amount, 0);
    }

    #[test(admin = @CedraFungible, alice = @0xA11CE, bob = @0xB0B)]
    #[expected_failure]
    fun test_transfer_zero_balance(admin: &signer, alice: &signer, bob: &signer) {
        let (_admin_addr, _alice_addr, bob_addr, _metadata) = setup_for_test(admin, alice, bob);
        // Alice has no tokens, try to transfer
        CedraAsset::transfer(alice, bob_addr, 1);
    }
}

