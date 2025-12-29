# Rock-Paper-Scissors Game with Commit-Reveal

A Move smart contract implementation of Rock-Paper-Scissors with a commit-reveal mechanism on the Cedra blockchain.

## Project Structure

```
rock-paper-scissors/
├── contract/              # Move smart contract
│   ├── Move.toml
│   ├── sources/
│   │   └── rock_paper_scissors.move
│   └── tests/
│       └── rock_paper_scissors_test.move
├── client/                # TypeScript client
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       └── index.ts
└── README.md
```

## Deploy the Contract

```bash
cd contract
cedra move compile --named-addresses RockPaperScissors=default
cedra move publish --named-addresses RockPaperScissors=default
```

After publishing, note the deployed contract address and update it in the client.

## Setup the Client

```bash
cd client
npm install
```

Update `src/index.ts` with your deployed contract address:

```typescript
const MODULE_ADDRESS = "0x..."; // Your deployed contract address
```

## Run the Client Example

```bash
npm start
```

## Testing

Run the Move tests:

```bash
cd contract
cedra move test
```

## Quick Usage Example

```typescript
import { Account, Network } from "@cedra-labs/ts-sdk";
import { Cedra, CedraConfig } from "@cedra-labs/ts-sdk";

const config = new CedraConfig({ network: Network.TESTNET });
const cedra = new Cedra(config);

// Generate accounts
const player1 = Account.generate();
const player2 = Account.generate();

// Fund accounts
await cedra.faucet.fundAccount({ 
  accountAddress: player1.accountAddress, 
  amount: 100_000_000 
});

// Create game
const gameAddress = await createGame(cedra, player1, 1000);

// Player 2 joins
await joinGame(cedra, player2, gameAddress);

// Commit moves (see src/index.ts for commit/reveal helpers)
await commitMove(cedra, player1, gameAddress, 0, secret1); // Rock
await commitMove(cedra, player2, gameAddress, 2, secret2); // Scissors

// Reveal moves
await revealMove(cedra, player1, gameAddress, 0, secret1);
await revealMove(cedra, player2, gameAddress, 2, secret2);

// Get game info
const gameInfo = await getGameInfo(cedra, gameAddress);
```

## Move Types

- `0` = Rock
- `1` = Paper
- `2` = Scissors

## License

MIT
