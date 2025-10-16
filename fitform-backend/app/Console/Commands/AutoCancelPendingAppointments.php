<?php

namespace App\Console\Commands;

use App\Models\Appointment;
use Illuminate\Console\Command;
use Carbon\Carbon;
use Illuminate\Support\Facades\Log;

class AutoCancelPendingAppointments extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'appointments:auto-cancel';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Automatically cancel pending appointments that have not been confirmed by admin for 2 days';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('Starting auto-cancellation of pending appointments...');
        
        // Calculate the cutoff date (2 days ago)
        $cutoffDate = Carbon::now()->subDays(2);
        
        // Find pending appointments created more than 2 days ago
        $pendingAppointments = Appointment::where('status', 'pending')
            ->where('created_at', '<=', $cutoffDate)
            ->get();
        
        $cancelledCount = 0;
        
        foreach ($pendingAppointments as $appointment) {
            // Update status to cancelled
            $appointment->update([
                'status' => 'cancelled'
            ]);
            
            $cancelledCount++;
            
            // Log the cancellation
            Log::info('Auto-cancelled appointment', [
                'appointment_id' => $appointment->id,
                'user_id' => $appointment->user_id,
                'appointment_date' => $appointment->appointment_date,
                'service_type' => $appointment->service_type,
                'created_at' => $appointment->created_at,
                'cancelled_at' => Carbon::now()
            ]);
            
            $this->line("Cancelled appointment ID: {$appointment->id} for user {$appointment->user_id}");
        }
        
        if ($cancelledCount > 0) {
            $this->info("Successfully cancelled {$cancelledCount} pending appointments.");
            Log::info("Auto-cancellation completed", [
                'cancelled_count' => $cancelledCount,
                'cutoff_date' => $cutoffDate
            ]);
        } else {
            $this->info('No pending appointments found that need to be cancelled.');
        }
        
        return Command::SUCCESS;
    }
}



