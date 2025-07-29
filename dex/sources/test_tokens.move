module simple_dex::test_tokens {
    use std::string;
    use std::signer;
    use cedra_framework::fungible_asset::{Self, MintRef, Metadata};
    use cedra_framework::object::{Self, Object};
    use cedra_framework::option;
    use cedra_framework::primary_fungible_store;

    struct TestETH has key {
        mint_ref: MintRef,
    }

    struct TestBTC has key {
        mint_ref: MintRef,
    }

    struct TestUSDC has key {
        mint_ref: MintRef,
    }

    const ASSET_SYMBOL_ETH: vector<u8> = b"tETH";
    const ASSET_SYMBOL_BTC: vector<u8> = b"tBTC";
    const ASSET_SYMBOL_USDC: vector<u8> = b"tUSDC";

    fun init_module(admin: &signer) {
        create_test_eth(admin);
        create_test_btc(admin);
        create_test_usdc(admin);
    }

    fun create_test_eth(admin: &signer) {
        let constructor_ref = &object::create_named_object(admin, ASSET_SYMBOL_ETH);
        
        primary_fungible_store::create_primary_store_enabled_fungible_asset(
            constructor_ref,
            option::none(),
            string::utf8(b"Test ETH"),
            string::utf8(ASSET_SYMBOL_ETH),
            8,
            string::utf8(b"https://example.com/eth.png"),
            string::utf8(b"https://example.com"),
        );

        let mint_ref = fungible_asset::generate_mint_ref(constructor_ref);
        let eth_signer = object::generate_signer(constructor_ref);
        move_to(&eth_signer, TestETH { mint_ref });
    }

    fun create_test_btc(admin: &signer) {
        let constructor_ref = &object::create_named_object(admin, ASSET_SYMBOL_BTC);
        
        primary_fungible_store::create_primary_store_enabled_fungible_asset(
            constructor_ref,
            option::none(),
            string::utf8(b"Test BTC"),
            string::utf8(ASSET_SYMBOL_BTC),
            8,
            string::utf8(b"https://example.com/btc.png"),
            string::utf8(b"https://example.com"),
        );

        let mint_ref = fungible_asset::generate_mint_ref(constructor_ref);
        let btc_signer = object::generate_signer(constructor_ref);
        move_to(&btc_signer, TestBTC { mint_ref });
    }

    fun create_test_usdc(admin: &signer) {
        let constructor_ref = &object::create_named_object(admin, ASSET_SYMBOL_USDC);
        
        primary_fungible_store::create_primary_store_enabled_fungible_asset(
            constructor_ref,
            option::none(),
            string::utf8(b"Test USDC"),
            string::utf8(ASSET_SYMBOL_USDC),
            8,
            string::utf8(b"https://example.com/usdc.png"),
            string::utf8(b"https://example.com"),
        );

        let mint_ref = fungible_asset::generate_mint_ref(constructor_ref);
        let usdc_signer = object::generate_signer(constructor_ref);
        move_to(&usdc_signer, TestUSDC { mint_ref });
    }

    public entry fun mint_eth(recipient: &signer, amount: u64) acquires TestETH {
        let recipient_addr = signer::address_of(recipient);
        let metadata = get_eth_metadata();
        let eth_addr = object::object_address(&metadata);
        let test_eth = borrow_global<TestETH>(eth_addr);
        let fa = fungible_asset::mint(&test_eth.mint_ref, amount);
        primary_fungible_store::deposit(recipient_addr, fa);
    }

    public entry fun mint_btc(recipient: &signer, amount: u64) acquires TestBTC {
        let recipient_addr = signer::address_of(recipient);
        let metadata = get_btc_metadata();
        let btc_addr = object::object_address(&metadata);
        let test_btc = borrow_global<TestBTC>(btc_addr);
        let fa = fungible_asset::mint(&test_btc.mint_ref, amount);
        primary_fungible_store::deposit(recipient_addr, fa);
    }

    public entry fun mint_usdc(recipient: &signer, amount: u64) acquires TestUSDC {
        let recipient_addr = signer::address_of(recipient);
        let metadata = get_usdc_metadata();
        let usdc_addr = object::object_address(&metadata);
        let test_usdc = borrow_global<TestUSDC>(usdc_addr);
        let fa = fungible_asset::mint(&test_usdc.mint_ref, amount);
        primary_fungible_store::deposit(recipient_addr, fa);
    }

    #[view]
    public fun get_eth_metadata(): Object<Metadata> {
        let metadata_address = object::create_object_address(&@simple_dex, ASSET_SYMBOL_ETH);
        object::address_to_object<Metadata>(metadata_address)
    }

    #[view]
    public fun get_btc_metadata(): Object<Metadata> {
        let metadata_address = object::create_object_address(&@simple_dex, ASSET_SYMBOL_BTC);
        object::address_to_object<Metadata>(metadata_address)
    }

    #[view]
    public fun get_usdc_metadata(): Object<Metadata> {
        let metadata_address = object::create_object_address(&@simple_dex, ASSET_SYMBOL_USDC);
        object::address_to_object<Metadata>(metadata_address)
    }
}