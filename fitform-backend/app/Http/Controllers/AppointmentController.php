<?php

namespace App\Http\Controllers;

use App\Models\Appointment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Carbon\Carbon;

class AppointmentController extends Controller
{
    // List all appointments for the authenticated user
    public function index(Request $request)
    {
        $user = $request->user();
        $appointments = Appointment::where('user_id', $user->id)
            ->with('user:id,name')
            ->orderBy('appointment_date', 'desc')
            ->get();
        // Append customer_name to each appointment
        $appointments->transform(function ($appointment) {
            $appointment->customer_name = $appointment->user ? $appointment->user->name : null;
            unset($appointment->user); // Optionally remove the user object
            return $appointment;
        });
        return response()->json($appointments);
    }

    // Book a new appointment
    public function store(Request $request)
    {
        $validated = $request->validate([
            'appointment_date' => 'required|date',
            'service_type' => 'required|string|max:255',
            'notes' => 'nullable|string',
        ]);

        // Check if appointment date is in the past
        $appointmentDate = Carbon::parse($validated['appointment_date']);
        $today = Carbon::today();
        
        if ($appointmentDate->lt($today)) {
            return response()->json([
                'success' => false,
                'message' => 'Cannot schedule appointments in the past. Please select a current or future date.',
                'error' => 'past_date_not_allowed'
            ], 422);
        }

        // Check if appointment time is within business hours (10 AM to 5 PM, last slot at 4 PM)
        $appointmentHour = $appointmentDate->hour;
        if ($appointmentHour < 10 || $appointmentHour >= 17) { // 10 AM to 5 PM (17:00), last slot at 4 PM (16:00)
            return response()->json([
                'success' => false,
                'message' => 'Appointments can only be scheduled between 10:00 AM and 5:00 PM. Please select a time within business hours.',
                'error' => 'outside_business_hours'
            ], 422);
        }

        // Log the appointment time for debugging
        \Log::info('Appointment time being created:', [
            'original' => $validated['appointment_date'],
            'parsed_hour' => $appointmentHour,
            'parsed_date' => $appointmentDate->toDateTimeString(),
            'formatted_time' => $appointmentDate->format('H:i:s'),
            'timezone' => $appointmentDate->timezone->getName()
        ]);

        // Check if the user already has an appointment on this date (1 appointment per customer per day)
        $existingUserAppointment = Appointment::where('user_id', $request->user()->id)
            ->whereDate('appointment_date', $validated['appointment_date'])
            ->where('status', '!=', 'cancelled')
            ->first();

        if ($existingUserAppointment) {
            return response()->json([
                'success' => false,
                'message' => 'You already have an appointment on this date. Only 1 appointment per customer per day is allowed.',
                'error' => 'user_already_has_appointment'
            ], 422);
        }

        // Check if the specific time slot is already taken by any user
        $appointmentDateTime = Carbon::parse($validated['appointment_date']);
        $existingTimeSlot = Appointment::whereDate('appointment_date', $validated['appointment_date'])
            ->whereTime('appointment_date', $appointmentDateTime->format('H:i:s'))
            ->where('status', '!=', 'cancelled')
            ->first();

        if ($existingTimeSlot) {
            return response()->json([
                'success' => false,
                'message' => 'This time slot is already taken. Please select another time.',
                'error' => 'time_slot_taken'
            ], 422);
        }

        // Check if the daily limit of 5 appointments has been reached
        $dailyAppointmentCount = Appointment::whereDate('appointment_date', $validated['appointment_date'])
            ->where('status', '!=', 'cancelled')
            ->count();

        if ($dailyAppointmentCount >= 5) {
            return response()->json([
                'success' => false,
                'message' => 'Daily appointment limit reached. Maximum 5 appointments per day allowed. Please select another date.',
                'error' => 'daily_limit_reached'
            ], 422);
        }

        $appointment = Appointment::create([
            'user_id' => $request->user()->id,
            'appointment_date' => $validated['appointment_date'],
            'service_type' => $validated['service_type'],
            'notes' => $validated['notes'] ?? null,
            'status' => 'pending',
        ]);
        return response()->json($appointment, 201);
    }

    // Update (reschedule) an appointment
    public function update(Request $request, $id)
    {
        $appointment = Appointment::where('user_id', $request->user()->id)->findOrFail($id);
        $validated = $request->validate([
            'appointment_date' => 'required|date',
        ]);

        // Check if rescheduled date is in the past
        $appointmentDate = Carbon::parse($validated['appointment_date']);
        $today = Carbon::today();
        
        if ($appointmentDate->lt($today)) {
            return response()->json([
                'success' => false,
                'message' => 'Cannot reschedule appointments to past dates. Please select a current or future date.',
                'error' => 'past_date_not_allowed'
            ], 422);
        }

        // Check if rescheduled appointment time is within business hours (10 AM to 5 PM, last slot at 4 PM)
        $appointmentHour = $appointmentDate->hour;
        if ($appointmentHour < 10 || $appointmentHour >= 17) { // 10 AM to 5 PM (17:00), last slot at 4 PM (16:00)
            return response()->json([
                'success' => false,
                'message' => 'Appointments can only be rescheduled between 10:00 AM and 5:00 PM. Please select a time within business hours.',
                'error' => 'outside_business_hours'
            ], 422);
        }

        // Log the rescheduled appointment time for debugging
        \Log::info('Appointment time being rescheduled:', [
            'original' => $validated['appointment_date'],
            'parsed_hour' => $appointmentHour,
            'parsed_date' => $appointmentDate->toDateTimeString()
        ]);

        $appointment->appointment_date = $validated['appointment_date'];
        $appointment->status = 'pending'; // Optionally reset status on reschedule
        $appointment->save();
        return response()->json($appointment);
    }

    // Delete (cancel) an appointment
    public function destroy(Request $request, $id)
    {
        $appointment = Appointment::where('user_id', $request->user()->id)->findOrFail($id);
        $appointment->status = 'cancelled';
        $appointment->save();
        return response()->json(['message' => 'Appointment cancelled.']);
    }

    // List all appointments for admin
    public function indexAdmin(Request $request)
    {
        $user = $request->user();
        if ($user->role !== 'admin') {
            return response()->json(['error' => 'Unauthorized'], 403);
        }
        $appointments = Appointment::with('user:id,name,profile_image')->orderBy('appointment_date', 'desc')->get();
        
        // Debug logging
        \Log::info('Admin appointments query result:', [
            'total_appointments' => $appointments->count(),
            'first_appointment_user' => $appointments->first() ? $appointments->first()->user : null
        ]);
        
        $appointments->transform(function ($appointment) {
            $appointment->customer_name = $appointment->user ? $appointment->user->name : null;
            $appointment->customer_profile_image = $appointment->user ? $appointment->user->profile_image : null;
            
            // Debug logging for each appointment
            \Log::info('Processing appointment:', [
                'appointment_id' => $appointment->id,
                'customer_name' => $appointment->customer_name,
                'customer_profile_image' => $appointment->customer_profile_image,
                'user_data' => $appointment->user ? $appointment->user->toArray() : null
            ]);
            
            unset($appointment->user);
            return $appointment;
        });
        
        $result = $appointments->toArray();
        \Log::info('Final appointments result:', $result);
        
        return response()->json($result);
    }

    // Get dates where the current user already has an appointment
    public function getBookedDates(Request $request)
    {
        $user = $request->user();
        
        // Get dates where the current user already has an appointment
        $userBookedDates = Appointment::where('user_id', $user->id)
            ->where('status', '!=', 'cancelled')
            ->selectRaw('DATE(appointment_date) as date')
            ->distinct()
            ->pluck('date')
            ->toArray();

        return response()->json([
            'success' => true,
            'booked_dates' => $userBookedDates
        ]);
    }

    // Admin update status (confirm/cancel)
    public function adminUpdateStatus(Request $request, $id)
    {
        $user = $request->user();
        if ($user->role !== 'admin') {
            return response()->json(['error' => 'Unauthorized'], 403);
        }
        $appointment = Appointment::findOrFail($id);
        $validated = $request->validate([
            'status' => 'required|in:pending,confirmed,cancelled',
        ]);
        $appointment->status = $validated['status'];
        $appointment->save();
        return response()->json($appointment);
    }

    // Get appointment statistics for admin dashboard
    public function getAppointmentStats(Request $request)
    {
        $user = $request->user();
        if ($user->role !== 'admin') {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        $stats = [
            'total_appointments' => Appointment::count(),
            'pending_appointments' => Appointment::where('status', 'pending')->count(),
            'confirmed_appointments' => Appointment::where('status', 'confirmed')->count(),
            'cancelled_appointments' => Appointment::where('status', 'cancelled')->count(),
            'total_customers' => Appointment::distinct('user_id')->count(),
            'recent_appointments' => Appointment::with('user:id,name,profile_image')
                ->orderBy('appointment_date', 'desc')
                ->limit(5)
                ->get()
        ];

        return response()->json($stats);
    }

    // Get daily appointment capacity and waiting time estimation
    public function getDailyCapacity(Request $request)
    {
        $date = $request->query('date', now()->format('Y-m-d'));
        $user = $request->user();
        
        // Check if user already has an appointment on this date
        $userHasAppointment = Appointment::where('user_id', $user->id)
            ->whereDate('appointment_date', $date)
            ->where('status', '!=', 'cancelled')
            ->exists();
        
        // Count total appointments for the specified date
        $appointmentsCount = Appointment::whereDate('appointment_date', $date)
            ->where('status', '!=', 'cancelled')
            ->count();
        
        // Calculate waiting time estimation based on appointment times
        $appointments = Appointment::whereDate('appointment_date', $date)
            ->where('status', '!=', 'cancelled')
            ->orderBy('appointment_date')
            ->get();
        
        $estimatedWaitTime = 0;
        if ($appointments->count() > 0) {
            // Find the latest appointment time
            $latestAppointment = $appointments->last();
            $latestTime = Carbon::parse($latestAppointment->appointment_date);
            $estimatedWaitTime = $latestTime->hour - 10; // Hours after 10 AM
        }
        
        // Get all taken times for this date
        $takenTimes = $appointments->map(function ($appointment) {
            $appointmentTime = Carbon::parse($appointment->appointment_date);
            return $appointmentTime->format('H:i');
        })->toArray();
        
        return response()->json([
            'success' => true,
            'date' => $date,
            'current_appointments' => $appointmentsCount,
            'user_has_appointment' => $userHasAppointment,
            'estimated_wait_time_minutes' => $estimatedWaitTime * 60,
            'estimated_wait_time_hours' => $estimatedWaitTime,
            'is_available' => !$userHasAppointment,
            'appointments_today' => $appointmentsCount,
            'taken_times' => $takenTimes
        ]);
    }
} 