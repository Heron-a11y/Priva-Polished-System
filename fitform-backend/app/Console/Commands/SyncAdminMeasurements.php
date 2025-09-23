<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\MeasurementHistory;
use App\Models\AdminMeasurementHistory;
use App\Models\User;

class SyncAdminMeasurements extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'admin:sync-measurements {--force : Force sync even if measurements already exist}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Sync measurements from regular measurement history to admin measurement history for admin users';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('Starting admin measurement sync...');

        // Get all admin users
        $adminUsers = User::where('role', 'admin')->get();
        
        if ($adminUsers->isEmpty()) {
            $this->warn('No admin users found.');
            return;
        }

        $this->info("Found {$adminUsers->count()} admin users.");

        $totalSynced = 0;
        $totalSkipped = 0;

        foreach ($adminUsers as $admin) {
            $this->info("Processing measurements for admin: {$admin->name} (ID: {$admin->id})");

            // Get all measurements for this admin user
            $measurements = MeasurementHistory::where('user_id', $admin->id)->get();

            if ($measurements->isEmpty()) {
                $this->warn("  No measurements found for admin {$admin->name}");
                continue;
            }

            $this->info("  Found {$measurements->count()} measurements for admin {$admin->name}");

            foreach ($measurements as $measurement) {
                // Check if already exists in admin measurement history
                $exists = AdminMeasurementHistory::where('user_id', $measurement->user_id)
                    ->where('measurement_type', $measurement->measurement_type)
                    ->where('created_at', $measurement->created_at)
                    ->exists();

                if ($exists && !$this->option('force')) {
                    $totalSkipped++;
                    continue;
                }

                // Create or update admin measurement history entry
                AdminMeasurementHistory::updateOrCreate(
                    [
                        'user_id' => $measurement->user_id,
                        'measurement_type' => $measurement->measurement_type,
                        'created_at' => $measurement->created_at,
                    ],
                    [
                        'admin_id' => $admin->id,
                        'measurements' => $measurement->measurements,
                        'unit_system' => $measurement->unit_system,
                        'confidence_score' => $measurement->confidence_score,
                        'body_landmarks' => $measurement->body_landmarks,
                        'notes' => $measurement->notes,
                        'status' => 'active',
                        'updated_at' => $measurement->updated_at,
                    ]
                );

                $totalSynced++;
            }
        }

        $this->info("Sync completed!");
        $this->info("Total measurements synced: {$totalSynced}");
        $this->info("Total measurements skipped: {$totalSkipped}");

        // Show summary
        $totalAdminMeasurements = AdminMeasurementHistory::count();
        $this->info("Total admin measurements in database: {$totalAdminMeasurements}");

        return 0;
    }
}