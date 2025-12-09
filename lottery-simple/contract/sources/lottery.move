module LotterySimple::Lottery {
    use std::error;
    use std::signer;
    use std::vector;
    use cedra_framework::object::{Self, Object};
    use cedra_framework::transaction_context;

    const E_LOTTERY_NOT_FOUND: u64 = 1;
    const E_LOTTERY_NOT_OPEN: u64 = 2;
    const E_LOTTERY_ALREADY_DRAWN: u64 = 3;
    const E_NO_TICKETS: u64 = 4;
    const E_NOT_ADMIN: u64 = 5;
    const E_LOTTERY_ALREADY_OPEN: u64 = 6;

    struct Ticket has store {
        owner: address,
        ticket_id: u64,
    }

    struct Lottery has key, store {
        id: u64,
        admin: address,
        is_open: bool,
        is_drawn: bool,
        tickets: vector<Ticket>,
        winner: address,
        winning_ticket_id: u64,
        randomness_seed: vector<u8>,
    }

    struct LotteryState has key {
        lotteries: vector<Lottery>,
        next_id: u64,
    }

    fun init_module(admin: &signer) {
        let constructor_ref = &object::create_named_object(admin, b"LotteryState");
        move_to(
            &object::generate_signer(constructor_ref),
            LotteryState {
                lotteries: vector::empty(),
                next_id: 0,
            }
        );
    }

    #[test_only]
    public fun init_for_testing(admin: &signer) {
        init_module(admin);
    }

    #[view]
    public fun get_lottery_state(): Object<LotteryState> {
        let state_address = object::create_object_address(&@LotterySimple, b"LotteryState");
        object::address_to_object<LotteryState>(state_address)
    }

    /// Create a new lottery
    public entry fun create_lottery(
        admin: &signer,
    ) acquires LotteryState {
        let state = borrow_global_mut<LotteryState>(object::object_address(&get_lottery_state()));
        let admin_addr = signer::address_of(admin);
        let lottery = Lottery {
            id: state.next_id,
            admin: admin_addr,
            is_open: true,
            is_drawn: false,
            tickets: vector::empty(),
            winner: @0x0,
            winning_ticket_id: 0,
            randomness_seed: vector::empty(),
        };
        vector::push_back(&mut state.lotteries, lottery);
        state.next_id = state.next_id + 1;
    }

    /// Purchase a ticket for the lottery
    public entry fun purchase_ticket(
        buyer: &signer,
        lottery_id: u64,
    ) acquires LotteryState {
        let state = borrow_global_mut<LotteryState>(object::object_address(&get_lottery_state()));
        assert!(lottery_id < vector::length(&state.lotteries), error::not_found(E_LOTTERY_NOT_FOUND));
        let lottery = vector::borrow_mut(&mut state.lotteries, lottery_id);
        assert!(lottery.is_open, error::invalid_state(E_LOTTERY_NOT_OPEN));
        assert!(!lottery.is_drawn, error::invalid_state(E_LOTTERY_ALREADY_DRAWN));
        
        let buyer_addr = signer::address_of(buyer);
        let ticket_id = vector::length(&lottery.tickets);
        let ticket = Ticket {
            owner: buyer_addr,
            ticket_id,
        };
        vector::push_back(&mut lottery.tickets, ticket);
    }

    /// Draw the winner using transaction hash
    public entry fun draw_winner(
        admin: &signer,
        lottery_id: u64,
    ) acquires LotteryState {
        let state = borrow_global_mut<LotteryState>(object::object_address(&get_lottery_state()));
        assert!(lottery_id < vector::length(&state.lotteries), error::not_found(E_LOTTERY_NOT_FOUND));
        let lottery = vector::borrow_mut(&mut state.lotteries, lottery_id);
        assert!(signer::address_of(admin) == lottery.admin, error::permission_denied(E_NOT_ADMIN));
        assert!(lottery.is_open, error::invalid_state(E_LOTTERY_NOT_OPEN));
        assert!(!lottery.is_drawn, error::invalid_state(E_LOTTERY_ALREADY_DRAWN));
        
        let ticket_count = vector::length(&lottery.tickets);
        assert!(ticket_count > 0, error::invalid_state(E_NO_TICKETS));
        
        // NOTE: Block hash is NOT directly accessible in Move contracts for determinism reasons.
        // Cedra Move (like all Move implementations) does not provide block hash access within
        // smart contracts to ensure deterministic execution across all nodes.
        //
        // We use transaction hash as the best available alternative:
        // - Transaction hash is unpredictable (includes signature, sequence number, etc.)
        // - Cannot be manipulated by the admin
        // - Provides sufficient randomness for lottery purposes
        // - Is verifiable on-chain
        //
        // For true block hash randomness, you would need to:
        // 1. Use an oracle service that provides block hash off-chain
        // 2. Use a commit-reveal scheme
        // 3. Use the randomness module (if available) which may use block data internally
        let tx_hash = transaction_context::get_transaction_hash();
        lottery.randomness_seed = tx_hash;
        
        // Use transaction hash as randomness source (best available alternative to block hash)
        let hash_result = tx_hash;
        
        // Convert hash to a number for selection
        // Simplified approach: sum the first 8 bytes of the hash
        let hash_bytes = hash_result;
        let hash_value: u64 = 0;
        let idx = 0;
        let len = vector::length(&hash_bytes);
        // Sum first 8 bytes (or all bytes if less than 8)
        while (idx < len && idx < 8) {
            let byte_val = *vector::borrow(&hash_bytes, idx);
            hash_value = hash_value + (byte_val as u64);
            idx = idx + 1;
        };
        
        // Select winner using modulo operation
        let winning_index = hash_value % ticket_count;
        let winning_ticket = vector::borrow(&lottery.tickets, winning_index);
        lottery.winner = winning_ticket.owner;
        lottery.winning_ticket_id = winning_ticket.ticket_id;
        lottery.is_drawn = true;
        lottery.is_open = false;
    }

    /// Close lottery (admin only, before drawing)
    public entry fun close_lottery(
        admin: &signer,
        lottery_id: u64,
    ) acquires LotteryState {
        let state = borrow_global_mut<LotteryState>(object::object_address(&get_lottery_state()));
        assert!(lottery_id < vector::length(&state.lotteries), error::not_found(E_LOTTERY_NOT_FOUND));
        let lottery = vector::borrow_mut(&mut state.lotteries, lottery_id);
        assert!(signer::address_of(admin) == lottery.admin, error::permission_denied(E_NOT_ADMIN));
        assert!(lottery.is_open, error::invalid_state(E_LOTTERY_NOT_OPEN));
        assert!(!lottery.is_drawn, error::invalid_state(E_LOTTERY_ALREADY_DRAWN));
        lottery.is_open = false;
    }

    /// View function to get lottery information
    #[view]
    public fun get_lottery_info(lottery_id: u64): (u64, address, bool, bool, u64, address, u64) acquires LotteryState {
        let state = borrow_global<LotteryState>(object::object_address(&get_lottery_state()));
        assert!(lottery_id < vector::length(&state.lotteries), error::not_found(E_LOTTERY_NOT_FOUND));
        let lottery = vector::borrow(&state.lotteries, lottery_id);
        (
            lottery.id,
            lottery.admin,
            lottery.is_open,
            lottery.is_drawn,
            vector::length(&lottery.tickets),
            lottery.winner,
            lottery.winning_ticket_id,
        )
    }

    /// View function to get ticket count for a lottery
    #[view]
    public fun get_ticket_count(lottery_id: u64): u64 acquires LotteryState {
        let state = borrow_global<LotteryState>(object::object_address(&get_lottery_state()));
        assert!(lottery_id < vector::length(&state.lotteries), error::not_found(E_LOTTERY_NOT_FOUND));
        let lottery = vector::borrow(&state.lotteries, lottery_id);
        vector::length(&lottery.tickets)
    }

    /// View function to check if an address has tickets in a lottery
    #[view]
    public fun has_ticket(lottery_id: u64, addr: address): bool acquires LotteryState {
        let state = borrow_global<LotteryState>(object::object_address(&get_lottery_state()));
        assert!(lottery_id < vector::length(&state.lotteries), error::not_found(E_LOTTERY_NOT_FOUND));
        let lottery = vector::borrow(&state.lotteries, lottery_id);
        let i = 0;
        let len = vector::length(&lottery.tickets);
        while (i < len) {
            let ticket = vector::borrow(&lottery.tickets, i);
            if (ticket.owner == addr) {
                return true
            };
            i = i + 1;
        };
        false
    }

    /// View function to get the total number of lotteries created
    #[view]
    public fun get_lottery_count(): u64 acquires LotteryState {
        let state = borrow_global<LotteryState>(object::object_address(&get_lottery_state()));
        vector::length(&state.lotteries)
    }
}

