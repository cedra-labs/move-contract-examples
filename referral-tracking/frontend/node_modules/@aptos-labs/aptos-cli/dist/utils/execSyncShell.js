import { execSync } from "child_process";
export const execSyncShell = (command, options) => {
    return execSync(command, { shell: true, ...options });
};
//# sourceMappingURL=execSyncShell.js.map