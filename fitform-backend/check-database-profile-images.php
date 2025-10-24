<?php

require_once 'vendor/autoload.php';

// Bootstrap Laravel
$app = require_once 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use App\Models\User;
use App\Models\Appointment;

echo "========================================\n";
echo "Checking Database for Profile Images\n";
echo "========================================\n\n";

// Check users with profile images
echo "[1/4] Checking users with profile images...\n";
$usersWithImages = User::whereNotNull('profile_image')->get();
echo "Users with profile images: " . $usersWithImages->count() . "\n";

foreach ($usersWithImages as $user) {
    echo "- User ID: {$user->id}, Name: {$user->name}, Profile Image: {$user->profile_image}\n";
}

echo "\n[2/4] Checking all users...\n";
$allUsers = User::all();
echo "Total users: " . $allUsers->count() . "\n";

foreach ($allUsers as $user) {
    echo "- User ID: {$user->id}, Name: {$user->name}, Profile Image: " . ($user->profile_image ?: 'NULL') . "\n";
}

echo "\n[3/4] Checking appointments with user relationships...\n";
$appointments = Appointment::with('user:id,name,profile_image')->get();
echo "Total appointments: " . $appointments->count() . "\n";

foreach ($appointments as $appointment) {
    echo "- Appointment ID: {$appointment->id}, User ID: {$appointment->user_id}\n";
    if ($appointment->user) {
        echo "  - User Name: {$appointment->user->name}\n";
        echo "  - User Profile Image: " . ($appointment->user->profile_image ?: 'NULL') . "\n";
    } else {
        echo "  - No user relationship found!\n";
    }
}

echo "\n[4/4] Testing admin appointments API response...\n";
$adminAppointments = Appointment::with('user:id,name,profile_image')->orderBy('appointment_date', 'desc')->get();
$adminAppointments->transform(function ($appointment) {
    $appointment->customer_name = $appointment->user ? $appointment->user->name : null;
    $appointment->customer_profile_image = $appointment->user ? $appointment->user->profile_image : null;
    unset($appointment->user);
    return $appointment;
});

echo "Admin appointments API would return:\n";
foreach ($adminAppointments as $appointment) {
    echo "- Appointment ID: {$appointment->id}\n";
    echo "  - Customer Name: " . ($appointment->customer_name ?: 'NULL') . "\n";
    echo "  - Customer Profile Image: " . ($appointment->customer_profile_image ?: 'NULL') . "\n";
}

echo "\n========================================\n";
echo "Database Check Complete!\n";
echo "========================================\n";
