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

class AppointmentController extends Controller
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
            
            // If no authenticated user, return all appointments (for testing)
            if (!$user) {
                $appointments = Appointment::with('user')
                    ->orderBy('appointment_date', 'desc')
                    ->orderBy('appointment_time', 'desc')
                    ->get();
                
                return response()->json([
                    'success' => true,
                    'data' => $appointments,
                    'message' => 'All appointments (no auth)'
                ]);
            }
            
            // Get appointments for the authenticated user
            $appointments = Appointment::where('user_id', $user->id)
                ->orderBy('appointment_date', 'desc')
                ->orderBy('appointment_time', 'desc')
                ->get();
            
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

    /**
     * Get appointments for admin dashboard
     */
    public function indexAdmin()
    {
        try {
            // Get all appointments with customer information
            $appointments = Appointment::with('user')->orderBy('created_at', 'desc')->get();
            
            // Calculate statistics
            $totalAppointments = $appointments->count();
            $pendingAppointments = $appointments->where('status', 'pending')->count();
            $confirmedAppointments = $appointments->where('status', 'confirmed')->count();
            $cancelledAppointments = $appointments->where('status', 'cancelled')->count();
            
            // Format appointments for frontend
            $formattedAppointments = $appointments->map(function ($appointment) {
                return [
                    'id' => $appointment->id,
                    'appointment_date' => $appointment->appointment_date,
                    'appointment_time' => $appointment->appointment_time,
                    'service_type' => $appointment->service_type,
                    'status' => $appointment->status,
                    'notes' => $appointment->notes,
                    'customer_name' => $appointment->user->name ?? 'N/A',
                    'customer_email' => $appointment->user->email ?? 'N/A',
                    'customer_profile_image' => $appointment->user->profile_image ?? null,
                    'created_at' => $appointment->created_at,
                    'updated_at' => $appointment->updated_at,
                ];
            });
            
            return response()->json([
                'success' => true,
                'data' => [
                    'appointments' => $formattedAppointments,
                    'stats' => [
                        'total_appointments' => $totalAppointments,
                        'pending_appointments' => $pendingAppointments,
                        'confirmed_appointments' => $confirmedAppointments,
                        'cancelled_appointments' => $cancelledAppointments,
                    ]
                ]
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
            
            // If no authenticated user, use a default customer ID (for testing)
            $userId = $user ? $user->id : 5; // Use customer ID 5 as default

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
            
            // If no authenticated user, allow updates for any appointment (for testing)
            $appointment = $user 
                ? Appointment::where('id', $id)->where('user_id', $user->id)->first()
                : Appointment::where('id', $id)->first();

            if (!$appointment) {
                return response()->json([
                    'success' => false,
                    'message' => 'Appointment not found'
                ], 404);
            }

            $validated = $request->validate([
                'appointment_date' => 'sometimes|required|date|after:today',
                'appointment_time' => 'sometimes|required|string',
                'service_type' => 'sometimes|required|string',
                'notes' => 'nullable|string'
            ]);

            $appointment->update($validated);

            // Get customer information for notifications
            $customer = User::find($appointment->user_id);
            $customerName = $customer ? $customer->name : 'Unknown Customer';
            $appointmentDate = date('M j, Y', strtotime($appointment->appointment_date));
            $appointmentTime = date('g:i A', strtotime($appointment->appointment_date));

            // Notify customer about appointment update
            $customerMessage = "Your appointment for {$appointment->service_type} has been updated. New date: {$appointmentDate} at {$appointmentTime}.";
            $this->createAppointmentNotification($appointment->user_id, 'admin', $customerMessage, $appointment->id);

            // Notify all admins about appointment update
            $adminMessage = "Appointment updated for {$customerName} - {$appointment->service_type} on {$appointmentDate} at {$appointmentTime}.";
            $this->notifyAllAdmins($adminMessage, $appointment->id);

            return response()->json([
                'success' => true,
                'message' => 'Appointment updated successfully',
                'data' => $appointment
            ]);

        } catch (\Exception $e) {
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
            
            // If no authenticated user, allow deletion of any appointment (for testing)
            $appointment = $user 
                ? Appointment::where('id', $id)->where('user_id', $user->id)->first()
                : Appointment::where('id', $id)->first();

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
            $bookedDates = Appointment::select('appointment_date')
                ->where('status', '!=', 'cancelled')
                ->distinct()
                ->pluck('appointment_date');

            return response()->json([
                'success' => true,
                'data' => $bookedDates
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch booked dates',
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

            $bookedCount = Appointment::where('appointment_date', $date)
                ->where('status', '!=', 'cancelled')
                ->count();

            $maxCapacity = 10; // You can make this configurable
            $availableSlots = $maxCapacity - $bookedCount;

            return response()->json([
                'success' => true,
                'data' => [
                    'date' => $date,
                    'booked_count' => $bookedCount,
                    'max_capacity' => $maxCapacity,
                    'available_slots' => max(0, $availableSlots)
                ]
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