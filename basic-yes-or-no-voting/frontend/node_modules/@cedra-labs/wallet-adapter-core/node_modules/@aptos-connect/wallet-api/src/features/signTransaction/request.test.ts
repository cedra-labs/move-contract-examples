// Copyright © Aptos
// SPDX-License-Identifier: Apache-2.0

import {
  AccountAddress,
  ChainId,
  EntryFunction,
  Network,
  RawTransaction,
  TransactionPayloadEntryFunction,
} from '@aptos-labs/ts-sdk';
import { SignTransactionRequest } from './request';

describe('SignTransactionRequest', () => {
  const cases = [
    [1, Network.MAINNET],
    [2, Network.TESTNET],
    [10, Network.DEVNET],
    [100, Network.DEVNET],
  ] as const;

  describe('normalizeArgs', () => {
    it.each(cases)('converts chainId %p to network %p', (chainId, expectedNetwork) => {
      const entryFunction = EntryFunction.build('0x1::coin', 'transfer', [], []);
      const payload = new TransactionPayloadEntryFunction(entryFunction);
      const senderAddress = AccountAddress.ONE;
      const transaction = new RawTransaction(senderAddress, 0n, payload, 0n, 0n, 0n, new ChainId(chainId));
      const normalizedArgs = SignTransactionRequest.normalizeArgs({
        transaction,
      });
      expect(normalizedArgs.network).toEqual(expectedNetwork);
    });
  });
});
