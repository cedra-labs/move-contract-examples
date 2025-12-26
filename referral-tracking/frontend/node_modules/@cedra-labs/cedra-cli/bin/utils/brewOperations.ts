import { execSyncShell } from "./execSyncShell.js";

/**
 * Based on the installation path of the cedra formula, determine the path where the
 * CLI should be installed.
 */
export const getCliPathBrew = () => {
  const directory = execSyncShell("brew --prefix cedra", { encoding: "utf8" })
    .toString()
    .trim();
  return `${directory}/bin/cedra`;
};
