import { platform } from "os";
export const getOS = () => {
    const osPlatform = platform();
    switch (osPlatform) {
        case "darwin":
            return "MacOS";
        case "linux":
            return "Ubuntu";
        case "win32":
            return "Windows";
        default:
            throw new Error(`Unsupported OS ${osPlatform}`);
    }
};
//# sourceMappingURL=getUserOs.js.map