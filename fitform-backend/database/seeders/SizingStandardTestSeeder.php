<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\SizingStandard;
use App\Models\User;

class SizingStandardTestSeeder extends Seeder
{
    /**
     * Run the database seeds.
     * Creates 30 sizing standards for pagination testing
     */
    public function run(): void
    {
        // Get admin user for updated_by field
        $admin = User::where('role', 'admin')->first();
        
        if (!$admin) {
            $admin = User::first(); // Fallback to first user
        }

        $categories = ['shirts', 'pants', 'dresses', 'jackets', 'skirts', 'shoes', 'hats', 'suits', 'activewear'];
        $genders = ['male', 'female', 'unisex'];
        
        // Measurement templates for different categories
        $measurementTemplates = [
            'shirts' => ['chest', 'waist', 'length', 'shoulder', 'sleeve'],
            'pants' => ['waist', 'hips', 'length', 'inseam', 'thigh'],
            'dresses' => ['chest', 'waist', 'hips', 'length', 'shoulder'],
            'jackets' => ['chest', 'waist', 'length', 'shoulder', 'sleeve'],
            'skirts' => ['waist', 'hips', 'length'],
            'shoes' => ['foot_length'],
            'hats' => ['head_circumference'],
            'suits' => ['chest', 'waist', 'hips', 'length', 'shoulder', 'sleeve', 'inseam'],
            'activewear' => ['chest', 'waist', 'hips', 'length'],
        ];

        $sizeCategories = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];

        echo "Creating 30 sizing standards for pagination testing...\n";

        for ($i = 1; $i <= 30; $i++) {
            $category = $categories[array_rand($categories)];
            $gender = $genders[array_rand($genders)];
            $measurementFields = $measurementTemplates[$category];
            
            // Generate base measurements
            $baseMeasurements = [];
            foreach ($measurementFields as $field) {
                // Generate realistic measurement values based on field type
                if ($field === 'chest') {
                    $baseMeasurements[$field] = rand(34, 52);
                } elseif ($field === 'waist') {
                    $baseMeasurements[$field] = rand(26, 44);
                } elseif ($field === 'hips') {
                    $baseMeasurements[$field] = rand(34, 48);
                } elseif ($field === 'length') {
                    $baseMeasurements[$field] = rand(20, 35);
                } elseif ($field === 'shoulder') {
                    $baseMeasurements[$field] = rand(14, 22);
                } elseif ($field === 'sleeve') {
                    $baseMeasurements[$field] = rand(23, 30);
                } elseif ($field === 'inseam') {
                    $baseMeasurements[$field] = rand(28, 34);
                } elseif ($field === 'thigh') {
                    $baseMeasurements[$field] = rand(20, 26);
                } elseif ($field === 'foot_length') {
                    $baseMeasurements[$field] = rand(8, 12);
                } elseif ($field === 'head_circumference') {
                    $baseMeasurements[$field] = rand(20, 24);
                } else {
                    $baseMeasurements[$field] = rand(20, 40);
                }
            }
            
            // Generate size categories with variations from base
            $sizeCategoriesData = [];
            foreach ($sizeCategories as $size) {
                $sizeMeasurements = [];
                foreach ($measurementFields as $field) {
                    $baseValue = $baseMeasurements[$field];
                    // Create size variations (XS is smaller, XXL is larger)
                    $multiplier = match($size) {
                        'XS' => 0.85,
                        'S' => 0.92,
                        'M' => 1.0,
                        'L' => 1.08,
                        'XL' => 1.15,
                        'XXL' => 1.22,
                        default => 1.0
                    };
                    $sizeMeasurements[$field] = (int)round($baseValue * $multiplier);
                }
                $sizeCategoriesData[$size] = $sizeMeasurements;
            }
            
            // Generate name
            $categoryName = ucfirst($category);
            $genderName = ucfirst($gender);
            $name = "Test {$genderName} {$categoryName} Standard #{$i}";
            
            SizingStandard::create([
                'name' => $name,
                'category' => $category,
                'gender' => $gender,
                'measurements' => $baseMeasurements,
                'size_categories' => $sizeCategoriesData,
                'is_active' => rand(0, 1) === 1, // Randomly active/inactive
                'updated_by' => $admin ? $admin->id : 1
            ]);
            
            if ($i % 10 === 0) {
                echo "Created {$i} sizing standards...\n";
            }
        }
        
        echo "✅ Successfully created 30 sizing standards!\n";
    }
}

