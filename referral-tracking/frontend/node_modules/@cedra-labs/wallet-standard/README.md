# Cedra Wallet Standard

The Cedra Wallet Standard defines APIs for wallet and application interactions for the Cedra ecosystem.

It is based on a general [Wallet Standard](https://github.com/wallet-standard/wallet-standard) which is is a chain-agnostic set of interfaces and conventions that aim to improve how applications interact with injected wallets.

## Code

- [CedraWallet](./src/wallet.ts) and [CedraWalletAccount](./src/account.ts) interfaces
- Wallet [registerWallet](https://github.com/wallet-standard/wallet-standard/blob/master/packages/core/wallet/src/register.ts#L25) function
- App [getCedraWallets](./src/detect.ts) function
- Example of a [wallet integration](./example/basic/wallet.ts)
