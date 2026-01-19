/// Random Selector - Minimal example of Cedra's on-chain randomness
module RandomnessExample::random_selector {
    use std::signer;
    use std::vector;
    use cedra_framework::randomness;
    use cedra_framework::event;

    const E_NO_CANDIDATES: u64 = 1;
    const E_NOT_ENOUGH_CANDIDATES: u64 = 2;

    struct CandidatePool has key {
        candidates: vector<address>,
    }

    #[event]
    struct WinnersSelected has drop, store {
        winners: vector<address>,
    }

    fun init_module(admin: &signer) {
        move_to(admin, CandidatePool { candidates: vector::empty() });
    }

    public entry fun add_candidate(admin: &signer, candidate: address) acquires CandidatePool {
        let pool = borrow_global_mut<CandidatePool>(signer::address_of(admin));
        vector::push_back(&mut pool.candidates, candidate);
    }

    // Entry must be private for #[randomness], can't return values
    // Client gets result via WinnersSelected event
    #[randomness]
    entry fun select_winners(admin: &signer, n: u64) acquires CandidatePool {
        let pool = borrow_global<CandidatePool>(signer::address_of(admin));
        let total = vector::length(&pool.candidates);

        assert!(total > 0, E_NO_CANDIDATES);
        assert!(n <= total, E_NOT_ENOUGH_CANDIDATES);

        let perm = randomness::permutation(total);
        let winners = vector::empty<address>();

        let i = 0;
        while (i < n) {
            let idx = *vector::borrow(&perm, i);
            vector::push_back(&mut winners, *vector::borrow(&pool.candidates, idx));
            i = i + 1;
        };

        event::emit(WinnersSelected { winners });
    }

    #[randomness]
    entry fun select_one(admin: &signer) acquires CandidatePool {
        let pool = borrow_global<CandidatePool>(signer::address_of(admin));
        let total = vector::length(&pool.candidates);
        assert!(total > 0, E_NO_CANDIDATES);

        let idx = randomness::u64_range(0, total);
        let winner = *vector::borrow(&pool.candidates, idx);

        event::emit(WinnersSelected { winners: vector[winner] });
    }

    #[view]
    public fun get_count(admin: address): u64 acquires CandidatePool {
        if (!exists<CandidatePool>(admin)) return 0;
        vector::length(&borrow_global<CandidatePool>(admin).candidates)
    }

    #[test_only]
    public fun init_for_test(admin: &signer) { init_module(admin); }
}
