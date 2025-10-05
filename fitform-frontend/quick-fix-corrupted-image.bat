@echo off
echo 🔧 Quick fix for corrupted profile image...
cd /d "C:\xampp\htdocs\ITB03-Test-Copy\Updated-Fitform-Project\fitform-backend"

echo Creating a valid default profile image...
echo ^<svg width="100" height="100" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg"^>^<rect width="100" height="100" fill="#F3F4F6"/^>^<circle cx="50" cy="40" r="15" fill="#9B9B9B"/^>^<path d="M20 80C20 65.6415 31.6415 54 46 54H54C68.3585 54 80 65.6415 80 80V100H20V80Z" fill="#9B9B9B"/^>^</svg^> > storage\app\public\profiles\profile_6_1759346676.jpg

echo.
echo ✅ Corrupted image file replaced with valid SVG image
echo 🚀 Now restart your backend and frontend
echo.
pause
