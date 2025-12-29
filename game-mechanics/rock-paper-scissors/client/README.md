# Rock-Paper-Scissors Client

TypeScript client for the Rock-Paper-Scissors game with commit-reveal mechanism on Cedra blockchain.

## Installation

```bash
npm install
```

## Usage

Update the `MODULE_ADDRESS` in `src/index.ts` with your deployed contract address:

```typescript
const MODULE_ADDRESS = "0x..."; // Your deployed contract address
```

## Run Example

```bash
npm start
```

## Build

```bash
npm run build
```

## Features

- Commit-reveal hash computation using SHA3-256
- Secure random secret generation
- Complete game flow demonstration
- TypeScript SDK integration

