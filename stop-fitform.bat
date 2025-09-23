@echo off
echo ========================================
echo Stopping FitForm Development Environment
echo ========================================

echo Stopping all FitForm processes...

REM Kill processes by window title
taskkill /f /fi "WINDOWTITLE eq FitForm Backend*" >nul 2>nul
taskkill /f /fi "WINDOWTITLE eq FitForm Ngrok*" >nul 2>nul
taskkill /f /fi "WINDOWTITLE eq FitForm Frontend*" >nul 2>nul

REM Kill processes by executable name
taskkill /f /im "php.exe" >nul 2>nul
taskkill /f /im "ngrok.exe" >nul 2>nul
taskkill /f /im "node.exe" >nul 2>nul

echo ✅ All FitForm processes stopped!
echo.
pause
