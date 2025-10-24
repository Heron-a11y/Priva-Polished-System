<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Http\JsonResponse;

abstract class BaseValidationRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     */
    abstract public function rules(): array;

    /**
     * Get custom messages for validator errors.
     */
    public function messages(): array
    {
        return [
            'required' => 'The :attribute field is required.',
            'email' => 'The :attribute must be a valid email address.',
            'unique' => 'The :attribute has already been taken.',
            'min' => 'The :attribute must be at least :min characters.',
            'max' => 'The :attribute may not be greater than :max characters.',
            'numeric' => 'The :attribute must be a number.',
            'integer' => 'The :attribute must be an integer.',
            'boolean' => 'The :attribute must be true or false.',
            'date' => 'The :attribute must be a valid date.',
            'date_format' => 'The :attribute must be in the format :format.',
            'in' => 'The :attribute must be one of: :values.',
            'exists' => 'The selected :attribute is invalid.',
            'regex' => 'The :attribute format is invalid.',
            'url' => 'The :attribute must be a valid URL.',
            'image' => 'The :attribute must be an image.',
            'mimes' => 'The :attribute must be a file of type: :values.',
            'max:2048' => 'The :attribute may not be greater than 2MB.',
        ];
    }

    /**
     * Get custom attributes for validator errors.
     */
    public function attributes(): array
    {
        return [
            'email' => 'email address',
            'password' => 'password',
            'name' => 'name',
            'phone' => 'phone number',
            'address' => 'address',
            'city' => 'city',
            'state' => 'state',
            'zip_code' => 'ZIP code',
            'country' => 'country',
            'date_of_birth' => 'date of birth',
            'gender' => 'gender',
            'profile_image' => 'profile image',
            'clothing_type' => 'clothing type',
            'size' => 'size',
            'color' => 'color',
            'brand' => 'brand',
            'price' => 'price',
            'description' => 'description',
            'rental_date' => 'rental date',
            'return_date' => 'return date',
            'purchase_date' => 'purchase date',
            'status' => 'status',
            'notes' => 'notes',
            'measurements' => 'measurements',
            'appointment_date' => 'appointment date',
            'appointment_time' => 'appointment time',
            'appointment_type' => 'appointment type',
        ];
    }

    /**
     * Handle a failed validation attempt.
     */
    protected function failedValidation(Validator $validator): void
    {
        $errors = $validator->errors();
        $formattedErrors = [];

        foreach ($errors->all() as $error) {
            $formattedErrors[] = $error;
        }

        throw new HttpResponseException(
            response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $formattedErrors,
                'error_details' => $errors->toArray(),
            ], 422)
        );
    }

    /**
     * Get the validated data from the request.
     */
    public function validated($key = null, $default = null)
    {
        $validated = parent::validated($key, $default);
        
        // Sanitize string inputs
        if (is_array($validated)) {
            $validated = $this->sanitizeData($validated);
        }
        
        return $validated;
    }

    /**
     * Sanitize data to prevent XSS and other security issues.
     */
    private function sanitizeData(array $data): array
    {
        foreach ($data as $key => $value) {
            if (is_string($value)) {
                // Remove HTML tags and encode special characters
                $data[$key] = htmlspecialchars(strip_tags($value), ENT_QUOTES, 'UTF-8');
            } elseif (is_array($value)) {
                $data[$key] = $this->sanitizeData($value);
            }
        }
        
        return $data;
    }

    /**
     * Get the error messages for the defined validation rules.
     */
    public function getErrorMessages(): array
    {
        return $this->messages();
    }

    /**
     * Get the custom attributes for the defined validation rules.
     */
    public function getCustomAttributes(): array
    {
        return $this->attributes();
    }
}


