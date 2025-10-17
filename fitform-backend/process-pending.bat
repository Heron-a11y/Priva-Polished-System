@echo off
echo Processing existing pending appointments...
echo =========================================

cd /d "%~dp0"

php process-existing-pending.php

echo.
echo Processing completed.
pause




