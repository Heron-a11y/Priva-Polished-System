<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\AppointmentController;
use App\Http\Controllers\SizingController;
use App\Http\Controllers\MeasurementHistoryController;
use App\Http\Controllers\BodyMeasurementController;
use App\Http\Middleware\CorsMiddleware;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| Here is where you can register API routes for your application. These
| routes are loaded by the RouteServiceProvider and all of them will
| be assigned to the "api" middleware group. Make something great!
|
*/

// Test endpoint for debugging
Route::get('/test', function () {
    return response()->json([
        'status' => 'success',
        'message' => 'Backend is working!',
        'timestamp' => now(),
        'url' => request()->url(),
        'method' => request()->method()
    ]);
});

// Temporary test endpoint for appointments (remove in production)
Route::get('/test-appointments', function () {
    try {
        $appointments = \App\Models\Appointment::with('user')->get();
        return response()->json([
            'status' => 'success',
            'message' => 'Appointments retrieved successfully',
            'count' => $appointments->count(),
            'data' => $appointments
        ]);
    } catch (\Exception $e) {
        return response()->json([
            'status' => 'error',
            'message' => 'Failed to retrieve appointments',
            'error' => $e->getMessage()
        ], 500);
    }
});

Route::get('/health', function () {
    return response()->json([
        'status' => 'healthy',
        'timestamp' => now(),
        'version' => '1.0.0'
    ]);
});

// Apply CORS middleware to all API routes
Route::middleware([CorsMiddleware::class])->group(function () {
    
    // Test route
    Route::get('/', function () {
        return response()->json(['message' => 'FitForm API is working!', 'status' => 'success']);
    });
    
    // Public routes
    Route::post('/register', [AuthController::class, 'register']);
    Route::post('/login', [AuthController::class, 'login']);
    
    // Test customer route without auth
    Route::get('/admin/customers/public-test', [\App\Http\Controllers\CustomerController::class, 'test']);
    Route::get('/test-controller', [\App\Http\Controllers\TestController::class, 'test']);
    
    // Admin Customer Management Routes (temporarily without auth for testing)
    Route::get('/admin/customers/test', [\App\Http\Controllers\CustomerController::class, 'test']);
    Route::get('/admin/customers/simple-test', [\App\Http\Controllers\CustomerController::class, 'simpleTest']);
    Route::get('/admin/customers', [\App\Http\Controllers\CustomerController::class, 'index']);
    Route::get('/admin/customers/{id}', [\App\Http\Controllers\CustomerController::class, 'show']);
    Route::put('/admin/customers/{id}', [\App\Http\Controllers\CustomerController::class, 'update']);
    Route::post('/admin/customers/{id}/suspend', [\App\Http\Controllers\CustomerController::class, 'suspend']);
    Route::post('/admin/customers/{id}/lift-suspension', [\App\Http\Controllers\CustomerController::class, 'liftSuspension']);
    Route::post('/admin/customers/{id}/ban', [\App\Http\Controllers\CustomerController::class, 'ban']);
    Route::post('/admin/customers/{id}/generate-report', [\App\Http\Controllers\CustomerController::class, 'generateReport']);
    Route::get('/admin/customers/{id}/generate-report', [\App\Http\Controllers\CustomerController::class, 'generateReport']);
    Route::get('/admin/customers/{id}/orders', [\App\Http\Controllers\CustomerController::class, 'getOrders']);
    Route::get('/admin/customers/{id}/appointments', [\App\Http\Controllers\CustomerController::class, 'getAppointments']);
    Route::get('/admin/customers/{id}/rentals', [\App\Http\Controllers\CustomerController::class, 'getRentals']);
    Route::get('/admin/customers/{id}/purchases', [\App\Http\Controllers\CustomerController::class, 'getPurchases']);
    
    // Admin Appointments Routes (temporarily without auth for testing)
    Route::get('/admin/appointments', [\App\Http\Controllers\AppointmentController::class, 'indexAdmin']);
    Route::post('/admin/appointments/{id}/status', [\App\Http\Controllers\AppointmentController::class, 'adminUpdateStatus']);
    Route::get('/admin/appointments/stats', [\App\Http\Controllers\AppointmentController::class, 'getAppointmentStats']);
    
    // Report generation routes
    Route::get('/admin/orders/generate-report', [\App\Http\Controllers\OrderController::class, 'generateReport']);
    Route::get('/admin/appointments/generate-report', [\App\Http\Controllers\AppointmentController::class, 'generateReport']);
    
    // Catalog Management Routes (temporarily without auth for testing)
    Route::get('/admin/catalog', [\App\Http\Controllers\CatalogController::class, 'index']);
    Route::post('/admin/catalog', [\App\Http\Controllers\CatalogController::class, 'store']);
    Route::get('/admin/catalog/{id}', [\App\Http\Controllers\CatalogController::class, 'show']);
    Route::put('/admin/catalog/{id}', [\App\Http\Controllers\CatalogController::class, 'update']);
    Route::delete('/admin/catalog/{id}', [\App\Http\Controllers\CatalogController::class, 'destroy']);
    Route::post('/admin/catalog/{id}/featured', [\App\Http\Controllers\CatalogController::class, 'updateFeaturedStatus']);
    Route::post('/admin/catalog/sort-order', [\App\Http\Controllers\CatalogController::class, 'updateSortOrder']);
    
    // Customer Catalog Routes (public access)
    Route::get('/catalog', [\App\Http\Controllers\CatalogController::class, 'getCustomerCatalog']);

    // Appointments - temporarily moved outside auth for testing
    Route::get('/appointments', function() {
        try {
            $appointments = \App\Models\Appointment::with('user')->get();
            return response()->json([
                'success' => true,
                'data' => $appointments,
                'message' => 'Appointments retrieved successfully'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch appointments',
                'error' => $e->getMessage()
            ], 500);
        }
    });
    Route::post('/appointments', [AppointmentController::class, 'store']);
    Route::put('/appointments/{id}', [AppointmentController::class, 'update']);
    Route::delete('/appointments/{id}', [AppointmentController::class, 'destroy']);
    Route::get('/booked-dates', [AppointmentController::class, 'getBookedDates']);
    Route::get('/appointments/daily-capacity', [AppointmentController::class, 'getDailyCapacity']);
    Route::get('/appointments/available-slots', [AppointmentController::class, 'getAvailableSlots']);

    // Protected routes
    Route::middleware('auth:sanctum')->group(function () {
        Route::post('/logout', [AuthController::class, 'logout']);
        Route::get('/me', [AuthController::class, 'me']);
        // Admin appointments - moved outside middleware for testing
        // Admin settings
        Route::get('/admin/settings', [\App\Http\Controllers\AdminSettingsController::class, 'getSettings']);
        Route::put('/admin/settings', [\App\Http\Controllers\AdminSettingsController::class, 'updateSettings']);
        Route::post('/admin/settings/toggle-auto-approval', [\App\Http\Controllers\AdminSettingsController::class, 'toggleAutoApproval']);
        // Rentals
        Route::get('/rentals', [\App\Http\Controllers\RentalController::class, 'index']);
        Route::post('/rentals', [\App\Http\Controllers\RentalController::class, 'store']);
        Route::get('/rentals/history', [\App\Http\Controllers\RentalController::class, 'getHistory']);
        // Alias for rental-transactions for frontend compatibility
        Route::get('/rental-transactions', [\App\Http\Controllers\RentalController::class, 'index']);
        Route::post('/rental-transactions', [\App\Http\Controllers\RentalController::class, 'store']);
        // Preferences
        Route::get('/preferences', [\App\Http\Controllers\PreferenceController::class, 'index']);
        Route::post('/preferences', [\App\Http\Controllers\PreferenceController::class, 'store']);
        // Purchases
        Route::get('/purchases', [\App\Http\Controllers\PurchaseController::class, 'index']);
        Route::post('/purchases', [\App\Http\Controllers\PurchaseController::class, 'store']);
        Route::get('/purchases/history', [\App\Http\Controllers\PurchaseController::class, 'getHistory']);
        // Notifications
        Route::get('/notifications', [\App\Http\Controllers\NotificationController::class, 'index']);
        Route::post('/notifications/mark-read', [\App\Http\Controllers\NotificationController::class, 'markAsRead']);
        // Rental actions
        Route::post('/rentals/{id}/approve', [\App\Http\Controllers\RentalController::class, 'approve']);
        Route::post('/rentals/{id}/decline', [\App\Http\Controllers\RentalController::class, 'decline']);
        Route::post('/rentals/{id}/cancel', [\App\Http\Controllers\RentalController::class, 'cancel']);
        // Purchase actions
        Route::post('/purchases/{id}/approve', [\App\Http\Controllers\PurchaseController::class, 'approve']);
        Route::post('/purchases/{id}/decline', [\App\Http\Controllers\PurchaseController::class, 'decline']);
        Route::post('/purchases/{id}/cancel', [\App\Http\Controllers\PurchaseController::class, 'cancel']);
        // Quotation actions for purchases
        Route::post('/purchases/{id}/set-quotation', [\App\Http\Controllers\PurchaseController::class, 'setQuotation']);
        Route::post('/purchases/{id}/accept-quotation', [\App\Http\Controllers\PurchaseController::class, 'customerAcceptQuotation']);
        Route::post('/purchases/{id}/reject-quotation', [\App\Http\Controllers\PurchaseController::class, 'customerRejectQuotation']);
        Route::post('/purchases/{id}/counter-offer', [\App\Http\Controllers\PurchaseController::class, 'customerCounterOffer']);
        Route::post('/purchases/{id}/accept-counter-offer', [\App\Http\Controllers\PurchaseController::class, 'adminAcceptCounterOffer']);
        Route::post('/purchases/{id}/reject-counter-offer', [\App\Http\Controllers\PurchaseController::class, 'adminRejectCounterOffer']);
        // Quotation actions for rentals
        Route::post('/rentals/{id}/set-quotation', [\App\Http\Controllers\RentalController::class, 'setQuotation']);
        Route::post('/rentals/{id}/accept-quotation', [\App\Http\Controllers\RentalController::class, 'customerAcceptQuotation']);
        Route::post('/rentals/{id}/reject-quotation', [\App\Http\Controllers\RentalController::class, 'customerRejectQuotation']);
        Route::post('/rentals/{id}/counter-offer', [\App\Http\Controllers\RentalController::class, 'customerCounterOffer']);
        Route::post('/rentals/{id}/accept-counter-offer', [\App\Http\Controllers\RentalController::class, 'adminAcceptCounterOffer']);
        Route::post('/rentals/{id}/reject-counter-offer', [\App\Http\Controllers\RentalController::class, 'adminRejectCounterOffer']);
        // Penalty management for rentals
        Route::get('/rentals/{id}/penalties', [\App\Http\Controllers\RentalController::class, 'getPenaltyBreakdown']);
        Route::post('/rentals/{id}/calculate-penalties', [\App\Http\Controllers\RentalController::class, 'calculatePenalties']);
        Route::post('/rentals/{id}/mark-penalties-paid', [\App\Http\Controllers\RentalController::class, 'markPenaltiesPaid']);
        Route::post('/rentals/{id}/accept-agreement', [\App\Http\Controllers\RentalController::class, 'acceptAgreement']);
        // Admin accept/decline purchase order
        Route::post('/purchases/{id}/accept-order', [\App\Http\Controllers\PurchaseController::class, 'adminAccept']);
        Route::post('/purchases/{id}/decline-order', [\App\Http\Controllers\PurchaseController::class, 'adminDecline']);
        // Admin accept/decline rental order (mirroring purchase flow)
        Route::post('/rentals/{id}/accept-order', [\App\Http\Controllers\RentalController::class, 'adminAccept']);
        Route::post('/rentals/{id}/decline-order', [\App\Http\Controllers\RentalController::class, 'adminDecline']);
        // Mark purchase as ready for pickup
        Route::post('/purchases/{id}/ready-for-pickup', [\App\Http\Controllers\PurchaseController::class, 'markReadyForPickup']);
        // Mark purchase as picked up
        Route::post('/purchases/{id}/mark-picked-up', [\App\Http\Controllers\PurchaseController::class, 'markAsPickedUp']);
        // Mark rental as ready for pickup
        Route::post('/rentals/{id}/ready-for-pickup', [\App\Http\Controllers\RentalController::class, 'markReadyForPickup']);
        // Mark rental as picked up
        Route::post('/rentals/{id}/mark-picked-up', [\App\Http\Controllers\RentalController::class, 'markAsPickedUp']);
        // Mark rental as returned
        Route::post('/rentals/{id}/mark-returned', [\App\Http\Controllers\RentalController::class, 'markAsReturned']);
        
        // Delete routes
        Route::delete('/rentals/{id}', [\App\Http\Controllers\RentalController::class, 'destroy']);
        Route::delete('/purchases/{id}', [\App\Http\Controllers\PurchaseController::class, 'destroy']);
        
        // Unified History routes
        Route::get('/rental-purchase-history', [\App\Http\Controllers\RentalPurchaseHistoryController::class, 'index']);
        Route::delete('/rental-purchase-history/{id}', [\App\Http\Controllers\RentalPurchaseHistoryController::class, 'destroy']);
        
        // Sizing System Routes
        // Customer sizing routes
        Route::get('/sizing/recommendations', [SizingController::class, 'getSizeRecommendations']);
        Route::get('/sizing/charts', [SizingController::class, 'getSizeCharts']);
        Route::post('/sizing/match-measurements', [SizingController::class, 'matchMeasurements']);
        
        // Admin sizing routes
        Route::get('/admin/sizing/standards', [SizingController::class, 'getSizingStandards']);
        Route::get('/admin/sizing/standards/all', [SizingController::class, 'getAllSizingStandards']);
        Route::get('/admin/sizing/standards/active', [SizingController::class, 'getActiveSizingStandards']);
        Route::get('/admin/sizing/standards/{id}/check-deletion', [SizingController::class, 'checkSizingStandardDeletion']);
        Route::post('/admin/sizing/standards', [SizingController::class, 'updateSizingStandard']);
        Route::put('/admin/sizing/standards/{id}/parameters', [SizingController::class, 'customizeSizeParameters']);
        Route::delete('/admin/sizing/standards/{id}', [SizingController::class, 'deleteSizingStandard']);
        Route::post('/admin/sizing/standards/{id}/deactivate', [SizingController::class, 'deactivateSizingStandard']);
        Route::post('/admin/sizing/standards/{id}/reactivate', [SizingController::class, 'reactivateSizingStandard']);
        
        // Measurement History Routes
        Route::get('/measurement-history', [MeasurementHistoryController::class, 'index']);
        Route::post('/measurement-history', [MeasurementHistoryController::class, 'store']);
        Route::get('/measurement-history/stats', [MeasurementHistoryController::class, 'getStats']);
        Route::get('/measurement-history/latest', [MeasurementHistoryController::class, 'getLatest']);
        Route::get('/measurement-history/{id}', [MeasurementHistoryController::class, 'show']);
        Route::put('/measurement-history/{id}', [MeasurementHistoryController::class, 'update']);
        Route::delete('/measurement-history/{id}', [MeasurementHistoryController::class, 'destroy']);
        
        // AR Body Measurement Routes
        Route::post('/body-measurements', [BodyMeasurementController::class, 'store']);
        Route::get('/body-measurements', [BodyMeasurementController::class, 'index']);
        Route::get('/body-measurements/latest', [BodyMeasurementController::class, 'latest']);
        Route::post('/body-measurements/validate', [BodyMeasurementController::class, 'validate']);
        
        // Admin Measurement History Routes (New Table)
        Route::get('/admin/measurement-history', [\App\Http\Controllers\AdminMeasurementHistoryController::class, 'index']);
        Route::get('/admin/measurement-history/stats', [\App\Http\Controllers\AdminMeasurementHistoryController::class, 'stats']);
        
        // Profile Management Routes
        Route::get('/profile', [\App\Http\Controllers\ProfileController::class, 'show']);
        Route::put('/profile', [\App\Http\Controllers\ProfileController::class, 'update']);
        Route::post('/profile/change-password', [\App\Http\Controllers\ProfileController::class, 'changePassword']);
        Route::post('/profile/upload-image', [\App\Http\Controllers\ProfileController::class, 'uploadImage']);
        Route::delete('/profile/image', [\App\Http\Controllers\ProfileController::class, 'deleteProfileImage']);
        
        // Admin Profile Management Routes
        Route::get('/admin/profile/stats', [\App\Http\Controllers\ProfileController::class, 'getStats']);
        
        Route::get('/admin/users', [\App\Http\Controllers\ProfileController::class, 'getAllUsers']);
        Route::put('/admin/users/{id}/role', [\App\Http\Controllers\ProfileController::class, 'updateUserRole']);
        Route::get('/admin/measurement-history/{id}', [\App\Http\Controllers\AdminMeasurementHistoryController::class, 'show']);
        Route::post('/admin/measurement-history', [\App\Http\Controllers\AdminMeasurementHistoryController::class, 'store']);
        Route::put('/admin/measurement-history/{id}', [\App\Http\Controllers\AdminMeasurementHistoryController::class, 'update']);
        Route::delete('/admin/measurement-history/{id}', [\App\Http\Controllers\AdminMeasurementHistoryController::class, 'destroy']);
        Route::post('/admin/measurement-history/{id}/mark-viewed', [\App\Http\Controllers\AdminMeasurementHistoryController::class, 'markAsViewed']);
        Route::post('/admin/measurement-history/{id}/mark-processed', [\App\Http\Controllers\AdminMeasurementHistoryController::class, 'markAsProcessed']);
        Route::post('/admin/measurement-history/{id}/archive', [\App\Http\Controllers\AdminMeasurementHistoryController::class, 'archive']);
        Route::post('/admin/measurement-history/{id}/restore', [\App\Http\Controllers\AdminMeasurementHistoryController::class, 'restore']);
        Route::post('/admin/measurement-history/sync', [\App\Http\Controllers\AdminMeasurementHistoryController::class, 'syncFromMeasurementHistory']);
    });
}); 