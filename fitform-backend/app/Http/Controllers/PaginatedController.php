<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\Log;

abstract class PaginatedController extends Controller
{
    /**
     * Paginate query results with search, filtering, and sorting
     */
    protected function paginate(Builder $query, Request $request, array $options = [])
    {
        try {
            // Default options
            $defaultOptions = [
                'search_fields' => [],
                'filter_fields' => [],
                'sort_fields' => [],
                'default_per_page' => 15,
                'max_per_page' => 100,
                'transform' => null
            ];

            $options = array_merge($defaultOptions, $options);

            // Apply search
            if ($request->has('search') && !empty($request->search) && !empty($options['search_fields'])) {
                $search = $request->search;
                $query->where(function ($q) use ($search, $options) {
                    foreach ($options['search_fields'] as $field) {
                        $q->orWhere($field, 'like', "%{$search}%");
                    }
                });
            }

            // Apply filters
            foreach ($options['filter_fields'] as $field) {
                // Check for direct parameter first
                if ($request->has($field) && $request->$field !== null && $request->$field !== '') {
                    $value = $request->$field;
                    if (is_array($value)) {
                        $query->whereIn($field, $value);
                    } else {
                        $query->where($field, $value);
                    }
                }
                // Also check for nested filters parameter (e.g., filters[account_status])
                elseif ($request->has('filters') && is_array($request->filters) && isset($request->filters[$field])) {
                    $value = $request->filters[$field];
                    if ($value !== null && $value !== '') {
                        if (is_array($value)) {
                            $query->whereIn($field, $value);
                        } else {
                            $query->where($field, $value);
                        }
                    }
                }
            }

            // Apply sorting
            if ($request->has('sort_by') && in_array($request->sort_by, $options['sort_fields'])) {
                $direction = $request->has('sort_direction') && in_array($request->sort_direction, ['asc', 'desc']) 
                    ? $request->sort_direction 
                    : 'asc';
                $query->orderBy($request->sort_by, $direction);
            } else {
                $query->orderBy('created_at', 'desc');
            }

            // Get pagination parameters
            $perPage = min(
                $request->get('per_page', $options['default_per_page']),
                $options['max_per_page']
            );
            $page = $request->get('page', 1);

            // Get total count before pagination
            $total = $query->count();

            // Apply pagination
            $items = $query->skip(($page - 1) * $perPage)->take($perPage)->get();

            // Apply transformation if provided
            if ($options['transform'] && is_callable($options['transform'])) {
                $items = $items->map($options['transform']);
            }

            // Create pagination response
            $pagination = [
                'current_page' => $page,
                'per_page' => $perPage,
                'total' => $total,
                'last_page' => ceil($total / $perPage),
                'from' => ($page - 1) * $perPage + 1,
                'to' => min($page * $perPage, $total),
                'has_more_pages' => $page < ceil($total / $perPage)
            ];

            return response()->json([
                'success' => true,
                'data' => $items,
                'pagination' => $pagination,
                'filters' => $request->only(array_merge($options['search_fields'], $options['filter_fields'])),
                'message' => 'Data retrieved successfully'
            ]);

        } catch (\Exception $e) {
            Log::error('Pagination error: ' . $e->getMessage());
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve data',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get pagination statistics
     */
    protected function getPaginationStats($query, Request $request, array $options = [])
    {
        try {
            $defaultOptions = [
                'search_fields' => [],
                'filter_fields' => []
            ];

            $options = array_merge($defaultOptions, $options);

            // Apply same filters as main query
            if ($request->has('search') && !empty($request->search) && !empty($options['search_fields'])) {
                $search = $request->search;
                $query->where(function ($q) use ($search, $options) {
                    foreach ($options['search_fields'] as $field) {
                        $q->orWhere($field, 'like', "%{$search}%");
                    }
                });
            }

            foreach ($options['filter_fields'] as $field) {
                if ($request->has($field) && $request->$field !== null && $request->$field !== '') {
                    $value = $request->$field;
                    if (is_array($value)) {
                        $query->whereIn($field, $value);
                    } else {
                        $query->where($field, $value);
                    }
                }
            }

            return [
                'total' => $query->count(),
                'filters_applied' => $request->only(array_merge($options['search_fields'], $options['filter_fields']))
            ];

        } catch (\Exception $e) {
            Log::error('Pagination stats error: ' . $e->getMessage());
            return ['total' => 0, 'filters_applied' => []];
        }
    }
}
