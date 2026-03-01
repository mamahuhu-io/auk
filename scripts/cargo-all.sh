#!/bin/bash

# Run cargo command in all Rust project directories
RUST_DIRS=(
  "packages/auk-desktop/crates/webapp-bundler"
  "packages/auk-desktop/src-tauri"
  "packages/auk-plugin-relay"
  "packages/auk-relay"
)

for dir in "${RUST_DIRS[@]}"; do
  if [ -d "$dir" ]; then
    echo "Running cargo $@ in $dir..."
    (cd "$dir" && cargo "$@")
  fi
done
