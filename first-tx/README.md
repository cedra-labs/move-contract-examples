# CEDRA First Transaction Tutorial

Master creating, signing, and submitting transactions on the CEDRA blockchain. This enhanced example includes comprehensive error handling, gas optimization, configuration management, and best practices.

## 📋 Quick Links

- **Quick Start**: [Jump to Quick Start](#-quick-start)
- **Configuration**: [Environment Setup](#-configuration)
- **Features**: [What's New](#-whats-new)
- **Advanced**: [Developer Guide](./DEVELOPER_GUIDE.md)

## ✨ What's New

- **🔧 Environment Configuration**: Testnet/mainnet selection, custom RPC endpoints
- **❌ Better Error Handling**: Custom error types, retry logic, helpful messages
- **⚡ Gas Optimization**: Detailed cost analysis, efficiency tracking
- **👤 Account Management**: Generate new or reuse existing accounts
- **🏁 Dry Run Mode**: Test without submitting to blockchain
- **⏱️ Timeout Protection**: Configurable confirmation timeouts
- **🎯 Reusable Utilities**: Modular functions for common operations
- **✔️ Type Safety**: Strict TypeScript with complete type checking

## 📋 Prerequisites

- Node.js v16+
- npm or yarn

## 🚀 Quick Start

### 1. Clone and Install

```bash
git clone https://github.com/cedra-labs/move-contract-examples.git
cd move-contract-examples/first-tx
npm install
```

### 2. Run

```bash
npm start
```

### 3. Save Your Keys (First Run)

The script outputs account credentials. Save them for reuse:

```bash
export ALICE_PRIVATE_KEY="0x..."
export BOB_PRIVATE_KEY="0x..."
npm start
```

## ⚙️ Configuration

### Environment Variables

Create `.env` file (copy from `.env.example`):

```bash
# Network: testnet or mainnet
CEDRA_NETWORK=testnet

# Optional: custom RPC endpoint
CEDRA_RPC_ENDPOINT=

# Transaction amounts (in sub-units, 1 CEDRA = 100,000,000 sub-units)
TRANSFER_AMOUNT=1000
FAUCET_AMOUNT=100000000

# Options
DRY_RUN=false
WAIT_FOR_CONFIRMATION=true
CONFIRMATION_TIMEOUT_MS=30000
LOG_LEVEL=info
```

### Quick Commands

```bash
npm start                   # Default (testnet)
npm run dry-run            # Test without submitting
npm run mainnet            # Run on mainnet
npm run dev                # Development with full output
npm run build              # Compile TypeScript
npm run lint               # Type check
```

## 📖 Usage Examples

### Basic Transaction

```bash
npm start
```

### Test Before Submitting

```bash
npm run dry-run
```

### Using Saved Accounts

```bash
# Set environment variables
export ALICE_PRIVATE_KEY="0xYourSavedKey"
export BOB_PRIVATE_KEY="0xYourSavedKey"

# Run
npm start
```

### Custom Transfer Amount

```bash
TRANSFER_AMOUNT=5000000 npm start  # Transfer 0.05 CEDRA
```

### Mainnet Deployment

```bash
npm run mainnet
```

### Longer Timeout

```bash
CONFIRMATION_TIMEOUT_MS=60000 npm start
```

## �� Project Structure

```
first-tx/
├── src/
│   ├── first-transaction.ts    Main transaction flow
│   ├── config.ts              Configuration management
│   ├── errors.ts              Error types & handling
│   ├── utils.ts               Reusable utilities
│   └── index.ts               Public exports
├── dist/                      Compiled JavaScript
├── .env.example              Configuration template
├── package.json              Dependencies
├── tsconfig.json             TypeScript config
├── DEVELOPER_GUIDE.md        Advanced documentation
└── README.md                 This file
```

## 🔌 Key Features

### Gas Analysis

Detailed breakdown of transaction costs:

```
=== Gas Efficiency ===
Estimated gas cost: 0.000123 CEDRA
Actual gas cost: 0.000120 CEDRA
Difference: -0.000003 CEDRA (-2.44%)
```

### Error Handling

Comprehensive error management:

```bash
❌ Error [Account Setup]:
Insufficient funds. Required: 1.00 CEDRA, Available: 0.50 CEDRA

💡 Fund your account using: npm run dev
Or increase FAUCET_AMOUNT in .env
```

### Automatic Retries

Faucet funding with exponential backoff:

```
Funding attempt 1/3...
⚠️  Faucet attempt 1 failed. Retrying in 1000ms...
Funding attempt 2/3...
✅ Account funded: 1.00 CEDRA
```

### Dry Run Mode

Test without submitting:

```bash
DRY_RUN=true npm start
```

## 🚀 Advanced Features

See [DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md) for:

- **Architecture & Design**: Module structure and data flow
- **Extending the Code**: Custom use cases and examples
- **Testing**: Unit and integration test patterns
- **Performance**: Gas and network optimization
- **Security**: Key management best practices
- **Debugging**: Common issues and solutions

## 🐛 Troubleshooting

### Network Error

```bash
# Try custom RPC endpoint
CEDRA_RPC_ENDPOINT=https://custom-rpc.cedra.network npm start
```

### Insufficient Funds

```bash
# Increase faucet amount
FAUCET_AMOUNT=500000000 npm start
```

### Timeout Error

```bash
# Increase timeout
CONFIRMATION_TIMEOUT_MS=60000 npm start
```

### Simulation Failed

Check transaction parameters and recipient address validity.

## 💡 Best Practices

### 1. **Always Test First**
```bash
npm run dry-run  # Then
npm start        # Execute
```

### 2. **Secure Keys**
```bash
# Add to .gitignore
.env
.env.local

# Use environment variables
export ALICE_PRIVATE_KEY="0x..."
```

### 3. **Monitor Gas Costs**
Check the "Gas Efficiency" section in output to understand and optimize costs.

### 4. **Use Appropriate Networks**
- Testnet for development and testing
- Mainnet for production (with appropriate caution)

### 5. **Enable Logging**
```bash
LOG_LEVEL=debug npm start
```

## 📚 API Reference

### Main Functions

| Function | Purpose |
|----------|---------|
| `initializeCedraClient()` | Setup CEDRA client |
| `fundFromFaucet()` | Fund account with retry logic |
| `getBalance()` | Check account balance |
| `analyzeGas()` | Calculate gas costs |
| `formatBalance()` | Format output |

### Error Types

- `InsufficientFundsError`: Balance too low
- `TransactionSimulationError`: Simulation failed
- `TransactionTimeoutError`: Confirmation timeout
- `NetworkError`: Network issue
- `ConfigurationError`: Config problem

See [utils.ts](./src/utils.ts), [errors.ts](./src/errors.ts), and [config.ts](./src/config.ts) for full API documentation.

## 📚 Additional Resources

- [CEDRA Documentation](https://docs.cedra.network)
- [TypeScript SDK](https://docs.cedra.network/getting-started/tx)
- [Move Language](https://docs.cedra.network/concepts/move)
- [Explorer](https://explorer.testnet.cedra.network)

## 📄 License

Apache-2.0

## 🤝 Contributing

Contributions welcome! See [CONTRIBUTING.md](../../CONTRIBUTING.md) for guidelines.
