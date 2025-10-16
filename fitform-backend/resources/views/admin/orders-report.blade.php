<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Orders Report - {{ $generated_at->format('F j, Y') }}</title>
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
        .stats {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 30px;
        }
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 20px;
        }
        .stat-item {
            text-align: center;
        }
        .stat-number {
            font-size: 24px;
            font-weight: bold;
            color: #014D40;
            margin-bottom: 5px;
        }
        .stat-label {
            font-size: 14px;
            color: #666;
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
        .status-badge {
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: bold;
        }
        .status-completed { background-color: #4CAF50; color: white; }
        .status-returned { background-color: #4CAF50; color: white; }
        .status-picked_up { background-color: #4CAF50; color: white; }
        .status-pending { background-color: #FF9800; color: white; }
        .status-cancelled { background-color: #F44336; color: white; }
        .status-declined { background-color: #F44336; color: white; }
        .status-quotation_sent { background-color: #2196F3; color: white; }
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
        <h1>Orders Report</h1>
        <p>Generated on: {{ $generated_at->format('F j, Y \a\t g:i A') }}</p>
    </div>

    <div class="stats">
        <h2>Summary Statistics</h2>
        <div class="stats-grid">
            <div class="stat-item">
                <div class="stat-number">{{ $stats['total_orders'] }}</div>
                <div class="stat-label">Total Orders</div>
            </div>
            <div class="stat-item">
                <div class="stat-number">{{ $stats['pending_orders'] }}</div>
                <div class="stat-label">Pending</div>
            </div>
            <div class="stat-item">
                <div class="stat-number">{{ $stats['completed_orders'] }}</div>
                <div class="stat-label">Paid Orders</div>
            </div>
            <div class="stat-item">
                <div class="stat-number">{{ $stats['cancelled_orders'] }}</div>
                <div class="stat-label">Cancelled</div>
            </div>
        </div>
        <div class="stats-grid" style="margin-top: 20px;">
            <div class="stat-item">
                <div class="stat-number">PHP {{ number_format($stats['total_revenue'], 2) }}</div>
                <div class="stat-label">Total Revenue</div>
            </div>
            <div class="stat-item">
                <div class="stat-number">{{ $stats['rental_count'] }}</div>
                <div class="stat-label">Rentals</div>
            </div>
            <div class="stat-item">
                <div class="stat-number">{{ $stats['purchase_count'] }}</div>
                <div class="stat-label">Purchases</div>
            </div>
            <div class="stat-item">
                <div class="stat-number">PHP {{ number_format($stats['rental_revenue'] + $stats['purchase_revenue'], 2) }}</div>
                <div class="stat-label">Combined Revenue</div>
            </div>
        </div>
    </div>

    <div class="section">
        <h2>All Orders ({{ $orders->count() }})</h2>
        @if($orders->count() > 0)
        <table>
            <thead>
                <tr>
                    <th>Order ID</th>
                    <th>Customer</th>
                    <th>Order Type</th>
                    <th>Clothing Type</th>
                    <th>Date</th>
                    <th>Amount</th>
                    <th>Status</th>
                </tr>
            </thead>
            <tbody>
                @foreach($orders as $order)
                <tr>
                    <td>#{{ $order->id }}</td>
                    <td>{{ $order->customer_name ?? 'N/A' }}</td>
                    <td>{{ $order->order_type ?? 'N/A' }}</td>
                    <td>{{ $order->clothing_type ?? 'N/A' }}</td>
                    <td>{{ $order->created_at ? \Carbon\Carbon::parse($order->created_at)->format('M j, Y') : 'N/A' }}</td>
                    <td>PHP {{ number_format($order->total_amount ?? 0, 2) }}</td>
                    <td>
                        <span class="status-badge status-{{ $order->status ?? 'pending' }}">
                            {{ ucfirst($order->status ?? 'pending') }}
                        </span>
                    </td>
                </tr>
                @endforeach
            </tbody>
        </table>
        @else
        <p>No orders found.</p>
        @endif
    </div>

    <div class="footer">
        <p>This report was generated automatically by the FitForm Admin System.</p>
    </div>
</body>
</html>
