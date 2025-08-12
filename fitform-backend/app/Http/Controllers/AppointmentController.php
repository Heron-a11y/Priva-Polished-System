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