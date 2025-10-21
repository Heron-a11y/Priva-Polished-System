#!/bin/bash

echo "Running auto-cancellation of pending appointments..."
echo "================================================"

# Get the directory where the script is located
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
cd "$DIR"

php artisan appointments:auto-cancel

echo ""
echo "Auto-cancellation completed."





