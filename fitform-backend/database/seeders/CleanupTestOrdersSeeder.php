<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Rental;
use App\Models\Purchase;
use App\Models\User;

class CleanupTestOrdersSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $this->command->info('Cleaning up test orders for Prince Nuguid...');
        
        // Find the user "Prince Nuguid"
        $user = User::where('name', 'LIKE', '%Prince Nuguid%')
            ->orWhere('name', 'LIKE', '%Nuguid%')
            ->first();
        
        if (!$user) {
            $this->command->warn('User "Prince Nuguid" not found. Nothing to clean up.');
            return;
        }
        
        $this->command->info('Found user: ' . $user->name . ' (ID: ' . $user->id . ')');
        
        // Count orders before deletion
        $rentalCount = Rental::where('user_id', $user->id)->whereNull('deleted_at')->count();
        $purchaseCount = Purchase::where('user_id', $user->id)->whereNull('deleted_at')->count();
        
        $this->command->info("Found {$rentalCount} rental orders and {$purchaseCount} purchase orders.");
        
        // Delete rental orders (soft delete)
        $deletedRentals = Rental::where('user_id', $user->id)->whereNull('deleted_at')->delete();
        $this->command->info("Deleted {$deletedRentals} rental orders.");
        
        // Delete purchase orders (soft delete)
        $deletedPurchases = Purchase::where('user_id', $user->id)->whereNull('deleted_at')->delete();
        $this->command->info("Deleted {$deletedPurchases} purchase orders.");
        
        $this->command->info('Successfully cleaned up test orders for ' . $user->name);
    }
}

