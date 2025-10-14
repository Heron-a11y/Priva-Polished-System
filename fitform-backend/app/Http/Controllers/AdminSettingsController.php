<?php

namespace App\Http\Controllers;

use App\Models\AdminSettings;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class AdminSettingsController extends Controller
{
    /**
     * Get current admin settings
     */
    public function getSettings(Request $request)
    {
        $user = $request->user();
        if ($user->role !== 'admin') {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        $settings = AdminSettings::getSettings();
        
        return response()->json([
            'success' => true,
            'settings' => $settings
        ]);
    }

    /**
     * Update admin settings
     */
    public function updateSettings(Request $request)
    {
        $user = $request->user();
        if ($user->role !== 'admin') {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'auto_approve_appointments' => 'boolean',
            'max_appointments_per_day' => 'integer|min:1|max:20',
            'business_start_time' => 'date_format:H:i',
            'business_end_time' => 'date_format:H:i|after:business_start_time',
        ]);

        $settings = AdminSettings::getSettings();
        $settings->update($validated);

        Log::info('Admin settings updated', [
            'admin_id' => $user->id,
            'settings' => $validated
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Settings updated successfully',
            'settings' => $settings
        ]);
    }

    /**
     * Toggle auto-approval setting
     */
    public function toggleAutoApproval(Request $request)
    {
        $user = $request->user();
        if ($user->role !== 'admin') {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'enabled' => 'required|boolean'
        ]);

        $settings = AdminSettings::getSettings();
        $settings->update([
            'auto_approve_appointments' => $validated['enabled']
        ]);

        Log::info('Auto-approval toggled', [
            'admin_id' => $user->id,
            'enabled' => $validated['enabled']
        ]);

        return response()->json([
            'success' => true,
            'message' => $validated['enabled'] ? 'Auto-approval enabled' : 'Auto-approval disabled',
            'auto_approve_appointments' => $validated['enabled']
        ]);
    }
}


