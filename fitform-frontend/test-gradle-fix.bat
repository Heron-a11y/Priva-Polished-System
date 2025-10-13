@echo off
echo Testing Gradle fix for AR Body Measurements...

cd android

echo Cleaning previous builds...
call gradlew clean

echo Testing Gradle wrapper...
call gradlew wrapper --gradle-version 8.0

echo Testing build configuration...
call gradlew assembleDebug --stacktrace

if %ERRORLEVEL% EQU 0 (
    echo Gradle fix test PASSED
) else (
    echo Gradle fix test FAILED
    echo Check the error messages above
)

cd ..
echo Test completed.
pause
