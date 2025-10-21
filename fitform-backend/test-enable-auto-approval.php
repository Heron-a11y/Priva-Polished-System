<?php

/**
 * Test script to enable auto-approval and test the system
 */

require_once __DIR__ . '/vendor/autoload.php';

use App\Models\AdminSettings;
use App\Models\Appointment;
use Carbon\Carbon;

// Bootstrap Laravel
$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

echo "Testing Auto-Approval System - Enable and Test\n";
echo "==============================================\n\n";

// Get current settings
$settings = AdminSettings::getSettings();
echo "Current Settings:\n";
echo "- Auto-approve appointments: " . ($settings->auto_approve_appointments ? 'YES' : 'NO') . "\n";
echo "- Max appointments per day: " . $settings->max_appointments_per_day . "\n";
echo "- Business hours: " . $settings->business_start_time . " - " . $settings->business_end_time . "\n\n";

// Enable auto-approval
echo "Enabling auto-approval...\n";
$settings->auto_approve_appointments = true;
$settings->save();
echo "Auto-approval enabled!\n\n";

// Show pending appointments before processing
$pendingAppointments = Appointment::where('status', 'pending')->get();
echo "Pending appointments before processing: " . $pendingAppointments->count() . "\n";

if ($pendingAppointments->count() > 0) {
    echo "\nPending appointments:\n";
    foreach ($pendingAppointments as $appointment) {
        $appointmentDate = Carbon::parse($appointment->appointment_date);
        echo "- ID: {$appointment->id}, User: {$appointment->user_id}, Date: {$appointmentDate->format('Y-m-d H:i')}, Service: {$appointment->service_type}\n";
    }
}

// Run the processing command
echo "\nRunning appointment processing command...\n";
$output = shell_exec('php artisan appointments:process-pending 2>&1');
echo "Command output:\n";
echo $output . "\n";

// Check results after processing
$pendingAfter = Appointment::where('status', 'pending')->get();
$confirmedAfter = Appointment::where('status', 'confirmed')->get();
$cancelledAfter = Appointment::where('status', 'cancelled')->get();

echo "Results after processing:\n";
echo "- Pending: " . $pendingAfter->count() . "\n";
echo "- Confirmed: " . $confirmedAfter->count() . "\n";
echo "- Cancelled: " . $cancelledAfter->count() . "\n\n";

if ($confirmedAfter->count() > 0) {
    echo "Confirmed appointments:\n";
    foreach ($confirmedAfter as $appointment) {
        $appointmentDate = Carbon::parse($appointment->appointment_date);
        echo "- ID: {$appointment->id}, Date: {$appointmentDate->format('Y-m-d H:i')}, Service: {$appointment->service_type}\n";
    }
}

if ($cancelledAfter->count() > 0) {
    echo "\nCancelled appointments:\n";
    foreach ($cancelledAfter as $appointment) {
        $appointmentDate = Carbon::parse($appointment->appointment_date);
        echo "- ID: {$appointment->id}, Date: {$appointmentDate->format('Y-m-d H:i')}, Service: {$appointment->service_type}\n";
    }
}

echo "\nTest completed.\n";
