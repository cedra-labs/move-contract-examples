/// Poker Hand Evaluation Module
/// 
/// Evaluates 7-card poker hands (2 hole + 5 community) and finds the best 5-card hand.
/// Supports all 10 standard poker hand rankings from High Card to Royal Flush.
module holdemgame::hand_eval {
    use std::vector;

    // ============================================
    // HAND RANKINGS (Higher = Better)
    // ============================================
    
    const HAND_HIGH_CARD: u8 = 0;
    const HAND_ONE_PAIR: u8 = 1;
    const HAND_TWO_PAIR: u8 = 2;
    const HAND_THREE_OF_A_KIND: u8 = 3;
    const HAND_STRAIGHT: u8 = 4;
    const HAND_FLUSH: u8 = 5;
    const HAND_FULL_HOUSE: u8 = 6;
    const HAND_FOUR_OF_A_KIND: u8 = 7;
    const HAND_STRAIGHT_FLUSH: u8 = 8;
    const HAND_ROYAL_FLUSH: u8 = 9;

    // ============================================
    // CARD UTILITIES
    // ============================================
    
    /// Card representation: 0-51
    /// Rank = card % 13 (0=2, 1=3, ..., 8=10, 9=J, 10=Q, 11=K, 12=A)
    /// Suit = card / 13 (0=Clubs, 1=Diamonds, 2=Hearts, 3=Spades)
    
    /// Get the rank of a card (0-12, where 12 = Ace)
    public fun get_rank(card: u8): u8 {
        card % 13
    }
    
    /// Get the suit of a card (0-3)
    public fun get_suit(card: u8): u8 {
        card / 13
    }

    // ============================================
    // MAIN EVALUATION FUNCTION
    // ============================================

    /// Evaluate the best 5-card hand from 7 cards
    /// 
    /// Returns (hand_type, tiebreaker) where:
    /// - hand_type: 0-9 representing the hand ranking
    /// - tiebreaker: encoded value for comparing same hand types
    ///
    /// The tiebreaker encodes the relevant card ranks in order of importance.
    public fun evaluate_hand(cards: vector<u8>): (u8, u64) {
        // Count ranks and suits
        let rank_counts = count_ranks(&cards);
        let suit_counts = count_suits(&cards);
        
        // Check for flush (5+ cards of same suit)
        let (has_flush, flush_suit) = find_flush(&suit_counts);
        
        // Get flush cards if we have a flush
        let flush_cards = if (has_flush) {
            get_cards_of_suit(&cards, flush_suit)
        } else {
            vector::empty()
        };
        
        // Check for straight flush first (best hands)
        if (has_flush && vector::length(&flush_cards) >= 5) {
            let (has_straight, high_card) = find_straight_in_cards(&flush_cards);
            if (has_straight) {
                if (high_card == 12) {
                    // Royal Flush (Ace-high straight flush)
                    return (HAND_ROYAL_FLUSH, 0)
                } else {
                    // Straight Flush
                    return (HAND_STRAIGHT_FLUSH, (high_card as u64))
                }
            }
        };
        
        // Check for four of a kind
        let (has_quads, quad_rank) = find_n_of_a_kind(&rank_counts, 4);
        if (has_quads) {
            let kicker = find_highest_kicker(&rank_counts, quad_rank, 255);
            return (HAND_FOUR_OF_A_KIND, encode_tiebreaker_2(quad_rank, kicker))
        };
        
        // Check for full house
        let (has_trips, trip_rank) = find_n_of_a_kind(&rank_counts, 3);
        if (has_trips) {
            let (has_pair, pair_rank) = find_pair_excluding(&rank_counts, trip_rank);
            if (has_pair) {
                return (HAND_FULL_HOUSE, encode_tiebreaker_2(trip_rank, pair_rank))
            }
        };
        
        // Check for flush
        if (has_flush) {
            let tiebreaker = encode_top_5_ranks(&flush_cards);
            return (HAND_FLUSH, tiebreaker)
        };
        
        // Check for straight
        let (has_straight, straight_high) = find_straight(&rank_counts);
        if (has_straight) {
            return (HAND_STRAIGHT, (straight_high as u64))
        };
        
        // Three of a kind (no full house)
        if (has_trips) {
            let kickers = find_top_kickers(&rank_counts, trip_rank, 255, 2);
            return (HAND_THREE_OF_A_KIND, encode_tiebreaker_3(trip_rank, kickers))
        };
        
        // Check for pairs
        let (has_pair, pair_rank) = find_n_of_a_kind(&rank_counts, 2);
        if (has_pair) {
            let (has_second_pair, second_pair_rank) = find_pair_excluding(&rank_counts, pair_rank);
            if (has_second_pair) {
                // Two pair
                let high_pair = if (pair_rank > second_pair_rank) pair_rank else second_pair_rank;
                let low_pair = if (pair_rank > second_pair_rank) second_pair_rank else pair_rank;
                let kicker = find_highest_kicker(&rank_counts, high_pair, low_pair);
                return (HAND_TWO_PAIR, encode_tiebreaker_3(high_pair, vector[low_pair, kicker]))
            } else {
                // One pair
                let kickers = find_top_kickers(&rank_counts, pair_rank, 255, 3);
                return (HAND_ONE_PAIR, encode_tiebreaker_4(pair_rank, kickers))
            }
        };
        
        // High card
        let high_cards = find_top_n_ranks(&rank_counts, 5);
        (HAND_HIGH_CARD, encode_ranks_as_tiebreaker(&high_cards))
    }

    /// Compare two evaluated hands
    /// Returns: 1 if hand1 wins, 2 if hand2 wins, 0 if tie
    public fun compare_hands(type1: u8, tb1: u64, type2: u8, tb2: u64): u8 {
        if (type1 > type2) {
            1
        } else if (type2 > type1) {
            2
        } else if (tb1 > tb2) {
            1
        } else if (tb2 > tb1) {
            2
        } else {
            0
        }
    }

    // ============================================
    // HELPER FUNCTIONS
    // ============================================

    /// Count occurrences of each rank (returns array of 13 counts)
    fun count_ranks(cards: &vector<u8>): vector<u8> {
        let counts = vector::empty<u8>();
        let i = 0u8;
        while (i < 13) {
            vector::push_back(&mut counts, 0);
            i = i + 1;
        };
        
        let len = vector::length(cards);
        let j = 0u64;
        while (j < len) {
            let rank = get_rank(*vector::borrow(cards, j));
            let count = vector::borrow_mut(&mut counts, (rank as u64));
            *count = *count + 1;
            j = j + 1;
        };
        
        counts
    }

    /// Count occurrences of each suit (returns array of 4 counts)
    fun count_suits(cards: &vector<u8>): vector<u8> {
        let counts = vector::empty<u8>();
        let i = 0u8;
        while (i < 4) {
            vector::push_back(&mut counts, 0);
            i = i + 1;
        };
        
        let len = vector::length(cards);
        let j = 0u64;
        while (j < len) {
            let suit = get_suit(*vector::borrow(cards, j));
            let count = vector::borrow_mut(&mut counts, (suit as u64));
            *count = *count + 1;
            j = j + 1;
        };
        
        counts
    }

    /// Find if there's a flush (5+ cards of same suit)
    fun find_flush(suit_counts: &vector<u8>): (bool, u8) {
        let i = 0u8;
        while ((i as u64) < 4) {
            if (*vector::borrow(suit_counts, (i as u64)) >= 5) {
                return (true, i)
            };
            i = i + 1;
        };
        (false, 0)
    }

    /// Get all cards of a specific suit
    fun get_cards_of_suit(cards: &vector<u8>, suit: u8): vector<u8> {
        let result = vector::empty<u8>();
        let len = vector::length(cards);
        let i = 0u64;
        while (i < len) {
            let card = *vector::borrow(cards, i);
            if (get_suit(card) == suit) {
                vector::push_back(&mut result, card);
            };
            i = i + 1;
        };
        result
    }

    /// Find a straight in the rank counts
    /// Returns (has_straight, high_card_rank)
    fun find_straight(rank_counts: &vector<u8>): (bool, u8) {
        // Check wheel (A-2-3-4-5)
        if (*vector::borrow(rank_counts, 12) >= 1 && // Ace
            *vector::borrow(rank_counts, 0) >= 1 &&  // 2
            *vector::borrow(rank_counts, 1) >= 1 &&  // 3
            *vector::borrow(rank_counts, 2) >= 1 &&  // 4
            *vector::borrow(rank_counts, 3) >= 1) {  // 5
            return (true, 3) // 5-high straight
        };
        
        // Check regular straights (highest first)
        // For a straight starting at 'low' and going to 'high', we need:
        // high = low + 4, so low ranges from 0 to 8 (straights up to A-high)
        let high = 12u8;
        while (high >= 4) {
            // Check if we have 5 consecutive cards ending at 'high'
            let low = high - 4;
            let consecutive = true;
            let rank = low;
            while (rank <= high) {
                if (*vector::borrow(rank_counts, (rank as u64)) == 0) {
                    consecutive = false;
                };
                rank = rank + 1;
            };
            if (consecutive) {
                return (true, high)
            };
            if (high == 4) { break };
            high = high - 1;
        };
        
        (false, 0)
    }

    /// Find a straight within specific cards (for straight flush)
    fun find_straight_in_cards(cards: &vector<u8>): (bool, u8) {
        let rank_counts = count_ranks(cards);
        find_straight(&rank_counts)
    }

    /// Find n-of-a-kind (returns highest rank with n cards)
    fun find_n_of_a_kind(rank_counts: &vector<u8>, n: u8): (bool, u8) {
        let rank = 12u8;
        loop {
            if (*vector::borrow(rank_counts, (rank as u64)) >= n) {
                return (true, rank)
            };
            if (rank == 0) { break };
            rank = rank - 1;
        };
        (false, 0)
    }

    /// Find a pair excluding a specific rank
    fun find_pair_excluding(rank_counts: &vector<u8>, exclude_rank: u8): (bool, u8) {
        let rank = 12u8;
        loop {
            if (rank != exclude_rank && *vector::borrow(rank_counts, (rank as u64)) >= 2) {
                return (true, rank)
            };
            if (rank == 0) { break };
            rank = rank - 1;
        };
        (false, 0)
    }

    /// Find the highest kicker excluding up to 2 ranks
    fun find_highest_kicker(rank_counts: &vector<u8>, exclude1: u8, exclude2: u8): u8 {
        let rank = 12u8;
        loop {
            if (rank != exclude1 && rank != exclude2 && 
                *vector::borrow(rank_counts, (rank as u64)) >= 1) {
                return rank
            };
            if (rank == 0) { break };
            rank = rank - 1;
        };
        0
    }

    /// Find top n kickers excluding up to 2 ranks
    fun find_top_kickers(rank_counts: &vector<u8>, exclude1: u8, exclude2: u8, n: u64): vector<u8> {
        let kickers = vector::empty<u8>();
        let rank = 12u8;
        loop {
            if (vector::length(&kickers) >= n) { break };
            if (rank != exclude1 && rank != exclude2 && 
                *vector::borrow(rank_counts, (rank as u64)) >= 1) {
                vector::push_back(&mut kickers, rank);
            };
            if (rank == 0) { break };
            rank = rank - 1;
        };
        kickers
    }

    /// Find top n ranks from rank counts
    fun find_top_n_ranks(rank_counts: &vector<u8>, n: u64): vector<u8> {
        let ranks = vector::empty<u8>();
        let rank = 12u8;
        loop {
            if (vector::length(&ranks) >= n) { break };
            let count = *vector::borrow(rank_counts, (rank as u64));
            let added = 0u8;
            while ((added as u64) < (count as u64) && vector::length(&ranks) < n) {
                vector::push_back(&mut ranks, rank);
                added = added + 1;
            };
            if (rank == 0) { break };
            rank = rank - 1;
        };
        ranks
    }

    /// Encode top 5 card ranks from cards
    fun encode_top_5_ranks(cards: &vector<u8>): u64 {
        let rank_counts = count_ranks(cards);
        let top5 = find_top_n_ranks(&rank_counts, 5);
        encode_ranks_as_tiebreaker(&top5)
    }

    // ============================================
    // TIEBREAKER ENCODING
    // ============================================

    /// Encode 2 values into tiebreaker
    fun encode_tiebreaker_2(v1: u8, v2: u8): u64 {
        ((v1 as u64) << 8) | (v2 as u64)
    }

    /// Encode primary rank + 2 kickers
    fun encode_tiebreaker_3(primary: u8, kickers: vector<u8>): u64 {
        let result = (primary as u64) << 16;
        if (vector::length(&kickers) >= 1) {
            result = result | ((*vector::borrow(&kickers, 0) as u64) << 8);
        };
        if (vector::length(&kickers) >= 2) {
            result = result | (*vector::borrow(&kickers, 1) as u64);
        };
        result
    }

    /// Encode primary rank + 3 kickers
    fun encode_tiebreaker_4(primary: u8, kickers: vector<u8>): u64 {
        let result = (primary as u64) << 24;
        if (vector::length(&kickers) >= 1) {
            result = result | ((*vector::borrow(&kickers, 0) as u64) << 16);
        };
        if (vector::length(&kickers) >= 2) {
            result = result | ((*vector::borrow(&kickers, 1) as u64) << 8);
        };
        if (vector::length(&kickers) >= 3) {
            result = result | (*vector::borrow(&kickers, 2) as u64);
        };
        result
    }

    /// Encode up to 5 ranks as tiebreaker
    fun encode_ranks_as_tiebreaker(ranks: &vector<u8>): u64 {
        let result = 0u64;
        let len = vector::length(ranks);
        let i = 0u64;
        while (i < len && i < 5) {
            result = (result << 8) | (*vector::borrow(ranks, i) as u64);
            i = i + 1;
        };
        result
    }

    // ============================================
    // VIEW FUNCTIONS FOR TESTING
    // ============================================

    #[view]
    /// Get hand type name
    public fun hand_type_name(hand_type: u8): vector<u8> {
        if (hand_type == HAND_ROYAL_FLUSH) { b"Royal Flush" }
        else if (hand_type == HAND_STRAIGHT_FLUSH) { b"Straight Flush" }
        else if (hand_type == HAND_FOUR_OF_A_KIND) { b"Four of a Kind" }
        else if (hand_type == HAND_FULL_HOUSE) { b"Full House" }
        else if (hand_type == HAND_FLUSH) { b"Flush" }
        else if (hand_type == HAND_STRAIGHT) { b"Straight" }
        else if (hand_type == HAND_THREE_OF_A_KIND) { b"Three of a Kind" }
        else if (hand_type == HAND_TWO_PAIR) { b"Two Pair" }
        else if (hand_type == HAND_ONE_PAIR) { b"One Pair" }
        else { b"High Card" }
    }

    // ============================================
    // TEST HELPERS
    // ============================================

    #[test_only]
    /// Create a card from rank and suit
    public fun make_card(rank: u8, suit: u8): u8 {
        suit * 13 + rank
    }
}
