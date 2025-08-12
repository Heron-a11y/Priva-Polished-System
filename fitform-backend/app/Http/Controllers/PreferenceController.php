<?php
namespace App\Http\Controllers;

use App\Models\Preference;
use Illuminate\Http\Request;

class PreferenceController extends Controller
{
    public function index(Request $request)
    {
        $preference = Preference::where('user_id', $request->user()->id)->first();
        return response()->json($preference);
    }

    public function store(Request $request)
    {
        $data = $request->only([
            'preferred_style', 'preferred_color', 'preferred_size',
            'preferred_material', 'preferred_fit', 'preferred_pattern',
            'preferred_budget', 'preferred_season', 'preferred_length',
            'preferred_sleeve', 'notes'
        ]);
        $preference = Preference::updateOrCreate(
            ['user_id' => $request->user()->id],
            $data
        );
        return response()->json($preference, 201);
    }
} 