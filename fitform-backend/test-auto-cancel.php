<?php

/**
 * Test script for auto-cancellation of pending appointments
 * Run this script to test the functionality manually
 */

require_once __DIR__ . '/vendor/autoload.php';

use App\Models\Appointment;
use Carbon\Carbon;

// Bootstrap Laravel
$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

echo "Testing Auto-Cancellation of Pending Appointments\n";
echo "================================================\n\n";

// Show current pending appointments
$pendingAppointments = Appointment::where('status', 'pending')->get();

echo "Current pending appointments: " . $pendingAppointments->count() . "\n";

if ($pendingAppointments->count() > 0) {
    echo "\nPending appointments:\n";
    foreach ($pendingAppointments as $appointment) {
        $daysOld = Carbon::now()->diffInDays($appointment->created_at);
        echo "- ID: {$appointment->id}, User: {$appointment->user_id}, Created: {$appointment->created_at}, Days old: {$daysOld}\n";
    }
}

// Calculate cutoff date (2 days ago)
$cutoffDate = Carbon::now()->subDays(2);
echo "\nCutoff date (2 days ago): {$cutoffDate}\n";

// Find appointments that should be cancelled
$appointmentsToCancel = Appointment::where('status', 'pending')
    ->where('created_at', '<=', $cutoffDate)
    ->get();

echo "Appointments that would be cancelled: " . $appointmentsToCancel->count() . "\n";

if ($appointmentsToCancel->count() > 0) {
    echo "\nAppointments to be cancelled:\n";
    foreach ($appointmentsToCancel as $appointment) {
        $daysOld = Carbon::now()->diffInDays($appointment->created_at);
        echo "- ID: {$appointment->id}, User: {$appointment->user_id}, Created: {$appointment->created_at}, Days old: {$daysOld}\n";
    }
    
    echo "\nTo actually cancel these appointments, run:\n";
    echo "php artisan appointments:auto-cancel\n";
} else {
    echo "\nNo appointments need to be cancelled at this time.\n";
}

echo "\nTest completed.\n";



