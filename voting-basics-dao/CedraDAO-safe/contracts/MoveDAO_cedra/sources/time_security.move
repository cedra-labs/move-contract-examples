// Time security - prevents timestamp manipulation attacks and ensures secure time-based operations
module movedao_addrx::time_security {
    use std::vector;
    use cedra_framework::timestamp;
    use movedao_addrx::errors;
    use movedao_addrx::safe_math;

    // Time constants for validation
    const MIN_VOTING_PERIOD: u64 = 3600;      // 1 hour minimum
    const MAX_VOTING_PERIOD: u64 = 2592000;   // 30 days maximum
    const MIN_VESTING_PERIOD: u64 = 86400;    // 1 day minimum
    const MAX_VESTING_PERIOD: u64 = 31536000; // 1 year maximum
    const REASONABLE_FUTURE_LIMIT: u64 = 7776000; // 90 days in future

    /// Validate that a time period is within reasonable bounds
    public fun validate_time_period(start_time: u64, end_time: u64, min_duration: u64, max_duration: u64) {
        let current_time = timestamp::now_seconds();
        
        // Ensure start time is not too far in the past (more than 1 hour)
        assert!(start_time >= current_time || current_time - start_time <= 3600, errors::invalid_time());
        
        // Ensure start time is not too far in the future
        assert!(start_time <= safe_math::safe_add(current_time, REASONABLE_FUTURE_LIMIT), errors::invalid_time());
        
        // Ensure end time is after start time
        assert!(end_time > start_time, errors::invalid_time());
        
        // Validate duration bounds
        let duration = safe_math::safe_sub(end_time, start_time);
        assert!(duration >= min_duration, errors::invalid_time());
        assert!(duration <= max_duration, errors::invalid_time());
    }

    /// Validate voting period timing
    public fun validate_voting_period(voting_start: u64, voting_end: u64) {
        validate_time_period(voting_start, voting_end, MIN_VOTING_PERIOD, MAX_VOTING_PERIOD);
    }

    /// Validate vesting schedule timing
    public fun validate_vesting_period(vesting_start: u64, vesting_end: u64) {
        validate_time_period(vesting_start, vesting_end, MIN_VESTING_PERIOD, MAX_VESTING_PERIOD);
    }

    /// Check if current time is within a valid range of expected time
    /// This helps detect potential timestamp manipulation
    public fun validate_current_time_reasonable(expected_time: u64, tolerance: u64) {
        let current_time = timestamp::now_seconds();
        let time_diff = if (current_time >= expected_time) {
            current_time - expected_time
        } else {
            expected_time - current_time
        };
        assert!(time_diff <= tolerance, errors::invalid_time());
    }

    /// Get a time that's safe to use for future operations
    /// Adds a small buffer to prevent timing attacks
    public fun get_safe_future_time(seconds_from_now: u64): u64 {
        let current_time = timestamp::now_seconds();
        let buffer = 60; // 1 minute buffer
        safe_math::safe_add(safe_math::safe_add(current_time, seconds_from_now), buffer)
    }

    /// Check if a time period has elapsed with buffer for timing attacks
    public fun has_time_elapsed_safely(target_time: u64, buffer_seconds: u64): bool {
        let current_time = timestamp::now_seconds();
        let safe_target_time = safe_math::safe_add(target_time, buffer_seconds);
        current_time >= safe_target_time
    }

    /// Validate that a sequence of times is in chronological order
    public fun validate_chronological_order(times: &vector<u64>) {
        let len = vector::length(times);
        if (len <= 1) return;
        
        let i = 0;
        while (i < len - 1) {
            let current_time = *vector::borrow(times, i);
            let next_time = *vector::borrow(times, i + 1);
            assert!(next_time > current_time, errors::invalid_time());
            i = i + 1;
        };
    }

    /// Get minimum and maximum allowed time constants
    public fun get_min_voting_period(): u64 { MIN_VOTING_PERIOD }
    public fun get_max_voting_period(): u64 { MAX_VOTING_PERIOD }
    public fun get_min_vesting_period(): u64 { MIN_VESTING_PERIOD }
    public fun get_max_vesting_period(): u64 { MAX_VESTING_PERIOD }

    #[test]
    public fun test_validate_voting_period() {
        use cedra_framework::account;
        use cedra_framework::timestamp;
        timestamp::set_time_has_started_for_testing(&account::create_account_for_test(@0x1));
        timestamp::update_global_time_for_test_secs(1000000);
        
        let start = timestamp::now_seconds() + 100;
        let end = start + MIN_VOTING_PERIOD + 100;
        validate_voting_period(start, end);
    }

    #[test]
    #[expected_failure(abort_code = 5, location = movedao_addrx::time_security)]
    public fun test_invalid_voting_period_too_short() {
        use cedra_framework::account;
        use cedra_framework::timestamp;
        timestamp::set_time_has_started_for_testing(&account::create_account_for_test(@0x1));
        timestamp::update_global_time_for_test_secs(1000000);
        
        let start = timestamp::now_seconds() + 100;
        let end = start + MIN_VOTING_PERIOD - 100; // Too short
        validate_voting_period(start, end);
    }

    #[test]
    public fun test_chronological_order() {
        let times = vector::empty<u64>();
        vector::push_back(&mut times, 100);
        vector::push_back(&mut times, 200);
        vector::push_back(&mut times, 300);
        validate_chronological_order(&times);
    }
}