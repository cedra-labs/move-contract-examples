// Copyright © Cedra Foundation
// SPDX-License-Identifier: Apache-2.0

import { InputGenerateTransactionPayloadData } from '@cedra-labs/ts-sdk'
import { UserResponse } from '../misc'

/** Version of the feature. */
export type CedraSignAndSubmitTransactionVersion = '1.1.0'
/** Name of the feature. */
export const CedraSignAndSubmitTransactionNamespace = 'cedra:signAndSubmitTransaction'
/**
 * A Wallet Standard feature for signing a transaction, and returning the
 * hash of the transaction.
 */
export type CedraSignAndSubmitTransactionFeature = {
  /** Namespace for the feature. */
  [CedraSignAndSubmitTransactionNamespace]: {
    /** Version of the feature API. */
    version: CedraSignAndSubmitTransactionVersion
    signAndSubmitTransaction: CedraSignAndSubmitTransactionMethod
  }
}

export type CedraSignAndSubmitTransactionMethod = (
  transaction: CedraSignAndSubmitTransactionInput
) => Promise<UserResponse<CedraSignAndSubmitTransactionOutput>>

export interface CedraSignAndSubmitTransactionInput {
  gasUnitPrice?: number;  // defaults to estimated gas unit price
  maxGasAmount?: number;  // defaults to estimated max gas amount
  payload: InputGenerateTransactionPayloadData;
}

export interface CedraSignAndSubmitTransactionOutput {
  hash: string;
}
