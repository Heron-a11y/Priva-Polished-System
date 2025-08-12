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
        // Create admin user
        User::create([
            'name' => 'Admin User',
            'email' => 'admin@fitform.com',
            'password' => Hash::make('password123'),
            'role' => 'admin',
        ]);

        // Create sample customer users
        User::create([
            'name' => 'John Customer',
            'email' => 'customer@fitform.com',
            'password' => Hash::make('password123'),
            'role' => 'customer',
        ]);

        User::create([
            'name' => 'Jane Customer',
            'email' => 'jane@fitform.com',
            'password' => Hash::make('password123'),
            'role' => 'customer',
        ]);
    }
} 