/// Deterministic Car Racing Game for Cedra Blockchain
/// Players submit movement sequences to reach a destination
/// First player to complete the track in 3 steps or less earns an NFT
/// Movement: UP(1), DOWN(2), LEFT(3), RIGHT(4)
/// Author: COAT
module race::race {
    use cedra_framework::object::{Self};
    use cedra_framework::timestamp;
    use cedra_framework::event;
    use cedra_token_objects::collection;
    use cedra_token_objects::token;
    use std::vector;
    use std::error;
    use std::signer;
    use std::string::{Self, String};
    use std::option::{Self, Option};

    // ==================== Error Codes ====================

    const EGAME_NOT_FOUND: u64 = 1;          // Game doesn't exist at creator's address
    const EUNAUTHORIZED: u64 = 2;           // Player not authorized for operation
    const EINVALID_MOVE: u64 = 3;           // Invalid move direction (not 1-4)
    const EINVALID_STEPS: u64 = 4;          // Too many or zero steps submitted
    const EGAME_ALREADY_WON: u64 = 5;       // Game already has a winner
    const EINVALID_POSITION: u64 = 6;       // Position outside grid boundaries
    const ETOO_MANY_STEPS: u64 = 7;         // Exceeds MAX_STEPS limit
    const EGAME_ALREADY_EXISTS: u64 = 8;    // Creator already has a game
    const ECOLLECTION_NOT_FOUND: u64 = 9;   // NFT collection doesn't exist

    // ==================== Constants ====================

    const MAX_STEPS: u64 = 10;              // Maximum allowed moves per attempt
    const WINNING_STEPS: u64 = 3;           // Must complete in 3 or fewer moves to win
    const MOVE_UP: u8 = 1;                  // Direction constants for validation
    const MOVE_DOWN: u8 = 2;
    const MOVE_LEFT: u8 = 3;
    const MOVE_RIGHT: u8 = 4;
    const GRID_SIZE: u8 = 10;               // 10x10 grid (0-9 coordinates)

    // NFT Collection metadata constants
    const COLLECTION_NAME: vector<u8> = b"Race Winners Collection";
    const COLLECTION_DESCRIPTION: vector<u8> = b"NFT rewards for winning the deterministic car racing game";
    const COLLECTION_URI: vector<u8> = b"https://coat.game/race/collection";

    // ==================== Data Structures ====================

    /// Position on the game grid - stored as (x, y) coordinates
    struct Position has store, copy, drop {
        x: u8,
        y: u8,
    }

    /// Individual game instance stored at creator's address
    struct GameData has key {
        game_id: u64,               // Unique ID (timestamp-based)
        creator: address,          // Address that created the game
        start_position: Position,  // Starting position for all players
        destination: Position,     // Target position to reach
        winner: Option<address>,   // Winner's address if game completed
        completed_at: Option<u64>, // Timestamp when game was won
        created_at: u64,           // Timestamp when game was created
    }

    /// Player's attempt stored in vector - tracks all attempts for a game
    struct PlayerAttempt has store, drop {
        player: address,          // Address of player who made attempt
        steps: vector<u8>,        // Sequence of moves (1-4 values)
        final_position: Position, // Position after executing moves
        succeeded: bool,          // Whether attempt reached destination
        timestamp: u64,           // When attempt was made
    }

    /// Registry for game attempts - stores all attempts for a game
    struct GameAttempts has key {
        attempts: vector<PlayerAttempt>, // History of all attempts
    }

    /// Collection manager for NFT rewards - tracks minting stats
    struct CollectionManager has key {
        collection_name: String, // Name of NFT collection
        total_minted: u64,       // Count of NFTs minted to winners
    }

    // ==================== Events ====================

    #[event]
    struct GameCreated has drop, store {
        game_id: u64,
        creator: address,
        start_x: u8,
        start_y: u8,
        dest_x: u8,
        dest_y: u8,
    }

    #[event]
    struct AttemptMade has drop, store {
        game_id: u64,
        player: address,
        steps: vector<u8>,
        success: bool,
        final_x: u8,
        final_y: u8,
    }

    #[event]
    struct GameWon has drop, store {
        game_id: u64,
        winner: address,
        steps_taken: u64,
    }

    // ==================== Helper Functions ====================

    /// Validate a move direction - ensures it's one of the four allowed values
    fun is_valid_move(move_dir: u8): bool {
        move_dir == MOVE_UP || move_dir == MOVE_DOWN || 
        move_dir == MOVE_LEFT || move_dir == MOVE_RIGHT
    }

    /// Apply a move to a position - calculates new position with boundary checks
    fun apply_move(pos: Position, move_dir: u8): Position {
        let new_x = pos.x;
        let new_y = pos.y;

        // Apply movement with grid boundary checks (0 to GRID_SIZE-1)
        if (move_dir == MOVE_UP && pos.y < GRID_SIZE - 1) {
            new_y = pos.y + 1;
        } else if (move_dir == MOVE_DOWN && pos.y > 0) {
            new_y = pos.y - 1;
        } else if (move_dir == MOVE_RIGHT && pos.x < GRID_SIZE - 1) {
            new_x = pos.x + 1;
        } else if (move_dir == MOVE_LEFT && pos.x > 0) {
            new_x = pos.x - 1;
        };

        Position { x: new_x, y: new_y }
    }

    /// Check if two positions are equal - compares x and y coordinates
    fun positions_equal(pos1: &Position, pos2: &Position): bool {
        pos1.x == pos2.x && pos1.y == pos2.y
    }

    /// Replay moves deterministically - applies move sequence to starting position
    fun replay_moves(start: Position, moves: &vector<u8>): Position {
        let current_pos = start;
        let len = vector::length(moves);
        let i = 0;

        // Sequentially apply each move in the vector
        while (i < len) {
            let move_dir = *vector::borrow(moves, i);
            current_pos = apply_move(current_pos, move_dir);
            i = i + 1;
        };

        current_pos
    }

    /// Convert u64 to string - helper for potential NFT naming (currently unused)
    fun u64_to_string(value: u64): String {
        if (value == 0) {
            return string::utf8(b"0")
        };

        let buffer = vector::empty<u8>();
        // Convert each digit to ASCII character
        while (value > 0) {
            let digit = ((value % 10) as u8) + 48; // ASCII '0' = 48
            vector::push_back(&mut buffer, digit);
            value = value / 10;
        };

        vector::reverse(&mut buffer); // Digits were added in reverse order
        string::utf8(buffer)
    }

    // ==================== Initialization ====================

    /// Initialize the NFT collection for race winners
    public entry fun init_collection(creator: &signer) {
        let creator_addr = signer::address_of(creator);
        
        // Ensure only one collection per creator
        assert!(!exists<CollectionManager>(creator_addr), error::already_exists(EGAME_ALREADY_EXISTS));

        let collection_name = string::utf8(COLLECTION_NAME);
        let description = string::utf8(COLLECTION_DESCRIPTION);
        let uri = string::utf8(COLLECTION_URI);

        // Create unlimited NFT collection (no supply cap)
        collection::create_unlimited_collection(
            creator,
            description,
            collection_name,
            option::none(), // No maximum supply
            uri,
        );

        // Track collection management data
        move_to(creator, CollectionManager {
            collection_name,
            total_minted: 0,
        });
    }

    // ==================== Game Management ====================

    /// Create a new racing game with deterministic start and destination
    public entry fun create_game(
        creator: &signer,
        start_x: u8,
        start_y: u8,
        dest_x: u8,
        dest_y: u8,
    ) {
        let creator_addr = signer::address_of(creator);
        
        // Validate positions are within 10x10 grid
        assert!(start_x < GRID_SIZE, error::invalid_argument(EINVALID_POSITION));
        assert!(start_y < GRID_SIZE, error::invalid_argument(EINVALID_POSITION));
        assert!(dest_x < GRID_SIZE, error::invalid_argument(EINVALID_POSITION));
        assert!(dest_y < GRID_SIZE, error::invalid_argument(EINVALID_POSITION));
        
        // Each creator can only have one active game at their address
        assert!(!exists<GameData>(creator_addr), error::already_exists(EGAME_ALREADY_EXISTS));

        let game_id = timestamp::now_seconds(); // Use timestamp as unique game ID
        let start_position = Position { x: start_x, y: start_y };
        let destination = Position { x: dest_x, y: dest_y };

        // Store game data at creator's address
        move_to(creator, GameData {
            game_id,
            creator: creator_addr,
            start_position,
            destination,
            winner: option::none(),      // No winner yet
            completed_at: option::none(), // Game not completed
            created_at: timestamp::now_seconds(),
        });

        // Initialize empty attempts registry
        move_to(creator, GameAttempts {
            attempts: vector::empty<PlayerAttempt>(),
        });

        // Emit creation event for indexing
        event::emit(GameCreated {
            game_id,
            creator: creator_addr,
            start_x,
            start_y,
            dest_x,
            dest_y,
        });
    }

    /// Player submits moves to attempt to reach destination
    public entry fun play_game(
        player: &signer,
        game_creator: address,
        moves: vector<u8>,
    ) acquires GameData, GameAttempts, CollectionManager {
        let player_addr = signer::address_of(player);
        
        // Validate game exists at creator's address
        assert!(exists<GameData>(game_creator), error::not_found(EGAME_NOT_FOUND));
        
        let game = borrow_global_mut<GameData>(game_creator);
        
        // Check game hasn't already been won
        assert!(option::is_none(&game.winner), error::invalid_state(EGAME_ALREADY_WON));
        
        // Validate move count constraints
        let moves_count = vector::length(&moves);
        assert!(moves_count > 0 && moves_count <= MAX_STEPS, error::invalid_argument(EINVALID_STEPS));
        
        // Validate each move direction
        let i = 0;
        while (i < moves_count) {
            let move_dir = *vector::borrow(&moves, i);
            assert!(is_valid_move(move_dir), error::invalid_argument(EINVALID_MOVE));
            i = i + 1;
        };

        // Deterministically calculate final position from start
        let final_position = replay_moves(game.start_position, &moves);
        
        // Check if destination was reached
        let success = positions_equal(&final_position, &game.destination);
        
        // Record attempt in game history
        let attempts = borrow_global_mut<GameAttempts>(game_creator);
        vector::push_back(&mut attempts.attempts, PlayerAttempt {
            player: player_addr,
            steps: moves,
            final_position,
            succeeded: success,
            timestamp: timestamp::now_seconds(),
        });

        // Emit attempt event
        event::emit(AttemptMade {
            game_id: game.game_id,
            player: player_addr,
            steps: moves,
            success,
            final_x: final_position.x,
            final_y: final_position.y,
        });

        // Check for win condition: success AND within winning step limit
        if (success && moves_count <= WINNING_STEPS) {
            // Mark player as winner
            game.winner = option::some(player_addr);
            game.completed_at = option::some(timestamp::now_seconds());
            
            // Track NFT minting count (NFT minting logic removed for now)
            if (exists<CollectionManager>(game_creator)) {
                let collection_mgr = borrow_global_mut<CollectionManager>(game_creator);
                collection_mgr.total_minted = collection_mgr.total_minted + 1;
            };

            // Emit win event
            event::emit(GameWon {
                game_id: game.game_id,
                winner: player_addr,
                steps_taken: moves_count,
            });
        };
    }

    /// Reset game to allow new attempts - only creator can reset
    public entry fun reset_game(
        creator: &signer,
    ) acquires GameData, GameAttempts {
        let creator_addr = signer::address_of(creator);
        assert!(exists<GameData>(creator_addr), error::not_found(EGAME_NOT_FOUND));
        
        let game = borrow_global_mut<GameData>(creator_addr);
        // Only game creator can reset
        assert!(game.creator == creator_addr, error::permission_denied(EUNAUTHORIZED));
        
        // Clear winner and completion status
        game.winner = option::none();
        game.completed_at = option::none();
        
        // Clear all attempts history
        let attempts = borrow_global_mut<GameAttempts>(creator_addr);
        attempts.attempts = vector::empty<PlayerAttempt>();
    }

    // ==================== View Functions ====================

    #[view]
    public fun get_game_info(game_creator: address): (
        u64, address, u8, u8, u8, u8, vector<address>, u64
    ) acquires GameData {
        assert!(exists<GameData>(game_creator), error::not_found(EGAME_NOT_FOUND));
        let game = borrow_global<GameData>(game_creator);
        
        // Return winner as vector (empty if no winner)
        let winner_vec = if (option::is_some(&game.winner)) {
            vector::singleton(*option::borrow(&game.winner))
        } else {
            vector::empty<address>()
        };

        // Return game metadata
        (
            game.game_id,
            game.creator,
            game.start_position.x,
            game.start_position.y,
            game.destination.x,
            game.destination.y,
            winner_vec,
            game.created_at,
        )
    }

    #[view]
    public fun game_exists(game_creator: address): bool {
        exists<GameData>(game_creator)
    }

    #[view]
    public fun is_game_won(game_creator: address): bool acquires GameData {
        if (!exists<GameData>(game_creator)) {
            return false
        };
        let game = borrow_global<GameData>(game_creator);
        option::is_some(&game.winner)
    }

    #[view]
    public fun get_winner(game_creator: address): vector<address> acquires GameData {
        if (!exists<GameData>(game_creator)) {
            return vector::empty<address>()
        };
        
        let game = borrow_global<GameData>(game_creator);
        if (option::is_some(&game.winner)) {
            vector::singleton(*option::borrow(&game.winner))
        } else {
            vector::empty<address>()
        }
    }

    #[view]
    public fun get_attempts_count(game_creator: address): u64 acquires GameAttempts {
        if (!exists<GameAttempts>(game_creator)) {
            return 0
        };
        let attempts = borrow_global<GameAttempts>(game_creator);
        vector::length(&attempts.attempts)
    }

    #[view]
    public fun simulate_moves(
        game_creator: address,
        moves: vector<u8>
    ): (u8, u8, bool) acquires GameData {
        assert!(exists<GameData>(game_creator), error::not_found(EGAME_NOT_FOUND));
        let game = borrow_global<GameData>(game_creator);
        
        // Calculate result without recording attempt (read-only simulation)
        let final_pos = replay_moves(game.start_position, &moves);
        let reached = positions_equal(&final_pos, &game.destination);
        
        (final_pos.x, final_pos.y, reached)
    }

    #[view]
    public fun get_collection_stats(collection_owner: address): (u64) acquires CollectionManager {
        if (!exists<CollectionManager>(collection_owner)) {
            return 0
        };
        let mgr = borrow_global<CollectionManager>(collection_owner);
        mgr.total_minted
    }

    #[view]
    public fun collection_exists(creator_address: address): bool {
        let collection_name = string::utf8(COLLECTION_NAME);
        // Calculate deterministic collection address
        let collection_address = collection::create_collection_address(&creator_address, &collection_name);
        object::object_exists<collection::Collection>(collection_address)
    }

    #[view]
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
            // Return empty strings if collection doesn't exist
            (string::utf8(b""), string::utf8(b""), string::utf8(b""))
        }
    }
}