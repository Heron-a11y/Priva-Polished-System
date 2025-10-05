@echo off
echo 🧪 Running Network Connection Test...
echo.

echo 📡 Testing API connections to different IPs...
echo.

echo Testing 192.168.1.105:8000...
powershell -Command "try { $response = Invoke-WebRequest -Uri 'http://192.168.1.105:8000/api/test' -Method GET -Headers @{'Accept'='application/json'} -TimeoutSec 10; Write-Host '✅ SUCCESS: 192.168.1.105:8000' -ForegroundColor Green; Write-Host $response.Content } catch { Write-Host '❌ FAILED: 192.168.1.105:8000' -ForegroundColor Red; Write-Host $_.Exception.Message }"

echo.
echo Testing 192.168.1.104:8000...
powershell -Command "try { $response = Invoke-WebRequest -Uri 'http://192.168.1.104:8000/api/test' -Method GET -Headers @{'Accept'='application/json'} -TimeoutSec 10; Write-Host '✅ SUCCESS: 192.168.1.104:8000' -ForegroundColor Green; Write-Host $response.Content } catch { Write-Host '❌ FAILED: 192.168.1.104:8000' -ForegroundColor Red; Write-Host $_.Exception.Message }"

echo.
echo Testing localhost:8000...
powershell -Command "try { $response = Invoke-WebRequest -Uri 'http://localhost:8000/api/test' -Method GET -Headers @{'Accept'='application/json'} -TimeoutSec 10; Write-Host '✅ SUCCESS: localhost:8000' -ForegroundColor Green; Write-Host $response.Content } catch { Write-Host '❌ FAILED: localhost:8000' -ForegroundColor Red; Write-Host $_.Exception.Message }"

echo.
echo 🔍 Checking if backend is running on port 8000...
netstat -an | findstr :8000

echo.
echo 🔍 Checking if Metro is running on port 8081...
netstat -an | findstr :8081

echo.
echo 💡 If all tests failed, make sure your backend is running:
echo    cd fitform-backend && php artisan serve --host=0.0.0.0 --port=8000
echo.
pause
