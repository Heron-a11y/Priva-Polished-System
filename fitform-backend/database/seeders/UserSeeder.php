<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;
use Illuminate\Support\Facades\Hash;

class UserSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Create admin user if it doesn't exist
        User::firstOrCreate(
            ['email' => 'admin@fitform.com'],
            [
                'name' => 'Admin User',
                'password' => Hash::make('password123'),
                'role' => 'admin',
            ]
        );

        // Create sample customer users if they don't exist
        User::firstOrCreate(
            ['email' => 'customer@fitform.com'],
            [
                'name' => 'John Customer',
                'password' => Hash::make('password123'),
                'role' => 'customer',
            ]
        );

        User::firstOrCreate(
            ['email' => 'jane@fitform.com'],
            [
                'name' => 'Jane Customer',
                'password' => Hash::make('password123'),
                'role' => 'customer',
            ]
        );
    }
} 