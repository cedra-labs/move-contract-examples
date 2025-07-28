#[test_only]
module simple_dex::price_impact_analysis {
    use simple_dex::slippage;
    use simple_dex::math_amm;

    #[test]
    fun analyze_price_impact() {
        let amount_in = 100000;
        let reserve_in = 1000000;
        let reserve_out = 1000000;
        
        let amount_out = math_amm::get_amount_out(amount_in, reserve_in, reserve_out);
        
        let spot_price = (reserve_out as u128) * 10000u128 / (reserve_in as u128);
        let _execution_price = (amount_in as u128) * 10000u128 / (amount_out as u128);
        
        
        let price_impact = slippage::calculate_price_impact(amount_in, reserve_in, reserve_out);
        
        let pool_price_after = ((reserve_out - amount_out) as u128) * 10000u128 / ((reserve_in + amount_in) as u128);
        let pool_price_change = ((spot_price - pool_price_after) * 10000u128 / spot_price as u64);
        
        assert!(amount_out == 90661, 0);
        assert!(price_impact == 1030, 1); // Exactly 10.30%
        assert!(pool_price_change == 1734, 2); // Exactly 17.34%
    }
    
    #[test]
    fun test_small_trade_price_impact() {
        let amount_in = 1000; // 0.1% of pool
        let reserve_in = 1000000;
        let reserve_out = 1000000;
        
        let price_impact = slippage::calculate_price_impact(amount_in, reserve_in, reserve_out);
        
        // Small trades should have minimal price impact  
        assert!(price_impact < 50, 0); // Less than 0.5%
    }
    
    #[test]
    fun test_large_trade_price_impact() {
        let amount_in = 500000; // 50% of pool
        let reserve_in = 1000000;
        let reserve_out = 1000000;
        
        let price_impact = slippage::calculate_price_impact(amount_in, reserve_in, reserve_out);
        
        // Large trades should have significant price impact
        assert!(price_impact > 5000, 0); // More than 50%
    }
}