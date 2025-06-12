module pancake::router {
    use pancake::swap;
    use std::signer;
    use aptos_framework::fungible_asset::{Self, FungibleAsset, Metadata};
    use aptos_framework::object::{Self, Object};
    use pancake::swap_utils;

    //
    // Errors.
    //

    /// Output amount is less than required
    const E_OUTPUT_LESS_THAN_MIN: u64 = 0;
    /// Require Input amount is more than max limit
    const E_INPUT_MORE_THAN_MAX: u64 = 1;
    /// Insufficient X
    const E_INSUFFICIENT_X_AMOUNT: u64 = 2;
    /// Insufficient Y
    const E_INSUFFICIENT_Y_AMOUNT: u64 = 3;
    /// Pair is not created
    const E_PAIR_NOT_CREATED: u64 = 4;

    /// Create a Pair from 2 FAs
    /// Should revert if the pair is already created
    public entry fun create_pair(
        sender: &signer,
        x_metadata: Object<Metadata>,
        y_metadata: Object<Metadata>
    ) {
        if (swap_utils::sort_token_type(x_metadata, y_metadata)) {
            swap::create_pair(sender, x_metadata, y_metadata);
        } else {
            swap::create_pair(sender, y_metadata, x_metadata);
        }
    }


    /// Add Liquidity, create pair if it's needed
    public entry fun add_liquidity(
        sender: &signer,
        x_metadata: Object<Metadata>,
        y_metadata: Object<Metadata>,
        amount_x_desired: u64,
        amount_y_desired: u64,
        amount_x_min: u64,
        amount_y_min: u64,
    ) {
        if (!(swap::is_pair_created(x_metadata, y_metadata) || swap::is_pair_created(y_metadata, x_metadata))) {
            create_pair(sender, x_metadata, y_metadata);
        };

        let amount_x;
        let amount_y;
        let _lp_amount;
        if (swap_utils::sort_token_type(x_metadata, y_metadata)) {
            (amount_x, amount_y, _lp_amount) = swap::add_liquidity(sender, x_metadata, y_metadata, amount_x_desired, amount_y_desired);
            assert!(amount_x >= amount_x_min, E_INSUFFICIENT_X_AMOUNT);
            assert!(amount_y >= amount_y_min, E_INSUFFICIENT_Y_AMOUNT);
        } else {
            (amount_y, amount_x, _lp_amount) = swap::add_liquidity(sender, y_metadata, x_metadata, amount_y_desired, amount_x_desired);
            assert!(amount_x >= amount_x_min, E_INSUFFICIENT_X_AMOUNT);
            assert!(amount_y >= amount_y_min, E_INSUFFICIENT_Y_AMOUNT);
        };
    }

    fun is_pair_created_internal(
        x_metadata: Object<Metadata>,
        y_metadata: Object<Metadata>,
    ){
        assert!(swap::is_pair_created(x_metadata, y_metadata) || swap::is_pair_created(y_metadata, x_metadata), E_PAIR_NOT_CREATED);
    }

    /// Remove Liquidity
    public entry fun remove_liquidity(
        sender: &signer,
        x_metadata: Object<Metadata>,
        y_metadata: Object<Metadata>,
        liquidity: u64,
        amount_x_min: u64,
        amount_y_min: u64
    ) {
        is_pair_created_internal(x_metadata, y_metadata);
        let amount_x;
        let amount_y;
        if (swap_utils::sort_token_type(x_metadata, y_metadata)) {
            (amount_x, amount_y) = swap::remove_liquidity(sender, x_metadata, y_metadata, liquidity);
            assert!(amount_x >= amount_x_min, E_INSUFFICIENT_X_AMOUNT);
            assert!(amount_y >= amount_y_min, E_INSUFFICIENT_Y_AMOUNT);
        } else {
            (amount_y, amount_x) = swap::remove_liquidity(sender, y_metadata, x_metadata, liquidity);
            assert!(amount_x >= amount_x_min, E_INSUFFICIENT_X_AMOUNT);
            assert!(amount_y >= amount_y_min, E_INSUFFICIENT_Y_AMOUNT);
        }
    }

    fun add_swap_event_with_address_internal(
        sender_addr: address,
        x_metadata: Object<Metadata>,
        y_metadata: Object<Metadata>,
        amount_x_in: u64,
        amount_y_in: u64,
        amount_x_out: u64,
        amount_y_out: u64
    ) {
        if (swap_utils::sort_token_type(x_metadata, y_metadata)){
            swap::add_swap_event_with_address(sender_addr, x_metadata, y_metadata, amount_x_in, amount_y_in, amount_x_out, amount_y_out);
        } else {
            swap::add_swap_event_with_address(sender_addr, y_metadata, x_metadata, amount_y_in, amount_x_in, amount_y_out, amount_x_out);
        }
    }

    fun add_swap_event_internal(
        sender: &signer,
        x_metadata: Object<Metadata>,
        y_metadata: Object<Metadata>,
        amount_x_in: u64,
        amount_y_in: u64,
        amount_x_out: u64,
        amount_y_out: u64
    ) {
        let sender_addr = signer::address_of(sender);
        add_swap_event_with_address_internal(sender_addr, x_metadata, y_metadata, amount_x_in, amount_y_in, amount_x_out, amount_y_out);
    }

    /// Swap exact input amount of X to maxiumin possible amount of Y
    public entry fun swap_exact_input(
        sender: &signer,
        x_metadata: Object<Metadata>,
        y_metadata: Object<Metadata>,
        x_in: u64,
        y_min_out: u64,
    ) {
        is_pair_created_internal(x_metadata, y_metadata);
        let y_out = if (swap_utils::sort_token_type(x_metadata, y_metadata)) {
            swap::swap_exact_x_to_y(sender, x_metadata, y_metadata, x_in, signer::address_of(sender))
        } else {
            swap::swap_exact_y_to_x<Y, X>(sender, x_in, signer::address_of(sender))
        };
        assert!(y_out >= y_min_out, E_OUTPUT_LESS_THAN_MIN);
        add_swap_event_internal<X, Y>(sender, x_in, 0, 0, y_out);
    }

    /// Swap miniumn possible amount of X to exact output amount of Y
    public entry fun swap_exact_output(
        sender: &signer,
        x_metadata: Object<Metadata>,
        y_metadata: Object<Metadata>,
        y_out: u64,
        x_max_in: u64,
    ) {
        is_pair_created_internal(x_metadata, y_metadata);
        let x_in = if (swap_utils::sort_token_type(x_metadata, y_metadata)) {
            let (rin, rout, _) = swap::token_reserves(x_metadata, y_metadata);
            let amount_in = swap_utils::get_amount_in(y_out, rin, rout);
            swap::swap_x_to_exact_y(sender, x_metadata, y_metadata, amount_in, y_out, signer::address_of(sender))
        } else {
            let (rout, rin, _) = swap::token_reserves(y_metadata, x_metadata);
            let amount_in = swap_utils::get_amount_in(y_out, rin, rout);
            swap::swap_y_to_exact_x(sender, y_metadata, x_metadata, amount_in, y_out, signer::address_of(sender))
        };
        assert!(x_in <= x_max_in, E_INPUT_MORE_THAN_MAX);
        add_swap_event_internal(sender, x_metadata, y_metadata, x_in, 0, 0, y_out);
    }

    fun get_intermediate_output(
        x_metadata: Object<Metadata>,
        y_metadata: Object<Metadata>,
        is_x_to_y: bool, 
        x_in: FungibleAsset
    ): FungibleAsset {
        if (is_x_to_y) {
            let (x_out, y_out) = swap::swap_exact_x_to_y_direct(x_metadata, y_metadata, x_in);
            coin::destroy_zero(x_out);
            y_out
        }
        else {
            let (y_out, x_out) = swap::swap_exact_y_to_x_direct(y_metadata, x_metadata, x_in);
            coin::destroy_zero(x_out);
            y_out
        }
    }

    public fun swap_exact_x_to_y_direct_external(
        x_metadata: Object<Metadata>,
        y_metadata: Object<Metadata>,
        x_in: FungibleAsset
    ): FungibleAsset {
        is_pair_created_internal(x_metadata, y_metadata);
        let x_in_amount = coin::value(&x_in);
        let is_x_to_y = swap_utils::sort_token_type(x_metadata, y_metadata);
        let y_out = get_intermediate_output(x_metadata, y_metadata, is_x_to_y, x_in);
        let y_out_amount = coin::value(&y_out);
        add_swap_event_with_address_internal(x_metadata, y_metadata, @zero, x_in_amount, 0, 0, y_out_amount);
        y_out
    }

    fun get_intermediate_output_x_to_exact_y(
        x_metadata: Object<Metadata>,
        y_metadata: Object<Metadata>,
        is_x_to_y: bool,
        x_in: FungibleAsset,
        amount_out: u64
    ): FungibleAsset {
        if (is_x_to_y) {
            let (x_out, y_out) = swap::swap_x_to_exact_y_direct(x_metadata, y_metadata, x_in, amount_out);
            coin::destroy_zero(x_out);
            y_out
        }
        else {
            let (y_out, x_out) = swap::swap_y_to_exact_x_direct(y_metadata, x_metadata, x_in, amount_out);
            coin::destroy_zero(x_out);
            y_out
        }
    }

    fun get_amount_in_internal<X, Y>(
        x_metadata: Object<Metadata>,
        y_metadata: Object<Metadata>,
        is_x_to_y: bool, 
        y_out_amount: u64
    ): u64 {
        if (is_x_to_y) {
            let (rin, rout, _) = swap::token_reserves(x_metadata, y_metadata);
            swap_utils::get_amount_in(y_out_amount, rin, rout)
        } else {
            let (rout, rin, _) = swap::token_reserves(y_metadata, x_metadata);
            swap_utils::get_amount_in(y_out_amount, rin, rout)
        }
    } 

    public fun get_amount_in(
        x_metadata: Object<Metadata>,
        y_metadata: Object<Metadata>,
        y_out_amount: u64
    ): u64 {
        is_pair_created_internal(x_metadata, y_metadata);
        let is_x_to_y = swap_utils::sort_token_type(x_metadata, y_metadata);
        get_amount_in_internal(x_metadata, y_metadata, is_x_to_y, y_out_amount)
    }

    public fun swap_x_to_exact_y_direct_external(
        x_metadata: Object<Metadata>,
        y_metadata: Object<Metadata>,
        x_in: FungibleAsset, 
        y_out_amount: u64
    ): (FungibleAsset, FungibleAsset) {
        is_pair_created_internal(x_metadata, y_metadata);
        let is_x_to_y = swap_utils::sort_token_type(x_metadata, y_metadata);
        let x_in_withdraw_amount = get_amount_in_internal(x_metadata, y_metadata, is_x_to_y, y_out_amount);
        let x_in_amount = coin::value(&x_in);
        assert!(x_in_amount >= x_in_withdraw_amount, E_INSUFFICIENT_X_AMOUNT);
        let x_in_left = coin::extract(&mut x_in, x_in_amount - x_in_withdraw_amount);
        let y_out = get_intermediate_output_x_to_exact_y(x_metadata, y_metadata, is_x_to_y, x_in, y_out_amount);
        add_swap_event_with_address_internal(x_metadata, y_metadata, @zero, x_in_withdraw_amount, 0, 0, y_out_amount);
        (x_in_left, y_out)
    }

    fun swap_exact_input_double_internal(
        sender: &signer,
        x_metadata: Object<Metadata>,
        y_metadata: Object<Metadata>,
        z_metadata: Object<Metadata>,
        first_is_x_to_y: bool,
        second_is_y_to_z: bool,
        x_in: u64,
        z_min_out: u64,
    ): u64 {
        let asset_x = coin::withdraw(x_metadata, sender, x_in);
        let asset_y = get_intermediate_output(x_metadata, y_metadata, first_is_x_to_y, asset_x);
        let assets_y_out = coin::value(&asset_y);
        let asset_z = get_intermediate_output(y_metadata, z_metadata, second_is_y_to_z, asset_y);

        let asset_z_amt = coin::value(&asset_z);

        assert!(asset_z_amt >= z_min_out, E_OUTPUT_LESS_THAN_MIN);
        let sender_addr = signer::address_of(sender);
        swap::check_or_register_asset_store<Z>(sender);
        coin::deposit(sender_addr, asset_z);
        
        add_swap_event_internal(sender, x_metadata, y_metadata, x_in, 0, 0, assets_y_out);
        add_swap_event_internal(sender, y_metadata, z_metadata, assets_y_out, 0, 0, asset_z_amt);
        asset_z_amt
    }

    /// Same as `swap_exact_input` with specify path: X -> Y -> Z
    public entry fun swap_exact_input_doublehop(
        sender: &signer,
        x_metadata: Object<Metadata>,
        y_metadata: Object<Metadata>,
        z_metadata: Object<Metadata>,
        x_in: u64,
        z_min_out: u64,
    ) {
        is_pair_created_internal(x_metadata, y_metadata);
        is_pair_created_internal(y_metadata, z_metadata);
        let first_is_x_to_y: bool = swap_utils::sort_token_type(x_metadata, y_metadata);

        let second_is_y_to_z: bool = swap_utils::sort_token_type(y_metadata, z_metadata);

        swap_exact_input_double_internal(
            sender, 
            x_metadata,
            y_metadata,
            z_metadata,
            first_is_x_to_y, 
            second_is_y_to_z, 
            x_in, 
            z_min_out
        );
    }

    fun swap_exact_output_double_internal<X, Y, Z>(
        sender: &signer,
        x_metadata: Object<Metadata>,
        y_metadata: Object<Metadata>,
        z_metadata: Object<Metadata>,
        first_is_x_to_y: bool,
        second_is_y_to_z: bool,
        x_max_in: u64,
        z_out: u64,
    ): u64 {
        let rin;
        let rout;
        let y_out = if (second_is_y_to_z) {
            (rin, rout, _) = swap::token_reserves(y_metadata, z_metadata);
            swap_utils::get_amount_in(z_out, rin, rout)
        }else {
            (rout, rin, _) = swap::token_reserves(z_metadata, y_metadata);
            swap_utils::get_amount_in(z_out, rin, rout)
        };
        let x_in = if (first_is_x_to_y) {
            (rin, rout, _) = swap::token_reserves(x_metadata, y_metadata);
            swap_utils::get_amount_in(y_out, rin, rout)
        }else {
            (rout, rin, _) = swap::token_reserves(y_metadata, x_metadata);
            swap_utils::get_amount_in(y_out, rin, rout)
        };

        assert!(x_in <= x_max_in, E_INPUT_MORE_THAN_MAX);

        let asset_x = coin::withdraw<X>(sender, x_in);
        let asset_y = get_intermediate_output_x_to_exact_y(x_metadata, y_metadata, first_is_x_to_y, asset_x, y_out);
        let asset_z = get_intermediate_output_x_to_exact_y<Y, Z>(y_metadata, z_metadata, second_is_y_to_z, asset_y, z_out);

        let asset_z_amt = coin::value(&asset_z);
        let sender_addr = signer::address_of(sender);
        swap::check_or_register_asset_store<Z>(sender);
        coin::deposit(sender_addr, asset_z);

        add_swap_event_internal<X, Y>(sender, x_metadata, y_metadata, x_in, 0, 0, y_out);
        add_swap_event_internal<Y, Z>(sender, y_metadata, z_metadata, y_out, 0, 0, asset_z_amt);
        asset_z_amt
    }

    /// Same as `swap_exact_output` with specify path: X -> Y -> Z
    public entry fun swap_exact_output_doublehop(
        sender: &signer,
        x_metadata: Object<Metadata>,
        y_metadata: Object<Metadata>,
        z_metadata: Object<Metadata>,
        z_out: u64,
        x_max_in: u64,
    ) {
        is_pair_created_internal(x_metadata, y_metadata);
        is_pair_created_internal(y_metadata, z_metadata);
        let first_is_x_to_y: bool = swap_utils::sort_token_type(x_metadata, y_metadata);

        let second_is_y_to_z: bool = swap_utils::sort_token_type(y_metadata, z_metadata);

        swap_exact_output_double_internal(
            sender, 
            x_metadata,
            y_metadata,
            z_metadata,
            first_is_x_to_y, 
            second_is_y_to_z, 
            x_max_in,
            z_out
        );
    }

    fun swap_exact_input_triple_internal(
        sender: &signer,
        x_metadata: Object<Metadata>,
        y_metadata: Object<Metadata>,
        z_metadata: Object<Metadata>,
        a_metadata: Object<Metadata>,
        first_is_x_to_y: bool,
        second_is_y_to_z: bool,
        third_is_z_to_a: bool,
        x_in: u64,
        a_min_out: u64,
    ): u64 {
        let asset_x = coin::withdraw<X>(sender, x_in);
        let asset_y = get_intermediate_output(x_metadata, y_metadata, first_is_x_to_y, asset_x);
        let assets_y_out = coin::value(&asset_y);

        let asset_z = get_intermediate_output(y_metadata, z_metadata, second_is_y_to_z, asset_y);
        let assets_z_out = coin::value(&asset_z);

        let asset_a = get_intermediate_output(z_metadata, a_metadata, third_is_z_to_a, asset_z);

        let asset_a_amt = coin::value(&asset_a);

        assert!(asset_a_amt >= a_min_out, E_OUTPUT_LESS_THAN_MIN);
        let sender_addr = signer::address_of(sender);
        swap::check_or_register_asset_store<A>(sender);
        coin::deposit(sender_addr, asset_a);

        add_swap_event_internal(sender, x_metadata, y_metadata, x_in, 0, 0, assets_y_out);
        add_swap_event_internal(sender, y_metadata, z_metadata, assets_y_out, 0, 0, assets_z_out);
        add_swap_event_internal(sender, z_metadata, a_metadata, assets_z_out, 0, 0, asset_a_amt);
        asset_a_amt
    }

    /// Same as `swap_exact_input` with specify path: X -> Y -> Z -> A
    public entry fun swap_exact_input_triplehop(
        sender: &signer,
        x_metadata: Object<Metadata>,
        y_metadata: Object<Metadata>,
        z_metadata: Object<Metadata>,
        a_metadata: Object<Metadata>,
        x_in: u64,
        a_min_out: u64,
    ) {
        is_pair_created_internal(x_metadata, y_metadata);
        is_pair_created_internal(y_metadata, z_metadata);
        is_pair_created_internal(z_metadata, a_metadata);
        let first_is_x_to_y: bool = swap_utils::sort_token_type(x_metadata, y_metadata);

        let second_is_y_to_z: bool = swap_utils::sort_token_type(y_metadata, z_metadata);

        let third_is_z_to_a: bool = swap_utils::sort_token_type(z_metadata, a_metadata);

        swap_exact_input_triple_internal(
            sender, 
            x_metadata,
            y_metadata,
            z_metadata,
            a_metadata,
            first_is_x_to_y, 
            second_is_y_to_z, 
            third_is_z_to_a, 
            x_in, 
            a_min_out
        );
    }

    fun swap_exact_output_triple_internal(
        sender: &signer,
        x_metadata: Object<Metadata>,
        y_metadata: Object<Metadata>,
        z_metadata: Object<Metadata>,
        a_metadata: Object<Metadata>,
        first_is_x_to_y: bool,
        second_is_y_to_z: bool,
        third_is_z_to_a: bool,
        x_max_in: u64,
        a_out: u64,
    ): u64 {
        let rin;
        let rout;
        let z_out = if (third_is_z_to_a) {
            (rin, rout, _) = swap::token_reserves(z_metadata, a_metadata);
            swap_utils::get_amount_in(a_out, rin, rout)
        }else {
            (rout, rin, _) = swap::token_reserves(a_metadata, z_metadata);
            swap_utils::get_amount_in(a_out, rin, rout)
        };

        let y_out = if (second_is_y_to_z) {
            (rin, rout, _) = swap::token_reserves(y_metadata, z_metadata);
            swap_utils::get_amount_in(z_out, rin, rout)
        }else {
            (rout, rin, _) = swap::token_reserves(z_metadata, y_metadata);
            swap_utils::get_amount_in(z_out, rin, rout)
        };
        let x_in = if (first_is_x_to_y) {
            (rin, rout, _) = swap::token_reserves(x_metadata, y_metadata);
            swap_utils::get_amount_in(y_out, rin, rout)
        }else {
            (rout, rin, _) = swap::token_reserves(y_metadata, x_metadata);
            swap_utils::get_amount_in(y_out, rin, rout)
        };

        assert!(x_in <= x_max_in, E_INPUT_MORE_THAN_MAX);

        let asset_x = coin::withdraw<X>(sender, x_in);
        let asset_y = get_intermediate_output_x_to_exact_y(x_metadata, y_metadata, first_is_x_to_y, asset_x, y_out);
        let asset_z = get_intermediate_output_x_to_exact_y(y_metadata, z_metadata, second_is_y_to_z, asset_y, z_out);
        let asset_a = get_intermediate_output_x_to_exact_y(z_metadata, a_metadata, third_is_z_to_a, asset_z, a_out);

        let asset_a_amt = coin::value(&asset_a);
        let sender_addr = signer::address_of(sender);
        swap::check_or_register_asset_store<A>(sender);
        coin::deposit(sender_addr, asset_a);

        add_swap_event_internal<X, Y>(sender, x_metadata, y_metadata, x_in, 0, 0, y_out);
        add_swap_event_internal<Y, Z>(sender, y_metadata, z_metadata, y_out, 0, 0, z_out);
        add_swap_event_internal<Z, A>(sender, z_metadata, a_metadata, z_out, 0, 0, asset_a_amt);
        asset_a_amt
    }

    /// Same as `swap_exact_output` with specify path: X -> Y -> Z -> A
    public entry fun swap_exact_output_triplehop(
        sender: &signer,
        x_metadata: Object<Metadata>,
        y_metadata: Object<Metadata>,
        z_metadata: Object<Metadata>,
        a_metadata: Object<Metadata>,
        a_out: u64,
        x_max_in: u64,
    ) {
        is_pair_created_internal(x_metadata, y_metadata);
        is_pair_created_internal(y_metadata, z_metadata);
        is_pair_created_internal(z_metadata, a_metadata);
        let first_is_x_to_y: bool = swap_utils::sort_token_type(x_metadata, y_metadata);

        let second_is_y_to_z: bool = swap_utils::sort_token_type(y_metadata, z_metadata);

        let third_is_z_to_a: bool = swap_utils::sort_token_type(z_metadata, a_metadata);

        swap_exact_output_triple_internal(
            sender, 
            x_metadata,
            y_metadata,
            z_metadata,
            a_metadata,
            first_is_x_to_y, 
            second_is_y_to_z, 
            third_is_z_to_a, 
            x_max_in, 
            a_out
        );
    }


    fun swap_exact_input_quadruple_internal(
        sender: &signer,
        x_metadata: Object<Metadata>,
        y_metadata: Object<Metadata>,
        z_metadata: Object<Metadata>,
        a_metadata: Object<Metadata>,
        b_metadata: Object<Metadata>,
        first_is_x_to_y: bool,
        second_is_y_to_z: bool,
        third_is_z_to_a: bool,
        fourth_is_a_to_b: bool,
        x_in: u64,
        b_min_out: u64,
    ): u64 {
        let asset_x = coin::withdraw<X>(sender, x_in);
        let asset_y = get_intermediate_output(x_metadata, y_metadata, first_is_x_to_y, asset_x);
        let assets_y_out = coin::value(&asset_y);

        let asset_z = get_intermediate_output(y_metadata, z_metadata, second_is_y_to_z, asset_y);
        let assets_z_out = coin::value(&asset_z);

        let asset_a = get_intermediate_output(z_metadata, a_metadata, third_is_z_to_a, asset_z);
        let asset_a_out = coin::value(&asset_a);

        let asset_b = get_intermediate_output(a_metadata, b_metadata, fourth_is_a_to_b, asset_a);
        let asset_b_amt = coin::value(&asset_b);

        assert!(asset_b_amt >= b_min_out, E_OUTPUT_LESS_THAN_MIN);
        let sender_addr = signer::address_of(sender);
        swap::check_or_register_asset_store<B>(sender);
        coin::deposit(sender_addr, asset_b);

        add_swap_event_internal(sender, x_metadata, y_metadata, x_in, 0, 0, assets_y_out);
        add_swap_event_internal(sender, y_metadata, z_metadata, assets_y_out, 0, 0, assets_z_out);
        add_swap_event_internal(sender, z_metadata, a_metadata, assets_z_out, 0, 0, asset_a_out);
        add_swap_event_internal(sender, a_metadata, b_metadata, asset_a_out, 0, 0, asset_b_amt);
        asset_b_amt
    }

    /// Same as `swap_exact_input` with specify path: X -> Y -> Z -> A -> B
    public entry fun swap_exact_input_quadruplehop(
        sender: &signer,
        x_metadata: Object<Metadata>,
        y_metadata: Object<Metadata>,
        z_metadata: Object<Metadata>,
        a_metadata: Object<Metadata>,
        b_metadata: Object<Metadata>,
        x_in: u64,
        b_min_out: u64,
    ) {
        is_pair_created_internal(x_metadata, y_metadata);
        is_pair_created_internal(y_metadata, z_metadata);
        is_pair_created_internal(z_metadata, a_metadata);
        is_pair_created_internal(a_metadata, b_metadata);
        let first_is_x_to_y: bool = swap_utils::sort_token_type(x_metadata, y_metadata);

        let second_is_y_to_z: bool = swap_utils::sort_token_type(y_metadata, z_metadata);

        let third_is_z_to_a: bool = swap_utils::sort_token_type(z_metadata, a_metadata);

        let fourth_is_a_to_b: bool = swap_utils::sort_token_type(a_metadata, b_metadata);

        swap_exact_input_quadruple_internal(
            sender, 
            x_metadata,
            y_metadata,
            z_metadata,
            a_metadata,
            b_metadata,
            first_is_x_to_y, second_is_y_to_z, third_is_z_to_a, fourth_is_a_to_b, x_in, b_min_out);
    }

    fun swap_exact_output_quadruple_internal(
        sender: &signer,
        x_metadata: Object<Metadata>,
        y_metadata: Object<Metadata>,
        z_metadata: Object<Metadata>,
        a_metadata: Object<Metadata>,
        b_metadata: Object<Metadata>,
        first_is_x_to_y: bool,
        second_is_y_to_z: bool,
        third_is_z_to_a: bool,
        fourth_is_a_to_b: bool,
        x_max_in: u64,
        b_out: u64,
    ): u64 {
        let rin;
        let rout;

        let a_out = if (fourth_is_a_to_b) {
            (rin, rout, _) = swap::token_reserves(a_metadata, b_metadata);
            swap_utils::get_amount_in(b_out, rin, rout)
        }else {
            (rout, rin, _) = swap::token_reserves(b_metadata, a_metadata);
            swap_utils::get_amount_in(b_out, rin, rout)
        };

        let z_out = if (third_is_z_to_a) {
            (rin, rout, _) = swap::token_reserves(z_metadata, a_metadata);
            swap_utils::get_amount_in(a_out, rin, rout)
        }else {
            (rout, rin, _) = swap::token_reserves(a_metadata, z_metadata);
            swap_utils::get_amount_in(a_out, rin, rout)
        };

        let y_out = if (second_is_y_to_z) {
            (rin, rout, _) = swap::token_reserves(y_metadata, z_metadata);
            swap_utils::get_amount_in(z_out, rin, rout)
        }else {
            (rout, rin, _) = swap::token_reserves(z_metadata, y_metadata);
            swap_utils::get_amount_in(z_out, rin, rout)
        };
        let x_in = if (first_is_x_to_y) {
            (rin, rout, _) = swap::token_reserves(x_metadata, y_metadata);
            swap_utils::get_amount_in(y_out, rin, rout)
        }else {
            (rout, rin, _) = swap::token_reserves(y_metadata, x_metadata);
            swap_utils::get_amount_in(y_out, rin, rout)
        };

        assert!(x_in <= x_max_in, E_INPUT_MORE_THAN_MAX);

        let asset_x = coin::withdraw<X>(sender, x_in);
        let asset_y = get_intermediate_output_x_to_exact_y(x_metadata, y_metadata, first_is_x_to_y, asset_x, y_out);
        let asset_z = get_intermediate_output_x_to_exact_y(y_metadata, z_metadata, second_is_y_to_z, asset_y, z_out);
        let asset_a = get_intermediate_output_x_to_exact_y(z_metadata, a_metadata, third_is_z_to_a, asset_z, a_out);
        let asset_b = get_intermediate_output_x_to_exact_y(a_metadata, b_metadata, fourth_is_a_to_b, asset_a, b_out);

        let asset_b_amt = coin::value(&asset_b);
        let sender_addr = signer::address_of(sender);
        swap::check_or_register_asset_store<B>(sender);
        coin::deposit(sender_addr, asset_b);

        add_swap_event_internal(sender, x_metadata, y_metadata, x_in, 0, 0, y_out);
        add_swap_event_internal(sender, y_metadata, z_metadata, y_out, 0, 0, z_out);
        add_swap_event_internal(sender, z_metadata, a_metadata, z_out, 0, 0, a_out);
        add_swap_event_internal(sender, a_metadata, b_metadata, a_out, 0, 0, asset_b_amt);
        asset_b_amt
    }

    /// Same as `swap_exact_output` with specify path: X -> Y -> Z -> A -> B
    public entry fun swap_exact_output_quadruplehop(
        sender: &signer,
        x_metadata: Object<Metadata>,
        y_metadata: Object<Metadata>,
        z_metadata: Object<Metadata>,
        a_metadata: Object<Metadata>,
        b_metadata: Object<Metadata>,
        b_out: u64,
        x_max_in: u64,
    ) {
        is_pair_created_internal(x_metadata, y_metadata);
        is_pair_created_internal(y_metadata, z_metadata);
        is_pair_created_internal(z_metadata, a_metadata);
        is_pair_created_internal(a_metadata, b_metadata);
        let first_is_x_to_y: bool = swap_utils::sort_token_type(x_metadata, y_metadata);

        let second_is_y_to_z: bool = swap_utils::sort_token_type(y_metadata, z_metadata);

        let third_is_z_to_a: bool = swap_utils::sort_token_type(z_metadata, a_metadata);

        let fourth_is_a_to_b = swap_utils::sort_token_type(a_metadata, b_metadata);

        swap_exact_output_quadruple_internal(
            sender, 
            x_metadata,
            y_metadata,
            z_metadata,
            a_metadata,
            b_metadata,
            first_is_x_to_y, second_is_y_to_z, third_is_z_to_a, fourth_is_a_to_b, x_max_in, b_out);
    }

    public entry fun register_lp(
        sender: &signer,
        x_metadata: Object<Metadata>,
        y_metadata: Object<Metadata>,
    ) {
        swap::register_lp(sender, x_metadata, y_metadata);
    }
}