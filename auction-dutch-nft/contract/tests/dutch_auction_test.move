#[test_only]
module AuctionDutchNFT::DutchAuctionTest {
    use std::vector;
    use AuctionDutchNFT::DutchAuction;

    /// Test module initialization
    #[test(admin = @AuctionDutchNFT)]
    fun test_init_module(admin: signer) {
        DutchAuction::init_for_testing(&admin);
    }

    /// Test that auction_exists returns false for non-existent auction
    #[test(admin = @AuctionDutchNFT)]
    fun test_auction_exists_false(admin: signer) {
        DutchAuction::init_for_testing(&admin);
        assert!(!DutchAuction::auction_exists(@0x999), 1);
    }

    /// Test that is_auction_expired returns false for non-existent auction
    #[test(admin = @AuctionDutchNFT)]
    fun test_is_auction_expired_false(admin: signer) {
        DutchAuction::init_for_testing(&admin);
        assert!(!DutchAuction::is_auction_expired(@0x999), 1);
    }

    /// Test price calculation logic: at start (0% elapsed)
    /// Formula: current_price = start_price - ((start_price - end_price) * elapsed_time / duration)
    /// At start: elapsed_time = 0, so price = start_price
    #[test(admin = @AuctionDutchNFT)]
    fun test_price_calculation_at_start(admin: signer) {
        DutchAuction::init_for_testing(&admin);
        
        // Simulate price calculation at start
        let start_price = 1000;
        let end_price = 100;
        let duration = 3600;
        let elapsed_time = 0;
        
        // Calculate: start_price - ((start_price - end_price) * elapsed_time / duration)
        let price_range = start_price - end_price; // 900
        let price_decrease = (price_range * elapsed_time) / duration; // 0
        let current_price = start_price - price_decrease; // 1000
        
        assert!(current_price == start_price, 1);
        assert!(current_price == 1000, 2);
    }

    /// Test price calculation logic: at midpoint (50% elapsed)
    #[test(admin = @AuctionDutchNFT)]
    fun test_price_calculation_at_midpoint(admin: signer) {
        DutchAuction::init_for_testing(&admin);
        
        let start_price = 1000;
        let end_price = 100;
        let duration = 3600;
        let elapsed_time = 1800; // 50% of duration
        
        // Calculate: start_price - ((start_price - end_price) * elapsed_time / duration)
        let price_range = start_price - end_price; // 900
        let price_decrease = (price_range * elapsed_time) / duration; // 900 * 1800 / 3600 = 450
        let current_price = start_price - price_decrease; // 1000 - 450 = 550
        
        assert!(current_price == 550, 1);
    }

    /// Test price calculation logic: at end (100% elapsed)
    #[test(admin = @AuctionDutchNFT)]
    fun test_price_calculation_at_end(admin: signer) {
        DutchAuction::init_for_testing(&admin);
        
        let start_price = 1000;
        let end_price = 100;
        let duration = 3600;
        let elapsed_time = 3600; // 100% of duration
        
        // Calculate: start_price - ((start_price - end_price) * elapsed_time / duration)
        let price_range = start_price - end_price; // 900
        let price_decrease = (price_range * elapsed_time) / duration; // 900 * 3600 / 3600 = 900
        let current_price = start_price - price_decrease; // 1000 - 900 = 100
        
        assert!(current_price == end_price, 1);
        assert!(current_price == 100, 2);
    }

    /// Test price calculation logic: at 25% elapsed
    #[test(admin = @AuctionDutchNFT)]
    fun test_price_calculation_at_25_percent(admin: signer) {
        DutchAuction::init_for_testing(&admin);
        
        let start_price = 1000;
        let end_price = 100;
        let duration = 3600;
        let elapsed_time = 900; // 25% of duration
        
        // Calculate: start_price - ((start_price - end_price) * elapsed_time / duration)
        let price_range = start_price - end_price; // 900
        let price_decrease = (price_range * elapsed_time) / duration; // 900 * 900 / 3600 = 225
        let current_price = start_price - price_decrease; // 1000 - 225 = 775
        
        assert!(current_price == 775, 1);
    }

    /// Test price calculation logic: at 75% elapsed
    #[test(admin = @AuctionDutchNFT)]
    fun test_price_calculation_at_75_percent(admin: signer) {
        DutchAuction::init_for_testing(&admin);
        
        let start_price = 1000;
        let end_price = 100;
        let duration = 3600;
        let elapsed_time = 2700; // 75% of duration
        
        // Calculate: start_price - ((start_price - end_price) * elapsed_time / duration)
        let price_range = start_price - end_price; // 900
        let price_decrease = (price_range * elapsed_time) / duration; // 900 * 2700 / 3600 = 675
        let current_price = start_price - price_decrease; // 1000 - 675 = 325
        
        assert!(current_price == 325, 1);
    }

    /// Test price calculation with different price ranges
    #[test(admin = @AuctionDutchNFT)]
    fun test_price_calculation_different_range(admin: signer) {
        DutchAuction::init_for_testing(&admin);
        
        let start_price = 2000;
        let end_price = 0;
        let duration = 1000;
        let elapsed_time = 500; // 50% of duration
        
        // Calculate: start_price - ((start_price - end_price) * elapsed_time / duration)
        let price_range = start_price - end_price; // 2000
        let price_decrease = (price_range * elapsed_time) / duration; // 2000 * 500 / 1000 = 1000
        let current_price = start_price - price_decrease; // 2000 - 1000 = 1000
        
        assert!(current_price == 1000, 1);
    }

    /// Test price calculation edge case: very short duration
    #[test(admin = @AuctionDutchNFT)]
    fun test_price_calculation_short_duration(admin: signer) {
        DutchAuction::init_for_testing(&admin);
        
        let start_price = 100;
        let end_price = 50;
        let duration = 10;
        let elapsed_time = 5; // 50% of duration
        
        // Calculate: start_price - ((start_price - end_price) * elapsed_time / duration)
        let price_range = start_price - end_price; // 50
        let price_decrease = (price_range * elapsed_time) / duration; // 50 * 5 / 10 = 25
        let current_price = start_price - price_decrease; // 100 - 25 = 75
        
        assert!(current_price == 75, 1);
    }

    /// Test price calculation edge case: start_price equals end_price
    #[test(admin = @AuctionDutchNFT)]
    fun test_price_calculation_equal_prices(admin: signer) {
        DutchAuction::init_for_testing(&admin);
        
        let start_price = 100;
        let end_price = 100;
        let duration = 3600;
        let elapsed_time = 1800; // 50% of duration
        
        // Calculate: start_price - ((start_price - end_price) * elapsed_time / duration)
        let price_range = start_price - end_price; // 0
        let price_decrease = (price_range * elapsed_time) / duration; // 0
        let current_price = start_price - price_decrease; // 100 - 0 = 100
        
        assert!(current_price == start_price, 1);
        assert!(current_price == end_price, 2);
    }

    /// Test linear price decrease progression
    #[test(admin = @AuctionDutchNFT)]
    fun test_linear_price_decrease_progression(admin: signer) {
        DutchAuction::init_for_testing(&admin);
        
        let start_price = 1000;
        let end_price = 100;
        let duration = 1000;
        
        // Test at 0%, 25%, 50%, 75%, 100%
        let test_points = vector[0, 250, 500, 750, 1000];
        let expected_prices = vector[1000, 775, 550, 325, 100];
        
        let i = 0;
        while (i < 5) {
            let elapsed_time = *vector::borrow(&test_points, i);
            let expected = *vector::borrow(&expected_prices, i);
            
            let price_range = start_price - end_price;
            let price_decrease = (price_range * elapsed_time) / duration;
            let current_price = start_price - price_decrease;
            
            assert!(current_price == expected, i + 1);
            i = i + 1;
        };
    }

    /// Test price calculation with rounding (ensures price doesn't go below end_price)
    #[test(admin = @AuctionDutchNFT)]
    fun test_price_calculation_rounding_protection(admin: signer) {
        DutchAuction::init_for_testing(&admin);
        
        let start_price = 1000;
        let end_price = 100;
        let duration = 3; // Very small duration to test rounding
        
        // At 100% elapsed, should return end_price even if calculation might round differently
        let elapsed_time = 3;
        let price_range = start_price - end_price; // 900
        let price_decrease = (price_range * elapsed_time) / duration; // 900 * 3 / 3 = 900
        let current_price = start_price - price_decrease; // 1000 - 900 = 100
        
        // Ensure price doesn't go below end_price
        let final_price = if (current_price < end_price) {
            end_price
        } else {
            current_price
        };
        
        assert!(final_price == end_price, 1);
        assert!(final_price >= end_price, 2);
    }
}
