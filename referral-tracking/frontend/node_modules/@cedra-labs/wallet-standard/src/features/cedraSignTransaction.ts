// Copyright © Cedra Foundation
// SPDX-License-Identifier: Apache-2.0

import {
  AccountAddress,
  AccountAuthenticator,
  AnyRawTransaction,
  InputGenerateTransactionPayloadData,
  Network,
  PublicKey,
  TransactionPayload
} from '@cedra-labs/ts-sdk'
import { UserResponse } from '../misc'

// region Feature definition

/** Name of the feature. */
export const CedraSignTransactionNamespace = 'cedra:signTransaction'

export type CedraSignTransactionFeatureV1_0 = {
  [CedraSignTransactionNamespace]: {
    version: '1.0.0',
    signTransaction: CedraSignTransactionMethod
  }
}

export type CedraSignTransactionFeatureV1_1 = {
  [CedraSignTransactionNamespace]: {
    version: '1.1'
    signTransaction: CedraSignTransactionMethod & CedraSignTransactionMethodV1_1
  }
}

/**
 * A Wallet Standard feature for signing an Cedra transaction, and returning the
 * account authenticator.
 */
export type CedraSignTransactionFeature =
  CedraSignTransactionFeatureV1_0 | CedraSignTransactionFeatureV1_1;

// endregion

// region V1.0

export type CedraSignTransactionOutput = AccountAuthenticator;

export type CedraSignTransactionMethod = (
  transaction: AnyRawTransaction,
  asFeePayer?: boolean
) => Promise<UserResponse<CedraSignTransactionOutput>>

// endregion

// region V1.1

export interface AccountInput {
  address: AccountAddress;
  publicKey?: PublicKey;
}

export interface CedraSignTransactionInputV1_1 {
  expirationSecondsFromNow?: number; // defaults to 30 seconds (depends on wallet)
  expirationTimestamp?: number;
  feePayer?: AccountInput; // defaults to no fee payer
  gasUnitPrice?: number; // defaults to estimated gas unit price
  maxGasAmount?: number; // defaults to simulation result with fuzz factor
  network?: Network; // defaults to active network
  payload: TransactionPayload | InputGenerateTransactionPayloadData;
  secondarySigners?: AccountInput[]; // defaults to no secondary signers
  sender?: AccountInput; // defaulting to active account (if applicable)
  sequenceNumber?: number | bigint; // defaulting to sender's sequence number
  signerAddress?: AccountAddress;
}

export interface CedraSignTransactionOutputV1_1 {
  authenticator: AccountAuthenticator;
  rawTransaction: AnyRawTransaction;
}

export type CedraSignTransactionMethodV1_1 = (
  input: CedraSignTransactionInputV1_1
) => Promise<UserResponse<CedraSignTransactionOutputV1_1>>;
