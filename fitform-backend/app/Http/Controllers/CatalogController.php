<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\CatalogItem;
use App\Models\User;
use App\Models\Notification;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Log;

class CatalogController extends PaginatedController
{
    /**
     * Create notification for catalog events
     */
    private function createCatalogNotification($userId, $senderRole, $message, $catalogItemId = null)
    {
        Notification::create([
            'user_id' => $userId,
            'sender_role' => $senderRole,
            'message' => $message,
            'read' => false,
            'order_id' => $catalogItemId,
            'order_type' => 'catalog'
        ]);
    }

    /**
     * Notify all customers about catalog events
     */
    private function notifyAllCustomers($message, $catalogItemId = null)
    {
        $customers = User::where('role', 'customer')->get();
        foreach ($customers as $customer) {
            $this->createCatalogNotification($customer->id, 'admin', $message, $catalogItemId);
        }
    }

    /**
     * Notify customers about new popular items
     */
    private function notifyCustomersAboutPopularItem($catalogItem)
    {
        $message = "New popular item added: {$catalogItem->name} - {$catalogItem->clothing_type}";
        $this->notifyAllCustomers($message, $catalogItem->id);
        
        Log::info('Popular item notification sent to customers', [
            'catalog_item_id' => $catalogItem->id,
            'item_name' => $catalogItem->name,
            'customers_notified' => User::where('role', 'customer')->count()
        ]);
    }

    /**
     * Notify customers about catalog updates
     */
    private function notifyCustomersAboutCatalogUpdate($catalogItem, $action = 'updated')
    {
        $message = "Catalog item {$action}: {$catalogItem->name} - {$catalogItem->clothing_type}";
        $this->notifyAllCustomers($message, $catalogItem->id);
        
        Log::info("Catalog {$action} notification sent to customers", [
            'catalog_item_id' => $catalogItem->id,
            'item_name' => $catalogItem->name,
            'action' => $action,
            'customers_notified' => User::where('role', 'customer')->count()
        ]);
    }

    /**
     * Display a listing of the resource with pagination.
     */
    public function index(Request $request)
    {
        try {
            $query = CatalogItem::query();

            // Configure pagination options
            $options = [
                'search_fields' => ['name', 'description', 'clothing_type'],
                'filter_fields' => ['category', 'is_available', 'is_featured'],
                'sort_fields' => ['sort_order', 'name', 'created_at', 'updated_at'],
                'default_per_page' => 10,
                'max_per_page' => 100,
                'transform' => function ($item) {
                    // Ensure image URL is properly formatted
                    if ($item->image_path) {
                        $item->image_url = request()->getSchemeAndHttpHost() . '/storage/' . $item->image_path;
                    }
                    return $item;
                }
            ];

            // Apply custom category filter (special handling for 'special' category)
            if ($request->has('category') && $request->category !== 'all' && $request->category !== null) {
                if ($request->category === 'special') {
                    // Popular category shows all featured items regardless of their original category
                    $query->where('is_featured', true);
                } else {
                    $query->where('category', $request->category);
                }
            }

            $result = $this->paginate($query, $request, $options);
            
            // Add categories to the response
            $responseData = $result->getData(true);
            $responseData['categories'] = $this->getCategories();
            
            return response()->json($responseData);
            
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch catalog items',
                'error' => $e->getMessage()
            ], 500);
        }
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
        \Log::info('📝 Received catalog data:', ['data' => $data]);
        \Log::info('📝 Request method:', ['method' => $request->method()]);
        \Log::info('📝 Content type:', ['content_type' => $request->header('Content-Type')]);
        \Log::info('📝 Raw input:', ['raw_input' => $request->getContent()]);
        \Log::info('📝 Form data:', ['form_data' => $request->input()]);
        \Log::info('📝 All request data:', ['all_data' => $request->all()]);
        \Log::info('📝 Request files:', ['files' => $request->allFiles()]);

        // Handle image upload
        if ($request->hasFile('image')) {
            $imagePath = $request->file('image')->store('catalog', 'public');
            $data['image_path'] = $imagePath;
        }

        $catalogItem = CatalogItem::create($data);

        // Notify customers about new catalog item
        $this->notifyCustomersAboutCatalogUpdate($catalogItem, 'created');

        // If item is featured (popular), send special notification
        if ($catalogItem->is_featured) {
            $this->notifyCustomersAboutPopularItem($catalogItem);
        }

        return response()->json([
            'success' => true,
            'data' => $catalogItem,
            'message' => 'Catalog item created successfully'
        ], 201);
    }

    /**
     * Upload image for a catalog item using base64 data.
     */
    public function uploadImage(Request $request, $id)
    {
        $item = CatalogItem::find($id);
        
        if (!$item) {
            return response()->json([
                'success' => false,
                'message' => 'Catalog item not found'
            ], 404);
        }

        $validator = Validator::make($request->all(), [
            'image' => 'required|string',
            'image_type' => 'required|string|in:image/jpeg,image/png,image/jpg,image/gif,image/webp',
            'image_name' => 'required|string'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            // Handle base64 image upload
            $base64Image = $request->input('image');
            $imageType = $request->input('image_type');
            $imageName = $request->input('image_name');
            
            // Validate base64 data
            if (!preg_match('/^[a-zA-Z0-9+\/]*={0,2}$/', $base64Image)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Invalid base64 image data'
                ], 400);
            }
            
            // Decode base64 image
            $imageData = base64_decode($base64Image);
            if ($imageData === false) {
                return response()->json([
                    'success' => false,
                    'message' => 'Failed to decode base64 image data'
                ], 400);
            }
            
            // Generate unique filename
            $extension = pathinfo($imageName, PATHINFO_EXTENSION) ?: 'jpg';
            $filename = 'catalog_' . $id . '_' . time() . '.' . $extension;
            $imagePath = 'catalog/' . $filename;
            
            // Store image file
            $fullPath = storage_path('app/public/' . $imagePath);
            $directory = dirname($fullPath);
            
            if (!file_exists($directory)) {
                mkdir($directory, 0755, true);
            }
            
            if (file_put_contents($fullPath, $imageData) === false) {
                return response()->json([
                    'success' => false,
                    'message' => 'Failed to save image file'
                ], 500);
            }
            
            // Update item with image path
            $item->update(['image_path' => $imagePath]);
            
            \Log::info('📷 Base64 image uploaded for item:', [
                'item_id' => $id,
                'image_path' => $imagePath,
                'image_size' => strlen($imageData)
            ]);
            
            return response()->json([
                'success' => true,
                'data' => $item->fresh(),
                'message' => 'Image uploaded successfully'
            ]);
            
        } catch (\Exception $e) {
            \Log::error('❌ Base64 image upload error:', [
                'item_id' => $id,
                'error' => $e->getMessage()
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to upload image: ' . $e->getMessage()
            ], 500);
        }
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

        // Notify customers about catalog item update
        $this->notifyCustomersAboutCatalogUpdate($item, 'updated');

        // If item became featured (popular), send special notification
        if ($item->is_featured && $request->has('is_featured')) {
            $this->notifyCustomersAboutPopularItem($item);
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

        // Notify customers if item became featured (added to popular category)
        if ($item->is_featured) {
            $this->notifyCustomersAboutPopularItem($item);
        }

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

    /**
     * Get popular/featured items for customer dashboard
     */
    public function getPopularItems()
    {
        try {
            \Log::info('📊 Getting popular items for customer dashboard');
            
            $popularItems = CatalogItem::where('is_featured', true)
                ->where('is_available', true)
                ->orderBy('sort_order', 'asc')
                ->orderBy('created_at', 'desc')
                ->get();
            
            \Log::info('📊 Popular items found:', [
                'count' => $popularItems->count(),
                'items' => $popularItems->pluck('name', 'id')->toArray()
            ]);
            
            return response()->json([
                'success' => true,
                'data' => $popularItems,
                'message' => 'Popular items retrieved successfully'
            ]);
            
        } catch (\Exception $e) {
            \Log::error('❌ Error getting popular items:', [
                'error' => $e->getMessage()
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to get popular items: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get recently added items for customer notifications
     */
    public function getRecentItems()
    {
        try {
            \Log::info('📊 Getting recent items for customer notifications');
            
            // Get items added in the last 24 hours
            $recentItems = CatalogItem::where('created_at', '>=', now()->subDay())
                ->where('is_available', true)
                ->orderBy('created_at', 'desc')
                ->get();
            
            // Add metadata for better change detection
            $responseData = $recentItems->map(function ($item) {
                return [
                    'id' => $item->id,
                    'name' => $item->name,
                    'description' => $item->description,
                    'clothing_type' => $item->clothing_type,
                    'category' => $item->category,
                    'is_featured' => $item->is_featured,
                    'is_available' => $item->is_available,
                    'image_path' => $item->image_path,
                    'created_at' => $item->created_at,
                    'updated_at' => $item->updated_at,
                    'created_timestamp' => $item->created_at->timestamp,
                    'sort_order' => $item->sort_order
                ];
            });
            
            \Log::info('📊 Recent items found:', [
                'count' => $recentItems->count(),
                'items' => $recentItems->pluck('name', 'id')->toArray()
            ]);
            
            return response()->json([
                'success' => true,
                'data' => $responseData,
                'count' => $recentItems->count(),
                'message' => 'Recent items retrieved successfully'
            ]);
            
        } catch (\Exception $e) {
            \Log::error('❌ Error getting recent items:', [
                'error' => $e->getMessage()
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to get recent items: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get catalog statistics for admin dashboard
     */
    public function getStats()
    {
        try {
            // Get catalog statistics
            $totalItems = CatalogItem::count();
            $activeItems = CatalogItem::where('is_available', true)->count();
            $inactiveItems = CatalogItem::where('is_available', false)->count();
            $featuredItems = CatalogItem::where('is_featured', true)->count();
            
            // Get items by clothing type
            $clothingTypeStats = CatalogItem::selectRaw('clothing_type, COUNT(*) as count')
                ->groupBy('clothing_type')
                ->get()
                ->pluck('count', 'clothing_type');
            
            // Get recent items (last 30 days)
            $recentItems = CatalogItem::where('created_at', '>=', now()->subDays(30))->count();
            
            return response()->json([
                'success' => true,
                'data' => [
                    'total_items' => $totalItems,
                    'active_items' => $activeItems,
                    'inactive_items' => $inactiveItems,
                    'featured_items' => $featuredItems,
                    'recent_items' => $recentItems,
                    'clothing_type_stats' => $clothingTypeStats,
                ]
            ]);
            
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch catalog statistics',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
