<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Purchase Receipt</title>
    <style>
        body {
            font-family: 'Arial', sans-serif;
            margin: 0;
            padding: 10px;
            background-color: white;
            font-size: 12px;
        }
        .receipt-container {
            max-width: 100%;
            margin: 0 auto;
            background-color: white;
            padding: 15px;
            border: 2px solid #014D40;
        }
        .header {
            text-align: center;
            border-bottom: 2px solid #014D40;
            padding-bottom: 10px;
            margin-bottom: 15px;
        }
        .business-name {
            font-size: 20px;
            font-weight: bold;
            color: #014D40;
            margin-bottom: 3px;
        }
        .business-tagline {
            font-size: 10px;
            color: #666;
            margin-bottom: 5px;
        }
        .receipt-title {
            font-size: 16px;
            font-weight: bold;
            color: #014D40;
            margin-top: 8px;
        }
        .receipt-info {
            display: flex;
            justify-content: space-between;
            margin-bottom: 15px;
            padding: 8px;
            background-color: #f8f9fa;
            border-radius: 4px;
        }
        .receipt-info-left, .receipt-info-right {
            flex: 1;
        }
        .info-label {
            font-weight: bold;
            color: #014D40;
            font-size: 10px;
        }
        .info-value {
            color: #333;
            margin-bottom: 4px;
            font-size: 10px;
        }
        .customer-section {
            margin-bottom: 15px;
            padding: 8px;
            background-color: #f8f9fa;
            border-radius: 4px;
        }
        .section-title {
            font-size: 12px;
            font-weight: bold;
            color: #014D40;
            margin-bottom: 8px;
            border-bottom: 1px solid #014D40;
            padding-bottom: 2px;
        }
        .transaction-details {
            margin-bottom: 15px;
        }
        .detail-row {
            display: flex;
            justify-content: space-between;
            padding: 3px 0;
            border-bottom: 1px solid #eee;
            font-size: 10px;
        }
        .detail-label {
            font-weight: bold;
            color: #014D40;
        }
        .detail-value {
            color: #333;
        }
        .amount-section {
            background-color: #e8f5e8;
            padding: 10px;
            border-radius: 4px;
            margin-bottom: 15px;
            border-left: 3px solid #014D40;
        }
        .total-amount {
            font-size: 14px;
            font-weight: bold;
            color: #014D40;
            text-align: center;
        }
        .footer {
            text-align: center;
            margin-top: 15px;
            padding-top: 10px;
            border-top: 1px solid #014D40;
        }
        .footer-text {
            color: #666;
            font-size: 9px;
            margin-bottom: 3px;
        }
        .tailor-signature {
            margin-top: 15px;
            text-align: center;
        }
        .signature-line {
            border-bottom: 1px solid #333;
            width: 150px;
            margin: 0 auto 3px;
        }
        .status-badge {
            display: inline-block;
            padding: 2px 6px;
            border-radius: 10px;
            font-size: 8px;
            font-weight: bold;
            text-transform: uppercase;
        }
        .status-picked-up {
            background-color: #e8f5e8;
            color: #388e3c;
        }
        .two-column {
            display: flex;
            gap: 10px;
        }
        .column {
            flex: 1;
        }
    </style>
</head>
<body>
    <div class="receipt-container">
        <!-- Header -->
        <div class="header">
            <div class="business-name">FitForm Tailoring</div>
            <div class="business-tagline">Professional Garment Services</div>
            <div class="receipt-title">PURCHASE RECEIPT</div>
        </div>

        <!-- Receipt Information -->
        <div class="receipt-info">
            <div class="receipt-info-left">
                <div class="info-label">Receipt #:</div>
                <div class="info-value">{{ $receipt_number }}</div>
                <div class="info-label">Date:</div>
                <div class="info-value">{{ $generated_at->format('M d, Y') }}</div>
            </div>
            <div class="receipt-info-right">
                <div class="info-label">Order #:</div>
                <div class="info-value">#{{ $transaction->id }}</div>
                <div class="info-label">Status:</div>
                <div class="info-value">
                    <span class="status-badge status-{{ $transaction->status }}">
                        {{ ucfirst(str_replace('_', ' ', $transaction->status)) }}
                    </span>
                </div>
            </div>
        </div>

        <!-- Two Column Layout -->
        <div class="two-column">
            <!-- Customer Information -->
            <div class="column">
                <div class="customer-section">
                    <div class="section-title">Customer Info</div>
                    <div class="detail-row">
                        <span class="detail-label">Name:</span>
                        <span class="detail-value">{{ $customer->name }}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Email:</span>
                        <span class="detail-value">{{ $customer->email }}</span>
                    </div>
                </div>
            </div>

            <!-- Transaction Details -->
            <div class="column">
                <div class="transaction-details">
                    <div class="section-title">Transaction Details</div>
                    <div class="detail-row">
                        <span class="detail-label">Item:</span>
                        <span class="detail-value">{{ $transaction->item_name }}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Type:</span>
                        <span class="detail-value">{{ $transaction->clothing_type }}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Purchase Type:</span>
                        <span class="detail-value">{{ ucfirst($transaction->purchase_type) }}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Purchase Date:</span>
                        <span class="detail-value">{{ \Carbon\Carbon::parse($transaction->purchase_date)->format('M d, Y') }}</span>
                    </div>
                </div>
            </div>
        </div>

        @if($transaction->notes)
        <div class="detail-row">
            <span class="detail-label">Notes:</span>
            <span class="detail-value">{{ $transaction->notes }}</span>
        </div>
        @endif

        <!-- Amount Section -->
        <div class="amount-section">
            <div class="detail-row">
                <span class="detail-label">Purchase Amount:</span>
                <span class="detail-value">₱{{ number_format($transaction->quotation_price, 2, '.', ',') }}</span>
            </div>
            <div class="total-amount">
                Total: ₱{{ number_format($transaction->quotation_price, 2, '.', ',') }}
            </div>
        </div>

        <!-- Tailor Signature -->
        <div class="tailor-signature">
            <div class="signature-line"></div>
            <div class="footer-text">{{ $tailor_name }}</div>
            <div class="footer-text">Tailor</div>
        </div>

        <!-- Footer -->
        <div class="footer">
            <div class="footer-text">Thank you for choosing FitForm Tailoring!</div>
            <div class="footer-text">Generated: {{ $generated_at->format('M d, Y g:i A') }}</div>
        </div>
    </div>
</body>
</html>
