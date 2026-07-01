#!/usr/bin/env bash

set -euo pipefail

SRC_DIR="src"
OUT_FILE="$(date +"%Y%m%d-%H%M%S").zip"

if [ ! -d "$SRC_DIR" ]; then
    echo "Error: '$SRC_DIR' directory does not exist."
    exit 1
fi

zip -r "$OUT_FILE" "$SRC_DIR"

echo "Created: $OUT_FILE"