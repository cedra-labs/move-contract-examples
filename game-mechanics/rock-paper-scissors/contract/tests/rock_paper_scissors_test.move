#[test_only]
module RockPaperScissors::RockPaperScissorsTest {
    use std::signer;
    use std::hash;
    use std::vector;
    use RockPaperScissors::RockPaperScissors;
    use cedra_framework::object::{Self, Object};
    use cedra_framework::fungible_asset::{Self, Metadata, MintRef};
    use cedra_framework::primary_fungible_store;
    use cedra_framework::option;
    use cedra_framework::string;

    struct TestMetadata has key {
        mint_ref: MintRef,
    }

    fun create_test_asset(admin: &signer): Object<Metadata> {
        let constructor_ref = &object::create_named_object(admin, b"TestAsset");
        primary_fungible_store::create_primary_store_enabled_fungible_asset(
            constructor_ref,
            option::none(),
            string::utf8(b"Test Asset"),
            string::utf8(b"TEST"),
            8,
            string::utf8(b"https://example.com"),
            string::utf8(b"https://example.com"),
        );
        let mint_ref = fungible_asset::generate_mint_ref(constructor_ref);
        let admin_signer = object::generate_signer(constructor_ref);
        move_to(&admin_signer, TestMetadata { mint_ref });
        object::object_from_constructor_ref<Metadata>(constructor_ref)
    }

    fun mint_asset(admin: &signer, to: address, amount: u64) acquires TestMetadata {
        let asset_addr = object::create_object_address(&@RockPaperScissors, b"TestAsset");
        let test_metadata = borrow_global<TestMetadata>(asset_addr);
        let fa = fungible_asset::mint(&test_metadata.mint_ref, amount);
        primary_fungible_store::deposit(to, fa);
    }

    /// Compute commit hash: SHA3-256(move || secret)
    fun compute_commit_hash(player_move: u8, secret: vector<u8>): vector<u8> {
        let data = vector::empty<u8>();
        vector::push_back(&mut data, player_move);
        vector::append(&mut data, secret);
        hash::sha3_256(data)
    }

    #[test(admin = @RockPaperScissors, player1 = @0x1, player2 = @0x2)]
    fun test_init_module(admin: signer, player1: signer, player2: signer) {
        RockPaperScissors::init_for_testing(&admin);
    }

    #[test(admin = @RockPaperScissors, player1 = @0x1, player2 = @0x2)]
    fun test_create_game(admin: signer, player1: signer, player2: signer) {
        RockPaperScissors::init_for_testing(&admin);
        let asset = create_test_asset(&admin);
        
        // Create game with no stake
        RockPaperScissors::create_game(&player1, 0, asset);
    }

    #[test(admin = @RockPaperScissors, player1 = @0x1, player2 = @0x2)]
    fun test_create_game_with_stake(admin: signer, player1: signer, player2: signer) acquires TestMetadata {
        RockPaperScissors::init_for_testing(&admin);
        let asset = create_test_asset(&admin);
        
        // Mint tokens to players
        mint_asset(&admin, signer::address_of(&player1), 1000);
        mint_asset(&admin, signer::address_of(&player2), 1000);
        
        // Create game with stake
        let constructor_ref = &object::create_named_object(&player1, b"Game");
        let game_address = object::address_from_constructor_ref(constructor_ref);
        RockPaperScissors::create_game(&player1, 100, asset);
        
        // Player 2 joins
        RockPaperScissors::join_game(&player2, game_address);
    }

    #[test(admin = @RockPaperScissors, player1 = @0x1, player2 = @0x2)]
    fun test_commit_and_reveal(admin: signer, player1: signer, player2: signer) acquires TestMetadata {
        RockPaperScissors::init_for_testing(&admin);
        let asset = create_test_asset(&admin);
        
        // Mint tokens to players
        mint_asset(&admin, signer::address_of(&player1), 1000);
        mint_asset(&admin, signer::address_of(&player2), 1000);
        
        // Create game
        let constructor_ref = &object::create_named_object(&player1, b"Game");
        let game_address = object::address_from_constructor_ref(constructor_ref);
        RockPaperScissors::create_game(&player1, 100, asset);
        
        // Player 2 joins
        RockPaperScissors::join_game(&player2, game_address);
        
        // Player 1 commits (Rock)
        let secret1 = vector::empty<u8>();
        vector::push_back(&mut secret1, 42);
        let commit1 = compute_commit_hash(0, secret1);  // Rock = 0
        RockPaperScissors::commit_move(&player1, game_address, commit1);
        
        // Player 2 commits (Scissors)
        let secret2 = vector::empty<u8>();
        vector::push_back(&mut secret2, 99);
        let commit2 = compute_commit_hash(2, secret2);  // Scissors = 2
        RockPaperScissors::commit_move(&player2, game_address, commit2);
        
        // Player 1 reveals
        RockPaperScissors::reveal_move(&player1, game_address, 0, secret1);
        
        // Player 2 reveals
        RockPaperScissors::reveal_move(&player2, game_address, 2, secret2);
        
        // Check game info - player1 should win (Rock beats Scissors)
        let (id, p1, p2, stake, _, status, _, _, _, _, move1, move2, winner) = 
            RockPaperScissors::get_game_info(game_address);
        assert!(status == 3, 1);  // Finished
        assert!(move1 == 0, 2);  // Rock
        assert!(move2 == 2, 3);  // Scissors
        assert!(winner == p1, 4);  // Player 1 wins
    }

    #[test(admin = @RockPaperScissors, player1 = @0x1, player2 = @0x2)]
    fun test_tie_game(admin: signer, player1: signer, player2: signer) acquires TestMetadata {
        RockPaperScissors::init_for_testing(&admin);
        let asset = create_test_asset(&admin);
        
        // Mint tokens to players
        mint_asset(&admin, signer::address_of(&player1), 1000);
        mint_asset(&admin, signer::address_of(&player2), 1000);
        
        // Create game
        let constructor_ref = &object::create_named_object(&player1, b"Game");
        let game_address = object::address_from_constructor_ref(constructor_ref);
        RockPaperScissors::create_game(&player1, 100, asset);
        
        // Player 2 joins
        RockPaperScissors::join_game(&player2, game_address);
        
        // Both players commit Rock
        let secret1 = vector::empty<u8>();
        vector::push_back(&mut secret1, 42);
        let commit1 = compute_commit_hash(0, secret1);  // Rock = 0
        RockPaperScissors::commit_move(&player1, game_address, commit1);
        
        let secret2 = vector::empty<u8>();
        vector::push_back(&mut secret2, 99);
        let commit2 = compute_commit_hash(0, secret2);  // Rock = 0
        RockPaperScissors::commit_move(&player2, game_address, commit2);
        
        // Both players reveal
        RockPaperScissors::reveal_move(&player1, game_address, 0, secret1);
        RockPaperScissors::reveal_move(&player2, game_address, 0, secret2);
        
        // Check game info - should be tie
        let (id, p1, p2, stake, _, status, _, _, _, _, move1, move2, winner) = 
            RockPaperScissors::get_game_info(game_address);
        assert!(status == 3, 1);  // Finished
        assert!(move1 == 0, 2);  // Rock
        assert!(move2 == 0, 3);  // Rock
        assert!(winner == @0x0, 4);  // Tie
    }

    #[test(admin = @RockPaperScissors, player1 = @0x1, player2 = @0x2)]
    fun test_game_exists(admin: signer, player1: signer, player2: signer) {
        RockPaperScissors::init_for_testing(&admin);
        let asset = create_test_asset(&admin);
        
        // Create game
        let constructor_ref = &object::create_named_object(&player1, b"Game");
        let game_address = object::address_from_constructor_ref(constructor_ref);
        RockPaperScissors::create_game(&player1, 0, asset);
        
        // Check game exists
        assert!(RockPaperScissors::game_exists(game_address), 1);
        assert!(!RockPaperScissors::game_exists(@0x999), 2);
    }
}

