#[test_only]
module simple_dex::swap_tests {
    use simple_dex::swap;
    use simple_dex::test_utils;
    use cedra_framework::account;
    use cedra_framework::primary_fungible_store;
    use std::signer;

    #[test(admin = @simple_dex, user = @0x123)]
    fun test_create_pair(admin: &signer, user: &signer) {
        account::create_account_for_test(signer::address_of(admin));
        account::create_account_for_test(signer::address_of(user));
        
        test_utils::init_test_coins(admin);
        
        let eth_metadata = test_utils::get_eth_metadata();
        let btc_metadata = test_utils::get_btc_metadata();
        
        let lp_metadata = swap::create_pair(user, eth_metadata, btc_metadata);
        
        assert!(swap::pair_exists(lp_metadata), 0);
        
        let (reserve_x, reserve_y) = swap::reserves(lp_metadata);
        assert!(reserve_x == 0, 1);
        assert!(reserve_y == 0, 2);
    }

    #[test(admin = @simple_dex, user = @0x123)]
    fun test_add_initial_liquidity(admin: &signer, user: &signer) {
        account::create_account_for_test(signer::address_of(admin));
        account::create_account_for_test(signer::address_of(user));
        
        test_utils::init_test_coins(admin);
        
        let eth_metadata = test_utils::get_eth_metadata();
        let btc_metadata = test_utils::get_btc_metadata();
        
        test_utils::mint_eth(user, 100000000);
        test_utils::mint_btc(user, 50000000);
        
        let lp_metadata = swap::create_pair(user, eth_metadata, btc_metadata);
        
        swap::add_liquidity(
            user,
            lp_metadata,
            eth_metadata,
            btc_metadata,
            10000000,
            5000000,
            10000000,
            5000000
        );
        
        let (reserve_x, reserve_y) = swap::reserves(lp_metadata);
        assert!(reserve_x == 10000000, 0);
        assert!(reserve_y == 5000000, 1);
        
        let lp_balance = primary_fungible_store::balance(signer::address_of(user), lp_metadata);
        assert!(lp_balance == 7071067, 2);
    }

    #[test(admin = @simple_dex, user1 = @0x123, user2 = @0x456)]
    fun test_add_liquidity_with_ratio(admin: &signer, user1: &signer, user2: &signer) {
        account::create_account_for_test(signer::address_of(admin));
        account::create_account_for_test(signer::address_of(user1));
        account::create_account_for_test(signer::address_of(user2));
        
        test_utils::init_test_coins(admin);
        
        let eth_metadata = test_utils::get_eth_metadata();
        let btc_metadata = test_utils::get_btc_metadata();
        
        test_utils::mint_eth(user1, 100000000);
        test_utils::mint_btc(user1, 50000000);
        test_utils::mint_eth(user2, 100000000);
        test_utils::mint_btc(user2, 50000000);
        
        let lp_metadata = swap::create_pair(user1, eth_metadata, btc_metadata);
        
        swap::add_liquidity(
            user1,
            lp_metadata,
            eth_metadata,
            btc_metadata,
            10000000,
            5000000,
            10000000,
            5000000
        );
        
        swap::add_liquidity(
            user2,
            lp_metadata,
            eth_metadata,
            btc_metadata,
            20000000,
            15000000,
            20000000,
            10000000
        );
        
        let (reserve_x, reserve_y) = swap::reserves(lp_metadata);
        assert!(reserve_x == 30000000, 0);
        assert!(reserve_y == 15000000, 1);
        
        let user2_eth_balance = test_utils::eth_balance(signer::address_of(user2));
        assert!(user2_eth_balance == 80000000, 2);
    }

    #[test(admin = @simple_dex, user = @0x123)]
    fun test_swap_exact_input(admin: &signer, user: &signer) {
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
            50000000,
            100000000,
            50000000
        );
        
        let initial_eth_balance = test_utils::eth_balance(signer::address_of(user));
        let initial_btc_balance = test_utils::btc_balance(signer::address_of(user));
        
        swap::swap_exact_input(
            user,
            lp_metadata,
            eth_metadata,
            btc_metadata,
            10000000,
            4500000
        );
        
        let final_eth_balance = test_utils::eth_balance(signer::address_of(user));
        let final_btc_balance = test_utils::btc_balance(signer::address_of(user));
        
        assert!(final_eth_balance == initial_eth_balance - 10000000, 0);
        assert!(final_btc_balance > initial_btc_balance, 1);
        assert!(final_btc_balance >= initial_btc_balance + 4500000, 2);
    }

    #[test(admin = @simple_dex, user = @0x123)]
    fun test_swap_affects_price(admin: &signer, user: &signer) {
        account::create_account_for_test(signer::address_of(admin));
        account::create_account_for_test(signer::address_of(user));
        
        test_utils::init_test_coins(admin);
        
        let eth_metadata = test_utils::get_eth_metadata();
        let btc_metadata = test_utils::get_btc_metadata();
        
        test_utils::mint_eth(user, 300000000);
        test_utils::mint_btc(user, 150000000);
        
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
        
        let (initial_reserve_x, initial_reserve_y) = swap::reserves(lp_metadata);
        
        swap::swap_exact_input(
            user,
            lp_metadata,
            eth_metadata,
            btc_metadata,
            10000000,
            0
        );
        
        let (final_reserve_x, final_reserve_y) = swap::reserves(lp_metadata);
        
        assert!(final_reserve_x > initial_reserve_x, 0);
        assert!(final_reserve_y < initial_reserve_y, 1);
        
        let initial_price = (initial_reserve_y as u128) * 1000000 / (initial_reserve_x as u128);
        let final_price = (final_reserve_y as u128) * 1000000 / (final_reserve_x as u128);
        assert!(final_price < initial_price, 2);
    }

    #[test(admin = @simple_dex, user = @0x123)]
    #[expected_failure(abort_code = swap::ERROR_ZERO_AMOUNT)]
    fun test_swap_zero_amount_fails(admin: &signer, user: &signer) {
        account::create_account_for_test(signer::address_of(admin));
        account::create_account_for_test(signer::address_of(user));
        
        test_utils::init_test_coins(admin);
        
        let eth_metadata = test_utils::get_eth_metadata();
        let btc_metadata = test_utils::get_btc_metadata();
        
        let lp_metadata = swap::create_pair(user, eth_metadata, btc_metadata);
        
        swap::swap_exact_input(
            user,
            lp_metadata,
            eth_metadata,
            btc_metadata,
            0,
            0
        );
    }
}