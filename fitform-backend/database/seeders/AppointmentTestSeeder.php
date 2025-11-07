<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Appointment;
use App\Models\User;
use Carbon\Carbon;

class AppointmentTestSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $this->command->info('Creating 30 appointments for Prince Nuguid...');
        
        // Find the user "Prince Nuguid"
        $user = User::where('name', 'LIKE', '%Prince Nuguid%')
            ->orWhere('name', 'LIKE', '%Nuguid%')
            ->first();
        
        if (!$user) {
            $this->command->error('User "Prince Nuguid" not found. Creating user first...');
            
            // Create the user if it doesn't exist
            $user = User::firstOrCreate(
                ['email' => 'prince.nuguid@example.com'],
                [
                    'name' => 'Prince Nuguid',
                    'password' => \Hash::make('password123'),
                    'role' => 'customer',
                ]
            );
            
            $this->command->info('Created user: ' . $user->name);
        } else {
            $this->command->info('Found user: ' . $user->name . ' (ID: ' . $user->id . ')');
        }
        
        // Service types available
        $serviceTypes = ['measurement', 'consultation', 'fitting', 'alteration'];
        
        // Status options
        $statuses = ['pending', 'confirmed', 'cancelled', 'completed'];
        
        // Create 30 appointments
        for ($i = 1; $i <= 30; $i++) {
            // Generate appointment dates - mix of past, present, and future dates
            $daysOffset = rand(-30, 60); // From 30 days ago to 60 days in the future
            $appointmentDateTime = Carbon::now()->addDays($daysOffset);
            
            // Set random time between 10:00 AM and 7:00 PM (business hours)
            $hour = rand(10, 19);
            $minute = rand(0, 1) * 30; // Either :00 or :30
            $appointmentDateTime->setTime($hour, $minute, 0);
            
            // Random service type
            $serviceType = $serviceTypes[array_rand($serviceTypes)];
            
            // Random status (weighted towards pending and confirmed)
            $statusWeights = [
                'pending' => 30,
                'confirmed' => 40,
                'cancelled' => 20,
                'completed' => 10,
            ];
            $status = $this->weightedRandom($statusWeights);
            
            // Random notes (sometimes empty)
            $notes = rand(0, 1) ? 'Test appointment ' . $i . ' for pagination verification' : null;
            
            Appointment::create([
                'user_id' => $user->id,
                'appointment_date' => $appointmentDateTime,
                'service_type' => $serviceType,
                'status' => $status,
                'notes' => $notes,
            ]);
        }
        
        $this->command->info('Successfully created 30 appointments for ' . $user->name);
    }
    
    /**
     * Weighted random selection
     */
    private function weightedRandom(array $weights): string
    {
        $total = array_sum($weights);
        $random = rand(1, $total);
        
        $current = 0;
        foreach ($weights as $key => $weight) {
            $current += $weight;
            if ($random <= $current) {
                return $key;
            }
        }
        
        return array_key_first($weights);
    }
}

