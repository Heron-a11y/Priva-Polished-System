<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\RentalPurchaseHistory;
use App\Models\Rental;
use App\Models\Purchase;
use App\Models\CatalogItem;

class RentalPurchaseHistoryController extends PaginatedController
{
    /**
     * Get paginated rental and purchase history
     */
    public function index(Request $request)
    {
        try {
            $user = $request->user();
            
            // Build base query for history
            $query = RentalPurchaseHistory::query();
            
            // Apply user-specific filtering
            if ($user && isset($user->role) && $user->role === 'admin') {
                // Admin can see all history
            } else {
                // Regular users can only see their own history
                $query->where('user_id', $user->id);
            }
            
            // Filter by specific statuses based on order type
            $query->where(function ($q) {
                $q->where(function ($rentalQuery) {
                    // For rentals: show only cancelled, declined, returned
                    $rentalQuery->where('order_type', 'rental')
                        ->whereIn('status', ['cancelled', 'declined', 'returned']);
                })->orWhere(function ($purchaseQuery) {
                    // For purchases: show only cancelled, declined, picked_up
                    $purchaseQuery->where('order_type', 'purchase')
                        ->whereIn('status', ['cancelled', 'declined', 'picked_up']);
                });
            });
            
            // Configure pagination options
            $options = [
                'search_fields' => ['item_name', 'customer_name', 'customer_email', 'clothing_type', 'notes'],
                'filter_fields' => ['order_type', 'status', 'clothing_type', 'user_id'],
                'sort_fields' => ['created_at', 'order_date', 'status', 'item_name'],
                'default_per_page' => 20,
                'max_per_page' => 100,
                'transform' => function ($historyItem) {
                    // Get the original order to fetch image information
                    $originalOrder = null;
                    if ($historyItem->order_type === 'rental') {
                        $originalOrder = Rental::find($historyItem->order_id);
                    } elseif ($historyItem->order_type === 'purchase') {
                        $originalOrder = Purchase::find($historyItem->order_id);
                    }
                    
                    // Add image URL if available
                    if ($originalOrder && $originalOrder->image_url) {
                        $historyItem->image_url = $originalOrder->image_url;
                    } else {
                        // Try to get image from catalog based on clothing type
                        $catalogItem = CatalogItem::where('clothing_type', $historyItem->clothing_type)->first();
                        if ($catalogItem && $catalogItem->image_url) {
                            $historyItem->image_url = $catalogItem->image_url;
                        }
                    }
                    
                    return $historyItem;
                }
            ];
            
            return $this->paginate($query, $request, $options);
            
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch history',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Delete a history item
     */
    public function destroy(Request $request, $id)
    {
        try {
            $user = $request->user();
            $historyItem = RentalPurchaseHistory::findOrFail($id);
            
            // Check permissions
            if ($user->role !== 'admin' && $historyItem->user_id !== $user->id) {
                return response()->json(['error' => 'Unauthorized'], 403);
            }
            
            // Delete the history item
            $historyItem->delete();
            
            return response()->json([
                'success' => true,
                'message' => 'History item deleted successfully'
            ]);
            
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to delete history item',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get statistics for history
     */
    public function getStats(Request $request)
    {
        try {
            $user = $request->user();
            
            $query = RentalPurchaseHistory::query();
            
            // Apply user-specific filtering
            if ($user && isset($user->role) && $user->role === 'admin') {
                // Admin can see all stats
            } else {
                // Regular users can only see their own stats
                $query->where('user_id', $user->id);
            }
            
            // Filter by specific statuses based on order type
            $query->where(function ($q) {
                $q->where(function ($rentalQuery) {
                    // For rentals: show only cancelled, declined, returned
                    $rentalQuery->where('order_type', 'rental')
                        ->whereIn('status', ['cancelled', 'declined', 'returned']);
                })->orWhere(function ($purchaseQuery) {
                    // For purchases: show only cancelled, declined, picked_up
                    $purchaseQuery->where('order_type', 'purchase')
                        ->whereIn('status', ['cancelled', 'declined', 'picked_up']);
                });
            });
            
            $totalItems = $query->count();
            $rentalCount = $query->where('order_type', 'rental')->count();
            $purchaseCount = $query->where('order_type', 'purchase')->count();
            
            $statusCounts = $query->selectRaw('status, COUNT(*) as count')
                ->groupBy('status')
                ->pluck('count', 'status')
                ->toArray();
            
            return response()->json([
                'success' => true,
                'stats' => [
                    'total_items' => $totalItems,
                    'rental_count' => $rentalCount,
                    'purchase_count' => $purchaseCount,
                    'status_counts' => $statusCounts
                ]
            ]);
            
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch statistics',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}