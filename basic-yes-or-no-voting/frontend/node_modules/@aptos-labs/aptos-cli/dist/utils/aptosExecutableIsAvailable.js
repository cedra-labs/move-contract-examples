import { execSyncShell } from "./execSyncShell.js";
export const executableIsAvailable = (name) => {
    try {
        execSyncShell(`which ${name}`, { encoding: "utf8" });
        return true;
    }
    catch (error) {
        return false;
    }
};
//# sourceMappingURL=aptosExecutableIsAvailable.js.map