#[test_only]
module coat_escrow::escrow_tests {
    use cedra_framework::fungible_asset::{Self, Metadata, MintRef};
    use cedra_framework::primary_fungible_store;
    use cedra_framework::object::{Self, Object};
    use cedra_framework::timestamp;
    use cedra_framework::account;
    use std::signer;
    use std::string;
    use std::option;
    use std::vector;
    use coat_escrow::escrow::{
        Self,
        create_escrow,
        deposit,
        release,
        refund,
        raise_dispute,
        resolve_dispute,
        cancel_escrow,
        get_escrow_info,
        escrow_exists,
        get_status,
        is_funded,
        is_expired,
        get_escrow_ids,
        get_buyer_balance,
    };

    // ==================== Test Constants ====================
    
    const TEST_AMOUNT: u64 = 1000;
    const FUTURE_DEADLINE: u64 = 2000000;
    const PAST_DEADLINE: u64 = 500000;
    const CURRENT_TIME: u64 = 1000000;

    // ==================== Helper Functions ====================

    #[test_only]
    /// Create a test fungible asset and return both metadata and mint ref
    fun create_test_asset(creator: &signer): (Object<Metadata>, MintRef) {
        let constructor_ref = &object::create_named_object(creator, b"TEST_TOKEN");
        
        primary_fungible_store::create_primary_store_enabled_fungible_asset(
            constructor_ref,
            option::none(),
            string::utf8(b"Test Token"),
            string::utf8(b"TEST"),
            8,
            string::utf8(b"http://test.com/icon"),
            string::utf8(b"http://test.com"),
        );

        let asset = object::object_from_constructor_ref<Metadata>(constructor_ref);
        let mint_ref = fungible_asset::generate_mint_ref(constructor_ref);
        
        (asset, mint_ref)
    }

    #[test_only]
    /// Mint tokens to an account
    fun mint_tokens(mint_ref: &MintRef, to: address, amount: u64) {
        let fa = fungible_asset::mint(mint_ref, amount);
        primary_fungible_store::deposit(to, fa);
    }

    #[test_only]
    /// Setup test environment with accounts and timestamp
    fun setup_test(
        buyer: &signer,
        seller: &signer,
        framework: &signer,
    ): (address, address) {
        let buyer_addr = signer::address_of(buyer);
        let seller_addr = signer::address_of(seller);
        
        account::create_account_for_test(buyer_addr);
        account::create_account_for_test(seller_addr);
        
        timestamp::set_time_has_started_for_testing(framework);
        timestamp::update_global_time_for_test(CURRENT_TIME);
        
        (buyer_addr, seller_addr)
    }

    // ==================== Creation Tests ====================

    #[test(buyer = @0x100, seller = @0x200, arbiter = @0x300, framework = @0x1)]
    /// Test successful escrow creation with arbiter
    public fun test_create_escrow_with_arbiter(
        buyer: &signer,
        seller: &signer,
        arbiter: &signer,
        framework: &signer,
    ) {
        let (buyer_addr, seller_addr) = setup_test(buyer, seller, framework);
        let arbiter_addr = signer::address_of(arbiter);
        account::create_account_for_test(arbiter_addr);
        
        let (asset, _mint_ref) = create_test_asset(buyer);
        
        create_escrow(
            buyer,
            seller_addr,
            vector[arbiter_addr],
            TEST_AMOUNT,
            FUTURE_DEADLINE,
            asset,
        );
        
        // Verify escrow created
        assert!(escrow_exists(buyer_addr), 0);
        assert!(vector::length(&get_escrow_ids(buyer_addr)) == 1, 1);
        
        let (id, b, s, arb_vec, amt, dl, status, funded) = get_escrow_info(buyer_addr);
        assert!(id == 0, 2);
        assert!(b == buyer_addr, 3);
        assert!(s == seller_addr, 4);
        assert!(vector::length(&arb_vec) == 1, 5);
        assert!(*vector::borrow(&arb_vec, 0) == arbiter_addr, 6);
        assert!(amt == TEST_AMOUNT, 7);
        assert!(dl == FUTURE_DEADLINE, 8);
        assert!(status == 0, 9); // STATUS_INITIALIZED
        assert!(!funded, 10);
    }

    #[test(buyer = @0x100, seller = @0x200, framework = @0x1)]
    /// Test successful escrow creation without arbiter
    public fun test_create_escrow_without_arbiter(
        buyer: &signer,
        seller: &signer,
        framework: &signer,
    ) {
        let (buyer_addr, seller_addr) = setup_test(buyer, seller, framework);
        let (asset, _mint_ref) = create_test_asset(buyer);
        
        create_escrow(
            buyer,
            seller_addr,
            vector::empty<address>(),
            TEST_AMOUNT,
            FUTURE_DEADLINE,
            asset,
        );
        
        let (_, _, _, arb_vec, _, _, _, _) = get_escrow_info(buyer_addr);
        assert!(vector::is_empty(&arb_vec), 0);
    }

    #[test(buyer = @0x100, seller = @0x200, framework = @0x1)]
    /// Test creating multiple escrows
    public fun test_create_multiple_escrows(
        buyer: &signer,
        seller: &signer,
        framework: &signer,
    ) {
        let (buyer_addr, seller_addr) = setup_test(buyer, seller, framework);
        let (asset, _mint_ref) = create_test_asset(buyer);
        
        // Create first escrow
        create_escrow(buyer, seller_addr, vector::empty<address>(), TEST_AMOUNT, FUTURE_DEADLINE, asset);
        
        // Create second escrow
        create_escrow(buyer, seller_addr, vector::empty<address>(), TEST_AMOUNT * 2, FUTURE_DEADLINE + 1000, asset);
        
        let ids = get_escrow_ids(buyer_addr);
        assert!(vector::length(&ids) == 2, 0);
        assert!(*vector::borrow(&ids, 0) == 0, 1);
        assert!(*vector::borrow(&ids, 1) == 1, 2);
    }

    #[test(buyer = @0x100, seller = @0x200, framework = @0x1)]
    #[expected_failure(abort_code = 0x10004, location = coat_escrow::escrow)]
    /// Test creating escrow with zero amount
    public fun test_create_escrow_zero_amount(
        buyer: &signer,
        seller: &signer,
        framework: &signer,
    ) {
        let (_, seller_addr) = setup_test(buyer, seller, framework);
        let (asset, _mint_ref) = create_test_asset(buyer);
        
        create_escrow(
            buyer,
            seller_addr,
            vector::empty<address>(),
            0, // Zero amount - should fail
            FUTURE_DEADLINE,
            asset,
        );
    }

    #[test(buyer = @0x100, framework = @0x1)]
    #[expected_failure(abort_code = 0x10009, location = coat_escrow::escrow)]
    /// Test creating escrow where buyer == seller
    public fun test_create_escrow_same_buyer_seller(
        buyer: &signer,
        framework: &signer,
    ) {
        let buyer_addr = signer::address_of(buyer);
        account::create_account_for_test(buyer_addr);
        timestamp::set_time_has_started_for_testing(framework);
        timestamp::update_global_time_for_test(CURRENT_TIME);
        
        let (asset, _mint_ref) = create_test_asset(buyer);
        
        create_escrow(
            buyer,
            buyer_addr, // Same as buyer - should fail
            vector::empty<address>(),
            TEST_AMOUNT,
            FUTURE_DEADLINE,
            asset,
        );
    }

    #[test(buyer = @0x100, seller = @0x200, framework = @0x1)]
    #[expected_failure(abort_code = 0x10009, location = coat_escrow::escrow)]
    /// Test creating escrow where arbiter == buyer
    public fun test_create_escrow_arbiter_equals_buyer(
        buyer: &signer,
        seller: &signer,
        framework: &signer,
    ) {
        let (buyer_addr, seller_addr) = setup_test(buyer, seller, framework);
        let (asset, _mint_ref) = create_test_asset(buyer);
        
        create_escrow(
            buyer,
            seller_addr,
            vector[buyer_addr], // Arbiter same as buyer - should fail
            TEST_AMOUNT,
            FUTURE_DEADLINE,
            asset,
        );
    }

    // ==================== Deposit Tests ====================

    #[test(buyer = @0x100, seller = @0x200, framework = @0x1)]
    /// Test successful deposit
    public fun test_deposit_success(
        buyer: &signer,
        seller: &signer,
        framework: &signer,
    ) {
        let (buyer_addr, seller_addr) = setup_test(buyer, seller, framework);
        
        let (asset, mint_ref) = create_test_asset(buyer);
        mint_tokens(&mint_ref, buyer_addr, TEST_AMOUNT);
        
        create_escrow(buyer, seller_addr, vector::empty<address>(), TEST_AMOUNT, FUTURE_DEADLINE, asset);
        
        deposit(buyer, 0);
        
        assert!(is_funded(buyer_addr), 0);
        assert!(get_status(buyer_addr) == 1, 1); // STATUS_FUNDED
    }

    #[test(buyer = @0x100, seller = @0x200, framework = @0x1)]
    #[expected_failure(abort_code = 0x1000A, location = coat_escrow::escrow)]
    /// Test deposit with insufficient balance
    public fun test_deposit_insufficient_balance(
        buyer: &signer,
        seller: &signer,
        framework: &signer,
    ) {
        let (buyer_addr, seller_addr) = setup_test(buyer, seller, framework);
        
        let (asset, mint_ref) = create_test_asset(buyer);
        // Don't mint enough tokens
        mint_tokens(&mint_ref, buyer_addr, TEST_AMOUNT / 2);
        
        create_escrow(buyer, seller_addr, vector::empty<address>(), TEST_AMOUNT, FUTURE_DEADLINE, asset);
        
        deposit(buyer, 0); // Should fail - insufficient balance
    }

    #[test(buyer = @0x100, seller = @0x200, unauthorized = @0x999, framework = @0x1)]
    #[expected_failure(abort_code = 0x60001, location = coat_escrow::escrow)]
    /// Test unauthorized deposit
    public fun test_deposit_unauthorized(
        buyer: &signer,
        seller: &signer,
        unauthorized: &signer,
        framework: &signer,
    ) {
        let (buyer_addr, seller_addr) = setup_test(buyer, seller, framework);
        let unauth_addr = signer::address_of(unauthorized);
        account::create_account_for_test(unauth_addr);
        
        let (asset, _mint_ref) = create_test_asset(buyer);
        
        create_escrow(buyer, seller_addr, vector::empty<address>(), TEST_AMOUNT, FUTURE_DEADLINE, asset);
        
        deposit(unauthorized, 0); // Should fail - not buyer
    }

    // ==================== Release Tests ====================

    #[test(buyer = @0x100, seller = @0x200, framework = @0x1)]
    /// Test successful release to seller
    public fun test_release_success(
        buyer: &signer,
        seller: &signer,
        framework: &signer,
    ) {
        let (buyer_addr, seller_addr) = setup_test(buyer, seller, framework);
        
        let (asset, mint_ref) = create_test_asset(buyer);
        mint_tokens(&mint_ref, buyer_addr, TEST_AMOUNT);
        
        create_escrow(buyer, seller_addr, vector::empty<address>(), TEST_AMOUNT, FUTURE_DEADLINE, asset);
        deposit(buyer, 0);
        
        let seller_balance_before = primary_fungible_store::balance(seller_addr, asset);
        
        release(buyer, 0);
        
        let seller_balance_after = primary_fungible_store::balance(seller_addr, asset);
        assert!(seller_balance_after == seller_balance_before + TEST_AMOUNT, 0);
        assert!(!is_funded(buyer_addr), 1);
        assert!(get_status(buyer_addr) == 2, 2); // STATUS_RELEASED
    }

    #[test(buyer = @0x100, seller = @0x200, unauthorized = @0x999, framework = @0x1)]
    #[expected_failure(abort_code = 0x60001, location = coat_escrow::escrow)]
    /// Test unauthorized release
    public fun test_release_unauthorized(
        buyer: &signer,
        seller: &signer,
        unauthorized: &signer,
        framework: &signer,
    ) {
        let (buyer_addr, seller_addr) = setup_test(buyer, seller, framework);
        let unauth_addr = signer::address_of(unauthorized);
        account::create_account_for_test(unauth_addr);
        
        let (asset, mint_ref) = create_test_asset(buyer);
        mint_tokens(&mint_ref, buyer_addr, TEST_AMOUNT);
        
        create_escrow(buyer, seller_addr, vector::empty<address>(), TEST_AMOUNT, FUTURE_DEADLINE, asset);
        deposit(buyer, 0);
        
        release(unauthorized, 0); // Should fail - not buyer
    }

    // ==================== Refund Tests ====================


    #[test(buyer = @0x100, seller = @0x200, framework = @0x1)]
   /// Test refund after deadline
    public fun test_refund_after_deadline(
        buyer: &signer,
        seller: &signer,
        framework: &signer,
    ) {
        let (buyer_addr, seller_addr) = setup_test(buyer, seller, framework);
        
        let (asset, mint_ref) = create_test_asset(buyer);
        mint_tokens(&mint_ref, buyer_addr, TEST_AMOUNT);
        
        create_escrow(buyer, seller_addr, vector::empty<address>(), TEST_AMOUNT, timestamp::now_seconds(), asset);
        deposit(buyer, 0);
        //timestamp::update_global_time_for_test(FUTURE_DEADLINE + 1000);
        refund(buyer, 0); // Should fail - deadline not reached
    }

    // ==================== Dispute Tests ====================

    #[test(buyer = @0x100, seller = @0x200, arbiter = @0x300, framework = @0x1)]
    /// Test raising dispute by buyer
    public fun test_raise_dispute_by_buyer(
        buyer: &signer,
        seller: &signer,
        arbiter: &signer,
        framework: &signer,
    ) {
        let (buyer_addr, seller_addr) = setup_test(buyer, seller, framework);
        let arbiter_addr = signer::address_of(arbiter);
        account::create_account_for_test(arbiter_addr);
        
        let (asset, mint_ref) = create_test_asset(buyer);
        mint_tokens(&mint_ref, buyer_addr, TEST_AMOUNT);
        
        create_escrow(buyer, seller_addr, vector[arbiter_addr], TEST_AMOUNT, FUTURE_DEADLINE, asset);
        deposit(buyer, 0);
        
        raise_dispute(buyer, buyer_addr, 0);
        
        assert!(get_status(buyer_addr) == 4, 0); // STATUS_DISPUTED
    }

    #[test(buyer = @0x100, seller = @0x200, arbiter = @0x300, framework = @0x1)]
    /// Test raising dispute by seller
    public fun test_raise_dispute_by_seller(
        buyer: &signer,
        seller: &signer,
        arbiter: &signer,
        framework: &signer,
    ) {
        let (buyer_addr, seller_addr) = setup_test(buyer, seller, framework);
        let arbiter_addr = signer::address_of(arbiter);
        account::create_account_for_test(arbiter_addr);
        
        let (asset, mint_ref) = create_test_asset(buyer);
        mint_tokens(&mint_ref, buyer_addr, TEST_AMOUNT);
        
        create_escrow(buyer, seller_addr, vector[arbiter_addr], TEST_AMOUNT, FUTURE_DEADLINE, asset);
        deposit(buyer, 0);
        
        raise_dispute(seller, buyer_addr, 0);
        
        assert!(get_status(buyer_addr) == 4, 0); // STATUS_DISPUTED
    }


    #[test(buyer = @0x100, seller = @0x200, arbiter = @0x300, framework = @0x1)]
    /// Test resolve dispute in favor of seller
    public fun test_resolve_dispute_to_seller(
        buyer: &signer,
        seller: &signer,
        arbiter: &signer,
        framework: &signer,
    ) {
        let (buyer_addr, seller_addr) = setup_test(buyer, seller, framework);
        let arbiter_addr = signer::address_of(arbiter);
        account::create_account_for_test(arbiter_addr);
        
        let (asset, mint_ref) = create_test_asset(buyer);
        mint_tokens(&mint_ref, buyer_addr, TEST_AMOUNT);
        
        create_escrow(buyer, seller_addr, vector[arbiter_addr], TEST_AMOUNT, FUTURE_DEADLINE, asset);
        deposit(buyer, 0);
        raise_dispute(buyer, buyer_addr, 0);
        
        let seller_balance_before = primary_fungible_store::balance(seller_addr, asset);
        
        resolve_dispute(arbiter, buyer, 0, true);
        
        let seller_balance_after = primary_fungible_store::balance(seller_addr, asset);
        assert!(seller_balance_after == seller_balance_before + TEST_AMOUNT, 0);
        assert!(get_status(buyer_addr) == 2, 1); // STATUS_RELEASED
    }

    #[test(buyer = @0x100, seller = @0x200, arbiter = @0x300, framework = @0x1)]
    /// Test resolve dispute in favor of buyer
    public fun test_resolve_dispute_to_buyer(
        buyer: &signer,
        seller: &signer,
        arbiter: &signer,
        framework: &signer,
    ) {
        let (buyer_addr, seller_addr) = setup_test(buyer, seller, framework);
        let arbiter_addr = signer::address_of(arbiter);
        account::create_account_for_test(arbiter_addr);
        
        let (asset, mint_ref) = create_test_asset(buyer);
        mint_tokens(&mint_ref, buyer_addr, TEST_AMOUNT);
        
        create_escrow(buyer, seller_addr, vector[arbiter_addr], TEST_AMOUNT, FUTURE_DEADLINE, asset);
        deposit(buyer, 0);
        raise_dispute(buyer, buyer_addr, 0);
        
        resolve_dispute(arbiter, buyer, 0, false);
        
        assert!(get_status(buyer_addr) == 3, 0); // STATUS_REFUNDED
        assert!(!is_funded(buyer_addr), 1);
    }

    // ==================== Cancel Tests ====================

    #[test(buyer = @0x100, seller = @0x200, framework = @0x1)]
    /// Test cancel unfunded escrow
    public fun test_cancel_escrow_success(
        buyer: &signer,
        seller: &signer,
        framework: &signer,
    ) {
        let (buyer_addr, seller_addr) = setup_test(buyer, seller, framework);
        let (asset, _mint_ref) = create_test_asset(buyer);
        
        create_escrow(buyer, seller_addr, vector::empty<address>(), TEST_AMOUNT, FUTURE_DEADLINE, asset);
        
        assert!(escrow_exists(buyer_addr), 0);
        
        cancel_escrow(buyer, 0);
        
        assert!(!escrow_exists(buyer_addr), 1);
        assert!(vector::is_empty(&get_escrow_ids(buyer_addr)), 2);
    }

    // ==================== View Function Tests ====================

    #[test(buyer = @0x100, seller = @0x200, framework = @0x1)]
    /// Test get_buyer_balance view function
    public fun test_get_buyer_balance(
        buyer: &signer,
        seller: &signer,
        framework: &signer,
    ) {
        let (buyer_addr, seller_addr) = setup_test(buyer, seller, framework);
        
        let (asset, mint_ref) = create_test_asset(buyer);
        let initial_balance = TEST_AMOUNT * 5;
        mint_tokens(&mint_ref, buyer_addr, initial_balance);
        
        create_escrow(buyer, seller_addr, vector::empty<address>(), TEST_AMOUNT, FUTURE_DEADLINE, asset);
        
        let balance = get_buyer_balance(buyer_addr);
        assert!(balance == initial_balance, 0);
    }

    #[test(buyer = @0x100, seller = @0x200, framework = @0x1)]
    /// Test escrow_exists for non-existent escrow
    public fun test_escrow_not_exists(
        buyer: &signer,
        seller: &signer,
        framework: &signer,
    ) {
        let (buyer_addr, _) = setup_test(buyer, seller, framework);
        assert!(!escrow_exists(buyer_addr), 0);
    }

    #[test(buyer = @0x100, framework = @0x1)]
    /// Test get_escrow_ids for account with no escrows
    public fun test_get_escrow_ids_empty(
        buyer: &signer,
        framework: &signer,
    ) {
        let buyer_addr = signer::address_of(buyer);
        account::create_account_for_test(buyer_addr);
        timestamp::set_time_has_started_for_testing(framework);
        
        let ids = get_escrow_ids(buyer_addr);
        assert!(vector::is_empty(&ids), 0);
    }

    // ==================== Edge Case Tests ====================

    #[test(buyer = @0x100, seller = @0x200, framework = @0x1)]
    #[expected_failure(abort_code = 0x60001, location = coat_escrow::escrow)]
    /// Test accessing non-existent escrow
    public fun test_get_info_non_existent(
        buyer: &signer,
        seller: &signer,
        framework: &signer,
    ) {
        let (buyer_addr, _) = setup_test(buyer, seller, framework);
        let (_, _, _, _, _, _, _, _) = get_escrow_info(buyer_addr); // Should fail
    }

    #[test(buyer = @0x100, seller = @0x200, framework = @0x1)]
    /// Test complete escrow lifecycle: create -> deposit -> release
    public fun test_complete_lifecycle_release(
        buyer: &signer,
        seller: &signer,
        framework: &signer,
    ) {
        let (buyer_addr, seller_addr) = setup_test(buyer, seller, framework);
        
        let (asset, mint_ref) = create_test_asset(buyer);
        mint_tokens(&mint_ref, buyer_addr, TEST_AMOUNT);
        
        // Step 1: Create
        create_escrow(buyer, seller_addr, vector::empty<address>(), TEST_AMOUNT, FUTURE_DEADLINE, asset);
        assert!(get_status(buyer_addr) == 0, 0); // INITIALIZED
        
        // Step 2: Deposit
        deposit(buyer, 0);
        assert!(get_status(buyer_addr) == 1, 1); // FUNDED
        assert!(is_funded(buyer_addr), 2);
        
        // Step 3: Release
        release(buyer, 0);
        assert!(get_status(buyer_addr) == 2, 3); // RELEASED
        assert!(!is_funded(buyer_addr), 4);
        
        // Verify seller received funds
        let seller_balance = primary_fungible_store::balance(seller_addr, asset);
        assert!(seller_balance == TEST_AMOUNT, 5);
    }

    #[test(buyer = @0x100, seller = @0x200, arbiter = @0x300, framework = @0x1)]
    /// Test complete escrow lifecycle with dispute resolution
    public fun test_complete_lifecycle_with_dispute(
        buyer: &signer,
        seller: &signer,
        arbiter: &signer,
        framework: &signer,
    ) {
        let (buyer_addr, seller_addr) = setup_test(buyer, seller, framework);
        let arbiter_addr = signer::address_of(arbiter);
        account::create_account_for_test(arbiter_addr);
        
        let (asset, mint_ref) = create_test_asset(buyer);
        mint_tokens(&mint_ref, buyer_addr, TEST_AMOUNT);
        
        // Step 1: Create with arbiter
        create_escrow(buyer, seller_addr, vector[arbiter_addr], TEST_AMOUNT, FUTURE_DEADLINE, asset);
        
        // Step 2: Deposit
        deposit(buyer, 0);
        assert!(get_status(buyer_addr) == 1, 0); // FUNDED
        
        // Step 3: Raise dispute
        raise_dispute(seller, buyer_addr, 0);
        assert!(get_status(buyer_addr) == 4, 1); // DISPUTED
        
        // Step 4: Arbiter resolves in favor of seller
        let seller_balance_before = primary_fungible_store::balance(seller_addr, asset);
        resolve_dispute(arbiter, buyer, 0, true);
        
        assert!(get_status(buyer_addr) == 2, 2); // RELEASED
        let seller_balance_after = primary_fungible_store::balance(seller_addr, asset);
        assert!(seller_balance_after == seller_balance_before + TEST_AMOUNT, 3);
    }

    #[test(buyer = @0x100, seller = @0x200, framework = @0x1)]
    /// Test creating multiple escrows and managing them independently
    public fun test_multiple_escrows_independent(
        buyer: &signer,
        seller: &signer,
        framework: &signer,
    ) {
        let (buyer_addr, seller_addr) = setup_test(buyer, seller, framework);
        let (asset, _mint_ref) = create_test_asset(buyer);
        
        // Create three escrows
        create_escrow(buyer, seller_addr, vector::empty<address>(), TEST_AMOUNT, FUTURE_DEADLINE, asset);
        create_escrow(buyer, seller_addr, vector::empty<address>(), TEST_AMOUNT * 2, FUTURE_DEADLINE + 1000, asset);
        create_escrow(buyer, seller_addr, vector::empty<address>(), TEST_AMOUNT * 3, FUTURE_DEADLINE + 2000, asset);
        
        let ids = get_escrow_ids(buyer_addr);
        assert!(vector::length(&ids) == 3, 0);
        
        // Cancel middle escrow
        cancel_escrow(buyer, 1);
        
        let ids_after = get_escrow_ids(buyer_addr);
        assert!(vector::length(&ids_after) == 2, 1);
        assert!(*vector::borrow(&ids_after, 0) == 0, 2);
        assert!(*vector::borrow(&ids_after, 1) == 2, 3);
    }
}