<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\SizingStandard;
use App\Models\SizeRecommendation;
use App\Models\User;

class SizingStandardSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Get admin user for updated_by field
        $admin = User::where('role', 'admin')->first();
        
        if (!$admin) {
            $admin = User::first(); // Fallback to first user
        }

        // Clear related records first to avoid foreign key constraint issues
        SizeRecommendation::truncate();
        
        // Remove all predefined standards
        SizingStandard::query()->delete();
        
        // Create a basic sizing standard so customers can get recommendations
        // This will be a template that admins can modify or use as reference
        SizingStandard::create([
            'name' => 'Basic Men\'s Shirts Standard',
            'category' => 'shirts',
            'gender' => 'male',
            'measurements' => [
                'chest' => 40,
                'waist' => 32,
                'hips' => 36,
                'length' => 28,
                'shoulder' => 18,
                'sleeve' => 25,
            ],
            'size_categories' => [
                'XS' => ['chest' => 34, 'waist' => 26, 'hips' => 30, 'length' => 26, 'shoulder' => 16, 'sleeve' => 23],
                'S' => ['chest' => 36, 'waist' => 28, 'hips' => 32, 'length' => 27, 'shoulder' => 17, 'sleeve' => 24],
                'M' => ['chest' => 40, 'waist' => 32, 'hips' => 36, 'length' => 28, 'shoulder' => 18, 'sleeve' => 25],
                'L' => ['chest' => 44, 'waist' => 36, 'hips' => 40, 'length' => 29, 'shoulder' => 19, 'sleeve' => 26],
                'XL' => ['chest' => 48, 'waist' => 40, 'hips' => 44, 'length' => 30, 'shoulder' => 20, 'sleeve' => 27],
                'XXL' => ['chest' => 52, 'waist' => 44, 'hips' => 48, 'length' => 31, 'shoulder' => 21, 'sleeve' => 28],
            ],
            'is_active' => true,
            'updated_by' => $admin ? $admin->id : 1
        ]);
        
        // Create a basic women's standard as well
        SizingStandard::create([
            'name' => 'Basic Women\'s Dresses Standard',
            'category' => 'dresses',
            'gender' => 'female',
            'measurements' => [
                'chest' => 36,
                'waist' => 28,
                'hips' => 38,
                'length' => 35,
                'bust' => 36,
                'shoulder' => 16,
            ],
            'size_categories' => [
                'XS' => ['chest' => 32, 'waist' => 24, 'hips' => 34, 'length' => 33, 'bust' => 32, 'shoulder' => 14],
                'S' => ['chest' => 34, 'waist' => 26, 'hips' => 36, 'length' => 34, 'bust' => 34, 'shoulder' => 15],
                'M' => ['chest' => 36, 'waist' => 28, 'hips' => 38, 'length' => 35, 'bust' => 36, 'shoulder' => 16],
                'L' => ['chest' => 38, 'waist' => 30, 'hips' => 40, 'length' => 36, 'bust' => 38, 'shoulder' => 17],
                'XL' => ['chest' => 40, 'waist' => 32, 'hips' => 42, 'length' => 37, 'bust' => 40, 'shoulder' => 18],
                'XXL' => ['chest' => 42, 'waist' => 34, 'hips' => 44, 'length' => 38, 'bust' => 42, 'shoulder' => 19],
            ],
            'is_active' => true,
            'updated_by' => $admin ? $admin->id : 1
        ]);
        
        $this->command->info('Basic sizing standards created. Admins can now create additional standards.');
    }
}
