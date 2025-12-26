// src/constants.ts
var DEFAULT_BACKEND_URL = "https://identityconnect.com";

// src/network.ts
var NetworkName = /* @__PURE__ */ ((NetworkName2) => {
  NetworkName2["DEVNET"] = "devnet";
  NetworkName2["MAINNET"] = "mainnet";
  NetworkName2["TESTNET"] = "testnet";
  return NetworkName2;
})(NetworkName || {});

// src/types/pairing.ts
var PairingStatus = /* @__PURE__ */ ((PairingStatus2) => {
  PairingStatus2["Finalized"] = "FINALIZED";
  PairingStatus2["Pending"] = "PENDING";
  return PairingStatus2;
})(PairingStatus || {});

// src/types/signingRequest.ts
var SigningRequestTypes = /* @__PURE__ */ ((SigningRequestTypes2) => {
  SigningRequestTypes2["SIGN_AND_SUBMIT_TRANSACTION"] = "SIGN_AND_SUBMIT_TRANSACTION";
  SigningRequestTypes2["SIGN_MESSAGE"] = "SIGN_MESSAGE";
  SigningRequestTypes2["SIGN_TRANSACTION"] = "SIGN_TRANSACTION";
  return SigningRequestTypes2;
})(SigningRequestTypes || {});
var SigningRequestStatus = /* @__PURE__ */ ((SigningRequestStatus2) => {
  SigningRequestStatus2["APPROVED"] = "APPROVED";
  SigningRequestStatus2["CANCELLED"] = "CANCELLED";
  SigningRequestStatus2["INVALID"] = "INVALID";
  SigningRequestStatus2["PENDING"] = "PENDING";
  SigningRequestStatus2["REJECTED"] = "REJECTED";
  return SigningRequestStatus2;
})(SigningRequestStatus || {});

// src/types/wallet.ts
var WalletOSEnum = /* @__PURE__ */ ((WalletOSEnum2) => {
  WalletOSEnum2["Android"] = "android";
  WalletOSEnum2["IdentityConnect"] = "ic";
  WalletOSEnum2["Linux"] = "linux";
  WalletOSEnum2["Macos"] = "osx";
  WalletOSEnum2["Windows"] = "win";
  WalletOSEnum2["iOS"] = "ios";
  return WalletOSEnum2;
})(WalletOSEnum || {});
var WalletPlatformEnum = /* @__PURE__ */ ((WalletPlatformEnum2) => {
  WalletPlatformEnum2["BraveExtension"] = "brave-extension";
  WalletPlatformEnum2["ChromeExtension"] = "chrome-extension";
  WalletPlatformEnum2["FirefoxExtension"] = "firefox-extension";
  WalletPlatformEnum2["IcDappWallet"] = "ic-dapp-wallet";
  WalletPlatformEnum2["KiwiExtension"] = "kiwi-extension";
  WalletPlatformEnum2["NativeApp"] = "native-app";
  WalletPlatformEnum2["OperaExtension"] = "opera-extension";
  WalletPlatformEnum2["SafariExtension"] = "safari-extension";
  return WalletPlatformEnum2;
})(WalletPlatformEnum || {});
export {
  DEFAULT_BACKEND_URL,
  NetworkName,
  PairingStatus,
  SigningRequestStatus,
  SigningRequestTypes,
  WalletOSEnum,
  WalletPlatformEnum
};
//# sourceMappingURL=index.mjs.map