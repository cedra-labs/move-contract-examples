import { PublicKey, Signature } from '@aptos-labs/ts-sdk';
import { Ed25519PublicKey, Ed25519SecretKey, X25519PublicKey, X25519SecretKey } from './utils';
export type SignCallback = (message: Uint8Array) => Promise<Signature>;
export type SignaturePurpose = 'TRANSPORT_KEYPAIR' | 'ACCOUNT_INFO' | 'SECURED_ENVELOPE';
export declare const SIGNATURE_PREFIX = "APTOS::IDENTITY_CONNECT";
export type EncryptionResult = {
    nonce: Uint8Array;
    secured: Uint8Array;
};
export type SerializedEncryptionResult = {
    nonceB64: string;
    securedB64: string;
};
/**
 * Converts an Ed25519 public key to an X25519 public key
 * HERE THERE BE DRAGONS. ONLY USE THIS IF YOU KNOW WHAT YOU ARE DOING.
 * @param ed25519PublicKey The Ed25519 public key to convert
 * @param errorKeyName The name of the key to use in error messages
 */
export declare function convertEd25519PublicKeyToX25519PublicKey(ed25519PublicKey: Ed25519PublicKey, errorKeyName: string): X25519PublicKey;
/**
 * Converts an Ed25519 secret key to an X25519 secret key
 * HERE THERE BE DRAGONS. ONLY USE THIS IF YOU KNOW WHAT YOU ARE DOING.
 * @param ed25519SecretKey The Ed25519 secret key to convert
 */
export declare function convertEd25519SecretKeyToX25519SecretKey(ed25519SecretKey: Ed25519SecretKey): X25519SecretKey;
export declare function serializeEncryptionResult(enc: EncryptionResult): SerializedEncryptionResult;
export declare function deserializeEncryptionResult(enc: SerializedEncryptionResult): EncryptionResult;
/**
 * Decrypts a `SerializedEncryptionResult` to an object
 * Uses the sender's X25519 public key and receiver's Ed25519 secret key
 * The receivers Ed25519 secret key is converted to an X25519 secret key for the Diffie-Hellman key exchange
 * @param senderX25519PublicKey The sender's X25519 public key
 * @param receiverEd25519SecretKey The receiver's Ed25519 secret key
 * @param enc The serialized encryption result
 */
export declare function decryptSerializedEncryptionResult<T>(senderX25519PublicKey: X25519PublicKey, receiverEd25519SecretKey: Ed25519SecretKey, enc: SerializedEncryptionResult): T;
/**
 * Decrypts a `SerializedEncryptionResult` to an object
 * Uses the sender's X25519 public key and receiver's X25519 secret key
 * @param senderX25519PublicKey The sender's X25519 public key
 * @param receiverX25519SecretKey The receiver's X25519 secret key
 * @param enc The serialized encryption result
 */
export declare function decryptSerializedEncryptionResultDirect<T>(senderX25519PublicKey: X25519PublicKey, receiverX25519SecretKey: X25519SecretKey, enc: SerializedEncryptionResult): T;
/**
 * Encrypts a string, by using the sender's X25519 secret key and receiver's Ed25519 public key
 * The receiver's Ed25519 public key is converted to an X25519 public key for the Diffie-Hellman key exchange
 * @param senderX25519SecretKey The sender's X25519 secret key
 * @param receiverEd25519PublicKey The receiver's Ed25519 public key
 * @param message The message to encrypt
 */
export declare function encryptMessage(senderX25519SecretKey: X25519SecretKey, receiverEd25519PublicKey: Ed25519PublicKey, message: string): EncryptionResult;
/**
 * Encrypts a string, by using the sender's X25519 secret key and receiver's X25519 public key
 * @param senderX25519SecretKey The sender's X25519 secret key
 * @param receiverX25519PublicKey The receiver's X25519 public key
 * @param message The message to encrypt
 */
export declare function encryptMessageDirect(senderX25519SecretKey: X25519SecretKey, receiverX25519PublicKey: X25519PublicKey, message: string): EncryptionResult;
/**
 * Encrypts an object to a string, by using the sender's X25519 secret key and receiver's Ed25519 public key
 * The receiver's Ed25519 public key is converted to an X25519 public key for the Diffie-Hellman key exchange
 * @param senderX25519SecretKey The sender's X25519 secret key
 * @param receiverEd25519PublicKey The receiver's Ed25519 public key
 * @param message The message to encrypt
 */
export declare function encryptObject<T>(senderX25519SecretKey: X25519SecretKey, receiverEd25519PublicKey: Ed25519PublicKey, message: T): EncryptionResult;
/**
 * Encrypts an object to a string, by using the sender's X25519 secret key and receiver's X25519 public key
 * @param senderX25519SecretKey The sender's X25519 secret key
 * @param receiverX25519PublicKey The receiver's X25519 public key
 * @param message The message to encrypt
 */
export declare function encryptObjectDirect<T>(senderX25519SecretKey: X25519SecretKey, receiverX25519PublicKey: X25519PublicKey, message: T): EncryptionResult;
/**
 * Decrypts a string, by using the sender's X25519 public key and receiver's Ed25519 secret key
 * The receivers Ed25519 secret key is converted to an X25519 secret key for the Diffie-Hellman key exchange
 * @param senderX25519PublicKey The sender's X25519 public key
 * @param receiverEd25519SecretKey The receiver's Ed25519 secret key
 * @param securedMessage The message to decrypt
 * @param nonce The nonce used to encrypt the message
 */
export declare function decryptMessage(senderX25519PublicKey: X25519PublicKey, receiverEd25519SecretKey: Ed25519SecretKey, securedMessage: Uint8Array, nonce: Uint8Array): string;
/**
 * Decrypts a string, by using the sender's X25519 public key and receiver's X25519 secret key
 * @param senderX25519PublicKey The sender's X25519 public key
 * @param receiverX25519SecretKey The receiver's X25519 secret key
 * @param securedMessage The message to decrypt
 * @param nonce The nonce used to encrypt the message
 */
export declare function decryptMessageDirect(senderX25519PublicKey: X25519PublicKey, receiverX25519SecretKey: X25519SecretKey, securedMessage: Uint8Array, nonce: Uint8Array): string;
/**
 * Decrypts an object, by using the sender's X25519 public key and receiver's Ed25519 secret key
 * The receivers Ed25519 secret key is converted to an X25519 secret key for the Diffie-Hellman key exchange
 * @param senderX25519PublicKey The sender's X25519 public key
 * @param receiverEd25519SecretKey The receiver's Ed25519 secret key
 * @param securedMessage The message to decrypt
 * @param nonce The nonce used to encrypt the message
 */
export declare function decryptObject<T>(senderX25519PublicKey: X25519PublicKey, receiverEd25519SecretKey: Ed25519SecretKey, securedMessage: Uint8Array, nonce: Uint8Array): T;
/**
 * Decrypts an object, by using the sender's X25519 public key and receiver's X25519 secret key
 * @param senderX25519PublicKey The sender's X25519 public key
 * @param receiverX25519SecretKey The receiver's X25519 secret key
 * @param securedMessage The message to decrypt
 * @param nonce The nonce used to encrypt the message
 */
export declare function decryptObjectDirect<T>(senderX25519PublicKey: X25519PublicKey, receiverX25519SecretKey: X25519SecretKey, securedMessage: Uint8Array, nonce: Uint8Array): T;
/**
 * Hashes a message with a purpose-specific prefix using SHA-3 256-bit algorithm.
 * The purpose prefix is constructed as `'APTOS::IDENTITY_CONNECT' + '::' + purpose + '::'`
 * This is to prevent hash collisions with other services, uses, and purposes
 * @param message The message to hash as a Uint8Array.
 * @param purpose The purpose of the signature.
 * @returns Uint8Array The hashed message as a Uint8Array
 */
export declare function messageHash(message: Uint8Array, purpose: SignaturePurpose): Uint8Array;
export declare function signWithEd25519SecretKey(message: Uint8Array, signingEd25519SecretKey: Ed25519SecretKey, purpose: SignaturePurpose): Uint8Array;
export declare function makeEd25519SecretKeySignCallbackNoDomainSeparation(signingEd25519SecretKey: Ed25519SecretKey): SignCallback;
export declare function verifySignature(message: Uint8Array, signature: Signature, signingPublicKey: PublicKey, purpose: SignaturePurpose): boolean;
export declare function hashAndVerifySignature(message: string | Uint8Array, signature: Signature, signingPublicKey: PublicKey, purpose: SignaturePurpose): boolean;
//# sourceMappingURL=encrDecr.d.ts.map