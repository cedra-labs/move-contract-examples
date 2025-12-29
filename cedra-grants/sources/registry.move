/// CedraGrants Registry Module
/// Manages project registration, metadata, and lifecycle for public goods funding
module cedra_grants::registry {
    use std::string::{Self, String};
    use std::vector;
    use std::signer;
    use cedra_framework::timestamp;
    use cedra_framework::event;
    use cedra_framework::object::{Self, Object};

    // ==================== Error Codes ====================
    const E_NOT_OWNER: u64 = 1;
    const E_PROJECT_NOT_FOUND: u64 = 2;
    const E_INVALID_STATUS: u64 = 3;
    const E_ALREADY_REGISTERED: u64 = 4;
    const E_INVALID_MILESTONE: u64 = 5;
    const E_ZERO_GOAL: u64 = 6;

    // ==================== Constants ====================
    const STATUS_PENDING: u8 = 0;
    const STATUS_ACTIVE: u8 = 1;
    const STATUS_FUNDED: u8 = 2;
    const STATUS_COMPLETED: u8 = 3;
    const STATUS_CANCELLED: u8 = 4;

    // ==================== Structs ====================
    
    /// Global registry that tracks all projects
    struct Registry has key {
        projects: vector<address>,
        project_count: u64,
        create_events: event::EventHandle<ProjectCreatedEvent>,
        update_events: event::EventHandle<ProjectUpdatedEvent>,
    }

    /// Individual project data stored at project's object address
    struct Project has key, store {
        id: u64,
        name: String,
        description: String,
        owner: address,
        website: String,
        github: String,
        funding_goal: u64,
        current_funding: u64,
        contributor_count: u64,
        status: u8,
        created_at: u64,
        updated_at: u64,
        milestones: vector<Milestone>,
        tags: vector<String>,
    }

    /// Milestone within a project
    struct Milestone has store, drop, copy {
        id: u64,
        title: String,
        description: String,
        target_amount: u64,
        completed: bool,
        votes_for: u64,
        votes_against: u64,
        deadline: u64,
    }

    // ==================== Events ====================
    
    struct ProjectCreatedEvent has drop, store {
        project_id: u64,
        project_address: address,
        owner: address,
        name: String,
        funding_goal: u64,
        timestamp: u64,
    }

    struct ProjectUpdatedEvent has drop, store {
        project_id: u64,
        project_address: address,
        new_status: u8,
        current_funding: u64,
        timestamp: u64,
    }

    // ==================== Initialization ====================
    
    /// Initialize the registry - called once on deployment
    fun init_module(admin: &signer) {
        move_to(admin, Registry {
            projects: vector::empty(),
            project_count: 0,
            create_events: event::new_event_handle<ProjectCreatedEvent>(admin),
            update_events: event::new_event_handle<ProjectUpdatedEvent>(admin),
        });
    }

    // ==================== Public Functions ====================

    /// Register a new project in the grants program
    public entry fun register_project(
        creator: &signer,
        name: String,
        description: String,
        website: String,
        github: String,
        funding_goal: u64,
        milestone_titles: vector<String>,
        milestone_descriptions: vector<String>,
        milestone_amounts: vector<u64>,
        milestone_deadlines: vector<u64>,
        tags: vector<String>,
    ) acquires Registry {
        let creator_addr = signer::address_of(creator);
        
        // Validate inputs
        assert!(funding_goal > 0, E_ZERO_GOAL);
        assert!(
            vector::length(&milestone_titles) == vector::length(&milestone_descriptions) &&
            vector::length(&milestone_titles) == vector::length(&milestone_amounts) &&
            vector::length(&milestone_titles) == vector::length(&milestone_deadlines),
            E_INVALID_MILESTONE
        );

        // Get registry and increment count
        let registry = borrow_global_mut<Registry>(@cedra_grants);
        let project_id = registry.project_count + 1;
        registry.project_count = project_id;

        // Build milestones
        let milestones = vector::empty<Milestone>();
        let i = 0;
        let len = vector::length(&milestone_titles);
        while (i < len) {
            vector::push_back(&mut milestones, Milestone {
                id: i + 1,
                title: *vector::borrow(&milestone_titles, i),
                description: *vector::borrow(&milestone_descriptions, i),
                target_amount: *vector::borrow(&milestone_amounts, i),
                completed: false,
                votes_for: 0,
                votes_against: 0,
                deadline: *vector::borrow(&milestone_deadlines, i),
            });
            i = i + 1;
        };

        // Create project object
        let constructor_ref = object::create_object(creator_addr);
        let object_signer = object::generate_signer(&constructor_ref);
        let project_address = signer::address_of(&object_signer);

        let now = timestamp::now_seconds();
        
        // Store project data
        move_to(&object_signer, Project {
            id: project_id,
            name,
            description,
            owner: creator_addr,
            website,
            github,
            funding_goal,
            current_funding: 0,
            contributor_count: 0,
            status: STATUS_PENDING,
            created_at: now,
            updated_at: now,
            milestones,
            tags,
        });

        // Track in registry
        vector::push_back(&mut registry.projects, project_address);

        // Emit event
        event::emit_event(&mut registry.create_events, ProjectCreatedEvent {
            project_id,
            project_address,
            owner: creator_addr,
            name: string::utf8(b"Project Created"),
            funding_goal,
            timestamp: now,
        });
    }

    /// Update project status (owner only)
    public entry fun update_status(
        owner: &signer,
        project_address: address,
        new_status: u8,
    ) acquires Project, Registry {
        let owner_addr = signer::address_of(owner);
        let project = borrow_global_mut<Project>(project_address);
        
        assert!(project.owner == owner_addr, E_NOT_OWNER);
        assert!(new_status <= STATUS_CANCELLED, E_INVALID_STATUS);
        
        project.status = new_status;
        project.updated_at = timestamp::now_seconds();

        // Emit update event
        let registry = borrow_global_mut<Registry>(@cedra_grants);
        event::emit_event(&mut registry.update_events, ProjectUpdatedEvent {
            project_id: project.id,
            project_address,
            new_status,
            current_funding: project.current_funding,
            timestamp: project.updated_at,
        });
    }

    /// Add funding to a project (called by quadratic_funding module)
    public(friend) fun add_funding(
        project_address: address,
        amount: u64,
    ) acquires Project {
        let project = borrow_global_mut<Project>(project_address);
        project.current_funding = project.current_funding + amount;
        project.contributor_count = project.contributor_count + 1;
        project.updated_at = timestamp::now_seconds();

        // Check if fully funded
        if (project.current_funding >= project.funding_goal) {
            project.status = STATUS_FUNDED;
        };
    }

    /// Mark a milestone as completed (requires voting - called by milestone_tracker)
    public(friend) fun complete_milestone(
        project_address: address,
        milestone_id: u64,
    ) acquires Project {
        let project = borrow_global_mut<Project>(project_address);
        let milestone = vector::borrow_mut(&mut project.milestones, milestone_id - 1);
        milestone.completed = true;
        project.updated_at = timestamp::now_seconds();
    }

    // ==================== View Functions ====================

    #[view]
    public fun get_project_count(): u64 acquires Registry {
        borrow_global<Registry>(@cedra_grants).project_count
    }

    #[view]
    public fun get_project(project_address: address): (
        u64, String, String, address, u64, u64, u8
    ) acquires Project {
        let project = borrow_global<Project>(project_address);
        (
            project.id,
            project.name,
            project.description,
            project.owner,
            project.funding_goal,
            project.current_funding,
            project.status,
        )
    }

    #[view]
    public fun get_milestones(project_address: address): vector<Milestone> acquires Project {
        borrow_global<Project>(project_address).milestones
    }

    #[view]
    public fun is_active(project_address: address): bool acquires Project {
        borrow_global<Project>(project_address).status == STATUS_ACTIVE
    }

    #[view]
    public fun get_all_projects(): vector<address> acquires Registry {
        borrow_global<Registry>(@cedra_grants).projects
    }
}
