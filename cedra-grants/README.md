# CedraGrants - Public Goods Funding Protocol

A comprehensive on-chain public goods funding protocol for Cedra blockchain featuring Quadratic Funding, Retroactive Public Goods Funding (RPGF), and VRF-based anti-sybil protection.

## Overview

CedraGrants brings Gitcoin-style quadratic funding to the Cedra ecosystem, leveraging Cedra-unique features:

- **Native VRF Randomness** - Uses `cedra_framework::randomness` for fair verification lottery
- **Built-in Indexer Integration** - 13 events for real-time data streaming
- **TypeScript SDK Ready** - Frontend integration with `@cedra-labs/ts-sdk`

## Features

| Module | Description |
|--------|-------------|
| `registry.move` | Project registration & lifecycle management |
| `quadratic_funding.move` | QF matching engine with configurable rounds |
| `sybil_resistance.move` | VRF-based verification lottery |
| `rpgf.move` | Retroactive public goods funding with weighted voting |
| `milestone_tracker.move` | Community-verified milestone approval |

## Installation

```bash
# Clone the repository
git clone https://github.com/himanshu-sugha/CedraGrants.git
cd CedraGrants/contracts

# Compile
cedra move compile --named-addresses cedra_grants=default

# Test
cedra move test --named-addresses cedra_grants=default
```

## Usage

### 1. Register a Project
```move
cedra_grants::registry::register_project(
    name,
    description,
    website_url,
    github_url,
    funding_goal,
    milestone_titles,
    milestone_descriptions,
    milestone_amounts,
    milestone_deadlines,
    tags
);
```

### 2. Contribute to QF Round
```move
cedra_grants::quadratic_funding::contribute(
    round_id,
    project_address,
    amount
);
```

### 3. Cast RPGF Votes
```move
cedra_grants::rpgf::cast_votes(
    round_id,
    nomination_ids,
    weights  // Must sum to 10000 (100%)
);
```

## Key Concepts

### Quadratic Funding Formula
Matching = (Σ√contributions)² - Σcontributions

### VRF Anti-Sybil
Uses `#[randomness]` attribute to select random contributors for verification, preventing sybil attacks.

### Milestone Verification
Community votes on milestone completion; requires minimum 60% approval from 3+ voters.

## Testing

Unit tests are located in `sources/tests/`:
- `registry_tests.move`
- `quadratic_funding_tests.move` 
- `sybil_resistance_tests.move`
- `rpgf_tests.move`
- `milestone_tracker_tests.move`

Run tests:
```bash
cedra move test --named-addresses cedra_grants=default
```

## Dependencies

- CedraFramework (v1.0.0+)

## Project Structure

```
cedra-grants/
├── Move.toml
├── README.md
└── sources/
    ├── registry.move
    ├── quadratic_funding.move
    ├── sybil_resistance.move
    ├── rpgf.move
    ├── milestone_tracker.move
    └── tests/
        └── *_tests.move
```

## Links

- **Full Project with Frontend**: https://github.com/himanshu-sugha/CedraGrants
- **Cedra Docs**: https://docs.cedra.network

## License

MIT

---

Built for **Cedra Builders Forge Hackathon** | Forge fast. Move Smart.
