// Unit tests for the Texas Hold'em game module
// 
// Tests cover:
// - Game initialization
// - Player joining
// - Secret reveal and verification
// - Card dealing
// - Winner determination
// - Error cases and edge conditions
#[test_only]
module holdemgame::texas_holdem_tests {
    use std::signer;
    use std::vector;
    use cedra_std::hash;
    use holdemgame::texas_holdem;

    // ============================================
    // TEST CONSTANTS
    // ============================================
    
    const STATE_JOINING: u8 = 0;
    const STATE_REVEALING: u8 = 1;
    const STATE_DEALT: u8 = 2;

    // ============================================
    // HELPER FUNCTIONS
    // ============================================

    /// Create a test secret and its hash
    fun create_secret_and_hash(secret_bytes: vector<u8>): (vector<u8>, vector<u8>) {
        let hash = hash::sha3_256(secret_bytes);
        (secret_bytes, hash)
    }

    // ============================================
    // INITIALIZATION TESTS
    // ============================================

    #[test(admin = @holdemgame)]
    fun test_init_success(admin: &signer) {
        texas_holdem::init(admin);
        let game_addr = signer::address_of(admin);
        
        // Verify initial state
        let state = texas_holdem::view_game_state(game_addr);
        assert!(state == STATE_JOINING, 0);
        
        // Verify no players
        let player_count = texas_holdem::view_player_count(game_addr);
        assert!(player_count == 0, 1);
    }

    #[test(admin = @holdemgame)]
    #[expected_failure(abort_code = 2)] // E_GAME_ALREADY_INITIALIZED
    fun test_init_fails_if_already_initialized(admin: &signer) {
        texas_holdem::init(admin);
        texas_holdem::init(admin); // Should fail
    }

    // ============================================
    // JOIN GAME TESTS
    // ============================================

    #[test(admin = @holdemgame, player1 = @0x1)]
    fun test_join_game_single_player(admin: &signer, player1: &signer) {
        texas_holdem::init(admin);
        let game_addr = signer::address_of(admin);
        
        let (_secret, commit) = create_secret_and_hash(b"player1_secret");
        texas_holdem::join_game(player1, game_addr, commit);
        
        // Verify player count
        let player_count = texas_holdem::view_player_count(game_addr);
        assert!(player_count == 1, 0);
        
        // Verify still in joining state
        let state = texas_holdem::view_game_state(game_addr);
        assert!(state == STATE_JOINING, 1);
    }

    #[test(admin = @holdemgame, p1 = @0x1, p2 = @0x2, p3 = @0x3, p4 = @0x4, p5 = @0x5)]
    fun test_join_game_five_players_transitions_to_revealing(
        admin: &signer,
        p1: &signer,
        p2: &signer,
        p3: &signer,
        p4: &signer,
        p5: &signer
    ) {
        texas_holdem::init(admin);
        let game_addr = signer::address_of(admin);
        
        // All 5 players join
        let (_, c1) = create_secret_and_hash(b"secret1");
        let (_, c2) = create_secret_and_hash(b"secret2");
        let (_, c3) = create_secret_and_hash(b"secret3");
        let (_, c4) = create_secret_and_hash(b"secret4");
        let (_, c5) = create_secret_and_hash(b"secret5");
        
        texas_holdem::join_game(p1, game_addr, c1);
        texas_holdem::join_game(p2, game_addr, c2);
        texas_holdem::join_game(p3, game_addr, c3);
        texas_holdem::join_game(p4, game_addr, c4);
        texas_holdem::join_game(p5, game_addr, c5);
        
        // Verify state transitioned to revealing
        let state = texas_holdem::view_game_state(game_addr);
        assert!(state == STATE_REVEALING, 0);
        
        // Verify player count
        let player_count = texas_holdem::view_player_count(game_addr);
        assert!(player_count == 5, 1);
    }

    #[test(admin = @holdemgame, player1 = @0x1)]
    #[expected_failure(abort_code = 4)] // E_ALREADY_JOINED
    fun test_join_game_fails_if_already_joined(admin: &signer, player1: &signer) {
        texas_holdem::init(admin);
        let game_addr = signer::address_of(admin);
        
        let (_, commit) = create_secret_and_hash(b"secret");
        texas_holdem::join_game(player1, game_addr, commit);
        texas_holdem::join_game(player1, game_addr, commit); // Should fail
    }

    #[test(admin = @holdemgame, p1 = @0x1, p2 = @0x2, p3 = @0x3, p4 = @0x4, p5 = @0x5, p6 = @0x6)]
    #[expected_failure(abort_code = 9)] // E_WRONG_PHASE (game transitions to REVEALING after 5 players)
    fun test_join_game_fails_if_full(
        admin: &signer,
        p1: &signer,
        p2: &signer,
        p3: &signer,
        p4: &signer,
        p5: &signer,
        p6: &signer
    ) {
        texas_holdem::init(admin);
        let game_addr = signer::address_of(admin);
        
        let (_, c1) = create_secret_and_hash(b"secret1");
        let (_, c2) = create_secret_and_hash(b"secret2");
        let (_, c3) = create_secret_and_hash(b"secret3");
        let (_, c4) = create_secret_and_hash(b"secret4");
        let (_, c5) = create_secret_and_hash(b"secret5");
        let (_, c6) = create_secret_and_hash(b"secret6");
        
        texas_holdem::join_game(p1, game_addr, c1);
        texas_holdem::join_game(p2, game_addr, c2);
        texas_holdem::join_game(p3, game_addr, c3);
        texas_holdem::join_game(p4, game_addr, c4);
        texas_holdem::join_game(p5, game_addr, c5);
        texas_holdem::join_game(p6, game_addr, c6); // Should fail - game full
    }

    #[test(admin = @holdemgame, player1 = @0x1)]
    #[expected_failure(abort_code = 10)] // E_INVALID_COMMIT_LENGTH
    fun test_join_game_fails_with_invalid_commit_length(admin: &signer, player1: &signer) {
        texas_holdem::init(admin);
        let game_addr = signer::address_of(admin);
        
        // Commit not 32 bytes
        let bad_commit = b"too_short";
        texas_holdem::join_game(player1, game_addr, bad_commit); // Should fail
    }

    // ============================================
    // REVEAL SECRET TESTS
    // ============================================

    #[test(admin = @holdemgame, p1 = @0x1, p2 = @0x2, p3 = @0x3, p4 = @0x4, p5 = @0x5)]
    fun test_reveal_secret_single_player(
        admin: &signer,
        p1: &signer,
        p2: &signer,
        p3: &signer,
        p4: &signer,
        p5: &signer
    ) {
        texas_holdem::init(admin);
        let game_addr = signer::address_of(admin);
        
        // Setup: all players join
        let (s1, c1) = create_secret_and_hash(b"secret1");
        let (_, c2) = create_secret_and_hash(b"secret2");
        let (_, c3) = create_secret_and_hash(b"secret3");
        let (_, c4) = create_secret_and_hash(b"secret4");
        let (_, c5) = create_secret_and_hash(b"secret5");
        
        texas_holdem::join_game(p1, game_addr, c1);
        texas_holdem::join_game(p2, game_addr, c2);
        texas_holdem::join_game(p3, game_addr, c3);
        texas_holdem::join_game(p4, game_addr, c4);
        texas_holdem::join_game(p5, game_addr, c5);
        
        // Player 1 reveals
        texas_holdem::reveal_secret(p1, game_addr, s1);
        
        // Verify reveal count
        let reveal_count = texas_holdem::view_reveal_count(game_addr);
        assert!(reveal_count == 1, 0);
        
        // Verify player 1 has revealed
        let has_revealed = texas_holdem::has_player_revealed(game_addr, signer::address_of(p1));
        assert!(has_revealed, 1);
        
        // Still in revealing state
        let state = texas_holdem::view_game_state(game_addr);
        assert!(state == STATE_REVEALING, 2);
    }

    #[test(admin = @holdemgame, p1 = @0x1, p2 = @0x2, p3 = @0x3, p4 = @0x4, p5 = @0x5)]
    fun test_reveal_all_secrets_deals_cards(
        admin: &signer,
        p1: &signer,
        p2: &signer,
        p3: &signer,
        p4: &signer,
        p5: &signer
    ) {
        texas_holdem::init(admin);
        let game_addr = signer::address_of(admin);
        
        // Setup secrets
        let (s1, c1) = create_secret_and_hash(b"secret1");
        let (s2, c2) = create_secret_and_hash(b"secret2");
        let (s3, c3) = create_secret_and_hash(b"secret3");
        let (s4, c4) = create_secret_and_hash(b"secret4");
        let (s5, c5) = create_secret_and_hash(b"secret5");
        
        // All players join
        texas_holdem::join_game(p1, game_addr, c1);
        texas_holdem::join_game(p2, game_addr, c2);
        texas_holdem::join_game(p3, game_addr, c3);
        texas_holdem::join_game(p4, game_addr, c4);
        texas_holdem::join_game(p5, game_addr, c5);
        
        // All players reveal
        texas_holdem::reveal_secret(p1, game_addr, s1);
        texas_holdem::reveal_secret(p2, game_addr, s2);
        texas_holdem::reveal_secret(p3, game_addr, s3);
        texas_holdem::reveal_secret(p4, game_addr, s4);
        texas_holdem::reveal_secret(p5, game_addr, s5);
        
        // Verify state transitioned to dealt
        let state = texas_holdem::view_game_state(game_addr);
        assert!(state == STATE_DEALT, 0);
        
        // Verify hole cards exist for each player
        let hole1 = texas_holdem::view_hole_cards(game_addr, signer::address_of(p1));
        assert!(vector::length(&hole1) == 2, 1);
        
        let hole2 = texas_holdem::view_hole_cards(game_addr, signer::address_of(p2));
        assert!(vector::length(&hole2) == 2, 2);
        
        // Verify community cards
        let community = texas_holdem::view_community_cards(game_addr);
        assert!(vector::length(&community) == 5, 3);
        
        // Verify cards are valid (0-51)
        let i = 0;
        while (i < 2) {
            let card = *vector::borrow(&hole1, i);
            assert!(card < 52, 4);
            i = i + 1;
        };
    }

    #[test(admin = @holdemgame, p1 = @0x1, p2 = @0x2, p3 = @0x3, p4 = @0x4, p5 = @0x5)]
    #[expected_failure(abort_code = 8)] // E_INVALID_SECRET
    fun test_reveal_fails_with_wrong_secret(
        admin: &signer,
        p1: &signer,
        p2: &signer,
        p3: &signer,
        p4: &signer,
        p5: &signer
    ) {
        texas_holdem::init(admin);
        let game_addr = signer::address_of(admin);
        
        let (_, c1) = create_secret_and_hash(b"secret1");
        let (_, c2) = create_secret_and_hash(b"secret2");
        let (_, c3) = create_secret_and_hash(b"secret3");
        let (_, c4) = create_secret_and_hash(b"secret4");
        let (_, c5) = create_secret_and_hash(b"secret5");
        
        texas_holdem::join_game(p1, game_addr, c1);
        texas_holdem::join_game(p2, game_addr, c2);
        texas_holdem::join_game(p3, game_addr, c3);
        texas_holdem::join_game(p4, game_addr, c4);
        texas_holdem::join_game(p5, game_addr, c5);
        
        // Reveal with wrong secret
        texas_holdem::reveal_secret(p1, game_addr, b"wrong_secret"); // Should fail
    }

    #[test(admin = @holdemgame, p1 = @0x1, p2 = @0x2, p3 = @0x3, p4 = @0x4, p5 = @0x5)]
    #[expected_failure(abort_code = 7)] // E_ALREADY_REVEALED
    fun test_reveal_fails_if_already_revealed(
        admin: &signer,
        p1: &signer,
        p2: &signer,
        p3: &signer,
        p4: &signer,
        p5: &signer
    ) {
        texas_holdem::init(admin);
        let game_addr = signer::address_of(admin);
        
        let (s1, c1) = create_secret_and_hash(b"secret1");
        let (_, c2) = create_secret_and_hash(b"secret2");
        let (_, c3) = create_secret_and_hash(b"secret3");
        let (_, c4) = create_secret_and_hash(b"secret4");
        let (_, c5) = create_secret_and_hash(b"secret5");
        
        texas_holdem::join_game(p1, game_addr, c1);
        texas_holdem::join_game(p2, game_addr, c2);
        texas_holdem::join_game(p3, game_addr, c3);
        texas_holdem::join_game(p4, game_addr, c4);
        texas_holdem::join_game(p5, game_addr, c5);
        
        texas_holdem::reveal_secret(p1, game_addr, s1);
        texas_holdem::reveal_secret(p1, game_addr, s1); // Should fail
    }

    #[test(admin = @holdemgame, non_player = @0x99)]
    #[expected_failure(abort_code = 9)] // E_WRONG_PHASE
    fun test_reveal_fails_in_wrong_phase(admin: &signer, non_player: &signer) {
        texas_holdem::init(admin);
        let game_addr = signer::address_of(admin);
        
        // Try to reveal before anyone has joined (still in JOINING phase)
        texas_holdem::reveal_secret(non_player, game_addr, b"secret"); // Should fail
    }

    // ============================================
    // WINNER DETERMINATION TESTS
    // ============================================

    #[test(admin = @holdemgame, p1 = @0x1, p2 = @0x2, p3 = @0x3, p4 = @0x4, p5 = @0x5)]
    fun test_view_winners_returns_at_least_one(
        admin: &signer,
        p1: &signer,
        p2: &signer,
        p3: &signer,
        p4: &signer,
        p5: &signer
    ) {
        texas_holdem::init(admin);
        let game_addr = signer::address_of(admin);
        
        // Complete game setup
        let (s1, c1) = create_secret_and_hash(b"secret1");
        let (s2, c2) = create_secret_and_hash(b"secret2");
        let (s3, c3) = create_secret_and_hash(b"secret3");
        let (s4, c4) = create_secret_and_hash(b"secret4");
        let (s5, c5) = create_secret_and_hash(b"secret5");
        
        texas_holdem::join_game(p1, game_addr, c1);
        texas_holdem::join_game(p2, game_addr, c2);
        texas_holdem::join_game(p3, game_addr, c3);
        texas_holdem::join_game(p4, game_addr, c4);
        texas_holdem::join_game(p5, game_addr, c5);
        
        texas_holdem::reveal_secret(p1, game_addr, s1);
        texas_holdem::reveal_secret(p2, game_addr, s2);
        texas_holdem::reveal_secret(p3, game_addr, s3);
        texas_holdem::reveal_secret(p4, game_addr, s4);
        texas_holdem::reveal_secret(p5, game_addr, s5);
        
        // Get winners
        let winners = texas_holdem::view_winners(game_addr);
        
        // Must have at least one winner
        assert!(vector::length(&winners) >= 1, 0);
        
        // Winners must be players
        let i = 0;
        let players = texas_holdem::view_players(game_addr);
        while (i < vector::length(&winners)) {
            let winner = *vector::borrow(&winners, i);
            assert!(vector::contains(&players, &winner), 1);
            i = i + 1;
        };
    }

    // ============================================
    // RESET TESTS
    // ============================================

    #[test(admin = @holdemgame, p1 = @0x1, p2 = @0x2, p3 = @0x3, p4 = @0x4, p5 = @0x5)]
    fun test_reset_clears_game(
        admin: &signer,
        p1: &signer,
        p2: &signer,
        p3: &signer,
        p4: &signer,
        p5: &signer
    ) {
        texas_holdem::init(admin);
        let game_addr = signer::address_of(admin);
        
        // Complete a full game
        let (s1, c1) = create_secret_and_hash(b"secret1");
        let (s2, c2) = create_secret_and_hash(b"secret2");
        let (s3, c3) = create_secret_and_hash(b"secret3");
        let (s4, c4) = create_secret_and_hash(b"secret4");
        let (s5, c5) = create_secret_and_hash(b"secret5");
        
        texas_holdem::join_game(p1, game_addr, c1);
        texas_holdem::join_game(p2, game_addr, c2);
        texas_holdem::join_game(p3, game_addr, c3);
        texas_holdem::join_game(p4, game_addr, c4);
        texas_holdem::join_game(p5, game_addr, c5);
        
        texas_holdem::reveal_secret(p1, game_addr, s1);
        texas_holdem::reveal_secret(p2, game_addr, s2);
        texas_holdem::reveal_secret(p3, game_addr, s3);
        texas_holdem::reveal_secret(p4, game_addr, s4);
        texas_holdem::reveal_secret(p5, game_addr, s5);
        
        // Verify game is dealt
        assert!(texas_holdem::view_game_state(game_addr) == STATE_DEALT, 0);
        
        // Reset
        texas_holdem::reset(admin, game_addr);
        
        // Verify state is back to joining
        assert!(texas_holdem::view_game_state(game_addr) == STATE_JOINING, 1);
        
        // Verify no players
        assert!(texas_holdem::view_player_count(game_addr) == 0, 2);
    }

    #[test(admin = @holdemgame, non_admin = @0x99)]
    #[expected_failure(abort_code = 1)] // E_NOT_ADMIN
    fun test_reset_fails_for_non_admin(admin: &signer, non_admin: &signer) {
        texas_holdem::init(admin);
        let game_addr = signer::address_of(admin);
        texas_holdem::reset(non_admin, game_addr); // Should fail - non_admin is not the admin
    }

    // ============================================
    // DETERMINISM TESTS
    // ============================================

    #[test(admin = @holdemgame, p1 = @0x1, p2 = @0x2, p3 = @0x3, p4 = @0x4, p5 = @0x5)]
    fun test_same_secrets_produce_same_cards(
        admin: &signer,
        p1: &signer,
        p2: &signer,
        p3: &signer,
        p4: &signer,
        p5: &signer
    ) {
        // First game
        texas_holdem::init(admin);
        let game_addr = signer::address_of(admin);
        
        let (s1, c1) = create_secret_and_hash(b"deterministic1");
        let (s2, c2) = create_secret_and_hash(b"deterministic2");
        let (s3, c3) = create_secret_and_hash(b"deterministic3");
        let (s4, c4) = create_secret_and_hash(b"deterministic4");
        let (s5, c5) = create_secret_and_hash(b"deterministic5");
        
        texas_holdem::join_game(p1, game_addr, c1);
        texas_holdem::join_game(p2, game_addr, c2);
        texas_holdem::join_game(p3, game_addr, c3);
        texas_holdem::join_game(p4, game_addr, c4);
        texas_holdem::join_game(p5, game_addr, c5);
        
        texas_holdem::reveal_secret(p1, game_addr, s1);
        texas_holdem::reveal_secret(p2, game_addr, s2);
        texas_holdem::reveal_secret(p3, game_addr, s3);
        texas_holdem::reveal_secret(p4, game_addr, s4);
        texas_holdem::reveal_secret(p5, game_addr, s5);
        
        let community_1 = texas_holdem::view_community_cards(game_addr);
        let hole_1 = texas_holdem::view_hole_cards(game_addr, signer::address_of(p1));
        
        // Reset and play again with same secrets
        texas_holdem::reset(admin, game_addr);
        
        texas_holdem::join_game(p1, game_addr, c1);
        texas_holdem::join_game(p2, game_addr, c2);
        texas_holdem::join_game(p3, game_addr, c3);
        texas_holdem::join_game(p4, game_addr, c4);
        texas_holdem::join_game(p5, game_addr, c5);
        
        texas_holdem::reveal_secret(p1, game_addr, s1);
        texas_holdem::reveal_secret(p2, game_addr, s2);
        texas_holdem::reveal_secret(p3, game_addr, s3);
        texas_holdem::reveal_secret(p4, game_addr, s4);
        texas_holdem::reveal_secret(p5, game_addr, s5);
        
        let community_2 = texas_holdem::view_community_cards(game_addr);
        let hole_2 = texas_holdem::view_hole_cards(game_addr, signer::address_of(p1));
        
        // Same secrets should produce same cards
        assert!(community_1 == community_2, 0);
        assert!(hole_1 == hole_2, 1);
    }
}
