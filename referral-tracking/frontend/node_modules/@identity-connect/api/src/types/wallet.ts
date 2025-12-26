// Copyright © Aptos
// SPDX-License-Identifier: Apache-2.0

import type { AccountData } from './account';
import type { AnonymousPairingData } from './pairing';
import { DappSpecificWallet } from './dappSpecificWallet';

export enum WalletOSEnum {
  Android = 'android',
  IdentityConnect = 'ic',
  Linux = 'linux',
  Macos = 'osx',
  Windows = 'win',
  iOS = 'ios',
}

export enum WalletPlatformEnum {
  BraveExtension = 'brave-extension',
  ChromeExtension = 'chrome-extension',
  FirefoxExtension = 'firefox-extension',
  /// Reserved for IC full custody
  IcDappWallet = 'ic-dapp-wallet',
  KiwiExtension = 'kiwi-extension',
  NativeApp = 'native-app',
  OperaExtension = 'opera-extension',
  SafariExtension = 'safari-extension',
}

export type WalletOS = `${WalletOSEnum}`;
export type WalletPlatform = `${WalletPlatformEnum}`;

export interface BaseWalletData {
  createdAt: Date;
  dappSpecificWallet?: DappSpecificWallet;
  dappSpecificWalletId?: string;
  icEd25519PublicKeyB64: string;
  id: string;
  updatedAt: Date;
}

export interface NewWalletData extends BaseWalletData {
  walletEd25519PublicKeyB64: null;
}

export interface BaseConnectedWalletData extends BaseWalletData {
  accounts: AccountData[];
  deviceIdentifier: string;
  platform: WalletPlatform;
  platformOS: WalletOS;
  userSubmittedAlias?: string;
  walletEd25519PublicKeyB64: string;
  walletName: string;
}

export interface AuthenticatedWalletData extends BaseConnectedWalletData {
  anonymousPairing: null;
  user: { id: string; username: string };
  userId: string;
}

export interface AnonymousWalletData extends BaseConnectedWalletData {
  anonymousPairing: AnonymousPairingData;
  userId: null;
}

export type ConnectedWalletData = AuthenticatedWalletData | AnonymousWalletData;

export type WalletData = NewWalletData | ConnectedWalletData;
