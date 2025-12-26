import { WalletReadyState } from "./constants";
import { CedraStandardSupportedWallet } from "./utils/types";

/**
 * Registry of AIP-62 wallet standard supported wallets.
 * This list is used to show supported wallets even if they are not installed on the user machine.
 *
 * AIP-62 compatible wallets are required to add their wallet info here if they want to be detected by the adapter
 *
 * @param name - The name of your wallet cast to WalletName (Ex. "Nightly" as WalletName<"Nightly">)
 * @param url - The link to your chrome extension or main website where new users can create an account with your wallet.
 * @param icon - An icon for your wallet. Can be one of 4 data types. Be sure to follow the below format exactly (including the literal "," after base64).
 *        Format: `data:image/${"svg+xml" | "webp" | "png" | "gif"};base64,${string}`
 *        Note: ${...} data in the above format should be replaced. Other characters are literals (ex. ";")
 * @param deeplinkProvider optional - An optional deeplink provider for the wallet. If the wallet is not installed, we can redirect the user to the wallet's deeplink provider
 * @example "https://myWallet.app/explore?link="
 */
export const cedraStandardSupportedWalletList: Array<CedraStandardSupportedWallet> =
  [
    {
      name: "Nightly",
      url: "https://nightly.app/",
      icon: "data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0idXRmLTgiPz4NCjwhLS0gR2VuZXJhdG9yOiBBZG9iZSBJbGx1c3RyYXRvciAyOC4wLjAsIFNWRyBFeHBvcnQgUGx1Zy1JbiAuIFNWRyBWZXJzaW9uOiA2LjAwIEJ1aWxkIDApICAtLT4NCjxzdmcgdmVyc2lvbj0iMS4xIiBpZD0iV2Fyc3R3YV8xIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIiB4PSIwcHgiIHk9IjBweCINCgkgdmlld0JveD0iMCAwIDg1MS41IDg1MS41IiBzdHlsZT0iZW5hYmxlLWJhY2tncm91bmQ6bmV3IDAgMCA4NTEuNSA4NTEuNTsiIHhtbDpzcGFjZT0icHJlc2VydmUiPg0KPHN0eWxlIHR5cGU9InRleHQvY3NzIj4NCgkuc3Qwe2ZpbGw6IzYwNjdGOTt9DQoJLnN0MXtmaWxsOiNGN0Y3Rjc7fQ0KPC9zdHlsZT4NCjxnPg0KCTxnIGlkPSJXYXJzdHdhXzJfMDAwMDAwMTQ2MDk2NTQyNTMxODA5NDY0NjAwMDAwMDg2NDc4NTIwMDIxMTY5MTg2ODhfIj4NCgkJPHBhdGggY2xhc3M9InN0MCIgZD0iTTEyNCwwaDYwMy42YzY4LjUsMCwxMjQsNTUuNSwxMjQsMTI0djYwMy42YzAsNjguNS01NS41LDEyNC0xMjQsMTI0SDEyNGMtNjguNSwwLTEyNC01NS41LTEyNC0xMjRWMTI0DQoJCQlDMCw1NS41LDU1LjUsMCwxMjQsMHoiLz4NCgk8L2c+DQoJPGcgaWQ9IldhcnN0d2FfMyI+DQoJCTxwYXRoIGNsYXNzPSJzdDEiIGQ9Ik02MjMuNSwxNzAuM2MtMzcuNCw1Mi4yLTg0LjIsODguNC0xMzkuNSwxMTIuNmMtMTkuMi01LjMtMzguOS04LTU4LjMtNy44Yy0xOS40LTAuMi0zOS4xLDIuNi01OC4zLDcuOA0KCQkJYy01NS4zLTI0LjMtMTAyLjEtNjAuMy0xMzkuNS0xMTIuNmMtMTEuMywyOC40LTU0LjgsMTI2LjQtMi42LDI2My40YzAsMC0xNi43LDcxLjUsMTQsMTMyLjljMCwwLDQ0LjQtMjAuMSw3OS43LDguMg0KCQkJYzM2LjksMjkuOSwyNS4xLDU4LjcsNTEuMSw4My41YzIyLjQsMjIuOSw1NS43LDIyLjksNTUuNywyMi45czMzLjMsMCw1NS43LTIyLjhjMjYtMjQuNywxNC4zLTUzLjUsNTEuMS04My41DQoJCQljMzUuMi0yOC4zLDc5LjctOC4yLDc5LjctOC4yYzMwLjYtNjEuNCwxNC0xMzIuOSwxNC0xMzIuOUM2NzguMywyOTYuNyw2MzQuOSwxOTguNyw2MjMuNSwxNzAuM3ogTTI1My4xLDQxNC44DQoJCQljLTI4LjQtNTguMy0zNi4yLTEzOC4zLTE4LjMtMjAxLjVjMjMuNyw2MCw1NS45LDg2LjksOTQuMiwxMTUuM0MzMTIuOCwzNjIuMywyODIuMywzOTQuMSwyNTMuMSw0MTQuOHogTTMzNC44LDUxNy41DQoJCQljLTIyLjQtOS45LTI3LjEtMjkuNC0yNy4xLTI5LjRjMzAuNS0xOS4yLDc1LjQtNC41LDc2LjgsNDAuOUMzNjAuOSw1MTQuNywzNTMsNTI1LjQsMzM0LjgsNTE3LjV6IE00MjUuNyw2NzguNw0KCQkJYy0xNiwwLTI5LTExLjUtMjktMjUuNnMxMy0yNS42LDI5LTI1LjZzMjksMTEuNSwyOSwyNS42QzQ1NC43LDY2Ny4zLDQ0MS43LDY3OC43LDQyNS43LDY3OC43eiBNNTE2LjcsNTE3LjUNCgkJCWMtMTguMiw4LTI2LTIuOC00OS43LDExLjVjMS41LTQ1LjQsNDYuMi02MC4xLDc2LjgtNDAuOUM1NDMuOCw0ODgsNTM5LDUwNy42LDUxNi43LDUxNy41eiBNNTk4LjMsNDE0LjgNCgkJCWMtMjkuMS0yMC43LTU5LjctNTIuNC03Ni04Ni4yYzM4LjMtMjguNCw3MC42LTU1LjQsOTQuMi0xMTUuM0M2MzQuNiwyNzYuNSw2MjYuOCwzNTYuNiw1OTguMyw0MTQuOHoiLz4NCgk8L2c+DQo8L2c+DQo8L3N2Zz4NCg==",
      readyState: WalletReadyState.NotDetected,
      isAIP62Standard: true,
      deeplinkProvider: "nightly://v1?network=cedra&url=",
    },

    {
      name: "Zedra",
      url: "https://chromewebstore.google.com/detail/zedra-wallet/pbeefngmcchkcibdodceimammkigfanl",
      icon: "data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiPz4KPHN2ZyBpZD0iTGF5ZXJfMiIgZGF0YS1uYW1lPSJMYXllciAyIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDgwIDEwODAiPgogIDxkZWZzPgogICAgPHN0eWxlPgogICAgICAuY2xzLTEgewogICAgICAgIGZpbGw6ICNiOGZmZGU7CiAgICAgIH0KICAgIDwvc3R5bGU+CiAgPC9kZWZzPgogIDxnIGlkPSJMYXllcl8xLTIiIGRhdGEtbmFtZT0iTGF5ZXIgMSI+CiAgICA8cmVjdCBjbGFzcz0iY2xzLTEiIHdpZHRoPSIxMDgwIiBoZWlnaHQ9IjEwODAiIHJ4PSIxMjAuNTQiIHJ5PSIxMjAuNTQiLz4KICAgIDxnPgogICAgICA8cGF0aCBkPSJtMzIyLjQ3LDIxOS4xMWgzNTMuNDdjMTMuMzgsMCwyNS42Miw3LjUxLDMxLjY5LDE5LjQzbDExMC43OSwyMTcuNjljNi43NiwxMy4yOCw0LjUyLDI5LjM3LTUuNjEsNDAuM2wtMTE5LjU0LDEyOWMtMTMuNDYsMTQuNTMtMzYuMiwxNS4yNi01MC41NywxLjYybC03Ny41Ni03My42NGMtMTQuNDYtMTMuNzMtMTQuOC0zNi42Ni0uNzctNTAuODJsNDIuOTYtNDMuMzVjMjIuMjgtMjIuNDgsNi4yOS02MC42OS0yNS4zNi02MC41OWwtMjU5LjQuNzljLTE5LjY4LjA2LTM1LjY3LTE1Ljg4LTM1LjY3LTM1LjU2di0xMDkuMzFjMC0xOS42NCwxNS45Mi0zNS41NiwzNS41Ni0zNS41NloiLz4KICAgICAgPHBhdGggZD0ibTc1Ny41Myw4NjAuODloLTM1My40N2MtMTMuMzgsMC0yNS42Mi03LjUxLTMxLjY5LTE5LjQzbC0xMTAuNzktMjE3LjY5Yy02Ljc2LTEzLjI4LTQuNTItMjkuMzcsNS42MS00MC4zbDExOS41NC0xMjljMTMuNDYtMTQuNTMsMzYuMi0xNS4yNiw1MC41Ny0xLjYybDc3LjU2LDczLjY0YzE0LjQ2LDEzLjczLDE0LjgsMzYuNjYuNzcsNTAuODJsLTQyLjk2LDQzLjM1Yy0yMi4yOCwyMi40OC02LjI5LDYwLjY5LDI1LjM2LDYwLjU5bDI1OS40LS43OWMxOS42OC0uMDYsMzUuNjcsMTUuODgsMzUuNjcsMzUuNTZ2MTA5LjMxYzAsMTkuNjQtMTUuOTIsMzUuNTYtMzUuNTYsMzUuNTZaIi8+CiAgICA8L2c+CiAgPC9nPgo8L3N2Zz4=",
      readyState: WalletReadyState.NotDetected,
      isAIP62Standard: true,
      deeplinkProvider: "https://zedra.app/",
    }
  ];
  
