// Copyright © Aptos
// SPDX-License-Identifier: Apache-2.0

import {
  AccountInfo,
  base64ToBytes,
  bytesToBase64,
  deserializeAccountInfo,
  serializeAccountInfo,
} from '@aptos-connect/wallet-api';
import { AccountAddress, Deserializer, Serializer } from '@aptos-labs/ts-sdk';

const localDappStateKey = '@aptos-connect/dapp-local-state';

/**
 * Local dapp state loosely synced with the web wallet's state.
 * Due to browser restrictions (storage partitioning), it's no longer possible
 * to access the web wallet's state.
 */
interface DappLocalState {
  connectedAccounts: AccountInfo[];
}

function serializeLocalDappState(state: DappLocalState): Uint8Array {
  const serializer = new Serializer();
  serializer.serializeU32AsUleb128(state.connectedAccounts.length);
  for (const account of state.connectedAccounts) {
    serializeAccountInfo(serializer, account);
  }
  return serializer.toUint8Array();
}

function deserializeLocalDappState(serializedValue: Uint8Array): DappLocalState {
  const deserializer = new Deserializer(serializedValue);
  const connectedAccountsLength = deserializer.deserializeUleb128AsU32();
  const connectedAccounts: AccountInfo[] = [];
  for (let i = 0; i < connectedAccountsLength; i += 1) {
    connectedAccounts.push(deserializeAccountInfo(deserializer));
  }
  return { connectedAccounts };
}

function getState(): DappLocalState {
  const encodedValue = window.localStorage.getItem(localDappStateKey);
  return encodedValue ? deserializeLocalDappState(base64ToBytes(encodedValue)) : { connectedAccounts: [] };
}

function setState(state: DappLocalState) {
  const serializedValue = serializeLocalDappState(state);
  const encodedValue = bytesToBase64(serializedValue);
  window.localStorage.setItem(localDappStateKey, encodedValue);
}

export function getConnectedAccounts() {
  const state = getState();
  return state.connectedAccounts;
}

export function addConnectedAccount(account: AccountInfo) {
  const { connectedAccounts, ...state } = getState();
  connectedAccounts.push(account);
  setState({ ...state, connectedAccounts });
}

export function removeConnectedAccount(address: AccountAddress) {
  const { connectedAccounts, ...state } = getState();
  const index = connectedAccounts.findIndex((a) => a.address.equals(address));
  if (index >= 0) {
    connectedAccounts.splice(index, 1);
  }
  setState({ ...state, connectedAccounts });
}
