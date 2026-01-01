import type { ExplorerAccount } from "./account.ts";
import { octasToCed } from "./utils.ts";

export function explainAccount(account: ExplorerAccount): string {
  let out = `This is a Cedra blockchain account.\n\n`;

  out += `Address:\n${account.address}\n\n`;

  if (account.balanceOctas) {
    out += `Balance:\n• ${octasToCed(account.balanceOctas)} CED\n\n`;
  } else {
    out += `Balance:\n• 0 CED (unfunded)\n\n`;
  }

  if (account.moduleNames.length > 0) {
    out += `Smart contracts:\n`;
    for (const name of account.moduleNames) {
      out += `• ${name}\n`;
    }

    out += `\nWhat this means:\n`;
    out += `• This is a developer account\n`;
    out += `• It has deployed Move smart contracts\n`;
  } else {
    out += `Smart contracts:\n• None published\n\n`;
    out += `What this means:\n`;
    out += `• This is a regular user account\n`;
    out += `• It can send and receive tokens\n`;
  }

  return out.trim();
}
