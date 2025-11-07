<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Order;
use App\Models\User;
use App\Models\Rental;
use App\Models\Purchase;
use App\Http\Controllers\PaginatedController;

class OrderController extends PaginatedController
{
    /**
     * Generate orders report
     */
    public function generateReport()
    {
        try {
            // Get all rentals and purchases with customer information
            $rentals = \App\Models\Rental::with('user')->get();
            $purchases = \App\Models\Purchase::with('user')->get();
            
            // Combine rentals and purchases into orders array
            $allOrders = collect();
            
            // Add rentals as orders
            foreach ($rentals as $rental) {
                $allOrders->push((object)[
                    'id' => $rental->id,
                    'order_type' => 'Rental',
                    'customer_name' => $rental->user->name ?? 'Unknown',
                    'customer_email' => $rental->user->email ?? 'Unknown',
                    'status' => $rental->status,
                    'total_amount' => $rental->quotation_amount ?? 0,
                    'created_at' => $rental->created_at,
                    'updated_at' => $rental->updated_at,
                    'clothing_type' => $rental->clothing_type ?? 'N/A',
                    'notes' => $rental->notes ?? '',
                ]);
            }
            
            // Add purchases as orders
            foreach ($purchases as $purchase) {
                $allOrders->push((object)[
                    'id' => $purchase->id,
                    'order_type' => 'Purchase',
                    'customer_name' => $purchase->user->name ?? 'Unknown',
                    'customer_email' => $purchase->user->email ?? 'Unknown',
                    'status' => $purchase->status,
                    'total_amount' => $purchase->quotation_price ?? 0,
                    'created_at' => $purchase->created_at,
                    'updated_at' => $purchase->updated_at,
                    'clothing_type' => $purchase->clothing_type ?? 'N/A',
                    'notes' => $purchase->notes ?? '',
                ]);
            }
            
            // Calculate statistics
            $totalOrders = $allOrders->count();
            $pendingOrders = $allOrders->where('status', 'pending')->count();
            $completedOrders = $allOrders->whereIn('status', ['returned', 'picked_up'])->count();
            $cancelledOrders = $allOrders->where('status', 'cancelled')->count();
            $totalRevenue = $allOrders->whereIn('status', ['returned', 'picked_up'])->sum('total_amount');
            
            // Calculate by type
            $rentalCount = $rentals->count();
            $purchaseCount = $purchases->count();
            $rentalRevenue = $rentals->where('status', 'returned')->sum('quotation_amount');
            $purchaseRevenue = $purchases->where('status', 'picked_up')->sum('quotation_price');
            
            // Prepare data for the PDF
            $reportData = [
                'orders' => $allOrders,
                'rentals' => $rentals,
                'purchases' => $purchases,
                'stats' => [
                    'total_orders' => $totalOrders,
                    'pending_orders' => $pendingOrders,
                    'completed_orders' => $completedOrders,
                    'cancelled_orders' => $cancelledOrders,
                    'total_revenue' => $totalRevenue,
                    'rental_count' => $rentalCount,
                    'purchase_count' => $purchaseCount,
                    'rental_revenue' => $rentalRevenue,
                    'purchase_revenue' => $purchaseRevenue,
                ],
                'generated_at' => now(),
            ];
            
            // Generate PDF using the view
            $pdf = \Barryvdh\DomPDF\Facade\Pdf::loadView('admin.orders-report', $reportData);
            
            // Return the PDF as a download
            return $pdf->download("orders-report-" . now()->format('Y-m-d') . ".pdf");
            
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to generate report',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get all orders (rentals + purchases) with pagination for admin
     */
    public function index(Request $request)
    {
        try {
            // Build queries for rentals and purchases
            $rentalsQuery = Rental::with('user');
            $purchasesQuery = Purchase::with('user');
            
            // Apply search filter
            if ($request->has('search') && !empty($request->search)) {
                $search = $request->search;
                $rentalsQuery->where(function ($q) use ($search) {
                    $q->where('item_name', 'like', "%{$search}%")
                      ->orWhere('notes', 'like', "%{$search}%")
                      ->orWhereHas('user', function ($userQuery) use ($search) {
                          $userQuery->where('name', 'like', "%{$search}%")
                                    ->orWhere('email', 'like', "%{$search}%");
                      });
                });
                
                $purchasesQuery->where(function ($q) use ($search) {
                    $q->where('item_name', 'like', "%{$search}%")
                      ->orWhere('notes', 'like', "%{$search}%")
                      ->orWhereHas('user', function ($userQuery) use ($search) {
                          $userQuery->where('name', 'like', "%{$search}%")
                                    ->orWhere('email', 'like', "%{$search}%");
                      });
                });
            }
            
            // Apply type filter
            if ($request->has('filters') && isset($request->filters['order_type'])) {
                $orderType = $request->filters['order_type'];
                if ($orderType === 'rental') {
                    $purchasesQuery->whereRaw('1 = 0'); // Exclude purchases
                } elseif ($orderType === 'purchase') {
                    $rentalsQuery->whereRaw('1 = 0'); // Exclude rentals
                }
            }
            
            // Apply status filter
            if ($request->has('filters') && isset($request->filters['status'])) {
                $status = $request->filters['status'];
                $rentalsQuery->where('status', $status);
                $purchasesQuery->where('status', $status);
            }
            
            // Get pagination parameters
            $perPage = min($request->get('per_page', 10), 100);
            $page = $request->get('page', 1);
            
            // Get rentals and purchases separately
            $rentals = $rentalsQuery->orderBy('created_at', 'desc')->get();
            $purchases = $purchasesQuery->orderBy('created_at', 'desc')->get();
            
            // Debug: Log counts
            \Log::info('OrderController: Rentals count = ' . $rentals->count() . ', Purchases count = ' . $purchases->count());
            
            // Combine and transform
            $allOrders = collect();
            
            foreach ($rentals as $rental) {
                $allOrders->push([
                    'id' => $rental->id,
                    'order_type' => 'rental',
                    'order_id' => $rental->id,
                    'user_id' => $rental->user_id,
                    'item_name' => $rental->item_name,
                    'customer_name' => $rental->customer_name ?? $rental->user->name ?? 'Unknown',
                    'customer_email' => $rental->customer_email ?? $rental->user->email ?? 'Unknown',
                    'status' => $rental->status,
                    'clothing_type' => $rental->clothing_type,
                    'order_date' => $rental->rental_date,
                    'return_date' => $rental->return_date,
                    'quotation_amount' => $rental->quotation_amount,
                    'quotation_price' => null,
                    'quotation_notes' => $rental->quotation_notes,
                    'quotation_schedule' => $rental->quotation_schedule,
                    'penalty_status' => $rental->penalty_status,
                    'counter_offer_amount' => $rental->counter_offer_amount,
                    'counter_offer_notes' => $rental->counter_offer_notes,
                    'counter_offer_status' => $rental->counter_offer_status,
                    'notes' => $rental->notes,
                    'created_at' => $rental->created_at,
                    'updated_at' => $rental->updated_at,
                ]);
            }
            
            foreach ($purchases as $purchase) {
                $allOrders->push([
                    'id' => $purchase->id,
                    'order_type' => 'purchase',
                    'order_id' => $purchase->id,
                    'user_id' => $purchase->user_id,
                    'item_name' => $purchase->item_name,
                    'customer_name' => $purchase->customer_name ?? $purchase->user->name ?? 'Unknown',
                    'customer_email' => $purchase->customer_email ?? $purchase->user->email ?? 'Unknown',
                    'status' => $purchase->status,
                    'clothing_type' => $purchase->clothing_type,
                    'order_date' => $purchase->purchase_date,
                    'return_date' => null,
                    'quotation_amount' => null,
                    'quotation_price' => $purchase->quotation_price,
                    'quotation_notes' => $purchase->quotation_notes,
                    'quotation_schedule' => $purchase->quotation_schedule,
                    'penalty_status' => 'none',
                    'counter_offer_amount' => $purchase->counter_offer_amount,
                    'counter_offer_notes' => $purchase->counter_offer_notes,
                    'counter_offer_status' => $purchase->counter_offer_status,
                    'notes' => $purchase->notes,
                    'created_at' => $purchase->created_at,
                    'updated_at' => $purchase->updated_at,
                ]);
            }
            
            // Remove duplicates by order_type and id combination
            $uniqueOrders = $allOrders->unique(function ($order) {
                return $order['order_type'] . '-' . $order['id'];
            })->values();
            
            // Debug: Log before and after deduplication
            \Log::info('OrderController: Before deduplication = ' . $allOrders->count() . ', After deduplication = ' . $uniqueOrders->count());
            
            // Sort by created_at descending
            $allOrders = $uniqueOrders->sortByDesc('created_at')->values();
            
            // Get total count
            $total = $allOrders->count();
            
            // Apply pagination manually
            $offset = ($page - 1) * $perPage;
            $paginatedOrders = $allOrders->slice($offset, $perPage)->values();
            
            // Create pagination metadata
            $pagination = [
                'current_page' => $page,
                'per_page' => $perPage,
                'total' => $total,
                'last_page' => ceil($total / $perPage),
                'from' => $offset + 1,
                'to' => min($offset + $perPage, $total),
                'has_more_pages' => $page < ceil($total / $perPage)
            ];
            
            return response()->json([
                'success' => true,
                'data' => $paginatedOrders,
                'pagination' => $pagination,
                'filters' => $request->only(['search', 'filters']),
                'message' => 'Orders retrieved successfully'
            ]);
            
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch orders',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get order statistics for admin dashboard
     */
    public function getStats()
    {
        try {
            // Get rental statistics
            $totalRentals = Rental::count();
            $pendingRentals = Rental::where('status', 'pending')->count();
            $completedRentals = Rental::where('status', 'completed')->count();
            $cancelledRentals = Rental::where('status', 'cancelled')->count();
            
            // Get purchase statistics
            $totalPurchases = Purchase::count();
            $pendingPurchases = Purchase::where('status', 'pending')->count();
            $completedPurchases = Purchase::where('status', 'completed')->count();
            $cancelledPurchases = Purchase::where('status', 'cancelled')->count();
            
            // Calculate totals
            $totalOrders = $totalRentals + $totalPurchases;
            $pendingOrders = $pendingRentals + $pendingPurchases;
            $completedOrders = $completedRentals + $completedPurchases;
            $cancelledOrders = $cancelledRentals + $cancelledPurchases;
            
            // Calculate revenue
            $rentalRevenue = Rental::where('status', 'completed')->sum('quotation_amount');
            $purchaseRevenue = Purchase::where('status', 'completed')->sum('quotation_price');
            $totalRevenue = $rentalRevenue + $purchaseRevenue;
            
            return response()->json([
                'success' => true,
                'data' => [
                    'total_orders' => $totalOrders,
                    'pending_orders' => $pendingOrders,
                    'completed_orders' => $completedOrders,
                    'cancelled_orders' => $cancelledOrders,
                    'total_rentals' => $totalRentals,
                    'total_purchases' => $totalPurchases,
                    'total_revenue' => $totalRevenue,
                    'rental_revenue' => $rentalRevenue,
                    'purchase_revenue' => $purchaseRevenue,
                ]
            ]);
            
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch order statistics',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
