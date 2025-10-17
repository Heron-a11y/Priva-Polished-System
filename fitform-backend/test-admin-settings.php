<?php

/**
 * Test script for admin settings functionality
 * Run this script to test the admin settings API
 */

require_once __DIR__ . '/vendor/autoload.php';

use App\Models\AdminSettings;

// Bootstrap Laravel
$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

echo "Testing Admin Settings\n";
echo "=====================\n\n";

// Get current settings
$settings = AdminSettings::getSettings();

echo "Current Admin Settings:\n";
echo "- Auto-approve appointments: " . ($settings->auto_approve_appointments ? 'YES' : 'NO') . "\n";
echo "- Max appointments per day: " . $settings->max_appointments_per_day . "\n";
echo "- Business start time: " . $settings->business_start_time . "\n";
echo "- Business end time: " . $settings->business_end_time . "\n\n";

echo "API Endpoints for Frontend:\n";
echo "- GET /api/admin/settings (get current settings)\n";
echo "- PUT /api/admin/settings (update all settings)\n";
echo "- POST /api/admin/settings/toggle-auto-approval (toggle auto-approval)\n\n";

echo "Frontend Integration:\n";
echo "- Toggle button added to ManageAppointmentsScreen.tsx\n";
echo "- Auto-approval conditions displayed in UI\n";
echo "- Real-time status updates\n\n";

echo "Test completed.\n";




