#[test_only]
module module_addr::english_auction_test {
    use std::signer;
    use std::string;
    use std::option;
    use cedra_framework::account;
    use cedra_framework::timestamp;
    use cedra_framework::object::{Self, Object};
    use cedra_framework::fungible_asset::{Self, Metadata};
    use cedra_framework::primary_fungible_store;
    use cedra_token_objects::collection;
    use cedra_token_objects::token::{Self, Token};
    use module_addr::english_auction;

    // Test constants
    const STARTING_PRICE: u64 = 100000000; // 1 token with 8 decimals
    const DURATION: u64 = 3600;          // 1 hour in seconds
    const TIME_EXTENSION: u64 = 300;     // 5 minutes in seconds

    // Helper function to create test accounts
    fun setup_test(admin: &signer, seller: &signer, buyer1: &signer, buyer2: &signer, framework: &signer) {
        timestamp::set_time_has_started_for_testing(framework);
        account::create_account_for_test(signer::address_of(admin));
        account::create_account_for_test(signer::address_of(seller));
        account::create_account_for_test(signer::address_of(buyer1));
        account::create_account_for_test(signer::address_of(buyer2));
        english_auction::init_for_test(admin);
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
            option::none(),
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
            option::none(),
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
            option::none(),
            string::utf8(b"Test Token"),
            string::utf8(b"TEST"),
            6,
            string::utf8(b"https://test.com/token.json"),
            string::utf8(b"https://test.com"),
        );

        let mint_ref = fungible_asset::generate_mint_ref(constructor_ref);
        let metadata_addr = object::address_from_constructor_ref(constructor_ref);
        let metadata = object::address_to_object<Metadata>(metadata_addr);
        
        // Mint a large amount of tokens for testing
        let fa = fungible_asset::mint(&mint_ref, 100000000000); // 100,000 tokens
        primary_fungible_store::deposit(signer::address_of(admin), fa);

        metadata
    }

    #[test(admin = @module_addr, seller = @0x100, buyer1 = @0x200, buyer2 = @0x300, framework = @0x1)]
    fun test_create_auction(admin: &signer, seller: &signer, buyer1: &signer, buyer2: &signer, framework: &signer) {
        setup_test(admin, seller, buyer1, buyer2, framework);
        
        let nft = create_test_nft(seller, signer::address_of(seller));
        let payment_token = create_test_token(admin);

        english_auction::create_auction(
            seller,
            nft,
            STARTING_PRICE,
            DURATION,
            payment_token,
        );

        assert!(english_auction::auction_exists(1), 0);
        let (auction_seller, _, starting_price, current_bid, _, start_time, end_time, duration, is_finalized) = 
            english_auction::get_auction_info(1);
        
        assert!(auction_seller == signer::address_of(seller), 1);
        assert!(starting_price == STARTING_PRICE, 2);
        assert!(current_bid == 0, 3);
        assert!(duration == DURATION, 4);
        assert!(!is_finalized, 5);
        assert!(end_time == start_time + DURATION, 6);
    }

    #[test(admin = @module_addr, seller = @0x100, buyer1 = @0x200, buyer2 = @0x300, framework = @0x1)]
    fun test_normal_auction_flow(admin: &signer, seller: &signer, buyer1: &signer, buyer2: &signer, framework: &signer) {
        setup_test(admin, seller, buyer1, buyer2, framework);
        
        let seller_addr = signer::address_of(seller);
        let buyer1_addr = signer::address_of(buyer1);
        
        let nft = create_test_nft(seller, seller_addr);
        let payment_token = create_test_token(admin);
        
        // Give buyer enough tokens
        primary_fungible_store::transfer(admin, payment_token, buyer1_addr, STARTING_PRICE * 5);

        english_auction::create_auction(seller, nft, STARTING_PRICE, DURATION, payment_token);

        // Place initial bid
        english_auction::place_bid(buyer1, 1, STARTING_PRICE);
        
        assert!(english_auction::get_current_bid(1) == STARTING_PRICE, 0);
        
        // Fast forward past end time
        timestamp::fast_forward_seconds(DURATION + 100);
        
        // Finalize auction
        english_auction::finalize_auction(1);
        
        // Check auction is finalized
        let (_, _, _, _, _, _, _, _, is_finalized) = english_auction::get_auction_info(1);
        assert!(is_finalized, 1);
        
        // Verify NFT ownership transferred to buyer
        assert!(object::is_owner(nft, buyer1_addr), 2);
        
        // Verify seller received payment
        let seller_balance = primary_fungible_store::balance(seller_addr, payment_token);
        assert!(seller_balance == STARTING_PRICE, 3);
    }

    #[test(admin = @module_addr, seller = @0x100, buyer1 = @0x200, buyer2 = @0x300, framework = @0x1)]
    fun test_multiple_bidders(admin: &signer, seller: &signer, buyer1: &signer, buyer2: &signer, framework: &signer) {
        setup_test(admin, seller, buyer1, buyer2, framework);
        
        let seller_addr = signer::address_of(seller);
        let buyer1_addr = signer::address_of(buyer1);
        let buyer2_addr = signer::address_of(buyer2);
        
        let nft = create_test_nft(seller, seller_addr);
        let payment_token = create_test_token(admin);
        
        // Give both buyers tokens
        primary_fungible_store::transfer(admin, payment_token, buyer1_addr, STARTING_PRICE * 10);
        primary_fungible_store::transfer(admin, payment_token, buyer2_addr, STARTING_PRICE * 10);

        english_auction::create_auction(seller, nft, STARTING_PRICE, DURATION, payment_token);

        // Buyer1 places initial bid
        english_auction::place_bid(buyer1, 1, STARTING_PRICE);
        assert!(english_auction::get_current_bid(1) == STARTING_PRICE, 0);
        
        // Buyer2 outbids buyer1
        let buyer2_bid = STARTING_PRICE + 500000;
        english_auction::place_bid(buyer2, 1, buyer2_bid);
        assert!(english_auction::get_current_bid(1) == buyer2_bid, 1);
        
        // Check buyer1 was automatically refunded
        let buyer1_balance = primary_fungible_store::balance(buyer1_addr, payment_token);
        assert!(buyer1_balance == STARTING_PRICE * 10, 2); // Full refund
        
        // Fast forward and finalize
        timestamp::fast_forward_seconds(DURATION + 100);
        english_auction::finalize_auction(1);
        
        // Verify buyer2 won
        assert!(object::is_owner(nft, buyer2_addr), 3);
        
        // Verify seller received payment from buyer2
        let seller_balance = primary_fungible_store::balance(seller_addr, payment_token);
        assert!(seller_balance == buyer2_bid, 4);
    }

    #[test(admin = @module_addr, seller = @0x100, buyer1 = @0x200, buyer2 = @0x300, framework = @0x1)]
    fun test_time_extension(admin: &signer, seller: &signer, buyer1: &signer, buyer2: &signer, framework: &signer) {
        setup_test(admin, seller, buyer1, buyer2, framework);
        
        let buyer1_addr = signer::address_of(buyer1);
        let buyer2_addr = signer::address_of(buyer2);
        
        let nft = create_test_nft(seller, signer::address_of(seller));
        let payment_token = create_test_token(admin);
        
        primary_fungible_store::transfer(admin, payment_token, buyer1_addr, STARTING_PRICE * 10);
        primary_fungible_store::transfer(admin, payment_token, buyer2_addr, STARTING_PRICE * 10);

        english_auction::create_auction(seller, nft, STARTING_PRICE, DURATION, payment_token);

        // Get the original end time
        let (_, _, _, _, _, _, original_end_time, _, _) = english_auction::get_auction_info(1);
        
        // Place initial bid early (not in extension window) - should NOT extend
        english_auction::place_bid(buyer1, 1, STARTING_PRICE);
        let (_, _, _, _, _, _, end_time_after_first_bid, _, _) = english_auction::get_auction_info(1);
        assert!(end_time_after_first_bid == original_end_time, 1); // Should not have extended
        
        // Fast forward to within the extension window (leaving 240 seconds = 4 minutes)
        // Time remaining is now 240 seconds, which is < 300 (TIME_EXTENSION)
        timestamp::fast_forward_seconds(DURATION - 240);
        let now_before_second_bid = timestamp::now_seconds();
        
        // Verify we're in the extension window
        let (_, _, _, _, _, _, end_time_before_extension, _, _) = english_auction::get_auction_info(1);
        let time_remaining = end_time_before_extension - now_before_second_bid;
        assert!(time_remaining == 240, 2); // Should have exactly 240 seconds left
        assert!(time_remaining < TIME_EXTENSION, 3); // Should be less than 300 seconds (extension threshold)
        
        // Place a bid in the last 5 minutes - this SHOULD trigger time extension
        english_auction::place_bid(buyer2, 1, STARTING_PRICE + 100000);
        
        // Get the end time after the extension-triggering bid
        let (_, _, _, _, _, _, new_end_time, _, _) = english_auction::get_auction_info(1);
        let now_after_second_bid = timestamp::now_seconds();
        
        // The new end time should be extended beyond the original end time
        assert!(new_end_time > original_end_time, 4);
        
        // The new end time should be approximately now + TIME_EXTENSION (300 seconds)
        // new_end_time should be now_after_second_bid + TIME_EXTENSION
        let expected_new_end_time = now_after_second_bid + TIME_EXTENSION;
        assert!(new_end_time == expected_new_end_time, 5);
        
        // The extension should be approximately 60 seconds from original end time
        // (original_end_time - 240 seconds remaining + 300 extension = original + 60)
        let extension_amount = new_end_time - original_end_time;
        assert!(extension_amount >= 50 && extension_amount <= 70, 6);
        
        // Verify that auction cannot be finalized yet
        let now_check = timestamp::now_seconds();
        assert!(now_check < new_end_time, 7); // Auction should still be active
    }

    #[test(admin = @module_addr, seller = @0x100, buyer1 = @0x200, buyer2 = @0x300, framework = @0x1)]
    #[expected_failure(abort_code = 0x30009, location = module_addr::english_auction)]
    fun test_failed_finalization_no_bids(admin: &signer, seller: &signer, buyer1: &signer, buyer2: &signer, framework: &signer) {
        setup_test(admin, seller, buyer1, buyer2, framework);
        
        let nft = create_test_nft(seller, signer::address_of(seller));
        let payment_token = create_test_token(admin);

        english_auction::create_auction(seller, nft, STARTING_PRICE, DURATION, payment_token);

        // Fast forward past end time without any bids
        timestamp::fast_forward_seconds(DURATION + 100);
        
        // Try to finalize - should fail because there are no bids
        english_auction::finalize_auction(1);
    }

    #[test(admin = @module_addr, seller = @0x100, buyer1 = @0x200, buyer2 = @0x300, framework = @0x1)]
    fun test_seller_cancellation_no_bids(admin: &signer, seller: &signer, buyer1: &signer, buyer2: &signer, framework: &signer) {
        setup_test(admin, seller, buyer1, buyer2, framework);
        
        let seller_addr = signer::address_of(seller);
        let nft = create_test_nft(seller, seller_addr);
        let payment_token = create_test_token(admin);

        english_auction::create_auction(seller, nft, STARTING_PRICE, DURATION, payment_token);

        // Seller cancels auction (no bids)
        english_auction::cancel_auction(seller, 1);

        // NFT should be returned to seller
        assert!(object::is_owner(nft, seller_addr), 0);

        // Auction should be marked as finalized
        let (_, _, _, _, _, _, _, _, is_finalized) = english_auction::get_auction_info(1);
        assert!(is_finalized, 1);
    }

    #[test(admin = @module_addr, seller = @0x100, buyer1 = @0x200, buyer2 = @0x300, framework = @0x1)]
    #[expected_failure(abort_code = 0x30009, location = module_addr::english_auction)]
    fun test_seller_cancellation_with_bids_fails(admin: &signer, seller: &signer, buyer1: &signer, buyer2: &signer, framework: &signer) {
        setup_test(admin, seller, buyer1, buyer2, framework);
        
        let buyer1_addr = signer::address_of(buyer1);
        let nft = create_test_nft(seller, signer::address_of(seller));
        let payment_token = create_test_token(admin);
        
        primary_fungible_store::transfer(admin, payment_token, buyer1_addr, STARTING_PRICE * 5);

        english_auction::create_auction(seller, nft, STARTING_PRICE, DURATION, payment_token);

        // Place a bid
        english_auction::place_bid(buyer1, 1, STARTING_PRICE);
        
        // Try to cancel - should fail because there are bids
        english_auction::cancel_auction(seller, 1);
    }

    #[test(admin = @module_addr, seller = @0x100, buyer1 = @0x200, buyer2 = @0x300, framework = @0x1)]
    #[expected_failure(abort_code = 0x010006, location = module_addr::english_auction)]
    fun test_bid_too_low_fails(admin: &signer, seller: &signer, buyer1: &signer, buyer2: &signer, framework: &signer) {
        setup_test(admin, seller, buyer1, buyer2, framework);
        
        let buyer1_addr = signer::address_of(buyer1);
        let nft = create_test_nft(seller, signer::address_of(seller));
        let payment_token = create_test_token(admin);
        
        primary_fungible_store::transfer(admin, payment_token, buyer1_addr, STARTING_PRICE * 5);

        english_auction::create_auction(seller, nft, STARTING_PRICE, DURATION, payment_token);

        // Try to bid below starting price - should fail
        english_auction::place_bid(buyer1, 1, STARTING_PRICE - 1);
    }

    #[test(admin = @module_addr, seller = @0x100, buyer1 = @0x200, buyer2 = @0x300, framework = @0x1)]
    #[expected_failure(abort_code = 0x010006, location = module_addr::english_auction)]
    fun test_bid_below_current_highest_fails(admin: &signer, seller: &signer, buyer1: &signer, buyer2: &signer, framework: &signer) {
        setup_test(admin, seller, buyer1, buyer2, framework);
        
        let buyer1_addr = signer::address_of(buyer1);
        let buyer2_addr = signer::address_of(buyer2);
        let nft = create_test_nft(seller, signer::address_of(seller));
        let payment_token = create_test_token(admin);
        
        primary_fungible_store::transfer(admin, payment_token, buyer1_addr, STARTING_PRICE * 10);
        primary_fungible_store::transfer(admin, payment_token, buyer2_addr, STARTING_PRICE * 10);

        english_auction::create_auction(seller, nft, STARTING_PRICE, DURATION, payment_token);

        // Buyer1 places bid
        english_auction::place_bid(buyer1, 1, STARTING_PRICE + 500000);
        
        // Buyer2 tries to bid less than current highest - should fail
        english_auction::place_bid(buyer2, 1, STARTING_PRICE + 400000);
    }

    #[test(admin = @module_addr, seller = @0x100, buyer1 = @0x200, buyer2 = @0x300, framework = @0x1)]
    #[expected_failure(abort_code = 0x30008, location = module_addr::english_auction)]
    fun test_bid_after_auction_ended_fails(admin: &signer, seller: &signer, buyer1: &signer, buyer2: &signer, framework: &signer) {
        setup_test(admin, seller, buyer1, buyer2, framework);
        
        let buyer1_addr = signer::address_of(buyer1);
        let nft = create_test_nft(seller, signer::address_of(seller));
        let payment_token = create_test_token(admin);
        
        primary_fungible_store::transfer(admin, payment_token, buyer1_addr, STARTING_PRICE * 5);

        english_auction::create_auction(seller, nft, STARTING_PRICE, DURATION, payment_token);

        // Fast forward past end time
        timestamp::fast_forward_seconds(DURATION + 100);
        
        // Try to place bid after auction ended - should fail
        english_auction::place_bid(buyer1, 1, STARTING_PRICE);
    }

    #[test(admin = @module_addr, seller = @0x100, buyer1 = @0x200, buyer2 = @0x300, framework = @0x1)]
    #[expected_failure(abort_code = 0x30003, location = module_addr::english_auction)]
    fun test_finalize_already_finalized_fails(admin: &signer, seller: &signer, buyer1: &signer, buyer2: &signer, framework: &signer) {
        setup_test(admin, seller, buyer1, buyer2, framework);
        
        let buyer1_addr = signer::address_of(buyer1);
        let nft = create_test_nft(seller, signer::address_of(seller));
        let payment_token = create_test_token(admin);
        
        primary_fungible_store::transfer(admin, payment_token, buyer1_addr, STARTING_PRICE * 5);

        english_auction::create_auction(seller, nft, STARTING_PRICE, DURATION, payment_token);

        english_auction::place_bid(buyer1, 1, STARTING_PRICE);
        
        timestamp::fast_forward_seconds(DURATION + 100);
        english_auction::finalize_auction(1);
        
        // Try to finalize again - should fail
        english_auction::finalize_auction(1);
    }

    #[test(admin = @module_addr, seller = @0x100, buyer1 = @0x200, buyer2 = @0x300, framework = @0x1)]
    #[expected_failure(abort_code = 0x30008, location = module_addr::english_auction)]
    fun test_finalize_before_auction_ended_fails(admin: &signer, seller: &signer, buyer1: &signer, buyer2: &signer, framework: &signer) {
        setup_test(admin, seller, buyer1, buyer2, framework);
        
        let buyer1_addr = signer::address_of(buyer1);
        let nft = create_test_nft(seller, signer::address_of(seller));
        let payment_token = create_test_token(admin);
        
        primary_fungible_store::transfer(admin, payment_token, buyer1_addr, STARTING_PRICE * 5);

        english_auction::create_auction(seller, nft, STARTING_PRICE, DURATION, payment_token);

        english_auction::place_bid(buyer1, 1, STARTING_PRICE);
        
        // Try to finalize before auction ended - should fail
        english_auction::finalize_auction(1);
    }

    #[test(admin = @module_addr, seller = @0x100, buyer1 = @0x200, buyer2 = @0x300, framework = @0x1)]
    #[expected_failure(abort_code = 0x50004, location = module_addr::english_auction)]
    fun test_cancel_by_non_seller_fails(admin: &signer, seller: &signer, buyer1: &signer, buyer2: &signer, framework: &signer) {
        setup_test(admin, seller, buyer1, buyer2, framework);
        
        let nft = create_test_nft(seller, signer::address_of(seller));
        let payment_token = create_test_token(admin);

        english_auction::create_auction(seller, nft, STARTING_PRICE, DURATION, payment_token);

        // Buyer tries to cancel (should fail)
        english_auction::cancel_auction(buyer1, 1);
    }
}

