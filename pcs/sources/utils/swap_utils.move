/// Uniswap v2 like token swap program
module pancake::swap_utils {
    use aptos_framework::fungible_asset::{Self, Metadata};
    use aptos_framework::object::Object;
    use aptos_std::comparator;
    use std::string;


    const EQUAL: u8 = 0;
    const SMALLER: u8 = 1;
    const GREATER: u8 = 2;

    const ERROR_INSUFFICIENT_INPUT_AMOUNT: u64 = 0;
    const ERROR_INSUFFICIENT_LIQUIDITY: u64 = 1;
    const ERROR_INSUFFICIENT_AMOUNT: u64 = 2;
    const ERROR_INSUFFICIENT_OUTPOT_AMOUNT: u64 = 3;
    const ERROR_SAME_COIN: u64 = 4;

    public fun get_amount_out(
        amount_in: u64,
        reserve_in: u64,
        reserve_out: u64
    ): u64 {
        assert!(amount_in > 0, ERROR_INSUFFICIENT_INPUT_AMOUNT);
        assert!(reserve_in > 0 && reserve_out > 0, ERROR_INSUFFICIENT_LIQUIDITY);

        let amount_in_with_fee = (amount_in as u128) * 9975u128;
        let numerator = amount_in_with_fee * (reserve_out as u128);
        let denominator = (reserve_in as u128) * 10000u128 + amount_in_with_fee;
        ((numerator / denominator) as u64)
    }

    public fun get_amount_in(
        amount_out: u64,
        reserve_in: u64,
        reserve_out: u64
    ): u64 {
        assert!(amount_out > 0, ERROR_INSUFFICIENT_OUTPOT_AMOUNT);
        assert!(reserve_in > 0 && reserve_out > 0, ERROR_INSUFFICIENT_LIQUIDITY);

        let numerator = (reserve_in as u128) * (amount_out as u128) * 10000u128;
        let denominator = ((reserve_out as u128) - (amount_out as u128)) * 9975u128;
        (((numerator / denominator) as u64) + 1u64)
    }

    public fun quote(amount_x: u64, reserve_x: u64, reserve_y: u64): u64 {
        assert!(amount_x > 0, ERROR_INSUFFICIENT_AMOUNT);
        assert!(reserve_x > 0 && reserve_y > 0, ERROR_INSUFFICIENT_LIQUIDITY);
        (((amount_x as u128) * (reserve_y as u128) / (reserve_x as u128)) as u64)
    }

    public fun get_asset_name_in_bytes(metadata: Object<Metadata>): vector<u8> {
        let asset_name = fungible_asset::name(metadata);
        *string::bytes(&asset_name)
    }

    // convert Struct to bytes ,then compare
    fun compare_struct(x_metadata: Object<Metadata>, y_metadata: Object<Metadata>): u8 {
        let x_name_bytes = get_asset_name_in_bytes(x_metadata);
        let y_name_bytes = get_asset_name_in_bytes(y_metadata);
        if (comparator::is_greater_than(&comparator::compare_u8_vector(x_name_bytes, y_name_bytes))) {
            GREATER
        } else if (comparator::is_equal(&comparator::compare_u8_vector(x_name_bytes, y_name_bytes))) {
            EQUAL
        } else {
            SMALLER
        }
    }

    public fun get_smaller_enum(): u8 {
        SMALLER
    }

    public fun get_greater_enum(): u8 {
        GREATER
    }

    public fun get_equal_enum(): u8 {
        EQUAL
    }

    public fun sort_token_type(x_metadata: Object<Metadata>, y_metadata: Object<Metadata>): bool {
        let compare_x_y: u8 = compare_struct(x_metadata, y_metadata);
        assert!(compare_x_y != get_equal_enum(), ERROR_SAME_COIN);
        (compare_x_y == get_smaller_enum())
    }
}