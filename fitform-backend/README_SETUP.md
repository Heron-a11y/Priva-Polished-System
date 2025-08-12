# FitForm Backend Setup Guide

## Prerequisites
- PHP 8.2 or higher
- Composer
- MySQL/PostgreSQL database
- Laravel 12.x

## Installation Steps

1. **Install Dependencies**
   ```bash
   composer install
   ```

2. **Environment Setup**
   ```bash
   cp .env.example .env
   php artisan key:generate
   ```

3. **Database Configuration**
   Update your `.env` file with your database credentials:
   ```
   DB_CONNECTION=mysql
   DB_HOST=127.0.0.1
   DB_PORT=3306
   DB_DATABASE=fitform_db
   DB_USERNAME=your_username
   DB_PASSWORD=your_password
   ```

4. **Install Laravel Sanctum**
   ```bash
   composer require laravel/sanctum
   php artisan vendor:publish --provider="Laravel\Sanctum\SanctumServiceProvider"
   ```

5. **Run Migrations**
   ```bash
   php artisan migrate
   ```

6. **Seed Database**
   ```bash
   php artisan db:seed
   ```

7. **Start Development Server**
   ```bash
   php artisan serve
   ```

## Test Users Created by Seeder

After running the seeder, you'll have these test accounts:

### Customer Accounts:
- **Email:** `customer@fitform.com`
- **Password:** `password123`

- **Email:** `jane@fitform.com`
- **Password:** `password123`

### Admin Account:
- **Email:** `admin@fitform.com`
- **Password:** `password123`

## API Endpoints

The API will be available at `http://localhost:8000/api`

### Authentication Endpoints:
- `POST /api/register` - Register new customer
- `POST /api/login` - Login user
- `POST /api/logout` - Logout user (requires authentication)
- `GET /api/me` - Get current user info (requires authentication)

## Testing the API

You can test the endpoints using tools like Postman, curl, or any API testing tool.

### Example Login Request:
```bash
curl -X POST http://localhost:8000/api/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "customer@fitform.com",
    "password": "password123"
  }'
```

### Example Register Request:
```bash
curl -X POST http://localhost:8000/api/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "New Customer",
    "email": "newcustomer@example.com",
    "password": "password123",
    "password_confirmation": "password123"
  }'
```

## Frontend Integration

The frontend is already configured to work with this backend. Make sure:

1. The API base URL in `fitform-frontend/services/api.js` points to your backend
2. CORS is properly configured (already done)
3. The frontend is running on a different port than the backend

## Troubleshooting

### Common Issues:

1. **CORS Errors**: Make sure the CORS configuration allows your frontend domain
2. **Database Connection**: Verify your database credentials in `.env`
3. **Token Issues**: Ensure Sanctum is properly configured
4. **Port Conflicts**: Make sure port 8000 is available for the backend

### Useful Commands:
```bash
# Clear cache
php artisan cache:clear
php artisan config:clear
php artisan route:clear

# Check routes
php artisan route:list

# Check database status
php artisan migrate:status
``` 