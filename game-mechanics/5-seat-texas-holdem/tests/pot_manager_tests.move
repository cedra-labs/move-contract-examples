// ============================================
// Pot Manager Tests
// ============================================
// Tests for pot management, side pots, and distribution

#[test_only]
module holdemgame::pot_manager_tests {
    use holdemgame::pot_manager;

    #[test]
    fun test_new_pot_state() {
        let state = pot_manager::new(3);
        
        // Initial pot should be empty
        assert!(pot_manager::get_total_pot(&state) == 0, 1);
        assert!(pot_manager::get_max_current_bet(&state) == 0, 2);
    }

    #[test]
    fun test_add_bet_single_player() {
        let state = pot_manager::new(2);
        
        // Player 0 bets 100
        pot_manager::add_bet(&mut state, 0, 100);
        
        assert!(pot_manager::get_current_bet(&state, 0) == 100, 1);
        assert!(pot_manager::get_max_current_bet(&state) == 100, 2);
    }

    #[test]
    fun test_add_bet_multiple_players() {
        let state = pot_manager::new(3);
        
        // Player 0 bets 50, Player 1 bets 100, Player 2 bets 75
        pot_manager::add_bet(&mut state, 0, 50);
        pot_manager::add_bet(&mut state, 1, 100);
        pot_manager::add_bet(&mut state, 2, 75);
        
        assert!(pot_manager::get_current_bet(&state, 0) == 50, 1);
        assert!(pot_manager::get_current_bet(&state, 1) == 100, 2);
        assert!(pot_manager::get_current_bet(&state, 2) == 75, 3);
        assert!(pot_manager::get_max_current_bet(&state) == 100, 4);
    }

    #[test]
    fun test_get_call_amount() {
        let state = pot_manager::new(2);
        
        pot_manager::add_bet(&mut state, 0, 100);
        
        // Player 1 needs to call 100
        assert!(pot_manager::get_call_amount(&state, 1) == 100, 1);
        // Player 0 needs to call 0 (already at max)
        assert!(pot_manager::get_call_amount(&state, 0) == 0, 2);
    }

    #[test]
    fun test_collect_bets_no_side_pots() {
        let state = pot_manager::new(2);
        
        // Both players bet 100
        pot_manager::add_bet(&mut state, 0, 100);
        pot_manager::add_bet(&mut state, 1, 100);
        
        // Collect bets - all players non-folded
        let non_folded = vector[true, true];
        pot_manager::collect_bets(&mut state, &non_folded);
        
        // Total pot should be 200
        assert!(pot_manager::get_total_pot(&state) == 200, 1);
        // Current bets should be reset
        assert!(pot_manager::get_max_current_bet(&state) == 0, 2);
    }

    #[test]
    fun test_collect_bets_with_fold() {
        let state = pot_manager::new(3);
        
        // All players bet different amounts
        pot_manager::add_bet(&mut state, 0, 50);
        pot_manager::add_bet(&mut state, 1, 100);
        pot_manager::add_bet(&mut state, 2, 100);
        
        // Player 0 folded
        let non_folded = vector[false, true, true];
        pot_manager::collect_bets(&mut state, &non_folded);
        
        // Total pot should include all bets
        assert!(pot_manager::get_total_pot(&state) == 250, 1);
    }

    #[test]
    fun test_all_in_creates_side_pot() {
        let state = pot_manager::new(3);
        
        // Player 0 goes all-in for 50
        // Players 1 and 2 bet 100 each
        pot_manager::add_bet(&mut state, 0, 50);
        pot_manager::add_bet(&mut state, 1, 100);
        pot_manager::add_bet(&mut state, 2, 100);
        
        // Player 0 is all-in, players 1 and 2 are active
        // For eligibility, all non-folded (including all-in) are eligible
        let non_folded = vector[true, true, true];
        pot_manager::collect_bets(&mut state, &non_folded);
        
        // Total is 250, but there should be:
        // Main pot: 150 (50*3) - all 3 eligible
        // Side pot: 100 (50*2) - only players 1 and 2 eligible
        assert!(pot_manager::get_total_pot(&state) == 250, 1);
    }

    #[test]
    fun test_distribution_single_winner() {
        let state = pot_manager::new(2);
        
        pot_manager::add_bet(&mut state, 0, 100);
        pot_manager::add_bet(&mut state, 1, 100);
        
        let non_folded = vector[true, true];
        pot_manager::collect_bets(&mut state, &non_folded);
        
        // Player 0 has best hand
        let hand_rankings = vector[
            pot_manager::new_hand_ranking(5, 0), // flush
            pot_manager::new_hand_ranking(1, 0), // pair
        ];
        
        let active = vector[true, true];
        // dealer_hand_idx=0, num_players=2
        let distributions = pot_manager::calculate_distribution(&state, &hand_rankings, &active, 0, 2);
        
        // Player 0 should win entire pot
        assert!(std::vector::length(&distributions) == 1, 1);
        let dist = std::vector::borrow(&distributions, 0);
        assert!(pot_manager::get_distribution_player(dist) == 0, 2);
        assert!(pot_manager::get_distribution_amount(dist) == 200, 3);
    }

    #[test]
    fun test_distribution_split_pot() {
        let state = pot_manager::new(2);
        
        pot_manager::add_bet(&mut state, 0, 100);
        pot_manager::add_bet(&mut state, 1, 100);
        
        let non_folded = vector[true, true];
        pot_manager::collect_bets(&mut state, &non_folded);
        
        // Both players have the same hand
        let hand_rankings = vector[
            pot_manager::new_hand_ranking(5, 100), // flush with same tiebreaker
            pot_manager::new_hand_ranking(5, 100), // flush with same tiebreaker
        ];
        
        let active = vector[true, true];
        // dealer_hand_idx=0, num_players=2
        let distributions = pot_manager::calculate_distribution(&state, &hand_rankings, &active, 0, 2);
        
        // Both should split - 100 each
        assert!(std::vector::length(&distributions) == 2, 1);
        
        let dist0 = std::vector::borrow(&distributions, 0);
        let dist1 = std::vector::borrow(&distributions, 1);
        assert!(pot_manager::get_distribution_amount(dist0) == 100, 2);
        assert!(pot_manager::get_distribution_amount(dist1) == 100, 3);
    }
}
