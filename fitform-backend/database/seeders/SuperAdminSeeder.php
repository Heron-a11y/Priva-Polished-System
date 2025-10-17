<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\User;

class SuperAdminSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Find the admin@fitform.com user and make them a super admin
        $adminUser = User::where('email', 'admin@fitform.com')->first();
        
        if ($adminUser) {
            $adminUser->update([
                'is_super_admin' => true,
                'role' => 'admin'
            ]);
            
            $this->command->info('✅ Super admin status granted to admin@fitform.com');
        } else {
            // Create the super admin user if it doesn't exist
            User::create([
                'name' => 'Admin User',
                'email' => 'admin@fitform.com',
                'password' => bcrypt('password'), // Default password
                'role' => 'admin',
                'is_super_admin' => true,
                'account_status' => 'active'
            ]);
            
            $this->command->info('✅ Super admin user created: admin@fitform.com');
        }
    }
}
