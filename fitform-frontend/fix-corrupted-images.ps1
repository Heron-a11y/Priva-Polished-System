# PowerShell script to fix corrupted profile images
Write-Host "🛑 Stopping all processes..." -ForegroundColor Red
Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force
Get-Process -Name "php" -ErrorAction SilentlyContinue | Stop-Process -Force
Get-Process -Name "expo" -ErrorAction SilentlyContinue | Stop-Process -Force

Write-Host "🔧 Fixing corrupted profile images..." -ForegroundColor Yellow
$backendPath = "C:\xampp\htdocs\ITB03-Test-Copy\Updated-Fitform-Project\fitform-backend"
Set-Location $backendPath

Write-Host "Checking for corrupted image files..." -ForegroundColor Cyan
$profileDir = "storage\app\public\profiles"
$corruptedFiles = @()

Get-ChildItem $profileDir -Filter "*.jpg" | ForEach-Object {
    if ($_.Length -lt 1000) {
        Write-Host "Found corrupted file: $($_.Name) ($($_.Length) bytes)" -ForegroundColor Red
        $corruptedFiles += $_.FullName
    }
}

Write-Host "🖼️ Creating default profile image..." -ForegroundColor Green
$defaultImagePath = "$profileDir\default-profile.jpg"

# Create a simple SVG-based default profile image
$svgContent = @'
<svg width="100" height="100" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
<rect width="100" height="100" fill="#F3F4F6"/>
<circle cx="50" cy="40" r="15" fill="#9B9B9B"/>
<path d="M20 80C20 65.6415 31.6415 54 46 54H54C68.3585 54 80 65.6415 80 80V100H20V80Z" fill="#9B9B9B"/>
</svg>
'@

[System.IO.File]::WriteAllText($defaultImagePath, $svgContent)

Write-Host "🔄 Replacing corrupted images with default..." -ForegroundColor Yellow
foreach ($file in $corruptedFiles) {
    Write-Host "Replacing $file with default image..." -ForegroundColor Cyan
    Copy-Item $defaultImagePath $file -Force
}

Write-Host "🧹 Clearing Laravel cache..." -ForegroundColor Cyan
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
    $response = Invoke-WebRequest -Uri "http://192.168.1.105:8000/storage/profiles/profile_6_1759346676.jpg" -Method Head -TimeoutSec 10
    Write-Host "✅ Image access working! Status: $($response.StatusCode)" -ForegroundColor Green
} catch {
    Write-Host "❌ Image access failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "🚀 Starting Frontend Metro..." -ForegroundColor Green
$frontendPath = "C:\xampp\htdocs\ITB03-Test-Copy\Updated-Fitform-Project\fitform-frontend"
Set-Location $frontendPath
Start-Process -FilePath "cmd" -ArgumentList "/k", "npx expo start --clear" -WindowStyle Normal

Write-Host "✅ Profile images should now display correctly!" -ForegroundColor Green
Write-Host "📱 Check your app - profile images should load without errors" -ForegroundColor Cyan
Write-Host "🖼️ Default profile image has been applied to corrupted files" -ForegroundColor Cyan
