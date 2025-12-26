// Copyright © Aptos
// SPDX-License-Identifier: Apache-2.0

import type { EntryFunctionPayloadResponse, MultisigPayloadResponse } from '@aptos-labs/ts-sdk';

export type EntryFunctionJsonTransactionPayload = EntryFunctionPayloadResponse & {
  type: 'entry_function_payload';
};

export type MultisigJsonTransactionPayload = MultisigPayloadResponse & {
  type: 'multisig_payload';
};

export type JsonTransactionPayload = EntryFunctionJsonTransactionPayload | MultisigJsonTransactionPayload;
