<?php

namespace App\Http\Controllers;

use App\Models\Appointment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

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
        $appointmentDate = \Carbon\Carbon::parse($validated['appointment_date']);
        $today = \Carbon\Carbon::today();
        
        if ($appointmentDate->lt($today)) {
            return response()->json([
                'success' => false,
                'message' => 'Cannot schedule appointments in the past. Please select a current or future date.',
                'error' => 'past_date_not_allowed'
            ], 422);
        }

        // Check if appointment time is within business hours (10 AM to 5 PM)
        $appointmentHour = $appointmentDate->hour;
        if ($appointmentHour < 10 || $appointmentHour >= 17) {
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

        // Check if there's already an appointment on this date
        $existingAppointment = Appointment::whereDate('appointment_date', $validated['appointment_date'])
            ->where('status', '!=', 'cancelled')
            ->first();

        if ($existingAppointment) {
            return response()->json([
                'success' => false,
                'message' => 'This date is already booked. Please choose another date.',
                'error' => 'date_already_booked'
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
        $appointmentDate = \Carbon\Carbon::parse($validated['appointment_date']);
        $today = \Carbon\Carbon::today();
        
        if ($appointmentDate->lt($today)) {
            return response()->json([
                'success' => false,
                'message' => 'Cannot reschedule appointments to past dates. Please select a current or future date.',
                'error' => 'past_date_not_allowed'
            ], 422);
        }

        // Check if rescheduled appointment time is within business hours (10 AM to 5 PM)
        $appointmentHour = $appointmentDate->hour;
        if ($appointmentHour < 10 || $appointmentHour >= 17) {
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
        $appointments = Appointment::with('user:id,name')->orderBy('appointment_date', 'desc')->get();
        $appointments->transform(function ($appointment) {
            $appointment->customer_name = $appointment->user ? $appointment->user->name : null;
            unset($appointment->user);
            return $appointment;
        });
        return response()->json($appointments);
    }

    // Get all booked dates (for frontend calendar)
    public function getBookedDates(Request $request)
    {
        $bookedDates = Appointment::where('status', '!=', 'cancelled')
            ->selectRaw('DATE(appointment_date) as date')
            ->distinct()
            ->pluck('date')
            ->toArray();

        return response()->json([
            'success' => true,
            'booked_dates' => $bookedDates
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
            'status' => 'required|in:confirmed,cancelled',
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
            'recent_appointments' => Appointment::with('user:id,name')
                ->orderBy('appointment_date', 'desc')
                ->limit(5)
                ->get()
        ];

        return response()->json($stats);
    }
} 