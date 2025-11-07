<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Purchase;
use App\Models\User;
use Carbon\Carbon;

class PurchaseOrderTestSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $this->command->info('Creating 30 purchase orders for Prince Nuguid...');
        
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
        $clothingTypes = ['Custom Suit', 'Wedding Dress', 'Formal Gown', 'Tuxedo', 'Blazer', 'Coat', 'Vest', 'Dress Shirt'];
        
        // Status options
        $statuses = ['pending', 'quotation_sent', 'counter_offer_pending', 'in_progress', 'ready_for_pickup', 'picked_up', 'declined'];
        
        // Create 30 purchase orders
        for ($i = 1; $i <= 30; $i++) {
            // Generate purchase dates - mix of past, present, and future dates
            $daysOffset = rand(-60, 90); // From 60 days ago to 90 days in the future
            $purchaseDate = Carbon::now()->addDays($daysOffset);
            
            // Random clothing type
            $clothingType = $clothingTypes[array_rand($clothingTypes)];
            
            // Random status (weighted towards pending and quotation_sent)
            $statusWeights = [
                'pending' => 30,
                'quotation_sent' => 25,
                'counter_offer_pending' => 15,
                'in_progress' => 10,
                'ready_for_pickup' => 10,
                'picked_up' => 8,
                'declined' => 2,
            ];
            $status = $this->weightedRandom($statusWeights);
            
            // Random measurements
            $measurements = [
                'height' => rand(160, 190),
                'chest' => rand(90, 110),
                'waist' => rand(80, 100),
                'hips' => rand(90, 110),
                'shoulders' => rand(40, 50),
                'inseam' => rand(70, 85),
                'armLength' => rand(60, 70),
                'neck' => rand(35, 42),
            ];
            
            // Random notes (sometimes empty)
            $notes = rand(0, 1) ? 'Test purchase order ' . $i . ' for pagination verification' : null;
            
            // Quotation price (if status requires it)
            $quotationPrice = null;
            if (in_array($status, ['quotation_sent', 'counter_offer_pending', 'in_progress', 'ready_for_pickup', 'picked_up'])) {
                $quotationPrice = rand(5000, 20000);
            }
            
            Purchase::create([
                'user_id' => $user->id,
                'item_name' => $clothingType . ' - Order #' . $i,
                'purchase_date' => $purchaseDate,
                'status' => $status,
                'clothing_type' => $clothingType,
                'measurements' => $measurements,
                'notes' => $notes,
                'customer_name' => $user->name,
                'customer_email' => $user->email,
                'quotation_price' => $quotationPrice,
            ]);
        }
        
        $this->command->info('Successfully created 30 purchase orders for ' . $user->name);
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

