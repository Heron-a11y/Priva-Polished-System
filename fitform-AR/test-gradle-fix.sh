#!/bin/bash
echo "Testing Gradle fix for AR Body Measurements..."

cd android

echo "Cleaning previous builds..."
./gradlew clean

echo "Testing Gradle wrapper..."
./gradlew wrapper --gradle-version 8.0

echo "Testing build configuration..."
./gradlew assembleDebug --stacktrace

if [ $? -eq 0 ]; then
    echo "Gradle fix test PASSED"
else
    echo "Gradle fix test FAILED"
    echo "Check the error messages above"
fi

cd ..
echo "Test completed."
