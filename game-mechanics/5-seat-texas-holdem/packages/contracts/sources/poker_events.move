// ============================================
// Poker Events Module
// ============================================
// Comprehensive events for frontend observability, hand history, and real-time updates

module holdemgame::poker_events {
    use cedra_framework::event;

    friend holdemgame::texas_holdem;

    // ============================================
    // TABLE LIFECYCLE EVENTS
    // ============================================

    #[event]
    struct TableCreated has drop, store {
        table_addr: address,
        admin: address,
        small_blind: u64,
        big_blind: u64,
        min_buy_in: u64,
        max_buy_in: u64,
        ante: u64,
        straddle_enabled: bool,
    }

    #[event]
    struct TableClosed has drop, store {
        table_addr: address,
        admin: address,
    }

    #[event]
    struct TableConfigUpdated has drop, store {
        table_addr: address,
        config_type: u8,  // 0=blinds, 1=ante, 2=straddle, 3=buy_in_limits
        value1: u64,
        value2: u64,
    }

    // ============================================
    // PLAYER EVENTS
    // ============================================

    #[event]
    struct PlayerJoined has drop, store {
        table_addr: address,
        seat_idx: u64,
        player: address,
        buy_in: u64,
    }

    #[event]
    struct PlayerLeft has drop, store {
        table_addr: address,
        seat_idx: u64,
        player: address,
        chips_returned: u64,
    }

    #[event]
    struct PlayerSatOut has drop, store {
        table_addr: address,
        seat_idx: u64,
        player: address,
    }

    #[event]
    struct PlayerSatIn has drop, store {
        table_addr: address,
        seat_idx: u64,
        player: address,
    }

    #[event]
    struct PlayerToppedUp has drop, store {
        table_addr: address,
        seat_idx: u64,
        player: address,
        amount: u64,
        new_stack: u64,
    }

    #[event]
    struct PlayerKicked has drop, store {
        table_addr: address,
        seat_idx: u64,
        player: address,
        chips_returned: u64,
    }

    // ============================================
    // HAND LIFECYCLE EVENTS
    // ============================================

    #[event]
    struct HandStarted has drop, store {
        table_addr: address,
        hand_number: u64,
        dealer_seat: u64,
        player_seats: vector<u64>,
    }

    #[event]
    struct CommitSubmitted has drop, store {
        table_addr: address,
        hand_number: u64,
        player: address,
    }

    #[event]
    struct RevealSubmitted has drop, store {
        table_addr: address,
        hand_number: u64,
        player: address,
    }

    #[event]
    struct CardsDealt has drop, store {
        table_addr: address,
        hand_number: u64,
    }

    #[event]
    struct PhaseChanged has drop, store {
        table_addr: address,
        hand_number: u64,
        old_phase: u8,
        new_phase: u8,
    }

    #[event]
    struct CommunityCardsDealt has drop, store {
        table_addr: address,
        hand_number: u64,
        phase: u8,
        cards: vector<u8>,
    }

    // ============================================
    // ACTION EVENTS
    // ============================================

    #[event]
    struct BlindsPosted has drop, store {
        table_addr: address,
        hand_number: u64,
        sb_seat: u64,
        sb_amount: u64,
        bb_seat: u64,
        bb_amount: u64,
    }

    #[event]
    struct AntesPosted has drop, store {
        table_addr: address,
        hand_number: u64,
        total_ante: u64,
    }

    #[event]
    struct StraddlePosted has drop, store {
        table_addr: address,
        hand_number: u64,
        seat_idx: u64,
        player: address,
        amount: u64,
    }

    #[event]
    struct PlayerFolded has drop, store {
        table_addr: address,
        hand_number: u64,
        seat_idx: u64,
        player: address,
    }

    #[event]
    struct PlayerChecked has drop, store {
        table_addr: address,
        hand_number: u64,
        seat_idx: u64,
        player: address,
    }

    #[event]
    struct PlayerCalled has drop, store {
        table_addr: address,
        hand_number: u64,
        seat_idx: u64,
        player: address,
        amount: u64,
    }

    #[event]
    struct PlayerRaised has drop, store {
        table_addr: address,
        hand_number: u64,
        seat_idx: u64,
        player: address,
        raise_to: u64,
    }

    #[event]
    struct PlayerWentAllIn has drop, store {
        table_addr: address,
        hand_number: u64,
        seat_idx: u64,
        player: address,
        amount: u64,
    }

    // ============================================
    // SHOWDOWN & RESULT EVENTS
    // ============================================

    #[event]
    struct ShowdownStarted has drop, store {
        table_addr: address,
        hand_number: u64,
        board: vector<u8>,
    }

    #[event]
    struct PotAwarded has drop, store {
        table_addr: address,
        hand_number: u64,
        winner_seat: u64,
        winner: address,
        amount: u64,
        fee_deducted: u64,
    }

    #[event]
    struct HandEnded has drop, store {
        table_addr: address,
        hand_number: u64,
        total_pot: u64,
        total_fees: u64,
    }

    #[event]
    struct FoldWin has drop, store {
        table_addr: address,
        hand_number: u64,
        winner_seat: u64,
        winner: address,
        amount: u64,
    }

    // Comprehensive hand result for history/stats
    // Emitted at the end of every hand (showdown or fold win)
    #[event]
    struct HandResult has drop, store {
        table_addr: address,
        hand_number: u64,
        timestamp: u64,
        
        // Final board
        community_cards: vector<u8>,
        
        // Players who reached showdown (didn't fold)
        // Parallel arrays - same index = same player
        showdown_seats: vector<u64>,
        showdown_players: vector<address>,
        showdown_hole_cards: vector<vector<u8>>,   // 2 cards per player
        showdown_hand_types: vector<u8>,           // Hand ranking (1=high card, ..., 10=royal flush)
        
        // Winners (may be multiple for split pots)
        winner_seats: vector<u64>,
        winner_players: vector<address>,
        winner_amounts: vector<u64>,
        
        // Pot summary
        total_pot: u64,
        total_fees: u64,
        
        // Outcome: 0=showdown, 1=fold_win
        result_type: u8,
    }

    // ============================================
    // TIMEOUT EVENTS
    // ============================================

    #[event]
    struct TimeoutTriggered has drop, store {
        table_addr: address,
        hand_number: u64,
        phase: u8,
        seat_idx: u64,
        penalty: u64,
    }

    #[event]
    struct HandAborted has drop, store {
        table_addr: address,
        hand_number: u64,
        reason: u8,  // 0=commit_timeout, 1=reveal_timeout
    }

    // ============================================
    // ADMIN EVENTS
    // ============================================

    #[event]
    struct OwnershipTransferred has drop, store {
        table_addr: address,
        old_admin: address,
        new_admin: address,
    }

    #[event]
    struct FeeRecipientUpdated has drop, store {
        table_addr: address,
        old_recipient: address,
        new_recipient: address,
    }

    // ============================================
    // EMIT FUNCTIONS (friend access from texas_holdem)
    // ============================================

    public(friend) fun emit_table_created(
        table_addr: address,
        admin: address,
        small_blind: u64,
        big_blind: u64,
        min_buy_in: u64,
        max_buy_in: u64,
        ante: u64,
        straddle_enabled: bool,
    ) {
        event::emit(TableCreated { 
            table_addr, admin, small_blind, big_blind, 
            min_buy_in, max_buy_in, ante, straddle_enabled 
        });
    }

    public(friend) fun emit_table_closed(table_addr: address, admin: address) {
        event::emit(TableClosed { table_addr, admin });
    }

    public(friend) fun emit_table_config_updated(
        table_addr: address,
        config_type: u8,
        value1: u64,
        value2: u64,
    ) {
        event::emit(TableConfigUpdated { table_addr, config_type, value1, value2 });
    }

    public(friend) fun emit_player_joined(
        table_addr: address,
        seat_idx: u64,
        player: address,
        buy_in: u64
    ) {
        event::emit(PlayerJoined { table_addr, seat_idx, player, buy_in });
    }

    public(friend) fun emit_player_left(
        table_addr: address,
        seat_idx: u64,
        player: address,
        chips_returned: u64
    ) {
        event::emit(PlayerLeft { table_addr, seat_idx, player, chips_returned });
    }

    public(friend) fun emit_player_sat_out(table_addr: address, seat_idx: u64, player: address) {
        event::emit(PlayerSatOut { table_addr, seat_idx, player });
    }

    public(friend) fun emit_player_sat_in(table_addr: address, seat_idx: u64, player: address) {
        event::emit(PlayerSatIn { table_addr, seat_idx, player });
    }

    public(friend) fun emit_player_topped_up(
        table_addr: address,
        seat_idx: u64,
        player: address,
        amount: u64,
        new_stack: u64,
    ) {
        event::emit(PlayerToppedUp { table_addr, seat_idx, player, amount, new_stack });
    }

    public(friend) fun emit_player_kicked(
        table_addr: address,
        seat_idx: u64,
        player: address,
        chips_returned: u64,
    ) {
        event::emit(PlayerKicked { table_addr, seat_idx, player, chips_returned });
    }

    public(friend) fun emit_hand_started(
        table_addr: address,
        hand_number: u64,
        dealer_seat: u64,
        player_seats: vector<u64>,
    ) {
        event::emit(HandStarted { table_addr, hand_number, dealer_seat, player_seats });
    }

    public(friend) fun emit_commit_submitted(table_addr: address, hand_number: u64, player: address) {
        event::emit(CommitSubmitted { table_addr, hand_number, player });
    }

    public(friend) fun emit_reveal_submitted(table_addr: address, hand_number: u64, player: address) {
        event::emit(RevealSubmitted { table_addr, hand_number, player });
    }

    public(friend) fun emit_cards_dealt(table_addr: address, hand_number: u64) {
        event::emit(CardsDealt { table_addr, hand_number });
    }

    public(friend) fun emit_phase_changed(
        table_addr: address,
        hand_number: u64,
        old_phase: u8,
        new_phase: u8,
    ) {
        event::emit(PhaseChanged { table_addr, hand_number, old_phase, new_phase });
    }

    public(friend) fun emit_community_cards_dealt(
        table_addr: address,
        hand_number: u64,
        phase: u8,
        cards: vector<u8>,
    ) {
        event::emit(CommunityCardsDealt { table_addr, hand_number, phase, cards });
    }

    public(friend) fun emit_blinds_posted(
        table_addr: address,
        hand_number: u64,
        sb_seat: u64,
        sb_amount: u64,
        bb_seat: u64,
        bb_amount: u64,
    ) {
        event::emit(BlindsPosted { table_addr, hand_number, sb_seat, sb_amount, bb_seat, bb_amount });
    }

    public(friend) fun emit_antes_posted(table_addr: address, hand_number: u64, total_ante: u64) {
        event::emit(AntesPosted { table_addr, hand_number, total_ante });
    }

    public(friend) fun emit_straddle_posted(
        table_addr: address,
        hand_number: u64,
        seat_idx: u64,
        player: address,
        amount: u64,
    ) {
        event::emit(StraddlePosted { table_addr, hand_number, seat_idx, player, amount });
    }

    public(friend) fun emit_player_folded(
        table_addr: address,
        hand_number: u64,
        seat_idx: u64,
        player: address,
    ) {
        event::emit(PlayerFolded { table_addr, hand_number, seat_idx, player });
    }

    public(friend) fun emit_player_checked(
        table_addr: address,
        hand_number: u64,
        seat_idx: u64,
        player: address,
    ) {
        event::emit(PlayerChecked { table_addr, hand_number, seat_idx, player });
    }

    public(friend) fun emit_player_called(
        table_addr: address,
        hand_number: u64,
        seat_idx: u64,
        player: address,
        amount: u64,
    ) {
        event::emit(PlayerCalled { table_addr, hand_number, seat_idx, player, amount });
    }

    public(friend) fun emit_player_raised(
        table_addr: address,
        hand_number: u64,
        seat_idx: u64,
        player: address,
        raise_to: u64,
    ) {
        event::emit(PlayerRaised { table_addr, hand_number, seat_idx, player, raise_to });
    }

    public(friend) fun emit_player_went_all_in(
        table_addr: address,
        hand_number: u64,
        seat_idx: u64,
        player: address,
        amount: u64,
    ) {
        event::emit(PlayerWentAllIn { table_addr, hand_number, seat_idx, player, amount });
    }

    public(friend) fun emit_showdown_started(
        table_addr: address,
        hand_number: u64,
        board: vector<u8>,
    ) {
        event::emit(ShowdownStarted { table_addr, hand_number, board });
    }

    public(friend) fun emit_pot_awarded(
        table_addr: address,
        hand_number: u64,
        winner_seat: u64,
        winner: address,
        amount: u64,
        fee_deducted: u64,
    ) {
        event::emit(PotAwarded { table_addr, hand_number, winner_seat, winner, amount, fee_deducted });
    }

    public(friend) fun emit_hand_ended(
        table_addr: address,
        hand_number: u64,
        total_pot: u64,
        total_fees: u64,
    ) {
        event::emit(HandEnded { table_addr, hand_number, total_pot, total_fees });
    }

    public(friend) fun emit_fold_win(
        table_addr: address,
        hand_number: u64,
        winner_seat: u64,
        winner: address,
        amount: u64,
    ) {
        event::emit(FoldWin { table_addr, hand_number, winner_seat, winner, amount });
    }

    public(friend) fun emit_hand_result(
        table_addr: address,
        hand_number: u64,
        timestamp: u64,
        community_cards: vector<u8>,
        showdown_seats: vector<u64>,
        showdown_players: vector<address>,
        showdown_hole_cards: vector<vector<u8>>,
        showdown_hand_types: vector<u8>,
        winner_seats: vector<u64>,
        winner_players: vector<address>,
        winner_amounts: vector<u64>,
        total_pot: u64,
        total_fees: u64,
        result_type: u8,
    ) {
        event::emit(HandResult {
            table_addr,
            hand_number,
            timestamp,
            community_cards,
            showdown_seats,
            showdown_players,
            showdown_hole_cards,
            showdown_hand_types,
            winner_seats,
            winner_players,
            winner_amounts,
            total_pot,
            total_fees,
            result_type,
        });
    }

    public(friend) fun emit_timeout_triggered(
        table_addr: address,
        hand_number: u64,
        phase: u8,
        seat_idx: u64,
        penalty: u64,
    ) {
        event::emit(TimeoutTriggered { table_addr, hand_number, phase, seat_idx, penalty });
    }

    public(friend) fun emit_hand_aborted(table_addr: address, hand_number: u64, reason: u8) {
        event::emit(HandAborted { table_addr, hand_number, reason });
    }

    public(friend) fun emit_ownership_transferred(
        table_addr: address,
        old_admin: address,
        new_admin: address,
    ) {
        event::emit(OwnershipTransferred { table_addr, old_admin, new_admin });
    }

    public(friend) fun emit_fee_recipient_updated(
        table_addr: address,
        old_recipient: address,
        new_recipient: address,
    ) {
        event::emit(FeeRecipientUpdated { table_addr, old_recipient, new_recipient });
    }
}
