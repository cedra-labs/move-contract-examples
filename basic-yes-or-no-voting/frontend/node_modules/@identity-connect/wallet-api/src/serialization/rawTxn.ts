// Copyright © Aptos
// SPDX-License-Identifier: Apache-2.0

import {
  FeePayerRawTransaction,
  MultiAgentRawTransaction,
  RawTransaction,
  RawTransactionWithData,
} from '@aptos-labs/ts-sdk';
import { TxnBuilderTypes } from 'aptos';
import { bcsDeserialize, bcsSerialize } from './bcsSerialization';
import { UnexpectedValueError } from './error';

export type SerializableRawTransaction = RawTransaction | FeePayerRawTransaction | MultiAgentRawTransaction;

export type SerializableRawTransactionV1 =
  | TxnBuilderTypes.RawTransaction
  | TxnBuilderTypes.FeePayerRawTransaction
  | TxnBuilderTypes.MultiAgentRawTransaction;

export interface SerializedSimpleRawTransaction {
  type: 'raw_txn';
  value: string;
}

export interface SerializedFeePayerRawTransaction {
  type: 'fee_payer_raw_txn';
  value: string;
}

export interface SerializedMultiAgentRawTransaction {
  type: 'multi_agent_raw_txn';
  value: string;
}

export type SerializedRawTransaction =
  | SerializedSimpleRawTransaction
  | SerializedFeePayerRawTransaction
  | SerializedMultiAgentRawTransaction;

export function serializeRawTransaction(
  rawTxn: RawTransaction | TxnBuilderTypes.RawTransaction,
): SerializedSimpleRawTransaction;
export function serializeRawTransaction(
  rawTxn: FeePayerRawTransaction | TxnBuilderTypes.FeePayerRawTransaction,
): SerializedFeePayerRawTransaction;
export function serializeRawTransaction(
  rawTxn: MultiAgentRawTransaction | TxnBuilderTypes.MultiAgentRawTransaction,
): SerializedMultiAgentRawTransaction;
export function serializeRawTransaction(
  rawTxn: SerializableRawTransaction | SerializableRawTransactionV1,
): SerializedRawTransaction;

export function serializeRawTransaction(
  rawTxn: SerializableRawTransaction | SerializableRawTransactionV1,
): SerializedRawTransaction {
  const value = bcsSerialize(rawTxn);
  if ('fee_payer_address' in rawTxn) {
    return { type: 'fee_payer_raw_txn', value };
  }
  if ('secondary_signer_addresses' in rawTxn) {
    return { type: 'multi_agent_raw_txn', value };
  }
  if ('chain_id' in rawTxn) {
    return { type: 'raw_txn', value };
  }
  throw new UnexpectedValueError('Invalid raw transaction type');
}

export function deserializeRawTransaction(serialized: SerializedSimpleRawTransaction): RawTransaction;
export function deserializeRawTransaction(serialized: SerializedFeePayerRawTransaction): FeePayerRawTransaction;
export function deserializeRawTransaction(serialized: SerializedMultiAgentRawTransaction): MultiAgentRawTransaction;
export function deserializeRawTransaction(serialized: SerializedRawTransaction): SerializableRawTransaction;

export function deserializeRawTransaction(serialized: SerializedRawTransaction): SerializableRawTransaction {
  switch (serialized.type) {
    case 'raw_txn':
      return bcsDeserialize(RawTransaction, serialized.value);
    case 'fee_payer_raw_txn':
      return bcsDeserialize(RawTransactionWithData, serialized.value) as FeePayerRawTransaction;
    case 'multi_agent_raw_txn':
      return bcsDeserialize(RawTransactionWithData, serialized.value) as MultiAgentRawTransaction;
    default:
      throw new UnexpectedValueError('Invalid raw transaction type');
  }
}
