import { spawnSync } from "child_process";
export const handleHelpOptions = (program, unknownOptions) => {
    const cliHelp = spawnSync(`aptos`, unknownOptions, {
        stdio: "pipe",
        encoding: "utf-8",
    });
    const commanderHelp = program.helpInformation();
    const commanderOptionsOnly = commanderHelp
        .split("\n")
        .filter((line) => !line.startsWith("Usage") && !line.startsWith("Options"))
        .join("\n");
    const combinedHelp = cliHelp.stdout.replace("Options:", `Options:\n${commanderOptionsOnly.trim()}`);
    console.log(combinedHelp);
    return;
};
//# sourceMappingURL=handleHelpOptions.js.map