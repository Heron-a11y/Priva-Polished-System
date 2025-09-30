#!/bin/bash

echo "🚨 CRITICAL CRASH FIX - Building with fixes..."

# Apply critical fixes
node critical-crash-fix.js

# Build with EAS
echo "Building with production-crash-fixed profile..."
eas build --platform android --profile production-crash-fixed

echo "✅ Build complete with critical crash fixes!"
