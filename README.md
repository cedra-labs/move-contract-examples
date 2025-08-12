# Cedra Move Contract Examples

Collection of Move examples for the Cedra ecosystem. Each subproject focuses on a specific on-chain pattern (DEX, fungible assets, NFTs, fee splitting, referrals, and more), complete with Move modules, tests, and optional TypeScript clients.


- Full Cedra docs: [docs.cedra.network](https://docs.cedra.network/)

## Projects

- DEX — constant-product AMM with slippage protection, price impact analysis, and multi-hop routing
  - Source: [`dex/`](dex/)
  - Guide: [`dex/README.md`](dex/README.md)
  - Docs: [Build a DEX on Cedra](https://docs.cedra.network/guides/dex)

- Fungible Asset (FA) example — minimal fungible asset module + TS client
  - Source: [`fa-example/contract`](fa-example/contract)
  - Guide: [`fa-example/README.md`](fa-example/README.md)
  - Docs: [Fungible Asset (FA) End-to-End Guide](https://docs.cedra.network/guides/first-fa)

- NFT example — collection + mint/transfer flows with TS client
  - Source: [`nft-example/contract`](nft-example/contract)
  - Guide: [`nft-example/README.md`](nft-example/README.md)
  - Docs: [NFT Contract - Full Code Walkthrough](https://docs.cedra.network/guides/first-nft)

- Fee Splitter — proportional distribution of payments to recipients
  - Source: [`fee-splitter/contract`](fee-splitter/contract)
  - Guide: [`fee-splitter/README.md`](fee-splitter/README.md)
  - Docs: [Build a Fee Splitter Contract](https://docs.cedra.network/guides/fee-splitter)

- First Transaction — minimal TS script to create, sign, and submit a transaction
  - Source: [`first-tx/`](first-tx/)
  - Guide: [`first-tx/README.md`](first-tx/README.md)
  - Docs: [Your First Transaction](https://docs.cedra.network/getting-started/tx)

- Referral system — on-chain referral tracking with a Next.js client
  - Source: [`referral/contract`](referral/contract)
  - Guide: [`referral/README.md`](referral/README.md)

- FA Lock — simple asset locking primitives (Move + tests)
  - Source: [`fa-lock/`](fa-lock/)
  - Docs: [Escrow / Token Vesting Guide](https://docs.cedra.network/guides/escrow)

- Faucets — example assets and a simple minting utility
  - Source: [`faucets/`](faucets/)

## Getting Started

Most contracts can be compiled, tested, and published with the Cedra CLI:

```bash
# inside a project folder (e.g., dex/)
cedra move test
cedra move compile --named-addresses my_addr=default
cedra move publish --named-addresses my_addr=default
```

Refer to each subproject’s README for exact commands and configuration.

## License

MIT