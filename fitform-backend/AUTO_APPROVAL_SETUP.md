# Auto-Approval System for Appointments

This system allows admins to automatically approve appointment requests when certain conditions are met.

## Features

- **Toggle Auto-Approval**: Admin can enable/disable auto-approval
- **Daily Limit**: Respects maximum appointments per day (default: 5)
- **Business Hours**: Only approves appointments within business hours (default: 10:00-19:00)
- **Time Slot Validation**: Prevents conflicts with existing appointments
- **Comprehensive Logging**: All auto-approvals and skipped approvals are logged

## Database Changes

### New Table: `admin_settings`
- `auto_approve_appointments` (boolean) - Enable/disable auto-approval
- `max_appointments_per_day` (integer) - Daily appointment limit (default: 5)
- `business_start_time` (time) - Business start time (default: 10:00)
- `business_end_time` (time) - Business end time (default: 19:00)

## API Endpoints

### Get Admin Settings
```
GET /api/admin/settings
```
Returns current admin settings.

### Update Admin Settings
```
PUT /api/admin/settings
Content-Type: application/json

{
    "auto_approve_appointments": true,
    "max_appointments_per_day": 5,
    "business_start_time": "10:00",
    "business_end_time": "19:00"
}
```

### Toggle Auto-Approval
```
POST /api/admin/settings/toggle-auto-approval
Content-Type: application/json

{
    "enabled": true
}
```

## Auto-Approval Logic with First-Come-First-Served Priority

When a new appointment is created, the system checks:

1. **Auto-approval enabled**: `auto_approve_appointments` must be `true`
2. **Business hours**: Appointment time must be within `business_start_time` and `business_end_time`
3. **Time slot conflicts**: Check for existing appointments within 15 minutes of the requested time
   - **First-come-first-served priority**: If conflicts exist, the appointment created first gets priority
   - **Auto-cancel conflicts**: Later appointments for the same time slot are automatically cancelled
4. **Daily limit**: Total appointments for that day must be less than `max_appointments_per_day`

If all conditions are met, the appointment status is automatically changed from `pending` to `confirmed`.

### Priority System Details

- **First appointment wins**: The first person to book a time slot gets priority
- **Automatic cancellation**: Later appointments for the same time slot are auto-cancelled
- **Fair system**: Based on creation timestamp, not admin intervention
- **Comprehensive logging**: All priority decisions are logged with timestamps

## Testing

### Manual Test
```bash
php test-auto-approval.php
```

### API Testing
```bash
# Get current settings
curl -X GET "http://localhost:8000/api/admin/settings" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"

# Toggle auto-approval
curl -X POST "http://localhost:8000/api/admin/settings/toggle-auto-approval" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{"enabled": true}'
```

## Logging

The system logs all auto-approval activities:

- **Auto-approved**: When an appointment is automatically approved
- **Skipped - Outside business hours**: When appointment time is outside business hours
- **Skipped - Daily limit reached**: When daily appointment limit is reached
- **Skipped - Time slot conflict**: When there's a scheduling conflict
- **Auto-approval check failed**: When an error occurs during the check

## Configuration

### Default Settings
- Auto-approval: **Disabled**
- Max appointments per day: **5**
- Business hours: **10:00 - 19:00**

### Admin Control
Only users with `role = 'admin'` can:
- View admin settings
- Update admin settings
- Toggle auto-approval

## Integration

The auto-approval check is automatically triggered when:
- A new appointment is created via `POST /api/appointments`
- The appointment status is initially set to `pending`
- The system immediately checks if auto-approval conditions are met

## Monitoring

Check logs for auto-approval activity:
```bash
tail -f storage/logs/laravel.log | grep -i "auto-approval\|auto-approved"
```

## Security

- All admin endpoints require authentication
- Only admin users can access settings endpoints
- All settings changes are logged with admin user ID
- Input validation prevents invalid settings
