// Copyright © Aptos
// SPDX-License-Identifier: Apache-2.0

import type {
  FeePayerRawTransaction,
  MultiAgentRawTransaction,
  RawTransaction,
  TransactionPayload,
} from '@aptos-labs/ts-sdk';
import { JsonTransactionPayload } from '../jsonPayload';
import { TransactionOptions } from '../transactionOptions';

export interface SignTransactionWithPayloadRequestArgs {
  options?: TransactionOptions;
  payload: JsonTransactionPayload | TransactionPayload;
}

export interface SignTransactionWithRawTxnRequestArgs {
  rawTxn: RawTransaction | FeePayerRawTransaction | MultiAgentRawTransaction;
}

export type SignTransactionRequestArgs = SignTransactionWithPayloadRequestArgs | SignTransactionWithRawTxnRequestArgs;
