import React, { createContext, useContext, useState, ReactNode } from 'react';

interface NotificationContextType {
  selectedOrderForReview: { id: number; type: 'Purchase' | 'Rental' } | null;
  triggerOrderReview: (order: { id: number; type: 'Purchase' | 'Rental' }) => void;
  clearOrderReview: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotificationContext = () => {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotificationContext must be used within NotificationProvider');
  return ctx;
};

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [selectedOrderForReview, setSelectedOrderForReview] = useState<{ id: number; type: 'Purchase' | 'Rental' } | null>(null);

  const triggerOrderReview = (order: { id: number; type: 'Purchase' | 'Rental' }) => setSelectedOrderForReview(order);
  const clearOrderReview = () => setSelectedOrderForReview(null);

  return (
    <NotificationContext.Provider value={{ selectedOrderForReview, triggerOrderReview, clearOrderReview }}>
      {children}
    </NotificationContext.Provider>
  );
}; 