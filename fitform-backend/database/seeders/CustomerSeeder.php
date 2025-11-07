<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class CustomerSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $faker = \Faker\Factory::create();
        
        $this->command->info('Creating 100 customers...');
        
        for ($i = 1; $i <= 100; $i++) {
            $firstName = $faker->firstName();
            $lastName = $faker->lastName();
            $email = $faker->unique()->safeEmail();
            
            User::firstOrCreate(
                ['email' => $email],
                [
                    'name' => $firstName . ' ' . $lastName,
                    'password' => Hash::make('password123'),
                    'role' => 'customer',
                    'phone' => $faker->phoneNumber(),
                    'address' => $faker->streetAddress(),
                    'city' => $faker->city(),
                    'state' => $faker->state(),
                    'zip_code' => $faker->postcode(),
                    'country' => $faker->country(),
                    'date_of_birth' => $faker->date('Y-m-d', '2000-01-01'),
                    'gender' => $faker->randomElement(['male', 'female', 'other']),
                    'account_status' => $faker->randomElement(['active', 'suspended', 'banned']),
                ]
            );
            
            if ($i % 10 === 0) {
                $this->command->info("Created {$i} customers...");
            }
        }
        
        $this->command->info('✅ Successfully created 100 customers!');
    }
}

