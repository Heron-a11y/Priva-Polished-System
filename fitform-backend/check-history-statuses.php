<?php

require __DIR__.'/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

echo "=== Checking Order Statuses ===\n\n";

echo "Rentals:\n";
$rentals = \App\Models\Rental::select('id', 'user_id', 'status')->get();
foreach ($rentals as $rental) {
    echo "  ID {$rental->id} (User {$rental->user_id}): {$rental->status}\n";
}

echo "\nPurchases:\n";
$purchases = \App\Models\Purchase::select('id', 'user_id', 'status')->get();
foreach ($purchases as $purchase) {
    echo "  ID {$purchase->id} (User {$purchase->user_id}): {$purchase->status}\n";
}

echo "\nHistory:\n";
$history = \App\Models\RentalPurchaseHistory::select('id', 'user_id', 'order_type', 'status', 'order_id')->get();
foreach ($history as $h) {
    echo "  ID {$h->id} (User {$h->user_id}, Order ID: {$h->order_id}): {$h->order_type} - {$h->status}\n";
}

echo "\n=== Filter Check ===\n";
$user = \App\Models\User::where('email', 'like', '%prince%')->orWhere('name', 'like', '%prince%')->first();
if ($user) {
    echo "User found: {$user->name} (ID: {$user->id})\n";
    
    // Check what would be returned with current filter
    $query = \App\Models\RentalPurchaseHistory::where('user_id', $user->id);
    $query->where(function ($q) {
        $q->where(function ($rentalQuery) {
            $rentalQuery->where('order_type', 'rental')
                ->whereIn('status', ['cancelled', 'declined', 'returned']);
        })->orWhere(function ($purchaseQuery) {
            $purchaseQuery->where('order_type', 'purchase')
                ->whereIn('status', ['cancelled', 'declined', 'picked_up']);
        });
    });
    
    $filteredCount = $query->count();
    $totalCount = \App\Models\RentalPurchaseHistory::where('user_id', $user->id)->count();
    
    echo "Total history for user: {$totalCount}\n";
    echo "Filtered history (with status filter): {$filteredCount}\n";
    
    // Show all statuses for this user
    echo "\nAll statuses for this user:\n";
    $allHistory = \App\Models\RentalPurchaseHistory::where('user_id', $user->id)->get();
    foreach ($allHistory as $h) {
        echo "  {$h->order_type} ID {$h->order_id}: {$h->status}\n";
    }
}

