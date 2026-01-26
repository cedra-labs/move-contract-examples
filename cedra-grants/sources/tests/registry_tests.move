/// CedraGrants Registry Module Tests
/// Tests for project registration, status updates, and milestone tracking
#[test_only]
module cedra_grants::registry_tests {
    use std::string;
    use std::vector;
    use std::signer;
    use cedra_framework::timestamp;
    use cedra_framework::account;
    use cedra_grants::registry;

    // Test addresses
    const ADMIN: address = @cedra_grants;
    const PROJECT_OWNER: address = @0x123;

    // ==================== Setup Helpers ====================

    fun setup_test(admin: &signer, owner: &signer) {
        // Create test accounts
        account::create_account_for_test(signer::address_of(admin));
        account::create_account_for_test(signer::address_of(owner));
        
        // Set timestamp
        timestamp::set_time_has_started_for_testing(admin);
        timestamp::update_global_time_for_test(1704067200000000); // Jan 1, 2024
    }

    // ==================== Registration Tests ====================

    #[test(admin = @cedra_grants, owner = @0x123)]
    fun test_register_project_success(admin: &signer, owner: &signer) {
        setup_test(admin, owner);

        // Create milestone data
        let milestone_titles = vector[
            string::utf8(b"MVP Launch"),
            string::utf8(b"Beta Release"),
        ];
        let milestone_descriptions = vector[
            string::utf8(b"Initial product launch"),
            string::utf8(b"Full feature release"),
        ];
        let milestone_amounts = vector[5000u64, 10000u64];
        let milestone_deadlines = vector[1706745600u64, 1709424000u64]; // Feb, March 2024

        // Register project
        registry::register_project(
            owner,
            string::utf8(b"Test Project"),
            string::utf8(b"A test project for CedraGrants"),
            string::utf8(b"https://test.com"),
            string::utf8(b"https://github.com/test"),
            15000, // funding goal
            milestone_titles,
            milestone_descriptions,
            milestone_amounts,
            milestone_deadlines,
            vector[string::utf8(b"defi"), string::utf8(b"infrastructure")],
        );

        // Verify project count
        assert!(registry::get_project_count() == 1, 0);
    }

    #[test(admin = @cedra_grants, owner = @0x123)]
    #[expected_failure(abort_code = 6)] // E_ZERO_GOAL
    fun test_register_project_zero_goal_fails(admin: &signer, owner: &signer) {
        setup_test(admin, owner);

        registry::register_project(
            owner,
            string::utf8(b"Test"),
            string::utf8(b"Desc"),
            string::utf8(b"url"),
            string::utf8(b"github"),
            0, // zero goal should fail
            vector::empty(),
            vector::empty(),
            vector::empty(),
            vector::empty(),
            vector::empty(),
        );
    }

    #[test(admin = @cedra_grants, owner = @0x123)]
    #[expected_failure(abort_code = 5)] // E_INVALID_MILESTONE
    fun test_register_mismatched_milestones_fails(admin: &signer, owner: &signer) {
        setup_test(admin, owner);

        // Mismatched milestone vectors
        registry::register_project(
            owner,
            string::utf8(b"Test"),
            string::utf8(b"Desc"),
            string::utf8(b"url"),
            string::utf8(b"github"),
            1000,
            vector[string::utf8(b"Milestone 1")], // 1 title
            vector::empty(), // 0 descriptions - mismatch!
            vector::empty(),
            vector::empty(),
            vector::empty(),
        );
    }

    // ==================== View Function Tests ====================

    #[test(admin = @cedra_grants)]
    fun test_get_project_count_initially_zero(admin: &signer) {
        account::create_account_for_test(signer::address_of(admin));
        assert!(registry::get_project_count() == 0, 0);
    }

    #[test(admin = @cedra_grants)]
    fun test_get_all_projects_initially_empty(admin: &signer) {
        account::create_account_for_test(signer::address_of(admin));
        let projects = registry::get_all_projects();
        assert!(vector::length(&projects) == 0, 0);
    }
}
