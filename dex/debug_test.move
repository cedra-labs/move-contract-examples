#[test_only]
module simple_dex::debug_test {
    use simple_dex::math_amm;
    use std::debug;

    #[test]
    fun test_debug() {
        let amount_in = 1000;
        let reserve_in = 10000;
        let reserve_out = 20000;
        
        let amount_out = math_amm::get_amount_out(amount_in, reserve_in, reserve_out);
        debug::print(&amount_out);
    }
}
EOF < /dev/null