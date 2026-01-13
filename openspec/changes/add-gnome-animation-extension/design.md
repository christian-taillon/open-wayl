## Context
GNOME users want recording/processing indicators in the Top Bar. When GNOME mode is enabled, the overlay animation window should never be started. The extension lives under `extensions/gnome/` and receives state updates via GNOME-native DBus.

## Goals / Non-Goals
- Goals: native GNOME indicator, simple toggle, reliable fallback, install button in settings
- Non-Goals: non-GNOME Linux support, themeable indicator beyond GNOME norms

## Decisions
- Decision: Use DBus for state updates to the extension
- Decision: Extension packaged under `extensions/gnome/` in repo
- Decision: Provide Settings button to install/enable the extension

## Risks / Trade-offs
- GNOME version compatibility risk → target latest GNOME APIs and limit custom UI
- DBus API drift risk → keep interface minimal with explicit states

## Migration Plan
- Add setting default OFF
- If extension missing or DBus not available, fall back to overlay window

## Open Questions
- Determine DBus service name and interface schema
- Define installation flow (script vs. manual steps)
