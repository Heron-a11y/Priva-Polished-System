<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class CatalogItem extends Model
{
    use HasFactory;
    
    protected $fillable = [
        'name',
        'description',
        'clothing_type',
        'category',
        'image_path',
        'measurements_required',
        'is_available',
        'is_featured',
        'sort_order',
        'notes'
    ];

    protected $casts = [
        'measurements_required' => 'array',
        'is_available' => 'boolean',
        'is_featured' => 'boolean',
        'sort_order' => 'integer'
    ];

    // Method to handle category management based on featured status
    public function updateCategoryBasedOnFeatured()
    {
        if ($this->is_featured) {
            // If item is featured, move to special (Popular) category
            $this->update(['category' => 'special']);
        } else {
            // If item is no longer featured, determine original category
            // For now, we'll use a simple logic to determine the original category
            $this->determineAndSetOriginalCategory();
        }
    }

    // Determine original category based on item characteristics
    private function determineAndSetOriginalCategory()
    {
        $name = strtolower($this->name);
        
        if (strpos($name, 'barong') !== false || strpos($name, 'filipiniana') !== false) {
            $this->update(['category' => 'ph_traditional']);
        } elseif (strpos($name, 'wedding') !== false || strpos($name, 'bridal') !== false || 
                   strpos($name, 'mermaid') !== false || strpos($name, 'mother') !== false || 
                   strpos($name, 'bridesmaid') !== false || strpos($name, 'civil') !== false) {
            $this->update(['category' => 'wedding_bridal']);
        } elseif (strpos($name, 'evening') !== false || strpos($name, 'cocktail') !== false || 
                   strpos($name, 'ballgown') !== false || strpos($name, 'ball gown') !== false) {
            $this->update(['category' => 'evening_party_wear']);
        } else {
            // Default to formal attire for suits and other items
            $this->update(['category' => 'formal_attire']);
        }
    }

    // Scope for available items
    public function scopeAvailable($query)
    {
        return $query->where('is_available', true);
    }

    // Scope for featured items
    public function scopeFeatured($query)
    {
        return $query->where('is_featured', true);
    }

    // Scope for category
    public function scopeByCategory($query, $category)
    {
        return $query->where('category', $category);
    }

    // Get image URL from stored image path
    public function getImageUrlAttribute()
    {
        if ($this->attributes['image_path']) {
            return asset('storage/' . $this->attributes['image_path']);
        }
        
        return null;
    }
}
