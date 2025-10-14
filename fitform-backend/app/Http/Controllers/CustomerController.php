<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use App\Models\User;
use App\Models\Order;
use App\Models\Appointment;
use App\Models\Rental;
use App\Models\Purchase;
use Carbon\Carbon;
use Barryvdh\DomPDF\Facade\Pdf;

class CustomerController extends Controller
{
    /**
     * Test endpoint
     */
    public function test()
    {
        return response()->json([
            'status' => 'success',
            'message' => 'CustomerController is working!',
            'timestamp' => now()
        ]);
    }

    /**
     * Simple test endpoint without any models
     */
    public function simpleTest()
    {
        return response()->json([
            'status' => 'success',
            'message' => 'Simple test is working!',
            'timestamp' => now()
        ]);
    }

    /**
     * Get all customers with filters and search
     */
    public function index(Request $request)
    {
        try {
            $query = User::where('role', 'customer');

            // Apply search filter
            if ($request->has('search') && !empty($request->search)) {
                $search = $request->search;
                $query->where(function($q) use ($search) {
                    $q->where('name', 'like', "%{$search}%")
                      ->orWhere('email', 'like', "%{$search}%")
                      ->orWhere('phone', 'like', "%{$search}%");
                });
            }

            // Apply status filter
            if ($request->has('status') && !empty($request->status)) {
                $query->where('account_status', $request->status);
            }

            // Get customers with basic additional data
            $customers = $query->orderBy('created_at', 'desc')->get();
            
            // Add actual counts to each customer
            $customers = $customers->map(function ($customer) {
                $customerArray = $customer->toArray();
                
                try {
                    // Get actual counts for this customer
                    // Orders table doesn't have user_id column, so set to 0
                    $orderCount = 0;
                    $appointmentCount = \App\Models\Appointment::where('user_id', $customer->id)->count();
                    $rentalCount = \App\Models\Rental::where('user_id', $customer->id)->count();
                    $purchaseCount = \App\Models\Purchase::where('user_id', $customer->id)->count();
                    
                    // Debug logging
                    \Log::info("Customer {$customer->id} counts: Orders={$orderCount}, Appointments={$appointmentCount}, Rentals={$rentalCount}, Purchases={$purchaseCount}");
                    
                    $customerArray['order_count'] = $orderCount;
                    $customerArray['appointment_count'] = $appointmentCount;
                    $customerArray['rental_count'] = $rentalCount;
                    $customerArray['purchase_count'] = $purchaseCount;
                    $customerArray['total_transactions'] = $orderCount + $rentalCount + $purchaseCount;
                    $customerArray['last_activity'] = $customer->updated_at;
                    
                    // Fix profile image URL
                    if ($customerArray['profile_image']) {
                        $customerArray['profile_image'] = url('storage/' . $customerArray['profile_image']);
                    }
                } catch (\Exception $e) {
                    // If there's an error, set to 0
                    \Log::error("Error getting counts for customer {$customer->id}: " . $e->getMessage());
                    $customerArray['order_count'] = 0;
                    $customerArray['appointment_count'] = 0;
                    $customerArray['rental_count'] = 0;
                    $customerArray['purchase_count'] = 0;
                    $customerArray['total_transactions'] = 0;
                    $customerArray['last_activity'] = $customer->updated_at;
                }
                
                return $customerArray;
            });

            // Calculate stats
            $stats = [
                'total_customers' => User::where('role', 'customer')->count(),
                'active_customers' => User::where('role', 'customer')->where('account_status', 'active')->count(),
                'suspended_customers' => User::where('role', 'customer')->where('account_status', 'suspended')->count(),
                'banned_customers' => User::where('role', 'customer')->where('account_status', 'banned')->count(),
            ];

            return response()->json([
                'success' => true,
                'customers' => $customers,
                'stats' => $stats
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch customers',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Show a specific customer
     */
    public function show($id)
    {
        try {
            $customer = User::where('role', 'customer')->findOrFail($id);
            
            return response()->json([
                'success' => true,
                'customer' => $customer
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Customer not found',
                'error' => $e->getMessage()
            ], 404);
        }
    }

    /**
     * Update customer information
     */
    public function update(Request $request, $id)
    {
        try {
            $customer = User::where('role', 'customer')->findOrFail($id);
            
            $customer->update($request->only(['name', 'email', 'phone', 'address', 'city', 'state', 'zip_code', 'country']));
            
            return response()->json([
                'success' => true,
                'message' => 'Customer updated successfully',
                'customer' => $customer
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to update customer',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Suspend customer account
     */
    public function suspend(Request $request, $id)
    {
        try {
            $customer = User::where('role', 'customer')->findOrFail($id);
            
            $customer->update([
                'account_status' => 'suspended',
                'suspension_start' => $request->suspension_start,
                'suspension_end' => $request->suspension_end,
                'suspension_reason' => $request->suspension_reason
            ]);
            
            return response()->json([
                'success' => true,
                'message' => 'Customer suspended successfully'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to suspend customer',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Lift suspension from customer account
     */
    public function liftSuspension($id)
    {
        try {
            $customer = User::where('role', 'customer')->findOrFail($id);
            
            $customer->update([
                'account_status' => 'active',
                'suspension_start' => null,
                'suspension_end' => null,
                'suspension_reason' => null
            ]);
            
            return response()->json([
                'success' => true,
                'message' => 'Suspension lifted successfully'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to lift suspension',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Ban customer account
     */
    public function ban(Request $request, $id)
    {
        try {
            $customer = User::where('role', 'customer')->findOrFail($id);
            
            $customer->update([
                'account_status' => 'banned',
                'ban_reason' => $request->ban_reason
            ]);
            
            return response()->json([
                'success' => true,
                'message' => 'Customer banned successfully'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to ban customer',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Generate customer report
     */
    public function generateReport($id)
    {
        try {
            $customer = User::where('role', 'customer')->findOrFail($id);
            
            // Get customer's related data
            $appointments = \App\Models\Appointment::where('user_id', $id)->get();
            $rentals = \App\Models\Rental::where('user_id', $id)->get();
            $purchases = \App\Models\Purchase::where('user_id', $id)->get();
            
            // Prepare data for the PDF
            $customerData = [
                'customer' => $customer,
                'appointments' => $appointments,
                'rentals' => $rentals,
                'purchases' => $purchases,
                'generated_at' => now(),
            ];
            
            // Generate PDF using the view
            $pdf = \Barryvdh\DomPDF\Facade\Pdf::loadView('admin.customer-report', $customerData);
            
            // Return the PDF as a download
            return $pdf->download("customer-report-{$customer->name}-{$id}.pdf");
            
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to generate report',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function getOrders($id)
    {
        try {
            $orders = \App\Models\Order::where('user_id', $id)->get();
            return response()->json([
                'success' => true,
                'data' => $orders
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch orders',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function getAppointments($id)
    {
        try {
            $appointments = \App\Models\Appointment::where('user_id', $id)->get();
            return response()->json([
                'success' => true,
                'data' => $appointments
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch appointments',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function getRentals($id)
    {
        try {
            $rentals = \App\Models\Rental::where('user_id', $id)->get();
            return response()->json([
                'success' => true,
                'data' => $rentals
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch rentals',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function getPurchases($id)
    {
        try {
            $purchases = \App\Models\Purchase::where('user_id', $id)->get();
            return response()->json([
                'success' => true,
                'data' => $purchases
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch purchases',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}