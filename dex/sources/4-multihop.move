/// Multi-hop routing
module simple_dex::multihop {
    use cedra_framework::fungible_asset::{Self, FungibleAsset, FungibleStore, Metadata};
    use cedra_framework::object::{Self, ExtendRef, Object};
    use cedra_framework::option;
    use cedra_framework::primary_fungible_store;
    use simple_dex::math_amm;
    use simple_dex::swap;
    

    const ERROR_INSUFFICIENT_OUTPUT: u64 = 1;
    
    /// Route through multiple trading pairs for better prices
    public entry fun swap_exact_input_multihop(
        user: &signer,
        xy_lp_metadata: Object<Metadata>,
        yz_lp_metadata: Object<Metadata>,
        x: Object<Metadata>,
        y: Object<Metadata>,
        z: Object<Metadata>,
        amount_in: u64,
        min_amount_out: u64
    ) {
        // First hop: X -> Y
        let (reserve_x1, reserve_y1) = swap::reserves(xy_lp_metadata);
        let amount_intermediate = math_amm::get_amount_out(amount_in, reserve_x1, reserve_y1);
        
        swap::swap_exact_input(
            user, 
            xy_lp_metadata,
            x,
            y,
            amount_in,
            0
        );
        
        // Second hop: Y -> Z
        let (reserve_y2, reserve_z2) = swap::reserves(yz_lp_metadata);
        let amount_out = math_amm::get_amount_out(amount_intermediate, reserve_y2, reserve_z2);
        
        assert!(amount_out >= min_amount_out, ERROR_INSUFFICIENT_OUTPUT);
        swap::swap_exact_input(
            user, 
            yz_lp_metadata,
            y,
            z,
            amount_intermediate,
            min_amount_out
        );
    }
}