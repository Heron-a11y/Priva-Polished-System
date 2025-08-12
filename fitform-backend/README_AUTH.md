# FitForm Authentication API

This document describes the authentication endpoints for the FitForm application.

## Base URL
```
http://localhost:8000/api
```

## Endpoints

### 1. Register Customer
**POST** `/register`

Register a new customer account (registration is customer-only).

**Request Body:**
```json
{
    "name": "John Doe",
    "email": "john@example.com",
    "password": "password123",
    "password_confirmation": "password123"
}
```

**Response (201):**
```json
{
    "success": true,
    "message": "Customer registered successfully",
    "data": {
        "user": {
            "id": 1,
            "name": "John Doe",
            "email": "john@example.com",
            "role": "customer"
        },
        "token": "1|abc123...",
        "token_type": "Bearer"
    }
}
```

### 2. Login
**POST** `/login`

Login with email and password.

**Request Body:**
```json
{
    "email": "john@example.com",
    "password": "password123"
}
```

**Response (200):**
```json
{
    "success": true,
    "message": "Login successful",
    "data": {
        "user": {
            "id": 1,
            "name": "John Doe",
            "email": "john@example.com",
            "role": "customer"
        },
        "token": "1|abc123...",
        "token_type": "Bearer"
    }
}
```

### 3. Get User Info
**GET** `/me`

Get current authenticated user information.

**Headers:**
```
Authorization: Bearer {token}
```

**Response (200):**
```json
{
    "success": true,
    "data": {
        "user": {
            "id": 1,
            "name": "John Doe",
            "email": "john@example.com",
            "role": "customer"
        }
    }
}
```

### 4. Logout
**POST** `/logout`

Logout and invalidate the current token.

**Headers:**
```
Authorization: Bearer {token}
```

**Response (200):**
```json
{
    "success": true,
    "message": "Logged out successfully"
}
```

## Test Users

After running the seeder, you can use these test accounts:

### Customer Accounts:
- Email: `customer@fitform.com`
- Password: `password123`

- Email: `jane@fitform.com`
- Password: `password123`

### Admin Account:
- Email: `admin@fitform.com`
- Password: `password123`

## Error Responses

### Validation Error (422):
```json
{
    "success": false,
    "message": "Validation failed",
    "errors": {
        "email": ["The email field is required."],
        "password": ["The password field is required."]
    }
}
```

### Invalid Credentials (401):
```json
{
    "success": false,
    "message": "Invalid credentials"
}
```

## Usage in Frontend

1. Store the token in secure storage after login/register
2. Include the token in the Authorization header for protected requests
3. Handle token expiration by redirecting to login
4. Use the user role to show/hide admin features

## Running the Backend

1. Start the Laravel development server:
   ```bash
   php artisan serve
   ```

2. Run migrations and seeders:
   ```bash
   php artisan migrate
   php artisan db:seed
   ```

The API will be available at `http://localhost:8000/api` 