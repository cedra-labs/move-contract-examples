# Referral Basic - Basic Referral Tracking System

A simple and secure referral tracking system built on Cedra Move that allows users to register referral codes, track referrals, and claim rewards with built-in anti-gaming measures.

## Features

- **Register Referral Codes**: Users can register unique referral codes
- **Track Referrals**: System tracks when someone uses a referral code
- **Claim Rewards**: Referral code owners can claim their accumulated rewards
- **Anti-Gaming Measures**: 
  - Prevents self-referrals
  - Prevents duplicate referral codes
  - Prevents duplicate referrals from the same address
  - Validates referral code format (length constraints)

## Prerequisites

- [CLI](https://docs.cedra.network/getting-started/cli) (v1.0.0 or later)
- [Node.js](https://nodejs.org/) LTS version (v16.x or later)
- [pnpm](https://pnpm.io/) (v6.x or later)

## Project Structure

- `/contract` - Move contract for referral tracking system
- `/client` - TypeScript client application

## Deploying the Contract

1. Configure CLI with your account:

```bash
cd contract
cedra init
```

2. Compile the contract:

```bash
cedra move compile --named-addresses ReferralBasic=default
```

3. Publish the contract:

```bash
cedra move publish --named-addresses ReferralBasic=default
```

4. Get your account address:

```bash
cedra account list --query modules
```

## Setting Up and Running the Client

1. Navigate to the client directory:

```bash
cd client
```

2. Install dependencies:

```bash
pnpm install
```

3. Update configuration in `src/index.ts`:

```typescript
const MODULE_ADDRESS = "_"; // Replace with your deployed address
const ADMIN_PRIVATE_KEY = "_"; // Your admin private key
```

4. Run the client:

```bash
pnpm run start
```

## Contract Functions

### `register_referral_code(user: &signer, code: String)`
Registers a new referral code for the caller. The code must be unique and between 3-20 characters long. Each user can only have one referral code.

**Anti-gaming**: 
- Prevents duplicate codes
- Validates code length
- Prevents users from registering multiple codes

### `track_referral(referee: &signer, referral_code: String)`
Records a referral when someone uses a referral code. Creates a referral record and updates the referrer's statistics.

**Anti-gaming**:
- Prevents self-referrals (users cannot refer themselves)
- Prevents duplicate referrals (each address can only be referred once)

### `claim_rewards(owner: &signer)`
Allows a referral code owner to claim their accumulated rewards. Marks all unclaimed referral records as claimed.

**Note**: In a production implementation, this function would transfer actual coins/assets to the owner. This basic version only marks rewards as claimed.

### View Functions

- `get_referral_code_info(code: String)`: Returns referral code information (code, owner, total referrals, total rewards)
- `get_code_by_owner(owner: address)`: Returns the referral code and statistics for a given owner address
- `get_unclaimed_rewards(owner: address)`: Returns the total unclaimed rewards for an address
- `code_exists(code: String)`: Checks if a referral code exists
- `has_referral_code(owner: address)`: Checks if an address has registered a referral code
- `get_total_codes()`: Returns the total number of registered referral codes
- `get_total_records()`: Returns the total number of referral records

## Anti-Gaming Measures

The contract implements several anti-gaming measures to ensure fair referral tracking:

### 1. Self-Referral Prevention
Users cannot refer themselves using their own referral code. The contract checks if the referrer and referee addresses are the same.

### 2. Duplicate Code Prevention
Each referral code must be unique. The contract maintains a mapping of codes to prevent duplicates.

### 3. Duplicate Referral Prevention
Each address can only be referred once. The contract checks if an address already has a referral record before creating a new one.

### 4. Code Format Validation
Referral codes must be between 3-20 characters long to prevent abuse and ensure reasonable code lengths.

### 5. Single Code Per User
Each user can only register one referral code, preventing users from creating multiple codes to game the system.

## Example Usage

The client demonstrates:
1. Registering referral codes for multiple users
2. Tracking referrals when users sign up
3. Checking unclaimed rewards
4. Claiming rewards
5. Testing anti-gaming measures (duplicate codes, self-referrals, duplicate referrals)

## Testing

Run the Move tests:

```bash
cd contract
cedra move test --named-addresses ReferralBasic=0xcafe
```

## Limitations and Considerations

⚠️ **Reward Distribution**: This is a basic referral contract that tracks rewards but does not handle actual coin/asset transfers. In a production implementation, you would need to:
- Integrate with coin/asset transfers for reward distribution
- Implement a reward pool or treasury
- Add time-based reward release mechanisms
- Implement reward tiers or multipliers

⚠️ **Code Validation**: The current implementation only validates code length. For production, consider:
- Alphanumeric-only validation
- Reserved word filtering
- Case-insensitive matching

⚠️ **Timestamp**: The contract uses placeholder timestamps (0). In production, integrate with transaction context or timestamp module for accurate tracking.

## Recommended Enhancements for Production

For a production referral system, consider:

1. **Payment Integration**: Add coin/asset transfers for reward distribution
2. **Reward Tiers**: Implement different reward amounts based on referral count
3. **Time-based Rewards**: Add vesting or time-locked rewards
4. **Multi-level Referrals**: Support for referral chains (referrer's referrer)
5. **Analytics**: Enhanced view functions for referral analytics
6. **Code Expiration**: Add expiration dates for referral codes
7. **Minimum Activity Requirements**: Require referees to perform certain actions before rewards are unlocked

## License

MIT

