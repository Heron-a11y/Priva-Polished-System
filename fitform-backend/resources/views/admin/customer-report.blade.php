<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Customer Report - {{ $customer->name }}</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 20px;
            color: #333;
        }
        .header {
            text-align: center;
            border-bottom: 2px solid #014D40;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        .header h1 {
            color: #014D40;
            margin: 0;
        }
        .customer-info {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 30px;
        }
        .section {
            margin-bottom: 30px;
        }
        .section h2 {
            color: #014D40;
            border-bottom: 1px solid #014D40;
            padding-bottom: 10px;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 15px;
        }
        th, td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: left;
        }
        th {
            background-color: #014D40;
            color: white;
        }
        .footer {
            margin-top: 50px;
            text-align: center;
            font-size: 12px;
            color: #666;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>Customer Report</h1>
        <p>Generated on: {{ $generated_at->format('F j, Y \a\t g:i A') }}</p>
    </div>

    <div class="customer-info">
        <h2>Customer Information</h2>
        <p><strong>Name:</strong> {{ $customer->name }}</p>
        <p><strong>Email:</strong> {{ $customer->email }}</p>
        <p><strong>Phone:</strong> {{ $customer->phone ?? 'Not provided' }}</p>
        <p><strong>Account Status:</strong> {{ ucfirst($customer->account_status ?? 'active') }}</p>
        <p><strong>Member Since:</strong> {{ $customer->created_at->format('F j, Y') }}</p>
        @if($customer->last_activity)
        <p><strong>Last Activity:</strong> {{ $customer->last_activity->format('F j, Y \a\t g:i A') }}</p>
        @endif
    </div>

    <div class="section">
        <h2>Appointments ({{ $appointments->count() }})</h2>
        @if($appointments->count() > 0)
        <table>
            <thead>
                <tr>
                    <th>Date</th>
                    <th>Time</th>
                    <th>Status</th>
                    <th>Notes</th>
                </tr>
            </thead>
            <tbody>
                @foreach($appointments as $appointment)
                <tr>
                    <td>{{ $appointment->appointment_date ? $appointment->appointment_date->format('M j, Y') : 'N/A' }}</td>
                    <td>{{ $appointment->appointment_time ?? 'N/A' }}</td>
                    <td>{{ ucfirst($appointment->status ?? 'pending') }}</td>
                    <td>{{ $appointment->notes ?? 'None' }}</td>
                </tr>
                @endforeach
            </tbody>
        </table>
        @else
        <p>No appointments found.</p>
        @endif
    </div>

    <div class="section">
        <h2>Rentals ({{ $rentals->count() }})</h2>
        @if($rentals->count() > 0)
        <table>
            <thead>
                <tr>
                    <th>Item</th>
                    <th>Rental Date</th>
                    <th>Return Date</th>
                    <th>Amount</th>
                    <th>Status</th>
                </tr>
            </thead>
            <tbody>
                @foreach($rentals as $rental)
                <tr>
                    <td>{{ $rental->item_name ?? 'N/A' }}</td>
                    <td>{{ $rental->rental_date ? $rental->rental_date->format('M j, Y') : 'N/A' }}</td>
                    <td>{{ $rental->return_date ? $rental->return_date->format('M j, Y') : 'N/A' }}</td>
                    <td>PHP {{ number_format($rental->quotation_amount ?? 0, 2) }}</td>
                    <td>{{ ucfirst($rental->status ?? 'pending') }}</td>
                </tr>
                @endforeach
            </tbody>
        </table>
        @else
        <p>No rentals found.</p>
        @endif
    </div>

    <div class="section">
        <h2>Purchases ({{ $purchases->count() }})</h2>
        @if($purchases->count() > 0)
        <table>
            <thead>
                <tr>
                    <th>Item</th>
                    <th>Purchase Date</th>
                    <th>Amount</th>
                    <th>Status</th>
                </tr>
            </thead>
            <tbody>
                @foreach($purchases as $purchase)
                <tr>
                    <td>{{ $purchase->item_name ?? 'N/A' }}</td>
                    <td>{{ $purchase->created_at->format('M j, Y') }}</td>
                    <td>PHP {{ number_format($purchase->quotation_price ?? 0, 2) }}</td>
                    <td>{{ ucfirst($purchase->status ?? 'pending') }}</td>
                </tr>
                @endforeach
            </tbody>
        </table>
        @else
        <p>No purchases found.</p>
        @endif
    </div>

    <div class="footer">
        <p>This report was generated automatically by the FitForm Admin System.</p>
    </div>
</body>
</html>