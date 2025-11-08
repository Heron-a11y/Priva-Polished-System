<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\RentalPurchaseHistory;
use App\Models\Rental;
use App\Models\Purchase;
use App\Models\CatalogItem;
use Illuminate\Support\Facades\Log;

class RentalPurchaseHistoryController extends PaginatedController
{
    /**
     * Get paginated rental and purchase history
     */
    public function index(Request $request)
    {
        try {
            $user = $request->user();
            
            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'User not authenticated',
                    'data' => []
                ], 401);
            }
            
            Log::info('RentalPurchaseHistory::index - User ID: ' . $user->id . ', Role: ' . ($user->role ?? 'none'));
            
            // Build base query for history
            $query = RentalPurchaseHistory::query();
            
            // Apply user-specific filtering
            if ($user && isset($user->role) && $user->role === 'admin') {
                // Admin can see all history - no status filtering for admin
                // Admin can see all orders regardless of status
            } else {
                // Regular users can only see their own history
                $query->where('user_id', $user->id);
            
                // Apply status filter from request if provided
                $statusFilter = $request->input('filters.status');
                if ($statusFilter && $statusFilter !== 'all') {
                    // If a specific status filter is provided, use it
                    $query->where('status', $statusFilter);
                } else {
                    // When status filter is 'all' or not provided, apply default filtering:
                    // - For rentals: show only "returned", "declined", and "cancelled"
                    // - For purchases: show only "picked_up", "declined", and "cancelled"
                    $query->where(function ($q) {
                        $q->where(function ($rentalQuery) {
                            $rentalQuery->where('order_type', 'rental')
                                ->whereIn('status', ['returned', 'declined', 'cancelled']);
                        })->orWhere(function ($purchaseQuery) {
                            $purchaseQuery->where('order_type', 'purchase')
                                ->whereIn('status', ['picked_up', 'declined', 'cancelled']);
                        });
                    });
                }
            }
            
            // Configure pagination options
            $options = [
                'search_fields' => ['item_name', 'customer_name', 'customer_email', 'clothing_type', 'notes'],
                'filter_fields' => ['order_type', 'status', 'clothing_type', 'user_id'],
                'sort_fields' => ['created_at', 'order_date', 'status', 'item_name'],
                'default_per_page' => 10,
                'max_per_page' => 100,
                'transform' => function ($historyItem) {
                    // Get the original order to fetch image information
                    $originalOrder = null;
                    if ($historyItem->order_id) {
                        if ($historyItem->order_type === 'rental') {
                            $originalOrder = Rental::find($historyItem->order_id);
                        } elseif ($historyItem->order_type === 'purchase') {
                            $originalOrder = Purchase::find($historyItem->order_id);
                        }
                    }
                    
                    // Add image URL if available
                    if ($originalOrder && isset($originalOrder->image_url) && $originalOrder->image_url) {
                        $historyItem->image_url = $originalOrder->image_url;
                    } else {
                        // Try to get image from catalog based on clothing type
                        if ($historyItem->clothing_type) {
                            $catalogItem = CatalogItem::where('clothing_type', $historyItem->clothing_type)->first();
                            if ($catalogItem && isset($catalogItem->image_url) && $catalogItem->image_url) {
                                $historyItem->image_url = $catalogItem->image_url;
                            }
                        }
                    }
                    
                    // Ensure measurements are included in the response
                    if (!isset($historyItem->measurements)) {
                        $historyItem->measurements = $historyItem->measurements ?? null;
                    }
                    
                    return $historyItem;
                }
            ];
            
            $result = $this->paginate($query, $request, $options);
            
            // Log query count before pagination
            $queryCount = $query->count();
            Log::info('RentalPurchaseHistory::index - Query result count before pagination: ' . $queryCount);
            
            return $result;
            
        } catch (\Exception $e) {
            Log::error('RentalPurchaseHistory::index - Error: ' . $e->getMessage());
            Log::error('RentalPurchaseHistory::index - Stack trace: ' . $e->getTraceAsString());
            
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