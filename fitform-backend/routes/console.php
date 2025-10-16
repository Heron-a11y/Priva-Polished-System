<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Schedule the auto-cancellation of pending appointments to run daily at 2 AM
Schedule::command('appointments:auto-cancel')
    ->dailyAt('02:00')
    ->name('auto-cancel-pending-appointments')
    ->withoutOverlapping();

// Schedule processing of pending appointments when auto-approval is enabled
Schedule::command('appointments:process-pending')
    ->everyMinute()
    ->name('process-pending-appointments')
    ->withoutOverlapping();
