<?php

namespace App\Http\Requests;

use Illuminate\Validation\Rule;

class RentalRequest extends BaseValidationRequest
{
    /**
     * Get the validation rules that apply to the request.
     */
    public function rules(): array
    {
        $rentalId = $this->route('rental');
        
        return [
            'item_name' => [
                'required',
                'string',
                'max:255',
                'min:2'
            ],
            'clothing_type' => [
                'required',
                'string',
                Rule::in(['dress', 'suit', 'shirt', 'pants', 'skirt', 'jacket', 'coat', 'other'])
            ],
            'size' => [
                'required',
                'string',
                'max:10'
            ],
            'color' => [
                'required',
                'string',
                'max:50'
            ],
            'brand' => [
                'nullable',
                'string',
                'max:100'
            ],
            'rental_date' => [
                'required',
                'date',
                'after_or_equal:today'
            ],
            'return_date' => [
                'required',
                'date',
                'after:rental_date'
            ],
            'rental_duration' => [
                'required',
                'integer',
                'min:1',
                'max:30'
            ],
            'daily_rate' => [
                'required',
                'numeric',
                'min:0',
                'max:1000'
            ],
            'total_amount' => [
                'required',
                'numeric',
                'min:0',
                'max:10000'
            ],
            'deposit_amount' => [
                'nullable',
                'numeric',
                'min:0',
                'max:5000'
            ],
            'status' => [
                'nullable',
                'string',
                Rule::in(['pending', 'confirmed', 'in_progress', 'completed', 'cancelled', 'declined'])
            ],
            'notes' => [
                'nullable',
                'string',
                'max:1000'
            ],
            'measurements' => [
                'nullable',
                'array'
            ],
            'measurements.chest' => [
                'nullable',
                'numeric',
                'min:0',
                'max:200'
            ],
            'measurements.waist' => [
                'nullable',
                'numeric',
                'min:0',
                'max:200'
            ],
            'measurements.hips' => [
                'nullable',
                'numeric',
                'min:0',
                'max:200'
            ],
            'measurements.length' => [
                'nullable',
                'numeric',
                'min:0',
                'max:300'
            ],
            'customer_name' => [
                'required',
                'string',
                'max:255',
                'min:2'
            ],
            'customer_email' => [
                'required',
                'email',
                'max:255'
            ],
            'customer_phone' => [
                'required',
                'string',
                'regex:/^[\+]?[1-9][\d]{0,15}$/',
                'max:20'
            ],
            'customer_address' => [
                'nullable',
                'string',
                'max:500'
            ],
            'customer_city' => [
                'nullable',
                'string',
                'max:100'
            ],
            'customer_state' => [
                'nullable',
                'string',
                'max:100'
            ],
            'customer_zip_code' => [
                'nullable',
                'string',
                'max:20'
            ],
            'customer_country' => [
                'nullable',
                'string',
                'max:100'
            ],
            'special_instructions' => [
                'nullable',
                'string',
                'max:1000'
            ],
            'delivery_method' => [
                'nullable',
                'string',
                Rule::in(['pickup', 'delivery', 'shipping'])
            ],
            'delivery_address' => [
                'nullable',
                'string',
                'max:500'
            ],
            'delivery_date' => [
                'nullable',
                'date',
                'after_or_equal:today'
            ],
            'return_method' => [
                'nullable',
                'string',
                Rule::in(['pickup', 'delivery', 'shipping'])
            ],
            'return_address' => [
                'nullable',
                'string',
                'max:500'
            ],
            'insurance_required' => [
                'nullable',
                'boolean'
            ],
            'insurance_amount' => [
                'nullable',
                'numeric',
                'min:0',
                'max:10000'
            ],
            'payment_method' => [
                'nullable',
                'string',
                Rule::in(['credit_card', 'debit_card', 'paypal', 'bank_transfer', 'cash'])
            ],
            'payment_status' => [
                'nullable',
                'string',
                Rule::in(['pending', 'paid', 'partial', 'refunded', 'failed'])
            ],
            'discount_code' => [
                'nullable',
                'string',
                'max:50'
            ],
            'discount_amount' => [
                'nullable',
                'numeric',
                'min:0',
                'max:1000'
            ],
            'tax_rate' => [
                'nullable',
                'numeric',
                'min:0',
                'max:1'
            ],
            'tax_amount' => [
                'nullable',
                'numeric',
                'min:0',
                'max:1000'
            ],
            'late_fee_rate' => [
                'nullable',
                'numeric',
                'min:0',
                'max:1'
            ],
            'late_fee_amount' => [
                'nullable',
                'numeric',
                'min:0',
                'max:1000'
            ],
            'damage_fee' => [
                'nullable',
                'numeric',
                'min:0',
                'max:5000'
            ],
            'cleaning_fee' => [
                'nullable',
                'numeric',
                'min:0',
                'max:500'
            ],
            'alteration_fee' => [
                'nullable',
                'numeric',
                'min:0',
                'max:1000'
            ],
            'other_fees' => [
                'nullable',
                'numeric',
                'min:0',
                'max:1000'
            ],
            'total_fees' => [
                'nullable',
                'numeric',
                'min:0',
                'max:10000'
            ],
            'final_amount' => [
                'nullable',
                'numeric',
                'min:0',
                'max:15000'
            ]
        ];
    }

    /**
     * Get custom messages for validator errors.
     */
    public function messages(): array
    {
        return array_merge(parent::messages(), [
            'item_name.required' => 'Item name is required.',
            'item_name.min' => 'Item name must be at least 2 characters.',
            'item_name.max' => 'Item name may not be greater than 255 characters.',
            'clothing_type.required' => 'Clothing type is required.',
            'clothing_type.in' => 'Clothing type must be one of: dress, suit, shirt, pants, skirt, jacket, coat, other.',
            'size.required' => 'Size is required.',
            'size.max' => 'Size may not be greater than 10 characters.',
            'color.required' => 'Color is required.',
            'color.max' => 'Color may not be greater than 50 characters.',
            'rental_date.required' => 'Rental date is required.',
            'rental_date.date' => 'Rental date must be a valid date.',
            'rental_date.after_or_equal' => 'Rental date must be today or in the future.',
            'return_date.required' => 'Return date is required.',
            'return_date.date' => 'Return date must be a valid date.',
            'return_date.after' => 'Return date must be after rental date.',
            'rental_duration.required' => 'Rental duration is required.',
            'rental_duration.integer' => 'Rental duration must be an integer.',
            'rental_duration.min' => 'Rental duration must be at least 1 day.',
            'rental_duration.max' => 'Rental duration may not be greater than 30 days.',
            'daily_rate.required' => 'Daily rate is required.',
            'daily_rate.numeric' => 'Daily rate must be a number.',
            'daily_rate.min' => 'Daily rate must be at least 0.',
            'daily_rate.max' => 'Daily rate may not be greater than 1000.',
            'total_amount.required' => 'Total amount is required.',
            'total_amount.numeric' => 'Total amount must be a number.',
            'total_amount.min' => 'Total amount must be at least 0.',
            'total_amount.max' => 'Total amount may not be greater than 10000.',
            'customer_name.required' => 'Customer name is required.',
            'customer_name.min' => 'Customer name must be at least 2 characters.',
            'customer_name.max' => 'Customer name may not be greater than 255 characters.',
            'customer_email.required' => 'Customer email is required.',
            'customer_email.email' => 'Customer email must be a valid email address.',
            'customer_phone.required' => 'Customer phone is required.',
            'customer_phone.regex' => 'Customer phone must be a valid phone number.',
            'measurements.chest.numeric' => 'Chest measurement must be a number.',
            'measurements.chest.min' => 'Chest measurement must be at least 0.',
            'measurements.chest.max' => 'Chest measurement may not be greater than 200.',
            'measurements.waist.numeric' => 'Waist measurement must be a number.',
            'measurements.waist.min' => 'Waist measurement must be at least 0.',
            'measurements.waist.max' => 'Waist measurement may not be greater than 200.',
            'measurements.hips.numeric' => 'Hips measurement must be a number.',
            'measurements.hips.min' => 'Hips measurement must be at least 0.',
            'measurements.hips.max' => 'Hips measurement may not be greater than 200.',
            'measurements.length.numeric' => 'Length measurement must be a number.',
            'measurements.length.min' => 'Length measurement must be at least 0.',
            'measurements.length.max' => 'Length measurement may not be greater than 300.',
        ]);
    }

    /**
     * Get custom attributes for validator errors.
     */
    public function attributes(): array
    {
        return array_merge(parent::attributes(), [
            'item_name' => 'item name',
            'clothing_type' => 'clothing type',
            'rental_date' => 'rental date',
            'return_date' => 'return date',
            'rental_duration' => 'rental duration',
            'daily_rate' => 'daily rate',
            'total_amount' => 'total amount',
            'deposit_amount' => 'deposit amount',
            'customer_name' => 'customer name',
            'customer_email' => 'customer email',
            'customer_phone' => 'customer phone',
            'customer_address' => 'customer address',
            'customer_city' => 'customer city',
            'customer_state' => 'customer state',
            'customer_zip_code' => 'customer ZIP code',
            'customer_country' => 'customer country',
            'special_instructions' => 'special instructions',
            'delivery_method' => 'delivery method',
            'delivery_address' => 'delivery address',
            'delivery_date' => 'delivery date',
            'return_method' => 'return method',
            'return_address' => 'return address',
            'insurance_required' => 'insurance required',
            'insurance_amount' => 'insurance amount',
            'payment_method' => 'payment method',
            'payment_status' => 'payment status',
            'discount_code' => 'discount code',
            'discount_amount' => 'discount amount',
            'tax_rate' => 'tax rate',
            'tax_amount' => 'tax amount',
            'late_fee_rate' => 'late fee rate',
            'late_fee_amount' => 'late fee amount',
            'damage_fee' => 'damage fee',
            'cleaning_fee' => 'cleaning fee',
            'alteration_fee' => 'alteration fee',
            'other_fees' => 'other fees',
            'total_fees' => 'total fees',
            'final_amount' => 'final amount',
            'measurements.chest' => 'chest measurement',
            'measurements.waist' => 'waist measurement',
            'measurements.hips' => 'hips measurement',
            'measurements.length' => 'length measurement',
        ]);
    }
}


