<?php

/**
 * Test script for first-come-first-served priority system
 * This demonstrates how the auto-approval system handles conflicts
 */

require_once __DIR__ . '/vendor/autoload.php';

use App\Models\Appointment;
use App\Models\AdminSettings;
use Carbon\Carbon;

// Bootstrap Laravel
$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

echo "Testing First-Come-First-Served Priority System\n";
echo "==============================================\n\n";

// Get current settings
$settings = AdminSettings::getSettings();
echo "Current Auto-Approval Settings:\n";
echo "- Auto-approve appointments: " . ($settings->auto_approve_appointments ? 'YES' : 'NO') . "\n";
echo "- Max appointments per day: " . $settings->max_appointments_per_day . "\n";
echo "- Business hours: " . $settings->business_start_time . " - " . $settings->business_end_time . "\n\n";

// Show today's appointments
$today = Carbon::now()->format('Y-m-d');
$todayAppointments = Appointment::whereDate('appointment_date', $today)
    ->orderBy('created_at', 'asc')
    ->get();

echo "Today's appointments ({$today}) - ordered by creation time:\n";
echo "Total: " . $todayAppointments->count() . "\n\n";

if ($todayAppointments->count() > 0) {
    foreach ($todayAppointments as $appointment) {
        $appointmentDate = Carbon::parse($appointment->appointment_date);
        $createdAt = Carbon::parse($appointment->created_at);
        echo "- ID: {$appointment->id}, Status: {$appointment->status}, Time: {$appointmentDate->format('H:i')}, Created: {$createdAt->format('H:i:s')}\n";
    }
}

// Check for potential conflicts
echo "\nAnalyzing time slot conflicts:\n";
$timeSlots = [];
foreach ($todayAppointments as $appointment) {
    $appointmentDate = Carbon::parse($appointment->appointment_date);
    $timeSlot = $appointmentDate->format('H:i');
    
    if (!isset($timeSlots[$timeSlot])) {
        $timeSlots[$timeSlot] = [];
    }
    $timeSlots[$timeSlot][] = $appointment;
}

foreach ($timeSlots as $timeSlot => $appointments) {
    if (count($appointments) > 1) {
        echo "⚠️  CONFLICT at {$timeSlot}: " . count($appointments) . " appointments\n";
        foreach ($appointments as $appointment) {
            $createdAt = Carbon::parse($appointment->created_at);
            echo "   - ID: {$appointment->id}, Status: {$appointment->status}, Created: {$createdAt->format('H:i:s')}\n";
        }
    }
}

echo "\nPriority System Rules:\n";
echo "1. First appointment created gets priority\n";
echo "2. Later appointments for same time slot are auto-cancelled\n";
echo "3. Only within business hours and daily limits\n";
echo "4. 15-minute buffer between appointments\n\n";

echo "Test completed.\n";




