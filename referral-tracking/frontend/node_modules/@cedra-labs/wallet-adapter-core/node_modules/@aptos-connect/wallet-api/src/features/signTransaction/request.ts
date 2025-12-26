// Copyright © Aptos
// SPDX-License-Identifier: Apache-2.0

/* eslint-disable no-inner-declarations */

import {
  AccountAddress,
  Deserializer,
  InputGenerateTransactionPayloadData,
  Network,
  PublicKey,
  RawTransaction,
  Serializer,
  TransactionPayload,
} from '@aptos-labs/ts-sdk';
import { chainIdToNetwork, isSupportedNetwork } from '../../helpers';
import {
  AccountInput,
  DappInfo,
  deserializeAccountInput,
  deserializeTransactionPayloadInput,
  serializeAccountInput,
  serializeTransactionPayloadInput,
} from '../../shared';
import {
  deserializeWalletRequestWithArgs,
  SerializedWalletRequest,
  serializeWalletRequestWithArgs,
  WalletRequest,
} from '../../WalletRequest';

export interface SignTransactionRequest
  extends WalletRequest<SignTransactionRequest.RequestName, SignTransactionRequest.SupportedVersions> {
  args: SignTransactionRequest.Args;
}

export namespace SignTransactionRequest {
  export const name = 'signTransaction' as const;
  export type RequestName = typeof name;

  export const supportedVersions = [1, 2, 3, 4] as const;
  export type SupportedVersions = (typeof supportedVersions)[number];
  export const currentVersion = 4 as const;
  export type CurrentVersion = typeof currentVersion;

  // region Args

  export interface Args {
    expirationSecondsFromNow?: number;
    expirationTimestamp?: number;
    feePayer?: AccountInput;
    gasUnitPrice?: number;
    maxGasAmount?: number;
    network?: Network;
    payload: TransactionPayload | InputGenerateTransactionPayloadData;
    secondarySigners?: AccountInput[];
    sender?: AccountInput;
    sequenceNumber?: number | bigint;
    signerAddress?: AccountAddress;
  }

  export interface ArgsWithTransaction {
    feePayer?: AccountInput;
    secondarySigners?: AccountInput[];
    senderPublicKey?: PublicKey;
    signerAddress?: AccountAddress;
    transaction: RawTransaction;
  }

  export function normalizeArgs(args: ArgsWithTransaction): Args {
    const { feePayer, secondarySigners, senderPublicKey, signerAddress, transaction } = args;

    const sender: AccountInput = {
      address: transaction.sender,
      publicKey: senderPublicKey,
    };

    const network = chainIdToNetwork(args.transaction.chain_id.chainId);

    return {
      expirationTimestamp: Number(transaction.expiration_timestamp_secs),
      feePayer,
      gasUnitPrice: Number(transaction.gas_unit_price),
      maxGasAmount: Number(transaction.max_gas_amount),
      network,
      payload: transaction.payload,
      secondarySigners,
      sender,
      signerAddress,
    };
  }

  function serializeArgs(serializer: Serializer, value: Args) {
    if (value.network !== undefined && !isSupportedNetwork(value.network)) {
      throw new Error(`Unsupported network '${value.network}'`);
    }

    serializer.serializeBool(value.signerAddress !== undefined);
    if (value.signerAddress !== undefined) {
      serializer.serialize(value.signerAddress);
    }

    serializer.serializeOptionStr(value.network);
    serializer.serializeBool(value.sender !== undefined);
    if (value.sender !== undefined) {
      serializeAccountInput(serializer, value.sender);
    }

    if ('bcsToBytes' in value.payload) {
      serializer.serializeBool(true);
      serializer.serialize(value.payload);
    } else {
      serializer.serializeBool(false);
      serializeTransactionPayloadInput(serializer, value.payload);
    }

    serializer.serializeU32AsUleb128(value.expirationSecondsFromNow ?? 0);
    serializer.serializeU64(value.expirationTimestamp ?? 0);
    serializer.serializeU32AsUleb128(value.gasUnitPrice ?? 0);
    serializer.serializeU32AsUleb128(value.maxGasAmount ?? 0);

    serializer.serializeBool(value.feePayer !== undefined);
    if (value.feePayer !== undefined) {
      serializeAccountInput(serializer, value.feePayer);
    }

    const secondarySigners = value.secondarySigners ?? [];
    serializer.serializeU32AsUleb128(secondarySigners.length);
    for (const signer of secondarySigners) {
      serializeAccountInput(serializer, signer);
    }
  }

  function deserializeArgs(deserializer: Deserializer, version: SupportedVersions): Args {
    const hasSignerAddress = version >= 3 && deserializer.deserializeBool();
    const signerAddress = hasSignerAddress ? deserializer.deserialize(AccountAddress) : undefined;

    const network = version === 1 ? deserializer.deserializeStr() : deserializer.deserializeOption('string');
    if (network !== undefined && !isSupportedNetwork(network)) {
      throw new Error(`Unsupported network '${network}'`);
    }

    const hasSender = deserializer.deserializeBool();
    const sender = hasSender ? deserializeAccountInput(deserializer) : undefined;

    const isPayloadBcsSerializable = version < 4 || deserializer.deserializeBool();
    const payload = isPayloadBcsSerializable
      ? deserializer.deserialize(TransactionPayload)
      : deserializeTransactionPayloadInput(deserializer);

    const expirationSecondsFromNow = deserializer.deserializeUleb128AsU32();
    const expirationTimestamp = Number(deserializer.deserializeU64());
    const gasUnitPrice = deserializer.deserializeUleb128AsU32();
    const maxGasAmount = deserializer.deserializeUleb128AsU32();
    const hasFeePayer = deserializer.deserializeBool();
    const feePayer = hasFeePayer ? deserializeAccountInput(deserializer) : undefined;

    const secondarySignersLength = deserializer.deserializeUleb128AsU32();
    const secondarySigners: AccountInput[] = [];
    for (let i = 0; i < secondarySignersLength; i += 1) {
      secondarySigners.push(deserializeAccountInput(deserializer));
    }

    return {
      expirationSecondsFromNow: expirationSecondsFromNow > 0 ? expirationSecondsFromNow : undefined,
      expirationTimestamp: expirationTimestamp > 0 ? expirationTimestamp : undefined,
      feePayer,
      gasUnitPrice: gasUnitPrice > 0 ? gasUnitPrice : undefined,
      maxGasAmount: maxGasAmount > 0 ? maxGasAmount : undefined,
      network,
      payload,
      secondarySigners,
      sender,
      signerAddress,
    };
  }

  // endregion

  // region Request

  export function serialize(dappInfo: DappInfo, args: Args): SerializedWalletRequest<RequestName, CurrentVersion> {
    const request = { args, dappInfo, name, version: currentVersion };
    return serializeWalletRequestWithArgs(request, serializeArgs);
  }

  export function deserialize(
    serializedRequest: SerializedWalletRequest<RequestName, SupportedVersions>,
  ): SignTransactionRequest {
    return deserializeWalletRequestWithArgs(serializedRequest, (deserializer) =>
      deserializeArgs(deserializer, serializedRequest.version),
    );
  }

  export function isSerialized(
    request: SerializedWalletRequest,
  ): request is SerializedWalletRequest<RequestName, SupportedVersions> {
    return request.name === name && supportedVersions.includes(request.version as SupportedVersions);
  }

  // endregion
}
