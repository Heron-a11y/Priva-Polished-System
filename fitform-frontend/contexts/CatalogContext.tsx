import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import apiService from '../services/api';

export interface CatalogItem {
  id: number;
  name: string;
  description: string;
  clothing_type: string;
  category: 'formal_attire' | 'ph_traditional' | 'evening_party_wear' | 'wedding_bridal' | 'special';
  image_path: string | null;
  measurements_required: string[];
  is_available: boolean;
  is_featured: boolean;
  sort_order: number;
  notes?: string;
  image_url?: string; // Accessor from backend
}

interface CatalogContextType {
  catalogItems: CatalogItem[];
  loading: boolean;
  error: string | null;
  refreshCatalog: () => Promise<void>;
  getItemById: (id: string) => CatalogItem | undefined;
  getItemByName: (name: string) => CatalogItem | undefined;
  getItemsByCategory: (category: string) => CatalogItem[];
  getFeaturedItems: () => CatalogItem[];
  lastUpdated: Date | null;
}

const CatalogContext = createContext<CatalogContextType | undefined>(undefined);

export const useCatalog = (): CatalogContextType => {
  const context = useContext(CatalogContext);
  if (!context) {
    throw new Error('useCatalog must be used within a CatalogProvider');
  }
  return context;
};

interface CatalogProviderProps {
  children: React.ReactNode;
}

export const CatalogProvider: React.FC<CatalogProviderProps> = ({ children }) => {
  const [catalogItems, setCatalogItems] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const loadCatalogItems = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiService.get('/catalog');
      
      if (response && response.success) {
        setCatalogItems(response.data || []);
        setLastUpdated(new Date());
      } else {
        setError(response?.message || 'Failed to load catalog items');
        setCatalogItems([]);
      }
    } catch (err: any) {
      console.error('Error loading catalog items:', err);
      setError(err.message || 'Network error');
      setCatalogItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshCatalog = useCallback(async () => {
    await loadCatalogItems();
  }, [loadCatalogItems]);

  const getItemById = useCallback((id: string): CatalogItem | undefined => {
    return catalogItems.find(item => item.id.toString() === id);
  }, [catalogItems]);

  const getItemByName = useCallback((name: string): CatalogItem | undefined => {
    return catalogItems.find(item => 
      item.name.toLowerCase().includes(name.toLowerCase()) ||
      item.clothing_type.toLowerCase().includes(name.toLowerCase())
    );
  }, [catalogItems]);

  const getItemsByCategory = useCallback((category: string): CatalogItem[] => {
    if (category === 'popular') {
      return catalogItems.filter(item => item.is_featured);
    }
    return catalogItems.filter(item => item.category === category);
  }, [catalogItems]);

  const getFeaturedItems = useCallback((): CatalogItem[] => {
    return catalogItems.filter(item => item.is_featured);
  }, [catalogItems]);

  // Auto-refresh catalog data every 30 seconds to catch admin changes
  useEffect(() => {
    loadCatalogItems();
    
    const interval = setInterval(() => {
      refreshCatalog();
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [loadCatalogItems, refreshCatalog]);

  const value: CatalogContextType = {
    catalogItems,
    loading,
    error,
    refreshCatalog,
    getItemById,
    getItemByName,
    getItemsByCategory,
    getFeaturedItems,
    lastUpdated
  };

  return (
    <CatalogContext.Provider value={value}>
      {children}
    </CatalogContext.Provider>
  );
};
