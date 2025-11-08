<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;

class AuthController extends Controller
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
     * Register a new customer
     */
    public function register(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users',
            'password' => 'required|string|min:8|confirmed',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        $user = User::create([
            'name' => $request->name,
            'email' => $request->email,
            'password' => Hash::make($request->password),
            'role' => 'customer', // Registration is customer-only
        ]);

        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'success' => true,
            'message' => 'Customer registered successfully',
            'data' => [
                'user' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'role' => $user->role,
                ],
                'token' => $token,
                'token_type' => 'Bearer',
            ]
        ], 201);
    }

    /**
     * Login user
     */
    public function login(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'email' => 'required|string|email',
            'password' => 'required|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        if (!Auth::attempt($request->only('email', 'password'))) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid credentials'
            ], 401);
        }

        $user = User::where('email', $request->email)->firstOrFail();
        
        // Check account status
        if ($user->account_status === 'suspended') {
            return response()->json([
                'success' => false,
                'message' => 'Your account has been suspended. Please contact the administrator for more information.',
                'account_status' => 'suspended',
                'suspension_details' => [
                    'start_date' => $user->suspension_start,
                    'end_date' => $user->suspension_end,
                    'reason' => $user->suspension_reason,
                ]
            ], 403);
        }
        
        if ($user->account_status === 'banned') {
            return response()->json([
                'success' => false,
                'message' => 'Your account has been permanently banned. Please contact the administrator for more information.',
                'account_status' => 'banned',
                'ban_reason' => $user->ban_reason
            ], 403);
        }
        
        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'success' => true,
            'message' => 'Login successful',
            'data' => [
                'user' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'role' => $user->role,
                    'profile_image' => $user->profile_image && \Illuminate\Support\Facades\Storage::disk('public')->exists($user->profile_image) 
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
                ],
                'token' => $token,
                'token_type' => 'Bearer',
            ]
        ]);
    }

    /**
     * Logout user
     */
    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'success' => true,
            'message' => 'Logged out successfully'
        ]);
    }

    /**
     * Get authenticated user
     */
    public function me(Request $request): JsonResponse
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
                    'profile_image' => $user->profile_image && \Illuminate\Support\Facades\Storage::disk('public')->exists($user->profile_image) 
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
                ]
            ]
        ]);
    }
} 