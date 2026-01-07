const { spawn, exec } = require("child_process");
const fs = require("fs");
const path = require("path");
const os = require("os");
const debugLogger = require("./debugLogger");
const { app } = require("electron");
const EventEmitter = require("events");

class NemotronManager extends EventEmitter {
  constructor() {
    super();
    this.venvPath = path.join(app.getPath("userData"), ".venv-nemo");
    this.uvPath = null;
    this.serverProcess = null;
    this.serverStartPromise = null;
    this.restartCount = 0;
    this.maxRestarts = 3;

    // Determine platform-specific UV installation URL/method
    this.platform = process.platform;
    this.arch = process.arch;
  }

  async getUvPath() {
    if (this.uvPath && fs.existsSync(this.uvPath)) return this.uvPath;

    // Check if uv is in PATH
    try {
      await this.runCommand("uv", ["--version"]);
      this.uvPath = "uv";
      return "uv";
    } catch (e) {
      // Not in path
    }

    // Check local bin
    const localBin = path.join(app.getPath("userData"), "bin");
    const uvName = this.platform === "win32" ? "uv.exe" : "uv";
    const localUv = path.join(localBin, uvName);

    if (fs.existsSync(localUv)) {
      this.uvPath = localUv;
      return localUv;
    }

    return null;
  }

  async installUv() {
    const localBin = path.join(app.getPath("userData"), "bin");
    if (!fs.existsSync(localBin)) {
      fs.mkdirSync(localBin, { recursive: true });
    }

    debugLogger.log("Installing uv to", localBin);

    return new Promise((resolve, reject) => {
      let command;
      // Set UV_INSTALL_DIR to our local bin
      const env = { ...process.env, UV_INSTALL_DIR: localBin };

      if (this.platform === "win32") {
        command = `powershell -c "irm https://astral.sh/uv/install.ps1 | iex"`;
      } else {
        command = `curl -LsSf https://astral.sh/uv/install.sh | sh`;
      }

      exec(command, { env }, (error, stdout, stderr) => {
        if (error) {
          debugLogger.error("UV install failed", error);
          reject(error);
        } else {
          // Re-check path
          this.getUvPath().then((p) => {
            if (p) resolve(p);
            else {
              // Fallback check
              const uvName = this.platform === "win32" ? "uv.exe" : "uv";
              const home = os.homedir();
              const commonPaths = [
                path.join(home, ".local", "bin", uvName),
                path.join(home, ".cargo", "bin", uvName),
                path.join(localBin, uvName)
              ];

              for (const p of commonPaths) {
                if (fs.existsSync(p)) {
                  this.uvPath = p;
                  resolve(p);
                  return;
                }
              }
              reject(new Error("UV installed but not found"));
            }
          });
        }
      });
    });
  }

  async createEnvironment(progressCallback) {
    const uv = await this.getUvPath();
    if (!uv) throw new Error("uv not found");

    const report = (msg, pct) => progressCallback && progressCallback({ message: msg, percentage: pct });

    try {
      report("Creating virtual environment...", 10);
      await this.runCommand(uv, ["venv", this.venvPath]);

      report("Installing build dependencies (Cython, packaging)...", 20);
      await this.runPipInstall(["Cython", "packaging"]);

      report("Installing PyTorch with CUDA support (this may take a while)...", 40);
      await this.runPipInstall(
        ["torch", "torchvision", "torchaudio"],
        ["--index-url", "https://download.pytorch.org/whl/cu124"]
      );

      report("Installing NeMo Toolkit and dependencies...", 70);
      await this.runPipInstall(["nemo_toolkit[asr]", "huggingface_hub"]);

      report("Environment setup complete.", 100);
      return true;
    } catch (e) {
      debugLogger.error("Environment creation failed", e);
      throw e;
    }
  }

  async runPipInstall(packages, extraArgs = []) {
    const uv = await this.getUvPath();
    const pythonPath = this.getPythonPath();
    const args = ["pip", "install", "-p", pythonPath, ...extraArgs, ...packages];
    return this.runCommand(uv, args);
  }

  getPythonPath() {
    const binDir = this.platform === "win32" ? "Scripts" : "bin";
    const pythonName = this.platform === "win32" ? "python.exe" : "python";
    return path.join(this.venvPath, binDir, pythonName);
  }

  async checkSystemDependencies() {
    if (this.platform !== "linux") return { available: true };

    try {
        await this.runCommand("ldconfig", ["-p", "|", "grep", "libsndfile"]);
        return { available: true };
    } catch (e) {
        const paths = ["/usr/lib/x86_64-linux-gnu/libsndfile.so.1", "/usr/lib/libsndfile.so.1"];
        for (const p of paths) {
            if (fs.existsSync(p)) return { available: true };
        }
        return { available: false, error: "libsndfile1 is missing" };
    }
  }

  async checkGPU() {
    try {
        await this.runCommand("nvidia-smi");
        return { available: true, device: "NVIDIA GPU Detected (System)" };
    } catch (e) {
        // Fallback
    }

    const pythonPath = this.getPythonPath();
    if (!fs.existsSync(pythonPath)) {
        return { available: false, error: "NVIDIA GPU not detected (nvidia-smi failed)" };
    }

    const scriptPath = this.getScriptPath();

    try {
        const result = await this.runCommand(pythonPath, [scriptPath, "check-gpu"]);
        const lines = result.trim().split("\n");
        const jsonStr = lines[lines.length - 1];
        return JSON.parse(jsonStr);
    } catch (e) {
        return { available: false, error: e.message };
    }
  }

  async downloadModel(progressCallback) {
     const pythonPath = this.getPythonPath();
     const scriptPath = this.getScriptPath();

     return new Promise((resolve, reject) => {
         const proc = spawn(pythonPath, [scriptPath, "download"]);
         let buffer = "";

         const handleData = (chunk) => {
             buffer += chunk.toString();
             const lines = buffer.split("\n");
             buffer = lines.pop(); // Keep incomplete line

             for (const line of lines) {
                 if (!line.trim()) continue;
                 try {
                     const msg = JSON.parse(line);
                     if (msg.status === "starting") {
                         progressCallback({ status: "downloading", message: "Starting download..." });
                     } else if (msg.status === "complete") {
                         resolve(msg.path);
                     } else if (msg.status === "error") {
                         reject(new Error(msg.message));
                     }
                 } catch (e) {
                     // ignore
                 }
             }
         };

         proc.stdout.on("data", handleData);
         proc.stderr.on("data", (data) => debugLogger.log("Download stderr:", data.toString()));

         proc.on("close", (code) => {
             if (code !== 0) reject(new Error("Download process exited with code " + code));
         });
     });
  }

  async startServer() {
    if (this.serverProcess) return this.serverStartPromise;

    this.serverStartPromise = new Promise((resolve, reject) => {
        const pythonPath = this.getPythonPath();
        const scriptPath = this.getScriptPath();

        debugLogger.log("Starting Nemotron server...");

        this.serverProcess = spawn(pythonPath, [scriptPath, "server"]);

        // Proper stream buffering
        let buffer = "";

        this.serverProcess.stdout.on("data", (chunk) => {
            buffer += chunk.toString();
            const lines = buffer.split("\n");
            buffer = lines.pop();

            for (const line of lines) {
                if (!line.trim()) continue;
                try {
                    const msg = JSON.parse(line);
                    this.emit("message", msg);

                    // Handle startup messages
                    if (msg.type === "status" && msg.status === "ready") {
                        resolve();
                    } else if (msg.type === "error" || msg.type === "fatal") {
                        // Only reject if we haven't resolved yet (startup phase)
                        // If it's a runtime error, the specific request handler will catch it via ID
                        if (!this.isReady) reject(new Error(msg.message));
                    }
                } catch (e) {
                    debugLogger.error("JSON Parse Error in Daemon Stream:", e);
                }
            }
        });

        this.serverProcess.stderr.on("data", (data) => {
            debugLogger.log("Nemotron Server Stderr:", data.toString());
        });

        this.serverProcess.on("close", (code) => {
            debugLogger.log("Nemotron Server closed with code", code);
            this.serverProcess = null;
            this.serverStartPromise = null;
            this.isReady = false;

            // Auto-restart logic
            if (code !== 0 && this.restartCount < this.maxRestarts) {
                this.restartCount++;
                debugLogger.log(`Restarting Nemotron Server (${this.restartCount}/${this.maxRestarts})...`);
                setTimeout(() => this.startServer().catch(err => debugLogger.error("Restart failed", err)), 1000);
            } else {
                this.restartCount = 0; // Reset if we stop intentionally or max out
            }
        });

        // Timeout for startup
        setTimeout(() => {
            if (!this.isReady && this.serverStartPromise) {
                reject(new Error("Server start timeout"));
            }
        }, 60000); // 60s timeout for model loading (it's slow)
    });

    // Mark as ready when resolved
    this.serverStartPromise.then(() => {
        this.isReady = true;
        this.restartCount = 0; // Reset restart count on successful start
    }).catch(() => {
        this.serverProcess = null;
        this.serverStartPromise = null;
    });

    return this.serverStartPromise;
  }

  async stopServer() {
      if (this.serverProcess) {
          try {
              this.serverProcess.stdin.write(JSON.stringify({ command: "exit" }) + "\n");
          } catch(e) {}
          // Force kill if needed
          setTimeout(() => {
              if (this.serverProcess) this.serverProcess.kill();
          }, 1000);
      }
  }

  async transcribe(filePath) {
      if (!this.serverProcess) await this.startServer();

      const requestId = Math.random().toString(36).substring(2, 15);

      return new Promise((resolve, reject) => {

          const responseHandler = (msg) => {
              if (msg.id === requestId) {
                  this.off("message", responseHandler);
                  if (msg.type === "result") {
                      resolve(msg.text);
                  } else if (msg.type === "error") {
                      reject(new Error(msg.message));
                  }
              }
          };

          // Listen for messages
          this.on("message", responseHandler);

          // Timeout
          const timeout = setTimeout(() => {
              this.off("message", responseHandler);
              reject(new Error("Transcription timeout"));
          }, 60000); // 1 minute timeout?

          const req = JSON.stringify({
              command: "transcribe",
              file_path: filePath,
              id: requestId
          }) + "\n";

          try {
            this.serverProcess.stdin.write(req);
          } catch (e) {
            this.off("message", responseHandler);
            clearTimeout(timeout);
            reject(e);
          }
      });
  }

  getScriptPath() {
      // In production (packaged), python scripts are unpacked to app.asar.unpacked
      if (app.isPackaged) {
          return path.join(
              process.resourcesPath,
              "app.asar.unpacked",
              "src",
              "python",
              "nemotron_daemon.py"
          );
      }
      // In development
      return path.join(__dirname, "..", "python", "nemotron_daemon.py");
  }

  runCommand(command, args, options = {}) {
      return new Promise((resolve, reject) => {
          const proc = spawn(command, args, { ...options, shell: true });
          let stdout = "";
          let stderr = "";

          proc.stdout.on("data", d => stdout += d.toString());
          proc.stderr.on("data", d => stderr += d.toString());

          proc.on("close", (code) => {
              if (code === 0) resolve(stdout);
              else reject(new Error(`Command failed with code ${code}: ${stderr}`));
          });

          proc.on("error", err => reject(err));
      });
  }
}

module.exports = NemotronManager;
