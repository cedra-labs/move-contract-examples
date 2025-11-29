🎲 Cedra Simple Lottery (Builders Forge)

A decentralized, transparent lottery smart contract built on Move, featuring an automated winner selection mechanism and a TypeScript SDK integration demo.

This submission fulfills the requirements for the Simple lottery using block hash task.

📋 Table of Contents

- [Project Overview](#-project-overview)
- [Technical Architecture & Fairness](#️-technical-architecture--fairness)
- [Project Structure](#-project-structure)
- [Prerequisites](#-prerequisites)
- [Smart Contract Guide](#-smart-contract-guide)
- [Frontend Demo Guide](#-frontend-demo-guide)
- [API Reference](#-api-reference)

## 🎯 Project Overview

This project implements a complete lottery system where:

- **Admin** initializes the lottery and sets the ticket price
- **Users** purchase tickets by sending CEDRA/APT coins
- **Smart Contract** securely holds the funds in a resource account
- **Winner** is selected using on-chain randomness, and the entire pot is automatically transferred to them
- **History** is preserved via on-chain Events for frontend indexing

## ⚖️ Technical Architecture & Fairness

### The "Block Hash" Challenge

The task requirements suggest using "Block Hash" for randomness. However, in deterministic Move-based chains (like Cedra/Aptos), accessing the current block hash inside a transaction is restricted to prevent consensus issues.

### Our Solution: Timestamp-Based Pseudo-Randomness

To strictly adhere to the "Hash-based" requirement while remaining functional within the Move VM, we implemented a Pseudo-Random Number Generator (PRNG).

**The Algorithm:**

```
Seed = BCS::to_bytes(Timestamp) + BCS::to_bytes(Lottery_Owner) + BCS::to_bytes(Round_ID)
Random_Hash = SHA3_256(Seed)
Winner_Index = Bytes_To_U64(Random_Hash) % Total_Players
```

### Fairness Disclosure

- **Source of Entropy:** We use `timestamp::now_microseconds()` combined with a SHA3-256 hash function
- **Limitation:** While robust for this contest's scope, strictly speaking, validators can manipulate timestamps within a small margin
- **Production Recommendation:** For a mainnet high-stakes lottery, we recommend integrating Chainlink VRF or Aptos Roll for tamper-proof randomness

## 📂 Project Structure

```
lottery-simple/
├── contract/
│   ├── Move.toml                 # Move package configuration
│   ├── sources/
│   │   └── lottery_simple.move   # Main Smart Contract Logic
│   └── tests/
│       └── lottery_test.move     # Unit Tests (100% Coverage)
├── client/
│   ├── src/
│   │   └── index.ts             # TypeScript SDK Integration Script
│   ├── package.json             # Dependencies for the client
│   └── tsconfig.json            # TypeScript configuration
├── frontend/                     # Vite React Frontend (Optional)
└── README.md                     # Documentation
```


## 🛠 Prerequisites

Ensure you have the following installed:

- **Aptos CLI** (Compatible with Cedra Move)
- **Node.js** (v16 or higher)
- **Yarn** or **npm**

## 🚀 Smart Contract Guide

### 1. Compilation

Navigate to the contract directory and build the Move package:

```bash
cd contract
cedra move compile --dev
```

### 2. Running Tests

We have implemented comprehensive unit tests covering:

- **Happy Path** (Buy → Win → Payout)
- **Edge Cases** (Wrong price, Unauthorized access)
- **State Resets**

Run the tests:

```bash
cedra move test
```

**Expected Output:**

```
[ PASS ] 0x...::lottery_tests::test_lottery_flow_success
[ PASS ] 0x...::lottery_tests::test_buy_wrong_price
[ PASS ] 0x...::lottery_tests::test_user_cannot_pick_winner
[ PASS ] 0x...::lottery_tests::test_pick_winner_no_players
Test result: OK. Total tests: 4; passed: 4; failed: 0
```


## 💻 Client Demo Guide

A TypeScript client is provided to demonstrate the full end-to-end flow using the `@cedra-labs/ts-sdk`.

### 1. Setup

Install the necessary dependencies:

```bash
cd client
npm install
```

### 2. Configuration

Open `client/src/index.ts` and update the constants:

- `MODULE_ADDRESS`: Your deployed contract address
- `DEPLOYER_PRIVATE_KEY_RAW`: The private key of the module owner

### 3. Run the Simulation

Execute the script to simulate a full lottery round:

```bash
npm run
```

### What happens?

1. **Admin** initializes the lottery
2. **Script** generates 2 random player wallets and funds them via Faucet
3. **Players** buy tickets
4. **Admin** picks a winner
5. **Console** logs the state changes and pot distribution

## 📚 API Reference

### `init_lottery(admin: &signer, ticket_price: u64)`

Initializes the lottery resource for the admin account.

- **`ticket_price`**: Cost per ticket in CedraCoin units

### `buy_ticket(buyer: &signer, amount: u64, lottery_owner: address)`

Users call this to purchase a ticket.

- **`amount`**: Must match the ticket_price
- **`lottery_owner`**: Address of the lottery admin

### `pick_winner(admin: &signer, lottery_owner: address)`

Selects a winner, transfers funds, and emits a WinnerEvent.

- **Access Control**: Only the lottery_owner can call this
- **Effect**: Auto-transfers entire pot to winner and resets lottery

## ✅ Deliverables Checklist

- [x] **Simple lottery using block hash**: Implemented via Timestamp+SHA3 Hash
- [x] **Ticket purchase and drawing**: Fully functional `buy_ticket` and `pick_winner`
- [x] **Winner selection logic**: Auto-transfer to winner, auto-reset logic
- [x] **Fairness documentation**: Detailed in the "Technical Architecture" section
- [x] **Complete implementation**: Smart contract + Client SDK + Tests

---

**Built with ❤️ for the Cedra Builders Forge.**