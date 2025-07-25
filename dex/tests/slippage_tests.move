#[test_only]
module simple_dex::slippage_tests {
    use simple_dex::slippage;
    use simple_dex::swap;
    use simple_dex::test_utils;
    use cedra_framework::account;
    use cedra_framework::fungible_asset::{Self, Metadata};
    use cedra_framework::object::{Self, Object};
    use std::signer;

    #[test]
    fun test_calculate_price_impact_small() {
        let amount_in = 100;
        let reserve_in = 1000000;
        let reserve_out = 1000000;
        
        let price_impact = slippage::calculate_price_impact(amount_in, reserve_in, reserve_out);
        
        assert!(price_impact < 10, 0);
    }

    #[test]
    fun test_calculate_price_impact_large() {
        let amount_in = 100000;
        let reserve_in = 1000000;
        let reserve_out = 1000000;
        
        let price_impact = slippage::calculate_price_impact(amount_in, reserve_in, reserve_out);
        
        assert!(price_impact > 900, 0);
        assert!(price_impact < 1800, 1);
    }

    #[test]
    fun test_validate_slippage_within_tolerance() {
        let expected_output = 10000;
        let actual_output = 9800;
        let max_slippage_bps = 300;
        
        slippage::validate_slippage(expected_output, actual_output, max_slippage_bps);
    }

    #[test]
    fun test_validate_slippage_zero_slippage() {
        let expected_output = 10000;
        let actual_output = 10000;
        let max_slippage_bps = 100;
        
        slippage::validate_slippage(expected_output, actual_output, max_slippage_bps);
    }

    #[test]
    #[expected_failure(abort_code = slippage::ERROR_SLIPPAGE_TOO_HIGH)]
    fun test_validate_slippage_exceeds_tolerance() {
        let expected_output = 10000;
        let actual_output = 9000;
        let max_slippage_bps = 500;
        
        slippage::validate_slippage(expected_output, actual_output, max_slippage_bps);
    }

    #[test(admin = @simple_dex, user = @0x123)]
    fun test_safe_swap_with_protection(admin: &signer, user: &signer) {
        account::create_account_for_test(signer::address_of(admin));
        account::create_account_for_test(signer::address_of(user));
        
        test_utils::init_test_coins(admin);
        
        let eth_metadata = test_utils::get_eth_metadata();
        let btc_metadata = test_utils::get_btc_metadata();
        
        test_utils::mint_eth(user, 200000000);
        test_utils::mint_btc(user, 100000000);
        
        let lp_metadata = swap::create_pair(user, eth_metadata, btc_metadata);
        
        swap::add_liquidity(
            user,
            lp_metadata,
            eth_metadata,
            btc_metadata,
            100000000,
            100000000,
            100000000,
            100000000
        );
        
        let initial_eth_balance = test_utils::eth_balance(signer::address_of(user));
        let initial_btc_balance = test_utils::btc_balance(signer::address_of(user));
        
        slippage::safe_swap(
            user,
            lp_metadata,
            eth_metadata,
            btc_metadata,
            1000000,
            985000,
            100
        );
        
        let final_eth_balance = test_utils::eth_balance(signer::address_of(user));
        let final_btc_balance = test_utils::btc_balance(signer::address_of(user));
        
        assert!(final_eth_balance == initial_eth_balance - 1000000, 0);
        assert!(final_btc_balance >= initial_btc_balance + 985000, 1);
    }

    #[test(admin = @simple_dex, user = @0x123)]
    #[expected_failure(abort_code = slippage::ERROR_PRICE_IMPACT_TOO_HIGH)]
    fun test_safe_swap_price_impact_protection(admin: &signer, user: &signer) {
        account::create_account_for_test(signer::address_of(admin));
        account::create_account_for_test(signer::address_of(user));
        
        test_utils::init_test_coins(admin);
        
        let eth_metadata = test_utils::get_eth_metadata();
        let btc_metadata = test_utils::get_btc_metadata();
        
        test_utils::mint_eth(user, 200000000);
        test_utils::mint_btc(user, 100000000);
        
        let lp_metadata = swap::create_pair(user, eth_metadata, btc_metadata);
        
        swap::add_liquidity(
            user,
            lp_metadata,
            eth_metadata,
            btc_metadata,
            100000000,
            100000000,
            100000000,
            100000000
        );
        
        slippage::safe_swap(
            user,
            lp_metadata,
            eth_metadata,
            btc_metadata,
            50000000,
            0,
            10000
        );
    }
}