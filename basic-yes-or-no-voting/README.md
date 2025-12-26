# Basic Voting Contract

A comprehensive yes/no voting system built on Cedra blockchain with Move smart contracts and a TypeScript/React frontend. This contract enables users to create proposals, vote on them, and view real-time results through a modern web interface.

## 📋 Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
- [Installation & Setup](#installation--setup)
- [Testing](#testing)
- [Deployment](#deployment)
- [Frontend Usage](#frontend-usage)
- [Smart Contract API](#smart-contract-api)
- [Security Features](#security-features)
- [Project Structure](#project-structure)

## ✨ Features

### Core Functionality
- ✅ **Create Proposals**: Any user can create voting proposals with descriptions
- ✅ **Yes/No Voting**: Simple binary voting system for each proposal
- ✅ **Real-time Results**: Live vote counting and percentage tracking
- ✅ **Duplicate Prevention**: Built-in protection against multiple votes per address

### Additional Features
- 📊 **View Functions**: Queries for proposal data and voting results
- 🎨 **Modern Frontend**: Full-featured React UI with Tailwind CSS and wallet integration
- 🔒 **Security**: Atomic operations and comprehensive error handling
- ⚡ **Efficient Storage**: O(1) proposal lookups using Move Table
- 📱 **Responsive Design**: Works seamlessly on desktop, tablet, and mobile

## 🏗 Architecture

### Smart Contract Components

```
VotingState (Global)
├── next_proposal_id: u64
└── proposals: Table<u64, Proposal>

Proposal (Per-Proposal)
├── id: u64
├── creator: address
├── description: vector<u8>
├── yes_votes: u64
├── no_votes: u64
└── voters: vector<address>  // Track who voted to prevent duplicates
```

### Frontend Architecture

```
frontend/
├── src/
│   ├── app/
│   │   ├── home.tsx (Main voting dashboard)
│   │   └── create.tsx (Create proposal page)
│   ├── components/
│   │   ├── ProposalCard.tsx (Proposal display component)
│   │   └── WalletSelectorModal.tsx (Wallet connection UI)
│   ├── contexts/
│   │   ├── WalletProvider.tsx (Wallet state management)
│   │   └── useWallet.tsx (Wallet hook)
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
- **Cedra Wallet**: Browser extension for testing (Zedra Wallet recommended)

### System Requirements
- Windows, macOS, or Linux
- Internet connection for package downloads
- Testnet account with tokens for testing

## 🚀 Installation & Setup

### 1. Clone the Repository

```bash
cd "Basic Voting"
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
BUILDING voting
{
  "Result": ["a70ab9dee1718542ee91aedd3d062122d079053dc42baafda601823b2ba732da::voting"]
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
  VITE v7.x.x  ready in xxx ms

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
cedra move test --filter test_create_proposal
```

### Test Coverage

Our test suite includes **13 comprehensive tests** covering:

1. **Proposal Creation Tests** (2 tests)
   - Successful proposal creation
   - Initial proposal state validation

2. **Voting Tests** (4 tests)
   - Vote yes functionality
   - Vote no functionality
   - Multiple votes on same proposal
   - Mixed voting (yes and no votes)

3. **Error Handling Tests** (4 tests)
   - Duplicate vote prevention (yes+yes, no+no, yes+no, no+yes)
   - Voting on non-existent proposals

4. **View Function Tests** (2 tests)
   - Get results for existing proposals
   - Get results for non-existent proposals
   - Proposal existence checks

5. **Edge Cases Tests** (1 test)
   - Multiple proposals with sequential IDs

**Expected Test Output:**
```
Running Move unit tests
[ PASS    ] 0x1337::voting_test::test_create_proposal
[ PASS    ] 0x1337::voting_test::test_vote_yes
[ PASS    ] 0x1337::voting_test::test_vote_no
...
Test result: OK. Total tests: 13; passed: 13; failed: 0
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
cedra move publish --named-addresses module_addr=<youraddress>
```

**Example:**
```bash
# The contract is already deployed at:
# 0xa70ab9dee1718542ee91aedd3d062122d079053dc42baafda601823b2ba732da
```

### 3. Verify Deployment

```bash
# Check the deployed contract on the explorer
https://cedrascan.com/account/0xa70ab9dee1718542ee91aedd3d062122d079053dc42baafda601823b2ba732da/modules/packages/voting?network=testnet
```

### 4. Configure Frontend

The frontend is already configured with the deployed contract address in `frontend/src/utils/contract.ts`:

```typescript
private readonly MODULE_ADDRESS = '0xa70ab9dee1718542ee91aedd3d062122d079053dc42baafda601823b2ba732da'
private readonly MODULE_NAME = 'voting'
```

## 💻 Frontend Usage

### Home Dashboard (`/`)

**Features:**
1. **View All Proposals** - See all proposals with vote counts and percentages
2. **Vote on Proposals** - Click "Vote Yes" or "Vote No" buttons
3. **Real-time Updates** - Auto-refresh every 10 seconds
4. **Statistics Overview** - Total proposals, total votes, connection status
5. **Manual Refresh** - Refresh button to fetch latest data

**User Flow:**
```
1. Connect Wallet → 2. Browse Proposals → 3. Click Vote → 4. Approve Transaction → 5. See Results
```

### Create Proposal Page (`/create`)

**Features:**
1. **Simple Form** - Text area for proposal description
2. **Character Counter** - Max 500 characters with live counter
3. **Validation** - Minimum 10 characters required
4. **Tips & Examples** - Helpful guidance for writing proposals
5. **Auto-redirect** - Returns to home page after successful creation

**User Flow:**
```
1. Connect Wallet → 2. Navigate to /create → 3. Enter Description → 4. Submit → 5. Approve Transaction
```

## 📚 Smart Contract API

### Entry Functions (Write Operations)

#### `create_proposal(creator: &signer, description: vector<u8>)`

Creates a new voting proposal with a description.

**Parameters:**
- `creator`: Signer reference (transaction sender)
- `description`: Proposal description as a byte vector (non-empty)

**Errors:**
- `E_EMPTY_DESCRIPTION` (3): Description cannot be empty

**Example:**
```move
voting::create_proposal(creator, b"Should we upgrade to protocol v2.0?");
```

**Frontend Usage:**
```typescript
const descriptionBytes = stringToBytes("Should we upgrade to protocol v2.0?")
const transactionData = {
  data: {
    function: votingClient.getFunction('create_proposal'),
    functionArguments: [descriptionBytes],
    typeArguments: []
  }
}
await signAndSubmitTransaction(transactionData)
```

---

#### `vote_yes(voter: &signer, proposal_id: u64)`

Casts a "yes" vote on a proposal.

**Parameters:**
- `voter`: Signer reference (transaction sender)
- `proposal_id`: ID of the proposal to vote on

**Errors:**
- `E_PROPOSAL_NOT_FOUND` (1): Proposal with given ID doesn't exist
- `E_ALREADY_VOTED` (2): Voter has already voted on this proposal

**Example:**
```move
voting::vote_yes(voter, 1);
```

**Frontend Usage:**
```typescript
const transactionData = {
  data: {
    function: votingClient.getFunction('vote_yes'),
    functionArguments: [proposalId.toString()],
    typeArguments: []
  }
}
await signAndSubmitTransaction(transactionData)
```

---

#### `vote_no(voter: &signer, proposal_id: u64)`

Casts a "no" vote on a proposal.

**Parameters:**
- `voter`: Signer reference (transaction sender)
- `proposal_id`: ID of the proposal to vote on

**Errors:**
- `E_PROPOSAL_NOT_FOUND` (1): Proposal with given ID doesn't exist
- `E_ALREADY_VOTED` (2): Voter has already voted on this proposal

**Example:**
```move
voting::vote_no(voter, 1);
```

**Frontend Usage:**
```typescript
const transactionData = {
  data: {
    function: votingClient.getFunction('vote_no'),
    functionArguments: [proposalId.toString()],
    typeArguments: []
  }
}
await signAndSubmitTransaction(transactionData)
```

---

### View Functions (Read Operations)

#### `get_results(proposal_id: u64): (u64, u64, bool)`

Returns voting results for a specific proposal.

**Parameters:**
- `proposal_id`: ID of the proposal to query

**Returns:** `(yes_votes: u64, no_votes: u64, exists: bool)`
- `yes_votes`: Number of yes votes
- `no_votes`: Number of no votes
- `exists`: Whether the proposal exists

**Example:**
```move
let (yes, no, exists) = voting::get_results(1);
// If proposal exists: (15, 8, true)
// If proposal doesn't exist: (0, 0, false)
```

**Frontend Usage:**
```typescript
const results = await votingClient.getResults(proposalId)
// Returns: { yesVotes: 15, noVotes: 8, exists: true }
```

---

#### `proposal_exists(proposal_id: u64): bool`

Checks if a proposal exists.

**Parameters:**
- `proposal_id`: ID of the proposal to check

**Returns:** `bool`
- `true` if proposal exists
- `false` if proposal doesn't exist

**Example:**
```move
if (voting::proposal_exists(1)) {
    // Proposal exists - safe to vote or get results
};
```

**Frontend Usage:**
```typescript
const exists = await votingClient.proposalExists(proposalId)
if (exists) {
  // Proceed with voting or fetching results
}
```

---

## 🛡 Security Features

Our voting system includes multiple layers of security and anti-gaming measures:

### 1. **Duplicate Vote Prevention**

```move
inline fun has_voted(proposal: &Proposal, voter_addr: address): bool {
    let len = vector::length(&proposal.voters);
    let i = 0;
    let found = false;
    while (i < len) {
        if (*vector::borrow(&proposal.voters, i) == voter_addr) { 
            found = true; 
            break 
        };
        i = i + 1;
    };
    found
}
```

Each address can only vote once per proposal. The voters list is checked before allowing any vote.

### 2. **Proposal Existence Validation**

```move
assert!(table::contains(&state.proposals, proposal_id), error::not_found(E_PROPOSAL_NOT_FOUND));
```

All voting operations validate that the proposal exists before proceeding.

### 3. **Atomic Operations**

All state updates happen atomically within a single transaction:
```move
vector::push_back(&mut proposal.voters, voter_addr);
proposal.yes_votes = proposal.yes_votes + 1;
```

### 4. **Immutable Vote Records**

Once a vote is cast and recorded in the `voters` vector, it cannot be changed or removed.

### 5. **Gas-Efficient Lookups**

Uses Move's `Table` data structure for O(1) proposal lookups:
```move
proposals: Table<u64, Proposal>
```

### 6. **Input Validation**

```move
assert!(vector::length(&description) > 0, error::invalid_argument(E_EMPTY_DESCRIPTION));
```

Ensures all inputs meet minimum requirements before processing.

### 7. **Sequential Proposal IDs**

Proposals receive sequential IDs starting from 1, preventing ID collision:
```move
let proposal_id = state.next_proposal_id;
state.next_proposal_id = proposal_id + 1;
```

## 📁 Project Structure

```
Basic Voting/
│
├── contract/                        # Smart contract directory
│   ├── sources/
│   │   └── voting.move              # Main voting contract (115 lines)
│   ├── tests/
│   │   └── voting_test.move         # Test suite (193 lines, 13 tests)
│   ├── Move.toml                    # Package configuration
│   ├── .cedra/
│   │   └── config.yaml              # Deployment configuration
│   └── build/                       # Compiled artifacts (generated)
│
├── frontend/                        # React TypeScript frontend
│   ├── src/
│   │   ├── app/
│   │   │   ├── home.tsx            # Main voting dashboard (233 lines)
│   │   │   └── create.tsx          # Create proposal page (281 lines)
│   │   ├── components/
│   │   │   ├── ProposalCard.tsx    # Proposal display component
│   │   │   └── WalletSelectorModal.tsx  # Wallet connection UI
│   │   ├── contexts/
│   │   │   ├── WalletProvider.tsx  # Wallet state management
│   │   │   └── useWallet.tsx       # Wallet hook
│   │   ├── utils/
│   │   │   └── contract.ts         # Voting contract client (164 lines)
│   │   ├── App.tsx                 # Router configuration
│   │   ├── main.tsx                # Entry point
│   │   └── index.css               # Global styles
│   ├── package.json                # Dependencies
│   ├── vite.config.ts              # Vite configuration
│   ├── README.md                   # Frontend documentation
│   └── DEPLOYMENT.md               # Deployment guide
│
├── README.md                        # This file (main documentation)
└── DESIGN.md                        # Design documentation
```

## 🔧 Configuration

### Contract Constants

Edit `contract/sources/voting.move`:

```move
// Error codes are fixed for consistency
const E_PROPOSAL_NOT_FOUND: u64 = 1;
const E_ALREADY_VOTED: u64 = 2;
const E_EMPTY_DESCRIPTION: u64 = 3;
```

### Frontend Configuration

Edit `frontend/src/utils/contract.ts`:

```typescript
// Contract address (deployed on testnet)
private readonly MODULE_ADDRESS = '0xa70ab9dee1718542ee91aedd3d062122d079053dc42baafda601823b2ba732da'
private readonly MODULE_NAME = 'voting'

// Network configuration
this.client = new Cedra(new CedraConfig({
  network: Network.TESTNET,
  fullnode: 'https://testnet.cedra.dev/v1',
}))
```

### Environment Variables (Optional)

Create `.env` in the `frontend/` directory:

```env
VITE_NETWORK=testnet
VITE_MODULE_ADDRESS=0xa70ab9dee1718542ee91aedd3d062122d079053dc42baafda601823b2ba732da
VITE_MODULE_NAME=voting
```

## 🐛 Troubleshooting

### Common Issues

**Issue:** `Module not found` error in frontend
```
Solution: Verify MODULE_ADDRESS in frontend/src/utils/contract.ts matches deployed address
```

**Issue:** Tests fail with compilation errors
```
Solution: Run `cedra move compile --dev` first, then `cedra move test`
```

**Issue:** Wallet not connecting
```
Solution: 
1. Ensure Cedra wallet extension is installed
2. Check wallet is on Testnet network
3. Refresh the page and try again
```

**Issue:** Transaction fails silently
```
Solution: 
1. Check browser console for detailed error messages
2. Verify account has sufficient balance for gas
3. Confirm contract address is correct
```

**Issue:** Proposals not loading in frontend
```
Solution:
1. Check RPC endpoint is accessible: https://testnet.cedra.dev/v1
2. Verify contract is deployed at the specified address
3. Try manual refresh button in the UI
```

## 📝 Error Codes Reference

| Code | Name | Description | User Action |
|------|------|-------------|-------------|
| 1 | `E_PROPOSAL_NOT_FOUND` | Proposal doesn't exist | Check proposal ID is correct |
| 2 | `E_ALREADY_VOTED` | Already voted on this proposal | Cannot vote again |
| 3 | `E_EMPTY_DESCRIPTION` | Description cannot be empty | Enter a valid description |


## 🚀 Future Enhancements

Potential improvements for future versions:

- [ ] Add proposal expiration/deadline functionality
- [ ] Implement vote weighting based on token holdings
- [ ] Add proposal categories and tags
- [ ] Support for multi-choice voting
- [ ] Delegation system (vote on behalf of others)
- [ ] Quorum requirements for proposal validation
- [ ] Proposal editing/cancellation by creator
- [ ] Event emissions for off-chain indexing
- [ ] Admin controls for system parameters
- [ ] Proposal description storage optimization


## 🔗 Resources

- [Cedra Documentation](https://docs.cedra.dev)
- [Move Language Guide](https://move-language.github.io/move/)
- [Cedra GitHub](https://github.com/cedra-labs)
- [Testnet Explorer](https://explorer.testnet.cedra.dev)
- [Testnet Faucet](https://faucet.cedra.dev)

