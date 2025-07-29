#[test_only]
module simple_dex::test_utils {
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
    
    struct TestMetadata has key {
        eth_metadata: Object<Metadata>,
        btc_metadata: Object<Metadata>,
    }

    const ASSET_SYMBOL_ETH: vector<u8> = b"tETH";
    const ASSET_SYMBOL_BTC: vector<u8> = b"tBTC";

    public fun init_test_coins(admin: &signer) {
        let eth_metadata = create_test_eth(admin);
        let btc_metadata = create_test_btc(admin);
        
        move_to(admin, TestMetadata {
            eth_metadata,
            btc_metadata,
        });
    }

    fun create_test_eth(admin: &signer): Object<Metadata> {
        let constructor_ref = &object::create_sticky_object(signer::address_of(admin));
        
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
        let metadata = object::object_from_constructor_ref<Metadata>(constructor_ref);
        let eth_signer = object::generate_signer(constructor_ref);
        move_to(&eth_signer, TestETH { mint_ref });
        
        metadata
    }

    fun create_test_btc(admin: &signer): Object<Metadata> {
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
        let metadata = object::object_from_constructor_ref<Metadata>(constructor_ref);
        let btc_signer = object::generate_signer(constructor_ref);
        move_to(&btc_signer, TestBTC { mint_ref });
        
        metadata
    }

    public fun mint_eth(recipient: &signer, amount: u64) acquires TestETH, TestMetadata {
        let recipient_addr = signer::address_of(recipient);
        let metadata = get_eth_metadata();
        let eth_addr = object::object_address(&metadata);
        let test_eth = borrow_global<TestETH>(eth_addr);
        let fa = fungible_asset::mint(&test_eth.mint_ref, amount);
        primary_fungible_store::deposit(recipient_addr, fa);
    }

    public fun mint_btc(recipient: &signer, amount: u64) acquires TestBTC, TestMetadata {
        let recipient_addr = signer::address_of(recipient);
        let metadata = get_btc_metadata();
        let btc_addr = object::object_address(&metadata);
        let test_btc = borrow_global<TestBTC>(btc_addr);
        let fa = fungible_asset::mint(&test_btc.mint_ref, amount);
        primary_fungible_store::deposit(recipient_addr, fa);
    }

    public fun get_eth_metadata(): Object<Metadata> acquires TestMetadata {
        let test_metadata = borrow_global<TestMetadata>(@simple_dex);
        test_metadata.eth_metadata
    }

    public fun get_btc_metadata(): Object<Metadata> acquires TestMetadata {
        let test_metadata = borrow_global<TestMetadata>(@simple_dex);
        test_metadata.btc_metadata
    }

    public fun eth_balance(account: address): u64 acquires TestMetadata {
        primary_fungible_store::balance(account, get_eth_metadata())
    }

    public fun btc_balance(account: address): u64 acquires TestMetadata {
        primary_fungible_store::balance(account, get_btc_metadata())
    }
}