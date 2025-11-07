<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Rental;
use App\Models\User;
use Carbon\Carbon;

class RentalOrderTestSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $this->command->info('Creating 29 rental orders for Prince Nuguid...');
        
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
        
        // Clothing types available
        $clothingTypes = ['Suit', 'Tuxedo', 'Formal Shirt', 'Dress Shirt', 'Blazer', 'Coat', 'Vest'];
        
        // Status options (valid statuses from migration)
        $statuses = ['pending', 'quotation_sent', 'counter_offer_pending', 'in_progress', 'ready_for_pickup', 'picked_up', 'returned', 'declined', 'cancelled'];
        
        // Create 29 rental orders
        for ($i = 1; $i <= 29; $i++) {
            // Generate rental dates - mix of past, present, and future dates
            $daysOffset = rand(-60, 90); // From 60 days ago to 90 days in the future
            $rentalDate = Carbon::now()->addDays($daysOffset);
            
            // Return date is 5 days after rental date
            $returnDate = $rentalDate->copy()->addDays(5);
            
            // Random clothing type
            $clothingType = $clothingTypes[array_rand($clothingTypes)];
            
            // Random status (weighted towards pending and quotation_sent)
            $statusWeights = [
                'pending' => 25,
                'quotation_sent' => 20,
                'counter_offer_pending' => 15,
                'in_progress' => 10,
                'ready_for_pickup' => 10,
                'picked_up' => 10,
                'returned' => 5,
                'declined' => 3,
                'cancelled' => 2,
            ];
            $status = $this->weightedRandom($statusWeights);
            
            // Random measurements
            $measurements = [
                'bust' => rand(90, 110),
                'waist' => rand(80, 100),
                'hips' => rand(90, 110),
                'shoulder_width' => rand(40, 50),
                'arm_length' => rand(60, 70),
                'inseam' => rand(70, 85),
            ];
            
            // Random notes (sometimes empty)
            $notes = rand(0, 1) ? 'Test rental order ' . $i . ' for pagination verification' : null;
            
            // Quotation amount (if status requires it)
            $quotationAmount = null;
            if (in_array($status, ['quotation_sent', 'counter_offer_pending', 'in_progress', 'ready_for_pickup', 'picked_up', 'returned'])) {
                $quotationAmount = rand(2000, 8000);
            }
            
            Rental::create([
                'user_id' => $user->id,
                'item_name' => $clothingType . ' Rental - Order #' . $i,
                'rental_date' => $rentalDate,
                'return_date' => $returnDate,
                'status' => $status,
                'clothing_type' => $clothingType,
                'measurements' => $measurements,
                'notes' => $notes,
                'customer_name' => $user->name,
                'customer_email' => $user->email,
                'quotation_amount' => $quotationAmount,
                'quotation_status' => $quotationAmount ? 'quoted' : 'pending',
                'agreement_accepted' => in_array($status, ['in_progress', 'ready_for_pickup', 'picked_up', 'returned']),
                'agreement_accepted_at' => in_array($status, ['in_progress', 'ready_for_pickup', 'picked_up', 'returned']) ? now() : null,
            ]);
        }
        
        $this->command->info('Successfully created 29 rental orders for ' . $user->name);
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

