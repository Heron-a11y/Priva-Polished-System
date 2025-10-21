<?php

/**
 * Test script for auto-approval functionality
 * Run this script to test the auto-approval system
 */

require_once __DIR__ . '/vendor/autoload.php';

use App\Models\Appointment;
use App\Models\AdminSettings;
use Carbon\Carbon;

// Bootstrap Laravel
$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

echo "Testing Auto-Approval System\n";
echo "============================\n\n";

// Get current settings
$settings = AdminSettings::getSettings();
echo "Current Settings:\n";
echo "- Auto-approve appointments: " . ($settings->auto_approve_appointments ? 'YES' : 'NO') . "\n";
echo "- Max appointments per day: " . $settings->max_appointments_per_day . "\n";
echo "- Business hours: " . $settings->business_start_time . " - " . $settings->business_end_time . "\n\n";

// Show pending appointments
$pendingAppointments = Appointment::where('status', 'pending')->get();
echo "Current pending appointments: " . $pendingAppointments->count() . "\n";

if ($pendingAppointments->count() > 0) {
    echo "\nPending appointments:\n";
    foreach ($pendingAppointments as $appointment) {
        $appointmentDate = Carbon::parse($appointment->appointment_date);
        echo "- ID: {$appointment->id}, User: {$appointment->user_id}, Date: {$appointmentDate->format('Y-m-d H:i')}, Service: {$appointment->service_type}\n";
    }
}

// Show today's appointments
$today = Carbon::now()->format('Y-m-d');
$todayAppointments = Appointment::whereDate('appointment_date', $today)
    ->where('status', '!=', 'cancelled')
    ->get();

echo "\nToday's appointments ({$today}): " . $todayAppointments->count() . "\n";
echo "Daily limit: " . $settings->max_appointments_per_day . "\n";

if ($todayAppointments->count() > 0) {
    echo "\nToday's appointments:\n";
    foreach ($todayAppointments as $appointment) {
        $appointmentDate = Carbon::parse($appointment->appointment_date);
        echo "- ID: {$appointment->id}, Status: {$appointment->status}, Time: {$appointmentDate->format('H:i')}\n";
    }
}

echo "\nTo toggle auto-approval, you can use the API endpoints:\n";
echo "- GET /api/admin/settings (get current settings)\n";
echo "- PUT /api/admin/settings (update settings)\n";
echo "- POST /api/admin/settings/toggle-auto-approval (toggle auto-approval)\n";

echo "\nTest completed.\n";





