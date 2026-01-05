#!/bin/bash

# OpenWayl Linux Post-Install Setup Script
# Currently focused on enabling auto-paste on Wayland via ydotool

set -e

echo "🐧 OpenWayl Linux Setup"
echo "========================="

# Check for ydotool
if ! command -v ydotool &> /dev/null; then
    echo "❌ ydotool is not installed."
    echo "   Please install it first (e.g., sudo apt install ydotool or build from source)."
    exit 1
fi

echo "✅ ydotool is installed."

# Create a user service file
SERVICE_FILE="ydotool.service"
cat > $SERVICE_FILE <<EOF
[Unit]
Description=Starts ydotoold service
Documentation=man:ydotoold(1)

[Service]
Type=simple
ExecStart=/usr/local/bin/ydotoold --socket-path=%h/.ydotool_socket --socket-own=%U:%G
Restart=always

[Install]
WantedBy=default.target
EOF

echo "
📋 To enable auto-paste on Wayland (GNOME/etc), we need to run ydotoold in the background.
   We have generated a systemd user service file for you.

   Run the following commands to install and enable it:

   mkdir -p ~/.config/systemd/user/
   mv $SERVICE_FILE ~/.config/systemd/user/
   systemctl --user daemon-reload
   systemctl --user enable --now ydotool

   # Verify it's running:
   systemctl --user status ydotool

   NOTE: ydotoold needs access to /dev/uinput.
   If it fails to start, you may need to add your user to the 'input' or 'uinput' group:
   sudo usermod -aG input \$USER
   # Then log out and back in.
"
