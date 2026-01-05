# Wayland Setup Guide for OpenWayl

OpenWayl is optimized for Linux Wayland environments (GNOME, KDE, Hyprland, etc.) where traditional global hotkeys and text insertion methods often fail due to security isolation.

To enable full functionality (global hotkeys and auto-pasting), you need to configure `ydotool`.

## 1. Install ydotool

### Arch Linux / Manjaro
```bash
sudo pacman -S ydotool
```

### Debian / Ubuntu / Fedora
You may need to build from source or check your distribution's repositories.
Source: [https://github.com/ReimuNotMoe/ydotool](https://github.com/ReimuNotMoe/ydotool)

## 2. Configure Permissions

`ydotool` requires access to the uinput device. The safest way to run it is as a user service with appropriate permissions.

1. Add your user to the `input` group (if not already):
   ```bash
   sudo usermod -aG input $USER
   ```
   *Log out and log back in for this to take effect.*

2. Ensure `/dev/uinput` is accessible. You might need a udev rule.
   Create `/etc/udev/rules.d/80-uinput.rules`:
   ```bash
   KERNEL=="uinput", GROUP="input", MODE="0660", OPTIONS+="static_node=uinput"
   ```
   Then reload rules:
   ```bash
   sudo udevadm control --reload-rules && sudo udevadm trigger
   ```

## 3. Set up the User Service

We use a systemd user service to keep the `ydotool` daemon running and accessible by OpenWayl.

1. Create the service directory:
   ```bash
   mkdir -p ~/.config/systemd/user/
   ```

2. Create the service file at `~/.config/systemd/user/ydotool.service`:

   ```ini
   [Unit]
   Description=Starts ydotoold service
   Documentation=man:ydotoold(1)

   [Service]
   Type=simple
   ExecStart=/usr/bin/ydotoold --socket-path=%h/.ydotool_socket --socket-own=%U:%G
   Restart=always

   [Install]
   WantedBy=default.target
   ```

   **Note:** Check your path to `ydotoold` with `which ydotoold`. If it is `/usr/local/bin/ydotoold`, update the `ExecStart` path accordingly.

3. Enable and start the service:
   ```bash
   systemctl --user daemon-reload
   systemctl --user enable --now ydotool.service
   ```

4. Verify it's running:
   ```bash
   systemctl --user status ydotool.service
   ```

## 4. Configure Global Hotkeys (GNOME)

Electron apps cannot register global hotkeys on Wayland. You must use your Desktop Environment's shortcut manager.

1. Open **Settings > Keyboard > View and Customize Shortcuts > Custom Shortcuts**.
2. Add a new shortcut:
   - **Name:** OpenWayl Toggle
   - **Command:** `/path/to/open-wayl/scripts/wayland-toggle.sh` (if running from source) OR `/path/to/OpenWayl.AppImage --toggle`
   - **Shortcut:** `Super+Space` (or your preferred key)

## Troubleshooting

- **"Socket not found":** Ensure the service is running and the socket path in the service file matches `%h/.ydotool_socket` (which expands to `~/.ydotool_socket`).
- **Permission denied:** Check that your user is in the `input` group and `/dev/uinput` has correct permissions.
