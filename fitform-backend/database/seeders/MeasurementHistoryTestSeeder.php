<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\MeasurementHistory;
use App\Models\User;
use Carbon\Carbon;

class MeasurementHistoryTestSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $faker = \Faker\Factory::create();
        
        $this->command->info('Creating 30 measurement history records for Prince Nuguid...');
        
        // Find the user "Prince Nuguid"
        $user = User::where('name', 'LIKE', '%Prince Nuguid%')
            ->orWhere('name', 'LIKE', '%Nuguid%')
            ->orWhere('email', 'prince@gmail.com')
            ->first();
        
        if (!$user) {
            $this->command->error('User "Prince Nuguid" not found. Creating user first...');
            
            // Create the user if it doesn't exist
            $user = User::firstOrCreate(
                ['email' => 'prince@gmail.com'],
                [
                    'name' => 'Prince Nuguid',
                    'password' => \Hash::make('password123'),
                    'role' => 'customer',
                    'account_status' => 'active',
                ]
            );
            
            $this->command->info('Created user: ' . $user->name);
        } else {
            $this->command->info('Found user: ' . $user->name . ' (ID: ' . $user->id . ')');
        }
        
        $measurementTypes = ['ar', 'manual'];
        $unitSystems = ['cm', 'inches', 'feet'];
        
        // Common body measurement fields
        $measurementFields = [
            'chest', 'waist', 'hips', 'shoulder_width', 'arm_length',
            'leg_length', 'neck', 'thigh', 'bicep', 'wrist'
        ];
        
        for ($i = 1; $i <= 30; $i++) {
            $measurementType = $faker->randomElement($measurementTypes);
            $unitSystem = $faker->randomElement($unitSystems);
            
            // Generate realistic measurements based on unit system
            $measurements = [];
            foreach ($measurementFields as $field) {
                switch ($unitSystem) {
                    case 'cm':
                        $measurements[$field] = $faker->numberBetween(30, 120);
                        break;
                    case 'inches':
                        $measurements[$field] = $faker->randomFloat(1, 12, 48);
                        break;
                    case 'feet':
                        if (in_array($field, ['leg_length', 'arm_length'])) {
                            $measurements[$field] = [
                                'feet' => $faker->numberBetween(1, 6),
                                'inches' => $faker->numberBetween(0, 11)
                            ];
                        } else {
                            $measurements[$field] = $faker->randomFloat(1, 1, 4);
                        }
                        break;
                }
            }
            
            // Generate body landmarks for AR measurements
            $bodyLandmarks = null;
            if ($measurementType === 'ar') {
                $bodyLandmarks = [
                    'shoulder_left' => ['x' => $faker->numberBetween(100, 200), 'y' => $faker->numberBetween(100, 300)],
                    'shoulder_right' => ['x' => $faker->numberBetween(300, 400), 'y' => $faker->numberBetween(100, 300)],
                    'waist_left' => ['x' => $faker->numberBetween(150, 250), 'y' => $faker->numberBetween(400, 500)],
                    'waist_right' => ['x' => $faker->numberBetween(250, 350), 'y' => $faker->numberBetween(400, 500)],
                ];
            }
            
            // Create measurement with varied dates (some older, some recent)
            $createdAt = $faker->dateTimeBetween('-3 months', 'now');
            
            MeasurementHistory::create([
                'user_id' => $user->id,
                'measurement_type' => $measurementType,
                'measurements' => $measurements,
                'unit_system' => $unitSystem,
                'confidence_score' => $measurementType === 'ar' ? $faker->numberBetween(75, 100) : null,
                'body_landmarks' => $bodyLandmarks,
                'notes' => $faker->optional(0.4)->sentence(), // 40% chance of having notes
                'created_at' => $createdAt,
                'updated_at' => $createdAt,
            ]);
            
            if ($i % 10 === 0) {
                $this->command->info("Created {$i} measurement history records...");
            }
        }
        
        $this->command->info('✅ Successfully created 30 measurement history records for Prince Nuguid!');
    }
}

