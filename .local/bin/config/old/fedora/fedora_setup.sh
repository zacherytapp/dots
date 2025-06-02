#!/bin/bash

set -e

sudo apt update && sudo apt upgrade -y

TEMP_DIR=$(mktemp -d)

# Check if the temporary directory was created successfully
if [ -d "$TEMP_DIR" ]; then
  echo "Temporary directory created successfully at: $TEMP_DIR"
  # You can add commands here to use the temporary directory
  # For example, cd "$TEMP_DIR"
else
  echo "Failed to create temporary directory."
  exit 1
fi

echo "Script finished."

# The temporary directory will persist after the script exits.
# If you want to clean it up automatically, you could add:
# trap 'rm -rf "$TEMP_DIR"' EXIT
# However, be cautious with automatic removal, especially if you need to inspect its contents.

