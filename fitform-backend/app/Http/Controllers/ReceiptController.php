<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Rental;
use App\Models\Purchase;
use Barryvdh\DomPDF\Facade\Pdf;

class ReceiptController extends Controller
{
    /**
     * Generate receipt for rental transaction
     */
    public function generateRentalReceipt($id)
    {
        try {
            $rental = Rental::with('user')->findOrFail($id);
            
            // Check if rental is eligible for receipt (picked_up or returned status)
            if (!in_array($rental->status, ['picked_up', 'returned'])) {
                return response()->json([
                    'success' => false,
                    'message' => 'Receipt can only be generated for picked up or returned rentals'
                ], 400);
            }
            
            // Prepare receipt data
            $receiptData = [
                'transaction' => $rental,
                'customer' => $rental->user,
                'tailor_name' => 'Cristelle Mae D. Nañez',
                'transaction_type' => 'Rental',
                'generated_at' => now(),
                'receipt_number' => 'RENT-' . str_pad($rental->id, 6, '0', STR_PAD_LEFT),
            ];
            
            // Generate PDF using the view
            $pdf = Pdf::loadView('receipts.rental-receipt', $receiptData);
            
            // Return the PDF as a download
            $filename = "rental-receipt-{$rental->id}-" . now()->format('Y-m-d') . ".pdf";
            return $pdf->download($filename);
            
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to generate receipt',
                'error' => $e->getMessage()
            ], 500);
        }
    }
    
    /**
     * Generate receipt for purchase transaction
     */
    public function generatePurchaseReceipt($id)
    {
        try {
            $purchase = Purchase::with('user')->findOrFail($id);
            
            // Check if purchase is eligible for receipt (picked_up status)
            if ($purchase->status !== 'picked_up') {
                return response()->json([
                    'success' => false,
                    'message' => 'Receipt can only be generated for picked up purchases'
                ], 400);
            }
            
            // Prepare receipt data
            $receiptData = [
                'transaction' => $purchase,
                'customer' => $purchase->user,
                'tailor_name' => 'Cristelle Mae D. Nañez',
                'transaction_type' => 'Purchase',
                'generated_at' => now(),
                'receipt_number' => 'PURCH-' . str_pad($purchase->id, 6, '0', STR_PAD_LEFT),
            ];
            
            // Generate PDF using the view
            $pdf = Pdf::loadView('receipts.purchase-receipt', $receiptData);
            
            // Return the PDF as a download
            $filename = "purchase-receipt-{$purchase->id}-" . now()->format('Y-m-d') . ".pdf";
            return $pdf->download($filename);
            
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to generate receipt',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
