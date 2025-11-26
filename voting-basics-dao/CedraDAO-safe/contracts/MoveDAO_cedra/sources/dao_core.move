// Main DAO factory - creates and manages DAOs with their core components (treasury, membership)
module movedao_addrx::dao_core_file {
    use std::signer;
    use std::string;
    use std::error;
    use std::event;
    use std::vector;
    use cedra_framework::timestamp;
    #[test_only]
    use cedra_framework::account;
    use movedao_addrx::admin;
    use movedao_addrx::membership;
    use movedao_addrx::proposal;
    use movedao_addrx::staking;
    use movedao_addrx::treasury;
    use movedao_addrx::errors;
    use movedao_addrx::input_validation;
    use movedao_addrx::activity_tracker;
    use movedao_addrx::treasury::Treasury;
    use cedra_framework::object::Object;
    use cedra_std::simple_map::{Self, SimpleMap};

    // Image data can be either a URL or binary data
    struct ImageData has copy, drop, store {
        is_url: bool,              // true if it's a URL, false if it's binary data
        url: string::String,       // URL string (used when is_url = true)
        data: vector<u8>          // Binary data (used when is_url = false)
    }

    struct DAOInfo has key {
        name: string::String,
        subname: string::String,
        description: string::String,
        logo: ImageData,
        background: ImageData,
        created_at: u64,
        treasury: Object<Treasury>,
        // Social media links (optional) - separate fields
        x_link: string::String,         // X (Twitter) URL
        discord_link: string::String,   // Discord URL
        telegram_link: string::String,  // Telegram URL
        website: string::String,        // Website URL
        // DAO category/type
        category: string::String        // DeFi, NFT, Infrastructure, Gaming, Social, etc.
    }

    #[event]
    struct DAOCreated has drop, store {
        movedao_addrxess: address,
        creator: address,
        name: string::String,
        subname: string::String,
        description: string::String,
        created_at: u64
    }

    #[event]
    struct DAOCreationProposal has drop, store {
        proposal_id: u64,
        proposing_council: address,
        proposer: address,
        target_movedao_addrxess: address,
        name: string::String,
        subname: string::String,
        description: string::String,
        created_at: u64
    }

    #[event]
    struct CouncilDAOCreated has drop, store {
        movedao_addrxess: address,
        creating_council: address,
        proposal_id: u64,
        name: string::String,
        subname: string::String,
        description: string::String,
        created_at: u64,
        yes_votes: u64,
        total_council_size: u64
    }

    #[event]
    struct DAORegistered has drop, store {
        dao_address: address,
        registered_at: u64
    }

    struct DAOCreationProposalData has store {
        id: u64,
        proposer: address,
        target_movedao_addrxess: address,
        name: string::String,
        subname: string::String,
        description: string::String,
        logo: ImageData,
        background: ImageData,
        min_stake_to_join: u64,
        created_at: u64,
        voting_deadline: u64,
        yes_votes: u64,
        no_votes: u64,
        voted_members: vector<address>,
        executed: bool,
        approved: bool,
        x_link: string::String,
        discord_link: string::String,
        telegram_link: string::String,
        website: string::String,
        category: string::String
    }

    struct CouncilDAOCreationRegistry has key {
        proposals: vector<DAOCreationProposalData>,
        next_proposal_id: u64,
        voting_duration: u64  // Duration in seconds for voting on DAO creation proposals
    }

    struct DAOSummary has copy, drop, store {
        address: address,
        name: string::String,
        description: string::String,
        created_at: u64
    }

    struct DAORegistry has key {
        dao_addresses: vector<address>,
        total_daos: u64,
        created_at: u64
    }

    struct SubnameRegistry has key {
        used_subnames: SimpleMap<string::String, address>,
        total_subnames: u64
    }

    // Module initialization - automatically creates registry on deployment
    fun init_module(account: &signer) {
        // This function is called automatically when the module is first published
        // It initializes the global DAO registry at the module address
        move_to(account, DAORegistry {
            dao_addresses: vector::empty<address>(),
            total_daos: 0,
            created_at: timestamp::now_seconds()
        });
        
        // Initialize subname registry for unique subname tracking
        move_to(account, SubnameRegistry {
            used_subnames: simple_map::create<string::String, address>(),
            total_subnames: 0
        });

        // Initialize global activity tracker
        activity_tracker::initialize(account);
    }

    #[test_only]
    /// Initialize registry for test environment
    public fun init_registry_for_test() {
        let dao_module_signer = account::create_signer_for_test(@movedao_addrx);
        if (!exists<DAORegistry>(@movedao_addrx)) {
            move_to(&dao_module_signer, DAORegistry {
                dao_addresses: vector::empty(),
                total_daos: 0,
                created_at: timestamp::now_seconds()
            });
        };
        if (!exists<SubnameRegistry>(@movedao_addrx)) {
            move_to(&dao_module_signer, SubnameRegistry {
                used_subnames: simple_map::create<string::String, address>(),
                total_subnames: 0
            });
        }
    }

    // Helper functions to create ImageData
    public fun create_image_from_url(url: string::String): ImageData {
        ImageData {
            is_url: true,
            url,
            data: vector::empty()
        }
    }

    public fun create_image_from_data(data: vector<u8>): ImageData {
        ImageData {
            is_url: false,
            url: string::utf8(b""),
            data
        }
    }

    // Helper functions to validate images
    fun validate_image_data(image: &ImageData) {
        if (image.is_url) {
            // Validate URL format and length
            input_validation::validate_image_url(&image.url);
        } else {
            // Validate binary data size
            input_validation::validate_logo(&image.data);
        }
    }

    fun validate_background_data(image: &ImageData) {
        if (image.is_url) {
            // Validate URL format and length
            input_validation::validate_image_url(&image.url);
        } else {
            // Validate binary data size
            input_validation::validate_background(&image.data);
        }
    }

    // Validate and reserve subname - ensures global uniqueness
    fun validate_and_reserve_subname(subname: &string::String, dao_address: address) acquires SubnameRegistry {
        // Ensure subname registry exists
        assert!(exists<SubnameRegistry>(@movedao_addrx), errors::registry_not_initialized());
        
        let registry = borrow_global_mut<SubnameRegistry>(@movedao_addrx);
        
        // Check if subname is already taken
        assert!(!simple_map::contains_key(&registry.used_subnames, subname), errors::subname_already_exists());
        
        // Reserve the subname
        simple_map::add(&mut registry.used_subnames, *subname, dao_address);
        registry.total_subnames = registry.total_subnames + 1;
    }

    // Check if subname is available (read-only)
    fun is_subname_available(subname: &string::String): bool acquires SubnameRegistry {
        if (!exists<SubnameRegistry>(@movedao_addrx)) {
            return false
        };
        let registry = borrow_global<SubnameRegistry>(@movedao_addrx);
        !simple_map::contains_key(&registry.used_subnames, subname)
    }

    // Legacy function - kept for backward compatibility but registry is now auto-initialized
    public entry fun init_dao_registry(admin: &signer) {
        // Registry is automatically initialized during module deployment
        // This function is kept for backward compatibility but does nothing
        let _addr = signer::address_of(admin);
        // Registry should already exist from module initialization
    }

    // Function to manually add an existing DAO to the registry (for retroactive registration)
    public entry fun add_dao_to_registry(admin: &signer, dao_address: address) acquires DAORegistry {
        let addr = signer::address_of(admin);
        assert!(addr == @movedao_addrx, error::permission_denied(1)); // Only module admin can add
        assert!(exists<DAOInfo>(dao_address), errors::not_found()); // DAO must exist
        assert!(exists<DAORegistry>(@movedao_addrx), errors::registry_not_initialized()); // Registry must exist
        
        let registry = borrow_global_mut<DAORegistry>(@movedao_addrx);
        
        // Check if DAO is already in registry
        let i = 0;
        let len = vector::length(&registry.dao_addresses);
        while (i < len) {
            if (*vector::borrow(&registry.dao_addresses, i) == dao_address) {
                return // Already in registry
            };
            i = i + 1;
        };
        
        // Add to registry
        vector::push_back(&mut registry.dao_addresses, dao_address);
        registry.total_daos = registry.total_daos + 1;
    }

    fun ensure_registry_exists(_first_dao_creator: &signer) {
        // Registry is automatically initialized during module deployment via init_module
        // If it doesn't exist, something went wrong during deployment
        assert!(exists<DAORegistry>(@movedao_addrx), errors::registry_not_initialized());
    }

    // Public function to check and initialize registry if needed
    // This can be called by anyone to ensure registry is set up
    public entry fun check_and_init_registry(admin: &signer) {
        let addr = signer::address_of(admin);
        // The registry should be stored at the module address for global access
        assert!(addr == @movedao_addrx, error::permission_denied(1));
        
        // Don't fail if registry already exists, just return silently
        if (exists<DAORegistry>(addr)) {
            return
        };
        
        move_to(admin, DAORegistry {
            dao_addresses: vector::empty(),
            total_daos: 0,
            created_at: timestamp::now_seconds()
        });
    }

    fun add_to_registry(dao_addr: address) acquires DAORegistry {
        // Registry should already exist from module initialization
        assert!(exists<DAORegistry>(@movedao_addrx), errors::registry_not_initialized());
        
        let registry = borrow_global_mut<DAORegistry>(@movedao_addrx);
        
        // Check if already exists to avoid duplicates
        let i = 0;
        let len = vector::length(&registry.dao_addresses);
        let already_exists = false;
        while (i < len) {
            if (*vector::borrow(&registry.dao_addresses, i) == dao_addr) {
                already_exists = true;
                break
            };
            i = i + 1;
        };
        
        if (!already_exists) {
            vector::push_back(&mut registry.dao_addresses, dao_addr);
            registry.total_daos = registry.total_daos + 1;
        };
        
        // Always emit event for tracking
        event::emit(DAORegistered {
            dao_address: dao_addr,
            registered_at: timestamp::now_seconds()
        });
    }

    // Automatic registry initialization - creates registry at module address
    // Uses module init pattern for one-time setup
    fun init_registry_automatically() {
        // In Move, we cannot create signers for arbitrary addresses
        // But we can use the module initialization pattern
        // The registry will be initialized during module deployment
        // This is a placeholder - actual initialization happens in module init
    }

    // Create DAO with binary image data (backward compatibility)
    public entry fun create_dao(
        account: &signer,
        name: string::String,
        subname: string::String,
        description: string::String,
        logo: vector<u8>,
        background: vector<u8>,
        min_stake_to_join: u64,
        x_link: string::String,        // X (Twitter) URL (optional)
        discord_link: string::String,  // Discord URL (optional)
        telegram_link: string::String, // Telegram URL (optional)
        website: string::String,       // Website URL (optional)
        category: string::String       // DeFi, NFT, Infrastructure, Gaming, Social, etc.
    ) acquires DAORegistry, SubnameRegistry {
        let logo_data = create_image_from_data(logo);
        let background_data = create_image_from_data(background);
        create_dao_internal(account, name, subname, description, logo_data, background_data, min_stake_to_join, x_link, discord_link, telegram_link, website, category);
    }

    // Create DAO with URL images
    public entry fun create_dao_with_urls(
        account: &signer,
        name: string::String,
        subname: string::String,
        description: string::String,
        logo_url: string::String,
        background_url: string::String,
        min_stake_to_join: u64,
        x_link: string::String,
        discord_link: string::String,
        telegram_link: string::String,
        website: string::String,
        category: string::String
    ) acquires DAORegistry, SubnameRegistry {
        let logo_data = create_image_from_url(logo_url);
        let background_data = create_image_from_url(background_url);
        create_dao_internal(account, name, subname, description, logo_data, background_data, min_stake_to_join, x_link, discord_link, telegram_link, website, category);
    }

    // Create DAO with mixed image types (URL + binary or vice versa)
    public entry fun create_dao_mixed(
        account: &signer,
        name: string::String,
        subname: string::String,
        description: string::String,
        logo_is_url: bool,
        logo_url: string::String,
        logo_data: vector<u8>,
        background_is_url: bool,
        background_url: string::String,
        background_data: vector<u8>,
        min_stake_to_join: u64,
        x_link: string::String,
        discord_link: string::String,
        telegram_link: string::String,
        website: string::String,
        category: string::String
    ) acquires DAORegistry, SubnameRegistry {
        let logo_image = if (logo_is_url) {
            create_image_from_url(logo_url)
        } else {
            create_image_from_data(logo_data)
        };

        let background_image = if (background_is_url) {
            create_image_from_url(background_url)
        } else {
            create_image_from_data(background_data)
        };

        create_dao_internal(account, name, subname, description, logo_image, background_image, min_stake_to_join, x_link, discord_link, telegram_link, website, category);
    }

    // Internal function to create DAO (used by all public create functions)
    fun create_dao_internal(
        account: &signer,
        name: string::String,
        subname: string::String,
        description: string::String,
        logo: ImageData,
        background: ImageData,
        min_stake_to_join: u64,
        x_link: string::String,
        discord_link: string::String,
        telegram_link: string::String,
        website: string::String,
        category: string::String
    ) acquires DAORegistry, SubnameRegistry {
        let addr = signer::address_of(account);
        // Allow multiple DAOs per address - comment out existence check
        // assert!(!exists<DAOInfo>(addr), error::already_exists(0));

        // Ensure DAO registry exists (auto-initialize if this is the first DAO)
        ensure_registry_exists(account);

        // Comprehensive input validation
        input_validation::validate_dao_name(&name);
        input_validation::validate_dao_name(&subname);
        input_validation::validate_dao_description(&description);
        validate_image_data(&logo);
        validate_background_data(&background);

        // Validate minimum stake (should be reasonable - between 6 and 10000 Move)
        assert!(min_stake_to_join >= 6000000, errors::invalid_amount()); // 6 Move minimum
        assert!(min_stake_to_join <= 10000000000, errors::invalid_amount()); // 10000 Move maximum

        // Validate and reserve subname for global uniqueness
        validate_and_reserve_subname(&subname, addr);

        let treasury = treasury::init_treasury(account);
        let created_at = timestamp::now_seconds();

        // Skip creation if DAO already exists from previous deployments
        // This allows new contract to work even with old DAO resources present
        if (!exists<DAOInfo>(addr)) {
            // Only create DAO if none exists (avoids conflict with old deployments)
            move_to(account, DAOInfo {
                name,
                subname,
                description,
                logo,
                background,
                created_at,
                treasury,
                x_link,
                discord_link,
                telegram_link,
                website,
                category
            });
        } else {
            // DAO already exists from previous deployment - skip creation but continue with setup
            // This prevents the "object already exists" error while allowing the transaction to succeed
        };

        // Initialize all required modules - check each one individually
        // Admin system
        if (!admin::exists_admin_list(addr)) {
            admin::init_admin(account, 1);
        };
        
        // Membership system
        if (!membership::is_membership_initialized(addr)) {
            membership::initialize_with_min_stake(account, min_stake_to_join);
        };
        
        // Proposal system
        if (!proposal::has_proposals(addr)) {
            proposal::initialize_proposals(account);
        };
        
        // Staking system
        if (!staking::is_staking_initialized(addr)) {
            staking::init_staking(account);
        };

        // Add to DAO registry
        add_to_registry(addr);

        // Log DAO creation activity
        activity_tracker::emit_dao_created(
            addr,                    // dao_address
            addr,                    // creator
            name,                    // name
            vector::empty<u8>(),     // transaction_hash (will be filled by the tracker)
            0                        // block_number (will be filled by the tracker)
        );

        // Emit DAO creation event
        event::emit(DAOCreated {
            movedao_addrxess: addr,
            creator: addr,
            name,
            subname,
            description,
            created_at
        });
    }

    // Initialize council DAO creation registry for existing councils
    public entry fun init_council_dao_creation(council_account: &signer, voting_duration: u64) {
        let addr = signer::address_of(council_account);
        assert!(!exists<CouncilDAOCreationRegistry>(addr), error::already_exists(0));
        assert!(exists<DAOInfo>(addr), errors::not_found()); // Must be an existing DAO/council
        
        // Validate voting duration (minimum 1 hour, maximum 7 days)
        assert!(voting_duration >= 3600, errors::invalid_amount()); // 1 hour minimum
        assert!(voting_duration <= 604800, errors::invalid_amount()); // 7 days maximum
        
        let registry = CouncilDAOCreationRegistry {
            proposals: vector::empty(),
            next_proposal_id: 0,
            voting_duration
        };
        
        move_to(council_account, registry);
    }

    // Council members can propose new DAO creation (with binary data)
    public entry fun propose_dao_creation(
        council_member: &signer,
        council_movedao_addrx: address,
        target_movedao_addrxess: address,
        name: string::String,
        subname: string::String,
        description: string::String,
        logo: vector<u8>,
        background: vector<u8>,
        min_stake_to_join: u64
    ) acquires CouncilDAOCreationRegistry {
        let logo_data = create_image_from_data(logo);
        let background_data = create_image_from_data(background);
        propose_dao_creation_internal(council_member, council_movedao_addrx, target_movedao_addrxess, name, subname, description, logo_data, background_data, min_stake_to_join);
    }

    // Council members can propose new DAO creation (with URLs)
    public entry fun propose_dao_creation_with_urls(
        council_member: &signer,
        council_movedao_addrx: address,
        target_movedao_addrxess: address,
        name: string::String,
        subname: string::String,
        description: string::String,
        logo_url: string::String,
        background_url: string::String,
        min_stake_to_join: u64
    ) acquires CouncilDAOCreationRegistry {
        let logo_data = create_image_from_url(logo_url);
        let background_data = create_image_from_url(background_url);
        propose_dao_creation_internal(council_member, council_movedao_addrx, target_movedao_addrxess, name, subname, description, logo_data, background_data, min_stake_to_join);
    }

    // Internal function for DAO creation proposals
    fun propose_dao_creation_internal(
        council_member: &signer,
        council_movedao_addrx: address,
        target_movedao_addrxess: address,
        name: string::String,
        subname: string::String,
        description: string::String,
        logo: ImageData,
        background: ImageData,
        min_stake_to_join: u64
    ) acquires CouncilDAOCreationRegistry {
        let proposer = signer::address_of(council_member);

        // Verify proposer is an admin of the proposing DAO
        assert!(exists<DAOInfo>(council_movedao_addrx), errors::not_found());
        errors::require_admin(admin::is_admin(council_movedao_addrx, proposer));
        
        // Verify target DAO address doesn't already exist
        assert!(!exists<DAOInfo>(target_movedao_addrxess), error::already_exists(0));
        
        // Comprehensive input validation
        input_validation::validate_dao_name(&name);
        input_validation::validate_dao_name(&subname);
        input_validation::validate_dao_description(&description);
        validate_image_data(&logo);
        validate_background_data(&background);
        
        assert!(min_stake_to_join >= 6000000, errors::invalid_amount()); // 6 Move minimum
        assert!(min_stake_to_join <= 10000000000, errors::invalid_amount()); // 10000 Move maximum
        
        // Registry must be initialized first
        assert!(exists<CouncilDAOCreationRegistry>(council_movedao_addrx), errors::registry_not_initialized());
        
        let registry = borrow_global_mut<CouncilDAOCreationRegistry>(council_movedao_addrx);
        let proposal_id = registry.next_proposal_id;
        registry.next_proposal_id = proposal_id + 1;
        
        let created_at = timestamp::now_seconds();
        let voting_deadline = created_at + registry.voting_duration;
        
        let proposal = DAOCreationProposalData {
            id: proposal_id,
            proposer,
            target_movedao_addrxess,
            name,
            subname,
            description,
            logo,
            background,
            min_stake_to_join,
            created_at,
            voting_deadline,
            yes_votes: 0,
            no_votes: 0,
            voted_members: vector::empty(),
            executed: false,
            approved: false,
            x_link: string::utf8(b""),
            discord_link: string::utf8(b""),
            telegram_link: string::utf8(b""),
            website: string::utf8(b""),
            category: string::utf8(b"")
        };
        
        vector::push_back(&mut registry.proposals, proposal);
        
        // Emit proposal event
        event::emit(DAOCreationProposal {
            proposal_id,
            proposing_council: council_movedao_addrx,
            proposer,
            target_movedao_addrxess,
            name,
            subname,
            description,
            created_at
        });
    }

    // Council members vote on DAO creation proposals
    public entry fun vote_on_dao_creation(
        council_member: &signer,
        council_movedao_addrx: address,
        proposal_id: u64,
        approve: bool
    ) acquires CouncilDAOCreationRegistry {
        let voter = signer::address_of(council_member);

        // Verify voter is an admin
        assert!(exists<DAOInfo>(council_movedao_addrx), errors::not_found());
        errors::require_admin(admin::is_admin(council_movedao_addrx, voter));
        
        let registry = borrow_global_mut<CouncilDAOCreationRegistry>(council_movedao_addrx);
        assert!(proposal_id < vector::length(&registry.proposals), errors::proposal_not_found());
        
        let proposal = vector::borrow_mut(&mut registry.proposals, proposal_id);
        assert!(!proposal.executed, errors::proposal_already_executed());
        assert!(timestamp::now_seconds() <= proposal.voting_deadline, errors::voting_period_ended());
        
        // Check if member has already voted
        let i = 0;
        let len = vector::length(&proposal.voted_members);
        let already_voted = false;
        while (i < len) {
            if (*vector::borrow(&proposal.voted_members, i) == voter) {
                already_voted = true;
                break
            };
            i = i + 1;
        };
        assert!(!already_voted, errors::already_voted());
        
        // Record vote
        vector::push_back(&mut proposal.voted_members, voter);
        if (approve) {
            proposal.yes_votes = proposal.yes_votes + 1;
        } else {
            proposal.no_votes = proposal.no_votes + 1;
        };
    }

    // Execute DAO creation if proposal passes
    public entry fun execute_dao_creation(
        executor: &signer,
        council_movedao_addrx: address,
        proposal_id: u64
    ) acquires CouncilDAOCreationRegistry {
        let executor_addr = signer::address_of(executor);

        // Verify executor is an admin
        assert!(exists<DAOInfo>(council_movedao_addrx), errors::not_found());
        errors::require_admin(admin::is_admin(council_movedao_addrx, executor_addr));
        
        let registry = borrow_global_mut<CouncilDAOCreationRegistry>(council_movedao_addrx);
        assert!(proposal_id < vector::length(&registry.proposals), errors::proposal_not_found());
        
        let proposal = vector::borrow_mut(&mut registry.proposals, proposal_id);
        assert!(!proposal.executed, errors::proposal_already_executed());
        assert!(timestamp::now_seconds() > proposal.voting_deadline, errors::voting_period_active());
        
        // Check if proposal passes (simple majority based on admin count)
        let total_admin_count = admin::get_admin_count(council_movedao_addrx);
        let required_votes = (total_admin_count / 2) + 1; // Simple majority
        let passed = proposal.yes_votes >= required_votes;
        
        proposal.executed = true;
        proposal.approved = passed;
        
        if (passed) {
            // Create the target signer for the new DAO - this is a simplified approach
            // In production, you might want a more sophisticated DAO address generation mechanism
            assert!(!exists<DAOInfo>(proposal.target_movedao_addrxess), error::already_exists(0));
            
            // For now, we'll create a placeholder that needs to be properly initialized by the target address owner
            // This is a design limitation - the target address owner must call a separate initialization function
            // Alternative: Use object-based DAO creation for better address management
            
            event::emit(CouncilDAOCreated {
                movedao_addrxess: proposal.target_movedao_addrxess,
                creating_council: council_movedao_addrx,
                proposal_id,
                name: proposal.name,
                subname: proposal.subname,
                description: proposal.description,
                created_at: timestamp::now_seconds(),
                yes_votes: proposal.yes_votes,
                total_council_size: total_admin_count
            });
        };
    }

    // Helper function for approved DAO creation by target address owner
    public entry fun finalize_council_created_dao(
        target_account: &signer,
        council_movedao_addrx: address,
        proposal_id: u64
    ) acquires CouncilDAOCreationRegistry, DAORegistry {
        let addr = signer::address_of(target_account);
        
        let registry = borrow_global<CouncilDAOCreationRegistry>(council_movedao_addrx);
        assert!(proposal_id < vector::length(&registry.proposals), errors::proposal_not_found());
        
        let proposal = vector::borrow(&registry.proposals, proposal_id);
        assert!(proposal.target_movedao_addrxess == addr, errors::unauthorized());
        assert!(proposal.executed, errors::proposal_not_executed());
        assert!(proposal.approved, errors::proposal_not_approved());
        assert!(!exists<DAOInfo>(addr), error::already_exists(0));
        
        // Now create the actual DAO using the approved parameters
        let treasury = treasury::init_treasury(target_account);
        let created_at = timestamp::now_seconds();

        move_to(target_account, DAOInfo {
            name: proposal.name,
            subname: proposal.subname,
            description: proposal.description,
            logo: proposal.logo,
            background: proposal.background,
            created_at,
            treasury,
            x_link: proposal.x_link,
            discord_link: proposal.discord_link,
            telegram_link: proposal.telegram_link,
            website: proposal.website,
            category: proposal.category
        });

        // Initialize all required modules - check each one individually
        // Admin system
        if (!admin::exists_admin_list(addr)) {
            admin::init_admin(target_account, 1);
        };
        
        // Membership system
        if (!membership::is_membership_initialized(addr)) {
            membership::initialize_with_min_stake(target_account, proposal.min_stake_to_join);
        };
        
        // Proposal system
        if (!proposal::has_proposals(addr)) {
            proposal::initialize_proposals(target_account);
        };
        
        // Staking system
        if (!staking::is_staking_initialized(addr)) {
            staking::init_staking(target_account);
        };

        // Add to DAO registry
        add_to_registry(addr);

        // Log DAO creation activity
        activity_tracker::emit_dao_created(
            addr,                    // dao_address
            addr,                    // creator
            proposal.name,           // name
            vector::empty<u8>(),     // transaction_hash (will be filled by the tracker)
            0                        // block_number (will be filled by the tracker)
        );

        // Emit DAO creation event
        event::emit(DAOCreated {
            movedao_addrxess: addr,
            creator: addr,
            name: proposal.name,
            subname: proposal.subname,
            description: proposal.description,
            created_at
        });
    }

    // View functions for council DAO creation
    #[view]
    public fun get_dao_creation_proposal(
        council_movedao_addrx: address,
        proposal_id: u64
    ): (u64, address, address, string::String, string::String, u64, u64, u64, u64, bool, bool) acquires CouncilDAOCreationRegistry {
        assert!(exists<CouncilDAOCreationRegistry>(council_movedao_addrx), errors::registry_not_initialized());
        let registry = borrow_global<CouncilDAOCreationRegistry>(council_movedao_addrx);
        assert!(proposal_id < vector::length(&registry.proposals), errors::proposal_not_found());
        
        let proposal = vector::borrow(&registry.proposals, proposal_id);
        (
            proposal.id,
            proposal.proposer,
            proposal.target_movedao_addrxess,
            proposal.name,
            proposal.description,
            proposal.created_at,
            proposal.voting_deadline,
            proposal.yes_votes,
            proposal.no_votes,
            proposal.executed,
            proposal.approved
        )
    }

    #[view]
    public fun get_dao_creation_proposal_count(council_movedao_addrx: address): u64 acquires CouncilDAOCreationRegistry {
        if (!exists<CouncilDAOCreationRegistry>(council_movedao_addrx)) return 0;
        let registry = borrow_global<CouncilDAOCreationRegistry>(council_movedao_addrx);
        vector::length(&registry.proposals)
    }

    #[view]
    public fun has_voted_on_dao_creation(
        council_movedao_addrx: address,
        proposal_id: u64,
        voter: address
    ): bool acquires CouncilDAOCreationRegistry {
        if (!exists<CouncilDAOCreationRegistry>(council_movedao_addrx)) return false;
        let registry = borrow_global<CouncilDAOCreationRegistry>(council_movedao_addrx);
        if (proposal_id >= vector::length(&registry.proposals)) return false;
        
        let proposal = vector::borrow(&registry.proposals, proposal_id);
        let i = 0;
        let len = vector::length(&proposal.voted_members);
        while (i < len) {
            if (*vector::borrow(&proposal.voted_members, i) == voter) {
                return true
            };
            i = i + 1;
        };
        false
    }

    #[view]
    public fun is_dao_creation_registry_initialized(council_movedao_addrx: address): bool {
        exists<CouncilDAOCreationRegistry>(council_movedao_addrx)
    }

    #[view]
    public fun get_dao_info(addr: address): (string::String, string::String, bool, string::String, vector<u8>, bool, string::String, vector<u8>, u64)
    acquires DAOInfo {
        let dao = borrow_global<DAOInfo>(addr);
        (
            dao.name,
            dao.description,
            dao.logo.is_url,
            dao.logo.url,
            dao.logo.data,
            dao.background.is_url,
            dao.background.url,
            dao.background.data,
            dao.created_at
        )
    }

    // New function with subname included
    #[view]
    public fun get_dao_info_with_subname(addr: address): (string::String, string::String, string::String, bool, string::String, vector<u8>, bool, string::String, vector<u8>, u64)
    acquires DAOInfo {
        let dao = borrow_global<DAOInfo>(addr);
        (
            dao.name,
            dao.subname,
            dao.description,
            dao.logo.is_url,
            dao.logo.url,
            dao.logo.data,
            dao.background.is_url,
            dao.background.url,
            dao.background.data,
            dao.created_at
        )
    }

    // Backward compatibility function (returns empty vectors for URLs)
    #[view]
    public fun get_dao_info_legacy(addr: address): (string::String, string::String, vector<u8>, vector<u8>, u64)
    acquires DAOInfo {
        let dao = borrow_global<DAOInfo>(addr);
        let logo_data = if (dao.logo.is_url) { vector::empty() } else { dao.logo.data };
        let background_data = if (dao.background.is_url) { vector::empty() } else { dao.background.data };
        (
            dao.name,
            dao.description,
            logo_data,
            background_data,
            dao.created_at
        )
    }

    // Helper function to get treasury object from DAOInfo
    #[view]
    public fun get_treasury_object(movedao_addrx: address): Object<Treasury> acquires DAOInfo {
        borrow_global<DAOInfo>(movedao_addrx).treasury
    }

    // Check if a DAO exists (has DAOInfo resource)
    #[view]
    public fun dao_exists(movedao_addrx: address): bool {
        exists<DAOInfo>(movedao_addrx)
    }



    // Get all DAO addresses from registry
    #[view]
    public fun get_all_dao_addresses(): vector<address> acquires DAORegistry {
        let registry = borrow_global<DAORegistry>(@movedao_addrx);
        registry.dao_addresses
    }

    // Get all DAOs created by a specific address
    #[view]
    public fun get_daos_created_by(creator: address): vector<address> acquires DAORegistry {
        if (!exists<DAORegistry>(@movedao_addrx)) {
            return vector::empty()
        };
        
        let registry = borrow_global<DAORegistry>(@movedao_addrx);
        let dao_addresses = &registry.dao_addresses;
        let result = vector::empty<address>();
        
        let i = 0;
        let len = vector::length(dao_addresses);
        while (i < len) {
            let dao_addr = *vector::borrow(dao_addresses, i);
            // Check if this DAO was created by the specified address
            // In our system, DAOs are stored at the creator's address
            if (dao_addr == creator && exists<DAOInfo>(dao_addr)) {
                vector::push_back(&mut result, dao_addr);
            };
            i = i + 1;
        };
        
        result
    }

    // Get all DAOs that a specific address has joined as a member
    #[view]
    public fun get_daos_joined_by(member: address): vector<address> acquires DAORegistry {
        if (!exists<DAORegistry>(@movedao_addrx)) {
            return vector::empty()
        };
        
        let registry = borrow_global<DAORegistry>(@movedao_addrx);
        let dao_addresses = &registry.dao_addresses;
        let result = vector::empty<address>();
        
        let i = 0;
        let len = vector::length(dao_addresses);
        while (i < len) {
            let dao_addr = *vector::borrow(dao_addresses, i);
            // Check if the member is part of this DAO
            if (membership::is_member(dao_addr, member)) {
                vector::push_back(&mut result, dao_addr);
            };
            i = i + 1;
        };
        
        result
    }

    // Get both created and joined DAOs for a user (convenience function)
    #[view]
    public fun get_user_daos(user_address: address): (vector<address>, vector<address>) acquires DAORegistry {
        let created_daos = get_daos_created_by(user_address);
        let joined_daos = get_daos_joined_by(user_address);
        (created_daos, joined_daos)
    }

    // Helper function to check if DAO registry is working
    #[view] 
    public fun is_registry_functional(): bool {
        exists<DAORegistry>(@movedao_addrx)
    }

    // Get total number of DAOs created
    #[view]
    public fun get_total_dao_count(): u64 acquires DAORegistry {
        let registry = borrow_global<DAORegistry>(@movedao_addrx);
        registry.total_daos
    }

    // Check if registry is available (informational)
    #[view]
    public fun is_registry_initialized(): bool {
        exists<DAORegistry>(@movedao_addrx)
    }

    // Get all DAOs with their basic info
    #[view]
    public fun get_all_daos(): vector<DAOSummary> acquires DAORegistry, DAOInfo {
        if (!exists<DAORegistry>(@movedao_addrx)) {
            return vector::empty()
        };
        
        let registry = borrow_global<DAORegistry>(@movedao_addrx);
        let dao_addresses = &registry.dao_addresses;
        let result = vector::empty<DAOSummary>();
        
        let i = 0;
        let len = vector::length(dao_addresses);
        while (i < len) {
            let dao_addr = *vector::borrow(dao_addresses, i);
            if (exists<DAOInfo>(dao_addr)) {
                let dao_info = borrow_global<DAOInfo>(dao_addr);
                let summary = DAOSummary {
                    address: dao_addr,
                    name: dao_info.name,
                    description: dao_info.description,
                    created_at: dao_info.created_at
                };
                vector::push_back(&mut result, summary);
            };
            i = i + 1;
        };
        
        result
    }

    // Check if a subname is available for use
    #[view]
    public fun is_subname_taken(subname: string::String): bool acquires SubnameRegistry {
        !is_subname_available(&subname)
    }

    // Get the DAO address that owns a specific subname
    #[view]
    public fun get_subname_owner(subname: string::String): address acquires SubnameRegistry {
        assert!(exists<SubnameRegistry>(@movedao_addrx), errors::registry_not_initialized());
        let registry = borrow_global<SubnameRegistry>(@movedao_addrx);
        assert!(simple_map::contains_key(&registry.used_subnames, &subname), errors::subname_not_found());
        *simple_map::borrow(&registry.used_subnames, &subname)
    }

    // Get total number of registered subnames
    #[view]
    public fun get_total_subnames(): u64 acquires SubnameRegistry {
        if (!exists<SubnameRegistry>(@movedao_addrx)) return 0;
        let registry = borrow_global<SubnameRegistry>(@movedao_addrx);
        registry.total_subnames
    }

    // Check if subname registry is initialized
    #[view]
    public fun is_subname_registry_initialized(): bool {
        exists<SubnameRegistry>(@movedao_addrx)
    }

    // Get DAO X (Twitter) link
    #[view]
    public fun get_dao_x_link(movedao_addrx: address): string::String acquires DAOInfo {
        assert!(exists<DAOInfo>(movedao_addrx), errors::not_found());
        let dao_info = borrow_global<DAOInfo>(movedao_addrx);
        dao_info.x_link
    }

    // Get DAO Discord link
    #[view]
    public fun get_dao_discord_link(movedao_addrx: address): string::String acquires DAOInfo {
        assert!(exists<DAOInfo>(movedao_addrx), errors::not_found());
        let dao_info = borrow_global<DAOInfo>(movedao_addrx);
        dao_info.discord_link
    }

    // Get DAO Telegram link
    #[view]
    public fun get_dao_telegram_link(movedao_addrx: address): string::String acquires DAOInfo {
        assert!(exists<DAOInfo>(movedao_addrx), errors::not_found());
        let dao_info = borrow_global<DAOInfo>(movedao_addrx);
        dao_info.telegram_link
    }

    // Get DAO website
    #[view]
    public fun get_dao_website(movedao_addrx: address): string::String acquires DAOInfo {
        assert!(exists<DAOInfo>(movedao_addrx), errors::not_found());
        let dao_info = borrow_global<DAOInfo>(movedao_addrx);
        dao_info.website
    }

    // Get all DAO links (X, Discord, Telegram, Website)
    #[view]
    public fun get_dao_all_links(movedao_addrx: address): (string::String, string::String, string::String, string::String) acquires DAOInfo {
        assert!(exists<DAOInfo>(movedao_addrx), errors::not_found());
        let dao_info = borrow_global<DAOInfo>(movedao_addrx);
        (dao_info.x_link, dao_info.discord_link, dao_info.telegram_link, dao_info.website)
    }

    // Get DAO category
    #[view]
    public fun get_dao_category(movedao_addrx: address): string::String acquires DAOInfo {
        assert!(exists<DAOInfo>(movedao_addrx), errors::not_found());
        let dao_info = borrow_global<DAOInfo>(movedao_addrx);
        dao_info.category
    }

    // Get paginated DAOs (for better performance with large lists)
    #[view]
    public fun get_daos_paginated(offset: u64, limit: u64): vector<DAOSummary> acquires DAORegistry, DAOInfo {
        if (!exists<DAORegistry>(@movedao_addrx)) {
            return vector::empty()
        };
        
        let registry = borrow_global<DAORegistry>(@movedao_addrx);
        let dao_addresses = &registry.dao_addresses;
        let total_daos = vector::length(dao_addresses);
        let result = vector::empty<DAOSummary>();
        
        if (offset >= total_daos) {
            return result
        };
        
        let end = offset + limit;
        if (end > total_daos) {
            end = total_daos;
        };
        
        let i = offset;
        while (i < end) {
            let dao_addr = *vector::borrow(dao_addresses, i);
            if (exists<DAOInfo>(dao_addr)) {
                let dao_info = borrow_global<DAOInfo>(dao_addr);
                let summary = DAOSummary {
                    address: dao_addr,
                    name: dao_info.name,
                    description: dao_info.description,
                    created_at: dao_info.created_at
                };
                vector::push_back(&mut result, summary);
            };
            i = i + 1;
        };
        
        result
    }

}