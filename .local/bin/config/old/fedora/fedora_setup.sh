#!/bin/bash

set -e

sudo apt update && sudo apt upgrade -y

TEMP_DIR=$(mktemp -d)

if [ -d "$TEMP_DIR" ]; then
  echo "Temporary directory created successfully at: $TEMP_DIR"
else
  echo "Failed to create temporary directory."
  exit 1
fi

echo "Script finished."
