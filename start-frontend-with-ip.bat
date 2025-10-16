@echo off
echo Starting FitForm Frontend with IP Configuration
echo ===============================================
echo.
echo Current IP Address: 192.168.1.56
echo Backend URL: http://192.168.1.56:8000
echo Frontend URL: http://192.168.1.56:8081
echo.

cd fitform-frontend

echo Checking Node.js installation...
node --version
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not installed or not in PATH
    echo Please install Node.js and add it to your PATH
    pause
    exit /b 1
)

echo.
echo Checking npm installation...
npm --version
if %errorlevel% neq 0 (
    echo ERROR: npm is not installed or not in PATH
    echo Please install npm and add it to your PATH
    pause
    exit /b 1
)

echo.
echo Installing/Updating dependencies...
npm install

echo.
echo Starting Expo development server...
echo Server will be accessible at: http://192.168.1.56:8081
echo Press Ctrl+C to stop the server
echo.

npx expo start --host 192.168.1.56 --port 8081

pause
