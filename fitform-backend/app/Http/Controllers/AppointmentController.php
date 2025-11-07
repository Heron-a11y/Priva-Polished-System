<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Appointment;
use App\Models\User;
use App\Models\Notification;
use App\Models\AdminSettings;
use App\Services\ActivityLogService;
use Carbon\Carbon;
use Illuminate\Support\Facades\Log;

class AppointmentController extends PaginatedController
{
    /**
     * Create notification for appointment events
     */
    private function createAppointmentNotification($userId, $senderRole, $message, $appointmentId = null)
    {
        Notification::create([
            'user_id' => $userId,
            'sender_role' => $senderRole,
            'message' => $message,
            'read' => false,
            'order_id' => $appointmentId,
            'order_type' => 'appointment'
        ]);
    }

    /**
     * Notify all admins about appointment events
     */
    private function notifyAllAdmins($message, $appointmentId = null)
    {
        $admins = User::where('role', 'admin')->get();
        foreach ($admins as $admin) {
            $this->createAppointmentNotification($admin->id, 'customer', $message, $appointmentId);
        }
    }
    /**
     * Get appointments for authenticated user
     */
    public function index(Request $request)
    {
        try {
            $user = $request->user();
            
            // Ensure user is authenticated (this should be handled by middleware, but double-check)
            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'Authentication required',
                    'data' => []
                ], 401);
            }
            
            // Get appointments for the authenticated user only
            $appointments = Appointment::where('user_id', $user->id)
                ->orderBy('appointment_date', 'desc')
                ->get();
            
            // Format appointments to include separate date and time fields
            $formattedAppointments = $appointments->map(function ($appointment) {
                $appointmentDate = $appointment->appointment_date;
                $date = $appointmentDate->format('Y-m-d');
                $time = $appointmentDate->format('H:i');
                
                return [
                    'id' => $appointment->id,
                    'appointment_date' => $appointmentDate->format('Y-m-d H:i:s'),
                    'appointment_time' => $time,
                    'service_type' => $appointment->service_type,
                    'status' => $appointment->status,
                    'notes' => $appointment->notes,
                    'created_at' => $appointment->created_at,
                    'updated_at' => $appointment->updated_at,
                ];
            });
            
            return response()->json([
                'success' => true,
                'data' => $formattedAppointments,
                'message' => 'Appointments retrieved successfully'
            ]);
            
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch appointments',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get appointments for admin dashboard with pagination
     */
    public function indexAdmin(Request $request)
    {
        try {
            $query = Appointment::with('user');
            
            // Configure pagination options
            $options = [
                'search_fields' => ['service_type', 'notes'],
                'filter_fields' => ['status'],
                'sort_fields' => ['created_at', 'appointment_date', 'status', 'service_type'],
                'default_per_page' => 10,
                'max_per_page' => 100,
                'transform' => function ($appointment) {
                    $appointmentDate = $appointment->appointment_date;
                    $date = $appointmentDate->format('Y-m-d');
                    $time = $appointmentDate->format('H:i');
                    
                    return [
                        'id' => $appointment->id,
                        'appointment_date' => $appointmentDate->format('Y-m-d H:i:s'),
                        'appointment_time' => $time,
                        'service_type' => $appointment->service_type,
                        'status' => $appointment->status,
                        'notes' => $appointment->notes,
                        'customer_name' => $appointment->user->name ?? 'N/A',
                        'customer_email' => $appointment->user->email ?? 'N/A',
                        'customer_profile_image' => $appointment->user->profile_image 
                            ? (\Illuminate\Support\Facades\Storage::disk('public')->exists($appointment->user->profile_image) 
                                ? request()->getSchemeAndHttpHost() . '/storage/' . $appointment->user->profile_image
                                : null)
                            : null,
                        'created_at' => $appointment->created_at,
                        'updated_at' => $appointment->updated_at,
                    ];
                }
            ];
            
            $result = $this->paginate($query, $request, $options);
            
            // Add stats to the response
            $stats = [
                'total_appointments' => Appointment::count(),
                'pending_appointments' => Appointment::where('status', 'pending')->count(),
                'confirmed_appointments' => Appointment::where('status', 'confirmed')->count(),
                'cancelled_appointments' => Appointment::where('status', 'cancelled')->count(),
            ];
            
            // Add stats to the response data
            $responseData = $result->getData(true);
            $responseData['stats'] = $stats;
            
            return response()->json($responseData);
            
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch appointments',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get appointment statistics for admin dashboard
     */
    public function getAppointmentStats()
    {
        try {
            // Get all appointments
            $appointments = Appointment::all();
            
            // Calculate statistics
            $totalAppointments = $appointments->count();
            $pendingAppointments = $appointments->where('status', 'pending')->count();
            $confirmedAppointments = $appointments->where('status', 'confirmed')->count();
            $cancelledAppointments = $appointments->where('status', 'cancelled')->count();
            $completedAppointments = $appointments->where('status', 'completed')->count();
            
            // Get appointments by service type
            $serviceTypeStats = $appointments->groupBy('service_type')->map(function ($group) {
                return $group->count();
            });
            
            // Get appointments by month (last 6 months)
            $monthlyStats = $appointments->groupBy(function ($appointment) {
                return $appointment->created_at->format('Y-m');
            })->map(function ($group) {
                return $group->count();
            });
            
            return response()->json([
                'success' => true,
                'data' => [
                    'total_appointments' => $totalAppointments,
                    'pending_appointments' => $pendingAppointments,
                    'confirmed_appointments' => $confirmedAppointments,
                    'cancelled_appointments' => $cancelledAppointments,
                    'completed_appointments' => $completedAppointments,
                    'service_type_stats' => $serviceTypeStats,
                    'monthly_stats' => $monthlyStats,
                ]
            ]);
            
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch appointment statistics',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Generate appointments report
     */
    public function generateReport()
    {
        try {
            // Get all appointments with customer information
            $appointments = Appointment::with('user')->get();
            
            // Calculate statistics
            $totalAppointments = $appointments->count();
            $pendingAppointments = $appointments->where('status', 'pending')->count();
            $confirmedAppointments = $appointments->where('status', 'confirmed')->count();
            $cancelledAppointments = $appointments->where('status', 'cancelled')->count();
            
            // Prepare data for the PDF
            $reportData = [
                'appointments' => $appointments,
                'stats' => [
                    'total_appointments' => $totalAppointments,
                    'pending_appointments' => $pendingAppointments,
                    'confirmed_appointments' => $confirmedAppointments,
                    'cancelled_appointments' => $cancelledAppointments,
                ],
                'generated_at' => now(),
            ];
            
            // Generate PDF using the view
            $pdf = \Barryvdh\DomPDF\Facade\Pdf::loadView('admin.appointments-report', $reportData);
            
            // Return the PDF as a download
            return $pdf->download("appointments-report-" . now()->format('Y-m-d') . ".pdf");

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to generate report',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Store a new appointment
     */
    public function store(Request $request)
    {
        try {
            $user = $request->user();
            
            // Ensure user is authenticated
            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'Authentication required to book appointments'
                ], 401);
            }
            
            $userId = $user->id;

            $validated = $request->validate([
                'appointment_date' => 'required|date|after_or_equal:today',
                'appointment_time' => 'required|string',
                'service_type' => 'required|string',
                'notes' => 'nullable|string'
            ]);

            // Combine date and time into a single datetime
            $combinedDateTime = $validated['appointment_date'] . ' ' . $validated['appointment_time'] . ':00';
            
            // Validation 1: Check if user already has an appointment on this date
            $existingAppointment = Appointment::where('user_id', $userId)
                ->whereDate('appointment_date', $validated['appointment_date'])
                ->where('status', '!=', 'cancelled')
                ->first();
            
            if ($existingAppointment) {
                return response()->json([
                    'success' => false,
                    'message' => 'You already have an appointment scheduled for this date. Only one appointment per day is allowed.',
                    'error' => 'daily_limit_exceeded'
                ], 422);
            }
            
            // Validation 2: Check if the time slot is already taken
            $timeSlotTaken = Appointment::whereDate('appointment_date', $validated['appointment_date'])
                ->whereTime('appointment_date', $validated['appointment_time'] . ':00')
                ->where('status', '!=', 'cancelled')
                ->exists();
            
            if ($timeSlotTaken) {
                return response()->json([
                    'success' => false,
                    'message' => 'This time slot is already taken. Please choose another time.',
                    'error' => 'time_slot_taken'
                ], 422);
            }
            
            // Validation 3: Check daily capacity (maximum 5 appointments per day)
            $dailyAppointmentCount = Appointment::whereDate('appointment_date', $validated['appointment_date'])
                ->where('status', '!=', 'cancelled')
                ->count();
            
            if ($dailyAppointmentCount >= 5) {
                return response()->json([
                    'success' => false,
                    'message' => 'Daily capacity reached. Maximum 5 appointments per day allowed.',
                    'error' => 'daily_capacity_exceeded'
                ], 422);
            }
            
            $appointment = Appointment::create([
                'user_id' => $userId,
                'appointment_date' => $combinedDateTime,
                'service_type' => $validated['service_type'],
                'notes' => $validated['notes'] ?? null,
                'status' => 'pending'
            ]);

            // Check auto approval after creating the appointment
            $this->checkAutoApproval($appointment);

            // Get customer information for notifications
            $customer = User::find($userId);
            $customerName = $customer ? $customer->name : 'Unknown Customer';
            $appointmentDate = date('M j, Y', strtotime($validated['appointment_date']));
            $appointmentTime = date('g:i A', strtotime($validated['appointment_time']));

            // Notify customer about successful booking
            $customerMessage = "Your appointment for {$validated['service_type']} has been booked for {$appointmentDate} at {$appointmentTime}. Status: Pending approval.";
            $this->createAppointmentNotification($userId, 'admin', $customerMessage, $appointment->id);

            // Notify all admins about new appointment
            $adminMessage = "New appointment booked by {$customerName} for {$validated['service_type']} on {$appointmentDate} at {$appointmentTime}.";
            $this->notifyAllAdmins($adminMessage, $appointment->id);

            // Log activity
            ActivityLogService::logAppointment(
                'created',
                "New appointment booked by {$customerName} for {$validated['service_type']}",
                [
                    'appointment_id' => $appointment->id,
                    'customer_name' => $customerName,
                    'service_type' => $validated['service_type'],
                    'appointment_date' => $validated['appointment_date'],
                    'appointment_time' => $validated['appointment_time']
                ],
                $userId,
                'customer',
                $request
            );

            return response()->json([
                'success' => true,
                'message' => 'Appointment booked successfully',
                'data' => $appointment
            ], 201);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to book appointment',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update an appointment
     */
    public function update(Request $request, $id)
    {
        try {
            $user = $request->user();
            
            // Ensure user is authenticated
            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'Authentication required to update appointments'
                ], 401);
            }
            
            // Only allow users to update their own appointments
            $appointment = Appointment::where('id', $id)->where('user_id', $user->id)->first();

            if (!$appointment) {
                \Log::warning('Appointment not found for update:', [
                    'appointment_id' => $id,
                    'user_id' => $user->id
                ]);
                return response()->json([
                    'success' => false,
                    'message' => 'Appointment not found'
                ], 404);
            }
            
            \Log::info('Found appointment for update:', [
                'appointment_id' => $appointment->id,
                'user_id' => $appointment->user_id,
                'current_status' => $appointment->status,
                'current_date' => $appointment->appointment_date
            ]);

            $validated = $request->validate([
                'appointment_date' => 'sometimes|required|date|after_or_equal:today',
                'appointment_time' => 'sometimes|required|string',
                'service_type' => 'sometimes|required|string',
                'notes' => 'nullable|string',
                'status' => 'sometimes|required|in:pending,confirmed,cancelled'
            ]);
            
            // Log the validated data for debugging
            \Log::info('Validated appointment data:', $validated);

            $oldStatus = $appointment->status;
            
            // Handle appointment_date and appointment_time combination
            $updateData = $validated;
            
            // If both date and time are provided, combine them into appointment_date
            if (isset($validated['appointment_date']) && isset($validated['appointment_time'])) {
                $combinedDateTime = $validated['appointment_date'] . ' ' . $validated['appointment_time'] . ':00';
                $updateData['appointment_date'] = $combinedDateTime;
                unset($updateData['appointment_time']); // Remove appointment_time as it's not a database field
            } elseif (isset($validated['appointment_time']) && !isset($validated['appointment_date'])) {
                // If only time is provided, update the existing appointment_date with new time
                $existingDate = $appointment->appointment_date->format('Y-m-d');
                $combinedDateTime = $existingDate . ' ' . $validated['appointment_time'] . ':00';
                $updateData['appointment_date'] = $combinedDateTime;
                unset($updateData['appointment_time']); // Remove appointment_time as it's not a database field
            } elseif (isset($validated['appointment_time'])) {
                // Remove appointment_time if it's the only field provided without date
                unset($updateData['appointment_time']);
            }
            
            // Check if this is a confirmed appointment being modified
            if ($appointment->status === 'confirmed' && !isset($updateData['status'])) {
                // Check if any critical fields are being changed
                $hasDateChanged = isset($updateData['appointment_date']) && 
                    $appointment->appointment_date->format('Y-m-d H:i:s') !== $updateData['appointment_date'];
                $hasServiceChanged = isset($updateData['service_type']) && 
                    $appointment->service_type !== $updateData['service_type'];
                
                if ($hasDateChanged || $hasServiceChanged) {
                    $updateData['status'] = 'pending';
                    \Log::info('Confirmed appointment modified - changing status to pending for reconfirmation', [
                        'appointment_id' => $appointment->id,
                        'has_date_changed' => $hasDateChanged,
                        'has_service_changed' => $hasServiceChanged
                    ]);
                }
            }
            
            // Add validation for "one appointment per day" if date is being changed
            if (isset($updateData['appointment_date'])) {
                $newDate = date('Y-m-d', strtotime($updateData['appointment_date']));
                
                // Check if user already has another appointment on this date (excluding current appointment)
                $existingAppointment = Appointment::where('user_id', $user->id)
                    ->whereDate('appointment_date', $newDate)
                    ->where('id', '!=', $id) // Exclude current appointment being edited
                    ->where('status', '!=', 'cancelled')
                    ->first();
                
                if ($existingAppointment) {
                    \Log::warning('User already has appointment on this date during update:', [
                        'user_id' => $user->id,
                        'new_date' => $newDate,
                        'existing_appointment_id' => $existingAppointment->id,
                        'current_appointment_id' => $id
                    ]);
                    
                    return response()->json([
                        'success' => false,
                        'message' => 'You already have an appointment scheduled for this date. Only one appointment per day is allowed.',
                        'error' => 'daily_limit_exceeded'
                    ], 422);
                }
                
                // Check if the new date has reached daily capacity (5 appointments)
                $dailyAppointmentCount = Appointment::whereDate('appointment_date', $newDate)
                    ->where('status', '!=', 'cancelled')
                    ->where('id', '!=', $id) // Exclude current appointment being edited
                    ->count();
                
                if ($dailyAppointmentCount >= 5) {
                    \Log::warning('Daily capacity reached for date during update:', [
                        'date' => $newDate,
                        'count' => $dailyAppointmentCount,
                        'current_appointment_id' => $id
                    ]);
                    
                    return response()->json([
                        'success' => false,
                        'message' => 'This date has reached its daily capacity of 5 appointments. Please select another date.',
                        'error' => 'daily_capacity_exceeded'
                    ], 422);
                }
                
                // Check if the time slot is already taken
                $newTime = date('H:i:s', strtotime($updateData['appointment_date']));
                $timeSlotTaken = Appointment::whereDate('appointment_date', $newDate)
                    ->whereTime('appointment_date', $newTime)
                    ->where('status', '!=', 'cancelled')
                    ->where('id', '!=', $id) // Exclude current appointment being edited
                    ->exists();
                
                if ($timeSlotTaken) {
                    \Log::warning('Time slot already taken during update:', [
                        'date' => $newDate,
                        'time' => $newTime,
                        'current_appointment_id' => $id
                    ]);
                    
                    return response()->json([
                        'success' => false,
                        'message' => 'This time slot is already taken. Please choose another time.',
                        'error' => 'time_slot_taken'
                    ], 422);
                }
            }
            
            // Log the update data for debugging
            \Log::info('Updating appointment with data:', $updateData);
            
            $appointment->update($updateData);

            // Get customer information for notifications
            $customer = User::find($appointment->user_id);
            $customerName = $customer ? $customer->name : 'Unknown Customer';
            $appointmentDate = date('M j, Y', strtotime($appointment->appointment_date));
            $appointmentTime = date('g:i A', strtotime($appointment->appointment_date));

            // Check if status was changed
            if (isset($validated['status']) && $validated['status'] !== $oldStatus) {
                $statusText = ucfirst($validated['status']);
                
                // Notify customer about status change
                $customerMessage = "Your appointment for {$appointment->service_type} on {$appointmentDate} at {$appointmentTime} has been {$statusText}.";
                $this->createAppointmentNotification($appointment->user_id, 'admin', $customerMessage, $appointment->id);

                // Notify all admins about status change
                $adminMessage = "Appointment status updated for {$customerName} - {$appointment->service_type} on {$appointmentDate} at {$appointmentTime}. Status: {$statusText}.";
                $this->notifyAllAdmins($adminMessage, $appointment->id);
            } else {
                // Check if status was automatically changed to pending
                $statusChangedToPending = $oldStatus === 'confirmed' && $appointment->status === 'pending';
                
                if ($statusChangedToPending) {
                    // Notify customer about appointment update and status change
                    $customerMessage = "Your confirmed appointment for {$appointment->service_type} has been updated and is now pending reconfirmation. New date: {$appointmentDate} at {$appointmentTime}.";
                    $this->createAppointmentNotification($appointment->user_id, 'admin', $customerMessage, $appointment->id);

                    // Notify all admins about appointment update and status change
                    $adminMessage = "Confirmed appointment updated for {$customerName} - {$appointment->service_type} on {$appointmentDate} at {$appointmentTime}. Status changed to pending for reconfirmation.";
                    $this->notifyAllAdmins($adminMessage, $appointment->id);
                } else {
                    // Notify customer about appointment update
                    $customerMessage = "Your appointment for {$appointment->service_type} has been updated. New date: {$appointmentDate} at {$appointmentTime}.";
                    $this->createAppointmentNotification($appointment->user_id, 'admin', $customerMessage, $appointment->id);

                    // Notify all admins about appointment update
                    $adminMessage = "Appointment updated for {$customerName} - {$appointment->service_type} on {$appointmentDate} at {$appointmentTime}.";
                    $this->notifyAllAdmins($adminMessage, $appointment->id);
                }
            }

            return response()->json([
                'success' => true,
                'message' => 'Appointment updated successfully',
                'data' => $appointment
            ]);

        } catch (\Exception $e) {
            \Log::error('Error updating appointment:', [
                'appointment_id' => $id,
                'user_id' => $user ? $user->id : 'unknown',
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to update appointment',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Delete an appointment
     */
    public function destroy(Request $request, $id)
    {
        try {
            $user = $request->user();
            
            // Ensure user is authenticated
            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'Authentication required to cancel appointments'
                ], 401);
            }
            
            // Only allow users to delete their own appointments
            $appointment = Appointment::where('id', $id)->where('user_id', $user->id)->first();

            if (!$appointment) {
                return response()->json([
                    'success' => false,
                    'message' => 'Appointment not found'
                ], 404);
            }

            // Get customer information for notifications before deletion
            $customer = User::find($appointment->user_id);
            $customerName = $customer ? $customer->name : 'Unknown Customer';
            $appointmentDate = date('M j, Y', strtotime($appointment->appointment_date));
            $appointmentTime = date('g:i A', strtotime($appointment->appointment_date));

            $appointment->delete();

            // Notify customer about appointment cancellation
            $customerMessage = "Your appointment for {$appointment->service_type} on {$appointmentDate} at {$appointmentTime} has been cancelled.";
            $this->createAppointmentNotification($appointment->user_id, 'admin', $customerMessage, $appointment->id);

            // Notify all admins about appointment cancellation
            $adminMessage = "Appointment cancelled by {$customerName} - {$appointment->service_type} on {$appointmentDate} at {$appointmentTime}.";
            $this->notifyAllAdmins($adminMessage, $appointment->id);

            return response()->json([
                'success' => true,
                'message' => 'Appointment cancelled successfully'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to cancel appointment',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get booked dates
     */
    public function getBookedDates()
    {
        try {
            // Get dates that have reached the daily capacity (5 appointments)
            $bookedDates = Appointment::selectRaw('DATE(appointment_date) as date')
                ->where('status', '!=', 'cancelled')
                ->groupBy('date')
                ->havingRaw('COUNT(*) >= 5')
                ->pluck('date');

            // Debug logging
            \Log::info('Booked dates query result:', [
                'booked_dates' => $bookedDates->toArray(),
                'count' => $bookedDates->count()
            ]);

            return response()->json([
                'success' => true,
                'booked_dates' => $bookedDates
            ]);

        } catch (\Exception $e) {
            \Log::error('Error fetching booked dates:', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch booked dates',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Debug endpoint to check appointments for a specific date
     */
    public function debugDateAppointments(Request $request)
    {
        try {
            $date = $request->query('date', '2025-11-05');
            
            $appointments = Appointment::whereDate('appointment_date', $date)
                ->where('status', '!=', 'cancelled')
                ->get();
            
            $count = $appointments->count();
            
            return response()->json([
                'success' => true,
                'date' => $date,
                'appointment_count' => $count,
                'appointments' => $appointments->map(function($apt) {
                    $appointmentDate = $apt->appointment_date;
                    $time = $appointmentDate->format('H:i');
                    
                    return [
                        'id' => $apt->id,
                        'appointment_date' => $appointmentDate->format('Y-m-d H:i:s'),
                        'appointment_time' => $time,
                        'status' => $apt->status,
                        'service_type' => $apt->service_type
                    ];
                })
            ]);
            
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to debug date appointments',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get daily capacity
     */
    public function getDailyCapacity(Request $request)
    {
        try {
            $date = $request->query('date');
            
            if (!$date) {
                return response()->json([
                    'success' => false,
                    'message' => 'Date parameter is required'
                ], 400);
            }

            // Use whereDate to match any time on that date
            $bookedCount = Appointment::whereDate('appointment_date', $date)
                ->where('status', '!=', 'cancelled')
                ->count();

            // Collect taken time slots for this date to help frontend block selection
            $takenTimes = Appointment::whereDate('appointment_date', $date)
                ->where('status', '!=', 'cancelled')
                ->get()
                ->map(function ($apt) {
                    return \Carbon\Carbon::parse($apt->appointment_date)->format('H:i');
                })
                ->unique()
                ->values();

            $maxCapacity = 5; // Maximum 5 appointments per day
            $availableSlots = $maxCapacity - $bookedCount;

            return response()->json([
                'success' => true,
                // Keep prior shape under data for existing callers
                'data' => [
                    'date' => $date,
                    'booked_count' => $bookedCount,
                    'max_capacity' => $maxCapacity,
                    'available_slots' => max(0, $availableSlots)
                ],
                // Also include taken_times at top-level for convenient access
                'taken_times' => $takenTimes,
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch daily capacity',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get available time slots
     */
    public function getAvailableSlots(Request $request)
    {
        try {
            $date = $request->query('date');
            
            if (!$date) {
                return response()->json([
                    'success' => false,
                    'message' => 'Date parameter is required'
                ], 400);
            }

            // Define available time slots
            $allSlots = [
                '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
                '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
                '15:00', '15:30', '16:00', '16:30', '17:00', '17:30'
            ];

            // Get booked slots for the date
            $bookedSlots = Appointment::where('appointment_date', $date)
                ->where('status', '!=', 'cancelled')
                ->pluck('appointment_time')
                ->toArray();

            // Filter out booked slots
            $availableSlots = array_diff($allSlots, $bookedSlots);

            return response()->json([
                'success' => true,
                'data' => array_values($availableSlots)
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch available slots',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Admin update appointment status
     */
    public function adminUpdateStatus(Request $request, $id)
    {
        try {
            $validated = $request->validate([
                'status' => 'required|in:pending,confirmed,cancelled,completed'
            ]);

            $appointment = Appointment::findOrFail($id);
            $oldStatus = $appointment->status;
            $appointment->update(['status' => $validated['status']]);

            // Get customer information for notifications
            $customer = User::find($appointment->user_id);
            $customerName = $customer ? $customer->name : 'Unknown Customer';
            $appointmentDate = date('M j, Y', strtotime($appointment->appointment_date));
            $appointmentTime = date('g:i A', strtotime($appointment->appointment_date));
            $statusText = ucfirst($validated['status']);

            // Log activity
            ActivityLogService::logAppointment(
                'status_updated',
                "Appointment status changed from {$oldStatus} to {$validated['status']} for {$customerName}",
                [
                    'appointment_id' => $appointment->id,
                    'customer_name' => $customerName,
                    'service_type' => $appointment->service_type,
                    'appointment_date' => $appointment->appointment_date,
                    'old_status' => $oldStatus,
                    'new_status' => $validated['status']
                ],
                null, // No specific user ID for admin actions
                'admin',
                $request
            );

            // Notify customer about status change
            $customerMessage = "Your appointment for {$appointment->service_type} on {$appointmentDate} at {$appointmentTime} has been {$statusText}.";
            $this->createAppointmentNotification($appointment->user_id, 'admin', $customerMessage, $appointment->id);

            // Notify all admins about status change
            $adminMessage = "Appointment status updated for {$customerName} - {$appointment->service_type} on {$appointmentDate} at {$appointmentTime}. Status: {$statusText}.";
            $this->notifyAllAdmins($adminMessage, $appointment->id);

            return response()->json([
                'success' => true,
                'message' => 'Appointment status updated successfully',
                'data' => $appointment
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to update appointment status',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Check and apply auto approval logic for an appointment
     */
    private function checkAutoApproval($appointment)
    {
        try {
            $settings = AdminSettings::getSettings();
            
            // Check if auto-approval is enabled
            if (!$settings->auto_approve_appointments) {
                Log::info('Auto-approval check skipped: Auto-approval disabled', [
                    'appointment_id' => $appointment->id
                ]);
                return;
            }
            
            $appointmentDate = Carbon::parse($appointment->appointment_date);
            $appointmentDateOnly = $appointmentDate->format('Y-m-d');
            
            // Check if appointment is within business hours
            $appointmentTime = $appointmentDate->format('H:i');
            $businessStart = $settings->business_start_time->format('H:i');
            $businessEnd = $settings->business_end_time->format('H:i');
            
            if ($appointmentTime < $businessStart || $appointmentTime > $businessEnd) {
                Log::info('Auto-approval check skipped: Outside business hours', [
                    'appointment_id' => $appointment->id,
                    'appointment_time' => $appointmentTime,
                    'business_hours' => "{$businessStart} - {$businessEnd}"
                ]);
                return;
            }
            
            // Check for time slot conflicts with first-come-first-served priority
            $appointmentStart = $appointmentDate->copy()->subMinutes(15);
            $appointmentEnd = $appointmentDate->copy()->addMinutes(15);
            
            $conflictingAppointments = Appointment::whereDate('appointment_date', $appointmentDateOnly)
                ->where('status', '!=', 'cancelled')
                ->where('id', '!=', $appointment->id)
                ->where(function ($query) use ($appointmentStart, $appointmentEnd) {
                    $query->whereBetween('appointment_date', [$appointmentStart, $appointmentEnd]);
                })
                ->orderBy('created_at', 'asc')
                ->get();
            
            if ($conflictingAppointments->count() > 0) {
                // Check if this appointment was created before any conflicting ones
                $thisAppointmentCreatedAt = $appointment->created_at;
                $earliestConflictCreatedAt = $conflictingAppointments->first()->created_at;
                
                if ($thisAppointmentCreatedAt->gt($earliestConflictCreatedAt)) {
                    // This appointment was created later - cancel it
                    $appointment->update(['status' => 'cancelled']);
                    
                    Log::info('Appointment auto-cancelled: Time slot conflict (first-come-first-served)', [
                        'appointment_id' => $appointment->id,
                        'user_id' => $appointment->user_id,
                        'appointment_date' => $appointment->appointment_date,
                        'created_at' => $thisAppointmentCreatedAt,
                        'earliest_conflict_created_at' => $earliestConflictCreatedAt,
                        'reason' => 'Time slot already taken by earlier appointment'
                    ]);
                    return;
                } else {
                    // This appointment was created first - cancel the conflicting ones
                    foreach ($conflictingAppointments as $conflictingAppointment) {
                        if ($conflictingAppointment->status === 'pending') {
                            $conflictingAppointment->update(['status' => 'cancelled']);
                            
                            Log::info('Conflicting appointment auto-cancelled: First-come-first-served priority', [
                                'cancelled_appointment_id' => $conflictingAppointment->id,
                                'cancelled_user_id' => $conflictingAppointment->user_id,
                                'priority_appointment_id' => $appointment->id,
                                'priority_user_id' => $appointment->user_id,
                                'appointment_date' => $conflictingAppointment->appointment_date,
                                'reason' => 'Time slot taken by earlier appointment'
                            ]);
                        }
                    }
                }
            }
            
            // Check daily appointment limit
            $appointmentsToday = Appointment::whereDate('appointment_date', $appointmentDateOnly)
                ->where('status', '!=', 'cancelled')
                ->count();
            
            if ($appointmentsToday >= $settings->max_appointments_per_day) {
                Log::info('Auto-approval check skipped: Daily limit reached', [
                    'appointment_id' => $appointment->id,
                    'appointments_today' => $appointmentsToday,
                    'max_appointments' => $settings->max_appointments_per_day
                ]);
                return;
            }
            
            // All conditions met - approve the appointment
            $appointment->update(['status' => 'confirmed']);
            
            Log::info('Appointment auto-approved with first-come-first-served priority', [
                'appointment_id' => $appointment->id,
                'user_id' => $appointment->user_id,
                'appointment_date' => $appointment->appointment_date,
                'service_type' => $appointment->service_type,
                'created_at' => $appointment->created_at
            ]);
            
        } catch (\Exception $e) {
            Log::error('Error in auto-approval check', [
                'appointment_id' => $appointment->id,
                'error' => $e->getMessage()
            ]);
        }
    }
} 