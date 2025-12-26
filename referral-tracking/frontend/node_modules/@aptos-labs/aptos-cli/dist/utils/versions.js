import { execSyncShell } from "./execSyncShell.js";
export const getCurrentOpenSSLVersion = () => {
    const out = execSyncShell("openssl version", { encoding: "utf8" });
    return out.split(" ")[1].trim();
};
//# sourceMappingURL=versions.js.map