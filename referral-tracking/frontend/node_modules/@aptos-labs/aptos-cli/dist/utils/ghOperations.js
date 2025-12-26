import { PNAME } from "./consts.js";
export const getLatestVersionGh = async () => {
    const prefix = `${PNAME}-v`;
    const response = await (await fetch("https://api.github.com/repos/aptos-labs/aptos-core/releases?per_page=100")).json();
    for (const release of response) {
        if (release["tag_name"].startsWith(`${prefix}`)) {
            return release.tag_name.replace(`${prefix}`, "");
        }
    }
    throw "Could not determine latest version of Aptos CLI";
};
//# sourceMappingURL=ghOperations.js.map