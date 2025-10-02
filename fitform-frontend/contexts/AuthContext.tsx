import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import apiService from '../services/api';

interface User {
  id: number;
  name: string;
  email: string;
  role: 'customer' | 'admin';
  profile_image?: string | null;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; user?: User }>;
  register: (userData: any) => Promise<boolean>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const checkAuth = async () => {
    try {
      console.log('AuthContext - Checking authentication...');
      const isAuth = await apiService.isAuthenticated();
      console.log('AuthContext - isAuthenticated result:', isAuth);
      
      if (isAuth) {
        const response = await apiService.getCurrentUser();
        console.log('AuthContext - getCurrentUser response:', response);
        if (response.success) {
          setUser(response.data.user);
          console.log('AuthContext - User set:', response.data.user);
        }
      } else {
        console.log('AuthContext - User not authenticated');
      }
    } catch (error) {
      console.error('AuthContext - Auth check error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string): Promise<{ success: boolean; user?: User }> => {
    try {
      const response = await apiService.login({ email, password });
      if (response.success) {
        setUser(response.data.user);
        return { success: true, user: response.data.user };
      }
      return { success: false };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false };
    }
  };

  const register = async (userData: any): Promise<boolean> => {
    try {
      const response = await apiService.register(userData);
      console.log('Register response:', response); // Debug log
      return response.success === true;
    } catch (error) {
      console.error('Register error:', error);
      return false;
    }
  };

  const logout = async () => {
    try {
      await apiService.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
    }
  };

  const refreshUser = async () => {
    try {
      console.log('🔄 Refreshing user data...');
      const response = await apiService.getCurrentUser();
      console.log('📥 User refresh response:', response);
      if (response.success) {
        console.log('✅ User data updated:', response.data.user);
        setUser(response.data.user);
        
        // Cache profile image URL for persistence
        if (response.data.user.profile_image) {
          console.log('💾 Caching profile image URL:', response.data.user.profile_image);
        }
      }
    } catch (error) {
      console.error('❌ Error refreshing user:', error);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    register,
    logout,
    checkAuth,
    refreshUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 