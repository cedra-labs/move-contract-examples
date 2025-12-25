/// Production-Ready Yes/No Voting Smart Contract for Cedra Blockchain
/// 
/// Features:
/// - Create polls with yes/no options
/// - Vote on active polls
/// - One vote per address per poll
/// - Time-based poll expiration
/// - View poll results and status
/// 
/// Module Structure:
/// - Error definitions and status constants
/// - Core data structures
/// - Helper functions for poll/voter management
/// - Entry functions for state-changing operations
/// - View functions for querying poll data
module voting::poll {
    use cedra_framework::timestamp;
    use std::vector;
    use std::error;
    use std::signer;
    use std::string::{Self, String};

    // ==================== Error Codes ====================
    // All error codes used throughout the contract for clear failure reasons

    /// Poll with given ID not found
    const EPOLL_NOT_FOUND: u64 = 1;
    /// Caller lacks required permissions for the operation
    const EUNAUTHORIZED: u64 = 2;
    /// Poll is in an invalid state for the requested operation
    const EINVALID_STATE: u64 = 3;
    /// Address has already voted on this poll
    const EALREADY_VOTED: u64 = 4;
    /// Poll has expired and no longer accepts votes
    const EPOLL_EXPIRED: u64 = 5;
    /// Deadline timestamp is invalid (must be in the future)
    const EINVALID_DEADLINE: u64 = 6;
    /// Poll question cannot be empty
    const EEMPTY_QUESTION: u64 = 7;
    /// Poll has not yet expired (for finalize_poll operation)
    const EPOLL_NOT_EXPIRED: u64 = 8;

    // ==================== Status Constants ====================

    /// Poll is active and accepting votes
    const STATUS_ACTIVE: u8 = 0;
    /// Poll is closed and no longer accepting votes
    const STATUS_CLOSED: u8 = 1;

    // ==================== Data Structures ====================

    /// Represents an individual voter's record within a poll
    /// Contains voting information for a single address
    struct Voter has store, drop, copy {
        /// Address of the voter
        voter_address: address,
        /// Voting choice: true for "yes", false for "no"
        vote: bool,
        /// Timestamp when the vote was cast
        timestamp: u64,
    }

    /// Represents a single poll with all its associated data
    /// Stores complete voting information and poll metadata
    struct PollData has store, drop {
        /// Unique identifier for the poll within creator's polls
        poll_id: u64,
        /// Address of the poll creator
        creator: address,
        /// Question being voted on
        question: String,
        /// Total number of "yes" votes
        yes_votes: u64,
        /// Total number of "no" votes
        no_votes: u64,
        /// Deadline timestamp (seconds) when poll stops accepting votes
        deadline: u64,
        /// Current status of the poll (ACTIVE/CLOSED)
        status: u8,
        /// List of all voters who have participated
        voters: vector<Voter>,
        /// Timestamp when poll was created
        created_at: u64,
    }

    /// Registry that manages all polls created by a single account
    /// Each account has its own registry containing all polls they've created
    struct PollRegistry has key {
        /// List of all polls created by this account
        polls: vector<PollData>,
        /// Next available poll ID to assign
        next_id: u64,
    }

    // ==================== Helper Functions ====================
    // Internal utility functions for poll management and validation

    /// Find and return a mutable reference to a poll by ID
    /// Searches through the registry's poll list
    ///
    /// # Arguments:
    /// * `registry` - Mutable reference to the PollRegistry
    /// * `poll_id` - ID of the poll to find
    ///
    /// # Returns:
    /// * Mutable reference to the PollData if found
    ///
    /// # Aborts:
    /// * With EPOLL_NOT_FOUND if poll doesn't exist
    fun get_poll_mut(registry: &mut PollRegistry, poll_id: u64): &mut PollData {
        let len = vector::length(&registry.polls);
        let i = 0;
        while (i < len) {
            let poll = vector::borrow_mut(&mut registry.polls, i);
            if (poll.poll_id == poll_id) {
                return poll
            };
            i = i + 1;
        };
        abort error::not_found(EPOLL_NOT_FOUND)
    }

    /// Find and return an immutable reference to a poll by ID
    /// Searches through the registry's poll list
    ///
    /// # Arguments:
    /// * `registry` - Reference to the PollRegistry
    /// * `poll_id` - ID of the poll to find
    ///
    /// # Returns:
    /// * Immutable reference to the PollData if found
    ///
    /// # Aborts:
    /// * With EPOLL_NOT_FOUND if poll doesn't exist
    fun get_poll(registry: &PollRegistry, poll_id: u64): &PollData {
        let len = vector::length(&registry.polls);
        let i = 0;
        while (i < len) {
            let poll = vector::borrow(&registry.polls, i);
            if (poll.poll_id == poll_id) {
                return poll
            };
            i = i + 1;
        };
        abort error::not_found(EPOLL_NOT_FOUND)
    }

    /// Check if a specific address has already voted in a poll
    /// Linear search through the voters list
    ///
    /// # Arguments:
    /// * `poll` - Reference to the PollData
    /// * `voter_addr` - Address to check for voting status
    ///
    /// # Returns:
    /// * true if address has voted, false otherwise
    fun has_voted(poll: &PollData, voter_addr: address): bool {
        let len = vector::length(&poll.voters);
        let i = 0;
        while (i < len) {
            let voter = vector::borrow(&poll.voters, i);
            if (voter.voter_address == voter_addr) {
                return true
            };
            i = i + 1;
        };
        false
    }

    /// Check if a poll has expired based on current time
    /// Compares current timestamp with poll's deadline
    ///
    /// # Arguments:
    /// * `poll` - Reference to the PollData
    ///
    /// # Returns:
    /// * true if current time >= deadline, false otherwise
    fun is_poll_expired(poll: &PollData): bool {
        timestamp::now_seconds() >= poll.deadline
    }

    // ==================== Entry Functions ====================
    // Public functions that modify contract state

    /// Create a new poll with a question and deadline
    /// Initializes registry if it doesn't exist for the creator
    /// Poll ID is auto-incremented from the registry's next_id
    ///
    /// # Arguments:
    /// * `creator` - Signer of the poll creator
    /// * `question` - UTF-8 bytes of the poll question
    /// * `deadline` - Unix timestamp (seconds) when poll expires
    ///
    /// # Aborts:
    /// * With EEMPTY_QUESTION if question is empty
    /// * With EINVALID_DEADLINE if deadline is not in the future
    public entry fun create_poll(
        creator: &signer,
        question: vector<u8>,
        deadline: u64,
    ) acquires PollRegistry {
        let creator_addr = signer::address_of(creator);
        let question_str = string::utf8(question);

        // Validate inputs
        assert!(!string::is_empty(&question_str), error::invalid_argument(EEMPTY_QUESTION));
        assert!(deadline > timestamp::now_seconds(), error::invalid_argument(EINVALID_DEADLINE));

        // Initialize registry if not exists
        if (!exists<PollRegistry>(creator_addr)) {
            move_to(creator, PollRegistry {
                polls: vector::empty<PollData>(),
                next_id: 0,
            });
        };

        let registry = borrow_global_mut<PollRegistry>(creator_addr);
        let poll_id = registry.next_id;
        registry.next_id = poll_id + 1;

        // Create and add poll to vector
        let poll_data = PollData {
            poll_id,
            creator: creator_addr,
            question: question_str,
            yes_votes: 0,
            no_votes: 0,
            deadline,
            status: STATUS_ACTIVE,
            voters: vector::empty<Voter>(),
            created_at: timestamp::now_seconds(),
        };
        
        vector::push_back(&mut registry.polls, poll_data);
    }

    /// Cast a vote on an active poll
    /// Each address can vote only once per poll
    /// Vote must be cast before poll deadline
    ///
    /// # Arguments:
    /// * `voter` - Signer of the voter
    /// * `poll_creator` - Address of the poll creator
    /// * `poll_id` - ID of the poll to vote on
    /// * `vote_yes` - Boolean indicating vote: true for yes, false for no
    ///
    /// # Aborts:
    /// * With EPOLL_NOT_FOUND if poll doesn't exist
    /// * With EINVALID_STATE if poll is not active
    /// * With EPOLL_EXPIRED if poll deadline has passed
    /// * With EALREADY_VOTED if address has already voted
    public entry fun vote(
        voter: &signer,
        poll_creator: address,
        poll_id: u64,
        vote_yes: bool,
    ) acquires PollRegistry {
        let voter_addr = signer::address_of(voter);
        
        assert!(exists<PollRegistry>(poll_creator), error::not_found(EPOLL_NOT_FOUND));
        
        let registry = borrow_global_mut<PollRegistry>(poll_creator);
        let poll = get_poll_mut(registry, poll_id);
        
        // Validate poll state
        assert!(poll.status == STATUS_ACTIVE, error::invalid_state(EINVALID_STATE));
        assert!(!is_poll_expired(poll), error::invalid_state(EPOLL_EXPIRED));
        assert!(!has_voted(poll, voter_addr), error::invalid_state(EALREADY_VOTED));

        // Record vote
        let voter_record = Voter {
            voter_address: voter_addr,
            vote: vote_yes,
            timestamp: timestamp::now_seconds(),
        };
        
        vector::push_back(&mut poll.voters, voter_record);

        // Update vote counts
        if (vote_yes) {
            poll.yes_votes = poll.yes_votes + 1;
        } else {
            poll.no_votes = poll.no_votes + 1;
        };
    }

    /// Close a poll before its deadline
    /// Only the poll creator can manually close an active poll
    /// Updates poll status to CLOSED
    ///
    /// # Arguments:
    /// * `creator` - Signer of the poll creator
    /// * `poll_id` - ID of the poll to close
    ///
    /// # Aborts:
    /// * With EPOLL_NOT_FOUND if poll doesn't exist
    /// * With EUNAUTHORIZED if caller is not the poll creator
    /// * With EINVALID_STATE if poll is already closed
    public entry fun close_poll(
        creator: &signer,
        poll_id: u64,
    ) acquires PollRegistry {
        let creator_addr = signer::address_of(creator);
        
        assert!(exists<PollRegistry>(creator_addr), error::not_found(EPOLL_NOT_FOUND));
        
        let registry = borrow_global_mut<PollRegistry>(creator_addr);
        let poll = get_poll_mut(registry, poll_id);
        
        assert!(poll.creator == creator_addr, error::permission_denied(EUNAUTHORIZED));
        assert!(poll.status == STATUS_ACTIVE, error::invalid_state(EINVALID_STATE));
        
        poll.status = STATUS_CLOSED;
    }

    /// Automatically close an expired poll
    /// Anyone can call this function to close polls past their deadline
    /// Helps maintain contract state by closing expired polls
    ///
    /// # Arguments:
    /// * `poll_creator` - Address of the poll creator
    /// * `poll_id` - ID of the poll to finalize
    ///
    /// # Aborts:
    /// * With EPOLL_NOT_FOUND if poll doesn't exist
    /// * With EINVALID_STATE if poll is not active
    /// * With EPOLL_NOT_EXPIRED if poll hasn't reached its deadline
    public entry fun finalize_poll(
        poll_creator: address,
        poll_id: u64,
    ) acquires PollRegistry {
        assert!(exists<PollRegistry>(poll_creator), error::not_found(EPOLL_NOT_FOUND));
        
        let registry = borrow_global_mut<PollRegistry>(poll_creator);
        let poll = get_poll_mut(registry, poll_id);
        
        assert!(poll.status == STATUS_ACTIVE, error::invalid_state(EINVALID_STATE));
        assert!(is_poll_expired(poll), error::invalid_state(EPOLL_NOT_EXPIRED));
        
        poll.status = STATUS_CLOSED;
    }

    /// Delete a poll that has no votes
    /// Only the creator can delete, and only if no votes have been cast
    /// Removes poll from the registry
    ///
    /// # Arguments:
    /// * `creator` - Signer of the poll creator
    /// * `poll_id` - ID of the poll to delete
    ///
    /// # Aborts:
    /// * With EPOLL_NOT_FOUND if poll doesn't exist
    /// * With EUNAUTHORIZED if caller is not the poll creator
    /// * With EINVALID_STATE if poll has votes (cannot delete)
    public entry fun delete_poll(
        creator: &signer,
        poll_id: u64,
    ) acquires PollRegistry {
        let creator_addr = signer::address_of(creator);
        
        assert!(exists<PollRegistry>(creator_addr), error::not_found(EPOLL_NOT_FOUND));
        
        let registry = borrow_global_mut<PollRegistry>(creator_addr);
        
        // Find and remove poll
        let len = vector::length(&registry.polls);
        let i = 0;
        let found = false;
        
        while (i < len) {
            let poll = vector::borrow(&registry.polls, i);
            if (poll.poll_id == poll_id) {
                assert!(poll.creator == creator_addr, error::permission_denied(EUNAUTHORIZED));
                assert!(vector::is_empty(&poll.voters), error::invalid_state(EINVALID_STATE));
                
                vector::remove(&mut registry.polls, i);
                found = true;
                break
            };
            i = i + 1;
        };
        
        assert!(found, error::not_found(EPOLL_NOT_FOUND));
    }

    // ==================== View Functions ====================
    // Functions that query contract state without modifying it

    #[view]
    /// Get comprehensive information about a specific poll
    /// Returns all public poll data in a tuple format
    ///
    /// # Arguments:
    /// * `creator` - Address of the poll creator
    /// * `poll_id` - ID of the poll to query
    ///
    /// # Returns:
    /// * Tuple containing:
    ///   - poll_id: Unique poll identifier
    ///   - creator: Address of poll creator
    ///   - question: Poll question as bytes
    ///   - yes_votes: Count of yes votes
    ///   - no_votes: Count of no votes
    ///   - deadline: Expiration timestamp
    ///   - status: Current poll status
    ///   - total_voters: Number of unique voters
    ///   - created_at: Poll creation timestamp
    ///
    /// # Aborts:
    /// * With EPOLL_NOT_FOUND if poll doesn't exist
    public fun get_poll_info(creator: address, poll_id: u64): (
        u64,        // poll_id
        address,    // creator
        vector<u8>, // question
        u64,        // yes_votes
        u64,        // no_votes
        u64,        // deadline
        u8,         // status
        u64,        // total_voters
        u64,        // created_at
    ) acquires PollRegistry {
        assert!(exists<PollRegistry>(creator), error::not_found(EPOLL_NOT_FOUND));
        let registry = borrow_global<PollRegistry>(creator);
        let poll = get_poll(registry, poll_id);

        (
            poll.poll_id,
            poll.creator,
            *string::bytes(&poll.question),
            poll.yes_votes,
            poll.no_votes,
            poll.deadline,
            poll.status,
            vector::length(&poll.voters),
            poll.created_at,
        )
    }

    #[view]
    /// Get all poll IDs created by a specific address
    /// Returns an empty vector if no polls exist
    ///
    /// # Arguments:
    /// * `creator` - Address of the poll creator
    ///
    /// # Returns:
    /// * Vector of all poll IDs created by the address
    public fun get_poll_ids(creator: address): vector<u64> acquires PollRegistry {
        if (!exists<PollRegistry>(creator)) {
            return vector::empty<u64>()
        };
        
        let registry = borrow_global<PollRegistry>(creator);
        let ids = vector::empty<u64>();
        let len = vector::length(&registry.polls);
        let i = 0;
        
        while (i < len) {
            let poll = vector::borrow(&registry.polls, i);
            vector::push_back(&mut ids, poll.poll_id);
            i = i + 1;
        };
        
        ids
    }

    #[view]
    /// Check if a specific address has voted on a poll
    /// Returns false if poll or voter hasn't voted
    ///
    /// # Arguments:
    /// * `creator` - Address of the poll creator
    /// * `poll_id` - ID of the poll to check
    /// * `voter` - Address to check for voting status
    ///
    /// # Returns:
    /// * true if address has voted, false otherwise
    public fun has_user_voted(creator: address, poll_id: u64, voter: address): bool acquires PollRegistry {
        if (!exists<PollRegistry>(creator)) {
            return false
        };
        
        let registry = borrow_global<PollRegistry>(creator);
        let poll = get_poll(registry, poll_id);
        has_voted(poll, voter)
    }

    #[view]
    /// Get vote statistics for a poll
    /// Returns counts of yes, no, and total votes
    ///
    /// # Arguments:
    /// * `creator` - Address of the poll creator
    /// * `poll_id` - ID of the poll to query
    ///
    /// # Returns:
    /// * Tuple containing:
    ///   - yes_votes: Count of yes votes
    ///   - no_votes: Count of no votes
    ///   - total_voters: Total number of voters
    ///
    /// # Aborts:
    /// * With EPOLL_NOT_FOUND if poll doesn't exist
    public fun get_vote_counts(creator: address, poll_id: u64): (u64, u64, u64) acquires PollRegistry {
        assert!(exists<PollRegistry>(creator), error::not_found(EPOLL_NOT_FOUND));
        let registry = borrow_global<PollRegistry>(creator);
        let poll = get_poll(registry, poll_id);
        
        (poll.yes_votes, poll.no_votes, vector::length(&poll.voters))
    }

    #[view]
    /// Check if a poll is currently active and accepting votes
    /// Returns true only if poll is ACTIVE and not expired
    ///
    /// # Arguments:
    /// * `creator` - Address of the poll creator
    /// * `poll_id` - ID of the poll to check
    ///
    /// # Returns:
    /// * true if poll is active and not expired, false otherwise
    public fun is_poll_active(creator: address, poll_id: u64): bool acquires PollRegistry {
        if (!exists<PollRegistry>(creator)) {
            return false
        };
        
        let registry = borrow_global<PollRegistry>(creator);
        let poll = get_poll(registry, poll_id);
        
        poll.status == STATUS_ACTIVE && !is_poll_expired(poll)
    }

    #[view]
    /// Get the current result of a poll
    /// Determines winning side and returns vote counts
    ///
    /// # Arguments:
    /// * `creator` - Address of the poll creator
    /// * `poll_id` - ID of the poll to query
    ///
    /// # Returns:
    /// * Tuple containing:
    ///   - yes_winning: true if yes votes > no votes
    ///   - yes_votes: Count of yes votes
    ///   - no_votes: Count of no votes
    ///
    /// # Note:
    /// * Doesn't handle tie cases explicitly (false when equal)
    /// # Aborts:
    /// * With EPOLL_NOT_FOUND if poll doesn't exist
    public fun get_poll_result(creator: address, poll_id: u64): (bool, u64, u64) acquires PollRegistry {
        assert!(exists<PollRegistry>(creator), error::not_found(EPOLL_NOT_FOUND));
        let registry = borrow_global<PollRegistry>(creator);
        let poll = get_poll(registry, poll_id);
        
        let yes_winning = poll.yes_votes > poll.no_votes;
        (yes_winning, poll.yes_votes, poll.no_votes)
    }

    #[view]
    /// Check if a specific poll exists
    /// Useful for client-side validation before operations
    ///
    /// # Arguments:
    /// * `creator` - Address of the poll creator
    /// * `poll_id` - ID of the poll to check
    ///
    /// # Returns:
    /// * true if poll exists, false otherwise
    public fun poll_exists(creator: address, poll_id: u64): bool acquires PollRegistry {
        if (!exists<PollRegistry>(creator)) {
            return false
        };
        
        let registry = borrow_global<PollRegistry>(creator);
        let len = vector::length(&registry.polls);
        let i = 0;
        
        while (i < len) {
            let poll = vector::borrow(&registry.polls, i);
            if (poll.poll_id == poll_id) {
                return true
            };
            i = i + 1;
        };
        
        false
    }

    #[view]
    /// Get total number of polls created by an address
    /// Returns 0 if no polls exist
    ///
    /// # Arguments:
    /// * `creator` - Address to query poll count for
    ///
    /// # Returns:
    /// * Number of polls created by the address
    public fun get_total_polls(creator: address): u64 acquires PollRegistry {
        if (!exists<PollRegistry>(creator)) {
            return 0
        };
        
        let registry = borrow_global<PollRegistry>(creator);
        vector::length(&registry.polls)
    }
}