import { execSyncShell } from "./execSyncShell.js";
export const getCliPathBrew = () => {
    const directory = execSyncShell("brew --prefix aptos", { encoding: "utf8" })
        .toString()
        .trim();
    return `${directory}/bin/aptos`;
};
//# sourceMappingURL=brewOperations.js.map