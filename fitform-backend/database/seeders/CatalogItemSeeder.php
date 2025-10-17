<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\CatalogItem;

class CatalogItemSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $catalogItems = [
            // Formal Attire Category
            [
                'name' => 'Suit Katrina',
                'description' => 'Elegant Katrina-style suits for formal occasions',
                'clothing_type' => 'Suit Katrina',
                'category' => 'formal_attire',
                'image_path' => 'catalog/suit-katrina.webp',
                'measurements_required' => ['bust', 'waist', 'shoulder_width', 'arm_length', 'inseam'],
                'is_available' => true,
                'is_featured' => true,
                'sort_order' => 1,
                'notes' => 'Popular choice for formal events'
            ],
            [
                'name' => 'Suit Armani',
                'description' => 'Luxury Armani-style suits for premium occasions',
                'clothing_type' => 'Suit Armani',
                'category' => 'formal_attire',
                'image_path' => 'catalog/suit-armani.jpg',
                'measurements_required' => ['bust', 'waist', 'shoulder_width', 'arm_length', 'inseam'],
                'is_available' => true,
                'is_featured' => false,
                'sort_order' => 2,
                'notes' => 'High-end luxury option'
            ],
            [
                'name' => 'Suit Marty',
                'description' => 'Professional Marty-style suits for business events',
                'clothing_type' => 'Suit Marty',
                'category' => 'formal_attire',
                'image_path' => 'catalog/suit-marty.png',
                'measurements_required' => ['bust', 'waist', 'shoulder_width', 'arm_length', 'inseam'],
                'is_available' => true,
                'is_featured' => false,
                'sort_order' => 3,
                'notes' => 'Professional business attire'
            ],
            [
                'name' => 'Suit Costume',
                'description' => 'Themed costume suits for special events and parties',
                'clothing_type' => 'Suit Costume',
                'category' => 'formal_attire',
                'image_path' => 'catalog/suit-costume.jpg',
                'measurements_required' => ['bust', 'waist', 'hips', 'shoulder_width', 'arm_length', 'inseam'],
                'is_available' => true,
                'is_featured' => false,
                'sort_order' => 4,
                'notes' => 'Perfect for themed events'
            ],
            [
                'name' => 'Coat Barong',
                'description' => 'Formal coat-style barong for special occasions',
                'clothing_type' => 'Coat Barong',
                'category' => 'formal_attire',
                'image_path' => 'catalog/coat-barong.jpg',
                'measurements_required' => ['bust', 'waist', 'shoulder_width', 'arm_length'],
                'is_available' => true,
                'is_featured' => false,
                'sort_order' => 5,
                'notes' => 'Traditional Filipino formal wear'
            ],
            [
                'name' => 'Pants',
                'description' => 'Formal and casual pants for various occasions',
                'clothing_type' => 'Pants',
                'category' => 'formal_attire',
                'image_path' => 'catalog/pants.webp',
                'measurements_required' => ['waist', 'hips', 'inseam'],
                'is_available' => true,
                'is_featured' => false,
                'sort_order' => 6,
                'notes' => 'Versatile pants option'
            ],

            // Philippine Traditional Attire Category
            [
                'name' => 'Barong - Kids',
                'description' => 'Traditional Filipino formal wear for children',
                'clothing_type' => 'Barong - Kids',
                'category' => 'ph_traditional',
                'image_path' => 'catalog/barong-kids.webp',
                'measurements_required' => ['bust', 'waist', 'shoulder_width', 'arm_length'],
                'is_available' => true,
                'is_featured' => true,
                'sort_order' => 7,
                'notes' => 'Perfect for children\'s formal events'
            ],
            [
                'name' => 'Barong - Adults',
                'description' => 'Traditional Filipino formal wear for adults',
                'clothing_type' => 'Barong - Adults',
                'category' => 'ph_traditional',
                'image_path' => 'catalog/barong-adults.jpg',
                'measurements_required' => ['bust', 'waist', 'shoulder_width', 'arm_length'],
                'is_available' => true,
                'is_featured' => false,
                'sort_order' => 8,
                'notes' => 'Classic Filipino formal attire'
            ],
            [
                'name' => 'Filipiniana - Kids',
                'description' => 'Traditional Filipino dresses for children',
                'clothing_type' => 'Filipiniana - Kids',
                'category' => 'ph_traditional',
                'image_path' => 'catalog/filipiniana-kids.jpg',
                'measurements_required' => ['bust', 'waist', 'shoulder_width', 'arm_length'],
                'is_available' => true,
                'is_featured' => false,
                'sort_order' => 9,
                'notes' => 'Beautiful traditional dresses for girls'
            ],
            [
                'name' => 'Filipiniana - Bolero',
                'description' => 'Traditional Filipino dress with bolero jacket',
                'clothing_type' => 'Filipiniana - Bolero',
                'category' => 'ph_traditional',
                'image_path' => 'catalog/filipiniana-bolero.jpg',
                'measurements_required' => ['bust', 'waist', 'shoulder_width', 'arm_length'],
                'is_available' => true,
                'is_featured' => false,
                'sort_order' => 10,
                'notes' => 'Elegant with bolero jacket'
            ],
            [
                'name' => 'Filipiniana - Cocktail',
                'description' => 'Modern Filipiniana cocktail style',
                'clothing_type' => 'Filipiniana - Cocktail',
                'category' => 'ph_traditional',
                'image_path' => 'catalog/filipiniana-cocktail.jpg',
                'measurements_required' => ['bust', 'waist', 'hips', 'shoulder_width', 'arm_length'],
                'is_available' => true,
                'is_featured' => false,
                'sort_order' => 11,
                'notes' => 'Modern twist on traditional wear'
            ],
            [
                'name' => 'Filipiniana - Long Gown',
                'description' => 'Traditional long Filipiniana gowns',
                'clothing_type' => 'Filipiniana - Long Gown',
                'category' => 'ph_traditional',
                'image_path' => 'catalog/filipiniana-long-gown.jpg',
                'measurements_required' => ['bust', 'waist', 'hips', 'shoulder_width', 'arm_length'],
                'is_available' => true,
                'is_featured' => false,
                'sort_order' => 12,
                'notes' => 'Elegant long gown option'
            ],

            // Evening & Party Wear Category
            [
                'name' => 'Evening Gown - Kids',
                'description' => 'Elegant evening gowns for children',
                'clothing_type' => 'Evening Gown - Kids',
                'category' => 'evening_party_wear',
                'image_path' => 'catalog/evening-gown-kids.jpg',
                'measurements_required' => ['bust', 'waist', 'shoulder_width', 'arm_length'],
                'is_available' => true,
                'is_featured' => true,
                'sort_order' => 13,
                'notes' => 'Perfect for children\'s formal events'
            ],
            [
                'name' => 'Evening Gown - Adults',
                'description' => 'Elegant evening gowns for adults',
                'clothing_type' => 'Evening Gown - Adults',
                'category' => 'evening_party_wear',
                'image_path' => 'catalog/evening-gown-adults.jpg',
                'measurements_required' => ['bust', 'waist', 'hips', 'shoulder_width', 'arm_length'],
                'is_available' => true,
                'is_featured' => false,
                'sort_order' => 14,
                'notes' => 'Stunning evening wear'
            ],
            [
                'name' => 'Cocktail Dress',
                'description' => 'Stylish cocktail dresses for parties',
                'clothing_type' => 'Cocktail Dress',
                'category' => 'evening_party_wear',
                'image_path' => 'catalog/filipiniana-cocktail.jpg',
                'measurements_required' => ['bust', 'waist', 'hips', 'shoulder_width', 'arm_length'],
                'is_available' => true,
                'is_featured' => false,
                'sort_order' => 15,
                'notes' => 'Perfect for cocktail parties'
            ],
            [
                'name' => 'BallGown - Minimalist',
                'description' => 'Elegant minimalist ball gowns',
                'clothing_type' => 'BallGown - Minimalist',
                'category' => 'evening_party_wear',
                'image_path' => 'catalog/ballgown-minimalist.jpg',
                'measurements_required' => ['bust', 'waist', 'hips', 'shoulder_width', 'arm_length'],
                'is_available' => true,
                'is_featured' => false,
                'sort_order' => 16,
                'notes' => 'Elegant minimalist design'
            ],
            [
                'name' => 'BallGown - Luxe',
                'description' => 'Luxurious high-end ball gowns',
                'clothing_type' => 'BallGown - Luxe',
                'category' => 'evening_party_wear',
                'image_path' => 'catalog/ballgown-luxe.jpg',
                'measurements_required' => ['bust', 'waist', 'hips', 'shoulder_width', 'arm_length'],
                'is_available' => true,
                'is_featured' => true,
                'sort_order' => 17,
                'notes' => 'Luxury high-end option'
            ],
            [
                'name' => 'BallGown - Royal',
                'description' => 'Royal-style majestic ball gowns',
                'clothing_type' => 'BallGown - Royal',
                'category' => 'evening_party_wear',
                'image_path' => 'catalog/ballgown-royal.webp',
                'measurements_required' => ['bust', 'waist', 'hips', 'shoulder_width', 'arm_length'],
                'is_available' => true,
                'is_featured' => false,
                'sort_order' => 18,
                'notes' => 'Majestic royal style'
            ],

            // Wedding & Bridal Collection Category
            [
                'name' => 'Wedding Gown',
                'description' => 'Beautiful wedding gowns for the bride',
                'clothing_type' => 'Wedding Gown',
                'category' => 'wedding_bridal',
                'image_path' => 'catalog/wedding-gown.jpg',
                'measurements_required' => ['bust', 'waist', 'hips', 'shoulder_width', 'arm_length'],
                'is_available' => true,
                'is_featured' => true,
                'sort_order' => 19,
                'notes' => 'The perfect wedding gown'
            ],
            [
                'name' => 'Civil Wedding',
                'description' => 'Elegant dresses for civil wedding ceremonies',
                'clothing_type' => 'Civil Wedding',
                'category' => 'wedding_bridal',
                'image_path' => 'catalog/civil-wedding.jpg',
                'measurements_required' => ['bust', 'waist', 'hips', 'shoulder_width', 'arm_length'],
                'is_available' => true,
                'is_featured' => false,
                'sort_order' => 20,
                'notes' => 'Perfect for civil ceremonies'
            ],
            [
                'name' => 'Mermaid',
                'description' => 'Stunning mermaid-style wedding gowns',
                'clothing_type' => 'Mermaid',
                'category' => 'wedding_bridal',
                'image_path' => 'catalog/mermaid.webp',
                'measurements_required' => ['bust', 'waist', 'hips', 'shoulder_width', 'arm_length'],
                'is_available' => true,
                'is_featured' => false,
                'sort_order' => 21,
                'notes' => 'Stunning mermaid silhouette'
            ],
            [
                'name' => 'Mother\'s Dress',
                'description' => 'Elegant dresses for mothers of the bride/groom',
                'clothing_type' => 'Mother\'s Dress',
                'category' => 'wedding_bridal',
                'image_path' => 'catalog/mother-dress.jpg',
                'measurements_required' => ['bust', 'waist', 'hips', 'shoulder_width', 'arm_length'],
                'is_available' => true,
                'is_featured' => false,
                'sort_order' => 22,
                'notes' => 'Elegant mother of the bride/groom'
            ],
            [
                'name' => 'Bridesmaid',
                'description' => 'Beautiful bridesmaid dresses',
                'clothing_type' => 'Bridesmaid',
                'category' => 'wedding_bridal',
                'image_path' => 'catalog/bridemaid.jpg',
                'measurements_required' => ['bust', 'waist', 'hips', 'shoulder_width', 'arm_length'],
                'is_available' => true,
                'is_featured' => false,
                'sort_order' => 23,
                'notes' => 'Beautiful bridesmaid option'
            ]
        ];

        foreach ($catalogItems as $item) {
            CatalogItem::create($item);
        }
    }
}
