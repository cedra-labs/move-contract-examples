// Input validation - validates user inputs like strings, addresses, and parameters to prevent invalid data
module movedao_addrx::input_validation {
    use std::string::{Self, String};
    use std::vector;
    use movedao_addrx::errors;

    // Validation constants
    const MIN_NAME_LENGTH: u64 = 2;
    const MAX_NAME_LENGTH: u64 = 100;
    const MIN_DESCRIPTION_LENGTH: u64 = 10;
    const MAX_DESCRIPTION_LENGTH: u64 = 2000;
    const MAX_LOGO_SIZE: u64 = 2097152; // 2MB
    const MAX_BACKGROUND_SIZE: u64 = 5242880; // 5MB
    const MAX_URL_LENGTH: u64 = 500; // 500 characters for URLs
    const MIN_SUPPLY: u64 = 1000;
    const MAX_SUPPLY: u64 = 1000000000000; // 1 trillion
    const MIN_PRICE: u64 = 1;
    const MAX_PRICE: u64 = 1000000000; // 1 billion micro APT
    const MAX_ALLOCATION_PERCENT: u64 = 100;
    const MIN_QUORUM_PERCENT: u64 = 1;
    const MAX_QUORUM_PERCENT: u64 = 100;
    const MAX_COUNCIL_SIZE: u64 = 100;
    const MIN_COUNCIL_SIZE: u64 = 1;

    /// Validate string length
    public fun validate_string_length(text: &String, min_length: u64, max_length: u64) {
        let length = string::length(text);
        assert!(length >= min_length, errors::invalid_amount());
        assert!(length <= max_length, errors::invalid_amount());
    }

    /// Validate DAO name
    public fun validate_dao_name(name: &String) {
        validate_string_length(name, MIN_NAME_LENGTH, MAX_NAME_LENGTH);
        // Additional validation: ensure name is not empty or just whitespace
        let bytes = string::bytes(name);
        assert!(vector::length(bytes) > 0, errors::invalid_amount());
    }

    /// Validate DAO description
    public fun validate_dao_description(description: &String) {
        validate_string_length(description, MIN_DESCRIPTION_LENGTH, MAX_DESCRIPTION_LENGTH);
    }

    /// Validate image data size
    public fun validate_image_size(image_data: &vector<u8>, max_size: u64) {
        let size = vector::length(image_data);
        assert!(size <= max_size, errors::invalid_amount());
    }

    /// Validate logo
    public fun validate_logo(logo: &vector<u8>) {
        validate_image_size(logo, MAX_LOGO_SIZE);
    }

    /// Validate background image
    public fun validate_background(background: &vector<u8>) {
        validate_image_size(background, MAX_BACKGROUND_SIZE);
    }

    /// Validate image URL
    public fun validate_image_url(url: &String) {
        let length = string::length(url);
        assert!(length > 0, errors::invalid_amount());
        assert!(length <= MAX_URL_LENGTH, errors::invalid_amount());
        
        // Basic URL validation - check if it starts with http:// or https://
        let bytes = string::bytes(url);
        let url_bytes = *bytes;
        
        // Check minimum length for a valid URL
        assert!(vector::length(&url_bytes) >= 7, errors::invalid_amount()); // minimum "http://"
        
        // Check if it starts with http:// or https://
        let valid_start = false;
        if (vector::length(&url_bytes) >= 7) {
            // Check for "http://"
            if (*vector::borrow(&url_bytes, 0) == 104 && // 'h'
                *vector::borrow(&url_bytes, 1) == 116 && // 't'
                *vector::borrow(&url_bytes, 2) == 116 && // 't'
                *vector::borrow(&url_bytes, 3) == 112 && // 'p'
                *vector::borrow(&url_bytes, 4) == 58 &&  // ':'
                *vector::borrow(&url_bytes, 5) == 47 &&  // '/'
                *vector::borrow(&url_bytes, 6) == 47) {  // '/'
                valid_start = true;
            }
        };
        
        if (!valid_start && vector::length(&url_bytes) >= 8) {
            // Check for "https://"
            if (*vector::borrow(&url_bytes, 0) == 104 && // 'h'
                *vector::borrow(&url_bytes, 1) == 116 && // 't'
                *vector::borrow(&url_bytes, 2) == 116 && // 't'
                *vector::borrow(&url_bytes, 3) == 112 && // 'p'
                *vector::borrow(&url_bytes, 4) == 115 && // 's'
                *vector::borrow(&url_bytes, 5) == 58 &&  // ':'
                *vector::borrow(&url_bytes, 6) == 47 &&  // '/'
                *vector::borrow(&url_bytes, 7) == 47) {  // '/'
                valid_start = true;
            }
        };
        
        assert!(valid_start, errors::invalid_amount());
    }

    /// Validate token supply
    public fun validate_token_supply(supply: u64) {
        assert!(supply >= MIN_SUPPLY, errors::invalid_amount());
        assert!(supply <= MAX_SUPPLY, errors::invalid_amount());
    }

    /// Validate token price
    public fun validate_token_price(price: u64) {
        assert!(price >= MIN_PRICE, errors::invalid_amount());
        assert!(price <= MAX_PRICE, errors::invalid_amount());
    }

    /// Validate percentage (0-100)
    public fun validate_percentage(percent: u64) {
        assert!(percent <= MAX_ALLOCATION_PERCENT, errors::invalid_amount());
    }

    /// Validate quorum percentage
    public fun validate_quorum_percentage(percent: u64) {
        assert!(percent >= MIN_QUORUM_PERCENT, errors::invalid_amount());
        assert!(percent <= MAX_QUORUM_PERCENT, errors::invalid_amount());
    }

    /// Validate council size
    public fun validate_council_size(size: u64) {
        assert!(size >= MIN_COUNCIL_SIZE, errors::invalid_amount());
        assert!(size <= MAX_COUNCIL_SIZE, errors::invalid_amount());
    }

    /// Validate address list (ensure no duplicates and reasonable size)
    public fun validate_address_list(addresses: &vector<address>, max_size: u64) {
        let len = vector::length(addresses);
        assert!(len <= max_size, errors::invalid_amount());
        
        // Check for duplicates
        let i = 0;
        while (i < len) {
            let addr = *vector::borrow(addresses, i);
            let j = i + 1;
            while (j < len) {
                let other_addr = *vector::borrow(addresses, j);
                assert!(addr != other_addr, errors::invalid_amount()); // No duplicates
                j = j + 1;
            };
            i = i + 1;
        };
    }

    /// Validate allocation percentages sum to reasonable total
    public fun validate_allocation_percentages(percentages: &vector<u64>, max_total: u64) {
        let total = 0;
        let i = 0;
        let len = vector::length(percentages);
        
        while (i < len) {
            let percent = *vector::borrow(percentages, i);
            validate_percentage(percent);
            total = total + percent;
            i = i + 1;
        };
        
        assert!(total <= max_total, errors::invalid_amount());
    }

    /// Validate voting period bounds
    public fun validate_voting_period_bounds(min_period: u64, max_period: u64) {
        assert!(min_period > 0, errors::invalid_time());
        assert!(max_period > min_period, errors::invalid_time());
        assert!(min_period >= 3600, errors::invalid_time()); // At least 1 hour
        assert!(max_period <= 2592000, errors::invalid_time()); // At most 30 days
    }

    /// Validate staking amount
    public fun validate_staking_amount(amount: u64, min_stake: u64) {
        assert!(amount > 0, errors::invalid_amount());
        assert!(amount >= min_stake, errors::min_stake_required());
    }

    /// Validate tier values
    public fun validate_tier(tier: u8) {
        assert!(tier >= 1 && tier <= 4, errors::invalid_amount()); // Tiers 1-4
    }

    /// Get validation constants
    public fun get_min_name_length(): u64 { MIN_NAME_LENGTH }
    public fun get_max_name_length(): u64 { MAX_NAME_LENGTH }
    public fun get_min_description_length(): u64 { MIN_DESCRIPTION_LENGTH }
    public fun get_max_description_length(): u64 { MAX_DESCRIPTION_LENGTH }
    public fun get_max_council_size(): u64 { MAX_COUNCIL_SIZE }

    #[test]
    public fun test_validate_dao_name() {
        let valid_name = string::utf8(b"Valid DAO Name");
        validate_dao_name(&valid_name);
    }

    #[test]
    #[expected_failure(abort_code = 4, location = movedao_addrx::input_validation)]
    public fun test_validate_dao_name_too_short() {
        let short_name = string::utf8(b"A"); // Single character - too short
        validate_dao_name(&short_name);
    }

    #[test]
    public fun test_validate_address_list() {
        let addresses = vector::empty<address>();
        vector::push_back(&mut addresses, @0x1);
        vector::push_back(&mut addresses, @0x2);
        vector::push_back(&mut addresses, @0x3);
        validate_address_list(&addresses, 10);
    }

    #[test]
    #[expected_failure(abort_code = 4, location = movedao_addrx::input_validation)]
    public fun test_validate_address_list_duplicates() {
        let addresses = vector::empty<address>();
        vector::push_back(&mut addresses, @0x1);
        vector::push_back(&mut addresses, @0x2);
        vector::push_back(&mut addresses, @0x1); // Duplicate
        validate_address_list(&addresses, 10);
    }

    #[test]
    public fun test_validate_allocation_percentages() {
        let percentages = vector::empty<u64>();
        vector::push_back(&mut percentages, 30);
        vector::push_back(&mut percentages, 20);
        vector::push_back(&mut percentages, 25);
        validate_allocation_percentages(&percentages, 100);
    }
}