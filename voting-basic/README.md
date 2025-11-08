# Basic Community Voting Platform

> **Issue #72** - A production-ready voting system on Cedra blockchain (<100 lines)

A minimal, feature-complete voting platform allowing users to create proposals with deadlines and vote yes/no. Built with Move smart contracts and a modern Next.js frontend.

## Features

- ✅ Platform-based architecture (unlimited proposals)
- ✅ Time-based voting deadlines
- ✅ Double-vote prevention
- ✅ Creator tracking
- ✅ Voter list retrieval
- ✅ 90 lines of Move code
- ✅ Next.js 15 + TypeScript frontend
- ✅ Built-in wallet generation

## Live Deployment

**Network:** Cedra Testnet
**Contract:** `0xfedc238436368f33049325b66c5a66ac049a0483f2c3cd20d8ffeab89f0d617b`
**Module:** `community_voting`
**Explorer:** [View on Cedrascan](https://cedrascan.com/account/0xfedc238436368f33049325b66c5a66ac049a0483f2c3cd20d8ffeab89f0d617b?network=testnet)

---
---
## Live app Demo
[WeDecide-Demo-basic-community-Voting](https://cedrascan.com/account/voting-basic-frontend.vercel.app)

--- 

## Project Structure

```
issue-72-voting-basic/
├── contract/
│   ├── Move.toml
│   ├── sources/voting.move           # 90-line smart contract
│   └── CONTRACT_EXPLANATION.md       # Line-by-line breakdown
└── frontend/
    ├── app/                          # Next.js 15 pages
    ├── components/                   # React components
    ├── contexts/WalletContext.tsx    # Wallet state management
    └── lib/cedra.ts                  # Blockchain integration
```

---

## Quick Start

### 1. Deploy Contract

```bash
# Navigate to contract directory
cd contract/

# Initialize Cedra account (if needed)
cedra init --network testnet --profile testnet

# Compile
cedra move compile --dev

# Deploy
cedra move publish --profile testnet --named-addresses voting=testnet --assume-yes
```

### 2. Run Frontend

```bash
cd frontend/

# Install dependencies
npm install

# Update contract address in lib/cedra.ts (line 11)
export const PLATFORM_ADDRESS = "YOUR_DEPLOYED_ADDRESS";

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Smart Contract API

### Entry Functions (Write Operations)

#### Initialize Platform
```move
public entry fun initialize(account: &signer)
```
Creates the voting platform. Call once per deployment.

#### Create Proposal
```move
public entry fun create_proposal(
    creator: &signer,
    platform_addr: address,
    description: vector<u8>,
    duration_seconds: u64
)
```
Creates a proposal with a voting deadline.

**CLI Example:**
```bash
cedra move run \
  --function-id '0xADDRESS::community_voting::create_proposal' \
  --args address:0xPLATFORM_ADDRESS \
  --args 'string:Should we implement feature X?' \
  --args u64:604800 \
  --profile testnet
```

#### Vote Yes
```move
public entry fun vote_yes(
    voter: &signer,
    platform_addr: address,
    proposal_id: u64
)
```

#### Vote No
```move
public entry fun vote_no(
    voter: &signer,
    platform_addr: address,
    proposal_id: u64
)
```

**CLI Example:**
```bash
cedra move run \
  --function-id '0xADDRESS::community_voting::vote_yes' \
  --args address:0xPLATFORM_ADDRESS \
  --args u64:0 \
  --profile testnet
```

### View Functions (Read Operations)

#### Get Proposal
```move
#[view]
public fun get_proposal(
    platform_addr: address,
    proposal_id: u64
): (String, address, u64, u64, u64, u64)
```

**Returns:** `(description, creator, yes_votes, no_votes, end_time, voter_count)`

**CLI Example:**
```bash
cedra move view \
  --function-id '0xADDRESS::community_voting::get_proposal' \
  --args address:0xPLATFORM_ADDRESS \
  --args u64:0
```

#### Get Proposal Voters
```move
#[view]
public fun get_proposal_voters(
    platform_addr: address,
    proposal_id: u64
): vector<address>
```

**Returns:** List of addresses that voted on the proposal.

---

## Error Codes

| Code | Name | Description |
|------|------|-------------|
| `1` | `E_ALREADY_VOTED` | Address has already voted on this proposal |
| `2` | `E_VOTING_ENDED` | Voting deadline has passed |

---

## Frontend Features

- **Wallet Management:** Auto-generated Ed25519 wallets stored in localStorage
- **Proposal Creation:** User-friendly form with duration slider
- **Voting Interface:** Modal-based voting with real-time updates
- **Already Voted Detection:** Automatic detection with blue indicator
- **State Management:** Proper reset between proposals
- **Responsive Design:** Mobile-first UI with Tailwind CSS
- **Animations:** Framer Motion for smooth transitions

### Key Components

- `WalletContext` - Global wallet state management
- `ConnectWallet` - Wallet connection UI
- `ProposalCard` - Displays proposal details and voting stats
- `VoteModal` - Voting interface with already-voted detection
- `lib/cedra.ts` - Blockchain integration functions

---

## Development

### Contract Testing

```bash
cd contract/
cedra move test
```

### Frontend Development

```bash
cd frontend/
npm run dev          # Development server
npm run build        # Production build
npm run lint         # ESLint check
```

---

## Architecture Highlights

### Smart Contract (90 lines)
- **Platform-based:** One platform holds unlimited proposals
- **Security:** Double-vote prevention + deadline enforcement
- **Efficiency:** View functions are gas-free
- **Simplicity:** 2 error codes, 4 entry functions, 2 view functions

### Frontend (Next.js 15)
- **Type-safe:** Full TypeScript with strict mode
- **Modern Stack:** React 19, Next.js 15, Tailwind CSS, Framer Motion
- **SDK Integration:** Cedra TypeScript SDK for blockchain interaction
- **State Management:** React Context for wallet, local state for proposals

---

## Usage Example

```typescript
import { createProposal, voteYes, getProposal } from '@/lib/cedra';
import { useWallet } from '@/contexts/WalletContext';

// Create proposal
const txHash = await createProposal(
  account,
  "Should we add dark mode?",
  604800 // 7 days in seconds
);

// Vote yes
await voteYes(account, 0); // Proposal ID 0

// Get results
const proposal = await getProposal(0);
console.log(proposal.yes_votes, proposal.no_votes);
```

---

## Production Deployment

### Mainnet Contract
```bash
cedra move publish \
  --profile mainnet \
  --named-addresses voting=YOUR_MAINNET_ADDRESS \
  --network mainnet
```

### Frontend Production Build
```bash
npm run build
npm start  # or deploy to Vercel/Netlify
```

Update `PLATFORM_ADDRESS` in [lib/cedra.ts](frontend/lib/cedra.ts#L11) to your mainnet contract address.

---

## Resources

- [Contract Explanation](contract/CONTRACT_EXPLANATION.md) - Line-by-line code breakdown
- [Cedra Documentation](https://docs.cedra.dev)
- [Move Language Book](https://move-language.github.io/move/)
- [Issue #72](https://github.com/cedra-labs/docs/issues/72)

---

## License

MIT License - Free to use and modify

---

**Built for Cedra Builders Forge Season 1** | **Issue #72** | **Community Voting Platform**
