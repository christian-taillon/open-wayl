#!/bin/bash
# Script to toggle OpenWhispr recording on Wayland
# Bind this script to a custom keyboard shortcut in GNOME Settings

# Ensure we are in the project directory
PROJECT_DIR="/home/christian/github/open-whispr"

if [ -d "$PROJECT_DIR" ]; then
  cd "$PROJECT_DIR"
  # Run the app with the toggle flag
  # This triggers the second-instance event in the already running app
  ./node_modules/.bin/electron . --toggle
else
  echo "Error: Project directory not found at $PROJECT_DIR"
  exit 1
fi
