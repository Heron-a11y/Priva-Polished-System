<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Rental;
use App\Models\Purchase;
use App\Models\RentalPurchaseHistory;
use App\Models\Notification;
use Illuminate\Support\Facades\DB;

class CleanupTestOrdersSeeder extends Seeder
{
    /**
     * Run the database seeds.
     * Removes all test sample orders from rentals and purchases tables
     */
    public function run(): void
    {
        $this->command->info('🧹 Starting cleanup of test sample orders...');
        
        // Count before deletion
        $rentalCount = Rental::withTrashed()->count();
        $purchaseCount = Purchase::withTrashed()->count();
        $historyCount = RentalPurchaseHistory::count();
        
        $this->command->info("📊 Current counts:");
        $this->command->info("   - Rentals: {$rentalCount}");
        $this->command->info("   - Purchases: {$purchaseCount}");
        $this->command->info("   - History records: {$historyCount}");
        
        // Delete all rentals (including soft deleted)
        $this->command->info('🗑️  Deleting all rental orders...');
        $deletedRentals = Rental::withTrashed()->forceDelete();
        $this->command->info("   ✅ Deleted all rental orders");
        
        // Delete all purchases (including soft deleted)
        $this->command->info('🗑️  Deleting all purchase orders...');
        $deletedPurchases = Purchase::withTrashed()->forceDelete();
        $this->command->info("   ✅ Deleted all purchase orders");
        
        // Delete all rental/purchase history records
        $this->command->info('🗑️  Deleting all rental/purchase history records...');
        $deletedHistory = RentalPurchaseHistory::query()->delete();
        $this->command->info("   ✅ Deleted {$deletedHistory} history records");
        
        // Delete related notifications
        $this->command->info('🗑️  Deleting order-related notifications...');
        $deletedNotifications = Notification::whereNotNull('order_id')
            ->where(function($query) {
                $query->where('order_type', 'Rental')
                      ->orWhere('order_type', 'Purchase');
            })
            ->delete();
        $this->command->info("   ✅ Deleted {$deletedNotifications} order-related notifications");
        
        // Count after deletion
        $rentalCountAfter = Rental::withTrashed()->count();
        $purchaseCountAfter = Purchase::withTrashed()->count();
        $historyCountAfter = RentalPurchaseHistory::count();
        
        $this->command->info("📊 Final counts:");
        $this->command->info("   - Rentals: {$rentalCountAfter}");
        $this->command->info("   - Purchases: {$purchaseCountAfter}");
        $this->command->info("   - History records: {$historyCountAfter}");
        
        $this->command->info('✅ Cleanup completed successfully!');
        $this->command->info("   - Removed {$rentalCount} rental orders");
        $this->command->info("   - Removed {$purchaseCount} purchase orders");
        $this->command->info("   - Removed {$historyCount} history records");
        $this->command->info("   - Removed {$deletedNotifications} notifications");
    }
}

