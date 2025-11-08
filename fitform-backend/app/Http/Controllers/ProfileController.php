<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Storage;

class ProfileController extends Controller
{
    /**
     * Get the base URL for storage files
     */
    private function getStorageBaseUrl(): string
    {
        // Try to get from request first
        $host = request()->getHost();
        $scheme = request()->getScheme();
        $port = request()->getPort();
        
        // Check if host is a valid IP address (192.168.x.x format)
        if (preg_match('/^192\.168\.\d+\.\d+$/', $host)) {
            return $scheme . '://' . $host . ($port ? ':' . $port : '');
        }
        
        // If host is localhost, 127.0.0.1, or not a valid IP, use the configured IP
        if ($host === 'localhost' || $host === '127.0.0.1' || !filter_var($host, FILTER_VALIDATE_IP)) {
            return 'http://192.168.1.54:8000';
        }
        
        // Use the request host if it's a valid IP or domain
        return $scheme . '://' . $host . ($port ? ':' . $port : '');
    }

    /**
     * Get user profile
     */
    public function show(Request $request): JsonResponse
    {
        $user = $request->user();

        return response()->json([
            'success' => true,
            'data' => [
                'user' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'role' => $user->role,
                    'profile_image' => $user->profile_image && Storage::disk('public')->exists($user->profile_image) 
                        ? $this->getStorageBaseUrl() . '/api/storage/' . $user->profile_image
                        : null,
                    'phone' => $user->phone,
                    'address' => $user->address,
                    'city' => $user->city,
                    'state' => $user->state,
                    'zip_code' => $user->zip_code,
                    'country' => $user->country,
                    'date_of_birth' => $user->date_of_birth,
                    'gender' => $user->gender,
                    'created_at' => $user->created_at,
                    'updated_at' => $user->updated_at,
                ]
            ]
        ]);
    }

    /**
     * Update user profile
     */
    public function update(Request $request): JsonResponse
    {
        $user = $request->user();

        $validator = Validator::make($request->all(), [
            'name' => 'sometimes|required|string|max:255',
            'email' => 'sometimes|required|string|email|max:255|unique:users,email,' . $user->id,
            'phone' => 'nullable|string|max:20',
            'address' => 'nullable|string|max:500',
            'city' => 'nullable|string|max:100',
            'state' => 'nullable|string|max:100',
            'zip_code' => 'nullable|string|max:20',
            'country' => 'nullable|string|max:100',
            'date_of_birth' => 'nullable|date|before:today',
            'gender' => 'nullable|in:male,female,other,prefer_not_to_say',
            'profile_image' => 'nullable|image|mimes:jpeg,png,jpg,gif|max:2048',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        $updateData = $request->only([
            'name', 'email', 'phone', 'address', 'city', 'state', 
            'zip_code', 'country', 'date_of_birth', 'gender', 'profile_image'
        ]);

        // Handle profile image upload
        \Log::info('Profile update request', [
            'has_file' => $request->hasFile('profile_image'),
            'file' => $request->file('profile_image'),
            'all_files' => $request->allFiles(),
            'all_input' => $request->all(),
            'content_type' => $request->header('Content-Type'),
            'method' => $request->method(),
        ]);

        if ($request->hasFile('profile_image')) {
            \Log::info('Processing profile image upload');
            
            // Delete old profile image if exists
            if ($user->profile_image && Storage::disk('public')->exists($user->profile_image)) {
                Storage::disk('public')->delete($user->profile_image);
            }

            $image = $request->file('profile_image');
            $imageName = 'profile_' . $user->id . '_' . time() . '.' . $image->getClientOriginalExtension();
            $imagePath = $image->storeAs('profiles', $imageName, 'public');
            $updateData['profile_image'] = $imagePath;
            
            \Log::info('Profile image saved', [
                'image_path' => $imagePath,
                'image_name' => $imageName,
            ]);
        } else {
            \Log::info('No profile image file found in request');
        }

        $user->update($updateData);

        return response()->json([
            'success' => true,
            'message' => 'Profile updated successfully',
            'data' => [
                'user' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'role' => $user->role,
                    'profile_image' => $user->profile_image && Storage::disk('public')->exists($user->profile_image) 
                        ? $this->getStorageBaseUrl() . '/api/storage/' . $user->profile_image
                        : null,
                    'phone' => $user->phone,
                    'address' => $user->address,
                    'city' => $user->city,
                    'state' => $user->state,
                    'zip_code' => $user->zip_code,
                    'country' => $user->country,
                    'date_of_birth' => $user->date_of_birth,
                    'gender' => $user->gender,
                    'updated_at' => $user->updated_at,
                ]
            ]
        ]);
    }

    /**
     * Upload profile image
     */
    public function uploadImage(Request $request): JsonResponse
    {
        $user = $request->user();

        \Log::info('Profile image upload request', [
            'has_file' => $request->hasFile('profile_image'),
            'file' => $request->file('profile_image'),
            'all_files' => $request->allFiles(),
            'all_input' => $request->all(),
            'content_type' => $request->header('Content-Type'),
            'method' => $request->method(),
        ]);

        $validator = Validator::make($request->all(), [
            'profile_image' => 'required|image|mimes:jpeg,png,jpg,gif|max:2048',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        if ($request->hasFile('profile_image')) {
            \Log::info('Processing profile image upload');
            
            // Delete old profile image if exists
            if ($user->profile_image && Storage::disk('public')->exists($user->profile_image)) {
                Storage::disk('public')->delete($user->profile_image);
            }

            $image = $request->file('profile_image');
            $imageName = 'profile_' . $user->id . '_' . time() . '.' . $image->getClientOriginalExtension();
            $imagePath = $image->storeAs('profiles', $imageName, 'public');
            
            $user->update(['profile_image' => $imagePath]);
            
            \Log::info('Profile image saved', [
                'image_path' => $imagePath,
                'image_name' => $imageName,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Profile image uploaded successfully',
                'data' => [
                    'user' => [
                        'id' => $user->id,
                        'name' => $user->name,
                        'email' => $user->email,
                        'role' => $user->role,
                        'profile_image' => $user->profile_image && Storage::disk('public')->exists($user->profile_image) 
                        ? $this->getStorageBaseUrl() . '/api/storage/' . $user->profile_image
                        : null,
                        'phone' => $user->phone,
                        'address' => $user->address,
                        'city' => $user->city,
                        'state' => $user->state,
                        'zip_code' => $user->zip_code,
                        'country' => $user->country,
                        'date_of_birth' => $user->date_of_birth,
                        'gender' => $user->gender,
                        'updated_at' => $user->updated_at,
                    ]
                ]
            ]);
        } else {
            \Log::info('No profile image file found in request');
            return response()->json([
                'success' => false,
                'message' => 'No image file found in request'
            ], 400);
        }
    }

    /**
     * Change password
     */
    public function changePassword(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'current_password' => 'required|string',
            'new_password' => 'required|string|min:8|confirmed',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        $user = $request->user();

        // Check current password
        if (!Hash::check($request->current_password, $user->password)) {
            return response()->json([
                'success' => false,
                'message' => 'Current password is incorrect'
            ], 400);
        }

        // Update password
        $user->update([
            'password' => Hash::make($request->new_password)
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Password changed successfully'
        ]);
    }

    /**
     * Delete profile image
     */
    public function deleteProfileImage(Request $request): JsonResponse
    {
        $user = $request->user();

        if ($user->profile_image && Storage::disk('public')->exists($user->profile_image)) {
            Storage::disk('public')->delete($user->profile_image);
        }

        $user->update(['profile_image' => null]);

        return response()->json([
            'success' => true,
            'message' => 'Profile image deleted successfully',
            'data' => [
                'user' => [
                    'id' => $user->id,
                    'profile_image' => null,
                ]
            ]
        ]);
    }

    /**
     * Get profile statistics (for admin)
     */
    public function getStats(Request $request): JsonResponse
    {
        $user = $request->user();

        // Only allow admin to access stats
        if ($user->role !== 'admin') {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized access'
            ], 403);
        }

        $stats = [
            'total_users' => User::count(),
            'total_customers' => User::where('role', 'customer')->count(),
            'total_admins' => User::where('role', 'admin')->count(),
            'new_users_this_month' => User::whereMonth('created_at', now()->month)->count(),
            'users_with_profile_images' => User::whereNotNull('profile_image')->count(),
            'users_with_complete_profiles' => User::whereNotNull('phone')
                ->whereNotNull('address')
                ->whereNotNull('city')
                ->count(),
        ];

        return response()->json([
            'success' => true,
            'data' => $stats
        ]);
    }

    /**
     * Get all users (admin only)
     */
    public function getAllUsers(Request $request): JsonResponse
    {
        $user = $request->user();

        // Only allow admin to access all users
        if ($user->role !== 'admin') {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized access'
            ], 403);
        }

        $users = User::select([
            'id', 'name', 'email', 'role', 'profile_image', 'phone', 
            'city', 'state', 'created_at', 'updated_at'
        ])->orderBy('created_at', 'desc')->paginate(20);

        return response()->json([
            'success' => true,
            'data' => $users
        ]);
    }

    /**
     * Update user role (admin only)
     */
    public function updateUserRole(Request $request, $userId): JsonResponse
    {
        $admin = $request->user();

        // Only allow admin to update roles
        if ($admin->role !== 'admin') {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized access'
            ], 403);
        }

        $validator = Validator::make($request->all(), [
            'role' => 'required|in:customer,admin',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        $user = User::findOrFail($userId);
        
        // Prevent admin from changing their own role
        if ($user->id === $admin->id) {
            return response()->json([
                'success' => false,
                'message' => 'Cannot change your own role'
            ], 400);
        }

        // Prevent changing super admin role
        if ($user->isSuperAdmin()) {
            return response()->json([
                'success' => false,
                'message' => 'Cannot change super admin role. Super admin status is permanent.'
            ], 403);
        }

        $user->update(['role' => $request->role]);

        return response()->json([
            'success' => true,
            'message' => 'User role updated successfully',
            'data' => [
                'user' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'role' => $user->role,
                ]
            ]
        ]);
    }
}

