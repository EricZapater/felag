#!/bin/bash
set -e

# Script per trobar destins semblants o duplicats a la base de dades de FELAG
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$DIR/backend"

go run ./cmd/find_similar_destinations "$@"
