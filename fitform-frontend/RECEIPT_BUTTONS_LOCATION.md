# Receipt Buttons Location Guide

## 📍 Where to Find Receipt Buttons in Admin Interface

The receipt buttons are located in the **Admin Orders Screen** (`fitform-frontend/app/admin/orders.tsx`) and appear in the order details modal when viewing specific transactions.

### 🎯 **Receipt Button Locations:**

#### 1. **Purchase Orders - Picked Up Status**
- **Location**: Order Details Modal → Purchase Picked Up Section
- **Button**: Green "Download Receipt" button with gold text
- **Appears When**: Purchase status is `picked_up`
- **API Endpoint**: `/api/purchases/{id}/receipt`

#### 2. **Rental Orders - Picked Up Status**  
- **Location**: Order Details Modal → Rental Picked Up Section
- **Button**: Blue "Download Receipt" button with white text
- **Appears When**: Rental status is `picked_up`
- **API Endpoint**: `/api/rentals/{id}/receipt`

#### 3. **Rental Orders - Returned Status**
- **Location**: Order Details Modal → Rental Returned Section  
- **Button**: Green "Download Receipt" button with gold text
- **Appears When**: Rental status is `returned`
- **API Endpoint**: `/api/rentals/{id}/receipt`

### 🚀 **How to Access Receipt Buttons:**

1. **Navigate to Admin Orders Screen**
   - Go to the admin dashboard
   - Click on "Orders" section

2. **Open Order Details**
   - Click on any order card in the orders list
   - This opens the order details modal

3. **Find Receipt Button**
   - Look for completed transactions (picked_up or returned status)
   - Receipt buttons appear in the status-specific sections
   - Button will be labeled "Download Receipt" with receipt icon

### 🎨 **Button Styling:**

| Transaction Type | Status | Button Color | Text Color | Icon |
|----------------|--------|--------------|------------|------|
| Purchase | picked_up | Green (#014D40) | Gold (#FFD700) | receipt-outline |
| Rental | picked_up | Blue (#2196f3) | White (#fff) | receipt-outline |
| Rental | returned | Green (#014D40) | Gold (#FFD700) | receipt-outline |

### 📱 **Button Functionality:**

- **Click Action**: Opens receipt PDF in browser
- **Download**: PDF automatically downloads to device
- **Error Handling**: Shows alert if receipt generation fails
- **File Naming**: `{type}-receipt-{id}-{date}.pdf`

### 🔧 **Technical Implementation:**

- **React Native**: Uses `Linking.openURL()` for external URL opening
- **Backend**: Generates PDF using DomPDF library
- **Templates**: Professional receipt templates with tailor signature
- **Validation**: Only shows for eligible transaction statuses

### 📋 **Receipt Content Includes:**

- **Business Header**: FitForm Tailoring branding
- **Receipt Number**: Unique receipt identifier
- **Customer Information**: Name, email, contact details
- **Transaction Details**: Item name, type, dates, amounts
- **Financial Summary**: Total amounts, penalties (if applicable)
- **Tailor Signature**: "Cristelle Mae D. Nañez"
- **Professional Styling**: Clean, business-appropriate design

### 🚨 **Important Notes:**

- Receipt buttons only appear for **completed transactions**
- Purchase receipts require `picked_up` status
- Rental receipts require `picked_up` or `returned` status
- Backend server must be running for receipt generation
- PDFs are generated on-demand when buttons are clicked

### 🔍 **Troubleshooting:**

If receipt buttons are not visible:
1. Check transaction status (must be picked_up or returned)
2. Verify you're in the correct order details modal
3. Ensure backend server is running
4. Check browser console for any JavaScript errors

---

**File Location**: `fitform-frontend/app/admin/orders.tsx`  
**Implementation Date**: January 2025  
**Status**: ✅ Complete and Functional
