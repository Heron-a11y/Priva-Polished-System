<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    /** @use HasFactory<\Database\Factories\UserFactory> */
    use HasApiTokens, HasFactory, Notifiable;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'email',
        'password',
        'role',
        'is_super_admin',
        'profile_image',
        'phone',
        'address',
        'city',
        'state',
        'zip_code',
        'country',
        'date_of_birth',
        'gender',
        'account_status',
        'suspension_start',
        'suspension_end',
        'suspension_reason',
        'ban_reason',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
        ];
    }

    /**
     * Check if user is an admin
     */
    public function isAdmin(): bool
    {
        return $this->role === 'admin';
    }

    /**
     * Check if user is a customer
     */
    public function isCustomer(): bool
    {
        return $this->role === 'customer';
    }

    /**
     * Check if user is a super admin
     */
    public function isSuperAdmin(): bool
    {
        return $this->role === 'admin' && (bool) $this->is_super_admin;
    }

    /**
     * Check if user can be demoted (not super admin)
     */
    public function canBeDemoted(): bool
    {
        return !$this->isSuperAdmin();
    }

    /**
     * Get user's orders
     */
    public function orders()
    {
        return $this->hasMany(Order::class);
    }

    /**
     * Get user's appointments
     */
    public function appointments()
    {
        return $this->hasMany(Appointment::class);
    }

    /**
     * Get user's rentals
     */
    public function rentals()
    {
        return $this->hasMany(Rental::class);
    }

    /**
     * Get user's purchases
     */
    public function purchases()
    {
        return $this->hasMany(Purchase::class);
    }

    /**
     * Get user's measurement history
     */
    public function measurementHistory()
    {
        return $this->hasMany(\App\Models\MeasurementHistory::class);
    }
}
