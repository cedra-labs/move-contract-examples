/**
 * Contains the derived cryptographic key as a Uint8Array.
 * @group Implementation
 * @category Serialization
 */
type DerivedKeys = {
    key: Uint8Array;
    chainCode: Uint8Array;
};
/**
 * Aptos derive path is 637
 * @group Implementation
 * @category Serialization
 */
declare const APTOS_HARDENED_REGEX: RegExp;
/**
 * @group Implementation
 * @category Serialization
 */
declare const APTOS_BIP44_REGEX: RegExp;
/**
 * Supported key types and their associated seeds.
 * @group Implementation
 * @category Serialization
 */
declare enum KeyType {
    ED25519 = "ed25519 seed"
}
/**
 * @group Implementation
 * @category Serialization
 */
declare const HARDENED_OFFSET = 2147483648;
/**
 * Validate a BIP-44 derivation path string to ensure it meets the required format.
 * This function checks if the provided path adheres to the BIP-44 standard for Secp256k1.
 * Parse and validate a path that is compliant to BIP-44 in form m/44'/637'/{account_index}'/{change_index}/{address_index}
 * for Secp256k1
 *
 * Note that for Secp256k1, the last two components must be non-hardened.
 *
 * @param path - The path string to validate (e.g. `m/44'/637'/0'/0/0`).
 * @group Implementation
 * @category Serialization
 */
declare function isValidBIP44Path(path: string): boolean;
/**
 * Aptos derive path is 637
 *
 * Parse and validate a path that is compliant to SLIP-0010 and BIP-44
 * in form m/44'/637'/{account_index}'/{change_index}'/{address_index}'.
 * See SLIP-0010 {@link https://github.com/satoshilabs/slips/blob/master/slip-0044.md}
 * See BIP-44 {@link https://github.com/bitcoin/bips/blob/master/bip-0044.mediawiki}
 *
 * Note that for Ed25519, all components must be hardened.
 * This is because non-hardened [PK] derivation would not work due to Ed25519's lack of a key homomorphism.
 * Specifically, you cannot derive the PK associated with derivation path a/b/c given the PK of a/b.
 * This is because the PK in Ed25519 is, more or less, computed as 𝑔𝐻(𝑠𝑘),
 * with the hash function breaking the homomorphism.
 *
 * @param path - The derivation path string to validate (e.g. `m/44'/637'/0'/0'/0'`).
 * @group Implementation
 * @category Serialization
 */
declare function isValidHardenedPath(path: string): boolean;
/**
 * @group Implementation
 * @category Serialization
 */
declare const deriveKey: (hashSeed: Uint8Array | string, data: Uint8Array | string) => DerivedKeys;
/**
 * Derive a child key from the private key
 * @param key
 * @param chainCode
 * @param index
 * @group Implementation
 * @category Serialization
 */
declare const CKDPriv: ({ key, chainCode }: DerivedKeys, index: number) => DerivedKeys;
/**
 * Splits derive path into segments
 * @param path
 * @group Implementation
 * @category Serialization
 */
declare const splitPath: (path: string) => Array<string>;
/**
 * Normalizes the mnemonic by removing extra whitespace and making it lowercase
 * @param mnemonic the mnemonic seed phrase
 * @group Implementation
 * @category Serialization
 */
declare const mnemonicToSeed: (mnemonic: string) => Uint8Array;

export { APTOS_BIP44_REGEX, APTOS_HARDENED_REGEX, CKDPriv, type DerivedKeys, HARDENED_OFFSET, KeyType, deriveKey, isValidBIP44Path, isValidHardenedPath, mnemonicToSeed, splitPath };
