# PowerShell script to start both backend and frontend properly
Write-Host "🛑 Stopping all stuck processes..." -ForegroundColor Red
Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force
Get-Process -Name "php" -ErrorAction SilentlyContinue | Stop-Process -Force
Get-Process -Name "expo" -ErrorAction SilentlyContinue | Stop-Process -Force

Write-Host "🧹 Starting Backend Server..." -ForegroundColor Yellow
$backendPath = "C:\xampp\htdocs\ITB03-Test-Copy\Updated-Fitform-Project\fitform-backend"
Start-Process -FilePath "cmd" -ArgumentList "/k", "cd /d `"$backendPath`" && php artisan serve --host=0.0.0.0 --port=8000" -WindowStyle Normal

Write-Host "⏳ Waiting 5 seconds for backend to start..." -ForegroundColor Cyan
Start-Sleep -Seconds 5

Write-Host "🚀 Starting Frontend Metro..." -ForegroundColor Green
$frontendPath = "C:\xampp\htdocs\ITB03-Test-Copy\Updated-Fitform-Project\fitform-frontend"
Start-Process -FilePath "cmd" -ArgumentList "/k", "cd /d `"$frontendPath`" && npx expo start --clear" -WindowStyle Normal

Write-Host "✅ Both services should now be running!" -ForegroundColor Green
Write-Host "📱 Check for QR code in Metro window" -ForegroundColor Cyan
Write-Host "🌐 Backend should be at http://192.168.1.105:8000" -ForegroundColor Cyan
