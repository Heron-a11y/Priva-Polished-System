<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\CatalogItem;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;

class CatalogController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $query = CatalogItem::query();

        // Filter by category
        if ($request->has('category') && $request->category !== 'all') {
            if ($request->category === 'special') {
                // Popular category shows all featured items regardless of their original category
                $query->where('is_featured', true);
            } else {
                $query->where('category', $request->category);
            }
        }

        // Filter by availability
        if ($request->has('available_only') && $request->available_only) {
            $query->where('is_available', true);
        }

        // Search by name or description
        if ($request->has('search') && $request->search) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%")
                  ->orWhere('clothing_type', 'like', "%{$search}%");
            });
        }

        // Sort by sort_order, then by name
        $query->orderBy('sort_order')->orderBy('name');

        $items = $query->get();

        return response()->json([
            'success' => true,
            'data' => $items,
            'categories' => $this->getCategories()
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'clothing_type' => 'required|string|max:255',
            'category' => 'required|string|in:formal_attire,ph_traditional,evening_party_wear,wedding_bridal,special',
            'image' => 'nullable|image|mimes:jpeg,png,jpg,gif,webp|max:2048',
            'measurements_required' => 'required|array|min:1',
            'measurements_required.*' => 'string|in:bust,waist,hips,shoulder_width,arm_length,inseam',
            'is_available' => 'boolean',
            'is_featured' => 'boolean',
            'sort_order' => 'integer|min:0',
            'notes' => 'nullable|string'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        $data = $request->all();
        
        // Debug: Log received data
        \Log::info('📝 Received catalog data:', $data);

        // Handle image upload
        if ($request->hasFile('image')) {
            $imagePath = $request->file('image')->store('catalog', 'public');
            $data['image_path'] = $imagePath;
        }

        $catalogItem = CatalogItem::create($data);

        return response()->json([
            'success' => true,
            'data' => $catalogItem,
            'message' => 'Catalog item created successfully'
        ], 201);
    }

    /**
     * Display the specified resource.
     */
    public function show($id)
    {
        $item = CatalogItem::find($id);

        if (!$item) {
            return response()->json([
                'success' => false,
                'message' => 'Catalog item not found'
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $item
        ]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, $id)
    {
        $item = CatalogItem::find($id);

        if (!$item) {
            return response()->json([
                'success' => false,
                'message' => 'Catalog item not found'
            ], 404);
        }

        $validator = Validator::make($request->all(), [
            'name' => 'sometimes|required|string|max:255',
            'description' => 'nullable|string',
            'clothing_type' => 'sometimes|required|string|max:255',
            'category' => 'sometimes|required|string|in:formal_attire,ph_traditional,evening_party_wear,wedding_bridal,special',
            'image' => 'nullable|image|mimes:jpeg,png,jpg,gif,webp|max:2048',
            'measurements_required' => 'sometimes|required|array|min:1',
            'measurements_required.*' => 'string|in:bust,waist,hips,shoulder_width,arm_length,inseam',
            'is_available' => 'boolean',
            'is_featured' => 'boolean',
            'sort_order' => 'integer|min:0',
            'notes' => 'nullable|string'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        $data = $request->all();

        // Handle image upload
        if ($request->hasFile('image')) {
            // Delete old image if exists
            if ($item->image_path && Storage::disk('public')->exists($item->image_path)) {
                Storage::disk('public')->delete($item->image_path);
            }
            
            $imagePath = $request->file('image')->store('catalog', 'public');
            $data['image_path'] = $imagePath;
        }

        $item->update($data);

        // Handle category management based on featured status
        if ($request->has('is_featured')) {
            $item->updateCategoryBasedOnFeatured();
        }

        return response()->json([
            'success' => true,
            'data' => $item,
            'message' => 'Catalog item updated successfully'
        ]);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy($id)
    {
        $item = CatalogItem::find($id);

        if (!$item) {
            return response()->json([
                'success' => false,
                'message' => 'Catalog item not found'
            ], 404);
        }

        // Delete associated image
        if ($item->image_path && Storage::disk('public')->exists($item->image_path)) {
            Storage::disk('public')->delete($item->image_path);
        }

        $item->delete();

        return response()->json([
            'success' => true,
            'message' => 'Catalog item deleted successfully'
        ]);
    }

    /**
     * Get available categories
     */
    private function getCategories()
    {
        return [
            'formal_attire' => 'Formal Attire',
            'ph_traditional' => 'Philippine Traditional',
            'evening_party_wear' => 'Evening & Party Wear',
            'wedding_bridal' => 'Wedding & Bridal',
            'special' => 'Popular'
        ];
    }

    /**
     * Get catalog items for customers (public endpoint)
     */
    public function getCustomerCatalog(Request $request)
    {
        $query = CatalogItem::query();

        // Only show available items to customers
        $query->where('is_available', true);

        // Filter by category
        if ($request->has('category') && $request->category !== 'all') {
            if ($request->category === 'popular') {
                // Popular category shows all featured items
                $query->where('is_featured', true);
            } else {
                $query->where('category', $request->category);
            }
        }

        // Search by name or description
        if ($request->has('search') && $request->search) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%")
                  ->orWhere('clothing_type', 'like', "%{$search}%");
            });
        }

        // Sort by sort_order, then by name
        $query->orderBy('sort_order')->orderBy('name');

        $items = $query->get();

        return response()->json([
            'success' => true,
            'data' => $items,
            'categories' => $this->getCategories()
        ]);
    }

    /**
     * Update featured status and manage category
     */
    public function updateFeaturedStatus(Request $request, $id)
    {
        $item = CatalogItem::find($id);

        if (!$item) {
            return response()->json([
                'success' => false,
                'message' => 'Catalog item not found'
            ], 404);
        }

        $validator = Validator::make($request->all(), [
            'is_featured' => 'required|boolean'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        $item->is_featured = $request->is_featured;
        $item->save();

        // Handle category management based on featured status
        $item->updateCategoryBasedOnFeatured();

        return response()->json([
            'success' => true,
            'data' => $item,
            'message' => 'Featured status updated successfully'
        ]);
    }

    /**
     * Bulk update sort order
     */
    public function updateSortOrder(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'items' => 'required|array',
            'items.*.id' => 'required|integer|exists:catalog_items,id',
            'items.*.sort_order' => 'required|integer|min:0'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        foreach ($request->items as $item) {
            CatalogItem::where('id', $item['id'])
                ->update(['sort_order' => $item['sort_order']]);
        }

        return response()->json([
            'success' => true,
            'message' => 'Sort order updated successfully'
        ]);
    }
}
