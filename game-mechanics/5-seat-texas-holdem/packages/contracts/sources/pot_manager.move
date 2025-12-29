/// Pot Manager Module
/// 
/// Handles pot management for Texas Hold'em including main pot, side pots,
/// and pot distribution to winners.
module holdemgame::pot_manager {
    use std::vector;

    // ============================================
    // ERROR CODES
    // ============================================
    
    /// No pots to distribute
    const E_NO_POTS: u64 = 1;
    /// Invalid winner indices
    const E_INVALID_WINNERS: u64 = 2;

    // ============================================
    // DATA STRUCTURES
    // ============================================

    /// Hand ranking for pot distribution
    struct HandRanking has store, drop, copy {
        hand_type: u8,
        tiebreaker: u64,
    }

    /// Distribution entry (who gets how much)
    struct Distribution has store, drop, copy {
        player_idx: u64,
        amount: u64,
    }

    /// Represents a pot (main or side)
    struct Pot has store, drop, copy {
        /// Total chips in this pot
        amount: u64,
        /// Player indices eligible to win this pot
        eligible: vector<u64>,
    }

    /// Manages all pots for a hand
    struct PotState has store, drop, copy {
        /// All pots (index 0 = main pot, rest = side pots)
        pots: vector<Pot>,
        /// Current bets per player this betting round
        current_bets: vector<u64>,
        /// Total invested per player this hand
        total_invested: vector<u64>,
    }

    // ============================================
    // STRUCT CONSTRUCTORS
    // ============================================

    public fun new_hand_ranking(hand_type: u8, tiebreaker: u64): HandRanking {
        HandRanking { hand_type, tiebreaker }
    }

    public fun get_hand_type(ranking: &HandRanking): u8 {
        ranking.hand_type
    }

    public fun get_tiebreaker(ranking: &HandRanking): u64 {
        ranking.tiebreaker
    }

    public fun get_distribution_player(dist: &Distribution): u64 {
        dist.player_idx
    }

    public fun get_distribution_amount(dist: &Distribution): u64 {
        dist.amount
    }

    // ============================================
    // INITIALIZATION
    // ============================================

    /// Create a new pot state for a hand
    public fun new(num_players: u64): PotState {
        let current_bets = vector::empty<u64>();
        let total_invested = vector::empty<u64>();
        
        let i = 0u64;
        while (i < num_players) {
            vector::push_back(&mut current_bets, 0);
            vector::push_back(&mut total_invested, 0);
            i = i + 1;
        };
        
        PotState {
            pots: vector::empty<Pot>(),
            current_bets,
            total_invested,
        }
    }

    // ============================================
    // BETTING FUNCTIONS
    // ============================================

    /// Record a bet from a player
    public fun add_bet(state: &mut PotState, player_idx: u64, amount: u64) {
        let current = vector::borrow_mut(&mut state.current_bets, player_idx);
        *current = *current + amount;
        
        let total = vector::borrow_mut(&mut state.total_invested, player_idx);
        *total = *total + amount;
    }

    /// Get current bet amount for a player
    public fun get_current_bet(state: &PotState, player_idx: u64): u64 {
        *vector::borrow(&state.current_bets, player_idx)
    }

    /// Get highest bet in current round
    public fun get_max_current_bet(state: &PotState): u64 {
        let max = 0u64;
        let len = vector::length(&state.current_bets);
        let i = 0u64;
        while (i < len) {
            let bet = *vector::borrow(&state.current_bets, i);
            if (bet > max) {
                max = bet;
            };
            i = i + 1;
        };
        max
    }

    /// Get amount needed to call for a player
    public fun get_call_amount(state: &PotState, player_idx: u64): u64 {
        let max_bet = get_max_current_bet(state);
        let current = *vector::borrow(&state.current_bets, player_idx);
        if (max_bet > current) {
            max_bet - current
        } else {
            0
        }
    }

    /// Get all current bets as a vector
    public fun get_current_bets(state: &PotState): vector<u64> {
        state.current_bets
    }

    /// Get all total invested amounts as a vector
    public fun get_total_invested(state: &PotState): vector<u64> {
        state.total_invested
    }

    // ============================================
    // POT COLLECTION
    // ============================================

    /// Collect all current bets into pots at the end of a betting round
    /// 
    /// # Arguments
    /// * `state` - The pot state
    /// * `non_folded_players` - Bitmask of players still in hand (not folded) - includes ACTIVE and ALL_IN
    public fun collect_bets(
        state: &mut PotState,
        non_folded_players: &vector<bool>,
    ) {
        let num_players = vector::length(&state.current_bets);
        let bet_levels = get_sorted_unique_bets(&state.current_bets, non_folded_players);
        
        if (vector::length(&bet_levels) == 0) {
            reset_current_bets(state);
            return
        };
        
        let prev_level = 0u64;
        let level_idx = 0u64;
        
        while (level_idx < vector::length(&bet_levels)) {
            let current_level = *vector::borrow(&bet_levels, level_idx);
            let increment = current_level - prev_level;
            
            if (increment > 0) {
                let pot_amount = 0u64;
                let eligible = vector::empty<u64>();
                
                let p = 0u64;
                while (p < num_players) {
                    let player_bet = *vector::borrow(&state.current_bets, p);
                    let is_non_folded = *vector::borrow(non_folded_players, p);
                    
                    if (player_bet >= current_level) {
                        pot_amount = pot_amount + increment;
                        // Player is eligible if they haven't folded (could be ACTIVE or ALL_IN)
                        if (is_non_folded) {
                            vector::push_back(&mut eligible, p);
                        };
                    };
                    p = p + 1;
                };
                
                let merged = false;
                let pot_idx = 0u64;
                while (pot_idx < vector::length(&state.pots)) {
                    let pot = vector::borrow_mut(&mut state.pots, pot_idx);
                    if (vectors_equal(&pot.eligible, &eligible)) {
                        pot.amount = pot.amount + pot_amount;
                        merged = true;
                        break
                    };
                    pot_idx = pot_idx + 1;
                };
                
                if (!merged && pot_amount > 0 && vector::length(&eligible) > 0) {
                    vector::push_back(&mut state.pots, Pot {
                        amount: pot_amount,
                        eligible,
                    });
                };
            };
            
            prev_level = current_level;
            level_idx = level_idx + 1;
        };
        
        reset_current_bets(state);
    }

    fun reset_current_bets(state: &mut PotState) {
        let len = vector::length(&state.current_bets);
        let i = 0u64;
        while (i < len) {
            *vector::borrow_mut(&mut state.current_bets, i) = 0;
            i = i + 1;
        };
    }

    fun get_sorted_unique_bets(bets: &vector<u64>, active: &vector<bool>): vector<u64> {
        let unique = vector::empty<u64>();
        let len = vector::length(bets);
        
        let i = 0u64;
        while (i < len) {
            let bet = *vector::borrow(bets, i);
            let is_active = *vector::borrow(active, i);
            if (bet > 0 && (is_active || bet > 0)) {
                if (!vector::contains(&unique, &bet)) {
                    vector::push_back(&mut unique, bet);
                };
            };
            i = i + 1;
        };
        
        // Sort ascending
        let n = vector::length(&unique);
        let i = 0u64;
        while (i < n) {
            let j = i + 1;
            while (j < n) {
                if (*vector::borrow(&unique, j) < *vector::borrow(&unique, i)) {
                    vector::swap(&mut unique, i, j);
                };
                j = j + 1;
            };
            i = i + 1;
        };
        
        unique
    }

    fun vectors_equal(a: &vector<u64>, b: &vector<u64>): bool {
        if (vector::length(a) != vector::length(b)) {
            return false
        };
        let len = vector::length(a);
        let i = 0u64;
        while (i < len) {
            if (*vector::borrow(a, i) != *vector::borrow(b, i)) {
                return false
            };
            i = i + 1;
        };
        true
    }

    // ============================================
    // POT DISTRIBUTION
    // ============================================

    /// Calculate pot distribution based on winners
    /// 
    /// Odd chips from split pots go to the winner closest to dealer's left (first to act)
    public fun calculate_distribution(
        state: &PotState,
        hand_rankings: &vector<HandRanking>,
        active_players: &vector<bool>,
        dealer_hand_idx: u64,
        num_players: u64
    ): vector<Distribution> {
        let distributions = vector::empty<Distribution>();
        
        let pot_idx = 0u64;
        while (pot_idx < vector::length(&state.pots)) {
            let pot = vector::borrow(&state.pots, pot_idx);
            let eligible_and_active = get_eligible_active(&pot.eligible, active_players);
            
            if (vector::length(&eligible_and_active) > 0) {
                let winners = find_pot_winners(&eligible_and_active, hand_rankings);
                let num_winners = vector::length(&winners);
                
                if (num_winners > 0) {
                    let share = pot.amount / num_winners;
                    let remainder = pot.amount % num_winners;
                    
                    // Find who gets the odd chip (first to act among winners)
                    let odd_chip_winner_idx = find_first_to_act(&winners, dealer_hand_idx, num_players);
                    
                    let w = 0u64;
                    while (w < num_winners) {
                        let winner_idx = *vector::borrow(&winners, w);
                        let amount = share;
                        if (w == odd_chip_winner_idx) {
                            amount = amount + remainder;
                        };
                        add_to_distribution(&mut distributions, winner_idx, amount);
                        w = w + 1;
                    };
                };
            };
            
            pot_idx = pot_idx + 1;
        };
        
        distributions
    }

    fun get_eligible_active(eligible: &vector<u64>, active: &vector<bool>): vector<u64> {
        let result = vector::empty<u64>();
        let len = vector::length(eligible);
        let i = 0u64;
        while (i < len) {
            let player_idx = *vector::borrow(eligible, i);
            if (*vector::borrow(active, player_idx)) {
                vector::push_back(&mut result, player_idx);
            };
            i = i + 1;
        };
        result
    }

    fun find_pot_winners(
        players: &vector<u64>,
        hand_rankings: &vector<HandRanking>
    ): vector<u64> {
        let winners = vector::empty<u64>();
        let best_type = 0u8;
        let best_tiebreaker = 0u64;
        
        let i = 0u64;
        while (i < vector::length(players)) {
            let player_idx = *vector::borrow(players, i);
            let ranking = vector::borrow(hand_rankings, player_idx);
            
            if (ranking.hand_type > best_type || 
                (ranking.hand_type == best_type && ranking.tiebreaker > best_tiebreaker)) {
                winners = vector::singleton(player_idx);
                best_type = ranking.hand_type;
                best_tiebreaker = ranking.tiebreaker;
            } else if (ranking.hand_type == best_type && ranking.tiebreaker == best_tiebreaker) {
                vector::push_back(&mut winners, player_idx);
            };
            i = i + 1;
        };
        
        winners
    }

    /// Find the index within winners vector of the player closest to dealer's left (first to act)
    /// This player receives the odd chip in split pot scenarios per casino rules
    fun find_first_to_act(winners: &vector<u64>, dealer_idx: u64, num_players: u64): u64 {
        let best_winner_vec_idx = 0u64;
        let best_distance = num_players + 1;
        
        let w = 0u64;
        while (w < vector::length(winners)) {
            let player_idx = *vector::borrow(winners, w);
            // Distance from dealer going clockwise (left of dealer = 1, etc.)
            let distance = if (player_idx > dealer_idx) {
                player_idx - dealer_idx
            } else {
                num_players - dealer_idx + player_idx
            };
            if (distance < best_distance) {
                best_distance = distance;
                best_winner_vec_idx = w;
            };
            w = w + 1;
        };
        best_winner_vec_idx
    }

    fun add_to_distribution(
        distributions: &mut vector<Distribution>,
        player_idx: u64,
        amount: u64
    ) {
        let len = vector::length(distributions);
        let i = 0u64;
        while (i < len) {
            let dist = vector::borrow_mut(distributions, i);
            if (dist.player_idx == player_idx) {
                dist.amount = dist.amount + amount;
                return
            };
            i = i + 1;
        };
        vector::push_back(distributions, Distribution { player_idx, amount });
    }

    // ============================================
    // VIEW FUNCTIONS
    // ============================================

    public fun get_total_pot(state: &PotState): u64 {
        let total = 0u64;
        let i = 0u64;
        while (i < vector::length(&state.pots)) {
            total = total + vector::borrow(&state.pots, i).amount;
            i = i + 1;
        };
        
        let j = 0u64;
        while (j < vector::length(&state.current_bets)) {
            total = total + *vector::borrow(&state.current_bets, j);
            j = j + 1;
        };
        
        total
    }

    public fun get_num_pots(state: &PotState): u64 {
        vector::length(&state.pots)
    }

    public fun get_pot_amount(state: &PotState, idx: u64): u64 {
        if (idx < vector::length(&state.pots)) {
            vector::borrow(&state.pots, idx).amount
        } else {
            0
        }
    }

    public fun get_pot_eligible(state: &PotState, idx: u64): vector<u64> {
        if (idx < vector::length(&state.pots)) {
            vector::borrow(&state.pots, idx).eligible
        } else {
            vector::empty()
        }
    }

    public fun get_total_invested_by_player(state: &PotState, player_idx: u64): u64 {
        *vector::borrow(&state.total_invested, player_idx)
    }

    #[test_only]
    public fun create_test_pot_state(): PotState {
        new(5)
    }
}
