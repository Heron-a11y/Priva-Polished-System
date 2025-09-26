<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;
use App\Models\RentalPurchaseHistory;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Migrate data from separate tables to unified table
        if (Schema::hasTable('rental_history')) {
            $rentalHistory = DB::table('rental_history')->get();
            foreach ($rentalHistory as $rental) {
                RentalPurchaseHistory::create([
                    'user_id' => $rental->user_id,
                    'order_type' => 'rental',
                    'item_name' => $rental->item_name,
                    'order_subtype' => $rental->rental_type,
                    'order_date' => $rental->rental_date,
                    'return_date' => $rental->return_date,
                    'status' => $rental->status,
                    'clothing_type' => $rental->clothing_type,
                    'measurements' => $rental->measurements,
                    'notes' => $rental->notes,
                    'customer_name' => $rental->customer_name,
                    'customer_email' => $rental->customer_email,
                    'quotation_amount' => $rental->quotation_amount,
                    'quotation_notes' => $rental->quotation_notes,
                    'quotation_status' => $rental->quotation_status,
                    'quotation_sent_at' => $rental->quotation_sent_at,
                    'quotation_responded_at' => $rental->quotation_responded_at,
                    'penalty_breakdown' => $rental->penalty_breakdown,
                    'total_penalties' => $rental->total_penalties,
                    'penalty_status' => $rental->penalty_status,
                    'agreement_accepted' => $rental->agreement_accepted,
                    'created_at' => $rental->created_at,
                    'updated_at' => $rental->updated_at,
                    'deleted_at' => $rental->deleted_at,
                ]);
            }
        }

        if (Schema::hasTable('purchase_history')) {
            $purchaseHistory = DB::table('purchase_history')->get();
            foreach ($purchaseHistory as $purchase) {
                RentalPurchaseHistory::create([
                    'user_id' => $purchase->user_id,
                    'order_type' => 'purchase',
                    'item_name' => $purchase->item_name,
                    'order_subtype' => $purchase->purchase_type,
                    'order_date' => $purchase->purchase_date,
                    'return_date' => null,
                    'status' => $purchase->status,
                    'clothing_type' => $purchase->clothing_type,
                    'measurements' => $purchase->measurements,
                    'notes' => $purchase->notes,
                    'customer_name' => $purchase->customer_name,
                    'customer_email' => $purchase->customer_email,
                    'quotation_amount' => $purchase->quotation_amount,
                    'quotation_price' => $purchase->quotation_price,
                    'quotation_notes' => $purchase->quotation_notes,
                    'quotation_status' => $purchase->quotation_status,
                    'quotation_sent_at' => $purchase->quotation_sent_at,
                    'quotation_responded_at' => $purchase->quotation_responded_at,
                    'penalty_breakdown' => null,
                    'total_penalties' => 0,
                    'penalty_status' => 'none',
                    'agreement_accepted' => false,
                    'created_at' => $purchase->created_at,
                    'updated_at' => $purchase->updated_at,
                    'deleted_at' => $purchase->deleted_at,
                ]);
            }
        }

        // Drop the separate tables
        Schema::dropIfExists('rental_history');
        Schema::dropIfExists('purchase_history');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Recreate separate tables (simplified structure)
        Schema::create('rental_history', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('user_id');
            $table->string('item_name');
            $table->string('rental_type');
            $table->date('rental_date');
            $table->date('return_date');
            $table->enum('status', ['pending', 'quotation_sent', 'counter_offer_pending', 'in_progress', 'ready_for_pickup', 'picked_up', 'returned', 'declined'])->default('pending');
            $table->string('clothing_type');
            $table->json('measurements');
            $table->text('notes')->nullable();
            $table->string('customer_name');
            $table->string('customer_email');
            $table->decimal('quotation_amount', 10, 2)->nullable();
            $table->text('quotation_notes')->nullable();
            $table->enum('quotation_status', ['pending', 'accepted', 'rejected'])->default('pending');
            $table->timestamp('quotation_sent_at')->nullable();
            $table->timestamp('quotation_responded_at')->nullable();
            $table->json('penalty_breakdown')->nullable();
            $table->decimal('total_penalties', 10, 2)->default(0);
            $table->string('penalty_status')->default('none');
            $table->boolean('agreement_accepted')->default(false);
            $table->timestamp('deleted_at')->nullable();
            $table->timestamps();
            
            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
            $table->index(['user_id', 'status']);
            $table->index(['rental_date']);
        });

        Schema::create('purchase_history', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('user_id');
            $table->string('item_name')->nullable();
            $table->string('purchase_type');
            $table->date('purchase_date');
            $table->enum('status', ['pending', 'quotation_sent', 'counter_offer_pending', 'in_progress', 'ready_for_pickup', 'picked_up', 'declined'])->default('pending');
            $table->string('clothing_type');
            $table->json('measurements');
            $table->text('notes')->nullable();
            $table->string('customer_name');
            $table->string('customer_email');
            $table->decimal('quotation_amount', 10, 2)->nullable();
            $table->decimal('quotation_price', 10, 2)->nullable();
            $table->text('quotation_notes')->nullable();
            $table->enum('quotation_status', ['pending', 'accepted', 'rejected'])->default('pending');
            $table->timestamp('quotation_sent_at')->nullable();
            $table->timestamp('quotation_responded_at')->nullable();
            $table->timestamp('deleted_at')->nullable();
            $table->timestamps();
            
            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
            $table->index(['user_id', 'status']);
            $table->index(['purchase_date']);
        });
    }
};
