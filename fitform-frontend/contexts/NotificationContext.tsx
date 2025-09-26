import React, { createContext, useContext, useState, ReactNode } from 'react';
import { useRouter } from 'expo-router';

interface NotificationContextType {
  selectedOrderForReview: { id: number; type: 'Purchase' | 'Rental' } | null;
  triggerOrderReview: (order: { id: number; type: 'Purchase' | 'Rental' }) => void;
  clearOrderReview: () => void;
  handleNotificationPress: (notification: any, userRole?: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotificationContext = () => {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotificationContext must be used within NotificationProvider');
  return ctx;
};

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [selectedOrderForReview, setSelectedOrderForReview] = useState<{ id: number; type: 'Purchase' | 'Rental' } | null>(null);
  const router = useRouter();

  const triggerOrderReview = (order: { id: number; type: 'Purchase' | 'Rental' }) => setSelectedOrderForReview(order);
  const clearOrderReview = () => setSelectedOrderForReview(null);

  const handleNotificationPress = (notification: any, userRole?: string) => {
    // Extract order information from notification message
    const orderIdMatch = notification.message.match(/order #(\d+)/i);
    const orderId = orderIdMatch ? parseInt(orderIdMatch[1]) : null;

    if (orderId) {
      // Determine order type from message content
      let orderType: 'Purchase' | 'Rental' | null = null;
      
      if (notification.message.toLowerCase().includes('purchase')) {
        orderType = 'Purchase';
      } else if (notification.message.toLowerCase().includes('rental')) {
        orderType = 'Rental';
      }

      if (orderType) {
        // Trigger order review for the specific order
        triggerOrderReview({ id: orderId, type: orderType });
        
        // Navigate based on user role
        if (userRole === 'customer') {
          // Customer redirects to orders screen
          router.push('/customer/orders');
        } else if (userRole === 'admin') {
          // Admin redirects to manage orders
          router.push('/admin/orders');
        }
      } else {
        // If we can't determine the type, navigate based on role
        if (userRole === 'customer') {
          router.push('/customer/orders');
        } else if (userRole === 'admin') {
          router.push('/admin/orders');
        }
      }
    } else {
      // If no order ID found, navigate based on role
      if (userRole === 'customer') {
        router.push('/customer/orders');
      } else if (userRole === 'admin') {
        router.push('/admin/orders');
      }
    }
  };

  return (
    <NotificationContext.Provider value={{ 
      selectedOrderForReview, 
      triggerOrderReview, 
      clearOrderReview, 
      handleNotificationPress 
    }}>
      {children}
    </NotificationContext.Provider>
  );
}; 