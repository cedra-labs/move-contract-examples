// TODO: discuss all swaps scenarios.
/// Basic token swapping using AMM principles
module simple_dex::swap {
    use std::signer;
    use std::string;
    use std::math64;
    use cedra_framework::fungible_asset::{Self, FungibleAsset, FungibleStore, Metadata};
    use cedra_framework::object::{Self, ExtendRef, Object};
    use cedra_framework::option;
    use cedra_framework::primary_fungible_store;
    use simple_dex::math_amm;
    
    const ERROR_PAIR_NOT_EXISTS: u64 = 1;
    const ERROR_INSUFFICIENT_OUTPUT: u64 = 2;
    const ERROR_ZERO_AMOUNT: u64 = 3;
    
    /// LP Token for trading pairs
    struct LPToken has key {}
    
    /// Trading pair with reserves
    struct TradingPair has key {
        reserve_x: Object<FungibleStore>,
        reserve_y: Object<FungibleStore>,
        mint_ref: fungible_asset::MintRef,
        burn_ref: fungible_asset::BurnRef,
        extend_ref: ExtendRef,
        reserve_x_ref: ExtendRef,
        reserve_y_ref: ExtendRef
    }
    
    /// Create a new trading pair
    public fun create_pair(lp_creator: &signer, x_metadata: Object<Metadata>, y_metadata: Object<Metadata>): Object<Metadata> { 
        let constructor_ref = &object::create_sticky_object(signer::address_of(lp_creator));
        let maximum_supply = option::none(); // Unlimited supply for LPs
        primary_fungible_store::create_primary_store_enabled_fungible_asset(
            constructor_ref,
            maximum_supply,
            string::utf8(b"HI LP"), // LP name // TODO: create based on tokens?
            string::utf8(b"https://simple.dex/lp.png"), // Icon URL
            8, // Decimals; 8 is used since this is typical for FAs on Cedra
            string::utf8(b"https://simple.dex/lp.png"), // Icon URL
            string::utf8(b"https://simple.dex") // Project URL
        );
        // Generate references for minting, burning, and transferring LPs
        let mint_ref = fungible_asset::generate_mint_ref(constructor_ref);
        let burn_ref = fungible_asset::generate_burn_ref(constructor_ref);
        let extend_ref = object::generate_extend_ref(constructor_ref);

        let lp_metadata = object::object_from_constructor_ref<Metadata>(constructor_ref);
        
        // Create separate objects for each reserve
        let reserve_x_constructor = &object::create_object(signer::address_of(lp_creator));
        let reserve_y_constructor = &object::create_object(signer::address_of(lp_creator));
        
        let reserve_x_ref = object::generate_extend_ref(reserve_x_constructor);
        let reserve_y_ref = object::generate_extend_ref(reserve_y_constructor);
        
        move_to(
            &object::generate_signer(constructor_ref),
            TradingPair {
                reserve_x: fungible_asset::create_store(reserve_x_constructor, x_metadata),
                reserve_y: fungible_asset::create_store(reserve_y_constructor, y_metadata),
                mint_ref,
                burn_ref,
                extend_ref,
                reserve_x_ref,
                reserve_y_ref
            }
        );
        
        lp_metadata
    }
    
    /// Swap exact input for output
    public entry fun swap_exact_input(
        user: &signer,
        lp_metadata: Object<Metadata>,
        // NOTE: for demo purposes to keep things simple
        x_metadata: Object<Metadata>,
        y_metadata: Object<Metadata>,
        amount_in: u64,
        min_amount_out: u64
    ) acquires TradingPair {
        assert!(amount_in > 0, ERROR_ZERO_AMOUNT);
        let lp_addr = object::object_address(&lp_metadata);
        let pair = borrow_global_mut<TradingPair>(lp_addr);
        let reserve_in = fungible_asset::balance(pair.reserve_x);
        let reserve_out = fungible_asset::balance(pair.reserve_y);
        
        // Calculate output using AMM math
        let amount_out = math_amm::get_amount_out(amount_in, reserve_in, reserve_out);
        assert!(amount_out >= min_amount_out, ERROR_INSUFFICIENT_OUTPUT);
        
        // Execute swap - withdraw from user and deposit to reserve
        let asset_in = primary_fungible_store::withdraw(user, x_metadata, amount_in);
        fungible_asset::deposit(pair.reserve_x, asset_in);

        let fa = fungible_asset::withdraw(
            &object::generate_signer_for_extending(&pair.reserve_y_ref),
            pair.reserve_y,
            amount_out
        );
        primary_fungible_store::deposit(signer::address_of(user), fa);
    }
    
    /// Add liquidity with proper ratio calculation
    public entry fun add_liquidity(
        user: &signer,
        lp_metadata: Object<Metadata>,
        // NOTE: for demo purposes to keep things simple
        x_metadata: Object<Metadata>,
        y_metadata: Object<Metadata>,
        amount_x_desired: u64,
        amount_y_desired: u64,
        amount_x_min: u64,
        amount_y_min: u64
    ) acquires TradingPair {
        let lp_addr = object::object_address(&lp_metadata);
        let pair = borrow_global_mut<TradingPair>(lp_addr);
        let reserve_x = fungible_asset::balance(pair.reserve_x);
        let reserve_y = fungible_asset::balance(pair.reserve_y);
        
        let (amount_x, amount_y) = if (reserve_x == 0 && reserve_y == 0) {
            // First liquidity provision
            (amount_x_desired, amount_y_desired)
        } else {
            // Calculate optimal amounts
            let amount_y_optimal = math_amm::quote(amount_x_desired, reserve_x, reserve_y);
            if (amount_y_optimal <= amount_y_desired) {
                assert!(amount_y_optimal >= amount_y_min, ERROR_INSUFFICIENT_OUTPUT);
                (amount_x_desired, amount_y_optimal)
            } else {
                let amount_x_optimal = math_amm::quote(amount_y_desired, reserve_y, reserve_x);
                assert!(amount_x_optimal <= amount_x_desired, ERROR_INSUFFICIENT_OUTPUT);
                assert!(amount_x_optimal >= amount_x_min, ERROR_INSUFFICIENT_OUTPUT);
                (amount_x_optimal, amount_y_desired)
            }
        };
        
        // Add tokens to pool and mint LP tokens
        let asset_x = primary_fungible_store::withdraw(user, x_metadata, amount_x);
        let asset_y = primary_fungible_store::withdraw(user, y_metadata, amount_y);
        
        fungible_asset::deposit(pair.reserve_x, asset_x);
        fungible_asset::deposit(pair.reserve_y, asset_y);
        
        // Calculate LP tokens to mint
        let lp_amount = if (reserve_x == 0 && reserve_y == 0) {
            // Initial liquidity: use sqrt of product
            std::math64::sqrt(amount_x * amount_y)
        } else {
            // Get current LP supply
            let lp_supply_opt = fungible_asset::supply(lp_metadata);
            let lp_supply = option::extract(&mut lp_supply_opt);
            // Mint proportional to the minimum ratio
            std::math64::min(
                ((amount_x as u128) * lp_supply / (reserve_x as u128) as u64),
                ((amount_y as u128) * lp_supply / (reserve_y as u128) as u64)
            )
        };
        let lp_tokens = fungible_asset::mint(&pair.mint_ref, lp_amount);
        
        primary_fungible_store::deposit(signer::address_of(user), lp_tokens);
    }

    #[view]
    public fun reserves(lp_metadata: Object<Metadata>): (u64, u64) acquires TradingPair {
        let lp_addr = object::object_address(&lp_metadata);
        let pair = borrow_global<TradingPair>(lp_addr);
        
        (
            fungible_asset::balance(pair.reserve_x),
            fungible_asset::balance(pair.reserve_y)
        )
    }

    #[view]
    public fun pair_exists(
        lp_metadata: Object<Metadata>
    ): bool {
        let lp_addr = object::object_address(&lp_metadata);
        exists<TradingPair>(lp_addr)
    }
}