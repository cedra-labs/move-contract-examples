// Hand Evaluation Tests
// Tests for all 10 poker hand types and comparison logic
#[test_only]
module holdemgame::hand_eval_tests {
    use holdemgame::hand_eval;

    // Helper to create a card
    // rank: 0=2, 1=3, ..., 8=10, 9=J, 10=Q, 11=K, 12=Ace
    // suit: 0=clubs(c), 1=diamonds(d), 2=hearts(h), 3=spades(s)
    fun make_card(rank: u8, suit: u8): u8 {
        suit * 13 + rank
    }

    #[test]
    fun test_high_card() {
        // Cards: 2c, 5d, 7h, 9s, Jc, Kd, Ah (no pair, no straight, no flush)
        let cards = vector[
            make_card(0, 0),   // 2c
            make_card(3, 1),   // 5d
            make_card(5, 2),   // 7h
            make_card(7, 3),   // 9s
            make_card(9, 0),   // Jc
            make_card(11, 1),  // Kd
            make_card(12, 2),  // Ah
        ];
        
        let (hand_type, _) = hand_eval::evaluate_hand(cards);
        assert!(hand_type == 0, 1); // HIGH_CARD
    }

    #[test]
    fun test_one_pair() {
        // Cards: 2c, 2d, 5h, 7s, 9c, Jd, Kh
        let cards = vector[
            make_card(0, 0),   // 2c
            make_card(0, 1),   // 2d
            make_card(3, 2),   // 5h
            make_card(5, 3),   // 7s
            make_card(7, 0),   // 9c
            make_card(9, 1),   // Jd
            make_card(11, 2),  // Kh
        ];
        
        let (hand_type, _) = hand_eval::evaluate_hand(cards);
        assert!(hand_type == 1, 1); // ONE_PAIR
    }

    #[test]
    fun test_two_pair() {
        // Cards: 2c, 2d, 5h, 5s, 9c, Jd, Kh
        let cards = vector[
            make_card(0, 0),   // 2c
            make_card(0, 1),   // 2d
            make_card(3, 2),   // 5h
            make_card(3, 3),   // 5s
            make_card(7, 0),   // 9c
            make_card(9, 1),   // Jd
            make_card(11, 2),  // Kh
        ];
        
        let (hand_type, _) = hand_eval::evaluate_hand(cards);
        assert!(hand_type == 2, 1); // TWO_PAIR
    }

    #[test]
    fun test_three_of_a_kind() {
        // Cards: 5c, 5d, 5h, 7s, 9c, Jd, Kh
        let cards = vector[
            make_card(3, 0),   // 5c
            make_card(3, 1),   // 5d
            make_card(3, 2),   // 5h
            make_card(5, 3),   // 7s
            make_card(7, 0),   // 9c
            make_card(9, 1),   // Jd
            make_card(11, 2),  // Kh
        ];
        
        let (hand_type, _) = hand_eval::evaluate_hand(cards);
        assert!(hand_type == 3, 1); // THREE_OF_A_KIND
    }

    #[test]
    fun test_straight() {
        // Cards: 4c, 5d, 6h, 7s, 8c, Jd, Kh
        let cards = vector[
            make_card(2, 0),   // 4c
            make_card(3, 1),   // 5d
            make_card(4, 2),   // 6h
            make_card(5, 3),   // 7s
            make_card(6, 0),   // 8c
            make_card(9, 1),   // Jd
            make_card(11, 2),  // Kh
        ];
        
        let (hand_type, _) = hand_eval::evaluate_hand(cards);
        assert!(hand_type == 4, 1); // STRAIGHT
    }

    #[test]
    fun test_flush() {
        // Cards: 2h, 5h, 7h, 9h, Jh, Kd, Ac
        let cards = vector[
            make_card(0, 2),   // 2h
            make_card(3, 2),   // 5h
            make_card(5, 2),   // 7h
            make_card(7, 2),   // 9h
            make_card(9, 2),   // Jh
            make_card(11, 1),  // Kd
            make_card(12, 0),  // Ac
        ];
        
        let (hand_type, _) = hand_eval::evaluate_hand(cards);
        assert!(hand_type == 5, 1); // FLUSH
    }

    #[test]
    fun test_full_house() {
        // Cards: 5c, 5d, 5h, Ks, Kc, 2d, 3h
        let cards = vector[
            make_card(3, 0),   // 5c
            make_card(3, 1),   // 5d
            make_card(3, 2),   // 5h
            make_card(11, 3),  // Ks
            make_card(11, 0),  // Kc
            make_card(0, 1),   // 2d
            make_card(1, 2),   // 3h
        ];
        
        let (hand_type, _) = hand_eval::evaluate_hand(cards);
        assert!(hand_type == 6, 1); // FULL_HOUSE
    }

    #[test]
    fun test_four_of_a_kind() {
        // Cards: 9c, 9d, 9h, 9s, Kc, Qd, Jh
        let cards = vector[
            make_card(7, 0),   // 9c
            make_card(7, 1),   // 9d
            make_card(7, 2),   // 9h
            make_card(7, 3),   // 9s
            make_card(11, 0),  // Kc
            make_card(10, 1),  // Qd
            make_card(9, 2),   // Jh
        ];
        
        let (hand_type, _) = hand_eval::evaluate_hand(cards);
        assert!(hand_type == 7, 1); // FOUR_OF_A_KIND
    }

    #[test]
    fun test_straight_flush() {
        // Cards: 5s, 6s, 7s, 8s, 9s, Kd, Ac
        let cards = vector[
            make_card(3, 3),   // 5s
            make_card(4, 3),   // 6s
            make_card(5, 3),   // 7s
            make_card(6, 3),   // 8s
            make_card(7, 3),   // 9s
            make_card(11, 1),  // Kd
            make_card(12, 0),  // Ac
        ];
        
        let (hand_type, _) = hand_eval::evaluate_hand(cards);
        assert!(hand_type == 8, 1); // STRAIGHT_FLUSH
    }

    #[test]
    fun test_royal_flush() {
        // Cards: 10s, Js, Qs, Ks, As, 2d, 3c
        let cards = vector[
            make_card(8, 3),   // 10s
            make_card(9, 3),   // Js
            make_card(10, 3),  // Qs
            make_card(11, 3),  // Ks
            make_card(12, 3),  // As
            make_card(0, 1),   // 2d
            make_card(1, 0),   // 3c
        ];
        
        let (hand_type, _) = hand_eval::evaluate_hand(cards);
        assert!(hand_type == 9, 1); // ROYAL_FLUSH
    }

    #[test]
    fun test_compare_hands() {
        // Royal flush beats straight flush
        assert!(hand_eval::compare_hands(9, 0, 8, 7) == 1, 1);
        
        // Pair of kings beats pair of queens (tiebreaker: rank)
        assert!(hand_eval::compare_hands(1, 11 << 24, 1, 10 << 24) == 1, 2);
        
        // Same hand = tie
        assert!(hand_eval::compare_hands(5, 100, 5, 100) == 0, 3);
        
        // Flush beats straight
        assert!(hand_eval::compare_hands(5, 0, 4, 12) == 1, 4);
    }

    #[test]
    fun test_wheel_straight() {
        // Wheel: A-2-3-4-5 (ace-low straight)
        let cards = vector[
            make_card(12, 0),  // Ac
            make_card(0, 1),   // 2d
            make_card(1, 2),   // 3h
            make_card(2, 3),   // 4s
            make_card(3, 0),   // 5c
            make_card(9, 1),   // Jd
            make_card(11, 2),  // Kh
        ];
        
        let (hand_type, tiebreaker) = hand_eval::evaluate_hand(cards);
        assert!(hand_type == 4, 1); // STRAIGHT
        assert!(tiebreaker == 3, 2); // 5-high
    }
}
