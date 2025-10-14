<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Appointment;
use App\Models\User;

class AppointmentController extends Controller
{
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
} 