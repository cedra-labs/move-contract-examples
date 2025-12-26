#[test_only]
module module_addr::dutch_auction_test {
    use std::signer;
    use std::string;
    use cedra_framework::account;
    use cedra_framework::timestamp;
    use cedra_framework::object::{Self, Object};
    use cedra_framework::fungible_asset::{Self, Metadata};
    use cedra_framework::primary_fungible_store;
    use cedra_token_objects::collection;
    use cedra_token_objects::token::{Self, Token};
    use module_addr::dutch_auction;

    // Test constants
    const START_PRICE: u64 = 1000000; // 0.01 token with 8 decimals
    const END_PRICE: u64 = 100000;    // 0.1 token
    const DURATION: u64 = 3600;        // 1 hour in seconds

    // Helper function to create test accounts
    fun setup_test(admin: &signer, seller: &signer, buyer: &signer, framework: &signer) {
        timestamp::set_time_has_started_for_testing(framework);
        account::create_account_for_test(signer::address_of(admin));
        account::create_account_for_test(signer::address_of(seller));
        account::create_account_for_test(signer::address_of(buyer));
        dutch_auction::init_for_test(admin);
    }

    // Helper function to create a test NFT collection and mint an NFT
    fun create_test_nft(creator: &signer, to: address): Object<Token> {
        let collection_name = string::utf8(b"Test Collection");
        let description = string::utf8(b"Test NFT Collection");
        let uri = string::utf8(b"https://test.com/collection");
        
        collection::create_unlimited_collection(
            creator,
            description,
            collection_name,
            std::option::none(),
            uri,
        );

        let token_name = string::utf8(b"Test NFT #1");
        let token_description = string::utf8(b"A test NFT");
        let token_uri = string::utf8(b"https://test.com/nft/1");

        let constructor_ref = token::create_named_token(
            creator,
            collection_name,
            token_description,
            token_name,
            std::option::none(),
            token_uri,
        );

        let transfer_ref = object::generate_transfer_ref(&constructor_ref);
        let linear_transfer_ref = object::generate_linear_transfer_ref(&transfer_ref);
        let token_addr = object::address_from_constructor_ref(&constructor_ref);
        object::transfer_with_ref(linear_transfer_ref, to);
        
        object::address_to_object<Token>(token_addr)
    }

    // Helper function to create a test fungible asset
    fun create_test_token(admin: &signer): Object<Metadata> {
        let constructor_ref = &object::create_named_object(admin, b"TEST");
        primary_fungible_store::create_primary_store_enabled_fungible_asset(
            constructor_ref,
            std::option::none(),
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
        let fa = fungible_asset::mint(&mint_ref, 10000000); // 10 tokens
        primary_fungible_store::deposit(signer::address_of(admin), fa);

        metadata
    }

    #[test(admin = @module_addr, seller = @0x100, buyer = @0x200, framework = @0x1)]
    fun test_create_auction(admin: &signer, seller: &signer, buyer: &signer, framework: &signer) {
        setup_test(admin, seller, buyer, framework);
        
        let nft = create_test_nft(seller, signer::address_of(seller));
        let payment_token = create_test_token(admin);

        dutch_auction::create_auction(
            seller,
            nft,
            START_PRICE,
            END_PRICE,
            DURATION,
            payment_token,
        );

        assert!(dutch_auction::auction_exists(1), 0);
        let (auction_seller, _, start_price, end_price, _, duration, is_sold) = 
            dutch_auction::get_auction_info(1);
        
        assert!(auction_seller == signer::address_of(seller), 1);
        assert!(start_price == START_PRICE, 2);
        assert!(end_price == END_PRICE, 3);
        assert!(duration == DURATION, 4);
        assert!(!is_sold, 5);
    }

    #[test(admin = @module_addr, seller = @0x100, buyer = @0x200, framework = @0x1)]
    fun test_price_at_start(admin: &signer, seller: &signer, buyer: &signer, framework: &signer) {
        setup_test(admin, seller, buyer, framework);
        
        let nft = create_test_nft(seller, signer::address_of(seller));
        let payment_token = create_test_token(admin);

        dutch_auction::create_auction(seller, nft, START_PRICE, END_PRICE, DURATION, payment_token);

        let current_price = dutch_auction::get_current_price(1);
        assert!(current_price == START_PRICE, 0);
    }

    #[test(admin = @module_addr, seller = @0x100, buyer = @0x200, framework = @0x1)]
    fun test_price_at_midpoint(admin: &signer, seller: &signer, buyer: &signer, framework: &signer) {
        setup_test(admin, seller, buyer, framework);
        
        let nft = create_test_nft(seller, signer::address_of(seller));
        let payment_token = create_test_token(admin);

        dutch_auction::create_auction(seller, nft, START_PRICE, END_PRICE, DURATION, payment_token);

        // Fast forward to half duration
        timestamp::fast_forward_seconds(DURATION / 2);

        let current_price = dutch_auction::get_current_price(1);
        let expected_price = (START_PRICE + END_PRICE) / 2; // Midpoint price
        
        // Allow small rounding error
        assert!(current_price >= expected_price - 1 && current_price <= expected_price + 1, 0);
    }

    #[test(admin = @module_addr, seller = @0x100, buyer = @0x200, framework = @0x1)]
    fun test_price_at_end(admin: &signer, seller: &signer, buyer: &signer, framework: &signer) {
        setup_test(admin, seller, buyer, framework);
        
        let nft = create_test_nft(seller, signer::address_of(seller));
        let payment_token = create_test_token(admin);

        dutch_auction::create_auction(seller, nft, START_PRICE, END_PRICE, DURATION, payment_token);

        // Fast forward past duration
        timestamp::fast_forward_seconds(DURATION);

        let current_price = dutch_auction::get_current_price(1);
        assert!(current_price == END_PRICE, 0);
    }

    #[test(admin = @module_addr, seller = @0x100, buyer = @0x200, framework = @0x1)]
    fun test_price_after_expiry(admin: &signer, seller: &signer, buyer: &signer, framework: &signer) {
        setup_test(admin, seller, buyer, framework);
        
        let nft = create_test_nft(seller, signer::address_of(seller));
        let payment_token = create_test_token(admin);

        dutch_auction::create_auction(seller, nft, START_PRICE, END_PRICE, DURATION, payment_token);

        // Fast forward well past duration
        timestamp::fast_forward_seconds(DURATION * 2);

        let current_price = dutch_auction::get_current_price(1);
        assert!(current_price == END_PRICE, 0); // Should stay at end price
    }

    #[test(admin = @module_addr, seller = @0x100, buyer = @0x200, framework = @0x1)]
    fun test_successful_purchase(admin: &signer, seller: &signer, buyer: &signer, framework: &signer) {
        setup_test(admin, seller, buyer, framework);
        
        let seller_addr = signer::address_of(seller);
        let buyer_addr = signer::address_of(buyer);
        
        let nft = create_test_nft(seller, seller_addr);
        let payment_token = create_test_token(admin);
        
        // Transfer tokens to buyer for payment
        primary_fungible_store::transfer(admin, payment_token, buyer_addr, START_PRICE);

        dutch_auction::create_auction(seller, nft, START_PRICE, END_PRICE, DURATION, payment_token);

        let seller_balance_before = primary_fungible_store::balance(seller_addr, payment_token);

        // Buy immediately at start price
        dutch_auction::buy_now(buyer, 1);

        let seller_balance_after = primary_fungible_store::balance(seller_addr, payment_token);
        assert!(seller_balance_after == seller_balance_before + START_PRICE, 0);

        // Check auction is marked as sold
        let (_, _, _, _, _, _, is_sold) = dutch_auction::get_auction_info(1);
        assert!(is_sold, 1);

        // Verify NFT ownership transferred to buyer
        assert!(object::is_owner(nft, buyer_addr), 2);
    }

    #[test(admin = @module_addr, seller = @0x100, buyer = @0x200, framework = @0x1)]
    fun test_purchase_at_lower_price(admin: &signer, seller: &signer, buyer: &signer, framework: &signer) {
        setup_test(admin, seller, buyer, framework);
        
        let seller_addr = signer::address_of(seller);
        let buyer_addr = signer::address_of(buyer);
        
        let nft = create_test_nft(seller, seller_addr);
        let payment_token = create_test_token(admin);
        
        // Transfer tokens to buyer
        primary_fungible_store::transfer(admin, payment_token, buyer_addr, START_PRICE);

        dutch_auction::create_auction(seller, nft, START_PRICE, END_PRICE, DURATION, payment_token);

        // Wait for price to drop
        timestamp::fast_forward_seconds(DURATION / 2);

        let current_price = dutch_auction::get_current_price(1);
        let seller_balance_before = primary_fungible_store::balance(seller_addr, payment_token);

        dutch_auction::buy_now(buyer, 1);

        let seller_balance_after = primary_fungible_store::balance(seller_addr, payment_token);
        assert!(seller_balance_after == seller_balance_before + current_price, 0);
    }

    #[test(admin = @module_addr, seller = @0x100, buyer = @0x200, framework = @0x1)]
    fun test_cancel_auction(admin: &signer, seller: &signer, buyer: &signer, framework: &signer) {
        setup_test(admin, seller, buyer, framework);
        
        let seller_addr = signer::address_of(seller);
        let nft = create_test_nft(seller, seller_addr);
        let payment_token = create_test_token(admin);

        dutch_auction::create_auction(seller, nft, START_PRICE, END_PRICE, DURATION, payment_token);

        // Seller cancels auction
        dutch_auction::cancel_auction(seller, 1);

        // NFT should be returned to seller
        assert!(object::is_owner(nft, seller_addr), 0);

        // Auction should be marked as sold (to prevent further operations)
        let (_, _, _, _, _, _, is_sold) = dutch_auction::get_auction_info(1);
        assert!(is_sold, 1);
    }

    #[test(admin = @module_addr, seller = @0x100, buyer = @0x200, framework = @0x1)]
    #[expected_failure(abort_code = 327684, location = module_addr::dutch_auction)]
    fun test_cancel_by_non_seller_fails(admin: &signer, seller: &signer, buyer: &signer, framework: &signer) {
        setup_test(admin, seller, buyer, framework);
        
        let nft = create_test_nft(seller, signer::address_of(seller));
        let payment_token = create_test_token(admin);

        dutch_auction::create_auction(seller, nft, START_PRICE, END_PRICE, DURATION, payment_token);

        // Buyer tries to cancel (should fail)
        dutch_auction::cancel_auction(buyer, 1);
    }

    #[test(admin = @module_addr, seller = @0x100, buyer = @0x200, framework = @0x1)]
    #[expected_failure(abort_code = 0x30003, location = module_addr::dutch_auction)]
    fun test_buy_already_sold_fails(admin: &signer, seller: &signer, buyer: &signer, framework: &signer) {
        setup_test(admin, seller, buyer, framework);
        
        let seller_addr = signer::address_of(seller);
        let buyer_addr = signer::address_of(buyer);
        
        let nft = create_test_nft(seller, seller_addr);
        let payment_token = create_test_token(admin);
        
        // Give buyer enough tokens for multiple purchases
        primary_fungible_store::transfer(admin, payment_token, buyer_addr, START_PRICE * 2);

        dutch_auction::create_auction(seller, nft, START_PRICE, END_PRICE, DURATION, payment_token);

        // First purchase succeeds
        dutch_auction::buy_now(buyer, 1);

        // Second purchase should fail
        dutch_auction::buy_now(buyer, 1);
    }

    #[test(admin = @module_addr, seller = @0x100, buyer = @0x200, framework = @0x1)]
    #[expected_failure(abort_code = 0x30003, location = module_addr::dutch_auction)]
    fun test_cancel_sold_auction_fails(admin: &signer, seller: &signer, buyer: &signer, framework: &signer) {
        setup_test(admin, seller, buyer, framework);
        
        let seller_addr = signer::address_of(seller);
        let buyer_addr = signer::address_of(buyer);
        
        let nft = create_test_nft(seller, seller_addr);
        let payment_token = create_test_token(admin);
        
        primary_fungible_store::transfer(admin, payment_token, buyer_addr, START_PRICE);

        dutch_auction::create_auction(seller, nft, START_PRICE, END_PRICE, DURATION, payment_token);

        dutch_auction::buy_now(buyer, 1);

        // Try to cancel after selling (should fail)
        dutch_auction::cancel_auction(seller, 1);
    }

    #[test(admin = @module_addr, seller = @0x100, buyer = @0x200, framework = @0x1)]
    #[expected_failure(abort_code = 0x10005, location = module_addr::dutch_auction)]
    fun test_invalid_price_fails(admin: &signer, seller: &signer, buyer: &signer, framework: &signer) {
        setup_test(admin, seller, buyer, framework);
        
        let nft = create_test_nft(seller, signer::address_of(seller));
        let payment_token = create_test_token(admin);

        // Create auction with end_price >= start_price (invalid)
        dutch_auction::create_auction(seller, nft, END_PRICE, START_PRICE, DURATION, payment_token);
    }

    #[test(admin = @module_addr, seller = @0x100, buyer = @0x200, framework = @0x1)]
    #[expected_failure(abort_code = 0x10007, location = module_addr::dutch_auction)]
    fun test_zero_duration_fails(admin: &signer, seller: &signer, buyer: &signer, framework: &signer) {
        setup_test(admin, seller, buyer, framework);
        
        let nft = create_test_nft(seller, signer::address_of(seller));
        let payment_token = create_test_token(admin);

        // Create auction with zero duration (invalid)
        dutch_auction::create_auction(seller, nft, START_PRICE, END_PRICE, 0, payment_token);
    }

    #[test(admin = @module_addr, seller = @0x100, buyer = @0x200, framework = @0x1)]
    #[expected_failure(abort_code = 0x60002, location = module_addr::dutch_auction)]
    fun test_nonexistent_auction_fails(admin: &signer, seller: &signer, buyer: &signer, framework: &signer) {
        setup_test(admin, seller, buyer, framework);
        
        // Try to get price of non-existent auction
        dutch_auction::get_current_price(999);
    }
}

