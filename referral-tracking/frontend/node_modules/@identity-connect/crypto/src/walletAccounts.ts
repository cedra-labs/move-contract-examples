// Copyright © Aptos
// SPDX-License-Identifier: Apache-2.0

// Adding or removing an account? This will be idempotent, but racy
import { Account, AccountPublicKey, PublicKey as AptosPublicKey, Signature } from '@aptos-labs/ts-sdk';
import { sha3_256 } from '@noble/hashes/sha3';
import { messageHash, signWithEd25519SecretKey } from './encrDecr';
import { serializePublicKeyB64, serializeSignatureB64 } from './serialization';
import { Ed25519KeyPair, ed25519KeypairFromSecret, Ed25519PublicKey, Ed25519SecretKey, encodeBase64 } from './utils';

// ADD/REMOVE is used for account connections
export enum AccountConnectionAction {
  ADD = 'add',
  REMOVE = 'remove',
}

/**
 * When a wallet wants to create a pairing, or add/remove an account from a wallet connection, it must prove that it
 * has the secret key for a given account. To do so it uses an `AccountConnectInfo` object.
 *  1. Once the `AccountConnectInfo` is assembled, it’s JSON serialized to get a `accountInfoSerialized` string.
 *  2. We then domain separate and hash the `accountInfoSerialized` to get the `accountInfoHash`:
 *    `SHA3-256(SHA3-256('APTOS::IDENTITY_CONNECT::') | SHA3-256(accountInfoSerialized))`
 *  3. To obtain the `signature`, we sign the `accountInfoHash` with the Ed25519 private key of the sender, and hex
 *     encode it.
 *  4. These are assembled into an `AccountConnectInfoSerialized`, ready to be sent in an HTTP request.
 */

export type BaseAccountConnectInfo = {
  // The account address
  accountAddress: string;
  // either 'add' or 'remove'
  action: AccountConnectionAction;
  // A unique identifier for this connection: it is either the walletId or the pairingId
  // Prevents replay attacks across wallets
  intentId: string;
  // Prevents replay attacks across time- these are only valid for 5 minutes
  timestampMillis: number;
  // The public key for the encrypted e2e channel, base64
  transportEd25519PublicKeyB64: string;
};

export type Ed25519AccountConnectInfo = BaseAccountConnectInfo & {
  // The account ed25519 public key, base64
  ed25519PublicKeyB64: string;
  publicKeyB64?: undefined;
};

export type AnyAccountConnectInfo = BaseAccountConnectInfo & {
  ed25519PublicKeyB64?: undefined;
  // The account public key, bcs-serialized and base64-encoded
  publicKeyB64: string;
};

// Ensuring compatibility with previous wallet-sdk versions
export type AccountConnectInfo = Ed25519AccountConnectInfo | AnyAccountConnectInfo;

export type Ed25519AccountConnectInfoSerialized = {
  accountInfoSerialized: string;
  signature: string;
  signatureB64?: undefined;
};

export type AnyAccountConnectInfoSerialized = {
  accountInfoSerialized: string;
  signature?: undefined;
  signatureB64: string;
};

export type AccountConnectInfoSerialized = Ed25519AccountConnectInfoSerialized | AnyAccountConnectInfoSerialized;

export type SyncSignCallback = (message: Uint8Array) => Signature;
export type AsyncSignCallback = (message: Uint8Array) => Promise<Signature>;
export type AnySignCallback = SyncSignCallback | AsyncSignCallback;

export function deriveAccountTransportEd25519Keypair(
  ed25519SecretKey: Ed25519SecretKey,
  publicKey: Ed25519PublicKey | AptosPublicKey,
): Ed25519KeyPair;

export function deriveAccountTransportEd25519Keypair(
  signCallback: SyncSignCallback,
  publicKey: Ed25519PublicKey | AptosPublicKey,
): Ed25519KeyPair;

export async function deriveAccountTransportEd25519Keypair(
  signCallback: AsyncSignCallback,
  publicKey: Ed25519PublicKey | AptosPublicKey,
): Promise<Ed25519KeyPair>;

export function deriveAccountTransportEd25519Keypair(
  signCallback: AnySignCallback,
  publicKey: Ed25519PublicKey | AptosPublicKey,
): Ed25519KeyPair | Promise<Ed25519KeyPair>;

export function deriveAccountTransportEd25519Keypair(
  ed25519SecretKeyOrSignCallback: Ed25519SecretKey | AnySignCallback,
  publicKey: Ed25519PublicKey | AptosPublicKey,
) {
  const publicKeyBytes = publicKey instanceof AptosPublicKey ? publicKey.toUint8Array() : publicKey.key;
  if (ed25519SecretKeyOrSignCallback instanceof Function) {
    const seedGeneratorBytes = messageHash(publicKeyBytes, 'TRANSPORT_KEYPAIR');
    const signature = ed25519SecretKeyOrSignCallback(seedGeneratorBytes);
    if (signature instanceof Promise) {
      return signature.then((value) => ed25519KeypairFromSecret(value.toUint8Array()));
    }
    return ed25519KeypairFromSecret(signature.toUint8Array());
  }

  const seedBytes = signWithEd25519SecretKey(publicKeyBytes, ed25519SecretKeyOrSignCallback, 'TRANSPORT_KEYPAIR');
  return ed25519KeypairFromSecret(seedBytes);
}

export type CreateSerializedAccountInfoArgs<TSignCallback extends AnySignCallback> = [
  signCallback: TSignCallback,
  publicKey: AccountPublicKey,
  transportEd25519PublicKey: Ed25519PublicKey,
  action: AccountConnectionAction,
  intentId: string,
  accountAddress?: string,
];

export function createSerializedAccountInfo(
  ...args: CreateSerializedAccountInfoArgs<SyncSignCallback>
): AccountConnectInfoSerialized;
export function createSerializedAccountInfo(
  ...args: CreateSerializedAccountInfoArgs<AsyncSignCallback>
): Promise<AccountConnectInfoSerialized>;
export function createSerializedAccountInfo(
  ...args: CreateSerializedAccountInfoArgs<AnySignCallback>
): AccountConnectInfoSerialized | Promise<AccountConnectInfoSerialized>;

export function createSerializedAccountInfo(
  ...[
    signCallback,
    publicKey,
    transportEd25519PublicKey,
    action,
    intentId,
    accountAddress,
  ]: CreateSerializedAccountInfoArgs<AnySignCallback>
): AccountConnectInfoSerialized | Promise<AccountConnectInfoSerialized> {
  // TODO: WRITE TESTS FOR THIS!

  // Either the passed in Pk, or the Pk derived from the Sk
  const authKey = publicKey.authKey();

  // Either the passed in account address, or the one derived from the authKey: (either Pk, or derived from Sk)
  const finalAccountAddress = accountAddress || authKey.derivedAddress().toString();
  const publicKeyB64 = serializePublicKeyB64(publicKey);

  const accountInfo: AccountConnectInfo = {
    accountAddress: finalAccountAddress,
    action,
    intentId,
    publicKeyB64,
    timestampMillis: Date.now(),
    transportEd25519PublicKeyB64: encodeBase64(transportEd25519PublicKey.key),
  };
  const accountInfoSerialized = JSON.stringify(accountInfo);
  const accountInfoBytes = new TextEncoder().encode(accountInfoSerialized);
  const accountInfoHash = sha3_256(accountInfoBytes);

  const signature = signCallback(messageHash(accountInfoHash, 'ACCOUNT_INFO'));
  if (signature instanceof Promise) {
    return signature.then((value) => ({
      accountInfoSerialized,
      signatureB64: serializeSignatureB64(value),
    }));
  }
  return {
    accountInfoSerialized,
    signatureB64: serializeSignatureB64(signature),
  };
}

export async function aptosAccountToSerializedInfo(
  account: Account,
  intentId: string,
): Promise<AccountConnectInfoSerialized> {
  const signCallback = async (data: Uint8Array) => account.sign(data);
  const transportKey = await deriveAccountTransportEd25519Keypair(signCallback, account.publicKey);
  return createSerializedAccountInfo(
    signCallback,
    account.publicKey,
    transportKey.publicKey,
    AccountConnectionAction.ADD,
    intentId,
  );
}
