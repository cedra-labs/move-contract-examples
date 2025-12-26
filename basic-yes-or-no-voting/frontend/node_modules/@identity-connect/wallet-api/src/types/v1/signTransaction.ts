// Copyright © Aptos
// SPDX-License-Identifier: Apache-2.0

import { TxnBuilderTypes } from 'aptos';
import { JsonTransactionPayload } from '../jsonPayload';
import { TransactionOptions } from '../transactionOptions';

export interface SignTransactionWithPayloadRequestV1Args {
  options?: TransactionOptions;
  payload: JsonTransactionPayload | TxnBuilderTypes.TransactionPayload;
}

export interface SignTransactionWithRawTxnRequestV1Args {
  rawTxn:
    | TxnBuilderTypes.RawTransaction
    | TxnBuilderTypes.FeePayerRawTransaction
    | TxnBuilderTypes.MultiAgentRawTransaction;
}

export type SignTransactionRequestV1Args =
  | SignTransactionWithPayloadRequestV1Args
  | SignTransactionWithRawTxnRequestV1Args;

export interface SignTransactionWithPayloadResponseV1Args {
  accountAuthenticator: TxnBuilderTypes.AccountAuthenticator;
  rawTxn: TxnBuilderTypes.RawTransaction;
}

export interface SignTransactionWithRawTxnResponseV1Args {
  accountAuthenticator: TxnBuilderTypes.AccountAuthenticator;
}

export type SignTransactionResponseV1Args =
  | SignTransactionWithPayloadResponseV1Args
  | SignTransactionWithRawTxnResponseV1Args;
