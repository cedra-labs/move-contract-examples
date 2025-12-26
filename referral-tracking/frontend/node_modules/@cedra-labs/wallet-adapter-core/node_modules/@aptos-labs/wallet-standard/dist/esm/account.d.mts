import { SigningScheme } from '@aptos-labs/ts-sdk';
import { WalletAccount } from '@wallet-standard/core';

interface AptosWalletAccount extends WalletAccount {
    readonly signingScheme: SigningScheme;
}

export { AptosWalletAccount };
