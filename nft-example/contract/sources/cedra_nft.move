module ExpandNFT::ExpandNFT {
    use std::signer;
    use cedra_framework::object::{Self, Object};
    use cedra_token_objects::collection;
    use cedra_token_objects::token;
    use cedra_token_objects::royalty;
    use std::string::{Self, String};
    use std::option;
    use std::vector;

    /// Only collection creator can mint tokens.
    const ENOT_CREATOR: u64 = 1;
    const EDIFFERENT_LENGTH: u64 = 2;
    const ENOT_VALUES: u64 = 3;
    const ETOO_MANY_TOKENS: u64 = 4;
    const ENOT_NAME: u64 = 5;
    const COLLECTION_NAME: vector<u8> = b"Cedra NFT Collection V2";
    const COLLECTION_DESCRIPTION: vector<u8> = b"A modern collection of unique digital assets using Cedra Digital Asset standard";
    const COLLECTION_URI: vector<u8> = b"https://metadata.cedra.dev/collection-v2.json";
    const LIMIT_MINT_PER_TX: u64 = 3; // just for test example, you can change this
    const DEFAULT_ROYALTY: u64 = 100; // 1%

    /// Initialize and create the collection when module is published.
    fun init_module(admin: &signer) {
        create_collection(admin);
    }

    /// Create the NFT collection.
    public entry fun create_collection(creator: &signer) {
        let collection_name = string::utf8(COLLECTION_NAME);
        let description = string::utf8(COLLECTION_DESCRIPTION);
        let collection_uri = string::utf8(COLLECTION_URI);
        let address = signer::address_of(creator);

        let royalty = royalty::create(DEFAULT_ROYALTY, 10000, address); // Create a royalty with verifying that it is a valid percentage

        collection::create_unlimited_collection(
            creator,
            description,
            collection_name,
            option::some(royalty),
            collection_uri,
        );
    }

    //Create the NFT collection with royalty
    public entry fun create_collection_with_royalty(creator: &signer, collection_name : String, royalty_basis_points: u64) {
        assert!(!string::is_empty(&collection_name),ENOT_NAME); // Checks if collection name isn`t null
        let description = string::utf8(COLLECTION_DESCRIPTION);
        let collection_uri = string::utf8(COLLECTION_URI);

        let address = signer::address_of(creator);
        let royalty = royalty::create(royalty_basis_points, 10000, address); // Create a royalty with verifying that it is a valid percentage

        collection::create_unlimited_collection(
            creator,
            description,
            collection_name,
            option::some(royalty),
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

    /// Mint multiple NFTs in a single transaction.
    public entry fun mint_batch_nft(creator: &signer, to: address, names: vector<String>, descriptions: vector<String>, uris: vector<String>) {
        assert!(vector::length(&names) == vector::length(&descriptions) && vector::length(&descriptions) == vector::length(&uris), EDIFFERENT_LENGTH);
        assert!(vector::length(&names) > 0, ENOT_VALUES);
        assert!(vector::length(&names) <= LIMIT_MINT_PER_TX, ETOO_MANY_TOKENS);

        let collection_name = string::utf8(COLLECTION_NAME);
       
        while (!vector::is_empty(&names)){
            let name = vector::pop_back(&mut names);
            let description = vector::pop_back(&mut descriptions);
            let uri = vector::pop_back(&mut uris);

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
    }

    /// Transfer an NFT from one account to another.
    /// @notice You can use object::transfer directy, that function for demo purpose only.
    public entry fun transfer_nft(
        from: &signer,
        object: Object<token::Token>,
        to: address,
    ) {
        object::transfer(from, object, to);
    }

    #[view]
    /// Get collection owner/creator.
    /// @notice You can use object::owner directly, that function for demo purpose only.
    public fun get_collection_owner(creator_address: address): address {
        let collection_name = string::utf8(COLLECTION_NAME);
        let collection_address = collection::create_collection_address(&creator_address, &collection_name);
        let collection_object = object::address_to_object<collection::Collection>(collection_address);
        object::owner(collection_object)
    }

    #[view]
    /// Check if collection exists.
    public fun collection_exists(creator_address: address): bool {
        let collection_name = string::utf8(COLLECTION_NAME);
        let collection_address = collection::create_collection_address(&creator_address, &collection_name);
        object::object_exists<collection::Collection>(collection_address)
    }
    #[view]
    public fun collection_exists_with_name(creator_address: address,collection_name : String): bool {
        let collection_address = collection::create_collection_address(&creator_address, &collection_name);
        object::object_exists<collection::Collection>(collection_address)
    }
    #[view]
    /// Get collection data.
    public fun get_collection_data(creator_address: address): (String, String, String) {
        if (collection_exists(creator_address)) {
            let collection_name = string::utf8(COLLECTION_NAME);
            let collection_address = collection::create_collection_address(&creator_address, &collection_name);
            let collection_object = object::address_to_object<collection::Collection>(collection_address);
            (
                collection::name(collection_object),
                collection::description(collection_object), 
                collection::uri(collection_object)
            )
        } else {
            (string::utf8(b""), string::utf8(b""), string::utf8(b""))
        }
    }
} 
