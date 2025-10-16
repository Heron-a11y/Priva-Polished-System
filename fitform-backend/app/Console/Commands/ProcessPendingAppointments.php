<?php

namespace App\Console\Commands;

use App\Models\Appointment;
use App\Models\AdminSettings;
use Illuminate\Console\Command;
use Carbon\Carbon;
use Illuminate\Support\Facades\Log;

class ProcessPendingAppointments extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'appointments:process-pending';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Process existing pending appointments with auto-approval logic';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('Processing pending appointments with auto-approval logic...');
        
        $settings = AdminSettings::getSettings();
        
        // Check if auto-approval is enabled
        if (!$settings->auto_approve_appointments) {
            $this->info('Auto-approval is disabled. No pending appointments will be processed.');
            return Command::SUCCESS;
        }
        
        // Get all pending appointments
        $pendingAppointments = Appointment::where('status', 'pending')
            ->orderBy('created_at', 'asc') // Process in creation order (first-come-first-served)
            ->get();
        
        $processedCount = 0;
        $approvedCount = 0;
        $cancelledCount = 0;
        
        foreach ($pendingAppointments as $appointment) {
            $result = $this->processAppointment($appointment, $settings);
            $processedCount++;
            
            if ($result === 'approved') {
                $approvedCount++;
            } elseif ($result === 'cancelled') {
                $cancelledCount++;
            }
        }
        
        $this->info("Processed {$processedCount} pending appointments:");
        $this->info("- Approved: {$approvedCount}");
        $this->info("- Cancelled: {$cancelledCount}");
        $this->info("- Remaining pending: " . ($processedCount - $approvedCount - $cancelledCount));
        
        return Command::SUCCESS;
    }
    
    /**
     * Process a single appointment with auto-approval logic
     */
    private function processAppointment($appointment, $settings)
    {
        try {
            $appointmentDate = Carbon::parse($appointment->appointment_date);
            $appointmentDateOnly = $appointmentDate->format('Y-m-d');
            
            // Check if appointment is within business hours
            $appointmentTime = $appointmentDate->format('H:i');
            $businessStart = $settings->business_start_time->format('H:i');
            $businessEnd = $settings->business_end_time->format('H:i');
            
            if ($appointmentTime < $businessStart || $appointmentTime > $businessEnd) {
                Log::info('Pending appointment skipped: Outside business hours', [
                    'appointment_id' => $appointment->id,
                    'appointment_time' => $appointmentTime,
                    'business_hours' => "{$businessStart} - {$businessEnd}"
                ]);
                return 'skipped';
            }
            
            // Check for time slot conflicts with first-come-first-served priority
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
                // Check if this appointment was created before any conflicting ones
                $thisAppointmentCreatedAt = $appointment->created_at;
                $earliestConflictCreatedAt = $conflictingAppointments->first()->created_at;
                
                if ($thisAppointmentCreatedAt->gt($earliestConflictCreatedAt)) {
                    // This appointment was created later - cancel it
                    $appointment->update(['status' => 'cancelled']);
                    
                    Log::info('Pending appointment auto-cancelled: Time slot conflict (first-come-first-served)', [
                        'appointment_id' => $appointment->id,
                        'user_id' => $appointment->user_id,
                        'appointment_date' => $appointment->appointment_date,
                        'created_at' => $thisAppointmentCreatedAt,
                        'earliest_conflict_created_at' => $earliestConflictCreatedAt,
                        'reason' => 'Time slot already taken by earlier appointment'
                    ]);
                    return 'cancelled';
                } else {
                    // This appointment was created first - cancel the conflicting ones
                    foreach ($conflictingAppointments as $conflictingAppointment) {
                        if ($conflictingAppointment->status === 'pending') {
                            $conflictingAppointment->update(['status' => 'cancelled']);
                            
                            Log::info('Conflicting pending appointment auto-cancelled: First-come-first-served priority', [
                                'cancelled_appointment_id' => $conflictingAppointment->id,
                                'cancelled_user_id' => $conflictingAppointment->user_id,
                                'priority_appointment_id' => $appointment->id,
                                'priority_user_id' => $appointment->user_id,
                                'appointment_date' => $conflictingAppointment->appointment_date,
                                'reason' => 'Time slot taken by earlier appointment'
                            ]);
                        }
                    }
                }
            }
            
            // Check daily appointment limit
            $appointmentsToday = Appointment::whereDate('appointment_date', $appointmentDateOnly)
                ->where('status', '!=', 'cancelled')
                ->count();
            
            if ($appointmentsToday >= $settings->max_appointments_per_day) {
                Log::info('Pending appointment skipped: Daily limit reached', [
                    'appointment_id' => $appointment->id,
                    'appointments_today' => $appointmentsToday,
                    'max_appointments' => $settings->max_appointments_per_day
                ]);
                return 'skipped';
            }
            
            // All conditions met - approve the appointment
            $appointment->update(['status' => 'confirmed']);
            
            Log::info('Pending appointment auto-approved with first-come-first-served priority', [
                'appointment_id' => $appointment->id,
                'user_id' => $appointment->user_id,
                'appointment_date' => $appointment->appointment_date,
                'service_type' => $appointment->service_type,
                'created_at' => $appointment->created_at
            ]);
            
            return 'approved';
            
        } catch (\Exception $e) {
            Log::error('Error processing pending appointment', [
                'appointment_id' => $appointment->id,
                'error' => $e->getMessage()
            ]);
            return 'error';
        }
    }
}
