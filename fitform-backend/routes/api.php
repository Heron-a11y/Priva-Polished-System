<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\AppointmentController;
use App\Http\Controllers\SizingController;

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

// Public routes
Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);

// Protected routes
Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);
    // Appointments
    Route::get('/appointments', [AppointmentController::class, 'index']);
    Route::post('/appointments', [AppointmentController::class, 'store']);
    Route::put('/appointments/{id}', [AppointmentController::class, 'update']);
    Route::delete('/appointments/{id}', [AppointmentController::class, 'destroy']);
    Route::get('/booked-dates', [AppointmentController::class, 'getBookedDates']);
    // Admin appointments
    Route::get('/admin/appointments', [AppointmentController::class, 'indexAdmin']);
    Route::post('/admin/appointments/{id}/status', [AppointmentController::class, 'adminUpdateStatus']);
    Route::get('/admin/appointments/stats', [AppointmentController::class, 'getAppointmentStats']);
    // Rentals
    Route::get('/rentals', [\App\Http\Controllers\RentalController::class, 'index']);
    Route::post('/rentals', [\App\Http\Controllers\RentalController::class, 'store']);
    // Alias for rental-transactions for frontend compatibility
    Route::get('/rental-transactions', [\App\Http\Controllers\RentalController::class, 'index']);
    Route::post('/rental-transactions', [\App\Http\Controllers\RentalController::class, 'store']);
    // Preferences
    Route::get('/preferences', [\App\Http\Controllers\PreferenceController::class, 'index']);
    Route::post('/preferences', [\App\Http\Controllers\PreferenceController::class, 'store']);
    // Purchases
    Route::get('/purchases', [\App\Http\Controllers\PurchaseController::class, 'index']);
    Route::post('/purchases', [\App\Http\Controllers\PurchaseController::class, 'store']);
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
    // Quotation actions for rentals
    Route::post('/rentals/{id}/set-quotation', [\App\Http\Controllers\RentalController::class, 'setQuotation']);
    Route::post('/rentals/{id}/accept-quotation', [\App\Http\Controllers\RentalController::class, 'customerAcceptQuotation']);
    Route::post('/rentals/{id}/reject-quotation', [\App\Http\Controllers\RentalController::class, 'customerRejectQuotation']);
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
}); 