import { platform } from "os";
import { readFileSync, existsSync } from "fs";

/**
 * Returns true if the OS is Ubuntu Linux.
 */
export const isUbuntu = (): boolean => {
  if (platform() !== "linux") return false;

  const osReleasePath = "/etc/os-release";
  if (!existsSync(osReleasePath)) return false;

  try {
    const content = readFileSync(osReleasePath, "utf8").toLowerCase();
    return content.includes("id=ubuntu");
  } catch {
    return false;
  }
};

/**
 * Determine what OS we're running on.
 */
export const getOS = () => {
  const osPlatform = platform();
  switch (osPlatform) {
    case "darwin":
      return "MacOS";
    case "linux":
      if (isUbuntu()) {
        return "Ubuntu";
      } else {
        return "Linux";
      }
    case "win32":
      return "Windows";
    default:
      throw new Error(`Unsupported OS ${osPlatform}`);
  }
};
