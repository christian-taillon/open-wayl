# OpenWayl

A Linux-first desktop dictation application optimized for **Wayland**, based on OpenWhispr. It solves common Wayland isolation issues (global hotkeys, clipboard pasting) using standard Linux tools (`ydotool`, systemd services, and custom shortcuts).

> **Note:** This is a specialized fork of [OpenWhispr](https://github.com/HeroTools/open-whispr) designed for modern Linux environments (GNOME, KDE, Hyprland) where Electron apps struggle with global shortcuts and automation.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🐧 Wayland Setup (Required for Linux Users)

**On Wayland, global hotkeys and automatic text pasting require additional configuration.** Due to Wayland's security isolation, Electron apps cannot register system-wide shortcuts or simulate keyboard input directly.

OpenWayl solves this with two key components:

1. **ydotool** - For simulating keyboard input (auto-pasting)
2. **Custom Desktop Shortcuts** - For global dictation toggle

### Quick Setup Steps

**1. Install ydotool:**

```bash
# Arch/Manjaro
sudo pacman -S ydotool

# Debian/Ubuntu
sudo apt install ydotool
```

**2. Configure ydotool service:**

```bash
# Add your user to input group
sudo usermod -aG input $USER
# Log out and back in

# Create systemd service
mkdir -p ~/.config/systemd/user/
# Create service file at ~/.config/systemd/user/ydotool.service
# (See full guide below for service configuration)

# Enable service
systemctl --user enable --now ydotool.service
```

**3. Set up global hotkey in GNOME:**

- Go to **Settings > Keyboard > Custom Shortcuts**
- **Name:** OpenWayl Toggle
- **Command:** `/home/christian/github/open-whispr/scripts/wayland-toggle.sh`
- **Shortcut:** Super+Space (or your preferred key)

👉 **[Full Wayland Setup Guide](https://github.com/christian-taillon/open-wayl/blob/main/WAYLAND_SETUP.md)** 👈

**The setup guide covers:**

- Complete ydotool installation and udev rules
- systemd service configuration with troubleshooting
- GNOME/KDE/Hyprland shortcut setup
- Common issues and fixes

**Without this setup, global hotkeys won't work and text won't auto-paste on Wayland.**

## Features

- 🐧 **Wayland Optimized**: Specialized scripts and systemd services for modern Linux desktops
- 🎤 **Global Hotkey**: Toggle dictation via custom desktop shortcuts (Wayland) or native global hotkeys (X11/macOS/Windows)
- 🤖 **Multi-Provider AI Processing**: Choose between OpenAI, Anthropic Claude, Google Gemini, Groq, or local models
- 🎯 **Agent Naming**: Personalize your AI assistant with a custom name for natural interactions
- 🧠 **Latest AI Models**:
  - **OpenAI**: GPT-5 Series, GPT-4.1 Series, o-series reasoning models (o3/o4-mini)
  - **Anthropic**: Claude Opus 4.5, Claude Sonnet 4.5, Claude 3.5 Sonnet/Haiku
  - **Google**: Gemini 2.5 Pro/Flash/Flash-Lite
  - **Groq**: Ultra-fast inference with Llama and Mixtral models
  - **Local**: Qwen, LLaMA, Mistral models via llama.cpp
- 🔒 **Privacy-First**: Local processing keeps your voice data completely private
- 🎨 **Modern UI**: Built with React 19, TypeScript, and Tailwind CSS v4
- 🚀 **Fast**: Optimized with Vite and modern tooling
- 📱 **Control Panel**: Manage settings, view history, and configure API keys
- 🗄️ **Transcription History**: SQLite database stores all your transcriptions locally
- 🔧 **Model Management**: Download and manage local Whisper models (tiny, base, small, medium, large, turbo)
- 🧹 **Model Cleanup**: One-click removal of cached Whisper models with uninstall hooks to keep disks tidy
- ⚡ **Automatic Pasting**: Transcribed text automatically pastes at your cursor location (via `ydotool` on Wayland, native on other platforms)
- 🖱️ **Draggable Interface**: Move the dictation panel anywhere on your screen
- 🔄 **OpenAI Responses API**: Using the latest Responses API for improved performance
- ⌨️ **Compound Hotkeys**: Support for multi-key combinations like `Cmd+Shift+K`
- 🌐 **Globe Key Toggle (macOS)**: Optional Fn/Globe key listener for a hardware-level dictation trigger

## Prerequisites

- **Node.js 18+** (for building from source)
- **Linux** (Wayland or X11), **macOS 10.15+**, or **Windows 10+**
- **ydotool** (Required for Linux Wayland auto-paste)
- On macOS, Globe key support requires Xcode Command Line Tools (`xcode-select --install`)

**Platform Support:**

- ✅ **Linux (Wayland)**: Fully optimized with ydotool and systemd integration
- ✅ **Linux (X11)**: Native global hotkey and paste support
- ✅ **macOS**: Native support with Globe/Fn key shortcuts
- ✅ **Windows**: Native support with system tray integration

## Quick Start

### For Personal Use (Recommended)

1. **Clone the repository**:

   ```bash
   git clone https://github.com/christian-taillon/open-wayl.git
   cd open-wayl
   ```

2. **Install dependencies**:

   ```bash
   npm install
   ```

3. **For Wayland users: Configure ydotool and global hotkey**
   - Follow the **[Wayland Setup Guide](https://github.com/christian-taillon/open-wayl/blob/main/WAYLAND_SETUP.md)** above
   - Install ydotool, set up the systemd service, and configure desktop shortcuts

4. **Optional: Set up API keys** (only needed for cloud processing):

   **Method A - Environment file**:

   ```bash
   cp env.example .env
   # Edit .env and add your API keys:
   # OPENAI_API_KEY=your_openai_key
   # ANTHROPIC_API_KEY=your_anthropic_key
   # GEMINI_API_KEY=your_gemini_key
   ```

   **Method B - In-app configuration**:
   - Run the app and configure API keys through the Control Panel
   - Keys are automatically saved and persist across app restarts

5. **Run the application**:
   ```bash
   npm run dev  # Development mode with hot reload
   # OR
   npm start    # Production mode
   ```

**After starting**: Use the hotkey (default: backtick `) or your configured Wayland shortcut to toggle dictation.

### Building for Personal Use (Optional)

If you want to build a standalone app for personal use:

```bash
# Build without code signing
npm run pack
# The app will be in: dist/linux-unpacked/open-wayl
```

#### Linux (Multiple Package Formats)

OpenWayl supports multiple Linux package formats for maximum compatibility:

**Available Formats**:

- `.deb` - Debian, Ubuntu, Linux Mint, Pop!\_OS
- `.rpm` - Fedora, Red Hat, CentOS, openSUSE
- `.tar.gz` - Universal archive (works on any distro)
- `.flatpak` - Sandboxed cross-distro package
- `AppImage` - Portable single-file executable

**Building Linux Packages**:

```bash
# Build default Linux package formats (AppImage, deb, rpm, tar.gz)
npm run build:linux

# Find packages in dist/:
# - OpenWayl-x.x.x-linux-x64.AppImage
# - OpenWayl-x.x.x-linux-x64.deb
# - OpenWayl-x.x.x-linux-x64.rpm
# - OpenWayl-x.x.x-linux-x64.tar.gz
```

**Optional Dependencies for Automatic Paste**:

The clipboard paste feature requires `ydotool` on Wayland.

```bash
# Debian/Ubuntu
sudo apt install ydotool

# Arch
sudo pacman -S ydotool
```

> ℹ️ **Note**: See [WAYLAND_SETUP.md](WAYLAND_SETUP.md) for configuring the ydotool service, which is required for auto-paste to work.

### First Time Setup

1. **Choose Processing Method**:
   - **Local Processing**: Download Whisper models for completely private transcription
   - **Cloud Processing**: Use OpenAI's API for faster transcription (requires API key)

2. **Grant Permissions**:
   - **Microphone Access**: Required for voice recording
   - **Accessibility Permissions**: Required for automatic text pasting (macOS)
   - **Wayland Setup**: Install ydotool and configure desktop shortcuts (Linux Wayland)

3. **Name Your Agent**: Give your AI assistant a personal name (e.g., "Assistant", "Jarvis", "Alex")
   - Makes interactions feel more natural and conversational
   - Helps distinguish between giving commands and regular dictation
   - Can be changed anytime in settings

4. **Configure Global Hotkey**: Default is backtick (`) but can be customized
   - **Wayland users**: Must configure a desktop shortcut in GNOME/KDE settings
   - **macOS/Linux (X11)**: Global hotkey works natively through the app
   - **Windows**: Global hotkey works natively through the app

## Usage

### Basic Dictation

1. **Start the app** - A small draggable panel appears on your screen
2. **Press your hotkey** (default: backtick `) to start recording
   - **Wayland users**: Configure a custom desktop shortcut (see Wayland Setup above)
   - **macOS/Linux (X11)**: Global hotkey works natively
3. **Press your hotkey again** - Stop recording and begin transcription
4. **Text appears** - Transcribed text is automatically pasted at your cursor location
5. **Drag the panel** - Click and drag to move the dictation panel anywhere on your screen

**Note**: On Wayland, the hotkey is handled by your desktop environment (GNOME, KDE, etc.), not by the app itself.

### Processing Options

- **Local Processing**:
  - Install Whisper automatically through the Control Panel
  - Download models: tiny (39MB, fastest), base (74MB, recommended), small (244MB), medium (769MB), large (1.5GB, best quality), turbo (809MB, fast with good quality)
  - Complete privacy - audio never leaves your device
  - Works offline after model download
- **Cloud Processing**:
  - Requires OpenAI API key
  - Faster processing
  - Uses OpenAI's Whisper API
  - Requires internet connection

## Project Structure

```
open-wayl/
├── main.js                    # Electron main process entry point
├── preload.js                 # Electron preload script & IPC API bridge
├── package.json               # Dependencies and npm scripts
├── env.example                # Environment variables template
├── CHANGELOG.md               # Project changelog
├── electron-builder.json      # Electron Builder configuration
├── scripts/                   # Setup and utility scripts
│   ├── wayland-toggle.sh      # Wayland hotkey toggle script
│   ├── setup-linux-autostart.sh  # Linux autostart configuration
│   ├── complete-uninstall.sh  # Cleanup and uninstall helper
│   └── build-globe-listener.js  # macOS Globe key listener builder
├── resources/                 # Platform-specific resources
│   ├── linux/                 # Linux uninstall scripts
│   ├── mac/                   # macOS entitlements and plist files
│   ├── nsis/                  # Windows installer scripts
│   └── macos-globe-listener.swift  # macOS Globe/Fn key listener
└── src/                       # Main application source
    ├── App.jsx                # Main dictation interface
    ├── main.jsx               # React entry point
    ├── index.html             # Vite HTML template
    ├── index.css              # Tailwind CSS v4 configuration
    ├── vite.config.mjs        # Vite configuration
    ├── components/            # React components
    │   ├── ControlPanel.tsx   # Settings and history UI
    │   ├── OnboardingFlow.tsx # First-time setup wizard
    │   ├── SettingsPage.tsx   # Full settings interface
    │   ├── ui/                # shadcn/ui components
    │   └── ...
    ├── config/                # Configuration files
    ├── helpers/               # Main process helper modules
    │   ├── audioManager.js    # Audio device management
    │   ├── clipboard.js       # Cross-platform clipboard operations
    │   ├── whisper.js         # Whisper integration (whisper.cpp)
    │   ├── windowManager.js   # Window creation and lifecycle
    │   └── ...
    ├── hooks/                 # React hooks
    ├── models/                # Data models
    ├── services/              # Service layer
    │   ├── ReasoningService.ts     # AI processing service
    │   └── ...
    └── ...
```

## Technology Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS v4
- **Build Tool**: Vite with optimized Tailwind plugin
- **Desktop**: Electron 36 with context isolation
- **UI Components**: shadcn/ui with Radix primitives
- **Database**: better-sqlite3 for local transcription storage
- **Speech-to-Text**: OpenAI Whisper (powered by whisper.cpp for local, OpenAI API for cloud)
- **Icons**: Lucide React for consistent iconography
- **Wayland Integration**: ydotool, systemd, desktop shortcuts (Linux)
- **macOS Integration**: Swift (Globe/Fn key), AppleScript (clipboard)

## Configuration

### Local Whisper Setup

For local processing, OpenWayl uses OpenAI's Whisper model via **whisper.cpp** - a high-performance C++ implementation:

1. **Bundled Binary**: whisper.cpp is bundled with the app for all platforms
2. **GGML Models**: Downloads optimized GGML models on first use to `~/.cache/openwhispr/whisper-models/`
3. **No Dependencies**: No Python or other runtime required

**System Fallback**: If the bundled binary fails, install via package manager:

- macOS: `brew install whisper-cpp`
- Linux: Build from source at https://github.com/ggml-org/whisper.cpp

## Project Status

OpenWayl is actively maintained and ready for production use. Version: 1.2.6 (Synced with OpenWhispr 1.2.6 progress)

- ✅ Core functionality complete
- ✅ Wayland-optimized with ydotool integration
- ✅ Cross-platform support (Linux-first)
- ✅ Local and cloud processing
- ✅ Multi-provider AI support (OpenAI, Anthropic, Gemini, Groq)
- ✅ Agent naming system
- ✅ macOS Globe/Fn key support
- 🚧 Continuous improvements and bug fixes

## Acknowledgments

- **[OpenAI Whisper](https://github.com/openai/whisper)** - The speech recognition model that powers both local and cloud transcription
- **[whisper.cpp](https://github.com/ggerganov/whisper.cpp)** - High-performance C++ implementation of Whisper for local processing
- **[Electron](https://www.electronjs.org/)** - Cross-platform desktop application framework
- **[React](https://react.dev/)** - UI component library
- **[shadcn/ui](https://ui.shadcn.com/)** - Beautiful UI components built on Radix primitives
- **[llama.cpp](https://github.com/ggerganov/llama.cpp)** - Local LLM inference for AI-powered text processing
