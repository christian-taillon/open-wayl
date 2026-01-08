const { spawn } = require("child_process");
const { app } = require("electron");
const path = require("path");
const fs = require("fs");
const { promises: fsPromises } = require("fs");
const https = require("https");
const { createWriteStream } = require("fs");
const tar = require("tar");
const os = require("os");

// Only import unzipper in main process
let unzipper;
if (typeof window === 'undefined') {
  unzipper = require("unzipper");
}

class LlamaCppInstaller {
  constructor() {
    this.installDir = path.join(app.getPath("userData"), "llama-cpp");
    this.binPath = null;
    this.platform = process.platform;
    this.arch = process.arch;
  }

  async ensureInstallDir() {
    await fsPromises.mkdir(this.installDir, { recursive: true });
  }

  getBinaryName() {
    return this.platform === "win32" ? "llama-cli.exe" : "llama-cli";
  }

  getInstalledBinaryPath() {
    return path.join(this.installDir, this.getBinaryName());
  }

  async isInstalled() {
    try {
      // First check for system installation
      const systemInstalled = await this.checkSystemInstallation();
      if (systemInstalled) {
        const systemPath = await this.getSystemBinaryPath();
        if (systemPath) {
          this.binPath = systemPath;
          return true;
        }
      }
      
      // Then check for local installation
      const binaryPath = this.getInstalledBinaryPath();
      await fsPromises.access(binaryPath, fs.constants.X_OK);
      this.binPath = binaryPath;
      return true;
    } catch {
      return false;
    }
  }

  async getSystemBinaryPath() {
    return new Promise((resolve) => {
      const checkCmd = this.platform === "win32" ? "where" : "which";
      const binaryNames = this.platform === "win32" 
        ? ["llama-cli.exe", "llama.exe"]
        : ["llama-cli", "llama", "llama.cpp"];
      
      let found = false;
      let remaining = binaryNames.length;
      
      for (const name of binaryNames) {
        const proc = spawn(checkCmd, [name], {
          shell: true,
          stdio: "pipe",
        });

        let output = "";
        proc.stdout.on("data", (data) => {
          output += data.toString();
        });

        proc.on("close", (code) => {
          if (!found && code === 0 && output) {
            found = true;
            resolve(output.trim().split('\n')[0]);
          }
          remaining--;
          if (remaining === 0 && !found) {
            resolve(null);
          }
        });

        proc.on("error", () => {
          remaining--;
          if (remaining === 0 && !found) {
            resolve(null);
          }
        });
      }
    });
  }

  async checkSystemInstallation() {
    const systemPath = await this.getSystemBinaryPath();
    return systemPath !== null;
  }

  async getVersion() {
    try {
      const binaryPath = this.binPath || this.getInstalledBinaryPath();
      
      return new Promise((resolve, reject) => {
        const proc = spawn(binaryPath, ["--version"], {
          shell: false,
          stdio: "pipe",
        });

        let output = "";
        proc.stdout.on("data", (data) => {
          output += data.toString();
        });

        proc.on("close", (code) => {
          if (code === 0) {
            resolve(output.trim());
          } else {
            reject(new Error(`Failed to get version: exit code ${code}`));
          }
        });

        proc.on("error", (err) => {
          reject(err);
        });
      });
    } catch (error) {
      throw new Error(`Failed to get llama.cpp version: ${error.message}`);
    }
  }

  async getLatestReleaseUrl() {
    const apiOptions = {
      hostname: "api.github.com",
      path: "/repos/ggml-org/llama.cpp/releases/latest",
      headers: { "User-Agent": "open-whispr-installer" },
    };

    return new Promise((resolve, reject) => {
      https.get(apiOptions, (res) => {
        if (res.statusCode !== 200) {
          reject(new Error(`Failed to fetch release info: ${res.statusCode}`));
          return;
        }

        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          try {
            const release = JSON.parse(data);
            const assets = release.assets || [];
            let pattern = "";

            if (this.platform === "linux" && this.arch === "x64") {
              pattern = "bin-ubuntu-x64.tar.gz";
            } else if (this.platform === "darwin") {
              pattern = this.arch === "arm64" ? "bin-macos-arm64" : "bin-macos-x64";
            } else if (this.platform === "win32") {
              pattern = "bin-win-cpu-x64.zip";
            } else {
              reject(new Error(`Unsupported platform: ${this.platform}-${this.arch}`));
              return;
            }

            const asset = assets.find((a) => a.name.includes(pattern));
            if (asset) {
              resolve(asset.browser_download_url);
            } else {
              // Fallback: Try to construct the URL if asset not found in list
              // The file naming convention includes the tag name
              const tagName = release.tag_name;
              const fallbackUrl = `https://github.com/ggml-org/llama.cpp/releases/download/${tagName}/llama-${tagName}-${pattern}`;
              
              // Verify if the fallback URL exists
              const req = https.request(fallbackUrl, { method: 'HEAD' }, (res) => {
                if (res.statusCode === 200 || res.statusCode === 302) {
                  console.log(`Asset not in list, using fallback URL: ${fallbackUrl}`);
                  resolve(fallbackUrl);
                } else {
                  reject(new Error(`No asset found for ${this.platform} ${this.arch} with pattern ${pattern} (and fallback failed)`));
                }
              });
              
              req.on('error', () => {
                 reject(new Error(`No asset found for ${this.platform} ${this.arch} with pattern ${pattern}`));
              });
              
              req.end();
            }
          } catch (e) {
            reject(e);
          }
        });
      }).on("error", reject);
    });
  }

  async download(url, destPath) {
    return new Promise((resolve, reject) => {
      const file = createWriteStream(destPath);
      
      https.get(url, (response) => {
        if (response.statusCode === 302 || response.statusCode === 301) {
          const redirectUrl = response.headers.location;
          if (redirectUrl) {
            this.download(redirectUrl, destPath).then(resolve).catch(reject);
            return;
          }
        }

        if (response.statusCode !== 200) {
          reject(new Error(`Download failed with status: ${response.statusCode}`));
          return;
        }

        response.pipe(file);
        
        file.on("finish", () => {
          file.close();
          resolve();
        });

        file.on("error", (err) => {
          fs.unlink(destPath, () => {});
          reject(err);
        });
      }).on("error", reject);
    });
  }

  async extract(archivePath) {
    await this.ensureInstallDir();
    
    if (archivePath.endsWith(".tar.gz")) {
      await tar.x({
        file: archivePath,
        cwd: this.installDir,
        strip: 1,
      });
    } else if (archivePath.endsWith(".zip")) {
      if (!unzipper) throw new Error("unzipper module not loaded");
      await fs.createReadStream(archivePath)
        .pipe(unzipper.Extract({ path: this.installDir }))
        .promise();
    } else {
      throw new Error("Unsupported archive format");
    }
  }

  async install() {
    try {
      // Check if already installed
      if (await this.isInstalled()) {
        return { success: true };
      }

      // Create install directory
      await this.ensureInstallDir();

      // Download
      console.log("Fetching latest release URL...");
      const url = await this.getLatestReleaseUrl();
      const archivePath = path.join(
        this.installDir,
        url.endsWith(".zip") ? "llama.zip" : "llama.tar.gz"
      );

      console.log(`Downloading llama.cpp from ${url}...`);
      await this.download(url, archivePath);

      // Extract
      console.log("Extracting archive...");
      await this.extract(archivePath);

      // Clean up archive
      await fsPromises.unlink(archivePath);

      // Make binary executable on Unix
      if (this.platform !== "win32") {
        const binaryPath = this.getInstalledBinaryPath();
        await fsPromises.chmod(binaryPath, 0o755);
      }

      // Verify installation
      if (await this.isInstalled()) {
        return { success: true };
      } else {
        throw new Error("Installation verification failed");
      }
    } catch (error) {
      console.error("llama.cpp installation error:", error);
      return { 
        success: false, 
        error: error.message || "Installation failed" 
      };
    }
  }

  async uninstall() {
    try {
      await fsPromises.rm(this.installDir, { recursive: true, force: true });
      this.binPath = null;
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error.message || "Uninstall failed" 
      };
    }
  }

  async getBinaryPath() {
    if (this.binPath) return this.binPath;
    
    const systemPath = await this.getSystemBinaryPath();
    if (systemPath) {
      this.binPath = systemPath;
      return systemPath;
    }
    
    return this.getInstalledBinaryPath();
  }
}

module.exports = { default: new LlamaCppInstaller() };