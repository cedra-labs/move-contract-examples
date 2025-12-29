# Voting Basic - Simple Voting System

A simple and readable voting system built on Cedra Move with TypeScript client.

## Features

- **Create Proposal**: Create new voting proposals
- **Vote Yes/No**: Cast votes on proposals
- **Check Results**: View voting results and outcomes

## Prerequisites

- [CLI](https://docs.cedra.network/getting-started/cli) (v1.0.0 or later)
- [Node.js](https://nodejs.org/) LTS version (v16.x or later)
- [pnpm](https://pnpm.io/) (v6.x or later)

## Project Structure

- `/contract` - Move contract for voting system
- `/client` - TypeScript client application

## Deploying the Contract

1. Configure CLI with your account:

```bash
cd contract
cedra init
```

2. Compile the contract:

```bash
cedra move compile --named-addresses VotingBasic=default
```

3. Publish the contract:

```bash
cedra move publish --named-addresses VotingBasic=default
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

### `create_proposal(admin: &signer, description: String)`
Creates a new voting proposal with a description.

### `vote(voter: &signer, proposal_id: u64, vote_yes: bool)`
Casts a vote (yes or no) on a proposal. Each address can only vote once per proposal.

### `check_results(proposal_id: u64): (u64, u64, String)`
Returns the voting results: (yes_votes, no_votes, description).

## Example Usage

The client demonstrates:
1. Creating a proposal
2. Multiple users voting (yes and no)
3. Checking the final results

## License

MIT

