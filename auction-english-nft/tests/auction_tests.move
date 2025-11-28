#[test_only]
module AuctionAddr::AuctionTests {
    use AuctionAddr::EnglishAuction;
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
        let creator_addr = signer::address_of(creator);
        
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

    #[test(framework = @0x1, seller = @0x100, bidder1 = @0x200, bidder2 = @0x300)]
    /// Test normal auction flow: create, bid, finalize
    fun test_normal_auction_flow(
        framework: &signer,
        seller: &signer,
        bidder1: &signer,
        bidder2: &signer,
    ) {
        // Setup
        timestamp::set_time_has_started_for_testing(framework);
        cedra_coin::ensure_initialized_with_cedra_fa_metadata_for_test();
        
        let seller_addr = signer::address_of(seller);
        let bidder1_addr = signer::address_of(bidder1);
        let bidder2_addr = signer::address_of(bidder2);
        
        account::create_account_for_test(seller_addr);
        account::create_account_for_test(bidder1_addr);
        account::create_account_for_test(bidder2_addr);
        
        // Fund accounts
        cedra_coin::mint(framework, seller_addr, 1000);
        cedra_coin::mint(framework, bidder1_addr, 1000);
        cedra_coin::mint(framework, bidder2_addr, 1000);
        
        // Create NFT
        let nft = create_test_nft(seller);
        
        // Create auction
        EnglishAuction::create_auction(seller, nft, 100, 3600);
        
        // Place bid
        EnglishAuction::place_bid(bidder1, seller_addr, 150);
        
        // Verify auction state
        let (_, current_bid, highest_bidder, _, finalized) = 
            EnglishAuction::get_auction(seller_addr);
        assert!(current_bid == 150, 1);
        assert!(highest_bidder == bidder1_addr, 2);
        assert!(!finalized, 3);
        
        // Fast forward time
        timestamp::fast_forward_seconds(3601);
        
        // Finalize auction
        EnglishAuction::finalize_auction(seller, seller_addr);
        
        // Verify finalized
        let (_, _, _, _, finalized) = EnglishAuction::get_auction(seller_addr);
        assert!(finalized, 4);
    }

    #[test(framework = @0x1, seller = @0x100, bidder1 = @0x200, bidder2 = @0x300)]
    /// Test multiple bidders with automatic refunds
    fun test_multiple_bidders(
        framework: &signer,
        seller: &signer,
        bidder1: &signer,
        bidder2: &signer,
    ) {
        // Setup
        timestamp::set_time_has_started_for_testing(framework);
        cedra_coin::ensure_initialized_with_cedra_fa_metadata_for_test();
        
        let seller_addr = signer::address_of(seller);
        let bidder1_addr = signer::address_of(bidder1);
        let bidder2_addr = signer::address_of(bidder2);
        
        account::create_account_for_test(seller_addr);
        account::create_account_for_test(bidder1_addr);
        account::create_account_for_test(bidder2_addr);
        
        cedra_coin::mint(framework, seller_addr, 1000);
        cedra_coin::mint(framework, bidder1_addr, 1000);
        cedra_coin::mint(framework, bidder2_addr, 1000);
        
        let nft = create_test_nft(seller);
        EnglishAuction::create_auction(seller, nft, 100, 3600);
        
        // First bid
        let bidder1_balance_before = coin::balance<CedraCoin>(bidder1_addr);
        EnglishAuction::place_bid(bidder1, seller_addr, 150);
        
        // Second bid (should refund first bidder)
        EnglishAuction::place_bid(bidder2, seller_addr, 200);
        
        // Verify bidder1 was refunded
        let bidder1_balance_after = coin::balance<CedraCoin>(bidder1_addr);
        assert!(bidder1_balance_after == bidder1_balance_before, 1);
        
        // Verify bidder2 is highest
        let (_, current_bid, highest_bidder, _, _) = 
            EnglishAuction::get_auction(seller_addr);
        assert!(current_bid == 200, 2);
        assert!(highest_bidder == bidder2_addr, 3);
    }

    #[test(framework = @0x1, seller = @0x100, bidder1 = @0x200)]
    /// Test anti-sniping time extension
    fun test_time_extension(
        framework: &signer,
        seller: &signer,
        bidder1: &signer,
    ) {
        // Setup
        timestamp::set_time_has_started_for_testing(framework);
        cedra_coin::ensure_initialized_with_cedra_fa_metadata_for_test();
        
        let seller_addr = signer::address_of(seller);
        let bidder1_addr = signer::address_of(bidder1);
        
        account::create_account_for_test(seller_addr);
        account::create_account_for_test(bidder1_addr);
        
        cedra_coin::mint(framework, seller_addr, 1000);
        cedra_coin::mint(framework, bidder1_addr, 1000);
        
        let nft = create_test_nft(seller);
        EnglishAuction::create_auction(seller, nft, 100, 600); // 10 min auction
        
        // Fast forward to last 4 minutes
        timestamp::fast_forward_seconds(360);
        
        // Place bid (should extend by 5 minutes)
        EnglishAuction::place_bid(bidder1, seller_addr, 150);
        
        // Verify time was extended
        let (_, _, _, end_time, _) = EnglishAuction::get_auction(seller_addr);
        let expected_end = timestamp::now_seconds() + 300;
        assert!(end_time == expected_end, 1);
    }

    #[test(framework = @0x1, seller = @0x100)]
    /// Test seller cancellation when no bids
    fun test_seller_cancellation(
        framework: &signer,
        seller: &signer,
    ) {
        // Setup
        timestamp::set_time_has_started_for_testing(framework);
        cedra_coin::ensure_initialized_with_cedra_fa_metadata_for_test();
        
        let seller_addr = signer::address_of(seller);
        account::create_account_for_test(seller_addr);
        cedra_coin::mint(framework, seller_addr, 1000);
        
        let nft = create_test_nft(seller);
        EnglishAuction::create_auction(seller, nft, 100, 3600);
        
        // Cancel auction
        EnglishAuction::cancel_auction(seller, seller_addr);
        
        // Verify finalized
        let (_, _, _, _, finalized) = EnglishAuction::get_auction(seller_addr);
        assert!(finalized, 1);
    }

    #[test(framework = @0x1, seller = @0x100, bidder1 = @0x200)]
    #[expected_failure(abort_code = 6)] // E_BIDS_EXIST
    /// Test cancellation fails when bids exist
    fun test_cancel_with_bids_fails(
        framework: &signer,
        seller: &signer,
        bidder1: &signer,
    ) {
        // Setup
        timestamp::set_time_has_started_for_testing(framework);
        cedra_coin::ensure_initialized_with_cedra_fa_metadata_for_test();
        
        let seller_addr = signer::address_of(seller);
        let bidder1_addr = signer::address_of(bidder1);
        
        account::create_account_for_test(seller_addr);
        account::create_account_for_test(bidder1_addr);
        
        cedra_coin::mint(framework, seller_addr, 1000);
        cedra_coin::mint(framework, bidder1_addr, 1000);
        
        let nft = create_test_nft(seller);
        EnglishAuction::create_auction(seller, nft, 100, 3600);
        
        // Place bid
        EnglishAuction::place_bid(bidder1, seller_addr, 150);
        
        // Try to cancel (should fail)
        EnglishAuction::cancel_auction(seller, seller_addr);
    }

    #[test(framework = @0x1, seller = @0x100)]
    #[expected_failure(abort_code = 3)] // E_AUCTION_NOT_ENDED
    /// Test finalization fails before end time
    fun test_early_finalization_fails(
        framework: &signer,
        seller: &signer,
    ) {
        // Setup
        timestamp::set_time_has_started_for_testing(framework);
        cedra_coin::ensure_initialized_with_cedra_fa_metadata_for_test();
        
        let seller_addr = signer::address_of(seller);
        account::create_account_for_test(seller_addr);
        cedra_coin::mint(framework, seller_addr, 1000);
        
        let nft = create_test_nft(seller);
        EnglishAuction::create_auction(seller, nft, 100, 3600);
        
        // Try to finalize before end (should fail)
        EnglishAuction::finalize_auction(seller, seller_addr);
    }

    #[test(framework = @0x1, seller = @0x100, bidder1 = @0x200)]
    #[expected_failure(abort_code = 2)] // E_BID_TOO_LOW
    /// Test bid must be higher than current
    fun test_low_bid_fails(
        framework: &signer,
        seller: &signer,
        bidder1: &signer,
    ) {
        // Setup
        timestamp::set_time_has_started_for_testing(framework);
        cedra_coin::ensure_initialized_with_cedra_fa_metadata_for_test();
        
        let seller_addr = signer::address_of(seller);
        let bidder1_addr = signer::address_of(bidder1);
        
        account::create_account_for_test(seller_addr);
        account::create_account_for_test(bidder1_addr);
        
        cedra_coin::mint(framework, seller_addr, 1000);
        cedra_coin::mint(framework, bidder1_addr, 1000);
        
        let nft = create_test_nft(seller);
        EnglishAuction::create_auction(seller, nft, 100, 3600);
        
        // Try to bid below starting price (should fail)
        EnglishAuction::place_bid(bidder1, seller_addr, 50);
    }

    #[test(framework = @0x1, seller = @0x100)]
    #[expected_failure(abort_code = 7)] // E_NO_BIDS
    /// Test finalization fails when there are no bids
    fun test_finalize_no_bids_fails(
        framework: &signer,
        seller: &signer,
    ) {
        timestamp::set_time_has_started_for_testing(framework);
        cedra_coin::ensure_initialized_with_cedra_fa_metadata_for_test();
        
        let seller_addr = signer::address_of(seller);
        account::create_account_for_test(seller_addr);
        cedra_coin::mint(framework, seller_addr, 1000);
        
        let nft = create_test_nft(seller);
        EnglishAuction::create_auction(seller, nft, 100, 3600);
        
        // Fast forward to end
        timestamp::fast_forward_seconds(3601);
        
        // Try to finalize with no bids (should fail)
        EnglishAuction::finalize_auction(seller, seller_addr);
    }

    #[test(framework = @0x1, seller = @0x100, bidder1 = @0x200)]
    #[expected_failure(abort_code = 4)] // E_AUCTION_ENDED
    /// Test bidding fails after auction end
    fun test_auction_ended_bid_fails(
        framework: &signer,
        seller: &signer,
        bidder1: &signer,
    ) {
        timestamp::set_time_has_started_for_testing(framework);
        cedra_coin::ensure_initialized_with_cedra_fa_metadata_for_test();
        
        let seller_addr = signer::address_of(seller);
        let bidder1_addr = signer::address_of(bidder1);
        
        account::create_account_for_test(seller_addr);
        account::create_account_for_test(bidder1_addr);
        cedra_coin::mint(framework, seller_addr, 1000);
        cedra_coin::mint(framework, bidder1_addr, 1000);
        
        let nft = create_test_nft(seller);
        EnglishAuction::create_auction(seller, nft, 100, 3600);
        
        // Fast forward to end
        timestamp::fast_forward_seconds(3601);
        
        // Try to bid after end (should fail)
        EnglishAuction::place_bid(bidder1, seller_addr, 150);
    }

    #[test(framework = @0x1, seller = @0x100, bidder1 = @0x200)]
    #[expected_failure(abort_code = 9)] // E_ALREADY_FINALIZED
    /// Test actions fail on finalized auction
    fun test_already_finalized_fails(
        framework: &signer,
        seller: &signer,
        bidder1: &signer,
    ) {
        timestamp::set_time_has_started_for_testing(framework);
        cedra_coin::ensure_initialized_with_cedra_fa_metadata_for_test();
        
        let seller_addr = signer::address_of(seller);
        let bidder1_addr = signer::address_of(bidder1);
        
        account::create_account_for_test(seller_addr);
        account::create_account_for_test(bidder1_addr);
        cedra_coin::mint(framework, seller_addr, 1000);
        cedra_coin::mint(framework, bidder1_addr, 1000);
        
        let nft = create_test_nft(seller);
        EnglishAuction::create_auction(seller, nft, 100, 3600);
        
        // Place bid
        EnglishAuction::place_bid(bidder1, seller_addr, 150);
        
        // Fast forward and finalize
        timestamp::fast_forward_seconds(3601);
        EnglishAuction::finalize_auction(seller, seller_addr);
        
        // Try to finalize again (should fail)
        EnglishAuction::finalize_auction(seller, seller_addr);
    }

    #[test(framework = @0x1, seller = @0x100, other = @0x200)]
    #[expected_failure(abort_code = 5)] // E_NOT_SELLER
    /// Test only seller can cancel
    fun test_not_seller_cancel_fails(
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
        cedra_coin::mint(framework, seller_addr, 1000);
        
        let nft = create_test_nft(seller);
        EnglishAuction::create_auction(seller, nft, 100, 3600);
        
        // Try to cancel as non-seller (should fail)
        EnglishAuction::cancel_auction(other, seller_addr);
    }
}
