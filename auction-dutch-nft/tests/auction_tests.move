#[test_only]
module AuctionAddr::DutchAuctionTests {
    use AuctionAddr::DutchAuction;
    use cedra_framework::object::{Self, Object};
    use cedra_framework::timestamp;
    use cedra_framework::coin;
    use cedra_framework::cedra_coin::{Self, CedraCoin};
    use cedra_framework::account;
    use cedra_token_objects::token::{Self, Token};
    use cedra_token_objects::collection;
    use std::signer;
    use std::string;
    use std::option;

    // Test helper to create a test NFT
    fun create_test_nft(creator: &signer): Object<Token> {
        // Create collection
        let collection_name = string::utf8(b"Test Collection");
        collection::create_unlimited_collection(
            creator,
            string::utf8(b"Test Description"),
            collection_name,
            option::none(),
            string::utf8(b"https://test.com"),
        );
        
        // Create token
        let token_ref = token::create_named_token(
            creator,
            collection_name,
            string::utf8(b"Test NFT"),
            string::utf8(b"NFT #1"),
            option::none(),
            string::utf8(b"https://test.com/nft1"),
        );
        
        object::object_from_constructor_ref<Token>(&token_ref)
    }

    #[test(framework = @0x1, seller = @0x100)]
    /// Test price calculation at different time points
    fun test_price_calculation_at_different_times(
        framework: &signer,
        seller: &signer,
    ) {
        // Setup
        timestamp::set_time_has_started_for_testing(framework);
        cedra_coin::ensure_initialized_with_cedra_fa_metadata_for_test();
        
        let seller_addr = signer::address_of(seller);
        account::create_account_for_test(seller_addr);
        cedra_coin::mint(framework, seller_addr, 10000);
        
        let nft = create_test_nft(seller);
        
        // Create auction: 1000 -> 100 over 900 seconds (15 min)
        DutchAuction::create_auction(seller, nft, 1000, 100, 900);
        
        // At start: price should be 1000
        let price = DutchAuction::get_current_price(seller_addr);
        assert!(price == 1000, 1);
        
        // At 450s (50%): price should be 550
        timestamp::fast_forward_seconds(450);
        let price = DutchAuction::get_current_price(seller_addr);
        assert!(price == 550, 2);
        
        // At 900s (end): price should be 100
        timestamp::fast_forward_seconds(450);
        let price = DutchAuction::get_current_price(seller_addr);
        assert!(price == 100, 3);
        
        // Beyond duration: price stays at end_price
        timestamp::fast_forward_seconds(100);
        let price = DutchAuction::get_current_price(seller_addr);
        assert!(price == 100, 4);
    }

    #[test(framework = @0x1, seller = @0x100, buyer = @0x200)]
    /// Test successful purchase at mid-point
    fun test_successful_purchase(
        framework: &signer,
        seller: &signer,
        buyer: &signer,
    ) {
        // Setup
        timestamp::set_time_has_started_for_testing(framework);
        cedra_coin::ensure_initialized_with_cedra_fa_metadata_for_test();
        
        let seller_addr = signer::address_of(seller);
        let buyer_addr = signer::address_of(buyer);
        
        account::create_account_for_test(seller_addr);
        account::create_account_for_test(buyer_addr);
        
        cedra_coin::mint(framework, seller_addr, 10000);
        cedra_coin::mint(framework, buyer_addr, 10000);
        
        let nft = create_test_nft(seller);
        let seller_balance_before = coin::balance<CedraCoin>(seller_addr);
        
        DutchAuction::create_auction(seller, nft, 1000, 100, 900);
        
        // Fast forward to 50% (price = 550)
        timestamp::fast_forward_seconds(450);
        
        // Buyer purchases
        DutchAuction::buy_now(buyer, seller_addr);
        
        // Verify sold status
        let (_, _, _, _, _, sold, buyer_result, final_price) = DutchAuction::get_auction(seller_addr);
        assert!(sold, 1);
        assert!(buyer_result == buyer_addr, 2);
        assert!(final_price == 550, 3);
        
        // Seller finalizes
        DutchAuction::finalize_sale(seller, seller_addr);
        
        // Verify seller received payment (550)
        let seller_balance_after = coin::balance<CedraCoin>(seller_addr);
        assert!(seller_balance_after == seller_balance_before + 550, 4);
    }

    #[test(framework = @0x1, seller = @0x100)]
    /// Test seller can cancel before purchase
    fun test_cancellation(
        framework: &signer,
        seller: &signer,
    ) {
        timestamp::set_time_has_started_for_testing(framework);
        cedra_coin::ensure_initialized_with_cedra_fa_metadata_for_test();
        
        let seller_addr = signer::address_of(seller);
        account::create_account_for_test(seller_addr);
        cedra_coin::mint(framework, seller_addr, 10000);
        
        let nft = create_test_nft(seller);
        DutchAuction::create_auction(seller, nft, 1000, 100, 900);
        
        // Seller cancels
        DutchAuction::cancel_auction(seller, seller_addr);
        
        // Verify marked as sold (completed)
        let (_, _, _, _, _, sold, _, _) = DutchAuction::get_auction(seller_addr);
        assert!(sold, 1);
    }

    #[test(framework = @0x1, seller = @0x100, buyer = @0x200)]
    /// Test purchase works at end_price after duration expires
    fun test_expired_auction_at_end_price(
        framework: &signer,
        seller: &signer,
        buyer: &signer,
    ) {
        timestamp::set_time_has_started_for_testing(framework);
        cedra_coin::ensure_initialized_with_cedra_fa_metadata_for_test();
        
        let seller_addr = signer::address_of(seller);
        let buyer_addr = signer::address_of(buyer);
        
        account::create_account_for_test(seller_addr);
        account::create_account_for_test(buyer_addr);
        
        cedra_coin::mint(framework, seller_addr, 10000);
        cedra_coin::mint(framework, buyer_addr, 10000);
        
        let nft = create_test_nft(seller);
        DutchAuction::create_auction(seller, nft, 1000, 100, 900);
        
        // Fast forward past duration
        timestamp::fast_forward_seconds(1000);
        
        // Verify price is end_price
        let price = DutchAuction::get_current_price(seller_addr);
        assert!(price == 100, 1);
        
        // Purchase succeeds at end price
        DutchAuction::buy_now(buyer, seller_addr);
        
        let (_, _, _, _, _, sold, buyer_result, _) = DutchAuction::get_auction(seller_addr);
        assert!(sold, 2);
        assert!(buyer_result == buyer_addr, 3);
        
        // Seller finalizes
        DutchAuction::finalize_sale(seller, seller_addr);
    }

    #[test(framework = @0x1, seller = @0x100, buyer = @0x200)]
    #[expected_failure(abort_code = 2)] // E_ALREADY_SOLD
    /// Test cannot cancel after sold
    fun test_cancel_after_sold_fails(
        framework: &signer,
        seller: &signer,
        buyer: &signer,
    ) {
        timestamp::set_time_has_started_for_testing(framework);
        cedra_coin::ensure_initialized_with_cedra_fa_metadata_for_test();
        
        let seller_addr = signer::address_of(seller);
        let buyer_addr = signer::address_of(buyer);
        
        account::create_account_for_test(seller_addr);
        account::create_account_for_test(buyer_addr);
        
        cedra_coin::mint(framework, seller_addr, 10000);
        cedra_coin::mint(framework, buyer_addr, 10000);
        
        let nft = create_test_nft(seller);
        DutchAuction::create_auction(seller, nft, 1000, 100, 900);
        
        // Buyer purchases
        DutchAuction::buy_now(buyer, seller_addr);
        
        // Finalize first
        DutchAuction::finalize_sale(seller, seller_addr);
        
        // Try to cancel (should fail)
        DutchAuction::cancel_auction(seller, seller_addr);
    }

    #[test(framework = @0x1, seller = @0x100, buyer = @0x200)]
    #[expected_failure(abort_code = 2)] // E_ALREADY_SOLD
    /// Test cannot buy twice
    fun test_buy_after_sold_fails(
        framework: &signer,
        seller: &signer,
        buyer: &signer,
    ) {
        timestamp::set_time_has_started_for_testing(framework);
        cedra_coin::ensure_initialized_with_cedra_fa_metadata_for_test();
        
        let seller_addr = signer::address_of(seller);
        let buyer_addr = signer::address_of(buyer);
        
        account::create_account_for_test(seller_addr);
        account::create_account_for_test(buyer_addr);
        
        cedra_coin::mint(framework, seller_addr, 10000);
        cedra_coin::mint(framework, buyer_addr, 10000);
        
        let nft = create_test_nft(seller);
        DutchAuction::create_auction(seller, nft, 1000, 100, 900);
        
        DutchAuction::buy_now(buyer, seller_addr);
        
        // Try to buy again (should fail - already sold)
        DutchAuction::buy_now(buyer, seller_addr);
    }

    #[test(framework = @0x1, seller = @0x100, other = @0x300)]
    #[expected_failure(abort_code = 3)] // E_NOT_SELLER
    /// Test only seller can cancel
    fun test_non_seller_cancel_fails(
        framework: &signer,
        seller: &signer,
        other: &signer,
    ) {
        timestamp::set_time_has_started_for_testing(framework);
        cedra_coin::ensure_initialized_with_cedra_fa_metadata_for_test();
        
        let seller_addr = signer::address_of(seller);
        let other_addr = signer::address_of(other);
        
        account::create_account_for_test(seller_addr);
        account::create_account_for_test(other_addr);
        
        cedra_coin::mint(framework, seller_addr, 10000);
        
        let nft = create_test_nft(seller);
        DutchAuction::create_auction(seller, nft, 1000, 100, 900);
        
        // Non-seller tries to cancel (should fail)
        DutchAuction::cancel_auction(other, seller_addr);
    }

    #[test(framework = @0x1, seller = @0x100)]
    #[expected_failure(abort_code = 4)] // E_INVALID_PRICE
    /// Test start_price must be greater than end_price
    fun test_invalid_price_range_fails(
        framework: &signer,
        seller: &signer,
    ) {
        timestamp::set_time_has_started_for_testing(framework);
        cedra_coin::ensure_initialized_with_cedra_fa_metadata_for_test();
        
        let seller_addr = signer::address_of(seller);
        account::create_account_for_test(seller_addr);
        cedra_coin::mint(framework, seller_addr, 10000);
        
        let nft = create_test_nft(seller);
        
        // Try to create auction with start <= end (should fail)
        DutchAuction::create_auction(seller, nft, 100, 1000, 900);
    }

    #[test(framework = @0x1, seller = @0x100)]
    #[expected_failure(abort_code = 5)] // E_INVALID_DURATION
    /// Test duration must be greater than zero
    fun test_zero_duration_fails(
        framework: &signer,
        seller: &signer,
    ) {
        timestamp::set_time_has_started_for_testing(framework);
        cedra_coin::ensure_initialized_with_cedra_fa_metadata_for_test();
        
        let seller_addr = signer::address_of(seller);
        account::create_account_for_test(seller_addr);
        cedra_coin::mint(framework, seller_addr, 10000);
        
        let nft = create_test_nft(seller);
        
        // Try to create auction with zero duration (should fail)
        DutchAuction::create_auction(seller, nft, 1000, 100, 0);
    }

    #[test(framework = @0x1)]
    #[expected_failure(abort_code = 1)] // E_AUCTION_NOT_FOUND
    /// Test auction not found error
    fun test_auction_not_found_fails(
        framework: &signer,
    ) {
        timestamp::set_time_has_started_for_testing(framework);
        cedra_coin::ensure_initialized_with_cedra_fa_metadata_for_test();
        
        // Try to get price of non-existent auction
        DutchAuction::get_current_price(@0x999);
    }

    #[test(framework = @0x1, seller = @0x100, buyer = @0x200)]
    /// Test instant purchase at start price
    fun test_instant_purchase(
        framework: &signer,
        seller: &signer,
        buyer: &signer,
    ) {
        timestamp::set_time_has_started_for_testing(framework);
        cedra_coin::ensure_initialized_with_cedra_fa_metadata_for_test();
        
        let seller_addr = signer::address_of(seller);
        let buyer_addr = signer::address_of(buyer);
        
        account::create_account_for_test(seller_addr);
        account::create_account_for_test(buyer_addr);
        
        cedra_coin::mint(framework, seller_addr, 10000);
        cedra_coin::mint(framework, buyer_addr, 10000);
        
        let nft = create_test_nft(seller);
        DutchAuction::create_auction(seller, nft, 1000, 100, 900);
        
        // Buy immediately at start price
        let price = DutchAuction::get_current_price(seller_addr);
        assert!(price == 1000, 1);
        
        DutchAuction::buy_now(buyer, seller_addr);
        
        let (_, _, _, _, _, sold, buyer_result, _) = DutchAuction::get_auction(seller_addr);
        assert!(sold, 2);
        assert!(buyer_result == buyer_addr, 3);
        
        // Seller finalizes
        DutchAuction::finalize_sale(seller, seller_addr);
    }

    #[test(framework = @0x1, seller = @0x100, buyer = @0x200)]
    /// Test purchase at last second before end
    fun test_last_second_purchase(
        framework: &signer,
        seller: &signer,
        buyer: &signer,
    ) {
        timestamp::set_time_has_started_for_testing(framework);
        cedra_coin::ensure_initialized_with_cedra_fa_metadata_for_test();
        
        let seller_addr = signer::address_of(seller);
        let buyer_addr = signer::address_of(buyer);
        
        account::create_account_for_test(seller_addr);
        account::create_account_for_test(buyer_addr);
        
        cedra_coin::mint(framework, seller_addr, 10000);
        cedra_coin::mint(framework, buyer_addr, 10000);
        
        let nft = create_test_nft(seller);
        DutchAuction::create_auction(seller, nft, 1000, 100, 900);
        
        // Fast forward to 899 seconds (1 second before end)
        timestamp::fast_forward_seconds(899);
        
        // Price should be very close to end_price
        let price = DutchAuction::get_current_price(seller_addr);
        assert!(price == 101, 1); // 1000 - (900 * 899/900) = 101
        
        DutchAuction::buy_now(buyer, seller_addr);
        
        let (_, _, _, _, _, sold, buyer_result, _) = DutchAuction::get_auction(seller_addr);
        assert!(sold, 2);
        assert!(buyer_result == buyer_addr, 3);
        
        // Seller finalizes
        DutchAuction::finalize_sale(seller, seller_addr);
    }

    #[test(framework = @0x1, seller = @0x100)]
    /// Test price calculation with large numbers
    fun test_price_calculation_precision(
        framework: &signer,
        seller: &signer,
    ) {
        timestamp::set_time_has_started_for_testing(framework);
        cedra_coin::ensure_initialized_with_cedra_fa_metadata_for_test();
        
        let seller_addr = signer::address_of(seller);
        account::create_account_for_test(seller_addr);
        cedra_coin::mint(framework, seller_addr, 10000);
        
        let nft = create_test_nft(seller);
        
        // Large numbers to test overflow protection
        DutchAuction::create_auction(seller, nft, 1000000, 1000, 10000);
        
        let price = DutchAuction::get_current_price(seller_addr);
        assert!(price == 1000000, 1);
        
        timestamp::fast_forward_seconds(5000); // 50%
        let price = DutchAuction::get_current_price(seller_addr);
        assert!(price == 500500, 2); // 1000000 - (999000 * 5000/10000)
    }
}
