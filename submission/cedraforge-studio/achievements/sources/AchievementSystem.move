module cedraforge::achievements {
    use std::signer;
    use std::string::{Self, String};
    use std::vector;
    use aptos_std::table::{Self, Table};
    use aptos_std::simple_map::{Self, SimpleMap};

    /// Achievement types
    const ACHIEVEMENT_FIRST_CONTRACT: u8 = 1;
    const ACHIEVEMENT_TEN_TEMPLATES: u8 = 2;
    const ACHIEVEMENT_DOC_GENERATED: u8 = 3;
    const ACHIEVEMENT_FIRST_DEPLOY: u8 = 4;
    const ACHIEVEMENT_COMMUNITY_CONTRIBUTOR: u8 = 5;

    /// Achievement points
    const POINTS_FIRST_CONTRACT: u64 = 100;
    const POINTS_TEN_TEMPLATES: u64 = 200;
    const POINTS_DOC_GENERATED: u64 = 50;
    const POINTS_FIRST_DEPLOY: u64 = 150;
    const POINTS_COMMUNITY_CONTRIBUTOR: u64 = 300;

    /// Achievement structure
    struct Achievement has store {
        achievement_type: u8,
        timestamp: u64,
        description: String,
        points: u64,
    }

    /// User achievement profile
    struct UserAchievements has key {
        achievements: vector<Achievement>,
        total_score: u64,
        achievement_count: u64,
        stats: SimpleMap<u8, u64>, // achievement_type -> count
    }

    /// Leaderboard entry
    struct LeaderboardEntry has store {
        user: address,
        score: u64,
        achievement_count: u64,
    }

    /// Achievement registry
    struct AchievementRegistry has key {
        leaderboard: Table<address, LeaderboardEntry>,
        total_users: u64,
    }

    /// Initialize achievement system
    public fun initialize(account: &signer) {
        let account_addr = signer::address_of(account);
        if (!exists<UserAchievements>(account_addr)) {
            move_to(account, UserAchievements {
                achievements: vector::empty(),
                total_score: 0,
                achievement_count: 0,
                stats: simple_map::create(),
            });
        }
        if (!exists<AchievementRegistry>(account_addr)) {
            move_to(account, AchievementRegistry {
                leaderboard: table::new(),
                total_users: 0,
            });
        }
    }

    /// Unlock an achievement
    public fun unlock_achievement(
        user_achievements: &mut UserAchievements,
        registry: &mut AchievementRegistry,
        achievement_type: u8,
        timestamp: u64,
        user: address,
    ): bool acquires UserAchievements, AchievementRegistry {
        // Check if already unlocked
        if (simple_map::contains_key(&user_achievements.stats, &achievement_type)) {
            return false
        };

        let (description, points) = get_achievement_info(achievement_type);
        
        let achievement = Achievement {
            achievement_type,
            timestamp,
            description,
            points,
        };

        vector::push_back(&mut user_achievements.achievements, achievement);
        user_achievements.total_score = user_achievements.total_score + points;
        user_achievements.achievement_count = user_achievements.achievement_count + 1;
        simple_map::add(&mut user_achievements.stats, achievement_type, 1);

        // Update leaderboard
        if (table::contains(&registry.leaderboard, user)) {
            let entry = table::borrow_mut(&mut registry.leaderboard, user);
            entry.score = user_achievements.total_score;
            entry.achievement_count = user_achievements.achievement_count;
        } else {
            table::add(&mut registry.leaderboard, user, LeaderboardEntry {
                user,
                score: user_achievements.total_score,
                achievement_count: user_achievements.achievement_count,
            });
            registry.total_users = registry.total_users + 1;
        };

        true
    }

    /// Get achievement info
    fun get_achievement_info(achievement_type: u8): (String, u64) {
        if (achievement_type == ACHIEVEMENT_FIRST_CONTRACT) {
            (string::utf8(b"First Contract Created"), POINTS_FIRST_CONTRACT)
        } else if (achievement_type == ACHIEVEMENT_TEN_TEMPLATES) {
            (string::utf8(b"Used 10 Templates"), POINTS_TEN_TEMPLATES)
        } else if (achievement_type == ACHIEVEMENT_DOC_GENERATED) {
            (string::utf8(b"Documentation Generated"), POINTS_DOC_GENERATED)
        } else if (achievement_type == ACHIEVEMENT_FIRST_DEPLOY) {
            (string::utf8(b"First Contract Deployed"), POINTS_FIRST_DEPLOY)
        } else if (achievement_type == ACHIEVEMENT_COMMUNITY_CONTRIBUTOR) {
            (string::utf8(b"Community Contributor"), POINTS_COMMUNITY_CONTRIBUTOR)
        } else {
            (string::utf8(b"Unknown Achievement"), 0)
        }
    }

    /// Get user score
    public fun get_user_score(user_achievements: &UserAchievements): u64 {
        user_achievements.total_score
    }

    /// Get user achievement count
    public fun get_achievement_count(user_achievements: &UserAchievements): u64 {
        user_achievements.achievement_count
    }

    /// Get leaderboard entry
    public fun get_leaderboard_entry(registry: &AchievementRegistry, user: address): (u64, u64) acquires AchievementRegistry {
        if (table::contains(&registry.leaderboard, user)) {
            let entry = table::borrow(&registry.leaderboard, user);
            (entry.score, entry.achievement_count)
        } else {
            (0, 0)
        }
    }

    /// Get total users
    public fun get_total_users(registry: &AchievementRegistry): u64 {
        registry.total_users
    }
}

