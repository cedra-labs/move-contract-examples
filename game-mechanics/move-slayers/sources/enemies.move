/// Enemies module - Defines enemy types, combat mechanics, and spawning
module move_slayers::enemies {
    use std::string::{Self, String};

    // ==================== Structs ====================

    /// Represents an enemy with combat stats and rewards
    struct Enemy has copy, drop, store {
        name: String,
        health: u64,
        attack: u64,
        exp_reward: u64,
    }

    // ==================== Enemy Spawning ====================

    /// Spawn a weak early-game enemy (Boar)
    /// Health: 30, Attack: 5, EXP: 50
    public fun spawn_boar(): Enemy {
        Enemy {
            name: string::utf8(b"Boar"),
            health: 30,
            attack: 5,
            exp_reward: 50,
        }
    }

    /// Spawn a medium-difficulty enemy (Wolf)
    /// Health: 50, Attack: 10, EXP: 100
    public fun spawn_wolf(): Enemy {
        Enemy {
            name: string::utf8(b"Wolf"),
            health: 50,
            attack: 10,
            exp_reward: 100,
        }
    }

    /// Spawn a strong enemy (Orc)
    /// Health: 80, Attack: 15, EXP: 200
    public fun spawn_orc(): Enemy {
        Enemy {
            name: string::utf8(b"Orc"),
            health: 80,
            attack: 15,
            exp_reward: 200,
        }
    }

    /// Spawn a tough mid-game enemy (Troll)
    /// Health: 120, Attack: 20, EXP: 350
    public fun spawn_troll(): Enemy {
        Enemy {
            name: string::utf8(b"Troll"),
            health: 120,
            attack: 20,
            exp_reward: 350,
        }
    }

    /// Spawn a dangerous enemy (Drake)
    /// Health: 180, Attack: 30, EXP: 600
    public fun spawn_drake(): Enemy {
        Enemy {
            name: string::utf8(b"Drake"),
            health: 180,
            attack: 30,
            exp_reward: 600,
        }
    }

    /// Spawn the ultimate boss enemy (Dragon)
    /// Health: 300, Attack: 50, EXP: 1000
    public fun spawn_dragon(): Enemy {
        Enemy {
            name: string::utf8(b"Dragon"),
            health: 300,
            attack: 50,
            exp_reward: 1000,
        }
    }

    // ==================== Combat Mechanics ====================

    /// Apply damage to the enemy
    /// Returns true if enemy is killed (health <= 0), false otherwise
    public fun take_damage(enemy: &mut Enemy, amount: u64): bool {
        if (enemy.health <= amount) {
            enemy.health = 0;
            true
        } else {
            enemy.health = enemy.health - amount;
            false
        }
    }

    // ==================== View Functions ====================

    /// Get enemy's current health
    public fun get_health(enemy: &Enemy): u64 {
        enemy.health
    }

    /// Get enemy's attack power
    public fun get_attack(enemy: &Enemy): u64 {
        enemy.attack
    }

    /// Get enemy's experience reward
    public fun get_exp_reward(enemy: &Enemy): u64 {
        enemy.exp_reward
    }

    /// Get enemy's name
    public fun get_name(enemy: &Enemy): &String {
        &enemy.name
    }

    /// Check if enemy is alive
    public fun is_alive(enemy: &Enemy): bool {
        enemy.health > 0
    }

    // ==================== Factory Function (for testing) ====================

    /// Create a custom enemy with specified stats
    /// Useful for testing and future expansion
    public fun make_enemy(
        name: String,
        health: u64,
        attack: u64,
        exp_reward: u64
    ): Enemy {
        Enemy { name, health, attack, exp_reward }
    }
}
