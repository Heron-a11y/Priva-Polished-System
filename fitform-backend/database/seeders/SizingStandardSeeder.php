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
                'length' => 28,
                'shoulder' => 18,
                'sleeve' => 25,
            ],
            'size_categories' => [
                'XS' => ['chest' => 34, 'waist' => 26, 'length' => 26, 'shoulder' => 16, 'sleeve' => 23],
                'S' => ['chest' => 36, 'waist' => 28, 'length' => 27, 'shoulder' => 17, 'sleeve' => 24],
                'M' => ['chest' => 40, 'waist' => 32, 'length' => 28, 'shoulder' => 18, 'sleeve' => 25],
                'L' => ['chest' => 44, 'waist' => 36, 'length' => 29, 'shoulder' => 19, 'sleeve' => 26],
                'XL' => ['chest' => 48, 'waist' => 40, 'length' => 30, 'shoulder' => 20, 'sleeve' => 27],
                'XXL' => ['chest' => 52, 'waist' => 44, 'length' => 31, 'shoulder' => 21, 'sleeve' => 28],
            ],
            'is_active' => true,
            'updated_by' => $admin ? $admin->id : 1
        ]);
        
        // Create a basic women's dresses standard
        SizingStandard::create([
            'name' => 'Basic Women\'s Dresses Standard',
            'category' => 'dresses',
            'gender' => 'female',
            'measurements' => [
                'chest' => 36,
                'waist' => 28,
                'hips' => 38,
                'length' => 35,
                'shoulder' => 16,
            ],
            'size_categories' => [
                'XS' => ['chest' => 32, 'waist' => 24, 'hips' => 34, 'length' => 33, 'shoulder' => 14],
                'S' => ['chest' => 34, 'waist' => 26, 'hips' => 36, 'length' => 34, 'shoulder' => 15],
                'M' => ['chest' => 36, 'waist' => 28, 'hips' => 38, 'length' => 35, 'shoulder' => 16],
                'L' => ['chest' => 38, 'waist' => 30, 'hips' => 40, 'length' => 36, 'shoulder' => 17],
                'XL' => ['chest' => 40, 'waist' => 32, 'hips' => 42, 'length' => 37, 'shoulder' => 18],
                'XXL' => ['chest' => 42, 'waist' => 34, 'hips' => 44, 'length' => 38, 'shoulder' => 19],
            ],
            'is_active' => true,
            'updated_by' => $admin ? $admin->id : 1
        ]);

        // Create a basic men's pants standard
        SizingStandard::create([
            'name' => 'Basic Men\'s Pants Standard',
            'category' => 'pants',
            'gender' => 'male',
            'measurements' => [
                'waist' => 32,
                'hips' => 36,
                'length' => 32,
                'inseam' => 30,
                'thigh' => 22,
            ],
            'size_categories' => [
                'XS' => ['waist' => 26, 'hips' => 30, 'length' => 30, 'inseam' => 28, 'thigh' => 20],
                'S' => ['waist' => 28, 'hips' => 32, 'length' => 31, 'inseam' => 29, 'thigh' => 21],
                'M' => ['waist' => 32, 'hips' => 36, 'length' => 32, 'inseam' => 30, 'thigh' => 22],
                'L' => ['waist' => 36, 'hips' => 40, 'length' => 33, 'inseam' => 31, 'thigh' => 23],
                'XL' => ['waist' => 40, 'hips' => 44, 'length' => 34, 'inseam' => 32, 'thigh' => 24],
                'XXL' => ['waist' => 44, 'hips' => 48, 'length' => 35, 'inseam' => 33, 'thigh' => 25],
            ],
            'is_active' => true,
            'updated_by' => $admin ? $admin->id : 1
        ]);

        // Create a basic women's skirts standard
        SizingStandard::create([
            'name' => 'Basic Women\'s Skirts Standard',
            'category' => 'skirts',
            'gender' => 'female',
            'measurements' => [
                'waist' => 28,
                'hips' => 38,
                'length' => 22,
            ],
            'size_categories' => [
                'XS' => ['waist' => 24, 'hips' => 34, 'length' => 20],
                'S' => ['waist' => 26, 'hips' => 36, 'length' => 21],
                'M' => ['waist' => 28, 'hips' => 38, 'length' => 22],
                'L' => ['waist' => 30, 'hips' => 40, 'length' => 23],
                'XL' => ['waist' => 32, 'hips' => 42, 'length' => 24],
                'XXL' => ['waist' => 34, 'hips' => 44, 'length' => 25],
            ],
            'is_active' => true,
            'updated_by' => $admin ? $admin->id : 1
        ]);

        // Create a basic men's jackets standard
        SizingStandard::create([
            'name' => 'Basic Men\'s Jackets Standard',
            'category' => 'jackets',
            'gender' => 'male',
            'measurements' => [
                'chest' => 40,
                'waist' => 32,
                'length' => 28,
                'shoulder' => 18,
                'sleeve' => 25,
            ],
            'size_categories' => [
                'XS' => ['chest' => 34, 'waist' => 26, 'length' => 26, 'shoulder' => 16, 'sleeve' => 23],
                'S' => ['chest' => 36, 'waist' => 28, 'length' => 27, 'shoulder' => 17, 'sleeve' => 24],
                'M' => ['chest' => 40, 'waist' => 32, 'length' => 28, 'shoulder' => 18, 'sleeve' => 25],
                'L' => ['chest' => 44, 'waist' => 36, 'length' => 29, 'shoulder' => 19, 'sleeve' => 26],
                'XL' => ['chest' => 48, 'waist' => 40, 'length' => 30, 'shoulder' => 20, 'sleeve' => 27],
                'XXL' => ['chest' => 52, 'waist' => 44, 'length' => 31, 'shoulder' => 21, 'sleeve' => 28],
            ],
            'is_active' => true,
            'updated_by' => $admin ? $admin->id : 1
        ]);

        // Create a basic men's suits standard
        SizingStandard::create([
            'name' => 'Basic Men\'s Suits Standard',
            'category' => 'suits',
            'gender' => 'male',
            'measurements' => [
                'chest' => 40,
                'waist' => 32,
                'hips' => 36,
                'length' => 28,
                'shoulder' => 18,
                'sleeve' => 25,
                'inseam' => 30,
            ],
            'size_categories' => [
                'XS' => ['chest' => 34, 'waist' => 26, 'hips' => 30, 'length' => 26, 'shoulder' => 16, 'sleeve' => 23, 'inseam' => 28],
                'S' => ['chest' => 36, 'waist' => 28, 'hips' => 32, 'length' => 27, 'shoulder' => 17, 'sleeve' => 24, 'inseam' => 29],
                'M' => ['chest' => 40, 'waist' => 32, 'hips' => 36, 'length' => 28, 'shoulder' => 18, 'sleeve' => 25, 'inseam' => 30],
                'L' => ['chest' => 44, 'waist' => 36, 'hips' => 40, 'length' => 29, 'shoulder' => 19, 'sleeve' => 26, 'inseam' => 31],
                'XL' => ['chest' => 48, 'waist' => 40, 'hips' => 44, 'length' => 30, 'shoulder' => 20, 'sleeve' => 27, 'inseam' => 32],
                'XXL' => ['chest' => 52, 'waist' => 44, 'hips' => 48, 'length' => 31, 'shoulder' => 21, 'sleeve' => 28, 'inseam' => 33],
            ],
            'is_active' => true,
            'updated_by' => $admin ? $admin->id : 1
        ]);

        // Create a basic women's activewear standard
        SizingStandard::create([
            'name' => 'Basic Women\'s Activewear Standard',
            'category' => 'activewear',
            'gender' => 'female',
            'measurements' => [
                'chest' => 36,
                'waist' => 28,
                'hips' => 38,
                'length' => 25,
            ],
            'size_categories' => [
                'XS' => ['chest' => 32, 'waist' => 24, 'hips' => 34, 'length' => 23],
                'S' => ['chest' => 34, 'waist' => 26, 'hips' => 36, 'length' => 24],
                'M' => ['chest' => 36, 'waist' => 28, 'hips' => 38, 'length' => 25],
                'L' => ['chest' => 38, 'waist' => 30, 'hips' => 40, 'length' => 26],
                'XL' => ['chest' => 40, 'waist' => 32, 'hips' => 42, 'length' => 27],
                'XXL' => ['chest' => 42, 'waist' => 34, 'hips' => 44, 'length' => 28],
            ],
            'is_active' => true,
            'updated_by' => $admin ? $admin->id : 1
        ]);
        
        $this->command->info('Basic sizing standards created. Admins can now create additional standards.');
    }
}
