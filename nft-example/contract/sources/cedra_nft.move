module CedraNFTV2::CedraCollectionV2 {
    use aptos_framework::object::{Self, Object};
    use aptos_token_objects::collection;
    use aptos_token_objects::token;
    use std::string::{Self, String};
    use std::option;

    /// Only collection creator can mint tokens.
    const ENOT_CREATOR: u64 = 1;

    const COLLECTION_NAME: vector<u8> = b"Cedra NFT Collection V2";
    const COLLECTION_DESCRIPTION: vector<u8> = b"A modern collection of unique digital assets using Aptos Digital Asset standard";
    const COLLECTION_URI: vector<u8> = b"https://metadata.cedra.dev/collection-v2.json";

    /// Initialize and create the collection when module is published.
    fun init_module(admin: &signer) {
        create_collection(admin);
    }

    /// Create the NFT collection.
    public entry fun create_collection(creator: &signer) {
        let collection_name = string::utf8(COLLECTION_NAME);
        let description = string::utf8(COLLECTION_DESCRIPTION);
        let collection_uri = string::utf8(COLLECTION_URI);
        
        collection::create_unlimited_collection(
            creator,
            description,
            collection_name,
            option::none(),
            collection_uri,
        );
    }

    /// Mint a new NFT in the collection.
    public entry fun mint_nft(
        creator: &signer,
        to: address,
        name: String,
        description: String,
        uri: String,
    ) {
        let collection_name = string::utf8(COLLECTION_NAME);
        
        let token_constructor_ref = token::create_named_token(
            creator,
            collection_name,
            description,
            name,
            option::none(),
            uri,
        );

        let transfer_ref = object::generate_transfer_ref(&token_constructor_ref);
        
        // Transfer the token to the specified address
        let linear_transfer_ref = object::generate_linear_transfer_ref(&transfer_ref);
        object::transfer_with_ref(linear_transfer_ref, to);
    }

    /// Transfer an NFT from one account to another.
    public entry fun transfer_nft(
        from: &signer,
        object: Object<token::Token>,
        to: address,
    ) {
        object::transfer(from, object, to);
    }

    /// Get collection owner/creator
    #[view]
    public fun get_collection_owner(): address {
        @CedraNFTV2
    }

    /// Check if collection exists
    #[view]
    public fun collection_exists(): bool {
        let collection_name = string::utf8(COLLECTION_NAME);
        let creator = @CedraNFTV2;
        let collection_address = collection::create_collection_address(&creator, &collection_name);
        object::object_exists<collection::Collection>(collection_address)
    }

    /// Get collection data
    #[view]
    public fun get_collection_data(): (String, String, String) {
        if (collection_exists()) {
            (
                string::utf8(COLLECTION_NAME),
                string::utf8(COLLECTION_DESCRIPTION), 
                string::utf8(COLLECTION_URI)
            )
        } else {
            (string::utf8(b""), string::utf8(b""), string::utf8(b""))
        }
    }
} 