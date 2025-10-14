<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Order;
use App\Models\User;

class OrderController extends Controller
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
}
