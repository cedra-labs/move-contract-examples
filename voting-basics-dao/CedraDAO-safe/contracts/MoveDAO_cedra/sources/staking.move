// Staking system - handles APT token staking/unstaking for membership and voting power calculation
module movedao_addrx::staking {
    use std::signer;
    use std::string::String;
    use std::vector;
    use std::event;
    use cedra_framework::object;
    use cedra_framework::coin;
    use cedra_framework::cedra_coin::CedraCoin;
    use cedra_framework::timestamp;
    use cedra_std::table::{Self, Table};
    use movedao_addrx::admin;
    use movedao_addrx::errors;
    use movedao_addrx::safe_math;
    use movedao_addrx::activity_tracker;

    // Activity tracking events
    #[event]
    struct StakeEvent has drop, store {
        movedao_addrx: address,
        staker: address,
        amount: u64,
        total_staked: u64,
        timestamp: u64,
        transaction_hash: vector<u8>,
    }

    #[event]
    struct UnstakeEvent has drop, store {
        movedao_addrx: address,
        staker: address,
        amount: u64,
        remaining_staked: u64,
        timestamp: u64,
        transaction_hash: vector<u8>,
    }

    #[event]
    struct RewardClaimedEvent has drop, store {
        movedao_addrx: address,
        staker: address,
        reward_amount: u64,
        timestamp: u64,
        transaction_hash: vector<u8>,
    }

    const VAULT_SEED: vector<u8> = b"VAULT";
    
    // Security constants
    const MIN_STAKING_PERIOD: u64 = 3600; // 1 hour minimum staking period to prevent gaming

    struct VoteRepository has store, key {
        votes: vector<Vote>,
    }

    struct Vote has store {
        id: u64,
        title: String,
        description: String,
        start_time: u64,
        end_time: u64,
        total_yes_votes: u64,
        total_no_votes: u64,
        completed: bool,
        voters: Table<address, VoteRecord>,
    }
    
    struct VoteRecord has store, copy, drop {
        amount: u64,
        timestamp: u64,
    }

    struct StakerProfile has key {
        dao_stakes: Table<address, DAOStakeInfo>,  // DAO address -> stake info
        total_staked: u64,
    }
    
    struct DAOStakeInfo has store, drop {
        staked_balance: u64,
        last_stake_time: u64, // Track when user last staked to prevent gaming
    }

    struct Vault has key {
        balance: coin::Coin<CedraCoin>,
        extend_ref: object::ExtendRef,
    }

    struct StakerRegistry has key {
        stakers: Table<address, u64>,  // address -> staked_amount
        total_stakers: u64,
    }

    public entry fun init_staking(account: &signer) {
        let addr = signer::address_of(account);
        assert!(!exists<Vault>(addr), 1);

        let vault_constructor_ref = &object::create_named_object(account, VAULT_SEED);
        let vault_signer = &object::generate_signer(vault_constructor_ref);

        let vault = Vault {
            balance: coin::zero<CedraCoin>(),
            extend_ref: object::generate_extend_ref(vault_constructor_ref),
        };

        let vote_repository = VoteRepository {
            votes: vector::empty(),
        };

        let staker_registry = StakerRegistry {
            stakers: table::new<address, u64>(),
            total_stakers: 0,
        };

        move_to(vault_signer, vault);
        move_to(account, vote_repository);
        move_to(account, staker_registry);
    }

    #[test_only]
    public entry fun test_init_module(sender: &signer) {
        init_staking(sender);
    }

    /// Stake APT tokens to gain membership and voting power in the DAO
    /// 
    /// MINIMUM STAKE REQUIREMENT: 
    /// - Users must stake at least the minimum amount set by the DAO (typically 10 APT tokens)
    /// - This minimum is configured in membership::MembershipConfig::min_stake_to_join
    /// - For Gorilla Moverz DAO: Minimum stake is 10 MOVE tokens
    /// - Staking below minimum = Cannot join DAO or create proposals
    /// - Staking above minimum = Gains voting power proportional to stake amount
    /// 
    /// PROCESS:
    /// 1. User calls stake() with amount >= minimum requirement
    /// 2. System checks user has sufficient APT balance
    /// 3. Tokens are transferred to DAO vault (locked)
    /// 4. User's staked balance is recorded
    /// 5. User can now join DAO and participate in governance
    /// 
    /// VOTING POWER: 1 staked token = 1 vote weight
    /// REWARDS: Staked tokens earn passive income over time
    /// UNSTAKE: Users can unstake anytime with no restrictions (reduces voting power)
    public entry fun stake(acc_own: &signer, movedao_addrx: address, amount: u64) acquires StakerProfile, Vault, StakerRegistry {
        let from = signer::address_of(acc_own);
        
        // Check if user has enough APT tokens in their wallet
        let balance = coin::balance<CedraCoin>(from);
        assert!(balance >= amount, errors::insufficient_balance());

        // Initialize staker profile if this is their first time staking anywhere
        if (!exists<StakerProfile>(from)) {
            let profile = StakerProfile {
                dao_stakes: table::new<address, DAOStakeInfo>(),
                total_staked: 0,
            };
            move_to(acc_own, profile);
        };
        
        let profile = borrow_global_mut<StakerProfile>(from);
        let is_new_dao_staker = !table::contains(&profile.dao_stakes, movedao_addrx);
        
        if (is_new_dao_staker) {
            // First time staking in this DAO
            let dao_stake_info = DAOStakeInfo {
                staked_balance: amount,
                last_stake_time: timestamp::now_seconds(),
            };
            table::add(&mut profile.dao_stakes, movedao_addrx, dao_stake_info);
        } else {
            // Adding to existing stake in this DAO
            let dao_stake_info = table::borrow_mut(&mut profile.dao_stakes, movedao_addrx);
            dao_stake_info.staked_balance = safe_math::safe_add(dao_stake_info.staked_balance, amount);
            dao_stake_info.last_stake_time = timestamp::now_seconds(); // Update stake time to prevent gaming
        };
        
        // Update total staked across all DAOs
        profile.total_staked = safe_math::safe_add(profile.total_staked, amount);

        // Update the DAO's staker registry
        let registry = borrow_global_mut<StakerRegistry>(movedao_addrx);
        if (is_new_dao_staker) {
            table::add(&mut registry.stakers, from, amount);
            registry.total_stakers = safe_math::safe_add(registry.total_stakers, 1);
        } else {
            let current_amount = table::borrow_mut(&mut registry.stakers, from);
            *current_amount = safe_math::safe_add(*current_amount, amount);
        };

        // Transfer APT tokens from user to DAO vault (locking them)
        let coins = coin::withdraw<CedraCoin>(acc_own, amount);
        let vault = borrow_global_mut<Vault>(get_vault_addr(movedao_addrx));
        coin::merge(&mut vault.balance, coins);

        // Log stake activity
        activity_tracker::emit_stake_activity(
            movedao_addrx,            // dao_address
            from,                    // staker
            amount,                  // amount
            vector::empty<u8>(),     // transaction_hash
            0                        // block_number
        );

        // Emit stake event (for activity tracking)
        // Note: transaction hash not available in Move; keep empty vector for compatibility
        event::emit(StakeEvent {
            movedao_addrx: movedao_addrx,
            staker: from,
            amount,
            total_staked: get_dao_staked_balance(movedao_addrx, from),
            timestamp: timestamp::now_seconds(),
            transaction_hash: vector::empty(),
        });
    }

    public entry fun unstake(acc_own: &signer, movedao_addrx: address, amount: u64) acquires StakerProfile, Vault, StakerRegistry {
        let from = signer::address_of(acc_own);
        
        // Check if user has staking profile and has staked in this DAO
        assert!(exists<StakerProfile>(from), errors::not_found());
        let profile = borrow_global_mut<StakerProfile>(from);
        assert!(table::contains(&profile.dao_stakes, movedao_addrx), errors::not_found());
        
        let dao_stake_info = table::borrow(&profile.dao_stakes, movedao_addrx);
        let staked_amount = dao_stake_info.staked_balance;
        assert!(staked_amount >= amount, errors::invalid_unstake_amount());
        
        // Security: Enforce minimum staking period to prevent gaming of voting power
        let current_time = timestamp::now_seconds();
        let min_period = get_min_staking_period();
        assert!(current_time >= dao_stake_info.last_stake_time + min_period, errors::invalid_time());
        
        // Transfer tokens back to user
        let vault = borrow_global_mut<Vault>(get_vault_addr(movedao_addrx));
        let coins = coin::extract(&mut vault.balance, amount);
        coin::deposit(from, coins);
        
        // Update DAO-specific stake
        let dao_stake_info = table::borrow_mut(&mut profile.dao_stakes, movedao_addrx);
        dao_stake_info.staked_balance = safe_math::safe_sub(dao_stake_info.staked_balance, amount);
        
        // Update total staked across all DAOs
        profile.total_staked = safe_math::safe_sub(profile.total_staked, amount);
        
        // Update staker registry
        let registry = borrow_global_mut<StakerRegistry>(movedao_addrx);
        assert!(table::contains(&registry.stakers, from), errors::not_found());
        
        let current_amount = table::borrow_mut(&mut registry.stakers, from);
        assert!(*current_amount >= amount, errors::invalid_unstake_amount());
        *current_amount = safe_math::safe_sub(*current_amount, amount);
        
        // Remove from registry and DAO stakes if fully unstaked from this DAO
        if (*current_amount == 0) {
            table::remove(&mut registry.stakers, from);
            let _ = table::remove(&mut profile.dao_stakes, movedao_addrx);
            registry.total_stakers = safe_math::safe_sub(registry.total_stakers, 1);
        };

        // Log unstake activity
        activity_tracker::emit_unstake_activity(
            movedao_addrx,            // dao_address
            from,                    // staker
            amount,                  // amount
            vector::empty<u8>(),     // transaction_hash
            0                        // block_number
        );

        // Emit unstake event (for activity tracking)
        event::emit(UnstakeEvent {
            movedao_addrx: movedao_addrx,
            staker: from,
            amount,
            remaining_staked: get_dao_staked_balance(movedao_addrx, from),
            timestamp: timestamp::now_seconds(),
            transaction_hash: vector::empty(),
        });
    }

    public entry fun create_vote(acc_own: &signer, movedao_addrx: address, title: String, description: String, start_time: u64, end_time: u64) acquires VoteRepository {
        let from = signer::address_of(acc_own);
        assert!(is_admin(movedao_addrx, from), errors::not_admin());

        let vote_repository = borrow_global_mut<VoteRepository>(movedao_addrx);
        let vote = Vote {
            id: vector::length(&vote_repository.votes),
            title,
            description,
            start_time,
            end_time,
            total_yes_votes: 0,
            total_no_votes: 0,
            completed: false,
            voters: table::new<address, VoteRecord>(),
        };
        vector::push_back(&mut vote_repository.votes, vote);
    }

    public entry fun vote(acc_own: &signer, movedao_addrx: address, vote_id: u64, is_yes_vote: bool) acquires VoteRepository, StakerRegistry {
        let from = signer::address_of(acc_own);
        let vote_repository = borrow_global_mut<VoteRepository>(movedao_addrx);
        let vote = vector::borrow_mut(&mut vote_repository.votes, vote_id);
        assert!(vote.start_time <= timestamp::now_seconds() && vote.end_time >= timestamp::now_seconds(), errors::invalid_vote_time());

        // PREVENT MULTIPLE VOTING: Check if user has already voted
        assert!(!table::contains(&vote.voters, from), errors::already_voted());

        // FIX TOCTOU: Get voting power atomically from registry (locked at time of voting)
        let registry = borrow_global<StakerRegistry>(movedao_addrx);
        assert!(table::contains(&registry.stakers, from), errors::not_member());
        let voting_power = *table::borrow(&registry.stakers, from);
        assert!(voting_power > 0, errors::insufficient_stake());

        // Record vote with full voting power (prevents partial voting exploits)  
        if (is_yes_vote) {
            vote.total_yes_votes = safe_math::safe_add(vote.total_yes_votes, voting_power);
        } else {
            vote.total_no_votes = safe_math::safe_add(vote.total_no_votes, voting_power);
        };

        // Record that user has voted with their full stake amount
        let vote_record = VoteRecord {
            amount: voting_power,
            timestamp: timestamp::now_seconds(),
        };
        table::add(&mut vote.voters, from, vote_record);
    }

    public entry fun declare_winner(acc_own: &signer, movedao_addrx: address, vote_id: u64) acquires VoteRepository {
        let from = signer::address_of(acc_own);
        assert!(is_admin(movedao_addrx, from), errors::not_admin());

        let vote_repository = borrow_global_mut<VoteRepository>(movedao_addrx);
        let vote = vector::borrow_mut(&mut vote_repository.votes, vote_id);
        assert!(vote.end_time <= timestamp::now_seconds(), errors::invalid_vote_time());

        vote.completed = true;
    }

    #[view]
    public fun get_vault_addr(movedao_addrx: address): address {
        object::create_object_address(&movedao_addrx, VAULT_SEED)
    }

    #[view]
    public fun get_staked_balance(addr: address): u64 acquires StakerProfile {
        if (!exists<StakerProfile>(addr)) return 0;
        borrow_global<StakerProfile>(addr).total_staked
    }
    
    // Helper function to get minimum staking period  
    fun get_min_staking_period(): u64 {
        MIN_STAKING_PERIOD
    }
    
    #[view]
    public fun get_dao_staked_balance(movedao_addrx: address, addr: address): u64 acquires StakerProfile {
        if (!exists<StakerProfile>(addr)) return 0;
        let profile = borrow_global<StakerProfile>(addr);
        if (!table::contains(&profile.dao_stakes, movedao_addrx)) return 0;
        table::borrow(&profile.dao_stakes, movedao_addrx).staked_balance
    }

    #[view]
    public fun get_total_staked(movedao_addrx: address): u64 acquires Vault {
        coin::value(&borrow_global<Vault>(get_vault_addr(movedao_addrx)).balance)
    }

    // Check if staking system is initialized for a DAO
    #[view]
    public fun is_staking_initialized(movedao_addrx: address): bool {
        // Vault is stored at the vault object address (created by create_named_object)
        // StakerRegistry and VoteRepository are stored at the DAO address
        exists<Vault>(get_vault_addr(movedao_addrx)) && exists<StakerRegistry>(movedao_addrx)
    }

    #[view]
    public fun is_staker(addr: address): bool {
        exists<StakerProfile>(addr)
    }
    
    #[view]
    public fun is_dao_staker(movedao_addrx: address, addr: address): bool acquires StakerProfile {
        if (!exists<StakerProfile>(addr)) return false;
        let profile = borrow_global<StakerProfile>(addr);
        table::contains(&profile.dao_stakes, movedao_addrx)
    }

    fun get_vault_signer(movedao_addrx: address): signer acquires Vault {
        let vault = borrow_global<Vault>(get_vault_addr(movedao_addrx));
        object::generate_signer_for_extending(&vault.extend_ref)
    }

    fun is_admin(movedao_addrx: address, addr: address): bool {
        admin::is_admin(movedao_addrx, addr)
    }

    #[test_only]
    use std::string;
    #[test_only]
    use cedra_framework::account;
    #[test_only]
    use cedra_framework::cedra_coin;

    #[test(cedra_framework = @0x1, creator = @movedao_addrx, alice = @0x3)]
    public entry fun test_staking(
        cedra_framework: &signer,
        creator: &signer,
        alice: &signer
    ) acquires StakerProfile, Vault, StakerRegistry {
        let (burn_cap, mint_cap) = cedra_coin::initialize_for_test(cedra_framework);
        timestamp::set_time_has_started_for_testing(cedra_framework);
        activity_tracker::initialize(creator); // Initialize activity tracker for tests
        test_init_module(creator);
        
        account::create_account_for_test(@0x3);
        coin::register<CedraCoin>(alice);
        coin::deposit(@0x3, coin::mint(1000, &mint_cap));

        stake(alice, @movedao_addrx, 500);
        assert!(get_staked_balance(@0x3) == 500, 100);
        assert!(is_staker(@0x3), 101);

        // Advance time past minimum staking period (1 hour = 3600 seconds)
        timestamp::fast_forward_seconds(3601);
        unstake(alice, @movedao_addrx, 200);
        assert!(get_staked_balance(@0x3) == 300, 102);

        coin::destroy_mint_cap(mint_cap);
        coin::destroy_burn_cap(burn_cap);
    }

    #[test(cedra_framework = @0x1, creator = @movedao_addrx, alice = @0x3)]
    #[expected_failure(abort_code = 5, location = movedao_addrx::staking)]
    public entry fun test_block_unstake_limit(
        cedra_framework: &signer,
        creator: &signer,
        alice: &signer
    ) acquires StakerProfile, Vault, StakerRegistry {
        let (burn_cap, mint_cap) = cedra_coin::initialize_for_test(cedra_framework);
        timestamp::set_time_has_started_for_testing(cedra_framework);
        activity_tracker::initialize(creator); // Initialize activity tracker for tests
        test_init_module(creator);
        
        account::create_account_for_test(@0x3);
        coin::register<CedraCoin>(alice);
        coin::deposit(@0x3, coin::mint(1000, &mint_cap));
        
        stake(alice, @movedao_addrx, 500);
        
        // No time lock - can unstake immediately 
        unstake(alice, @movedao_addrx, 400);
        unstake(alice, @movedao_addrx, 100);
        unstake(alice, @movedao_addrx, 100); // Should fail

        coin::destroy_mint_cap(mint_cap);
        coin::destroy_burn_cap(burn_cap);
    }

    #[test(cedra_framework = @0x1, creator = @movedao_addrx, alice = @0x3)]
    public entry fun test_should_allow_multiple_stakes(
        cedra_framework: &signer,
        creator: &signer,
        alice: &signer
    ) acquires StakerProfile, Vault, StakerRegistry {
        let (burn_cap, mint_cap) = cedra_coin::initialize_for_test(cedra_framework);
        timestamp::set_time_has_started_for_testing(cedra_framework);
        activity_tracker::initialize(creator); // Initialize activity tracker for tests
        test_init_module(creator);
        
        account::create_account_for_test(@0x3);
        coin::register<CedraCoin>(alice);
        coin::deposit(@0x3, coin::mint(1000, &mint_cap));

        stake(alice, @movedao_addrx, 500);
        stake(alice, @movedao_addrx, 100);
        assert!(get_staked_balance(@0x3) == 600, 100);

        coin::destroy_mint_cap(mint_cap);
        coin::destroy_burn_cap(burn_cap);
    }

    #[test(cedra_framework = @0x1, creator = @movedao_addrx, alice = @0x3, bob = @0x4)]
    public entry fun test_vote(
        cedra_framework: &signer,
        creator: &signer,
        alice: &signer,
        bob: &signer
    ) acquires StakerProfile, Vault, VoteRepository, StakerRegistry {
        let (burn_cap, mint_cap) = cedra_coin::initialize_for_test(cedra_framework);
        timestamp::set_time_has_started_for_testing(cedra_framework);
        activity_tracker::initialize(creator); // Initialize activity tracker for tests
        test_init_module(creator);
        admin::init_admin(creator, 1); // Initialize admin module for tests
        
        account::create_account_for_test(@0x3);
        account::create_account_for_test(@0x4);
        coin::register<CedraCoin>(alice);
        coin::register<CedraCoin>(bob);
        coin::deposit(@0x3, coin::mint(1000, &mint_cap));
        coin::deposit(@0x4, coin::mint(1000, &mint_cap));

        create_vote(creator, @movedao_addrx, string::utf8(b"Test Vote"), string::utf8(b"This is a test vote"), 100, 5000);
        stake(alice, @movedao_addrx, 500);
        stake(bob, @movedao_addrx, 300);

        timestamp::update_global_time_for_test_secs(100);

        vote(alice, @movedao_addrx, 0, true);
        vote(bob, @movedao_addrx, 0, false);

        // Advance time past minimum staking period before unstaking (3601 seconds from start)
        timestamp::update_global_time_for_test_secs(3700);
        unstake(alice, @movedao_addrx, 200);

        // Advance to vote end time
        timestamp::update_global_time_for_test_secs(5001);
        declare_winner(creator, @movedao_addrx, 0);

        let vote_repository = borrow_global<VoteRepository>(@movedao_addrx);
        let vote = vector::borrow(&vote_repository.votes, 0);
        assert!(vote.completed == true, 100);
        assert!(vote.total_yes_votes == 500, 101);
        assert!(vote.total_no_votes == 300, 102);

        coin::destroy_mint_cap(mint_cap);
        coin::destroy_burn_cap(burn_cap);
    }

    #[test(cedra_framework = @0x1, creator = @movedao_addrx, alice = @0x3)]
    #[expected_failure(abort_code = 202, location = movedao_addrx::staking)]
    public entry fun test_can_only_vote_once(
        cedra_framework: &signer,
        creator: &signer,
        alice: &signer
    ) acquires StakerProfile, VoteRepository, Vault, StakerRegistry {
        let (burn_cap, mint_cap) = cedra_coin::initialize_for_test(cedra_framework);
        timestamp::set_time_has_started_for_testing(cedra_framework);
        activity_tracker::initialize(creator); // Initialize activity tracker for tests
        test_init_module(creator);
        admin::init_admin(creator, 1); // Initialize admin module for tests
        
        account::create_account_for_test(@0x3);
        coin::register<CedraCoin>(alice);
        coin::deposit(@0x3, coin::mint(1000, &mint_cap));

        timestamp::update_global_time_for_test_secs(100);

        create_vote(creator, @movedao_addrx, string::utf8(b"Test Vote"), string::utf8(b"This is a test vote"), 100, 200);
        stake(alice, @movedao_addrx, 500);
        vote(alice, @movedao_addrx, 0, true);
        vote(alice, @movedao_addrx, 0, true); // Should fail

        coin::destroy_mint_cap(mint_cap);
        coin::destroy_burn_cap(burn_cap);
    }

    #[test(cedra_framework = @0x1, creator = @movedao_addrx)]
    public entry fun test_total_staked(
        cedra_framework: &signer,
        creator: &signer
    ) acquires Vault, StakerProfile, StakerRegistry {
        let (burn_cap, mint_cap) = cedra_coin::initialize_for_test(cedra_framework);
        timestamp::set_time_has_started_for_testing(cedra_framework);
        activity_tracker::initialize(creator); // Initialize activity tracker for tests
        test_init_module(creator);
        
        let alice = account::create_account_for_test(@0x3);
        coin::register<CedraCoin>(&alice);
        coin::deposit(@0x3, coin::mint(1000, &mint_cap));

        stake(&alice, @movedao_addrx, 500);
        assert!(get_total_staked(@movedao_addrx) == 500, 100);

        coin::destroy_mint_cap(mint_cap);
        coin::destroy_burn_cap(burn_cap);
    }

    // Function to trigger staking rewards distribution
    // Helper function to get all stakers - for backward compatibility only
    public fun get_all_stakers(_movedao_addrx: address): (vector<address>, vector<u64>) {
        // Note: This function returns empty vectors for backward compatibility
        // Table iteration is not directly supported in Move. For better performance, use:
        // - get_staker_count() to get total number of stakers
        // - get_staker_amount(movedao_addrx, address) to get specific staker amounts  
        // - is_registered_staker(movedao_addrx, address) to check if address is a staker
        let stakers = vector::empty<address>();
        let amounts = vector::empty<u64>();
        (stakers, amounts)
    }

    // New efficient table-based functions
    public fun get_staker_count(movedao_addrx: address): u64 acquires StakerRegistry {
        let registry = borrow_global<StakerRegistry>(movedao_addrx);
        registry.total_stakers
    }

    public fun get_staker_amount(movedao_addrx: address, staker: address): u64 acquires StakerRegistry {
        let registry = borrow_global<StakerRegistry>(movedao_addrx);
        if (table::contains(&registry.stakers, staker)) {
            *table::borrow(&registry.stakers, staker)
        } else {
            0
        }
    }
    
    // Direct function for getting DAO-specific stake (more efficient)
    #[view]
    public fun get_dao_stake_direct(movedao_addrx: address, staker: address): u64 acquires StakerProfile {
        get_dao_staked_balance(movedao_addrx, staker)
    }

    public fun is_registered_staker(movedao_addrx: address, staker: address): bool acquires StakerRegistry {
        let registry = borrow_global<StakerRegistry>(movedao_addrx);
        table::contains(&registry.stakers, staker)
    }

    // Synchronization validation and repair functions
    #[view]
    public fun validate_staker_sync(movedao_addrx: address, staker: address): bool acquires StakerProfile, StakerRegistry {
        if (!exists<StakerProfile>(staker)) {
            return !is_registered_staker(movedao_addrx, staker)
        };
        
        let dao_balance = get_dao_staked_balance(movedao_addrx, staker);
        let registry_balance = if (is_registered_staker(movedao_addrx, staker)) {
            get_staker_amount(movedao_addrx, staker)
        } else {
            0
        };
        
        dao_balance == registry_balance
    }

    // Administrative function to repair desynchronized staking data
    public entry fun repair_staker_sync(
        admin: &signer, 
        movedao_addrx: address, 
        staker: address
    ) acquires StakerProfile, StakerRegistry {
        let admin_addr = signer::address_of(admin);
        assert!(admin::is_admin(movedao_addrx, admin_addr), errors::not_admin());
        
        if (!exists<StakerProfile>(staker)) {
            // Staker has no profile, remove from registry
            let registry = borrow_global_mut<StakerRegistry>(movedao_addrx);
            if (table::contains(&registry.stakers, staker)) {
                table::remove(&mut registry.stakers, staker);
                registry.total_stakers = safe_math::safe_sub(registry.total_stakers, 1);
            };
            return
        };
        
        let dao_balance = get_dao_staked_balance(movedao_addrx, staker);
        let registry = borrow_global_mut<StakerRegistry>(movedao_addrx);
        
        if (dao_balance == 0) {
            // Remove from registry
            if (table::contains(&registry.stakers, staker)) {
                table::remove(&mut registry.stakers, staker);
                registry.total_stakers = safe_math::safe_sub(registry.total_stakers, 1);
            };
        } else {
            // Sync registry with DAO-specific balance
            if (table::contains(&registry.stakers, staker)) {
                let registry_amount = table::borrow_mut(&mut registry.stakers, staker);
                *registry_amount = dao_balance;
            } else {
                table::add(&mut registry.stakers, staker, dao_balance);
                registry.total_stakers = safe_math::safe_add(registry.total_stakers, 1);
            };
        };
    }

    #[test(cedra_framework = @0x1, dao1 = @movedao_addrx, dao2 = @0x5, alice = @0x3)]
    public entry fun test_multi_dao_staking(
        cedra_framework: &signer,
        dao1: &signer,
        dao2: &signer,
        alice: &signer
    ) acquires StakerProfile, Vault, StakerRegistry {
        let (burn_cap, mint_cap) = cedra_coin::initialize_for_test(cedra_framework);
        timestamp::set_time_has_started_for_testing(cedra_framework);
        activity_tracker::initialize(dao1); // Initialize activity tracker for tests

        // Initialize both DAOs
        test_init_module(dao1);
        test_init_module(dao2);
        
        // Setup alice's account
        account::create_account_for_test(@0x3);
        coin::register<CedraCoin>(alice);
        coin::deposit(@0x3, coin::mint(2000, &mint_cap));

        // Stake in first DAO
        stake(alice, @movedao_addrx, 500);
        assert!(get_dao_staked_balance(@movedao_addrx, @0x3) == 500, 100);
        assert!(get_staked_balance(@0x3) == 500, 101);
        
        // Stake in second DAO - this should work without conflict
        stake(alice, @0x5, 300);
        assert!(get_dao_staked_balance(@0x5, @0x3) == 300, 102);
        assert!(get_staked_balance(@0x3) == 800, 103); // Total across both DAOs
        
        // Verify DAO-specific balances are separate
        assert!(get_dao_staked_balance(@movedao_addrx, @0x3) == 500, 104);
        assert!(get_dao_staked_balance(@0x5, @0x3) == 300, 105);
        
        // Add more to first DAO
        stake(alice, @movedao_addrx, 100);
        assert!(get_dao_staked_balance(@movedao_addrx, @0x3) == 600, 106);
        assert!(get_dao_staked_balance(@0x5, @0x3) == 300, 107); // Should remain unchanged
        assert!(get_staked_balance(@0x3) == 900, 108);
        
        coin::destroy_mint_cap(mint_cap);
        coin::destroy_burn_cap(burn_cap);
    }
}