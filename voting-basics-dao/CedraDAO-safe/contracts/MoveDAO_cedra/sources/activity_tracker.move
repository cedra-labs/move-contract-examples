// Activity tracking system - centralized activity logging and querying for DAO operations
module movedao_addrx::activity_tracker {
    use std::signer;
    use std::string::{Self, String};
    use std::vector;
    use std::event;
    use std::table::{Self, Table};
    use cedra_framework::timestamp;
    use cedra_framework::object::{Self, Object};
    use movedao_addrx::errors;

    // Activity types
    const ACTIVITY_TYPE_DAO_CREATED: u8 = 1;
    const ACTIVITY_TYPE_MEMBER_JOINED: u8 = 2;
    const ACTIVITY_TYPE_MEMBER_LEFT: u8 = 3;
    const ACTIVITY_TYPE_PROPOSAL_CREATED: u8 = 4;
    const ACTIVITY_TYPE_PROPOSAL_VOTED: u8 = 5;
    const ACTIVITY_TYPE_PROPOSAL_EXECUTED: u8 = 6;
    const ACTIVITY_TYPE_STAKE: u8 = 7;
    const ACTIVITY_TYPE_UNSTAKE: u8 = 8;
    const ACTIVITY_TYPE_TREASURY_DEPOSIT: u8 = 9;
    const ACTIVITY_TYPE_TREASURY_WITHDRAWAL: u8 = 10;
    const ACTIVITY_TYPE_REWARD_CLAIMED: u8 = 11;
    const ACTIVITY_TYPE_LAUNCHPAD_CREATED: u8 = 12;
    const ACTIVITY_TYPE_LAUNCHPAD_INVESTMENT: u8 = 13;

    // Main activity event
    #[event]
    struct ActivityEvent has drop, store {
        activity_id: u64,
        dao_address: address,
        activity_type: u8,
        user_address: address,
        title: String,
        description: String,
        amount: u64,
        metadata: vector<u8>, // JSON-like metadata for additional info
        timestamp: u64,
        transaction_hash: vector<u8>,
        block_number: u64,
    }

    // Activity storage for efficient querying
    struct ActivityStore has key {
        activities: Table<u64, ActivityRecord>,
        dao_activities: Table<address, vector<u64>>, // DAO address -> activity IDs
        user_activities: Table<address, vector<u64>>, // User address -> activity IDs
        next_activity_id: u64,
        total_activities: u64,
    }

    struct ActivityRecord has store, drop, copy {
        id: u64,
        dao_address: address,
        activity_type: u8,
        user_address: address,
        title: String,
        description: String,
        amount: u64,
        metadata: vector<u8>,
        timestamp: u64,
        transaction_hash: vector<u8>,
        block_number: u64,
    }

    // Global activity tracker
    struct GlobalActivityTracker has key {
        tracker: Object<ActivityStore>,
    }

    // Initialize the global activity tracker
    public fun initialize(account: &signer) {
        let addr = signer::address_of(account);
        assert!(!exists<GlobalActivityTracker>(addr), errors::already_exists());

        let constructor_ref = object::create_object_from_account(account);
        let object_signer = object::generate_signer(&constructor_ref);
        
        let activity_store = ActivityStore {
            activities: table::new(),
            dao_activities: table::new(),
            user_activities: table::new(),
            next_activity_id: 0,
            total_activities: 0,
        };

        move_to(&object_signer, activity_store);
        
        let global_tracker = GlobalActivityTracker {
            tracker: object::object_from_constructor_ref(&constructor_ref),
        };
        
        move_to(account, global_tracker);
    }

    // Emit activity event and store it
    public fun emit_activity(
        dao_address: address,
        activity_type: u8,
        user_address: address,
        title: String,
        description: String,
        amount: u64,
        metadata: vector<u8>,
        transaction_hash: vector<u8>,
        block_number: u64,
    ) acquires ActivityStore, GlobalActivityTracker {
        let global_tracker = borrow_global<GlobalActivityTracker>(@movedao_addrx);
        let activity_store = borrow_global_mut<ActivityStore>(object::object_address(&global_tracker.tracker));
        
        let activity_id = activity_store.next_activity_id;
        let timestamp = timestamp::now_seconds();
        
        // Create activity record
        let activity_record = ActivityRecord {
            id: activity_id,
            dao_address,
            activity_type,
            user_address,
            title,
            description,
            amount,
            metadata,
            timestamp,
            transaction_hash,
            block_number,
        };

        // Store activity
        table::add(&mut activity_store.activities, activity_id, activity_record);
        
        // Add to DAO activities
        if (!table::contains(&activity_store.dao_activities, dao_address)) {
            table::add(&mut activity_store.dao_activities, dao_address, vector::empty());
        };
        let dao_activities = table::borrow_mut(&mut activity_store.dao_activities, dao_address);
        vector::push_back(dao_activities, activity_id);

        // Add to user activities
        if (!table::contains(&activity_store.user_activities, user_address)) {
            table::add(&mut activity_store.user_activities, user_address, vector::empty());
        };
        let user_activities = table::borrow_mut(&mut activity_store.user_activities, user_address);
        vector::push_back(user_activities, activity_id);

        // Update counters
        activity_store.next_activity_id = activity_store.next_activity_id + 1;
        activity_store.total_activities = activity_store.total_activities + 1;

        // Emit event
        event::emit(ActivityEvent {
            activity_id,
            dao_address,
            activity_type,
            user_address,
            title,
            description,
            amount,
            metadata,
            timestamp,
            transaction_hash,
            block_number,
        });
    }

    // Query functions
    #[view]
    public fun get_dao_activities(dao_address: address): vector<u64> acquires ActivityStore, GlobalActivityTracker {
        let global_tracker = borrow_global<GlobalActivityTracker>(@movedao_addrx);
        let activity_store = borrow_global<ActivityStore>(object::object_address(&global_tracker.tracker));
        
        if (table::contains(&activity_store.dao_activities, dao_address)) {
            *table::borrow(&activity_store.dao_activities, dao_address)
        } else {
            vector::empty()
        }
    }

    #[view]
    public fun get_user_activities(user_address: address): vector<u64> acquires ActivityStore, GlobalActivityTracker {
        let global_tracker = borrow_global<GlobalActivityTracker>(@movedao_addrx);
        let activity_store = borrow_global<ActivityStore>(object::object_address(&global_tracker.tracker));
        
        if (table::contains(&activity_store.user_activities, user_address)) {
            *table::borrow(&activity_store.user_activities, user_address)
        } else {
            vector::empty()
        }
    }

    #[view]
    public fun get_activity_by_id(activity_id: u64): ActivityRecord acquires ActivityStore, GlobalActivityTracker {
        let global_tracker = borrow_global<GlobalActivityTracker>(@movedao_addrx);
        let activity_store = borrow_global<ActivityStore>(object::object_address(&global_tracker.tracker));
        
        assert!(table::contains(&activity_store.activities, activity_id), errors::not_found());
        *table::borrow(&activity_store.activities, activity_id)
    }

    #[view]
    public fun get_total_activities(): u64 acquires ActivityStore, GlobalActivityTracker {
        let global_tracker = borrow_global<GlobalActivityTracker>(@movedao_addrx);
        let activity_store = borrow_global<ActivityStore>(object::object_address(&global_tracker.tracker));
        activity_store.total_activities
    }

    // Helper functions for other modules to emit activities
    public fun emit_dao_created(
        dao_address: address,
        creator: address,
        name: String,
        transaction_hash: vector<u8>,
        block_number: u64,
    ) acquires ActivityStore, GlobalActivityTracker {
        emit_activity(
            dao_address,
            ACTIVITY_TYPE_DAO_CREATED,
            creator,
            string::utf8(b"DAO Created"),
            name,
            0,
            vector::empty(),
            transaction_hash,
            block_number,
        );
    }

    public fun emit_member_joined(
        dao_address: address,
        member: address,
        transaction_hash: vector<u8>,
        block_number: u64,
    ) acquires ActivityStore, GlobalActivityTracker {
        emit_activity(
            dao_address,
            ACTIVITY_TYPE_MEMBER_JOINED,
            member,
            string::utf8(b"Member Joined"),
            string::utf8(b"A new member joined the DAO"),
            0,
            vector::empty(),
            transaction_hash,
            block_number,
        );
    }

    public fun emit_stake_activity(
        dao_address: address,
        staker: address,
        amount: u64,
        transaction_hash: vector<u8>,
        block_number: u64,
    ) acquires ActivityStore, GlobalActivityTracker {
        emit_activity(
            dao_address,
            ACTIVITY_TYPE_STAKE,
            staker,
            string::utf8(b"Tokens Staked"),
            string::utf8(b"User staked tokens in the DAO"),
            amount,
            vector::empty(),
            transaction_hash,
            block_number,
        );
    }

    public fun emit_proposal_created(
        dao_address: address,
        proposer: address,
        proposal_title: String,
        transaction_hash: vector<u8>,
        block_number: u64,
    ) acquires ActivityStore, GlobalActivityTracker {
        emit_activity(
            dao_address,
            ACTIVITY_TYPE_PROPOSAL_CREATED,
            proposer,
            string::utf8(b"Proposal Created"),
            proposal_title,
            0,
            vector::empty(),
            transaction_hash,
            block_number,
        );
    }

    public fun emit_member_left(
        dao_address: address,
        member: address,
        transaction_hash: vector<u8>,
        block_number: u64,
    ) acquires ActivityStore, GlobalActivityTracker {
        emit_activity(
            dao_address,
            ACTIVITY_TYPE_MEMBER_LEFT,
            member,
            string::utf8(b"Member Left"),
            string::utf8(b"A member left the DAO"),
            0,
            vector::empty(),
            transaction_hash,
            block_number,
        );
    }

    public fun emit_unstake_activity(
        dao_address: address,
        staker: address,
        amount: u64,
        transaction_hash: vector<u8>,
        block_number: u64,
    ) acquires ActivityStore, GlobalActivityTracker {
        emit_activity(
            dao_address,
            ACTIVITY_TYPE_UNSTAKE,
            staker,
            string::utf8(b"Tokens Unstaked"),
            string::utf8(b"User unstaked tokens from the DAO"),
            amount,
            vector::empty(),
            transaction_hash,
            block_number,
        );
    }

    public fun emit_proposal_voted(
        dao_address: address,
        voter: address,
        proposal_title: String,
        transaction_hash: vector<u8>,
        block_number: u64,
    ) acquires ActivityStore, GlobalActivityTracker {
        emit_activity(
            dao_address,
            ACTIVITY_TYPE_PROPOSAL_VOTED,
            voter,
            string::utf8(b"Proposal Voted"),
            proposal_title,
            0,
            vector::empty(),
            transaction_hash,
            block_number,
        );
    }

    // Test functions
    #[test_only]
    public entry fun test_init_module(sender: &signer) {
        initialize(sender);
    }
}
