# Fee Splitter Contract

A secure and efficient fee splitter smart contract for Aptos blockchain that allows automatic distribution of fungible assets (including APT) to multiple recipients based on predefined shares.

## 🌟 Features

### Smart Contract Features
- **Fungible Asset Support**: Uses modern fungible asset framework (replaces deprecated coin framework)
- **Secure Distribution**: Safe asset splitting with proper validation and error handling
- **Flexible Shares**: Support for any ratio distribution (not limited to percentages)  
- **Simple Logic**: Easy to understand distribution without complex remainder handling
- **Access Control**: Only designated accounts can create and manage splitters
- **View Functions**: Easy querying of splitter information and existence

### Client Features
- **TypeScript SDK**: Full-featured client library with type safety
- **Fungible Asset Integration**: Automatic APT metadata handling for modern asset operations
- **Account Management**: Automatic account funding and balance checking
- **Transaction Handling**: Robust transaction building and execution
- **Error Handling**: Comprehensive error handling with clear messages
- **Demo Mode**: Built-in demonstration of all functionality

## 🏗️ Architecture

### Move Contract Structure
```
FeeSplitter::FeeSplitter
├── Structs
│   ├── Recipient { addr, share }
│   └── FeeSplitter { recipients, total_shares, owner }
└── Functions
    ├── create_splitter(creator, recipients)
    ├── distribute_fees(sender, splitter_owner, asset_metadata, amount)
    ├── get_splitter_info(address) [view]
    ├── splitter_exists(address) [view]
    └── get_apt_metadata() [view]
```

## 🚀 Quick Start

### Prerequisites
- [Aptos CLI](https://aptos.dev/tools/aptos-cli/install-cli/) installed
- Node.js 18+ installed
- Access to Aptos devnet/testnet

### TL;DR - Quick Deploy & Run
```bash
# 1. Deploy contract
cd fee-splitter/contract
aptos init --network devnet
aptos account fund-with-faucet
aptos account list  # Copy your address
aptos move compile --named-addresses FeeSplitter=<your-address>
aptos move publish --named-addresses FeeSplitter=<your-address>

# 2. Run client
cd ../client
npm install
# Update MODULE_ADDRESS in src/index.ts with your address
npm start
```

### Contract Deployment

1. **Navigate to contract directory:**
```bash
cd fee-splitter/contract
```

2. **Initialize Aptos account (if not done):**
```bash
aptos init --network devnet
```

3. **Fund your account on devnet:**
```bash
aptos account fund-with-faucet
```

4. **Get your account address:**
```bash
aptos account list
```

5. **Compile the contract:**
```bash
aptos move compile --named-addresses FeeSplitter=<your-account-address>
```

6. **Deploy to devnet:**
```bash
aptos move publish --named-addresses FeeSplitter=<your-account-address>
```

**Example with a real address:**
```bash
# Replace 0xabcd... with your actual account address
aptos move compile --named-addresses FeeSplitter=0xabcd1234567890abcd1234567890abcd12345678
aptos move publish --named-addresses FeeSplitter=0xabcd1234567890abcd1234567890abcd12345678
```

### Client Setup

1. **Navigate to client directory:**
```bash
cd fee-splitter/client
```

2. **Install dependencies:**
```bash
npm install
```

3. **Update the module address in `src/index.ts`:**
```typescript
const MODULE_ADDRESS = "0x..."; // Your deployed contract address
```

4. **Run the demo:**
```bash
npm start
```

## 📖 Usage Examples

### Creating a Fee Splitter

```typescript
import { FeeSplitterClient } from './src/index.js';

const client = new FeeSplitterClient();

// Define recipients and their shares
const recipients = [
  { address: recipient1.accountAddress, share: 50 }, // 50 shares
  { address: recipient2.accountAddress, share: 30 }, // 30 shares  
  { address: recipient3.accountAddress, share: 20 }  // 20 shares
];

// Create the splitter
await client.createSplitter(creator, recipients);
```

### Distributing Fees

```typescript
// Distribute 0.01 APT proportionally using fungible assets
const amount = 1_000_000; // in octas
await client.distributeFees(payer, creatorAddress, amount);
// The client automatically handles APT metadata for you
```

### Checking Splitter Info

```typescript
const info = await client.getSplitterInfo(splitterAddress);
console.log(`Total shares: ${info.total_shares}`);
console.log(`Recipients: ${info.recipients.length}`);
```

## 🔒 Security Features

### Input Validation
- Non-empty recipient lists
- Positive share amounts
- Valid addresses
- Sufficient balances

### Safe Arithmetic
- Overflow protection
- Simple division-based distribution

### Access Control
- Owner-based permissions
- Resource existence checks
- Proper error codes

## 🧪 Testing

### Run the Demo
```bash
cd fee-splitter/client
npm start
```

### Interactive Mode
```bash
npm start -- --interactive
```

### Expected Demo Output
```
🚀 Starting Fee Splitter Demo
==================================================

📋 Generated Accounts:
Creator:    0x...
Recipient1: 0x...
Recipient2: 0x...
Recipient3: 0x...
Payer:      0x...

💰 Funding accounts...
✅ Funding completed...

🏗️ Creating fee splitter with 3 recipients...
✅ Fee splitter created successfully!

📊 Splitter Info:
   Owner: 0x...
   Total Shares: 100
   Recipients:
     1. 0x... - 50 shares (50.00%)
     2. 0x... - 30 shares (30.00%)
     3. 0x... - 20 shares (20.00%)

💸 Distributing 0.01 APT...
✅ Fees distributed successfully!

🎉 Demo completed successfully!
```

## 📚 API Reference

### FeeSplitterClient Class

#### Constructor
```typescript
constructor(network?: Network, moduleAddress?: string)
```

#### Methods

**`fundAccount(accountAddress, amount?)`**
- Fund an account from faucet
- Returns: `Promise<void>`

**`checkBalance(name, address)`**
- Check APT balance for an account
- Returns: `Promise<number>`

**`createSplitter(creator, recipients)`**
- Create a new fee splitter
- Returns: `Promise<string>` (transaction hash)

**`distributeFees(sender, splitterOwnerAddress, amount)`**
- Distribute fees to recipients
- Returns: `Promise<string>` (transaction hash)

**`getSplitterInfo(splitterAddress)`**
- Get splitter configuration and info
- Returns: `Promise<SplitterInfo | null>`

**`splitterExists(splitterAddress)`**
- Check if splitter exists at address
- Returns: `Promise<boolean>`

## 🔧 Configuration

### Environment Variables
Create a `.env` file for configuration:
```env
NETWORK=devnet
MODULE_ADDRESS=0x...
PRIVATE_KEY=0x... # For testing only
```

### Network Configuration
Supported networks:
- `devnet` (default)
- `testnet`
- `mainnet`

## 🚨 Important Notes

### Security Warnings
- Never expose private keys in production
- Always validate recipient addresses
- Test thoroughly on devnet before mainnet deployment
- Consider gas costs for large recipient lists

### Limitations
- Maximum recipients limited by transaction size
- Shares must be positive integers
- Requires sufficient balance for distribution

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For questions and support:
- Create an issue on GitHub
- Check the [Aptos documentation](https://aptos.dev/)
- Join the [Aptos Discord](https://discord.gg/aptoslabs)

---

**Built with ❤️ for the Aptos ecosystem** 