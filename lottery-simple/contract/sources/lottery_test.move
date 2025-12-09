#[test_only]
module LotterySimple::LotteryTest {
    use LotterySimple::Lottery;

    #[test(admin = @0xcafe)]
    fun test_init_module(admin: signer) {
        Lottery::init_for_testing(&admin);
    }

    #[test(admin = @0xcafe)]
    fun test_create_lottery(admin: signer) {
        Lottery::init_for_testing(&admin);
        Lottery::create_lottery(&admin);
        let (id, _admin, is_open, is_drawn, ticket_count, _winner, _winning_ticket_id) = Lottery::get_lottery_info(0);
        assert!(id == 0, 1);
        assert!(is_open == true, 2);
        assert!(is_drawn == false, 3);
        assert!(ticket_count == 0, 4);
    }

    #[test(admin = @0xcafe, buyer1 = @0x1)]
    fun test_purchase_ticket(admin: signer, buyer1: signer) {
        Lottery::init_for_testing(&admin);
        Lottery::create_lottery(&admin);
        Lottery::purchase_ticket(&buyer1, 0);
        let (_id, _admin, _is_open, _is_drawn, ticket_count, _winner, _winning_ticket_id) = Lottery::get_lottery_info(0);
        assert!(ticket_count == 1, 5);
        assert!(Lottery::has_ticket(0, @0x1) == true, 6);
    }

    #[test(admin = @0xcafe, buyer1 = @0x1, buyer2 = @0x2)]
    fun test_multiple_tickets(admin: signer, buyer1: signer, buyer2: signer) {
        Lottery::init_for_testing(&admin);
        Lottery::create_lottery(&admin);
        Lottery::purchase_ticket(&buyer1, 0);
        Lottery::purchase_ticket(&buyer2, 0);
        let (_id, _admin, _is_open, _is_drawn, ticket_count, _winner, _winning_ticket_id) = Lottery::get_lottery_info(0);
        assert!(ticket_count == 2, 7);
        assert!(Lottery::has_ticket(0, @0x1) == true, 8);
        assert!(Lottery::has_ticket(0, @0x2) == true, 9);
    }

    #[test(admin = @0xcafe, buyer1 = @0x1, buyer2 = @0x2, buyer3 = @0x3)]
    fun test_draw_winner(admin: signer, buyer1: signer, buyer2: signer, buyer3: signer) {
        Lottery::init_for_testing(&admin);
        Lottery::create_lottery(&admin);
        Lottery::purchase_ticket(&buyer1, 0);
        Lottery::purchase_ticket(&buyer2, 0);
        Lottery::purchase_ticket(&buyer3, 0);
        Lottery::draw_winner(&admin, 0);
        let (_id, _admin, is_open, is_drawn, ticket_count, winner, winning_ticket_id) = Lottery::get_lottery_info(0);
        assert!(is_open == false, 10);
        assert!(is_drawn == true, 11);
        assert!(ticket_count == 3, 12);
        assert!(winner != @0x0, 13);
        assert!(winning_ticket_id < ticket_count, 14);
    }

    #[test(admin = @0xcafe)]
    fun test_close_lottery(admin: signer) {
        Lottery::init_for_testing(&admin);
        Lottery::create_lottery(&admin);
        Lottery::close_lottery(&admin, 0);
        let (_id, _admin, is_open, _is_drawn, _ticket_count, _winner, _winning_ticket_id) = Lottery::get_lottery_info(0);
        assert!(is_open == false, 15);
    }

    #[test(admin = @0xcafe, buyer1 = @0x1)]
    #[expected_failure(abort_code = 196610, location = LotterySimple::Lottery)]
    fun test_purchase_ticket_closed_lottery(admin: signer, buyer1: signer) {
        Lottery::init_for_testing(&admin);
        Lottery::create_lottery(&admin);
        Lottery::close_lottery(&admin, 0);
        Lottery::purchase_ticket(&buyer1, 0);
    }

    #[test(admin = @0xcafe, buyer1 = @0x1)]
    #[expected_failure(abort_code = 196610, location = LotterySimple::Lottery)]
    fun test_purchase_ticket_drawn_lottery(admin: signer, buyer1: signer) {
        Lottery::init_for_testing(&admin);
        Lottery::create_lottery(&admin);
        Lottery::purchase_ticket(&buyer1, 0);
        Lottery::draw_winner(&admin, 0);
        Lottery::purchase_ticket(&buyer1, 0);
    }

    #[test(admin = @0xcafe)]
    #[expected_failure(abort_code = 196612, location = LotterySimple::Lottery)]
    fun test_draw_winner_no_tickets(admin: signer) {
        Lottery::init_for_testing(&admin);
        Lottery::create_lottery(&admin);
        Lottery::draw_winner(&admin, 0);
    }

    #[test(admin = @0xcafe, buyer1 = @0x1)]
    #[expected_failure(abort_code = 327685, location = LotterySimple::Lottery)]
    fun test_draw_winner_not_admin(admin: signer, buyer1: signer) {
        Lottery::init_for_testing(&admin);
        Lottery::create_lottery(&admin);
        Lottery::purchase_ticket(&buyer1, 0);
        Lottery::draw_winner(&buyer1, 0);
    }

    #[test(admin = @0xcafe, buyer1 = @0x1)]
    #[expected_failure(abort_code = 327685, location = LotterySimple::Lottery)]
    fun test_close_lottery_not_admin(admin: signer, buyer1: signer) {
        Lottery::init_for_testing(&admin);
        Lottery::create_lottery(&admin);
        Lottery::close_lottery(&buyer1, 0);
    }

    #[test(admin = @0xcafe, buyer1 = @0x1)]
    #[expected_failure(abort_code = 196610, location = LotterySimple::Lottery)]
    fun test_draw_winner_twice(admin: signer, buyer1: signer) {
        Lottery::init_for_testing(&admin);
        Lottery::create_lottery(&admin);
        Lottery::purchase_ticket(&buyer1, 0);
        Lottery::draw_winner(&admin, 0);
        Lottery::draw_winner(&admin, 0);
    }

    #[test(admin = @0xcafe, buyer1 = @0x1, buyer2 = @0x2, buyer3 = @0x3, buyer4 = @0x4, buyer5 = @0x5)]
    fun test_multiple_lotteries(admin: signer, buyer1: signer, buyer2: signer, buyer3: signer, buyer4: signer, buyer5: signer) {
        Lottery::init_for_testing(&admin);
        // Create first lottery
        Lottery::create_lottery(&admin);
        Lottery::purchase_ticket(&buyer1, 0);
        Lottery::purchase_ticket(&buyer2, 0);
        // Create second lottery
        Lottery::create_lottery(&admin);
        Lottery::purchase_ticket(&buyer3, 1);
        Lottery::purchase_ticket(&buyer4, 1);
        Lottery::purchase_ticket(&buyer5, 1);
        // Check both lotteries
        let (_id1, _admin1, _is_open1, _is_drawn1, ticket_count1, _winner1, _winning_ticket_id1) = Lottery::get_lottery_info(0);
        let (_id2, _admin2, _is_open2, _is_drawn2, ticket_count2, _winner2, _winning_ticket_id2) = Lottery::get_lottery_info(1);
        assert!(ticket_count1 == 2, 16);
        assert!(ticket_count2 == 3, 17);
    }

    #[test(admin = @0xcafe, buyer1 = @0x1)]
    fun test_get_ticket_count(admin: signer, buyer1: signer) {
        Lottery::init_for_testing(&admin);
        Lottery::create_lottery(&admin);
        assert!(Lottery::get_ticket_count(0) == 0, 18);
        Lottery::purchase_ticket(&buyer1, 0);
        assert!(Lottery::get_ticket_count(0) == 1, 19);
    }
}

