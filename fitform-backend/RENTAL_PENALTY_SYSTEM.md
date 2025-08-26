# Rental Penalty System

## Overview
The rental penalty system automatically calculates and applies penalties for various scenarios in the rental process.

## Rental Structure

### Fixed Rental Period
- **Duration**: 5 days (fixed)
- **Price**: ₱500
- **Description**: Standard rental period for all garments

## Penalty Types

### 1. Cancellation Fee
- **Amount**: ₱500
- **Trigger**: When a rental order is cancelled
- **Application**: Automatically applied when admin cancels an order

### 2. Delay Penalty
- **Amount**: ₱100 per day
- **Trigger**: When items are returned after the scheduled return date
- **Calculation**: Automatically calculated based on current date vs. return date
- **Status**: Only applies to orders with status 'rented'

### 3. Damage Fees
- **Minor Damage**: ₱200 (minimum damage fee)
- **Major Damage**: Up to the quotation amount
- **Severe Damage**: Full quotation amount
- **Trigger**: Admin assessment during return inspection

## Database Fields

The following fields have been added to the `rentals` table:

- `cancellation_fee` (decimal): Default ₱500
- `daily_delay_fee` (decimal): Default ₱100
- `damage_fee_min` (decimal): Default ₱200
- `damage_fee_max` (decimal): Set to quotation amount
- `total_penalties` (decimal): Sum of all applicable penalties
- `penalty_notes` (text): Admin notes about penalties
- `penalty_status` (enum): 'none', 'pending', 'paid'
- `penalty_calculated_at` (timestamp): When penalties were calculated
- `penalty_paid_at` (timestamp): When penalties were paid
- `agreement_accepted` (boolean): Whether customer accepted terms
- `agreement_accepted_at` (timestamp): When agreement was accepted

## API Endpoints

### Calculate Penalties
```
POST /api/rentals/{id}/calculate-penalties
```
**Body:**
```json
{
  "damage_level": "none|minor|major|severe",
  "penalty_notes": "Optional notes about damage"
}
```

### Get Penalty Breakdown
```
GET /api/rentals/{id}/penalties
```

### Mark Penalties as Paid
```
POST /api/rentals/{id}/mark-penalties-paid
```

### Accept User Agreement
```
POST /api/rentals/{id}/accept-agreement
```

## Frontend Features

### Customer Side
- **User Agreement**: Must accept terms before submitting rental
- **Penalty Display**: Shows current penalties in order details
- **Agreement Modal**: Displays all penalty terms and conditions

### Admin Side
- **Penalty Management**: Calculate and apply penalties
- **Damage Assessment**: Select damage level (none/minor/major/severe)
- **Penalty Notes**: Add detailed notes about penalties
- **Automatic Calculation**: System calculates total penalties

## Usage Examples

### 1. Customer Submits Rental
- Customer must check "I agree to terms and conditions"
- System records agreement acceptance timestamp

### 2. Admin Calculates Penalties
- Admin selects damage level
- Adds penalty notes
- System calculates total penalties
- Updates penalty status to 'pending'

### 3. Customer Views Penalties
- Customer can see penalty breakdown in order details
- Displays delay penalties, damage fees, and total

### 4. Admin Marks Penalties Paid
- Admin can mark penalties as paid
- Updates penalty status and timestamp

## Penalty Calculation Logic

```php
public function calculateTotalPenalties($damageLevel = 'none')
{
    $total = 0;
    
    // Add delay penalties
    $total += $this->calculateDelayPenalties();
    
    // Add damage fees based on level
    switch ($damageLevel) {
        case 'minor':
            $total += $this->damage_fee_min; // ₱200
            break;
        case 'major':
            $total += $this->damage_fee_max ?? $this->quotation_amount ?? 0;
            break;
        case 'severe':
            $total += $this->quotation_amount ?? 0; // Full payment
            break;
    }
    
    return $total;
}
```

## Status Flow

1. **Pending** → Customer submits rental
2. **Confirmed** → Admin accepts order
3. **Quotation Sent** → Admin sends quotation
4. **Ready for Pickup** → Customer accepts quotation
5. **Rented** → Item is picked up
6. **Returned** → Item is returned
7. **Penalties Applied** → Admin calculates penalties
8. **Penalties Paid** → Customer settles penalties

## Notes

- Penalties are automatically calculated for delays
- Damage fees require admin assessment
- All penalties must be settled before future rentals
- System maintains audit trail of penalty calculations
- Customer agreement is required for all rentals
