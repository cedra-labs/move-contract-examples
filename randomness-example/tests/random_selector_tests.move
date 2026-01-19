#[test_only]
module RandomnessExample::random_selector_tests {
    use std::vector;
    use cedra_framework::randomness;
    use RandomnessExample::random_selector;

    #[test(fx = @cedra_framework)]
    fun test_bytes_length(fx: signer) {
        randomness::initialize_for_testing(&fx);
        assert!(vector::length(&randomness::bytes(0)) == 0, 0);
        assert!(vector::length(&randomness::bytes(1)) == 1, 1);
        assert!(vector::length(&randomness::bytes(32)) == 32, 2);
        assert!(vector::length(&randomness::bytes(33)) == 33, 3);
        assert!(vector::length(&randomness::bytes(64)) == 64, 4);
    }

    #[test(fx = @cedra_framework)]
    fun test_permutation_all_elements(fx: signer) {
        randomness::initialize_for_testing(&fx);
        let perm = randomness::permutation(5);
        assert!(vector::length(&perm) == 5, 0);

        // Sum of 0+1+2+3+4 = 10
        let sum: u64 = 0;
        let i = 0;
        while (i < 5) {
            sum = sum + *vector::borrow(&perm, i);
            i = i + 1;
        };
        assert!(sum == 10, 1);
    }

    #[test(fx = @cedra_framework)]
    fun test_permutation_edge_cases(fx: signer) {
        randomness::initialize_for_testing(&fx);

        let p0 = randomness::permutation(0);
        assert!(vector::length(&p0) == 0, 0);

        let p1 = randomness::permutation(1);
        assert!(vector::length(&p1) == 1, 1);
        assert!(*vector::borrow(&p1, 0) == 0, 2);
    }

    #[test(fx = @cedra_framework)]
    fun test_u64_range_bounds(fx: signer) {
        randomness::initialize_for_testing(&fx);

        let i = 0;
        while (i < 50) {
            let val = randomness::u64_range(10, 20);
            assert!(val >= 10 && val < 20, 0);
            i = i + 1;
        };

        // Single value range
        let val = randomness::u64_range(5, 6);
        assert!(val == 5, 1);
    }

    #[test(fx = @cedra_framework)]
    fun test_consecutive_calls_differ(fx: signer) {
        randomness::initialize_for_testing(&fx);

        let v1 = randomness::u64_integer();
        let v2 = randomness::u64_integer();
        let v3 = randomness::u64_integer();

        // At least one pair should differ
        assert!(v1 != v2 || v2 != v3, 0);
    }

    #[test(admin = @RandomnessExample, fx = @cedra_framework)]
    fun test_add_candidates(admin: signer, fx: signer) {
        randomness::initialize_for_testing(&fx);
        cedra_framework::account::create_account_for_test(@RandomnessExample);
        random_selector::init_for_test(&admin);

        assert!(random_selector::get_count(@RandomnessExample) == 0, 0);

        random_selector::add_candidate(&admin, @0x1);
        random_selector::add_candidate(&admin, @0x2);
        random_selector::add_candidate(&admin, @0x3);

        assert!(random_selector::get_count(@RandomnessExample) == 3, 1);
    }
}
