import { SigningScheme } from '@cedra-labs/ts-sdk'
import { WalletAccount } from '@wallet-standard/core'

export interface CedraWalletAccount extends WalletAccount {
  readonly signingScheme: SigningScheme
}
