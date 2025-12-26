import { existsSync } from "fs";
import { installCli } from "../tasks/install.js";
import { runCLI } from "../tasks/run.js";
import { updateCli } from "../tasks/update.js";
import { getLocalBinPath } from "./getLocalBinPath.js";
export const parseCommandOptions = async (options, unknownOptions) => {
    if (options.install) {
        await installCli();
        return;
    }
    if (options.update) {
        await updateCli();
        return;
    }
    const path = getLocalBinPath();
    if (!existsSync(path)) {
        await installCli();
    }
    await runCLI(unknownOptions);
};
//# sourceMappingURL=parseCommandOptions.js.map