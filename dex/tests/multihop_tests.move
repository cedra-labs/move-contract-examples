#[test_only]
module simple_dex::multihop_tests {
    use simple_dex::multihop;
    use simple_dex::swap;
    use simple_dex::test_utils;
    use simple_dex::math_amm;
    use cedra_framework::account;
    use cedra_framework::fungible_asset::{Self, Metadata};
    use cedra_framework::object::{Self, Object};
    use cedra_framework::primary_fungible_store;
    use std::signer;
    use std::string;

    struct TestUSDC has key {
        mint_ref: fungible_asset::MintRef,
    }

    fun create_test_usdc(admin: &signer): Object<Metadata> {
        let constructor_ref = &object::create_named_object(admin, b"tUSDC");
        
        primary_fungible_store::create_primary_store_enabled_fungible_asset(
            constructor_ref,
            cedra_framework::option::none(),
            string::utf8(b"Test USDC"),
            string::utf8(b"tUSDC"),
            8,
            string::utf8(b"https://example.com/usdc.png"),
            string::utf8(b"https://example.com"),
        );

        let mint_ref = fungible_asset::generate_mint_ref(constructor_ref);
        let usdc_signer = object::generate_signer(constructor_ref);
        move_to(&usdc_signer, TestUSDC { mint_ref });

        let usdc_addr = object::create_object_address(&@simple_dex, b"tUSDC");
        object::address_to_object<Metadata>(usdc_addr)
    }

    fun mint_usdc(recipient: &signer, amount: u64) acquires TestUSDC {
        let recipient_addr = signer::address_of(recipient);
        let usdc_addr = object::create_object_address(&@simple_dex, b"tUSDC");
        let test_usdc = borrow_global<TestUSDC>(usdc_addr);
        let fa = fungible_asset::mint(&test_usdc.mint_ref, amount);
        primary_fungible_store::deposit(recipient_addr, fa);
    }

    #[test(admin = @simple_dex, user = @0x123)]
    fun test_multihop_swap_basic(admin: &signer, user: &signer) acquires TestUSDC {
        account::create_account_for_test(signer::address_of(admin));
        account::create_account_for_test(signer::address_of(user));
        
        test_utils::init_test_coins(admin);
        let usdc_metadata = create_test_usdc(admin);
        
        let eth_metadata = test_utils::get_eth_metadata();
        let btc_metadata = test_utils::get_btc_metadata();
        
        test_utils::mint_eth(user, 200000000);
        test_utils::mint_btc(user, 100000000);
        mint_usdc(user, 300000000);
        
        let eth_btc_lp = swap::create_pair(user, eth_metadata, btc_metadata);
        
        swap::add_liquidity(
            user,
            eth_btc_lp,
            eth_metadata,
            btc_metadata,
            100000000,
            50000000,
            100000000,
            50000000
        );
        
        let btc_usdc_lp = swap::create_pair(user, btc_metadata, usdc_metadata);
        
        swap::add_liquidity(
            user,
            btc_usdc_lp,
            btc_metadata,
            usdc_metadata,
            25000000,
            100000000,
            25000000,
            100000000
        );
        
        let initial_eth = test_utils::eth_balance(signer::address_of(user));
        let initial_usdc = primary_fungible_store::balance(signer::address_of(user), usdc_metadata);
        
        multihop::swap_exact_input_multihop(
            user,
            eth_btc_lp,
            btc_usdc_lp,
            eth_metadata,
            btc_metadata,
            usdc_metadata,
            10000000,
            15000000
        );
        
        let final_eth = test_utils::eth_balance(signer::address_of(user));
        let final_usdc = primary_fungible_store::balance(signer::address_of(user), usdc_metadata);
        
        assert!(final_eth == initial_eth - 10000000, 0);
        assert!(final_usdc > initial_usdc + 15000000, 1);
    }

    #[test(admin = @simple_dex, user = @0x123)]
    fun test_multihop_better_than_direct(admin: &signer, user: &signer) acquires TestUSDC {
        account::create_account_for_test(signer::address_of(admin));
        account::create_account_for_test(signer::address_of(user));
        
        test_utils::init_test_coins(admin);
        let usdc_metadata = create_test_usdc(admin);
        
        let eth_metadata = test_utils::get_eth_metadata();
        let btc_metadata = test_utils::get_btc_metadata();
        
        test_utils::mint_eth(user, 500000000);
        test_utils::mint_btc(user, 200000000);
        mint_usdc(user, 500000000);
        
        let eth_btc_lp = swap::create_pair(user, eth_metadata, btc_metadata);
        
        swap::add_liquidity(
            user,
            eth_btc_lp,
            eth_metadata,
            btc_metadata,
            100000000,
            100000000,
            100000000,
            100000000
        );
        
        let btc_usdc_lp = swap::create_pair(user, btc_metadata, usdc_metadata);
        
        swap::add_liquidity(
            user,
            btc_usdc_lp,
            btc_metadata,
            usdc_metadata,
            50000000,
            200000000,
            50000000,
            200000000
        );
        
        let eth_usdc_lp = swap::create_pair(user, eth_metadata, usdc_metadata);
        
        swap::add_liquidity(
            user,
            eth_usdc_lp,
            eth_metadata,
            usdc_metadata,
            10000000,
            10000000,
            10000000,
            10000000
        );
        
        let (eth_btc_res_x, eth_btc_res_y) = swap::reserves(eth_btc_lp);
        let (btc_usdc_res_x, btc_usdc_res_y) = swap::reserves(btc_usdc_lp);
        let (eth_usdc_res_x, eth_usdc_res_y) = swap::reserves(eth_usdc_lp);
        
        let multihop_btc_out = math_amm::get_amount_out(10000000, eth_btc_res_x, eth_btc_res_y);
        let multihop_usdc_out = math_amm::get_amount_out(multihop_btc_out, btc_usdc_res_x, btc_usdc_res_y);
        
        let direct_usdc_out = math_amm::get_amount_out(10000000, eth_usdc_res_x, eth_usdc_res_y);
        
        assert!(multihop_usdc_out > direct_usdc_out, 0);
    }

    #[test(admin = @simple_dex, user = @0x123)]
    fun test_multihop_minimum_output(admin: &signer, user: &signer) acquires TestUSDC {
        account::create_account_for_test(signer::address_of(admin));
        account::create_account_for_test(signer::address_of(user));
        
        test_utils::init_test_coins(admin);
        let usdc_metadata = create_test_usdc(admin);
        
        let eth_metadata = test_utils::get_eth_metadata();
        let btc_metadata = test_utils::get_btc_metadata();
        
        test_utils::mint_eth(user, 200000000);
        test_utils::mint_btc(user, 100000000);
        mint_usdc(user, 300000000);
        
        let eth_btc_lp = swap::create_pair(user, eth_metadata, btc_metadata);
        
        swap::add_liquidity(
            user,
            eth_btc_lp,
            eth_metadata,
            btc_metadata,
            100000000,
            50000000,
            100000000,
            50000000
        );
        
        let btc_usdc_lp = swap::create_pair(user, btc_metadata, usdc_metadata);
        
        swap::add_liquidity(
            user,
            btc_usdc_lp,
            btc_metadata,
            usdc_metadata,
            25000000,
            100000000,
            25000000,
            100000000
        );
        
        let (eth_btc_res_x, eth_btc_res_y) = swap::reserves(eth_btc_lp);
        let (btc_usdc_res_x, btc_usdc_res_y) = swap::reserves(btc_usdc_lp);
        
        let expected_btc = math_amm::get_amount_out(5000000, eth_btc_res_x, eth_btc_res_y);
        let expected_usdc = math_amm::get_amount_out(expected_btc, btc_usdc_res_x, btc_usdc_res_y);
        let min_output = expected_usdc * 95 / 100;
        
        let initial_usdc = primary_fungible_store::balance(signer::address_of(user), usdc_metadata);
        
        multihop::swap_exact_input_multihop(
            user,
            eth_btc_lp,
            btc_usdc_lp,
            eth_metadata,
            btc_metadata,
            usdc_metadata,
            5000000,
            min_output
        );
        
        let final_usdc = primary_fungible_store::balance(signer::address_of(user), usdc_metadata);
        
        assert!(final_usdc >= initial_usdc + min_output, 0);
    }

    #[test(admin = @simple_dex, user = @0x123)]
    #[expected_failure(abort_code = multihop::ERROR_INSUFFICIENT_OUTPUT)]
    fun test_multihop_insufficient_output_fails(admin: &signer, user: &signer) acquires TestUSDC {
        account::create_account_for_test(signer::address_of(admin));
        account::create_account_for_test(signer::address_of(user));
        
        test_utils::init_test_coins(admin);
        let usdc_metadata = create_test_usdc(admin);
        
        let eth_metadata = test_utils::get_eth_metadata();
        let btc_metadata = test_utils::get_btc_metadata();
        
        test_utils::mint_eth(user, 200000000);
        test_utils::mint_btc(user, 100000000);
        mint_usdc(user, 300000000);
        
        let eth_btc_lp = swap::create_pair(user, eth_metadata, btc_metadata);
        
        swap::add_liquidity(
            user,
            eth_btc_lp,
            eth_metadata,
            btc_metadata,
            100000000,
            50000000,
            100000000,
            50000000
        );
        
        let btc_usdc_lp = swap::create_pair(user, btc_metadata, usdc_metadata);
        
        swap::add_liquidity(
            user,
            btc_usdc_lp,
            btc_metadata,
            usdc_metadata,
            25000000,
            100000000,
            25000000,
            100000000
        );
        
        multihop::swap_exact_input_multihop(
            user,
            eth_btc_lp,
            btc_usdc_lp,
            eth_metadata,
            btc_metadata,
            usdc_metadata,
            10000000,
            50000000
        );
    }
}