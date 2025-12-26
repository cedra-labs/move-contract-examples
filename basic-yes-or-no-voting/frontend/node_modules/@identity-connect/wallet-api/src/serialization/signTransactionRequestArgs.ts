// Copyright © Aptos
// SPDX-License-Identifier: Apache-2.0

import { TransactionPayload } from '@aptos-labs/ts-sdk';
import type {
  JsonTransactionPayload,
  SignTransactionRequestArgs,
  SignTransactionRequestV1Args,
  SignTransactionWithPayloadRequestArgs,
  SignTransactionWithRawTxnRequestArgs,
  TransactionOptions,
} from '../types';
import { bcsDeserialize, bcsSerialize, isBcsSerializable } from './bcsSerialization';
import { UnexpectedValueError } from './error';
import { deserializeJsonTransactionPayload, serializeJsonTransactionPayload } from './jsonPayload';
import type { SerializedRawTransaction } from './rawTxn';
import { deserializeRawTransaction, serializeRawTransaction } from './rawTxn';

export interface SerializedSignTransactionWithPayloadRequestArgs {
  options?: TransactionOptions;
  payload: JsonTransactionPayload | string;
}

export interface SerializedSignTransactionWithRawTxnRequestArgs {
  rawTxn: SerializedRawTransaction;
}

export type SerializedSignTransactionRequestArgs =
  | SerializedSignTransactionWithPayloadRequestArgs
  | SerializedSignTransactionWithRawTxnRequestArgs;

export function serializeSignTransactionRequestArgs(
  args: SignTransactionRequestArgs | SignTransactionRequestV1Args,
): SerializedSignTransactionRequestArgs {
  if ('payload' in args) {
    const serializedPayload = isBcsSerializable(args.payload)
      ? bcsSerialize(args.payload)
      : serializeJsonTransactionPayload(args.payload);
    return { options: args.options, payload: serializedPayload };
  }
  if ('rawTxn' in args) {
    const serializedRawTxn = serializeRawTransaction(args.rawTxn);
    return { rawTxn: serializedRawTxn };
  }
  throw new UnexpectedValueError();
}

export function deserializeSignTransactionRequestArgs(
  args: SerializedSignTransactionWithPayloadRequestArgs,
): SignTransactionWithPayloadRequestArgs;
export function deserializeSignTransactionRequestArgs(
  args: SerializedSignTransactionWithRawTxnRequestArgs,
): SignTransactionWithRawTxnRequestArgs;
export function deserializeSignTransactionRequestArgs(
  args: SerializedSignTransactionRequestArgs,
): SignTransactionRequestArgs;

export function deserializeSignTransactionRequestArgs(
  args: SerializedSignTransactionRequestArgs,
): SignTransactionRequestArgs {
  if ('payload' in args) {
    const payload =
      typeof args.payload === 'string'
        ? bcsDeserialize(TransactionPayload, args.payload)
        : deserializeJsonTransactionPayload(args.payload);
    return { options: args.options, payload };
  }
  if ('rawTxn' in args) {
    const deserializedRawTxn = deserializeRawTransaction(args.rawTxn);
    return { rawTxn: deserializedRawTxn };
  }
  throw new UnexpectedValueError();
}
