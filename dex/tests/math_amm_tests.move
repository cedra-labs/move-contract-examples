#[test_only]
module simple_dex::math_amm_tests {
    use simple_dex::math_amm;
    use std::error;

    #[test]
    fun test_get_amount_out_basic() {
        let amount_in = 1000;
        let reserve_in = 10000;
        let reserve_out = 20000;
        
        let amount_out = math_amm::get_amount_out(amount_in, reserve_in, reserve_out);
        
        assert!(amount_out == 1813, 0);
    }

    #[test]
    fun test_get_amount_out_with_fee() {
        let amount_in = 10000;
        let reserve_in = 100000;
        let reserve_out = 100000;
        
        let amount_out = math_amm::get_amount_out(amount_in, reserve_in, reserve_out);
        
        assert!(amount_out == 9066, 0);
    }

    #[test]
    fun test_get_amount_in_basic() {
        let amount_out = 1000;
        let reserve_in = 10000;
        let reserve_out = 20000;
        
        let amount_in = math_amm::get_amount_in(amount_out, reserve_in, reserve_out);
        
        assert!(amount_in == 529, 0);
    }

    #[test]
    fun test_get_amount_in_rounds_up() {
        let amount_out = 997;
        let reserve_in = 10000;
        let reserve_out = 10000;
        
        let amount_in = math_amm::get_amount_in(amount_out, reserve_in, reserve_out);
        
        assert!(amount_in == 1004, 0);
    }

    #[test]
    fun test_quote_proportional() {
        let amount_a = 1000;
        let reserve_a = 10000;
        let reserve_b = 20000;
        
        let amount_b = math_amm::quote(amount_a, reserve_a, reserve_b);
        
        assert!(amount_b == 2000, 0);
    }

    #[test]
    fun test_quote_maintains_ratio() {
        let amount_a = 1500;
        let reserve_a = 3000;
        let reserve_b = 6000;
        
        let amount_b = math_amm::quote(amount_a, reserve_a, reserve_b);
        
        assert!(amount_b == 3000, 0);
    }

    #[test]
    #[expected_failure(abort_code = 0x10002)]
    fun test_get_amount_out_zero_input_fails() {
        math_amm::get_amount_out(0, 10000, 10000);
    }

    #[test]
    #[expected_failure(abort_code = 0x30001)]
    fun test_get_amount_out_zero_reserves_fails() {
        math_amm::get_amount_out(1000, 0, 10000);
    }

    #[test]
    #[expected_failure(abort_code = 0x10002)]
    fun test_get_amount_in_exceeds_reserves_fails() {
        math_amm::get_amount_in(10001, 10000, 10000);
    }
}