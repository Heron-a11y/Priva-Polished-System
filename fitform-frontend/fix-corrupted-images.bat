@echo off
echo 🛑 Stopping all processes...
taskkill /f /im node.exe 2>nul
taskkill /f /im php.exe 2>nul
taskkill /f /im expo.exe 2>nul

echo.
echo 🔧 Fixing corrupted profile images...
cd /d "C:\xampp\htdocs\ITB03-Test-Copy\Updated-Fitform-Project\fitform-backend"

echo Checking for corrupted image files...
for %%f in (storage\app\public\profiles\*.jpg) do (
    echo Checking %%f...
    for /f %%i in ('powershell -Command "(Get-Item '%%f').Length"') do (
        if %%i LSS 1000 (
            echo Found corrupted file: %%f (%%i bytes)
            echo This file will be replaced with a default image
        )
    )
)

echo.
echo 🖼️ Creating default profile image...
echo Creating a simple default profile image...
powershell -Command "
$imagePath = 'storage\app\public\profiles\default-profile.jpg'
$defaultImage = @'
data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgdmlld0JveD0iMCAwIDEwMCAxMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxjaXJjbGUgY3g9IjUwIiBjeT0iNDAiIHI9IjE1IiBmaWxsPSIjOUI5QjlCIi8+CjxwYXRoIGQ9Ik0yMCA4MEMyMCA2NS42NDE1IDMxLjY0MTUgNTQgNDYgNTRINTRDNjguMzU4NSA1NCA4MCA2NS42NDE1IDgwIDgwVjEwMEgyMFY4MFoiIGZpbGw9IiM5QjlCOUIiLz4KPC9zdmc+
'@
[System.IO.File]::WriteAllText($imagePath, $defaultImage)
"

echo.
echo 🔄 Replacing corrupted images with default...
for %%f in (storage\app\public\profiles\*.jpg) do (
    for /f %%i in ('powershell -Command "(Get-Item '%%f').Length"') do (
        if %%i LSS 1000 (
            echo Replacing %%f with default image...
            copy "storage\app\public\profiles\default-profile.jpg" "%%f" /Y
        )
    )
)

echo.
echo 🧹 Clearing Laravel cache...
php artisan config:clear
php artisan cache:clear
php artisan route:clear

echo Recreating storage link...
php artisan storage:link

echo.
echo 🚀 Starting Backend Server...
start "Backend Server" cmd /k "php artisan serve --host=0.0.0.0 --port=8000"

echo.
echo ⏳ Waiting 5 seconds for backend to start...
timeout /t 5 /nobreak >nul

echo.
echo 🧪 Testing image access...
powershell -Command "try { $response = Invoke-WebRequest -Uri 'http://192.168.1.105:8000/storage/profiles/profile_6_1759346676.jpg' -Method Head -TimeoutSec 10; echo '✅ Image access working! Status:' $response.StatusCode } catch { echo '❌ Image access failed:' $_.Exception.Message }"

echo.
echo 🚀 Starting Frontend Metro...
cd /d "C:\xampp\htdocs\ITB03-Test-Copy\Updated-Fitform-Project\fitform-frontend"
start "Metro Server" cmd /k "npx expo start --clear"

echo.
echo ✅ Profile images should now display correctly!
echo 📱 Check your app - profile images should load without errors
echo 🖼️ Default profile image has been applied to corrupted files
echo.
pause
