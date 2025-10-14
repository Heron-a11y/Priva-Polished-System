<?php

/**
 * Manual script to process existing pending appointments
 * Run this script to immediately process all pending appointments with auto-approval logic
 */

require_once __DIR__ . '/vendor/autoload.php';

use App\Models\Appointment;
use App\Models\AdminSettings;
use Carbon\Carbon;

// Bootstrap Laravel
$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

echo "Processing Existing Pending Appointments\n";
echo "=======================================\n\n";

// Get current settings
$settings = AdminSettings::getSettings();
echo "Current Auto-Approval Settings:\n";
echo "- Auto-approve appointments: " . ($settings->auto_approve_appointments ? 'YES' : 'NO') . "\n";
echo "- Max appointments per day: " . $settings->max_appointments_per_day . "\n";
echo "- Business hours: " . $settings->business_start_time . " - " . $settings->business_end_time . "\n\n";

if (!$settings->auto_approve_appointments) {
    echo "❌ Auto-approval is disabled. Enable it first in the admin interface.\n";
    exit;
}

// Get all pending appointments
$pendingAppointments = Appointment::where('status', 'pending')
    ->orderBy('created_at', 'asc')
    ->get();

echo "Found " . $pendingAppointments->count() . " pending appointments\n\n";

if ($pendingAppointments->count() === 0) {
    echo "No pending appointments to process.\n";
    exit;
}

$processedCount = 0;
$approvedCount = 0;
$cancelledCount = 0;
$skippedCount = 0;

foreach ($pendingAppointments as $appointment) {
    echo "Processing appointment ID: {$appointment->id} (User: {$appointment->user_id})\n";
    
    $result = processAppointment($appointment, $settings);
    $processedCount++;
    
    switch ($result) {
        case 'approved':
            $approvedCount++;
            echo "  ✅ APPROVED\n";
            break;
        case 'cancelled':
            $cancelledCount++;
            echo "  ❌ CANCELLED (time slot conflict)\n";
            break;
        case 'skipped':
            $skippedCount++;
            echo "  ⏭️  SKIPPED (outside business hours or daily limit)\n";
            break;
        default:
            echo "  ⚠️  ERROR\n";
    }
    echo "\n";
}

echo "Processing Complete!\n";
echo "===================\n";
echo "Total processed: {$processedCount}\n";
echo "Approved: {$approvedCount}\n";
echo "Cancelled: {$cancelledCount}\n";
echo "Skipped: {$skippedCount}\n";

function processAppointment($appointment, $settings) {
    try {
        $appointmentDate = Carbon::parse($appointment->appointment_date);
        $appointmentDateOnly = $appointmentDate->format('Y-m-d');
        
        // Check business hours
        $appointmentTime = $appointmentDate->format('H:i');
        $businessStart = $settings->business_start_time->format('H:i');
        $businessEnd = $settings->business_end_time->format('H:i');
        
        if ($appointmentTime < $businessStart || $appointmentTime > $businessEnd) {
            return 'skipped';
        }
        
        // Check for conflicts
        $appointmentStart = $appointmentDate->copy()->subMinutes(15);
        $appointmentEnd = $appointmentDate->copy()->addMinutes(15);
        
        $conflictingAppointments = Appointment::whereDate('appointment_date', $appointmentDateOnly)
            ->where('status', '!=', 'cancelled')
            ->where('id', '!=', $appointment->id)
            ->where(function ($query) use ($appointmentStart, $appointmentEnd) {
                $query->whereBetween('appointment_date', [$appointmentStart, $appointmentEnd]);
            })
            ->orderBy('created_at', 'asc')
            ->get();
        
        if ($conflictingAppointments->count() > 0) {
            $thisAppointmentCreatedAt = $appointment->created_at;
            $earliestConflictCreatedAt = $conflictingAppointments->first()->created_at;
            
            if ($thisAppointmentCreatedAt->gt($earliestConflictCreatedAt)) {
                // This appointment was created later - cancel it
                $appointment->update(['status' => 'cancelled']);
                return 'cancelled';
            } else {
                // This appointment was created first - cancel conflicting ones
                foreach ($conflictingAppointments as $conflictingAppointment) {
                    if ($conflictingAppointment->status === 'pending') {
                        $conflictingAppointment->update(['status' => 'cancelled']);
                    }
                }
            }
        }
        
        // Check daily limit
        $appointmentsToday = Appointment::whereDate('appointment_date', $appointmentDateOnly)
            ->where('status', '!=', 'cancelled')
            ->count();
        
        if ($appointmentsToday >= $settings->max_appointments_per_day) {
            return 'skipped';
        }
        
        // Approve the appointment
        $appointment->update(['status' => 'confirmed']);
        return 'approved';
        
    } catch (\Exception $e) {
        echo "Error processing appointment {$appointment->id}: " . $e->getMessage() . "\n";
        return 'error';
    }
}
