module ExpandNFT::testNFT{
    use std::signer;
    use std::string::{Self, String};
    use std::vector;
    use ExpandNFT::ExpandNFT;

    // ====== COLLECTION CREATION ======

    // Test creating a collection normally
    #[test(_account=@0x1)]
    fun test_create_collection(_account : &signer) {
        ExpandNFT::create_collection(_account);

        let exists = ExpandNFT::collection_exists(signer::address_of(_account));
        assert!(exists, 100);
    }

    // Test creating a collection with custom royalty (500 basis points = 5%)
    #[test(_account=@0x1)]
    fun test_create_collection_with_royalty(_account : &signer){
        let collection_name = string::utf8(b"Collection test");
        ExpandNFT::create_collection_with_royalty(_account,collection_name,500);

        let exists = ExpandNFT::collection_exists_with_name(signer::address_of(_account), collection_name);
        assert!(exists, 100);
    }

    // ====== SINGLE NFT MINT ======

    // Test minting a single NFT to another account
    #[test(_account=@0x1, to=@0x2)]
    fun test_mint_nft(_account: &signer, to : &signer){
        ExpandNFT::create_collection(_account);
        let testname= b"Test name";
        let description = b"Test description";
        let uri = b"https://metadata.cedra.dev/collection-v2.json";
        ExpandNFT::mint_nft(
            _account,
            signer::address_of(to),
            string::utf8(testname),
            string::utf8(description),
            string::utf8(uri)
        );
    }

    // ====== BATCH NFT MINT ======

    // Test minting multiple NFTs in a batch
    #[test(_account=@0x1, to=@0x2)]
    fun test_mint_batch_nft(_account: &signer, to: &signer) {
        ExpandNFT::create_collection(_account);

        let count = 0;

        // Initialize vectors for names, descriptions, and URIs
        let test_names = vector::empty<String>();
        let test_descriptions = vector::empty<String>();
        let test_uris = vector::empty<String>();

        // Add unique names for each NFT
        vector::push_back(&mut test_names, string::utf8(b"NFT #1"));
        vector::push_back(&mut test_names, string::utf8(b"NFT #2"));
        vector::push_back(&mut test_names, string::utf8(b"NFT #3"));

        // Add descriptions and URIs (same for each NFT in this test)
        while (count < 3) {
            vector::push_back(&mut test_descriptions, string::utf8(b"A modern collection of unique digital assets using Cedra Digital Asset standard"));
            vector::push_back(&mut test_uris, string::utf8(b"https://metadata.cedra.dev/collection-v2.json"));
            count = count + 1;
        };

        ExpandNFT::mint_batch_nft(
            _account,
            signer::address_of(to),
            test_names,
            test_descriptions,
            test_uris,
        );
    }

    // ====== NEGATIVE TESTS ======

    // Test creating collection with too high royalty value (should handle failure)
    #[test(_account=@0x1)]
    fun test_create_collection_with_roylaty_too_high(_account : &signer){
        let collection_name = string::utf8(b"Collection royalty test");
        ExpandNFT::create_collection_with_royalty(_account,collection_name,100000);

        let exists = ExpandNFT::collection_exists_with_name(signer::address_of(_account),collection_name);
        assert!(exists, 100);
    }
    #[test(_account=@0x1)]
    fun test_create_collection_with_roylaty_name_null(_account : &signer){
        let collection_name = string::utf8(b"");
        ExpandNFT::create_collection_with_royalty(_account,collection_name,100000);

        let exists = ExpandNFT::collection_exists_with_name(signer::address_of(_account),collection_name);
        assert!(exists, 100);
    }
    // Test batch mint with mismatched vector sizes (should fail due to EDIFFERENT_LENGTH)
    #[test(_account=@0x1, to=@0x2)]
    fun test_mint_batch_nft_not_same_sizes(_account: &signer, to: &signer) {
        ExpandNFT::create_collection(_account);

        let count = 0;

        let test_names = vector::empty<String>();
        let test_descriptions = vector::empty<String>();
        let test_uris = vector::empty<String>();

        vector::push_back(&mut test_names, string::utf8(b"NFT #1"));
        vector::push_back(&mut test_names, string::utf8(b"NFT #2"));
        vector::push_back(&mut test_names, string::utf8(b"NFT #3"));

        while (count < 4) {
            vector::push_back(&mut test_descriptions, string::utf8(b"A modern collection of unique digital assets using Cedra Digital Asset standard"));
            vector::push_back(&mut test_uris, string::utf8(b"https://metadata.cedra.dev/collection-v2.json"));
            count = count + 1;
        };

        ExpandNFT::mint_batch_nft(
            _account,
            signer::address_of(to),
            test_names,
            test_descriptions,
            test_uris,
        );
    }

    // Test batch mint with empty vectors (should fail due to ENOT_VALUES)
    #[test(_account=@0x1, to=@0x2)]
    fun test_mint_batch_nft_empty(_account: &signer, to: &signer) {
        ExpandNFT::create_collection(_account);
        let test_names = vector::empty<String>();
        let test_descriptions = vector::empty<String>();
        let test_uris = vector::empty<String>();

        ExpandNFT::mint_batch_nft(
            _account,
            signer::address_of(to),
            test_names,
            test_descriptions,
            test_uris,
        );
    }

    // Test batch mint exceeding the allowed limit per transaction (should fail due to ETOO_MANY_TOKENS)
    #[test(_account=@0x1, to=@0x2)]
    fun test_mint_batch_nft_too_many(_account: &signer, to: &signer) {
        ExpandNFT::create_collection(_account);

        let count = 0;

        let test_names = vector::empty<String>();
        let test_descriptions = vector::empty<String>();
        let test_uris = vector::empty<String>();

        // Push 4 names (assuming LIMIT_MINT_PER_TX = 3)
        vector::push_back(&mut test_names, string::utf8(b"NFT #1"));
        vector::push_back(&mut test_names, string::utf8(b"NFT #2"));
        vector::push_back(&mut test_names, string::utf8(b"NFT #3"));
        vector::push_back(&mut test_names, string::utf8(b"NFT #4"));

        while (count < 4) {
            vector::push_back(&mut test_descriptions, string::utf8(b"A modern collection of unique digital assets using Cedra Digital Asset standard"));
            vector::push_back(&mut test_uris, string::utf8(b"https://metadata.cedra.dev/collection-v2.json"));
            count = count + 1;
        };

        ExpandNFT::mint_batch_nft(
            _account,
            signer::address_of(to),
            test_names,
            test_descriptions,
            test_uris,
        );
    }
}
