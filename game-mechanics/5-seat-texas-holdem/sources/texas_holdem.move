/// 5-Seat Texas Hold'em Game Module
/// 
/// A fully on-chain, multi-player card game demonstrating commit-reveal randomness,
/// resource-safe state management, and parallel execution on Cedra.
/// 
/// This module implements a simplified Texas Hold'em-style card game where:
/// - 5 players commit to secrets, then reveal to seed a deterministic shuffle
/// - Cards are dealt (2 hole cards per player + 5 community cards)
/// - A simple scoring function determines winners
/// - No wagering or betting is involved
module holdemgame::texas_holdem {
    use std::vector;
    use std::signer;
    use cedra_std::hash;

    // ============================================
    // ERROR CODES
    // ============================================
    
    /// Caller is not the admin
    const E_NOT_ADMIN: u64 = 1;
    /// Game has already been initialized
    const E_GAME_ALREADY_INITIALIZED: u64 = 2;
    /// Game has not been initialized
    const E_GAME_NOT_INITIALIZED: u64 = 3;
    /// Player has already joined the game
    const E_ALREADY_JOINED: u64 = 4;
    /// Game is full (5 players max)
    const E_GAME_FULL: u64 = 5;
    /// Caller is not a registered player
    const E_NOT_A_PLAYER: u64 = 6;
    /// Player has already revealed their secret
    const E_ALREADY_REVEALED: u64 = 7;
    /// Secret does not match the commitment hash
    const E_INVALID_SECRET: u64 = 8;
    /// Operation not allowed in current game phase
    const E_WRONG_PHASE: u64 = 9;
    /// Commitment hash must be 32 bytes
    const E_INVALID_COMMIT_LENGTH: u64 = 10;

    // ============================================
    // GAME STATE CONSTANTS
    // ============================================
    
    /// Game is accepting new players
    const STATE_JOINING: u8 = 0;
    /// All players have joined, waiting for reveals
    const STATE_REVEALING: u8 = 1;
    /// Cards have been dealt, game is complete
    const STATE_DEALT: u8 = 2;

    // ============================================
    // GAME CONFIGURATION
    // ============================================
    
    /// Maximum number of players
    const MAX_PLAYERS: u64 = 5;
    /// Number of hole cards per player
    const CARDS_PER_PLAYER: u64 = 2;
    /// Number of community cards
    const COMMUNITY_CARDS: u64 = 5;
    /// Total cards in deck
    const DECK_SIZE: u64 = 52;

    // ============================================
    // DATA STRUCTURES
    // ============================================

    /// The main game resource stored at the admin's address
    /// 
    /// Card representation:
    /// - Cards are bytes 0-51
    /// - Rank = card % 13 (0=2, 1=3, ..., 12=Ace)
    /// - Suit = card / 13 (0=Clubs, 1=Diamonds, 2=Hearts, 3=Spades)
    struct Game has key {
        /// Addresses of joined players (max 5)
        players: vector<address>,
        /// SHA3-256 hashes of player secrets (commitments)
        commits: vector<vector<u8>>,
        /// Revealed secrets (populated during reveal phase)
        secrets: vector<vector<u8>>,
        /// The shuffled deck (52 cards, each 0-51)
        deck: vector<u8>,
        /// Hole cards for each player (2 cards each)
        hole_cards: vector<vector<u8>>,
        /// The 5 community cards
        community_cards: vector<u8>,
        /// Current game state (STATE_JOINING, STATE_REVEALING, STATE_DEALT)
        state: u8,
        /// Admin address (for reset permissions)
        admin: address,
    }

    // ============================================
    // ADMIN FUNCTIONS
    // ============================================

    /// Initialize a new game
    /// 
    /// This must be called once by the admin before players can join.
    /// Creates the Game resource under the admin's address.
    public entry fun init(admin: &signer) {
        let admin_addr = signer::address_of(admin);
        assert!(!exists<Game>(admin_addr), E_GAME_ALREADY_INITIALIZED);
        
        move_to(admin, Game {
            players: vector::empty(),
            commits: vector::empty(),
            secrets: vector::empty(),
            deck: vector::empty(),
            hole_cards: vector::empty(),
            community_cards: vector::empty(),
            state: STATE_JOINING,
            admin: admin_addr,
        });
    }

    /// Reset the game for a new round
    /// 
    /// Only the admin can call this. Clears all state and returns to JOINING phase.
    /// 
    /// # Arguments
    /// * `caller` - The signer attempting to reset (must be admin)
    /// * `game_addr` - Address where the Game resource is stored
    public entry fun reset(caller: &signer, game_addr: address) acquires Game {
        let caller_addr = signer::address_of(caller);
        assert!(exists<Game>(game_addr), E_GAME_NOT_INITIALIZED);
        
        let game = borrow_global_mut<Game>(game_addr);
        assert!(game.admin == caller_addr, E_NOT_ADMIN);
        
        game.players = vector::empty();
        game.commits = vector::empty();
        game.secrets = vector::empty();
        game.deck = vector::empty();
        game.hole_cards = vector::empty();
        game.community_cards = vector::empty();
        game.state = STATE_JOINING;
    }

    // ============================================
    // PLAYER FUNCTIONS
    // ============================================

    /// Join the game with a commitment hash
    /// 
    /// Players must submit the SHA3-256 hash of a secret value they choose off-chain.
    /// Once 5 players have joined, the game transitions to the reveal phase.
    /// 
    /// # Arguments
    /// * `player` - The player's signer
    /// * `game_addr` - Address where the Game resource is stored (admin's address)
    /// * `hashed_commit` - 32-byte SHA3-256 hash of the player's secret
    public entry fun join_game(
        player: &signer, 
        game_addr: address,
        hashed_commit: vector<u8>
    ) acquires Game {
        let player_addr = signer::address_of(player);
        assert!(exists<Game>(game_addr), E_GAME_NOT_INITIALIZED);
        
        let game = borrow_global_mut<Game>(game_addr);
        
        assert!(game.state == STATE_JOINING, E_WRONG_PHASE);
        assert!(vector::length(&game.players) < MAX_PLAYERS, E_GAME_FULL);
        assert!(!vector::contains(&game.players, &player_addr), E_ALREADY_JOINED);
        assert!(vector::length(&hashed_commit) == 32, E_INVALID_COMMIT_LENGTH);
        
        vector::push_back(&mut game.players, player_addr);
        vector::push_back(&mut game.commits, hashed_commit);
        
        // Initialize empty secret slot for this player
        vector::push_back(&mut game.secrets, vector::empty());
        
        // Transition to reveal phase when full
        if (vector::length(&game.players) == MAX_PLAYERS) {
            game.state = STATE_REVEALING;
        };
    }

    /// Reveal your secret
    /// 
    /// The contract verifies that sha3_256(secret) matches the stored commitment.
    /// When all 5 players have revealed, the deck is shuffled and cards are dealt.
    /// 
    /// # Arguments
    /// * `player` - The player's signer
    /// * `game_addr` - Address where the Game resource is stored
    /// * `secret` - The original secret value (pre-image of the commitment)
    public entry fun reveal_secret(
        player: &signer,
        game_addr: address,
        secret: vector<u8>
    ) acquires Game {
        let player_addr = signer::address_of(player);
        assert!(exists<Game>(game_addr), E_GAME_NOT_INITIALIZED);
        
        let game = borrow_global_mut<Game>(game_addr);
        
        assert!(game.state == STATE_REVEALING, E_WRONG_PHASE);
        
        // Find player index
        let (found, idx) = vector::index_of(&game.players, &player_addr);
        assert!(found, E_NOT_A_PLAYER);
        
        // Check not already revealed
        let existing_secret = vector::borrow(&game.secrets, idx);
        assert!(vector::is_empty(existing_secret), E_ALREADY_REVEALED);
        
        // Verify commitment
        let computed_hash = hash::sha3_256(secret);
        let stored_commit = vector::borrow(&game.commits, idx);
        assert!(computed_hash == *stored_commit, E_INVALID_SECRET);
        
        // Store the revealed secret
        *vector::borrow_mut(&mut game.secrets, idx) = secret;
        
        // Check if all revealed, then shuffle and deal
        if (all_secrets_revealed(game)) {
            shuffle_and_deal(game);
            game.state = STATE_DEALT;
        };
    }

    // ============================================
    // INTERNAL FUNCTIONS
    // ============================================

    /// Check if all players have revealed their secrets
    fun all_secrets_revealed(game: &Game): bool {
        let len = vector::length(&game.secrets);
        if (len != MAX_PLAYERS) { return false };
        
        let i = 0;
        while (i < len) {
            if (vector::is_empty(vector::borrow(&game.secrets, i))) {
                return false
            };
            i = i + 1;
        };
        true
    }

    /// Shuffle the deck and deal cards to all players
    /// 
    /// Uses Fisher-Yates shuffle with hash-based randomness derived from
    /// all players' revealed secrets.
    fun shuffle_and_deal(game: &mut Game) {
        // Concatenate all secrets and hash for seed
        let seed = vector::empty<u8>();
        let i = 0;
        while (i < MAX_PLAYERS) {
            let player_secret = vector::borrow(&game.secrets, i);
            let j = 0;
            while (j < vector::length(player_secret)) {
                vector::push_back(&mut seed, *vector::borrow(player_secret, j));
                j = j + 1;
            };
            i = i + 1;
        };
        let seed_hash = hash::sha3_256(seed);
        
        // Initialize deck (0-51)
        let deck = vector::empty<u8>();
        let c = 0u8;
        while ((c as u64) < DECK_SIZE) {
            vector::push_back(&mut deck, c);
            c = c + 1;
        };
        
        // Fisher-Yates shuffle using hash-based randomness
        let hash_state = seed_hash;
        let n = DECK_SIZE;
        while (n > 1) {
            hash_state = hash::sha3_256(hash_state);
            let rand_byte = *vector::borrow(&hash_state, 0);
            let j = ((rand_byte as u64) % n);
            n = n - 1;
            vector::swap(&mut deck, n, j);
        };
        
        game.deck = deck;
        
        // Deal hole cards (2 per player)
        let hole_cards = vector::empty<vector<u8>>();
        let card_idx = 0u64;
        let p = 0u64;
        while (p < MAX_PLAYERS) {
            let player_cards = vector::empty<u8>();
            vector::push_back(&mut player_cards, *vector::borrow(&game.deck, card_idx));
            vector::push_back(&mut player_cards, *vector::borrow(&game.deck, card_idx + 1));
            vector::push_back(&mut hole_cards, player_cards);
            card_idx = card_idx + 2;
            p = p + 1;
        };
        game.hole_cards = hole_cards;
        
        // Deal community cards (next 5)
        let community = vector::empty<u8>();
        let c = 0u64;
        while (c < COMMUNITY_CARDS) {
            vector::push_back(&mut community, *vector::borrow(&game.deck, card_idx));
            card_idx = card_idx + 1;
            c = c + 1;
        };
        game.community_cards = community;
    }

    /// Compute a simplified score for a player's hand
    /// 
    /// Score = sum of hole card ranks + sum of top 3 community card ranks
    /// This is NOT a proper poker hand evaluator, just a simple demo.
    fun compute_score(hole: &vector<u8>, community: &vector<u8>): u64 {
        let score = 0u64;
        
        // Add hole card ranks
        let i = 0u64;
        while (i < vector::length(hole)) {
            let card = *vector::borrow(hole, i);
            score = score + ((card % 13) as u64);
            i = i + 1;
        };
        
        // Collect community card ranks
        let ranks = vector::empty<u64>();
        let i = 0u64;
        while (i < vector::length(community)) {
            let card = *vector::borrow(community, i);
            vector::push_back(&mut ranks, ((card % 13) as u64));
            i = i + 1;
        };
        
        // Simple bubble sort descending
        let n = vector::length(&ranks);
        let i = 0u64;
        while (i < n) {
            let j = i + 1;
            while (j < n) {
                if (*vector::borrow(&ranks, j) > *vector::borrow(&ranks, i)) {
                    vector::swap(&mut ranks, i, j);
                };
                j = j + 1;
            };
            i = i + 1;
        };
        
        // Add top 3 ranks
        let i = 0u64;
        while (i < 3 && i < n) {
            score = score + *vector::borrow(&ranks, i);
            i = i + 1;
        };
        
        score
    }

    // ============================================
    // VIEW FUNCTIONS
    // ============================================

    #[view]
    /// Get a player's hole cards
    /// 
    /// Can only be called after cards are dealt (STATE_DEALT).
    /// Returns a vector of 2 card bytes.
    public fun view_hole_cards(game_addr: address, player: address): vector<u8> acquires Game {
        assert!(exists<Game>(game_addr), E_GAME_NOT_INITIALIZED);
        let game = borrow_global<Game>(game_addr);
        assert!(game.state == STATE_DEALT, E_WRONG_PHASE);
        
        let (found, idx) = vector::index_of(&game.players, &player);
        assert!(found, E_NOT_A_PLAYER);
        
        *vector::borrow(&game.hole_cards, idx)
    }

    #[view]
    /// Get the community cards
    /// 
    /// Can only be called after cards are dealt (STATE_DEALT).
    /// Returns a vector of 5 card bytes.
    public fun view_community_cards(game_addr: address): vector<u8> acquires Game {
        assert!(exists<Game>(game_addr), E_GAME_NOT_INITIALIZED);
        let game = borrow_global<Game>(game_addr);
        assert!(game.state == STATE_DEALT, E_WRONG_PHASE);
        game.community_cards
    }

    #[view]
    /// Compute winners based on simplified scoring
    /// 
    /// Returns addresses of all players with the highest score (handles ties).
    /// Uses a simple scoring rule: sum of hole card ranks + best 3 community ranks.
    public fun view_winners(game_addr: address): vector<address> acquires Game {
        assert!(exists<Game>(game_addr), E_GAME_NOT_INITIALIZED);
        let game = borrow_global<Game>(game_addr);
        assert!(game.state == STATE_DEALT, E_WRONG_PHASE);
        
        let scores = vector::empty<u64>();
        let max_score = 0u64;
        
        // Compute score for each player
        let p = 0u64;
        while (p < MAX_PLAYERS) {
            let score = compute_score(
                vector::borrow(&game.hole_cards, p),
                &game.community_cards
            );
            vector::push_back(&mut scores, score);
            if (score > max_score) {
                max_score = score;
            };
            p = p + 1;
        };
        
        // Find all players with max score (handle ties)
        let winners = vector::empty<address>();
        let p = 0u64;
        while (p < MAX_PLAYERS) {
            if (*vector::borrow(&scores, p) == max_score) {
                vector::push_back(&mut winners, *vector::borrow(&game.players, p));
            };
            p = p + 1;
        };
        
        winners
    }

    #[view]
    /// Get current game state
    /// 
    /// Returns:
    /// - 0 = STATE_JOINING (accepting players)
    /// - 1 = STATE_REVEALING (waiting for reveals)
    /// - 2 = STATE_DEALT (cards dealt, round complete)
    public fun view_game_state(game_addr: address): u8 acquires Game {
        assert!(exists<Game>(game_addr), E_GAME_NOT_INITIALIZED);
        borrow_global<Game>(game_addr).state
    }

    #[view]
    /// Get list of players
    /// 
    /// Returns addresses of all players who have joined.
    public fun view_players(game_addr: address): vector<address> acquires Game {
        assert!(exists<Game>(game_addr), E_GAME_NOT_INITIALIZED);
        borrow_global<Game>(game_addr).players
    }

    #[view]
    /// Get number of players who have joined
    public fun view_player_count(game_addr: address): u64 acquires Game {
        assert!(exists<Game>(game_addr), E_GAME_NOT_INITIALIZED);
        vector::length(&borrow_global<Game>(game_addr).players)
    }

    #[view]
    /// Check if a specific player has revealed their secret
    public fun has_player_revealed(game_addr: address, player: address): bool acquires Game {
        assert!(exists<Game>(game_addr), E_GAME_NOT_INITIALIZED);
        let game = borrow_global<Game>(game_addr);
        
        let (found, idx) = vector::index_of(&game.players, &player);
        if (!found) { return false };
        
        !vector::is_empty(vector::borrow(&game.secrets, idx))
    }

    #[view]
    /// Get the number of players who have revealed their secrets
    public fun view_reveal_count(game_addr: address): u64 acquires Game {
        assert!(exists<Game>(game_addr), E_GAME_NOT_INITIALIZED);
        let game = borrow_global<Game>(game_addr);
        
        let count = 0u64;
        let i = 0u64;
        while (i < vector::length(&game.secrets)) {
            if (!vector::is_empty(vector::borrow(&game.secrets, i))) {
                count = count + 1;
            };
            i = i + 1;
        };
        count
    }

    // ============================================
    // TEST HELPERS
    // ============================================

    #[test_only]
    /// Initialize the game for testing
    public fun init_for_test(admin: &signer) {
        init(admin);
    }

    #[test_only]
    /// Get the admin address from a game
    public fun get_admin(game_addr: address): address acquires Game {
        borrow_global<Game>(game_addr).admin
    }
}
