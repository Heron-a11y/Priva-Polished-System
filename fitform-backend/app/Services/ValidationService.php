<?php

namespace App\Services;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;
use Illuminate\Support\Facades\Log;

class ValidationService
{
    /**
     * Validate request data with custom rules
     */
    public function validateRequest(Request $request, array $rules, array $messages = [], array $attributes = []): array
    {
        $validator = Validator::make($request->all(), $rules, $messages, $attributes);

        if ($validator->fails()) {
            $errors = $validator->errors();
            
            // Log validation errors for debugging
            Log::warning('Validation failed', [
                'errors' => $errors->toArray(),
                'request_data' => $request->all(),
                'user_id' => $request->user()?->id,
                'ip' => $request->ip(),
                'user_agent' => $request->userAgent()
            ]);

            throw new ValidationException($validator);
        }

        return $validator->validated();
    }

    /**
     * Validate email format
     */
    public function validateEmail(string $email): bool
    {
        return filter_var($email, FILTER_VALIDATE_EMAIL) !== false;
    }

    /**
     * Validate phone number format
     */
    public function validatePhone(string $phone): bool
    {
        // Remove all non-digit characters
        $cleaned = preg_replace('/[^0-9]/', '', $phone);
        
        // Check if it's a valid phone number (7-15 digits)
        return strlen($cleaned) >= 7 && strlen($cleaned) <= 15;
    }

    /**
     * Validate date format
     */
    public function validateDate(string $date, string $format = 'Y-m-d'): bool
    {
        $d = \DateTime::createFromFormat($format, $date);
        return $d && $d->format($format) === $date;
    }

    /**
     * Validate numeric range
     */
    public function validateNumericRange($value, float $min, float $max): bool
    {
        return is_numeric($value) && $value >= $min && $value <= $max;
    }

    /**
     * Validate string length
     */
    public function validateStringLength(string $string, int $min, int $max): bool
    {
        $length = strlen($string);
        return $length >= $min && $length <= $max;
    }

    /**
     * Validate array structure
     */
    public function validateArrayStructure(array $data, array $requiredKeys): bool
    {
        foreach ($requiredKeys as $key) {
            if (!array_key_exists($key, $data)) {
                return false;
            }
        }
        return true;
    }

    /**
     * Sanitize input data
     */
    public function sanitizeInput(array $data): array
    {
        $sanitized = [];
        
        foreach ($data as $key => $value) {
            if (is_string($value)) {
                // Remove HTML tags and encode special characters
                $sanitized[$key] = htmlspecialchars(strip_tags($value), ENT_QUOTES, 'UTF-8');
            } elseif (is_array($value)) {
                $sanitized[$key] = $this->sanitizeInput($value);
            } else {
                $sanitized[$key] = $value;
            }
        }
        
        return $sanitized;
    }

    /**
     * Validate file upload
     */
    public function validateFileUpload($file, array $allowedTypes = [], int $maxSize = 2048): bool
    {
        if (!$file || !$file->isValid()) {
            return false;
        }

        // Check file size (in KB)
        if ($file->getSize() > $maxSize * 1024) {
            return false;
        }

        // Check file type
        if (!empty($allowedTypes)) {
            $mimeType = $file->getMimeType();
            if (!in_array($mimeType, $allowedTypes)) {
                return false;
            }
        }

        return true;
    }

    /**
     * Validate business rules
     */
    public function validateBusinessRules(array $data, string $context): array
    {
        $errors = [];

        switch ($context) {
            case 'rental':
                $errors = array_merge($errors, $this->validateRentalBusinessRules($data));
                break;
            case 'purchase':
                $errors = array_merge($errors, $this->validatePurchaseBusinessRules($data));
                break;
            case 'user':
                $errors = array_merge($errors, $this->validateUserBusinessRules($data));
                break;
        }

        return $errors;
    }

    /**
     * Validate rental business rules
     */
    private function validateRentalBusinessRules(array $data): array
    {
        $errors = [];

        // Check if return date is after rental date
        if (isset($data['rental_date']) && isset($data['return_date'])) {
            $rentalDate = strtotime($data['rental_date']);
            $returnDate = strtotime($data['return_date']);
            
            if ($returnDate <= $rentalDate) {
                $errors[] = 'Return date must be after rental date.';
            }
        }

        // Check if rental duration is reasonable
        if (isset($data['rental_duration'])) {
            $duration = (int) $data['rental_duration'];
            if ($duration < 1 || $duration > 30) {
                $errors[] = 'Rental duration must be between 1 and 30 days.';
            }
        }

        // Check if daily rate is reasonable
        if (isset($data['daily_rate'])) {
            $dailyRate = (float) $data['daily_rate'];
            if ($dailyRate < 0 || $dailyRate > 1000) {
                $errors[] = 'Daily rate must be between 0 and 1000.';
            }
        }

        return $errors;
    }

    /**
     * Validate purchase business rules
     */
    private function validatePurchaseBusinessRules(array $data): array
    {
        $errors = [];

        // Check if quantity is reasonable
        if (isset($data['quantity'])) {
            $quantity = (int) $data['quantity'];
            if ($quantity < 1 || $quantity > 10) {
                $errors[] = 'Quantity must be between 1 and 10.';
            }
        }

        // Check if price is reasonable
        if (isset($data['price'])) {
            $price = (float) $data['price'];
            if ($price < 0 || $price > 10000) {
                $errors[] = 'Price must be between 0 and 10000.';
            }
        }

        // Check if total amount matches price * quantity
        if (isset($data['price'], $data['quantity'], $data['total_amount'])) {
            $expectedTotal = (float) $data['price'] * (int) $data['quantity'];
            $actualTotal = (float) $data['total_amount'];
            
            if (abs($expectedTotal - $actualTotal) > 0.01) {
                $errors[] = 'Total amount must match price multiplied by quantity.';
            }
        }

        return $errors;
    }

    /**
     * Validate user business rules
     */
    private function validateUserBusinessRules(array $data): array
    {
        $errors = [];

        // Check if date of birth is reasonable
        if (isset($data['date_of_birth'])) {
            $birthDate = strtotime($data['date_of_birth']);
            $age = (time() - $birthDate) / (365.25 * 24 * 60 * 60);
            
            if ($age < 13 || $age > 120) {
                $errors[] = 'Age must be between 13 and 120 years.';
            }
        }

        // Check if phone number is unique (if provided)
        if (isset($data['phone'])) {
            $existingUser = \App\Models\User::where('phone', $data['phone'])->first();
            if ($existingUser && $existingUser->id !== ($data['id'] ?? null)) {
                $errors[] = 'Phone number is already in use.';
            }
        }

        return $errors;
    }

    /**
     * Validate measurement data
     */
    public function validateMeasurements(array $measurements): array
    {
        $errors = [];
        $validKeys = ['chest', 'waist', 'hips', 'length', 'shoulder', 'sleeve', 'inseam'];

        foreach ($measurements as $key => $value) {
            if (!in_array($key, $validKeys)) {
                $errors[] = "Invalid measurement key: {$key}";
                continue;
            }

            if (!is_numeric($value)) {
                $errors[] = "Measurement {$key} must be a number.";
                continue;
            }

            $value = (float) $value;
            if ($value < 0 || $value > 300) {
                $errors[] = "Measurement {$key} must be between 0 and 300.";
            }
        }

        return $errors;
    }

    /**
     * Validate address data
     */
    public function validateAddress(array $address): array
    {
        $errors = [];
        $requiredFields = ['address', 'city', 'state', 'zip_code', 'country'];

        foreach ($requiredFields as $field) {
            if (!isset($address[$field]) || empty($address[$field])) {
                $errors[] = "Address {$field} is required.";
            }
        }

        // Validate ZIP code format
        if (isset($address['zip_code'])) {
            $zipCode = $address['zip_code'];
            if (!preg_match('/^[0-9]{5}(-[0-9]{4})?$/', $zipCode)) {
                $errors[] = 'ZIP code must be in format 12345 or 12345-6789.';
            }
        }

        return $errors;
    }

    /**
     * Validate payment data
     */
    public function validatePayment(array $payment): array
    {
        $errors = [];
        $validMethods = ['credit_card', 'debit_card', 'paypal', 'bank_transfer', 'cash'];

        if (!isset($payment['method']) || !in_array($payment['method'], $validMethods)) {
            $errors[] = 'Invalid payment method.';
        }

        if (isset($payment['amount']) && (!is_numeric($payment['amount']) || $payment['amount'] < 0)) {
            $errors[] = 'Payment amount must be a positive number.';
        }

        return $errors;
    }

    /**
     * Get validation error response
     */
    public function getValidationErrorResponse(array $errors): array
    {
        return [
            'success' => false,
            'message' => 'Validation failed',
            'errors' => $errors,
            'error_count' => count($errors)
        ];
    }

    /**
     * Log validation errors
     */
    public function logValidationErrors(array $errors, Request $request): void
    {
        Log::warning('Validation errors occurred', [
            'errors' => $errors,
            'request_data' => $request->all(),
            'user_id' => $request->user()?->id,
            'ip' => $request->ip(),
            'user_agent' => $request->userAgent(),
            'timestamp' => now()->toISOString()
        ]);
    }
}


