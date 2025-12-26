# Basic Referral Tracking Contract

A comprehensive referral tracking system built on Cedra blockchain with Move smart contracts and a TypeScript/React frontend. This contract enables users to create unique referral codes, track referrals, earn rewards, and claim them through a secure on-chain treasury system.

## 📋 Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
- [Installation & Setup](#installation--setup)
- [Testing](#testing)
- [Deployment](#deployment)
- [Frontend Usage](#frontend-usage)
- [Smart Contract API](#smart-contract-api)
- [Anti-Gaming Measures](#anti-gaming-measures)
- [Project Structure](#project-structure)

## ✨ Features

### Core Functionality
- ✅ **Register Referral Codes**: Users can create unique alphanumeric referral codes (3-20 characters)
- ✅ **Track Referral Rewards**: Automatic reward tracking when referral codes are used
- ✅ **Claim Rewards Function**: Users can claim earned rewards from the treasury
- ✅ **Anti-Gaming Measures**: Built-in protections against abuse and gaming

### Additional Features
- 🔐 **Admin Controls**: Initialize system, deposit rewards, and manage treasury
- 💰 **Flexible Claims**: Users can claim partial or full amounts from pending rewards
- 📊 **Comprehensive Stats**: Real-time tracking of user stats, treasury balance, and global metrics
- 🎨 **Modern Frontend**: Full-featured React UI with Tailwind CSS and wallet integration
- 🔒 **Secure Treasury**: Object-based treasury with fungible asset support

## 🏗 Architecture

### Smart Contract Components

```
ReferralConfig (Global)
├── admin: address
├── reward_token: Object<Metadata>
├── is_active: bool
└── total_rewards_paid: u64

CodeRegistry (Global)
└── code_to_address: Table<vector<u8>, address>

Treasury (Object)
├── reward_token: Object<Metadata>
├── treasury_store: Object<FungibleStore>
├── extend_ref: ExtendRef
└── total_deposited: u64

UserReferral (Per-User)
├── referral_code: vector<u8>
├── referrer: address
├── referred_count: u64
├── pending_rewards: u64
└── total_earned: u64
```

### Frontend Architecture

```
frontend/
├── src/
│   ├── app/
│   │   ├── home.tsx (User dashboard)
│   │   └── admin.tsx (Admin panel with access control)
│   ├── contexts/
│   │   ├── WalletProvider.tsx (Wallet state management)
│   │   └── useWallet.tsx (Wallet hook)
│   ├── components/
│   │   └── WalletSelectorModal.tsx (Wallet selection UI)
│   └── utils/
│       └── contract.ts (Blockchain interaction layer)
```

## 📦 Prerequisites

### For Smart Contract Development
- **Cedra CLI**: Install from [Cedra Installation Guide](https://docs.cedra.dev/cli-tools/install-cedra-cli)
- **Move Compiler**: Included with Cedra CLI
- **Git**: For cloning dependencies

### For Frontend Development
- **Node.js**: v18 or higher
- **npm**: v9 or higher
- **Zedra Wallet**: Browser extension for testing (https://chromewebstore.google.com/detail/zedra-wallet/pbeefngmcchkcibdodceimammkigfanl)

### 🔧 Required Dependencies

Make sure these are in your `package.json`:

```json
{
  "dependencies": {
    "@cedra-labs/cedra-client",
    "@cedra-labs/ts-sdk",
    "@cedra-labs/wallet-adapter-core",
    "@cedra-labs/wallet-adapter-plugin",
    "framer-motion",
    "react",
    "react-dom",
    "sonner",
    "tailwindcss"
  }
}
```

### System Requirements
- Windows, macOS, or Linux
- Internet connection for package downloads

## 🚀 Installation & Setup

### 1. Clone the Repository

```bash
cd "Basic Referral Tracking Contract"
```

### 2. Smart Contract Setup

```bash
cd contract

# Initialize Cedra if not done already
cedra init

# Compile the contract
cedra move compile --dev
```

**Expected Output:**
```
Compiling, may take a little while to download git dependencies...
INCLUDING DEPENDENCY CedraFramework
INCLUDING DEPENDENCY CedraStdlib
INCLUDING DEPENDENCY MoveStdlib
BUILDING referral
{
  "Result": ["a70ab9dee1718542ee91aedd3d062122d079053dc42baafda601823b2ba732da::referral_tracking"]
}
```

### 3. Frontend Setup

```bash
cd ../frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

**Expected Output:**
```
  VITE v5.x.x  ready in xxx ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

## 🧪 Testing

### Run Smart Contract Tests

```bash
cd contract

# Run all tests
cedra move test

# Run tests with verbose output
cedra move test --verbose

# Run specific test
cedra move test --filter test_register_code_success
```

### Test Coverage

Our test suite includes **23 comprehensive tests** covering:

1. **Initialization Tests** (3 tests)
   - Successful initialization
   - Duplicate initialization prevention
   - Stats retrieval

2. **Code Registration Tests** (7 tests)
   - Successful registration
   - Duplicate code prevention
   - Invalid code formats
   - Length validations

3. **Referral Usage Tests** (6 tests)
   - Valid referral code usage
   - Self-referral prevention
   - Invalid code handling
   - Duplicate registration prevention

4. **Reward Claiming Tests** (4 tests)
   - Successful partial claims
   - Full reward claims
   - Insufficient reward handling
   - Zero amount prevention

5. **Admin Operations Tests** (2 tests)
   - Treasury deposit functionality
   - Balance tracking

6. **View Function Tests** (1 test)
   - User stats retrieval

**Expected Test Output:**
```
Running Move unit tests
[ PASS    ] 0x123::referral_tracking_test::test_initialize_success
[ PASS    ] 0x123::referral_tracking_test::test_register_code_success
...
Test result: OK. Total tests: 23; passed: 23; failed: 0
```

## 📤 Deployment

### 1. Prepare for Deployment

```bash
cd contract

# Ensure you have a funded account
cedra account fund-with-faucet
```

### 2. Deploy to Testnet

```bash
# Publish with named addresses
cedra move publish --named-addresses module_addr=<YOUR_ADDRESS>
```

**Example:**
```bash
cedra move publish --named-addresses module_addr=0xa70ab9dee1718542ee91aedd3d062122d079053dc42baafda601823b2ba732da
```

### 3. Initialize the Contract

After deployment, initialize via:
- **Admin Panel**: Navigate to `/admin` and use the initialization form
- **CLI**: Use `cedra move run` with the `initialize` function

```bash
cedra move run \
  --function-id <YOUR_ADDRESS>::referral_tracking::initialize \
  --args object:0x000000000000000000000000000000000000000000000000000000000000000a
```

**Note**: `0xa` is the metadata address for Cedra Fungible Asset (CFA). Use the full 64-character format.

### 4. Configure Frontend

Update `frontend/src/utils/contract.ts`:

```typescript
const MODULE_ADDRESS = 'YOUR_DEPLOYED_ADDRESS';
const MODULE_NAME = 'referral_tracking';
```

## 💻 Frontend Usage

### User Dashboard (`/`)

**Features:**
1. **Wallet Connection**: Connect Cedra-compatible wallets
2. **Register Referral Code**: Create your unique code
3. **Use Referral Code**: Register with someone's code
4. **View Stats**: See pending rewards, total earned, and referral count
5. **Claim Rewards**: Claim partial or all pending rewards
6. **Copy Referral Link**: Share your referral link

**User Flow:**
```
1. Connect Wallet → 2. Register Code → 3. Share Link → 4. Earn Rewards → 5. Claim Rewards
```

### Admin Panel (`/admin`)

**Features:**
1. **Address Validation**: Only contract admin can access
2. **Initialize Contract**: One-time setup with reward token
3. **Deposit Rewards**: Fund treasury with tokens
4. **View Stats**: Monitor treasury balance, total paid, system status

**Admin Flow:**
```
1. Deploy Contract → 2. Access /admin → 3. Initialize → 4. Deposit Rewards
```

## 📚 Smart Contract API

### Entry Functions (Write Operations)

#### `initialize(admin: &signer, reward_token: Object<Metadata>)`
Initializes the referral system (one-time operation).

**Parameters:**
- `admin`: Signer reference (must be contract deployer)
- `reward_token`: Fungible asset metadata object for rewards

**Errors:**
- `E_NOT_INITIALIZED`: If already initialized

**Example:**
```move
referral_tracking::initialize(admin, reward_token_metadata);
```

---

#### `register_code(user: &signer, code: vector<u8>)`
Registers a unique referral code for a user.

**Parameters:**
- `user`: Signer reference
- `code`: Referral code (3-20 alphanumeric characters)

**Errors:**
- `E_CODE_TOO_SHORT`: Code < 3 characters
- `E_CODE_TOO_LONG`: Code > 20 characters
- `E_CODE_ALREADY_EXISTS`: Code already taken
- `E_INVALID_CODE_CHAR`: Non-alphanumeric characters
- `E_CODE_ALREADY_SET`: User already has a code

**Example:**
```move
referral_tracking::register_code(user, b"MYCODE123");
```

---

#### `register_with_code(user: &signer, referral_code: vector<u8>)`
Registers a new user using someone's referral code.

**Parameters:**
- `user`: Signer reference (new user)
- `referral_code`: Existing referral code

**Errors:**
- `E_CODE_NOT_FOUND`: Invalid code
- `E_SELF_REFERRAL`: Cannot use own code
- `E_ALREADY_REGISTERED`: User already registered

**Rewards:** Referrer receives 1000 octas (0.0001 CEDRA)

**Example:**
```move
referral_tracking::register_with_code(new_user, b"MYCODE123");
```

---

#### `claim_rewards(user: &signer, amount: u64)`
Claims rewards from treasury.

**Parameters:**
- `user`: Signer reference
- `amount`: Amount to claim (in octas)

**Errors:**
- `E_NO_PENDING_REWARDS`: No rewards available
- `E_INSUFFICIENT_REWARDS`: Amount exceeds pending rewards
- `E_INSUFFICIENT_TREASURY`: Treasury has insufficient balance
- `E_AMOUNT_ZERO`: Amount cannot be 0

**Example:**
```move
referral_tracking::claim_rewards(user, 50000000); // 0.5 CEDRA
```

---

#### `deposit_rewards(admin: &signer, amount: u64)`
Admin deposits rewards into treasury.

**Parameters:**
- `admin`: Signer reference (must be contract admin)
- `amount`: Amount to deposit (in octas)

**Errors:**
- `E_UNAUTHORIZED`: Caller is not admin
- `E_AMOUNT_ZERO`: Amount cannot be 0

**Example:**
```move
referral_tracking::deposit_rewards(admin, 100000000000); // 1000 CEDRA
```

---

### View Functions (Read Operations)

#### `get_user_stats(user_addr: address)`
Returns user referral statistics.

**Returns:** `(vector<u8>, address, u64, u64, u64)`
- Referral code
- Referrer address
- Referred count
- Pending rewards
- Total earned

**Example:**
```move
let (code, referrer, count, pending, earned) = referral_tracking::get_user_stats(user_address);
```

---

#### `get_global_stats()`
Returns global system configuration.

**Returns:** `(address, Object<Metadata>, bool, u64, u64)`
- Admin address
- Reward token metadata
- Is active status
- Total rewards paid
- Fixed reward amount

**Example:**
```move
let (admin, token, active, paid, reward) = referral_tracking::get_global_stats();
```

---

#### `get_treasury_stats()`
Returns treasury statistics.

**Returns:** `(u64, u64)`
- Current balance
- Total deposited

**Example:**
```move
let (balance, total_deposited) = referral_tracking::get_treasury_stats();
```

---

#### `get_pending_rewards(user_addr: address)`
Returns pending rewards for a user.

**Returns:** `u64` (amount in octas)

**Example:**
```move
let pending = referral_tracking::get_pending_rewards(user_address);
```

---

## 🛡 Anti-Gaming Measures

Our referral system includes multiple security layers to prevent abuse:

### 1. **Self-Referral Prevention**
```move
assert!(user_addr != referrer_addr, error::invalid_argument(E_SELF_REFERRAL));
```
Users cannot use their own referral codes.

### 2. **One Registration Per User**
```move
assert!(!exists<UserReferral>(user_addr), error::already_exists(E_ALREADY_REGISTERED));
```
Each address can only register once, preventing farming.

### 3. **Unique Code Enforcement**
```move
assert!(!table::contains(&registry.code_to_address, code), error::already_exists(E_CODE_ALREADY_EXISTS));
```
Referral codes must be unique across the system.

### 4. **Code Validation**
```move
// Length checks
assert!(length >= MIN_CODE_LENGTH && length <= MAX_CODE_LENGTH, error::invalid_argument(E_CODE_TOO_SHORT));

// Alphanumeric only
while (i < length) {
    let char = *vector::borrow(&code, i);
    assert!(
        (char >= 48 && char <= 57) || // 0-9
        (char >= 65 && char <= 90) || // A-Z
        (char >= 97 && char <= 122),  // a-z
        error::invalid_argument(E_INVALID_CODE_CHAR)
    );
    i = i + 1;
};
```
Prevents SQL injection-style attacks and ensures clean codes.

### 5. **Admin-Only Operations**
```move
assert!(signer::address_of(admin) == config.admin, error::permission_denied(E_UNAUTHORIZED));
```
Only the contract admin can deposit rewards.

### 6. **Treasury Balance Checks**
```move
assert!(treasury_balance >= amount, error::resource_exhausted(E_INSUFFICIENT_TREASURY));
```
Prevents over-claiming beyond available treasury funds.

### 7. **Immutable Referrer Assignment**
Once a user registers with a referral code, their referrer cannot be changed. This prevents referrer-swapping exploits.

### 8. **Fixed Reward Amount**
The reward per referral is hardcoded (`REFERRAL_REWARD = 1000`), preventing manipulation of reward amounts.

## 📁 Project Structure

```
Basic Referral Tracking Contract/
│
├── contract/                         # Smart contract directory
│   ├── sources/
│   │   └── referral_tracking.move   # Main contract (428 lines)
│   ├── tests/
│   │   └── referral_tracking_test.move  # Test suite (670 lines, 23 tests)
│   ├── Move.toml                    # Package configuration
│   └── build/                       # Compiled artifacts (generated)
│
├── frontend/                        # React TypeScript frontend
│   ├── src/
│   │   ├── app/
│   │   │   ├── home.tsx            # User dashboard (442 lines)
│   │   │   └── admin.tsx           # Admin panel (508 lines)
│   │   ├── contexts/
│   │   │   ├── WalletProvider.tsx  # Wallet state management
│   │   │   └── useWallet.tsx       # Wallet hook
│   │   ├── components/
│   │   │   └── WalletSelectorModal.tsx  # Wallet selector
│   │   ├── utils/
│   │   │   └── contract.ts         # Contract interaction client (177 lines)
│   │   ├── types/
│   │   │   └── window.d.ts         # TypeScript declarations
│   │   ├── App.tsx                 # Root component
│   │   ├── main.tsx                # Entry point
│   │   └── index.css               # Global styles
│   ├── package.json                # Dependencies
│   ├── vite.config.ts              # Vite configuration
│   └── tsconfig.json               # TypeScript configuration
│
└── README.md                        # This file
```

## 🔧 Configuration

### Environment Variables (Optional)

Create `.env` in the `frontend/` directory:

```env
VITE_NETWORK=testnet
VITE_MODULE_ADDRESS=0xa70ab9dee1718542ee91aedd3d062122d079053dc42baafda601823b2ba732da
```

### Contract Constants

Edit `contract/sources/referral_tracking.move`:

```move
const MIN_CODE_LENGTH: u64 = 3;      // Minimum code length
const MAX_CODE_LENGTH: u64 = 20;     // Maximum code length
const REFERRAL_REWARD: u64 = 1000;   // Reward per referral (in octas)
```

## 🐛 Troubleshooting

### Common Issues

**Issue:** `Module not found` error in frontend
```
Solution: Update MODULE_ADDRESS in frontend/src/utils/contract.ts
```

**Issue:** Tests fail with `account already exists`
```
Solution: Tests are isolated. Run `cedra move test` in a clean environment.
```

**Issue:** Wallet not connecting
```
Solution: Ensure Cedra wallet extensions are installed and on testnet.
```

**Issue:** Transaction fails silently
```
Solution: Check browser console for detailed error messages.
```

## 📝 Code Comments

The smart contract includes comprehensive inline comments explaining:
- Data structure purposes and relationships
- Function logic and security checks
- Error handling rationale
- Edge case handling

Example from the contract:
```move
/// Maps referral codes to user addresses using Table for O(1) lookups
/// Stored at module address for centralized code registry
/// Ensures code uniqueness across the entire system
struct CodeRegistry has key {
    code_to_address: Table<vector<u8>, address>,
}
```

## 📄 License

This project is open source and available under the MIT License.

## 🔗 Resources

- [Cedra Documentation](https://docs.cedra.dev)
- [Move Language Guide](https://move-language.github.io/move/)
- [Cedra GitHub](https://github.com/cedra-labs)

---
