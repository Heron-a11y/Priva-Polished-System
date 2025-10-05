# PowerShell script to restart Metro properly
Write-Host "🛑 Stopping all Node.js processes..." -ForegroundColor Red
taskkill /f /im node.exe 2>$null
taskkill /f /im expo.exe 2>$null

Write-Host "🧹 Clearing Metro cache..." -ForegroundColor Yellow
npx expo start --clear --reset-cache

Write-Host "✅ Metro should now be running without issues!" -ForegroundColor Green
Write-Host "📱 Check your device for the QR code" -ForegroundColor Cyan
