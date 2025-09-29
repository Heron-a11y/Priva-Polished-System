Write-Host "========================================" -ForegroundColor Cyan
Write-Host "    FitForm AR APK Builder" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Checking Java installation..." -ForegroundColor Yellow
try {
    $javaVersion = java -version 2>&1
    Write-Host "✅ Java is installed!" -ForegroundColor Green
    Write-Host $javaVersion[0] -ForegroundColor Gray
} catch {
    Write-Host "❌ Java is not installed!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please install Java JDK 17 or higher:" -ForegroundColor Yellow
    Write-Host "1. Download from: https://adoptium.net/" -ForegroundColor White
    Write-Host "2. Install Java JDK 17+" -ForegroundColor White
    Write-Host "3. Set JAVA_HOME environment variable" -ForegroundColor White
    Write-Host "4. Add `$env:JAVA_HOME\bin to PATH" -ForegroundColor White
    Write-Host ""
    Read-Host "Press Enter to continue"
    exit 1
}

Write-Host ""
Write-Host "Checking Android SDK..." -ForegroundColor Yellow
if (-not $env:ANDROID_HOME) {
    Write-Host "❌ Android SDK not found!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please install Android Studio:" -ForegroundColor Yellow
    Write-Host "1. Download from: https://developer.android.com/studio" -ForegroundColor White
    Write-Host "2. Install Android Studio (includes Android SDK)" -ForegroundColor White
    Write-Host "3. Set ANDROID_HOME environment variable" -ForegroundColor White
    Write-Host ""
    Read-Host "Press Enter to continue"
    exit 1
}

Write-Host "✅ Android SDK found!" -ForegroundColor Green
Write-Host ""

Write-Host "Building APK with ARCore support..." -ForegroundColor Yellow
Write-Host ""

Set-Location android
& .\gradlew.bat assembleDebug

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ APK built successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "APK location: android\app\build\outputs\apk\debug\app-debug.apk" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "To install on your Samsung Galaxy A26 5G:" -ForegroundColor Yellow
    Write-Host "1. Enable Developer Options" -ForegroundColor White
    Write-Host "2. Enable USB Debugging" -ForegroundColor White
    Write-Host "3. Connect device via USB" -ForegroundColor White
    Write-Host "4. Run: adb install app-debug.apk" -ForegroundColor White
    Write-Host ""
} else {
    Write-Host ""
    Write-Host "❌ Build failed!" -ForegroundColor Red
    Write-Host "Please check the error messages above." -ForegroundColor Yellow
    Write-Host ""
}

Read-Host "Press Enter to continue"
