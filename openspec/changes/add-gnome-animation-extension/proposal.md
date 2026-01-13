# Change: Add GNOME Top Bar animation extension support

## Why
OpenWayl currently uses a dedicated overlay window for recording and processing animations, which feels non-native on GNOME. Users want a native Top Bar indicator option that is easy to enable and disables the extra window entirely.

## What Changes
- Add a Linux-only setting to use a GNOME extension for recording/processing animations.
- When enabled, do not create or display the animation window at all.
- Provide a reliable fallback to the current overlay window when the extension is unavailable or disabled.
- Ship a GNOME extension under `extensions/gnome/` with an install button in Settings.
- Use GNOME-native DBus to send recording and processing state updates.

## Impact
- Affected specs: linux-gnome-integration
- Affected code: settings UI, main-process animation window creation, Linux platform integration, DBus state emission, GNOME extension packaging
