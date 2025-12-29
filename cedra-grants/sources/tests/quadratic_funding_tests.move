/// CedraGrants Quadratic Funding Module Tests
/// Tests for funding rounds, contributions, and QF matching calculation
#[test_only]
module cedra_grants::quadratic_funding_tests {
    use std::vector;
    use std::signer;
    use cedra_framework::timestamp;
    use cedra_framework::account;
    use cedra_framework::coin;
    use cedra_framework::cedra_coin::CedraCoin;
    use cedra_grants::quadratic_funding;

    // ==================== Math Tests ====================

    #[test]
    fun test_qf_score_single_donor() {
        // Single donor of 100 tokens
        // QF Score = (√100)² = 100
        let contributions = vector[100u64];
        let score = quadratic_funding::get_project_qf_score(contributions);
        // With precision, should be approximately 100
        assert!(score > 95 && score < 105, 0);
    }

    #[test]
    fun test_qf_score_multiple_donors_amplification() {
        // 10 donors of 10 tokens each = 100 total
        // QF Score = (10 × √10)² = (10 × 3.16)² = 31.6² ≈ 1000
        // This is 10x more than a single donor of 100!
        let contributions = vector[10u64, 10, 10, 10, 10, 10, 10, 10, 10, 10];
        let multi_score = quadratic_funding::get_project_qf_score(contributions);

        let single = vector[100u64];
        let single_score = quadratic_funding::get_project_qf_score(single);

        // Multi-donor should be significantly higher
        assert!(multi_score > single_score * 5, 0); // At least 5x
    }

    #[test]
    fun test_qf_score_empty_contributions() {
        let contributions = vector::empty<u64>();
        let score = quadratic_funding::get_project_qf_score(contributions);
        assert!(score == 0, 0);
    }

    #[test]
    fun test_qf_score_single_small_contribution() {
        let contributions = vector[1u64];
        let score = quadratic_funding::get_project_qf_score(contributions);
        // √1 = 1, 1² = 1
        assert!(score >= 1, 0);
    }

    #[test]
    fun test_qf_score_large_contribution() {
        // 1 million tokens from single donor
        // QF Score = (√1000000)² = 1000000
        let contributions = vector[1000000u64];
        let score = quadratic_funding::get_project_qf_score(contributions);
        assert!(score > 900000 && score < 1100000, 0);
    }

    #[test]
    fun test_qf_demonstrates_quadratic_property() {
        // The key insight: many small donors beat few large donors
        
        // Scenario A: 4 donors give 25 each (100 total)
        // QF = (4 × √25)² = (4 × 5)² = 400
        let scenario_a = vector[25u64, 25, 25, 25];
        let score_a = quadratic_funding::get_project_qf_score(scenario_a);

        // Scenario B: 1 donor gives 100
        // QF = (√100)² = 100
        let scenario_b = vector[100u64];
        let score_b = quadratic_funding::get_project_qf_score(scenario_b);

        // Same total contribution, but A gets 4x more matching!
        assert!(score_a > score_b * 3, 0); // At least 3x more
    }

    // ==================== Round Count Tests ====================

    #[test(admin = @cedra_grants)]
    fun test_initial_round_count_zero(admin: &signer) {
        account::create_account_for_test(signer::address_of(admin));
        assert!(quadratic_funding::get_round_count() == 0, 0);
    }
}
