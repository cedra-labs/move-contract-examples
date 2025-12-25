/// Slippage protection and price impact calculations
module simple_dex::slippage {
    use cedra_framework::fungible_asset::Metadata;
    use cedra_framework::object::Object;
    use simple_dex::math_amm;
    use simple_dex::swap;
    
    const ERROR_SLIPPAGE_TOO_HIGH: u64 = 1;
    const ERROR_PRICE_IMPACT_TOO_HIGH: u64 = 2;
    
    const MAX_SLIPPAGE_BPS: u64 = 500; // 5% max slippage
    const MAX_PRICE_IMPACT_BPS: u64 = 300; // 3% max price impact
    
    /// Calculate price impact for a swap
    /// 
    /// Price impact measures the difference between the execution price and spot price.
    /// This reflects the actual cost to the trader including both the AMM fee and price movement.
    /// 
    /// Formula:
    /// - Spot price = current pool price (reserve_out / reserve_in)
    /// - Execution price = what trader actually pays (amount_in / amount_out)
    /// - Price impact = (execution_price - spot_price) / spot_price
    /// 
    /// Example: For a 10% trade with 0.3% fee, price impact is approximately 10.3%
    /// 
    /// Returns: Price impact in basis points (1 bps = 0.01%)
    public fun calculate_price_impact(
        amount_in: u64,
        reserve_in: u64,
        reserve_out: u64
    ): u64 {
        let amount_out = math_amm::get_amount_out(amount_in, reserve_in, reserve_out);
        
        // Spot price: reserve_out / reserve_in
        // Execution price: amount_in / amount_out
        let spot_price = (reserve_out as u128) * 10000u128 / (reserve_in as u128);
        let execution_price = (amount_in as u128) * 10000u128 / (amount_out as u128);
        
        if (execution_price > spot_price) {
            ((execution_price - spot_price) * 10000u128 / spot_price as u64)
        } else {
            0
        }
    }
    
    /// Validate slippage tolerance
    public fun validate_slippage(
        expected_output: u64,
        actual_output: u64,
        max_slippage_bps: u64
    ) {
        let slippage = if (expected_output > actual_output) {
            ((expected_output - actual_output) as u128) * 10000u128 / (expected_output as u128)
        } else {
            0u128
        };
        
        assert!((slippage as u64) <= max_slippage_bps, ERROR_SLIPPAGE_TOO_HIGH);
    }
    
    /// Advanced swap with slippage and price impact protection
    public entry fun safe_swap(
        user: &signer,
        lp_metadata: Object<Metadata>,
        x_metadata: Object<Metadata>,
        y_metadata: Object<Metadata>,
        amount_in: u64,
        min_amount_out: u64,
        max_slippage_bps: u64
    ) {
        // Get current reserves
        let (reserve_x, reserve_y) = swap::reserves(lp_metadata);
        
        // Calculate price impact
        let price_impact = calculate_price_impact(amount_in, reserve_x, reserve_y);
        assert!(price_impact <= MAX_PRICE_IMPACT_BPS, ERROR_PRICE_IMPACT_TOO_HIGH);
        
        // Calculate expected output
        let expected_output = math_amm::get_amount_out(amount_in, reserve_x, reserve_y);
        
        // Validate slippage tolerance
        validate_slippage(expected_output, min_amount_out, max_slippage_bps);
        
        // Execute swap with protection
        simple_dex::swap::swap_exact_input(
            user, 
            lp_metadata,
            x_metadata,
            y_metadata,
            amount_in, 
            min_amount_out
        );
    }
}