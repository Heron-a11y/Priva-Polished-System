<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\AdminMeasurementHistory;
use App\Models\User;
use Carbon\Carbon;

class AdminMeasurementHistorySeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $faker = \Faker\Factory::create();
        
        $this->command->info('Creating 30 admin measurement history records...');
        
        // Get customer users (or create some if none exist)
        $customers = User::where('role', 'customer')->get();
        
        if ($customers->isEmpty()) {
            $this->command->warn('No customers found. Creating 5 customers first...');
            for ($i = 1; $i <= 5; $i++) {
                User::create([
                    'name' => $faker->name(),
                    'email' => $faker->unique()->safeEmail(),
                    'password' => \Hash::make('password123'),
                    'role' => 'customer',
                    'phone' => $faker->phoneNumber(),
                    'account_status' => 'active',
                ]);
            }
            $customers = User::where('role', 'customer')->get();
        }
        
        // Get admin users (or create one if none exist)
        $admins = User::where('role', 'admin')->get();
        
        if ($admins->isEmpty()) {
            $this->command->warn('No admins found. Creating 1 admin first...');
            User::create([
                'name' => 'Admin User',
                'email' => 'admin@fitform.com',
                'password' => \Hash::make('password123'),
                'role' => 'admin',
                'account_status' => 'active',
            ]);
            $admins = User::where('role', 'admin')->get();
        }
        
        $measurementTypes = ['ar', 'manual'];
        $unitSystems = ['cm', 'inches', 'feet'];
        $statuses = ['active', 'archived', 'active', 'active']; // Mostly active, some archived
        
        // Common body measurement fields
        $measurementFields = [
            'chest', 'waist', 'hips', 'shoulder_width', 'arm_length',
            'leg_length', 'neck', 'thigh', 'bicep', 'wrist'
        ];
        
        for ($i = 1; $i <= 30; $i++) {
            $customer = $customers->random();
            $admin = $faker->optional(0.7)->randomElement($admins->toArray()); // 70% chance of having an admin
            $measurementType = $faker->randomElement($measurementTypes);
            $unitSystem = $faker->randomElement($unitSystems);
            $status = $faker->randomElement($statuses);
            
            // Generate measurements based on unit system
            $measurements = [];
            foreach ($measurementFields as $field) {
                switch ($unitSystem) {
                    case 'cm':
                        $measurements[$field] = $faker->numberBetween(30, 150);
                        break;
                    case 'inches':
                        $measurements[$field] = $faker->numberBetween(12, 60);
                        break;
                    case 'feet':
                        if (in_array($field, ['leg_length', 'arm_length'])) {
                            $measurements[$field] = [
                                'feet' => $faker->numberBetween(1, 6),
                                'inches' => $faker->numberBetween(0, 11)
                            ];
                        } else {
                            $measurements[$field] = $faker->numberBetween(12, 60);
                        }
                        break;
                }
            }
            
            // Generate body landmarks for AR measurements
            $bodyLandmarks = null;
            if ($measurementType === 'ar') {
                $bodyLandmarks = [
                    'shoulder_left' => ['x' => $faker->numberBetween(100, 200), 'y' => $faker->numberBetween(100, 200)],
                    'shoulder_right' => ['x' => $faker->numberBetween(300, 400), 'y' => $faker->numberBetween(100, 200)],
                    'waist_left' => ['x' => $faker->numberBetween(150, 250), 'y' => $faker->numberBetween(300, 400)],
                    'waist_right' => ['x' => $faker->numberBetween(250, 350), 'y' => $faker->numberBetween(300, 400)],
                ];
            }
            
            // Create measurement with varied dates (some older, some recent)
            $createdAt = $faker->dateTimeBetween('-3 months', 'now');
            
            // Some measurements may have been viewed or processed
            $viewedAt = $faker->optional(0.5)->dateTimeBetween($createdAt, 'now');
            $processedAt = $viewedAt ? $faker->optional(0.6)->dateTimeBetween($viewedAt, 'now') : null;
            
            AdminMeasurementHistory::create([
                'user_id' => $customer->id,
                'admin_id' => $admin ? $admin['id'] : null,
                'measurement_type' => $measurementType,
                'measurements' => $measurements,
                'unit_system' => $unitSystem,
                'confidence_score' => $measurementType === 'ar' ? $faker->numberBetween(75, 100) : null,
                'body_landmarks' => $bodyLandmarks,
                'notes' => $faker->optional(0.4)->sentence(), // 40% chance of having notes
                'status' => $status,
                'viewed_at' => $viewedAt,
                'processed_at' => $processedAt,
                'created_at' => $createdAt,
                'updated_at' => $createdAt,
            ]);
            
            if ($i % 10 === 0) {
                $this->command->info("Created {$i} admin measurement history records...");
            }
        }
        
        $this->command->info('✅ Successfully created 30 admin measurement history records!');
    }
}

