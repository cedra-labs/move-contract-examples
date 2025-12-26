// Copyright © Aptos
// SPDX-License-Identifier: Apache-2.0

import type { AccountAuthenticator, RawTransaction } from '@aptos-labs/ts-sdk';

export interface SignTransactionWithPayloadResponseArgs {
  accountAuthenticator: AccountAuthenticator;
  rawTxn: RawTransaction;
}

export interface SignTransactionWithRawTxnResponseArgs {
  accountAuthenticator: AccountAuthenticator;
}

export type SignTransactionResponseArgs =
  | SignTransactionWithPayloadResponseArgs
  | SignTransactionWithRawTxnResponseArgs;
