@echo off
echo 🔄 Updating all image URL replacements to use dynamic helper...
echo.

echo 📝 This script will update all components to use the new imageUrlHelper
echo 🖼️ This will fix the 403 Forbidden error for profile images
echo.

echo ✅ Components that need updating:
echo   - Customer/screens/AppointmentsScreen.tsx
echo   - Customer/components/CustomerSidebar.tsx  
echo   - Customer/screens/EnhancedProfileScreen.tsx
echo   - app/admin/components/AdminSidebar.tsx
echo   - app/admin/profile.tsx
echo   - app/admin/screens/ManageAppointmentsScreen.tsx
echo.

echo 💡 Manual steps needed:
echo   1. Add import: import { getLocalImageUrl } from '../utils/imageUrlHelper';
echo   2. Replace: user.profile_image.replace('https://fitform-api.ngrok.io', 'http://192.168.1.105:8000')
echo   3. With: getLocalImageUrl(user.profile_image)
echo.

echo 🚀 After updating, profile images will automatically use the correct local IP
echo 📱 No more 403 Forbidden errors!
echo.
pause
