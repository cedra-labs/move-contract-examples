module cedraforge::template_registry {
    use std::signer;
    use std::string::{Self, String};
    use std::vector;
    use aptos_std::table::{Self, Table};
    use aptos_std::simple_map::{Self, SimpleMap};

    /// Error codes
    const E_TEMPLATE_NOT_FOUND: u64 = 1;
    const E_UNAUTHORIZED: u64 = 2;
    const E_INVALID_RATING: u64 = 3;

    /// Template structure
    struct Template has store {
        id: u64,
        name: String,
        description: String,
        code: vector<u8>,
        author: address,
        rating_sum: u64,
        rating_count: u64,
        downloads: u64,
        category: String,
        tags: vector<String>,
    }

    /// Template registry
    struct TemplateRegistry has key {
        templates: Table<u64, Template>,
        next_id: u64,
        template_count: u64,
    }

    /// User ratings
    struct UserRatings has key {
        ratings: SimpleMap<u64, u8>, // template_id -> rating (1-5)
    }

    /// Initialize template registry
    public fun initialize(account: &signer) {
        let account_addr = signer::address_of(account);
        if (!exists<TemplateRegistry>(account_addr)) {
            move_to(account, TemplateRegistry {
                templates: table::new(),
                next_id: 1,
                template_count: 0,
            });
        }
        if (!exists<UserRatings>(account_addr)) {
            move_to(account, UserRatings {
                ratings: simple_map::create(),
            });
        }
    }

    /// Register a new template
    public fun register_template(
        registry: &mut TemplateRegistry,
        name: String,
        description: String,
        code: vector<u8>,
        category: String,
        tags: vector<String>,
        author: signer,
    ): u64 acquires TemplateRegistry {
        let id = registry.next_id;
        let author_addr = signer::address_of(&author);
        
        let template = Template {
            id,
            name,
            description,
            code,
            author: author_addr,
            rating_sum: 0,
            rating_count: 0,
            downloads: 0,
            category,
            tags,
        };
        
        table::add(&mut registry.templates, id, template);
        registry.next_id = id + 1;
        registry.template_count = registry.template_count + 1;
        
        id
    }

    /// Get template by ID
    public fun get_template(registry: &TemplateRegistry, id: u64): (String, String, vector<u8>, address, u64, u64, String, vector<String>) acquires TemplateRegistry {
        assert!(table::contains(&registry.templates, id), E_TEMPLATE_NOT_FOUND);
        let template = table::borrow(&registry.templates, id);
        (
            *&template.name,
            *&template.description,
            *&template.code,
            template.author,
            template.rating_sum,
            template.rating_count,
            *&template.category,
            *&template.tags,
        )
    }

    /// Rate a template (1-5 stars)
    public fun rate_template(
        registry: &mut TemplateRegistry,
        user_ratings: &mut UserRatings,
        template_id: u64,
        rating: u8,
    ) acquires TemplateRegistry, UserRatings {
        assert!(table::contains(&registry.templates, template_id), E_TEMPLATE_NOT_FOUND);
        assert!(rating >= 1 && rating <= 5, E_INVALID_RATING);
        
        // Remove old rating if exists
        if (simple_map::contains_key(&user_ratings.ratings, &template_id)) {
            let old_rating = *simple_map::borrow(&user_ratings.ratings, &template_id);
            let template = table::borrow_mut(&mut registry.templates, template_id);
            template.rating_sum = template.rating_sum - (old_rating as u64);
            template.rating_count = template.rating_count - 1;
        };
        
        // Add new rating
        let template = table::borrow_mut(&mut registry.templates, template_id);
        template.rating_sum = template.rating_sum + (rating as u64);
        template.rating_count = template.rating_count + 1;
        
        simple_map::add(&mut user_ratings.ratings, template_id, rating);
    }

    /// Download/increment download count
    public fun download_template(registry: &mut TemplateRegistry, template_id: u64) acquires TemplateRegistry {
        assert!(table::contains(&registry.templates, template_id), E_TEMPLATE_NOT_FOUND);
        let template = table::borrow_mut(&mut registry.templates, template_id);
        template.downloads = template.downloads + 1;
    }

    /// Get template count
    public fun get_template_count(registry: &TemplateRegistry): u64 {
        registry.template_count
    }

    /// Get average rating for a template
    public fun get_average_rating(registry: &TemplateRegistry, template_id: u64): u64 acquires TemplateRegistry {
        assert!(table::contains(&registry.templates, template_id), E_TEMPLATE_NOT_FOUND);
        let template = table::borrow(&registry.templates, template_id);
        if (template.rating_count == 0) {
            return 0
        };
        template.rating_sum / template.rating_count
    }
}

