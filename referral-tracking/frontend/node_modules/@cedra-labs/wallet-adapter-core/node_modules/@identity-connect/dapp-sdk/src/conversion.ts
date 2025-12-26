// Copyright © Aptos
// SPDX-License-Identifier: Apache-2.0

import {
  AccountAddress,
  AnyTransactionPayloadInstance,
  AptosConfig,
  EntryFunctionArgumentTypes,
  generateTransactionPayload,
  generateTransactionPayloadWithABI,
  InputGenerateTransactionPayloadData,
  SimpleEntryFunctionArgumentTypes,
  TransactionPayload,
} from '@aptos-labs/ts-sdk';
import { JsonTransactionPayload } from '@identity-connect/wallet-api';

type EntryFunctionArgument = SimpleEntryFunctionArgumentTypes | EntryFunctionArgumentTypes;
type SerializableArgument = undefined | null | number | string | boolean | Uint8Array | SerializableArgument[];

/**
 * Return an equivalent argument value that can be safely serialized.
 */
function convertToSerializableArgument(argument: EntryFunctionArgument): SerializableArgument {
  if (argument === undefined || argument === null) {
    return argument;
  }

  if (Array.isArray(argument)) {
    return argument.map((subArgument) => convertToSerializableArgument(subArgument));
  }

  if (
    typeof argument === 'string' ||
    typeof argument === 'number' ||
    typeof argument === 'boolean' ||
    argument instanceof Uint8Array
  ) {
    return argument;
  }

  if (typeof argument === 'bigint') {
    return argument.toString();
  }

  // ArrayBuffer
  if (argument instanceof ArrayBuffer) {
    return new Uint8Array(argument);
  }

  // MoveVector
  if ('values' in argument) {
    return argument.values.map((subArgument) => convertToSerializableArgument(subArgument));
  }

  // AccountAddress
  if ('data' in argument) {
    return AccountAddress.from(argument.data).toString();
  }

  // MoveOption
  if (argument.value === undefined) {
    return undefined;
  }

  if (
    typeof argument.value === 'string' ||
    typeof argument.value === 'number' ||
    typeof argument.value === 'boolean' ||
    argument.value instanceof Uint8Array
  ) {
    return argument.value;
  }

  if (typeof argument.value === 'bigint') {
    return argument.value.toString();
  }

  throw new Error('Unexpected argument');
}

/**
 * Normalize payload input so that it's compatible with IC requests.
 * This variant is sync and will convert a payload generation input into a
 * `JsonTransactionPayload` when the ABI is not available
 */
export function normalizePayloadForIC(
  payload: TransactionPayload | InputGenerateTransactionPayloadData,
): AnyTransactionPayloadInstance | JsonTransactionPayload;
/**
 * Normalize payload input so that it's compatible with IC requests.
 * This variant is async and will generate a payload instance when an input is provided
 */
export async function normalizePayloadForIC(
  payload: TransactionPayload | InputGenerateTransactionPayloadData,
  aptosConfig: AptosConfig,
): Promise<AnyTransactionPayloadInstance>;

export function normalizePayloadForIC(
  payload: TransactionPayload | InputGenerateTransactionPayloadData,
  aptosConfig?: AptosConfig,
): AnyTransactionPayloadInstance | JsonTransactionPayload | Promise<AnyTransactionPayloadInstance> {
  if ('bcsToBytes' in payload) {
    return payload as AnyTransactionPayloadInstance;
  }
  if ('bytecode' in payload) {
    // The signature of this function returns a promise, but it's actually sync code
    return generateTransactionPayload(payload);
  }
  if (aptosConfig) {
    return payload.abi !== undefined
      ? generateTransactionPayloadWithABI({ ...payload, abi: payload.abi })
      : generateTransactionPayload({ aptosConfig, ...payload });
  }

  const entryFunctionPayload = {
    arguments: payload.functionArguments.map(convertToSerializableArgument),
    function: payload.function,
    type: 'entry_function_payload' as const,
    type_arguments: (payload.typeArguments ?? []).map((ta) => ta.toString()),
  };

  return 'multisigAddress' in payload
    ? {
        multisig_address: AccountAddress.from(payload.multisigAddress).toString(),
        transaction_payload: entryFunctionPayload,
        type: 'multisig_payload' as const,
      }
    : entryFunctionPayload;
}
