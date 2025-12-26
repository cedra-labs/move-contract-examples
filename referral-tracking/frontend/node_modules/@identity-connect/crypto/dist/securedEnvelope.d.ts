import { Ed25519PublicKey, Ed25519SecretKey, X25519KeyPair, X25519PublicKey } from './utils';
import { SerializedEncryptionResult, SignCallback } from './encrDecr';
/**
 * When sending messages back and forth, there are some things that Identity Connect must know to function and provide
 * security for users, and dApps and wallets need to know that any messages sent to one another were sent (and
 * received) by the expected parties.
 *
 * To allow for secure communication between parties, we are introducing the
 * *SecuredEnvelope*. This envelope provides a secure channel for parties to encrypt private messages, *and*
 * authenticate one another, while allowing IC to route requests and block invalid messages.
 *
 * The envelope can be thought of as a wrapper around the JSON payload of a POST/PUT request T, and has two parts:
 * `messagePrivate`: This contains some of the parameters of `T`, which will be signed by the sender and encrypted
 *                   with the recipient's public key.
 * `publicMessage`: This field is sent unencrypted, but signed so that the IC endpoint can do basic validation before
 *                  processing. The parameters in `publicMessage` are DISJOINT from `messagePrivate`, and are invalid
 *                  otherwise: there are no keys in `messagePrivate` that also appear in `publicMessage`. It must
 *                  contain a ``_metadata`` field with security features like the timestamp, public keys, sequence
 *                  number, etc.
 *
 * Both IC and dApps can verify, on chain, that the senders’ keys match their address and that they are speaking
 * with who they expect. Encryption is done with an X25519 key derived from the ED25519 PublicKey of the wallet
 * account that is connecting (this allows for seamless cross-device account access), and an ephemeral X25519 KeyPair,
 * of which the SecretKey is thrown away after encryption. Decryption uses the X25519 key derived from the receiver
 * ED25519 SecretKey.
 *
 * Account private keys Ska (and their counterpart X25519 keys) are only used to decrypt and sign:
 * THEY ARE NEVER USED TO ENCRYPT!
 *
 * Operations follow the Cryptographic Doom Principle:
 *   Always verify the signature of the message before any other cryptographic operations
 * https://moxie.org/2011/12/13/the-cryptographic-doom-principle.html
 *
 *
 * To send a `SecuredEnvelope` over the wire, it must first be turned into a `SecuredEnvelopeTransport` - this
 * involves:
 * 1. Encrypting and serializing the `privateMessage` field to an `encryptedPrivateMessage`field.
 *     a. Generate ephemeral X25519 sender keypair `xPkse/xSkse`. The `xPkse` becomes the `senderX25519PublicKeyB64` in
 *      the `EnvelopeMetadata`.
 *     b. Convert the `receiverEd25519PublicKey` to a `receiverX25519PublicKey` - `xPkr`
 *     c. Generate a random `nonce` for the `[nacl.box](http://nacl.box)` encryption
 *     d. Encrypt the `privateMessage` using `[nacl.box](http://nacl.box)` with the `xSkse` and `xPkr`
 *     e. Package this encrypted data, and the `nonce`, into a `SerializedEncryptionResult`
 * 2. JSON serializing the `publicMessage` field into a `serializedPublicMessage`. We don’t care about canonical
 *    serialization/ordering as the sender signs over this serialized string.
 * 3.  Now that we have the private `encryptedPrivateMessage` and public `serializedPublicMessage` we can generate the
 *    `messageSignature`:
 *     a. Hash the `SHA3-256(encryptedPublicMessage)` to get `publicMessageHash`
 *     b. Hash the `SHA3-256(encryptedPrivateMessage)` to get `privateMessageHash`
 *     c. Hash `SHA3-256(publicMessageHash | privateMessageHash)` to get `combinedMessageHash`
 *     d. Get the `domainSeparatedMessageHash` by hashing the `combinedMessageHash` with a domain separator:
 *        `SHA3-256(SHA3-256('APTOS::IDENTITY_CONNECT::') | combinedMessageHash)`
 *     e. To obtain the final `messageSignature`, we sign the `domainSeparatedMessageHash` with the Ed25519 private
 *        key of the sender, and hex encode it.
 * 4. This creates the final `SecuredEnvelopeTransport` object, ready to be JSON serialized and sent in an HTTP
 *    request
 */
export declare const REQUIRED_FIELDS: (keyof EnvelopeMetadata)[];
export type EnvelopeMetadata = {
    receiverEd25519PublicKeyB64: string;
    senderEd25519PublicKeyB64: string;
    senderX25519PublicKeyB64: string;
    sequence: number;
    timestampMillis: number;
};
export interface IEnvelopeMetadata extends Message {
    _metadata: EnvelopeMetadata;
}
export type Message = Record<string, unknown>;
export type SecuredEnvelope<Public extends Message> = {
    encryptedPrivateMessage: SerializedEncryptionResult;
    messageSignature: string;
    publicMessage: Public & IEnvelopeMetadata;
};
export type SecuredEnvelopeTransport = {
    encryptedPrivateMessage: SerializedEncryptionResult;
    messageSignature: string;
    serializedPublicMessage: string;
};
export type DecryptedEnvelope<Public extends Message & {
    [K in keyof Private]?: never;
}, Private extends Message & {
    [K in keyof Public]?: never;
}> = {
    messageSignature: string;
    privateMessage: Private;
    publicMessage: Public & IEnvelopeMetadata;
};
export type DeserializedTransportEnvelope<Public extends Message> = SecuredEnvelopeTransport & SecuredEnvelope<Public>;
export type SignCallbackOrEd25519SecretKey = SignCallback | Ed25519SecretKey;
export declare function ensurePrivatePublicFieldsDisjoint<Public extends Message & {
    [K in keyof Private]?: never;
}, Private extends Message & {
    [K in keyof Public]?: never;
}>(privateMessage: Private, publicMessage: Public): void;
export declare function ensureMetadataFields(message: EnvelopeMetadata): void;
export declare function deserializeTransportEnvelope<Public extends Message>(transportEnvelope: SecuredEnvelopeTransport): DeserializedTransportEnvelope<Public>;
export declare function encryptAndSignEnvelope<Public extends Message & {
    [K in keyof Private]?: never;
}, Private extends Message & {
    [K in keyof Public]?: never;
}>(senderEd25519SecretKey: Ed25519SecretKey, senderEd25519PublicKey: Ed25519PublicKey, receiverEd25519PublicKey: Ed25519PublicKey, sequence: number, publicMessage: Public, privateMessage: Private): SecuredEnvelopeTransport;
export declare function constructMetadata(senderEd25519PublicKey: Ed25519PublicKey, receiverEd25519PublicKey: Ed25519PublicKey, sequence: number, senderEphemeralX25519PublicKey: X25519PublicKey): EnvelopeMetadata;
export declare function dangerouslyEncryptAndSignEnvelopeUnvalidated<Public extends Message & {
    [K in keyof Private]?: never;
}, Private extends Message & {
    [K in keyof Public]?: never;
}>(senderEd25519SecretKey: Ed25519SecretKey, receiverEd25519PublicKey: Ed25519PublicKey, metadata: EnvelopeMetadata, privateMessage: Private, publicMessage: Public, senderEphemeralX25519KeyPair: X25519KeyPair): SecuredEnvelopeTransport;
export declare function verifyEnvelopeSignature(publicMessageBytes: Uint8Array, privateMessageBytes: Uint8Array, messageSignatureInput: string, senderEd25519PublicKey: Ed25519PublicKey): void;
export declare function decryptEnvelope<Public extends Message & {
    [K in keyof Private]?: never;
}, Private extends Message & {
    [K in keyof Public]?: never;
}>(senderEd25519PublicKey: Ed25519PublicKey, receiverEd25519SecretKey: Ed25519SecretKey, message: SecuredEnvelopeTransport): DecryptedEnvelope<Public, Private>;
//# sourceMappingURL=securedEnvelope.d.ts.map