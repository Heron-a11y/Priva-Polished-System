<?php

namespace App\Http\Requests;

use Illuminate\Validation\Rule;

class PurchaseRequest extends BaseValidationRequest
{
    /**
     * Get the validation rules that apply to the request.
     */
    public function rules(): array
    {
        $purchaseId = $this->route('purchase');
        
        return [
            'item_name' => [
                'required',
                'string',
                'max:255',
                'min:2'
            ],
            'clothing_type' => [
                'nullable',
                'string',
                'max:100'
            ],
            'size' => [
                'nullable',
                'string',
                'max:10'
            ],
            'color' => [
                'nullable',
                'string',
                'max:50'
            ],
            'brand' => [
                'nullable',
                'string',
                'max:100'
            ],
            'purchase_date' => [
                'required',
                'date',
                'after_or_equal:today'
            ],
            'price' => [
                'nullable',
                'numeric',
                'min:0',
                'max:10000'
            ],
            'quantity' => [
                'nullable',
                'integer',
                'min:1',
                'max:10'
            ],
            'total_amount' => [
                'nullable',
                'numeric',
                'min:0',
                'max:100000'
            ],
            'status' => [
                'nullable',
                'string',
                Rule::in(['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'declined', 'returned'])
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
            'measurements.height' => [
                'nullable',
                'numeric',
                'min:0',
                'max:300'
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
            'measurements.shoulders' => [
                'nullable',
                'numeric',
                'min:0',
                'max:200'
            ],
            'measurements.inseam' => [
                'nullable',
                'numeric',
                'min:0',
                'max:200'
            ],
            'measurements.armLength' => [
                'nullable',
                'numeric',
                'min:0',
                'max:200'
            ],
            'measurements.arm_length' => [
                'nullable',
                'numeric',
                'min:0',
                'max:200'
            ],
            'measurements.neck' => [
                'nullable',
                'numeric',
                'min:0',
                'max:200'
            ],
            'measurements.thigh' => [
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
                'nullable',
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
            'shipping_address' => [
                'nullable',
                'string',
                'max:500'
            ],
            'shipping_city' => [
                'nullable',
                'string',
                'max:100'
            ],
            'shipping_state' => [
                'nullable',
                'string',
                'max:100'
            ],
            'shipping_zip_code' => [
                'nullable',
                'string',
                'max:20'
            ],
            'shipping_country' => [
                'nullable',
                'string',
                'max:100'
            ],
            'shipping_method' => [
                'nullable',
                'string',
                Rule::in(['standard', 'express', 'overnight', 'pickup'])
            ],
            'shipping_cost' => [
                'nullable',
                'numeric',
                'min:0',
                'max:1000'
            ],
            'estimated_delivery' => [
                'nullable',
                'date',
                'after_or_equal:today'
            ],
            'tracking_number' => [
                'nullable',
                'string',
                'max:100'
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
            'processing_fee' => [
                'nullable',
                'numeric',
                'min:0',
                'max:100'
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
                'max:2000'
            ],
            'final_amount' => [
                'nullable',
                'numeric',
                'min:0',
                'max:150000'
            ],
            'warranty_period' => [
                'nullable',
                'integer',
                'min:0',
                'max:365'
            ],
            'return_policy' => [
                'nullable',
                'string',
                'max:1000'
            ],
            'special_instructions' => [
                'nullable',
                'string',
                'max:1000'
            ],
            'gift_wrapping' => [
                'nullable',
                'boolean'
            ],
            'gift_message' => [
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
            'coupon_code' => [
                'nullable',
                'string',
                'max:50'
            ],
            'coupon_discount' => [
                'nullable',
                'numeric',
                'min:0',
                'max:1000'
            ],
            'loyalty_points_used' => [
                'nullable',
                'integer',
                'min:0',
                'max:10000'
            ],
            'loyalty_points_earned' => [
                'nullable',
                'integer',
                'min:0',
                'max:1000'
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
            'purchase_date.required' => 'Purchase date is required.',
            'purchase_date.date' => 'Purchase date must be a valid date.',
            'purchase_date.after_or_equal' => 'Purchase date must be today or in the future.',
            'price.required' => 'Price is required.',
            'price.numeric' => 'Price must be a number.',
            'price.min' => 'Price must be at least 0.',
            'price.max' => 'Price may not be greater than 10000.',
            'quantity.required' => 'Quantity is required.',
            'quantity.integer' => 'Quantity must be an integer.',
            'quantity.min' => 'Quantity must be at least 1.',
            'quantity.max' => 'Quantity may not be greater than 10.',
            'total_amount.required' => 'Total amount is required.',
            'total_amount.numeric' => 'Total amount must be a number.',
            'total_amount.min' => 'Total amount must be at least 0.',
            'total_amount.max' => 'Total amount may not be greater than 100000.',
            'customer_name.required' => 'Customer name is required.',
            'customer_name.min' => 'Customer name must be at least 2 characters.',
            'customer_name.max' => 'Customer name may not be greater than 255 characters.',
            'customer_email.required' => 'Customer email is required.',
            'customer_email.email' => 'Customer email must be a valid email address.',
            'customer_phone.required' => 'Customer phone is required.',
            'customer_phone.regex' => 'Customer phone must be a valid phone number.',
            'customer_address.required' => 'Customer address is required.',
            'customer_address.max' => 'Customer address may not be greater than 500 characters.',
            'customer_city.required' => 'Customer city is required.',
            'customer_city.max' => 'Customer city may not be greater than 100 characters.',
            'customer_state.required' => 'Customer state is required.',
            'customer_state.max' => 'Customer state may not be greater than 100 characters.',
            'customer_zip_code.required' => 'Customer ZIP code is required.',
            'customer_zip_code.max' => 'Customer ZIP code may not be greater than 20 characters.',
            'customer_country.required' => 'Customer country is required.',
            'customer_country.max' => 'Customer country may not be greater than 100 characters.',
            'shipping_method.in' => 'Shipping method must be one of: standard, express, overnight, pickup.',
            'shipping_cost.numeric' => 'Shipping cost must be a number.',
            'shipping_cost.min' => 'Shipping cost must be at least 0.',
            'shipping_cost.max' => 'Shipping cost may not be greater than 1000.',
            'estimated_delivery.date' => 'Estimated delivery must be a valid date.',
            'estimated_delivery.after_or_equal' => 'Estimated delivery must be today or in the future.',
            'tracking_number.max' => 'Tracking number may not be greater than 100 characters.',
            'payment_method.required' => 'Payment method is required.',
            'payment_method.in' => 'Payment method must be one of: credit_card, debit_card, paypal, bank_transfer, cash.',
            'discount_code.max' => 'Discount code may not be greater than 50 characters.',
            'discount_amount.numeric' => 'Discount amount must be a number.',
            'discount_amount.min' => 'Discount amount must be at least 0.',
            'discount_amount.max' => 'Discount amount may not be greater than 1000.',
            'tax_rate.numeric' => 'Tax rate must be a number.',
            'tax_rate.min' => 'Tax rate must be at least 0.',
            'tax_rate.max' => 'Tax rate may not be greater than 1.',
            'tax_amount.numeric' => 'Tax amount must be a number.',
            'tax_amount.min' => 'Tax amount must be at least 0.',
            'tax_amount.max' => 'Tax amount may not be greater than 1000.',
            'processing_fee.numeric' => 'Processing fee must be a number.',
            'processing_fee.min' => 'Processing fee must be at least 0.',
            'processing_fee.max' => 'Processing fee may not be greater than 100.',
            'other_fees.numeric' => 'Other fees must be a number.',
            'other_fees.min' => 'Other fees must be at least 0.',
            'other_fees.max' => 'Other fees may not be greater than 1000.',
            'total_fees.numeric' => 'Total fees must be a number.',
            'total_fees.min' => 'Total fees must be at least 0.',
            'total_fees.max' => 'Total fees may not be greater than 2000.',
            'final_amount.numeric' => 'Final amount must be a number.',
            'final_amount.min' => 'Final amount must be at least 0.',
            'final_amount.max' => 'Final amount may not be greater than 150000.',
            'warranty_period.integer' => 'Warranty period must be an integer.',
            'warranty_period.min' => 'Warranty period must be at least 0.',
            'warranty_period.max' => 'Warranty period may not be greater than 365.',
            'return_policy.max' => 'Return policy may not be greater than 1000 characters.',
            'special_instructions.max' => 'Special instructions may not be greater than 1000 characters.',
            'gift_message.max' => 'Gift message may not be greater than 500 characters.',
            'insurance_amount.numeric' => 'Insurance amount must be a number.',
            'insurance_amount.min' => 'Insurance amount must be at least 0.',
            'insurance_amount.max' => 'Insurance amount may not be greater than 10000.',
            'coupon_code.max' => 'Coupon code may not be greater than 50 characters.',
            'coupon_discount.numeric' => 'Coupon discount must be a number.',
            'coupon_discount.min' => 'Coupon discount must be at least 0.',
            'coupon_discount.max' => 'Coupon discount may not be greater than 1000.',
            'loyalty_points_used.integer' => 'Loyalty points used must be an integer.',
            'loyalty_points_used.min' => 'Loyalty points used must be at least 0.',
            'loyalty_points_used.max' => 'Loyalty points used may not be greater than 10000.',
            'loyalty_points_earned.integer' => 'Loyalty points earned must be an integer.',
            'loyalty_points_earned.min' => 'Loyalty points earned must be at least 0.',
            'loyalty_points_earned.max' => 'Loyalty points earned may not be greater than 1000.',
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
            'purchase_date' => 'purchase date',
            'quantity' => 'quantity',
            'total_amount' => 'total amount',
            'customer_name' => 'customer name',
            'customer_email' => 'customer email',
            'customer_phone' => 'customer phone',
            'customer_address' => 'customer address',
            'customer_city' => 'customer city',
            'customer_state' => 'customer state',
            'customer_zip_code' => 'customer ZIP code',
            'customer_country' => 'customer country',
            'shipping_address' => 'shipping address',
            'shipping_city' => 'shipping city',
            'shipping_state' => 'shipping state',
            'shipping_zip_code' => 'shipping ZIP code',
            'shipping_country' => 'shipping country',
            'shipping_method' => 'shipping method',
            'shipping_cost' => 'shipping cost',
            'estimated_delivery' => 'estimated delivery',
            'tracking_number' => 'tracking number',
            'payment_method' => 'payment method',
            'payment_status' => 'payment status',
            'discount_code' => 'discount code',
            'discount_amount' => 'discount amount',
            'tax_rate' => 'tax rate',
            'tax_amount' => 'tax amount',
            'processing_fee' => 'processing fee',
            'other_fees' => 'other fees',
            'total_fees' => 'total fees',
            'final_amount' => 'final amount',
            'warranty_period' => 'warranty period',
            'return_policy' => 'return policy',
            'special_instructions' => 'special instructions',
            'gift_wrapping' => 'gift wrapping',
            'gift_message' => 'gift message',
            'insurance_required' => 'insurance required',
            'insurance_amount' => 'insurance amount',
            'coupon_code' => 'coupon code',
            'coupon_discount' => 'coupon discount',
            'loyalty_points_used' => 'loyalty points used',
            'loyalty_points_earned' => 'loyalty points earned',
            'measurements.chest' => 'chest measurement',
            'measurements.waist' => 'waist measurement',
            'measurements.hips' => 'hips measurement',
            'measurements.length' => 'length measurement',
        ]);
    }
}


