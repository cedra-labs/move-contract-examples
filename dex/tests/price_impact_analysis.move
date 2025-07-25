#[test_only]
module simple_dex::price_impact_analysis {
    use simple_dex::slippage;
    use simple_dex::math_amm;
    use std::debug;

    #[test]
    fun analyze_price_impact() {
        let amount_in = 100000;
        let reserve_in = 1000000;
        let reserve_out = 1000000;
        
        // Calculate amount out with fee
        let amount_out = math_amm::get_amount_out(amount_in, reserve_in, reserve_out);
        debug::print(&b"Amount in: ");
        debug::print(&amount_in);
        debug::print(&b"Amount out: ");
        debug::print(&amount_out);
        
        // Calculate prices
        let price_before = (reserve_out as u128) * 10000u128 / (reserve_in as u128);
        let price_after = ((reserve_out - amount_out) as u128) * 10000u128 / ((reserve_in + amount_in) as u128);
        
        debug::print(&b"Price before (x10000): ");
        debug::print(&price_before);
        debug::print(&b"Price after (x10000): ");
        debug::print(&price_after);
        
        // Calculate price impact
        let price_impact = slippage::calculate_price_impact(amount_in, reserve_in, reserve_out);
        debug::print(&b"Price impact (bps): ");
        debug::print(&price_impact);
        
        // Calculate expected price impact without fee
        let theoretical_out = (amount_in as u128) * (reserve_out as u128) / ((reserve_in + amount_in) as u128);
        debug::print(&b"Theoretical out (no fee): ");
        debug::print(&theoretical_out);
        
        // Calculate slippage percentage
        let slippage = ((amount_in - amount_out) as u128) * 10000u128 / (amount_in as u128);
        debug::print(&b"Slippage (bps): ");
        debug::print(&slippage);
    }
}