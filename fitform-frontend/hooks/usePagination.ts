import { useState, useEffect, useCallback } from 'react';

export interface PaginationMeta {
  current_page: number;
  per_page: number;
  total: number;
  last_page: number;
  from: number | null;
  to: number | null;
  has_more_pages: boolean;
}

export interface PaginationFilters {
  search?: string;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
  per_page?: number;
  [key: string]: any;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: PaginationMeta;
  filters: PaginationFilters;
}

export interface UsePaginationOptions {
  initialPage?: number;
  initialPerPage?: number;
  initialSearch?: string;
  initialSort?: {
    sort_by?: string;
    sort_order?: 'asc' | 'desc';
  };
  debounceMs?: number;
}

export interface UsePaginationReturn<T> {
  data: T[];
  pagination: PaginationMeta | null;
  filters: PaginationFilters;
  loading: boolean;
  error: string | null;
  
  // Pagination controls
  goToPage: (page: number) => void;
  nextPage: () => void;
  prevPage: () => void;
  setPerPage: (perPage: number) => void;
  
  // Filter controls
  setSearch: (search: string) => void;
  setSort: (sortBy: string, sortOrder?: 'asc' | 'desc') => void;
  setFilter: (key: string, value: any) => void;
  clearFilters: () => void;
  
  // Data management
  refresh: () => void;
  fetchData: (page?: number, filters?: Partial<PaginationFilters>) => Promise<void>;
}

export function usePagination<T>(
  fetchFunction: (page: number, filters: PaginationFilters) => Promise<PaginatedResponse<T>>,
  options: UsePaginationOptions = {}
): UsePaginationReturn<T> {
  const {
    initialPage = 1,
    initialPerPage = 15,
    initialSearch = '',
    initialSort = {},
    debounceMs = 300
  } = options;

  const [data, setData] = useState<T[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [filters, setFilters] = useState<PaginationFilters>({
    search: initialSearch,
    per_page: initialPerPage,
    sort_by: initialSort.sort_by,
    sort_order: initialSort.sort_order || 'desc'
  });

  const [currentPage, setCurrentPage] = useState(initialPage);
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);

  // Debounced search effect
  useEffect(() => {
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    const timeout = setTimeout(() => {
      if (filters.search !== initialSearch) {
        setCurrentPage(1); // Reset to first page when searching
        fetchData(1);
      }
    }, debounceMs);

    setSearchTimeout(timeout);

    return () => {
      if (timeout) clearTimeout(timeout);
    };
  }, [filters.search]);

  // Fetch data function
  const fetchData = useCallback(async (page?: number, newFilters?: Partial<PaginationFilters>) => {
    try {
      setLoading(true);
      setError(null);
      
      const targetPage = page ?? currentPage;
      const mergedFilters = { ...filters, ...newFilters };
      
      console.log('🔄 Fetching data for page:', targetPage, 'with filters:', mergedFilters);
      
      const response = await fetchFunction(targetPage, mergedFilters);
      
      console.log('📥 Response received:', response);
      
      if (response && (response.success !== false)) {
        // Handle different response structures
        const responseData = response.data || response;
        const responsePagination = response.pagination || null;
        const responseFilters = response.filters || mergedFilters;
        
        setData(Array.isArray(responseData) ? responseData : []);
        setPagination(responsePagination);
        setFilters(responseFilters);
        
        if (responsePagination) {
          setCurrentPage(responsePagination.current_page);
        }
        
        console.log('✅ Data loaded successfully');
      } else {
        const errorMessage = response?.message || 'Failed to fetch data';
        console.log('❌ API returned error:', errorMessage);
        setError(errorMessage);
        setData([]);
        setPagination(null);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      console.error('❌ Fetch error:', errorMessage);
      setError(errorMessage);
      setData([]);
      setPagination(null);
    } finally {
      setLoading(false);
    }
  }, [currentPage, filters, fetchFunction]);

  // Pagination controls
  const goToPage = useCallback((page: number) => {
    if (pagination && page >= 1 && page <= pagination.last_page) {
      setCurrentPage(page);
      fetchData(page);
    }
  }, [pagination, fetchData]);

  const nextPage = useCallback(() => {
    if (pagination && pagination.has_more_pages) {
      goToPage(pagination.current_page + 1);
    }
  }, [pagination, goToPage]);

  const prevPage = useCallback(() => {
    if (pagination && pagination.current_page > 1) {
      goToPage(pagination.current_page - 1);
    }
  }, [pagination, goToPage]);

  const setPerPage = useCallback((perPage: number) => {
    setFilters(prev => ({ ...prev, per_page: perPage }));
    setCurrentPage(1);
    fetchData(1, { per_page: perPage });
  }, [fetchData]);

  // Filter controls
  const setSearch = useCallback((search: string) => {
    setFilters(prev => ({ ...prev, search }));
  }, []);

  const setSort = useCallback((sortBy: string, sortOrder: 'asc' | 'desc' = 'desc') => {
    setFilters(prev => ({ ...prev, sort_by: sortBy, sort_order: sortOrder }));
    setCurrentPage(1);
    fetchData(1, { sort_by: sortBy, sort_order: sortOrder });
  }, [fetchData]);

  const setFilter = useCallback((key: string, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1);
    fetchData(1, { [key]: value });
  }, [fetchData]);

  const clearFilters = useCallback(() => {
    const clearedFilters = {
      search: '',
      per_page: initialPerPage,
      sort_by: undefined,
      sort_order: 'desc'
    };
    setFilters(clearedFilters);
    setCurrentPage(1);
    fetchData(1, clearedFilters);
  }, [initialPerPage, fetchData]);

  const refresh = useCallback(() => {
    fetchData(currentPage);
  }, [fetchData, currentPage]);

  // Initial data fetch
  useEffect(() => {
    fetchData(initialPage);
  }, []);

  return {
    data,
    pagination,
    filters,
    loading,
    error,
    goToPage,
    nextPage,
    prevPage,
    setPerPage,
    setSearch,
    setSort,
    setFilter,
    clearFilters,
    refresh,
    fetchData
  };
}


