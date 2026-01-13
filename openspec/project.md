# Project Context

## Purpose

OpenWayl is a Linux-first desktop dictation app optimized for Wayland. It bypasses Wayland’s isolation (no global hotkeys or simulated input) using `ydotool`, systemd user services, and desktop shortcuts. It supports local Whisper transcription and optional cloud processing, plus AI text enhancement across multiple providers.

## Tech Stack

- **UI**: React 19, Vite 6, Tailwind CSS v4
- **Desktop**: Electron 36 (context isolation enabled)
- **UI Libraries**: shadcn/ui, Radix UI
- **Storage**: better-sqlite3 (local transcription history)
- **STT**: OpenAI Whisper (local via Python + cloud API)
- **AI Providers**: OpenAI (Responses API), Anthropic, Google Gemini, local llama.cpp
- **Build/Lint**: Electron Builder, ESLint 9
- **Platform Tools**: `ydotool`/systemd (Wayland), Swift (macOS Globe/Fn key), AppleScript (macOS paste)

## Project Conventions

### Code Style

- **Linting**: ESLint flat config with React Hooks + react-refresh
- **Naming**:
  - Components: PascalCase (`ControlPanel.tsx`)
  - Hooks: `useX` camelCase (`useSettings.ts`)
  - Main-process helpers: camelCase (`clipboard.js`)
  - Utilities: camelCase (`formatBytes.ts`)
- **Imports**: `@/` alias for `src/`
- **Unused vars**: ignore matches to `^[A-Z_]`

### Architecture Patterns

- **Dual windows**: overlay dictation UI + full control panel UI
- **Process split**:
  - Main: system operations, IPC, database
  - Renderer: React UI
  - Preload: limited API bridge via contextBridge
- **Service layer**: per-provider reasoning services
- **Storage access**: `helpers/database.js` wraps SQLite

### Testing Strategy

No automated tests are configured. All validation is manual.

Manual checks to run:
- Dictation flow (record → transcribe → paste)
- Wayland hotkey + `ydotool` paste
- Model download/install/cleanup
- AI provider selection and responses
- IPC stability and database persistence

### Git Workflow

- **Branches**: `main` (release), `develop` (active), feature branches
- **Commits**: `type(scope): summary` (e.g., `feat(clipboard): improve terminal detection`)
- **Releases**: tag-based `v*.*.*` via GitHub Actions
- **CI**: builds on main/develop; release builds on tags

## Domain Context

- **Local STT**: Python-based Whisper install; models 39MB–1.5GB
- **Cloud STT**: OpenAI Whisper API
- **AI Enhancement**: agent name + command detection for edits
- **Wayland**: no native global shortcuts; uses DE shortcuts + `ydotool`

## Important Constraints

- **Wayland**: requires `ydotool`, systemd service, and DE shortcut setup
- **Privacy**: no telemetry; API keys stored in OS keychain
- **Builds**: unsigned; macOS notarization not configured
- **Runtime**: Node 20+ for builds; Python 3.7+ for local Whisper
- **No tests**: avoid test-specific work unless added explicitly

## External Dependencies

- **APIs**: OpenAI, Anthropic, Gemini (optional keys)
- **System tools**: `ydotool`, optional `kdotool` (KDE Wayland)
- **Runtime libs**: `better-sqlite3`, `electron-updater`, `ffmpeg-static`
