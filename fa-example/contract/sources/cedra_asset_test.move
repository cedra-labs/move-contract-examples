#[test_only]
module CedraFungible::CedraAssetTest {
    use std::signer;
    use CedraFungible::CedraAsset;
    use cedra_framework::fungible_asset::Metadata;
    use cedra_framework::object::{Self, Object};
    use cedra_framework::primary_fungible_store;

    // Test constants
    const MINT_AMOUNT: u64 = 1000;
    const TRANSFER_AMOUNT: u64 = 500;
    const BURN_AMOUNT: u64 = 200;

    /// Helper function to get the metadata object
    fun get_metadata(): Object<Metadata> {
        CedraAsset::get_metadata()
    }

    /// Helper function to get balance for an address
    fun get_balance(addr: address): u64 {
        let asset = get_metadata();
        if (!primary_fungible_store::primary_store_exists(addr, asset)) {
            return 0
        };
        primary_fungible_store::balance(addr, asset)
    }

    #[test(admin = @0xcafe)]
    fun test_init_module(admin: signer) {
        // Initialize the module
        CedraAsset::init_for_testing(&admin);
        
        // Verify metadata can be retrieved
        let metadata = get_metadata();
        assert!(object::object_address(&metadata) != @0x0, 1);
    }

    #[test(admin = @0xcafe, user = @0x1)]
    fun test_mint_success(admin: signer, user: signer) {
        // Initialize
        CedraAsset::init_for_testing(&admin);
        
        let user_addr = signer::address_of(&user);
        let initial_balance = get_balance(user_addr);
        
        // Mint tokens to user
        CedraAsset::mint(&admin, user_addr, MINT_AMOUNT);
        
        // Verify balance increased
        let final_balance = get_balance(user_addr);
        assert!(final_balance == initial_balance + MINT_AMOUNT, 2);
    }

    #[test(admin = @0xcafe, non_admin = @0x2)]
    #[expected_failure(abort_code = 0x50001)] // error::permission_denied(1) = 0x50000 + 1
    fun test_mint_fails_non_admin(admin: signer, non_admin: signer) {
        // Initialize with admin
        CedraAsset::init_for_testing(&admin);
        
        let user_addr = @0x3;
        
        // Try to mint as non-admin - should fail
        CedraAsset::mint(&non_admin, user_addr, MINT_AMOUNT);
    }

    #[test(admin = @0xcafe, sender = @0x1, receiver = @0x2)]
    fun test_transfer_success(admin: signer, sender: signer, receiver: signer) {
        // Initialize
        CedraAsset::init_for_testing(&admin);
        
        let sender_addr = signer::address_of(&sender);
        let receiver_addr = signer::address_of(&receiver);
        
        // First mint tokens to sender
        CedraAsset::mint(&admin, sender_addr, MINT_AMOUNT);
        
        let sender_initial = get_balance(sender_addr);
        let receiver_initial = get_balance(receiver_addr);
        
        // Transfer tokens
        CedraAsset::transfer(&sender, receiver_addr, TRANSFER_AMOUNT);
        
        // Verify balances
        let sender_final = get_balance(sender_addr);
        let receiver_final = get_balance(receiver_addr);
        
        assert!(sender_final == sender_initial - TRANSFER_AMOUNT, 3);
        assert!(receiver_final == receiver_initial + TRANSFER_AMOUNT, 4);
    }

    #[test(admin = @0xcafe, sender = @0x1, receiver = @0x2)]
    #[expected_failure]
    fun test_transfer_insufficient_balance(admin: signer, sender: signer, receiver: signer) {
        // Initialize
        CedraAsset::init_for_testing(&admin);
        
        let sender_addr = signer::address_of(&sender);
        let receiver_addr = signer::address_of(&receiver);
        
        // Don't mint any tokens - sender has 0 balance
        
        // Try to transfer more than available - should fail
        CedraAsset::transfer(&sender, receiver_addr, TRANSFER_AMOUNT);
    }

    #[test(admin = @0xcafe, user = @0x1)]
    fun test_multiple_mints(admin: signer, user: signer) {
        // Initialize
        CedraAsset::init_for_testing(&admin);
        
        let user_addr = signer::address_of(&user);
        let mint1 = 500;
        let mint2 = 300;
        let mint3 = 200;
        
        // Mint multiple times
        CedraAsset::mint(&admin, user_addr, mint1);
        CedraAsset::mint(&admin, user_addr, mint2);
        CedraAsset::mint(&admin, user_addr, mint3);
        
        // Verify total balance
        let total_balance = get_balance(user_addr);
        assert!(total_balance == mint1 + mint2 + mint3, 5);
    }

    #[test(admin = @0xcafe)]
    fun test_get_metadata(admin: signer) {
        // Initialize
        CedraAsset::init_for_testing(&admin);
        
        // Get metadata
        let metadata = get_metadata();
        let metadata_addr = object::object_address(&metadata);
        
        // Verify metadata address is not zero
        assert!(metadata_addr != @0x0, 6);
    }

    #[test(admin = @0xcafe, user1 = @0x1, user2 = @0x2)]
    fun test_complete_flow(admin: signer, user1: signer, user2: signer) {
        // Initialize
        CedraAsset::init_for_testing(&admin);
        
        let user1_addr = signer::address_of(&user1);
        let user2_addr = signer::address_of(&user2);
        
        // Step 1: Mint to user1
        CedraAsset::mint(&admin, user1_addr, MINT_AMOUNT);
        assert!(get_balance(user1_addr) == MINT_AMOUNT, 7);
        assert!(get_balance(user2_addr) == 0, 8);
        
        // Step 2: Transfer from user1 to user2
        CedraAsset::transfer(&user1, user2_addr, TRANSFER_AMOUNT);
        assert!(get_balance(user1_addr) == MINT_AMOUNT - TRANSFER_AMOUNT, 9);
        assert!(get_balance(user2_addr) == TRANSFER_AMOUNT, 10);
        
        // Step 3: Transfer back from user2 to user1
        CedraAsset::transfer(&user2, user1_addr, TRANSFER_AMOUNT);
        assert!(get_balance(user1_addr) == MINT_AMOUNT, 11);
        assert!(get_balance(user2_addr) == 0, 12);
    }

    #[test(admin = @0xcafe, user = @0x1)]
    fun test_burn_success(admin: signer, user: signer) {
        // Initialize
        CedraAsset::init_for_testing(&admin);
        
        let user_addr = signer::address_of(&user);
        
        // Mint tokens to user
        CedraAsset::mint(&admin, user_addr, MINT_AMOUNT);
        assert!(get_balance(user_addr) == MINT_AMOUNT, 13);
        
        // Burn some tokens
        CedraAsset::burn(&user, BURN_AMOUNT);
        
        // Verify balance decreased
        let final_balance = get_balance(user_addr);
        assert!(final_balance == MINT_AMOUNT - BURN_AMOUNT, 14);
    }

    #[test(admin = @0xcafe, user = @0x1)]
    #[expected_failure]
    fun test_burn_insufficient_balance(admin: signer, user: signer) {
        // Initialize
        CedraAsset::init_for_testing(&admin);
        
        // Don't mint any tokens - user has 0 balance
        
        // Try to burn more than available - should fail
        CedraAsset::burn(&user, BURN_AMOUNT);
    }

    #[test(admin = @0xcafe, user = @0x1)]
    fun test_deflationary_effect(admin: signer, user: signer) {
        // Initialize
        CedraAsset::init_for_testing(&admin);
        
        let user_addr = signer::address_of(&user);
        
        // Step 1: Mint initial supply
        CedraAsset::mint(&admin, user_addr, MINT_AMOUNT);
        let balance_after_mint = get_balance(user_addr);
        assert!(balance_after_mint == MINT_AMOUNT, 15);
        
        // Step 2: Burn some tokens (deflationary action)
        CedraAsset::burn(&user, BURN_AMOUNT);
        let balance_after_burn = get_balance(user_addr);
        assert!(balance_after_burn == MINT_AMOUNT - BURN_AMOUNT, 16);
        
        // Step 3: Burn more tokens
        let additional_burn = 100;
        CedraAsset::burn(&user, additional_burn);
        let final_balance = get_balance(user_addr);
        assert!(final_balance == MINT_AMOUNT - BURN_AMOUNT - additional_burn, 17);
        
        // Demonstrate deflationary effect: supply decreases over time
        // Initial: 1000, After burns: 700 (30% reduction)
    }

    #[test(admin = @0xcafe, user = @0x1)]
    fun test_burn_all_tokens(admin: signer, user: signer) {
        // Initialize
        CedraAsset::init_for_testing(&admin);
        
        let user_addr = signer::address_of(&user);
        
        // Mint tokens
        CedraAsset::mint(&admin, user_addr, MINT_AMOUNT);
        assert!(get_balance(user_addr) == MINT_AMOUNT, 18);
        
        // Burn all tokens
        CedraAsset::burn(&user, MINT_AMOUNT);
        
        // Verify balance is zero
        assert!(get_balance(user_addr) == 0, 19);
    }

    #[test(admin = @0xcafe, user1 = @0x1, user2 = @0x2)]
    fun test_complete_flow_with_burn(admin: signer, user1: signer, user2: signer) {
        // Initialize
        CedraAsset::init_for_testing(&admin);
        
        let user1_addr = signer::address_of(&user1);
        let user2_addr = signer::address_of(&user2);
        
        // Step 1: Mint to user1
        CedraAsset::mint(&admin, user1_addr, MINT_AMOUNT);
        
        // Step 2: Transfer to user2
        CedraAsset::transfer(&user1, user2_addr, TRANSFER_AMOUNT);
        
        // Step 3: User2 burns some tokens (deflationary)
        CedraAsset::burn(&user2, BURN_AMOUNT);
        assert!(get_balance(user2_addr) == TRANSFER_AMOUNT - BURN_AMOUNT, 20);
        
        // Step 4: User1 also burns some tokens
        CedraAsset::burn(&user1, BURN_AMOUNT);
        assert!(get_balance(user1_addr) == MINT_AMOUNT - TRANSFER_AMOUNT - BURN_AMOUNT, 21);
    }
}