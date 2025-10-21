# Auto-Cancellation of Pending Appointments

This system automatically cancels pending appointments that have not been confirmed by admin for 2 days.

## Files Created

1. **`app/Console/Commands/AutoCancelPendingAppointments.php`** - The main command that handles the auto-cancellation logic
2. **`routes/console.php`** - Updated to schedule the command to run daily at 2 AM
3. **`test-auto-cancel.php`** - Test script to verify functionality
4. **`run-auto-cancel.bat`** - Windows batch file to run the command manually
5. **`run-auto-cancel.sh`** - Linux/Mac shell script to run the command manually

## How It Works

1. **Daily Schedule**: The command runs automatically every day at 2:00 AM
2. **2-Day Rule**: Any appointment with status 'pending' that was created more than 2 days ago gets cancelled
3. **Logging**: All cancellations are logged with detailed information
4. **Safety**: Uses `withoutOverlapping()` to prevent multiple instances running simultaneously

## Manual Testing

### Test the Logic (Dry Run)
```bash
php test-auto-cancel.php
```

### Run the Actual Command
```bash
# Windows
run-auto-cancel.bat

# Linux/Mac
chmod +x run-auto-cancel.sh
./run-auto-cancel.sh

# Or directly with artisan
php artisan appointments:auto-cancel
```

## Production Setup

### 1. Ensure Laravel Scheduler is Running

Add this to your server's crontab to run Laravel's scheduler:
```bash
* * * * * cd /path/to/your/project && php artisan schedule:run >> /dev/null 2>&1
```

### 2. Verify the Schedule

Check if the schedule is working:
```bash
php artisan schedule:list
```

### 3. Monitor Logs

Check the Laravel logs for auto-cancellation activity:
```bash
tail -f storage/logs/laravel.log
```

## Command Details

- **Command Name**: `appointments:auto-cancel`
- **Schedule**: Daily at 2:00 AM
- **Overlap Protection**: Yes (prevents multiple instances)
- **Logging**: Full logging of all cancellations

## Database Impact

The command updates the `status` field from 'pending' to 'cancelled' for qualifying appointments. No data is deleted.

## Monitoring

Look for these log entries:
- `Auto-cancelled appointment` - Individual appointment cancellations
- `Auto-cancellation completed` - Summary of the run
- `No pending appointments found` - When no cancellations needed

## Troubleshooting

1. **Command not found**: Ensure you're in the project root directory
2. **Permission denied**: Check file permissions on the shell scripts
3. **Schedule not running**: Verify the crontab entry for Laravel scheduler
4. **No cancellations**: Check if there are actually pending appointments older than 2 days





