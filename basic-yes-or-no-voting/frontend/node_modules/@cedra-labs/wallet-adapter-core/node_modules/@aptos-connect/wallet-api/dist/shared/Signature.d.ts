import { AnySignature, Deserializer, Ed25519Signature, MultiEd25519Signature, Serializer, Signature } from '@aptos-labs/ts-sdk';
export declare function serializeSignature(serializer: Serializer, value: Signature): void;
export declare function deserializeSignature(deserializer: Deserializer): Ed25519Signature | MultiEd25519Signature | AnySignature;
//# sourceMappingURL=Signature.d.ts.map