import React from 'react';
import { NotificationProvider } from '../../contexts/NotificationContext';

export default function AppTabs() {
  return (
    <NotificationProvider>
      {/* ...existing app structure... */}
    </NotificationProvider>
  );
}
