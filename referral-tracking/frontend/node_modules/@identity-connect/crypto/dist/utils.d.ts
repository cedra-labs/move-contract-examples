import nacl from 'tweetnacl';
export declare enum KeyTypes {
    'Ed25519PublicKey' = "Ed25519PublicKey",
    'Ed25519SecretKey' = "Ed25519SecretKey",
    'X25519PublicKey' = "X25519PublicKey",
    'X25519SecretKey' = "X25519SecretKey"
}
export interface IKey<Type extends KeyTypes> {
    key: Uint8Array;
    type: Type;
}
export type X25519PublicKey = IKey<KeyTypes.X25519PublicKey>;
export type X25519SecretKey = IKey<KeyTypes.X25519SecretKey>;
export type X25519KeyPair = {
    publicKey: X25519PublicKey;
    secretKey: X25519SecretKey;
};
export type Ed25519PublicKey = IKey<KeyTypes.Ed25519PublicKey>;
export type Ed25519SecretKey = IKey<KeyTypes.Ed25519SecretKey>;
export type Ed25519KeyPair = {
    publicKey: Ed25519PublicKey;
    secretKey: Ed25519SecretKey;
};
export type RawKeyPair = {
    publicKey: Uint8Array;
    secretKey: Uint8Array;
};
export declare function createX25519KeyPair(): X25519KeyPair;
export declare function createEd25519KeyPair(): Ed25519KeyPair;
export declare function toKey<Type extends KeyTypes = KeyTypes>(rawKey: Uint8Array, type: Type): Type extends KeyTypes.Ed25519PublicKey ? Ed25519PublicKey : Type extends KeyTypes.Ed25519SecretKey ? Ed25519SecretKey : Type extends KeyTypes.X25519PublicKey ? X25519PublicKey : Type extends KeyTypes.X25519SecretKey ? X25519SecretKey : never;
export declare function keypairToEd25519(keyPair: RawKeyPair): Ed25519KeyPair;
export declare function keypairToX25519(keyPair: RawKeyPair): X25519KeyPair;
export declare function aptosAccountToEd25519Keypair(account: {
    signingKey: nacl.SignKeyPair;
}): Ed25519KeyPair;
export declare function ed25519KeypairFromSecret(ed25519SecretKeyBytes: Uint8Array): Ed25519KeyPair;
export declare function decodeBase64(base64Str: string): Uint8Array;
export declare function encodeBase64(bytes: Uint8Array): string;
export declare function concatUint8array(arrayOne: Uint8Array, arrayTwo: Uint8Array): Uint8Array;
//# sourceMappingURL=utils.d.ts.map