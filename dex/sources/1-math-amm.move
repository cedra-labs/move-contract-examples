/// Core AMM mathematics - understanding the x*y=k formula
module simple_dex::math_amm {
    use std::error;
    
    const ERROR_ZERO_LIQUIDITY: u64 = 1;
    const ERROR_INSUFFICIENT_INPUT: u64 = 2;
    
    /// Calculate output amount using constant product formula
    /// Formula: x * y = k (constant)
    /// When we add dx to x, we get dy from y such that (x + dx) * (y - dy) = k
    #[view]
    public fun get_amount_out(
        amount_in: u64,
        reserve_in: u64,
        reserve_out: u64
    ): u64 {
        assert!(amount_in > 0, error::invalid_argument(ERROR_INSUFFICIENT_INPUT));
        assert!(reserve_in > 0 && reserve_out > 0, error::invalid_state(ERROR_ZERO_LIQUIDITY));
        
        // Apply 0.3% fee (997/1000)
        let amount_in_with_fee = (amount_in as u128) * 997u128;
        let numerator = amount_in_with_fee * (reserve_out as u128);
        let denominator = (reserve_in as u128) * 1000u128 + amount_in_with_fee;
        
        (numerator / denominator as u64)
    }
    
    /// Calculate required input for desired output
    #[view]
    public fun get_amount_in(
        amount_out: u64,
        reserve_in: u64,
        reserve_out: u64
    ): u64 {
        assert!(amount_out > 0, error::invalid_argument(ERROR_INSUFFICIENT_INPUT));
        assert!(reserve_in > 0 && reserve_out > 0, error::invalid_state(ERROR_ZERO_LIQUIDITY));
        assert!(amount_out < reserve_out, error::invalid_argument(ERROR_INSUFFICIENT_INPUT));
        
        let numerator = (reserve_in as u128) * (amount_out as u128) * 1000u128;
        let denominator = (reserve_out - amount_out as u128) * 997u128;
        
        ((numerator / denominator) + 1 as u64) // Add 1 to round up
    }
    
    /// Calculate optimal amounts for adding liquidity
    #[view]
    public fun quote(
        amount_a: u64,
        reserve_a: u64,
        reserve_b: u64
    ): u64 {
        assert!(amount_a > 0, error::invalid_argument(ERROR_INSUFFICIENT_INPUT));
        assert!(reserve_a > 0 && reserve_b > 0, error::invalid_state(ERROR_ZERO_LIQUIDITY));
        
        ((amount_a as u128) * (reserve_b as u128) / (reserve_a as u128) as u64)
    }
}