# CedraForge Studio - Builders Forge Submission

## Overview

**CedraForge Studio** is an interactive, gamified development environment for building Move smart contracts on Cedra. This submission includes the core Move smart contracts that power the template registry and achievement system.

## Project Details

- **Hackathon:** Cedra Builders Forge
- **Platform:** DoraHacks
- **Submission Date:** December 2025
- **Repository:** https://github.com/34r7h/CedraForge-Studio

## Smart Contracts

### 1. Template Registry (`template_registry`)

A decentralized registry for Move contract templates that enables:
- Template registration and storage
- Community ratings (1-5 stars)
- Download tracking
- Category and tag organization
- Template discovery and sharing

**Key Features:**
- `register_template()` - Register new contract templates
- `get_template()` - Retrieve template details
- `rate_template()` - Rate templates with 1-5 stars
- `download_template()` - Track template downloads
- `get_average_rating()` - Get average rating for templates

### 2. Achievement System (`achievements`)

A gamification system that tracks developer achievements and maintains leaderboards:
- Achievement unlocking for milestones
- Point-based scoring system
- Global leaderboard
- User achievement profiles

**Achievement Types:**
- First Contract Created (100 points)
- Used 10 Templates (200 points)
- Documentation Generated (50 points)
- First Contract Deployed (150 points)
- Community Contributor (300 points)

**Key Features:**
- `unlock_achievement()` - Unlock achievements for users
- `get_user_score()` - Get user's total score
- `get_leaderboard_entry()` - Get leaderboard position
- `get_total_users()` - Get total users in system

## Contract Structure

```
cedraforge-studio/
├── Move.toml
├── template_registry/
│   └── sources/
│       └── TemplateRegistry.move
└── achievements/
    └── sources/
        └── AchievementSystem.move
```

## Usage

### Initialize Contracts

```move
// Initialize template registry
template_registry::initialize(account);

// Initialize achievement system
achievements::initialize(account);
```

### Register a Template

```move
let template_id = template_registry::register_template(
    &mut registry,
    name,
    description,
    code,
    category,
    tags,
    author
);
```

### Unlock Achievement

```move
achievements::unlock_achievement(
    &mut user_achievements,
    &mut registry,
    achievement_type,
    timestamp,
    user_address
);
```

## Technical Details

- **Language:** Move
- **Framework:** Aptos Framework
- **Dependencies:** AptosFramework, AptosStdlib
- **Address:** `cedraforge = "_"` (to be set during deployment)

## Features

✅ Template registration and management
✅ Community rating system
✅ Download tracking
✅ Achievement system with points
✅ Leaderboard functionality
✅ Category and tag organization
✅ User achievement profiles

## Public Goods Contribution

This project contributes to the Cedra ecosystem as a public good by:
- Providing reusable Move contract templates
- Enabling community-driven template sharing
- Gamifying the development experience
- Building infrastructure for developer tools
- Creating documentation and examples

## License

This code is original and created for the Cedra Builders Forge hackathon.

## Contact

- **Telegram:** https://t.me/+Ba3QXd0VG9U0Mzky
- **DoraHacks:** https://dorahacks.io/hackathon/cedranetwork/ideaism

