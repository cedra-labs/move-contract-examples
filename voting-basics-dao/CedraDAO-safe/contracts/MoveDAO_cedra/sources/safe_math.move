// Safe math - prevents integer overflow/underflow attacks with secure arithmetic operations
module movedao_addrx::safe_math {
    use movedao_addrx::errors;

    // Maximum value for u64
    const MAX_U64: u64 = 18446744073709551615;

    /// Safe addition with overflow check
    public fun safe_add(a: u64, b: u64): u64 {
        assert!(a <= MAX_U64 - b, errors::invalid_amount());
        a + b
    }

    /// Safe subtraction with underflow check
    public fun safe_sub(a: u64, b: u64): u64 {
        assert!(a >= b, errors::invalid_amount());
        a - b
    }

    /// Safe multiplication with overflow check
    public fun safe_mul(a: u64, b: u64): u64 {
        if (a == 0 || b == 0) {
            return 0
        };
        assert!(a <= MAX_U64 / b, errors::invalid_amount());
        a * b
    }

    /// Safe division with zero check
    public fun safe_div(a: u64, b: u64): u64 {
        assert!(b > 0, errors::invalid_amount());
        a / b
    }

    /// Safe percentage calculation (a * percent / 100)
    public fun safe_percentage(amount: u64, percent: u64): u64 {
        assert!(percent <= 100, errors::invalid_amount());
        if (amount == 0 || percent == 0) {
            return 0
        };
        // Check for overflow in multiplication
        assert!(amount <= MAX_U64 / percent, errors::invalid_amount());
        (amount * percent) / 100
    }

    /// Check if addition would overflow
    public fun would_add_overflow(a: u64, b: u64): bool {
        a > MAX_U64 - b
    }

    /// Check if multiplication would overflow
    public fun would_mul_overflow(a: u64, b: u64): bool {
        if (a == 0 || b == 0) {
            false
        } else {
            a > MAX_U64 / b
        }
    }

    /// Get maximum safe value for operations
    public fun max_value(): u64 {
        MAX_U64
    }

    #[test]
    public fun test_safe_add() {
        assert!(safe_add(100, 200) == 300, 1);
        assert!(safe_add(0, 100) == 100, 2);
    }

    #[test]
    #[expected_failure(abort_code = 4, location = movedao_addrx::safe_math)]
    public fun test_safe_add_overflow() {
        safe_add(MAX_U64, 1);
    }

    #[test]
    public fun test_safe_sub() {
        assert!(safe_sub(300, 100) == 200, 1);
        assert!(safe_sub(100, 100) == 0, 2);
    }

    #[test]
    #[expected_failure(abort_code = 4, location = movedao_addrx::safe_math)]
    public fun test_safe_sub_underflow() {
        safe_sub(100, 200);
    }

    #[test]
    public fun test_safe_mul() {
        assert!(safe_mul(10, 20) == 200, 1);
        assert!(safe_mul(0, 100) == 0, 2);
    }

    #[test]
    public fun test_safe_percentage() {
        assert!(safe_percentage(1000, 50) == 500, 1);
        assert!(safe_percentage(1000, 0) == 0, 2);
        assert!(safe_percentage(0, 50) == 0, 3);
    }
}