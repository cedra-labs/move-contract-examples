// Copyright © Aptos
// SPDX-License-Identifier: Apache-2.0

import { AccountAuthenticator, RawTransaction } from '@aptos-labs/ts-sdk';
import type { SignTransactionResponseArgs } from '../types';
import { bcsDeserialize, bcsSerialize } from './bcsSerialization';

export interface SerializedSignTransactionWithPayloadResponseArgs {
  accountAuthenticator: string;
  rawTxn: string;
}

export interface SerializedSignTransactionWithRawTxnResponseArgs {
  accountAuthenticator: string;
}

export type SerializedSignTransactionResponseArgs =
  | SerializedSignTransactionWithPayloadResponseArgs
  | SerializedSignTransactionWithRawTxnResponseArgs;

export function serializeSignTransactionResponseArgs(
  args: SignTransactionResponseArgs,
): SerializedSignTransactionResponseArgs {
  const accountAuthenticator = bcsSerialize(args.accountAuthenticator);
  if ('rawTxn' in args) {
    const rawTxn = bcsSerialize(args.rawTxn);
    return { accountAuthenticator, rawTxn };
  }
  return { accountAuthenticator };
}

export function deserializeSignTransactionResponseArgs(
  args: SerializedSignTransactionResponseArgs,
): SignTransactionResponseArgs {
  const accountAuthenticator = bcsDeserialize(AccountAuthenticator, args.accountAuthenticator);
  if ('rawTxn' in args) {
    const rawTxn = bcsDeserialize(RawTransaction, args.rawTxn);
    return { accountAuthenticator, rawTxn };
  }
  return { accountAuthenticator };
}
