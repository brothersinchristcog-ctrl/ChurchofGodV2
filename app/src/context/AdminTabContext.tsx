import React, { createContext } from 'react';

export interface AdminTabContextType {
  activeTab: number;
  setActiveTab: (index: number) => void;
  editingData: any;
  setEditingData: (data: any) => void;
  goBack: () => void;
}

export const AdminTabContext = createContext<AdminTabContextType>({
  activeTab: 0,
  setActiveTab: () => {},
  editingData: null,
  setEditingData: () => {},
  goBack: () => {},
});
