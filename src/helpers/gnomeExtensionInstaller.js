const fs = require("fs/promises");
const path = require("path");
const os = require("os");

const EXTENSION_UUID = "openwayl-indicator@openwayl";

async function installGnomeExtension() {
  if (process.platform !== "linux") {
    return {
      success: false,
      message: "GNOME extensions are only supported on Linux.",
    };
  }

  const sourceDir = path.join(
    __dirname,
    "..",
    "..",
    "extensions",
    "gnome",
    EXTENSION_UUID
  );
  const targetDir = path.join(
    os.homedir(),
    ".local",
    "share",
    "gnome-shell",
    "extensions",
    EXTENSION_UUID
  );

  try {
    await fs.access(sourceDir);
    await fs.mkdir(path.dirname(targetDir), { recursive: true });
    await fs.rm(targetDir, { recursive: true, force: true });
    await fs.cp(sourceDir, targetDir, { recursive: true });

    return {
      success: true,
      message: `Extension installed to ${targetDir}`,
      path: targetDir,
    };
  } catch (error) {
    return {
      success: false,
      message: error?.message || "Failed to install GNOME extension.",
    };
  }
}

module.exports = {
  EXTENSION_UUID,
  installGnomeExtension,
};
