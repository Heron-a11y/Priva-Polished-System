# PowerShell script to fix all Metro and backend errors
Write-Host "🛑 Stopping all processes..." -ForegroundColor Red
Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force
Get-Process -Name "php" -ErrorAction SilentlyContinue | Stop-Process -Force
Get-Process -Name "expo" -ErrorAction SilentlyContinue | Stop-Process -Force

Write-Host "🧹 Clearing Metro cache and temporary files..." -ForegroundColor Yellow
$frontendPath = "C:\xampp\htdocs\ITB03-Test-Copy\Updated-Fitform-Project\fitform-frontend"
Set-Location $frontendPath

Write-Host "Removing Metro cache..." -ForegroundColor Cyan
if (Test-Path ".expo") { Remove-Item -Recurse -Force ".expo" }
if (Test-Path "node_modules\.cache") { Remove-Item -Recurse -Force "node_modules\.cache" }
if (Test-Path "InternalBytecode.js") { Remove-Item -Force "InternalBytecode.js" }

Write-Host "Clearing npm cache..." -ForegroundColor Cyan
npm cache clean --force

Write-Host "🔧 Fixing Laravel backend configuration..." -ForegroundColor Yellow
$backendPath = "C:\xampp\htdocs\ITB03-Test-Copy\Updated-Fitform-Project\fitform-backend"
Set-Location $backendPath

Write-Host "Updating APP_URL to local IP..." -ForegroundColor Cyan
(Get-Content .env) -replace 'APP_URL=.*', 'APP_URL=http://192.168.1.105:8000' | Set-Content .env

Write-Host "Updating CORS configuration..." -ForegroundColor Cyan
(Get-Content .env) -replace 'CORS_ALLOWED_ORIGINS=.*', 'CORS_ALLOWED_ORIGINS=http://192.168.1.105:8081,http://192.168.1.105:8000' | Set-Content .env

Write-Host "Clearing Laravel cache..." -ForegroundColor Cyan
php artisan config:clear
php artisan cache:clear
php artisan route:clear
php artisan view:clear

Write-Host "Recreating storage link..." -ForegroundColor Cyan
php artisan storage:link

Write-Host "🚀 Starting Backend Server..." -ForegroundColor Green
Start-Process -FilePath "cmd" -ArgumentList "/k", "php artisan serve --host=0.0.0.0 --port=8000" -WindowStyle Normal

Write-Host "⏳ Waiting 8 seconds for backend to start..." -ForegroundColor Cyan
Start-Sleep -Seconds 8

Write-Host "🧪 Testing backend connection..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://192.168.1.105:8000/api/test" -Method GET -TimeoutSec 10
    Write-Host "✅ Backend API working! Status: $($response.StatusCode)" -ForegroundColor Green
} catch {
    Write-Host "❌ Backend API failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "🧪 Testing image access..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://192.168.1.105:8000/storage/profiles/profile_5_1759344509.jpg" -Method Head -TimeoutSec 10
    Write-Host "✅ Image access working! Status: $($response.StatusCode)" -ForegroundColor Green
} catch {
    Write-Host "❌ Image access failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "🚀 Starting Frontend Metro..." -ForegroundColor Green
Set-Location $frontendPath
Start-Process -FilePath "cmd" -ArgumentList "/k", "npx expo start --clear --reset-cache" -WindowStyle Normal

Write-Host "✅ All services should now be running properly!" -ForegroundColor Green
Write-Host "📱 Check for QR code in Metro window" -ForegroundColor Cyan
Write-Host "🌐 Backend should be at http://192.168.1.105:8000" -ForegroundColor Cyan
Write-Host "🖼️ Images should be accessible at http://192.168.1.105:8000/storage/profiles/" -ForegroundColor Cyan
Write-Host ""
Write-Host "🔍 If you still see errors:" -ForegroundColor Yellow
Write-Host "1. Check backend window for Laravel errors" -ForegroundColor White
Write-Host "2. Check Metro window for bundling errors" -ForegroundColor White
Write-Host "3. Restart your device/emulator" -ForegroundColor White
