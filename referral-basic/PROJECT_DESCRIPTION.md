# Referral Basic - Project Description

## What Was Built

A basic referral tracking system built on Cedra Move blockchain that allows users to register referral codes, track referrals, and claim rewards. The system implements comprehensive anti-gaming measures to ensure fair and secure referral tracking.

### Key Features

- **Register Referral Codes**: Users can register unique referral codes (3-20 characters)
- **Track Referrals**: System tracks when someone uses a referral code
- **Claim Rewards**: Referral code owners can claim their accumulated rewards
- **Anti-Gaming Measures**: Multiple layers of protection against gaming the system
- **View Functions**: Comprehensive view functions to query referral state and statistics
- **TypeScript Client**: Complete client implementation demonstrating all functionality

### Technical Implementation

- **Smart Contract**: Move contract using Cedra framework with object-based state management
- **Anti-Gaming**: Multiple measures including self-referral prevention, duplicate prevention, and code validation
- **Error Handling**: Comprehensive error codes for all failure scenarios
- **State Management**: Efficient mapping structures for code and address lookups

### Anti-Gaming Measures

1. **Self-Referral Prevention**: Users cannot refer themselves using their own code
2. **Duplicate Code Prevention**: Each referral code must be unique
3. **Duplicate Referral Prevention**: Each address can only be referred once
4. **Code Format Validation**: Codes must be 3-20 characters long
5. **Single Code Per User**: Each user can only register one referral code

## Task Issue

🔗 **Issue Link**: [Add your issue/PR link here]
<!-- Example: https://github.com/cedra-labs/move-contract-examples/issues/XX -->
<!-- Or: https://github.com/cedra-labs/move-contract-examples/pull/XX -->

## Testing Instructions

### Prerequisites

Before running tests, ensure you have:

1. **Cedra CLI** installed (v1.0.0 or later)
   - Installation: https://docs.cedra.network/getting-started/cli

2. **Node.js** LTS version (v16.x or later)
   - Download: https://nodejs.org/

3. **pnpm** (v6.x or later) - for client dependencies
   - Installation: `npm install -g pnpm`

### Running Move Unit Tests

1. Navigate to the contract directory:
   ```bash
   cd referral-basic/contract
   ```

2. Run the test suite:
   ```bash
   cedra move test --named-addresses ReferralBasic=0xcafe
   ```

3. Expected output:
   ```
   [ PASS    ] 0xcafe::ReferralTest::test_register_referral_code
   [ PASS    ] 0xcafe::ReferralTest::test_track_referral
   [ PASS    ] 0xcafe::ReferralTest::test_claim_rewards
   [ PASS    ] 0xcafe::ReferralTest::test_self_referral_prevention
   [ PASS    ] 0xcafe::ReferralTest::test_duplicate_code_prevention
   [ PASS    ] 0xcafe::ReferralTest::test_duplicate_referral_prevention
   Test result: OK. Total tests: X; passed: X; failed: 0
   ```

### Test Coverage

The test suite includes:

- ✅ **Basic Functionality**: Code registration, referral tracking, reward claiming
- ✅ **Anti-Gaming**: Self-referral prevention, duplicate code prevention, duplicate referral prevention
- ✅ **Edge Cases**: Invalid codes, non-existent codes, no rewards to claim
- ✅ **State Management**: Multiple codes, multiple referrals
- ✅ **Error Handling**: All error conditions are tested

### Running the TypeScript Client

1. Navigate to the client directory:
   ```bash
   cd referral-basic/client
   ```

2. Install dependencies:
   ```bash
   pnpm install
   ```

3. Configure the client:
   - Open `src/index.ts`
   - Set `MODULE_ADDRESS` to your deployed contract address
   - Set `ADMIN_PRIVATE_KEY` via environment variable or replace `"_"` with your admin private key

4. Run the client:
   ```bash
   pnpm run start
   ```

The client will:
- Register referral codes for multiple users
- Track referrals when users sign up
- Check unclaimed rewards
- Claim rewards
- Test anti-gaming measures (duplicate codes, self-referrals, duplicate referrals)

## Dependencies and Setup

### Contract Dependencies

The contract depends on:

- **CedraFramework**: Core framework for object management
  - Source: `https://github.com/cedra-labs/cedra-framework.git`
  - Subdirectory: `cedra-framework`
  - Branch: `main`

These are automatically resolved via `Move.toml`:

```toml
[dependencies]
CedraFramework = { git = "https://github.com/cedra-labs/cedra-framework.git", subdir = "cedra-framework", rev = "main" }
```

### Client Dependencies

The TypeScript client requires:

- **@cedra-labs/ts-sdk**: Cedra TypeScript SDK for blockchain interaction
  - Automatically installed via `pnpm install`

See `client/package.json` for the complete dependency list.

### Setup Steps

#### 1. Contract Setup

```bash
cd referral-basic/contract
```

**Initial Setup (First Time Only):**
```bash
cedra init
```

**Compile:**
```bash
cedra move compile --named-addresses ReferralBasic=default
```

**Publish:**
```bash
cedra move publish --named-addresses ReferralBasic=default
```

**Get Deployed Address:**
```bash
cedra account list --query modules
```

#### 2. Client Setup

```bash
cd referral-basic/client
```

**Install Dependencies:**
```bash
pnpm install
```

**Configure:**
- Update `MODULE_ADDRESS` in `src/index.ts` with your deployed contract address
- Set `ADMIN_PRIVATE_KEY` environment variable or update the code:
  ```typescript
  const ADMIN_PRIVATE_KEY = process.env.ADMIN_PRIVATE_KEY || "your_private_key_here";
  ```

**Run:**
```bash
pnpm run start
```

### Environment Variables

For production use, set the following environment variable:

```bash
export ADMIN_PRIVATE_KEY="your_admin_private_key_here"
```

Or on Windows PowerShell:
```powershell
$env:ADMIN_PRIVATE_KEY="your_admin_private_key_here"
```

### Network Configuration

The client is configured for **Cedra Testnet** by default:
- Fullnode: `https://testnet.cedra.dev/v1`
- Network: `Network.TESTNET`

To use a different network, update the configuration in `client/src/index.ts`.

## Project Structure

```
referral-basic/
├── contract/
│   ├── sources/
│   │   └── referral.move          # Main contract implementation
│   ├── Move.toml                   # Move package configuration
│   └── .gitignore                  # Build artifacts to ignore
├── client/
│   ├── src/
│   │   └── index.ts                # TypeScript client example
│   ├── package.json                # Node.js dependencies
│   ├── tsconfig.json               # TypeScript configuration
│   └── .gitignore                  # Node.js artifacts to ignore
├── README.md                       # Comprehensive documentation
└── .gitignore                      # Root-level gitignore
```

## Additional Resources

- **Full Documentation**: See `README.md` for complete documentation
- **Anti-Gaming Documentation**: Detailed explanation of anti-gaming measures in README
- **API Reference**: All contract functions documented in README

## Notes

- All anti-gaming measures implemented ✅
- No hardcoded private keys ✅
- Production-ready code quality ✅
- Comprehensive error handling ✅
- Full test coverage ✅

