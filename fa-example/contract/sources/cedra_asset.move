module CedraFungible::CedraAsset {
    use cedra_framework::fungible_asset::{Self, MintRef, TransferRef, BurnRef, Metadata};
    use cedra_framework::object::{Self, Object};
    use cedra_framework::primary_fungible_store;
    use std::error;
    use std::signer;
    use std::string::utf8;
    use std::option;

    /// Only fungible asset metadata owner can make changes.
    const ENOT_OWNER: u64 = 1;

    const ASSET_SYMBOL: vector<u8> = b"CEDRA";
    const ASSET_NAME: vector<u8> = b"CedraAsset";

    #[resource_group_member(group = cedra_framework::object::ObjectGroup)]
    /// Hold refs to control the minting, transfer, and burning of fungible assets.
    struct ManagedFungibleAsset has key {
        mint_ref: MintRef,
        burn_ref: BurnRef,
        transfer_ref: TransferRef,
        admin: address,
    }

    /// Initialize metadata object and store the refs.
    fun init_module(admin: &signer) {
        init_internal(admin);
    }

    // Test-only initialization function
    #[test_only]
    public fun init_for_test(admin: &signer) {
        init_internal(admin);
    }

    /// Internal initialization logic
    fun init_internal(admin: &signer) {
        let constructor_ref = &object::create_named_object(admin, ASSET_SYMBOL);
        primary_fungible_store::create_primary_store_enabled_fungible_asset(
            constructor_ref,
            option::none(),
            utf8(ASSET_NAME),
            utf8(ASSET_SYMBOL),
            8,
            utf8(b"https://metadata.cedra.dev/cedraasset.json"),
            utf8(b"http://example.com"),
        );

        // Create mint/transfer/burn refs to allow creator to manage the fungible asset.
        let mint_ref = fungible_asset::generate_mint_ref(constructor_ref);
        let burn_ref = fungible_asset::generate_burn_ref(constructor_ref);
        let transfer_ref = fungible_asset::generate_transfer_ref(constructor_ref);
        let metadata_object_signer = object::generate_signer(constructor_ref);
        move_to(
            &metadata_object_signer,
            ManagedFungibleAsset { 
                mint_ref, 
                burn_ref,
                transfer_ref,
                admin: signer::address_of(admin),
            }
        );
    }

    #[view]
    /// Return the address of the managed fungible asset that's created when this module is deployed.
    public fun get_metadata(): Object<Metadata> {
        let asset_address = object::create_object_address(&@CedraFungible, ASSET_SYMBOL);
        object::address_to_object<Metadata>(asset_address)
    }

    /// Mint as the owner of metadata object.
    public entry fun mint(admin: &signer, to: address, amount: u64) acquires ManagedFungibleAsset {
        let asset = get_metadata();
        let managed_fungible_asset = authorized_borrow_refs(admin, asset);
        let to_wallet = primary_fungible_store::ensure_primary_store_exists(to, asset);
        let fa = fungible_asset::mint(&managed_fungible_asset.mint_ref, amount);
        fungible_asset::deposit_with_ref(&managed_fungible_asset.transfer_ref, to_wallet, fa);
    }

    /// Burn own tokens. User can burn their own tokens.
    public entry fun burn(owner: &signer, amount: u64) acquires ManagedFungibleAsset {
        let asset = get_metadata();
        let managed_fungible_asset = borrow_global<ManagedFungibleAsset>(object::object_address(&asset));
        let fa = primary_fungible_store::withdraw(owner, asset, amount);
        fungible_asset::burn(&managed_fungible_asset.burn_ref, fa);
    }

    /// Transfer tokens from one account to another
    public entry fun transfer(sender: &signer, to: address, amount: u64) {
        let asset = get_metadata();
        let fa = primary_fungible_store::withdraw(sender, asset, amount);
        primary_fungible_store::deposit(to, fa);
    }

    /// Borrow the immutable reference of the refs of `metadata`.
    /// This validates that the signer is the admin.
    inline fun authorized_borrow_refs(
        owner: &signer,
        asset: Object<Metadata>,
    ): &ManagedFungibleAsset acquires ManagedFungibleAsset {
        let refs = borrow_global<ManagedFungibleAsset>(object::object_address(&asset));
        assert!(refs.admin == signer::address_of(owner), error::permission_denied(ENOT_OWNER));
        refs
    }
}