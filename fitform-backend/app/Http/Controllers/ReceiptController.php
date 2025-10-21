<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Rental;
use App\Models\Purchase;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Support\Facades\Auth;

class ReceiptController extends Controller
{
    /**
     * Get the peso symbol with proper encoding
     */
    private function getPesoSymbol()
    {
        // Use explicit UTF-8 encoding for the peso symbol
        return mb_convert_encoding('₱', 'UTF-8', 'UTF-8');
    }
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
            
            // Security check: Allow access for completed transactions
            $user = Auth::user();
            $token = request()->query('token');
            
            // For completed transactions, allow access without strict authentication
            // This enables receipt sharing for finished orders
            if (!in_array($rental->status, ['picked_up', 'returned'])) {
                return response()->json([
                    'success' => false,
                    'message' => 'Receipt can only be generated for completed transactions'
                ], 400);
            }
            
            // If user is authenticated, check ownership (optional for completed transactions)
            if ($user && $rental->user_id !== $user->id && $user->role !== 'admin') {
                // For completed transactions, we'll allow access even without ownership
                // This enables receipt sharing functionality
                \Log::info('Receipt access for rental', [
                    'rental_id' => $rental->id,
                    'user_id' => $user->id,
                    'rental_user_id' => $rental->user_id,
                    'user_role' => $user->role,
                    'status' => $rental->status
                ]);
            }
            
            // Prepare receipt data
            $receiptData = [
                'transaction' => $rental,
                'customer' => $rental->user,
                'tailor_name' => 'Cristelle Mae D. Nañez',
                'transaction_type' => 'Rental',
                'generated_at' => now(),
                'receipt_number' => 'RENT-' . str_pad($rental->id, 6, '0', STR_PAD_LEFT),
                'peso_symbol' => $this->getPesoSymbol(),
            ];
            
            // Generate PDF using the view with UTF-8 encoding
            $pdf = Pdf::loadView('receipts.rental-receipt', $receiptData)
                ->setPaper('A4', 'portrait')
                ->setOptions([
                    'isHtml5ParserEnabled' => true,
                    'isRemoteEnabled' => false,
                    'defaultFont' => 'DejaVu Sans',
                    'fontDir' => public_path('fonts/'),
                    'fontCache' => storage_path('fonts/'),
                    'isPhpEnabled' => true,
                    'isJavascriptEnabled' => false,
                    'isFontSubsettingEnabled' => true,
                ]);
            
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
            
            // Security check: Allow access for completed transactions
            $user = Auth::user();
            $token = request()->query('token');
            
            // For completed transactions, allow access without strict authentication
            // This enables receipt sharing for finished orders
            if ($purchase->status !== 'picked_up') {
                return response()->json([
                    'success' => false,
                    'message' => 'Receipt can only be generated for completed transactions'
                ], 400);
            }
            
            // If user is authenticated, check ownership (optional for completed transactions)
            if ($user && $purchase->user_id !== $user->id && $user->role !== 'admin') {
                // For completed transactions, we'll allow access even without ownership
                // This enables receipt sharing functionality
                \Log::info('Receipt access for purchase', [
                    'purchase_id' => $purchase->id,
                    'user_id' => $user->id,
                    'purchase_user_id' => $purchase->user_id,
                    'user_role' => $user->role,
                    'status' => $purchase->status
                ]);
            }
            
            // Prepare receipt data
            $receiptData = [
                'transaction' => $purchase,
                'customer' => $purchase->user,
                'tailor_name' => 'Cristelle Mae D. Nañez',
                'transaction_type' => 'Purchase',
                'generated_at' => now(),
                'receipt_number' => 'PURCH-' . str_pad($purchase->id, 6, '0', STR_PAD_LEFT),
                'peso_symbol' => $this->getPesoSymbol(),
            ];
            
            // Generate PDF using the view with UTF-8 encoding
            $pdf = Pdf::loadView('receipts.purchase-receipt', $receiptData)
                ->setPaper('A4', 'portrait')
                ->setOptions([
                    'isHtml5ParserEnabled' => true,
                    'isRemoteEnabled' => false,
                    'defaultFont' => 'DejaVu Sans',
                    'fontDir' => public_path('fonts/'),
                    'fontCache' => storage_path('fonts/'),
                    'isPhpEnabled' => true,
                    'isJavascriptEnabled' => false,
                    'isFontSubsettingEnabled' => true,
                ]);
            
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
