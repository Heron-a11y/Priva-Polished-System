# PowerShell script to fix image serving issue
Write-Host "🛑 Stopping all processes..." -ForegroundColor Red
Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force
Get-Process -Name "php" -ErrorAction SilentlyContinue | Stop-Process -Force
Get-Process -Name "expo" -ErrorAction SilentlyContinue | Stop-Process -Force

Write-Host "🔧 Fixing Laravel configuration..." -ForegroundColor Yellow
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

Write-Host "Recreating storage link..." -ForegroundColor Cyan
php artisan storage:link

Write-Host "🚀 Starting Backend Server..." -ForegroundColor Green
Start-Process -FilePath "cmd" -ArgumentList "/k", "php artisan serve --host=0.0.0.0 --port=8000" -WindowStyle Normal

Write-Host "⏳ Waiting 5 seconds for backend to start..." -ForegroundColor Cyan
Start-Sleep -Seconds 5

Write-Host "🧪 Testing image access..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://192.168.1.105:8000/storage/profiles/profile_5_1759344509.jpg" -Method Head
    Write-Host "✅ Image access successful! Status: $($response.StatusCode)" -ForegroundColor Green
} catch {
    Write-Host "❌ Image access failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "🚀 Starting Frontend Metro..." -ForegroundColor Green
$frontendPath = "C:\xampp\htdocs\ITB03-Test-Copy\Updated-Fitform-Project\fitform-frontend"
Start-Process -FilePath "cmd" -ArgumentList "/k", "cd /d `"$frontendPath`" && npx expo start --clear" -WindowStyle Normal

Write-Host "✅ Both services should now be running!" -ForegroundColor Green
Write-Host "📱 Check for QR code in Metro window" -ForegroundColor Cyan
Write-Host "🌐 Backend should be at http://192.168.1.105:8000" -ForegroundColor Cyan
Write-Host "🖼️ Images should be accessible at http://192.168.1.105:8000/storage/profiles/" -ForegroundColor Cyan
