# Catalog Image Management

## Overview
The catalog management system stores clothing images in the backend storage directory and serves them through Laravel's storage system.

## Directory Structure
```
fitform-backend/
├── storage/app/public/catalog/     # Backend storage (actual files)
├── public/storage/catalog/         # Web accessible (symlink)
└── copy-clothing-images.php       # Helper script
```

## Image Storage Process

### 1. Automatic Storage
- When admin uploads images through the catalog management interface
- Images are automatically stored in `storage/app/public/catalog/`
- Database stores the relative path: `catalog/filename.jpg`

### 2. Manual Image Management
If you need to add new clothing images manually:

1. **Add images to frontend assets:**
   ```
   fitform-frontend/assets/images/clothing/new-image.jpg
   ```

2. **Copy to backend storage:**
   ```bash
   php copy-clothing-images.php
   ```

3. **Update database:**
   ```bash
   php artisan db:seed --class=CatalogItemSeeder
   ```

## Image URLs
- **Storage Path:** `storage/app/public/catalog/filename.jpg`
- **Web URL:** `http://your-domain.com/storage/catalog/filename.jpg`
- **Database Path:** `catalog/filename.jpg`

## File Management

### Adding New Images
1. Place images in `fitform-frontend/assets/images/clothing/`
2. Run `php copy-clothing-images.php`
3. Update seeder if needed
4. Run `php artisan db:seed --class=CatalogItemSeeder`

### Removing Images
1. Delete from `storage/app/public/catalog/`
2. Update database records
3. Images will show placeholder in catalog

### Image Requirements
- **Formats:** JPG, JPEG, PNG, WEBP, GIF
- **Max Size:** 2MB per image
- **Recommended:** 400x400px or larger
- **Aspect Ratio:** Square (1:1) preferred

## Troubleshooting

### Images Not Displaying
1. Check if `public/storage` symlink exists:
   ```bash
   php artisan storage:link
   ```

2. Verify file permissions:
   ```bash
   chmod -R 755 storage/app/public/catalog/
   ```

3. Check if files exist in both directories:
   - `storage/app/public/catalog/`
   - `public/storage/catalog/`

### Missing Images
1. Run the copy script:
   ```bash
   php copy-clothing-images.php
   ```

2. Reseed the database:
   ```bash
   php artisan db:seed --class=CatalogItemSeeder
   ```

## Database Schema
```sql
catalog_items:
- id (primary key)
- name (string)
- description (text, nullable)
- clothing_type (string)
- category (string)
- image_path (string, nullable)  -- Stores: "catalog/filename.jpg"
- measurements_required (json)
- is_available (boolean)
- is_featured (boolean)
- sort_order (integer)
- notes (text, nullable)
- created_at (timestamp)
- updated_at (timestamp)
```

## API Endpoints
- `GET /admin/catalog` - List all catalog items
- `POST /admin/catalog` - Create new item (with image upload)
- `PUT /admin/catalog/{id}` - Update item (with image upload)
- `DELETE /admin/catalog/{id}` - Delete item (removes image)

## Frontend Integration
The frontend catalog management screen includes:
- Image upload interface
- Image preview
- Image removal
- Fallback to placeholder for missing images
- Error handling for failed image loads

