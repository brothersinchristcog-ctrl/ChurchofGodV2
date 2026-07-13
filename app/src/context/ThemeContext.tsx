import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

type ThemeMode = 'light' | 'dark';

interface ThemeContextType {
  mode: ThemeMode;
  isDark: boolean;
  toggleTheme: () => void;
  colors: any;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const systemScheme = useColorScheme();
  const [mode, setMode] = useState<ThemeMode>('dark'); // Default to dark for the premium look

  useEffect(() => {
    loadTheme();
  }, []);

  const loadTheme = async () => {
    const saved = await AsyncStorage.getItem('user_theme');
    if (saved) setMode(saved as ThemeMode);
  };

  const toggleTheme = async () => {
    const newMode = mode === 'light' ? 'dark' : 'light';
    setMode(newMode);
    await AsyncStorage.setItem('user_theme', newMode);
  };

  const isDark = mode === 'dark';

  const colors = {
    primary: '#1a2d5a',
    accent: '#c0392b',
    gold: '#fbbf24',
    
    // Dynamic Colors
    background: isDark ? '#0f172a' : '#f0f2f7',
    surface: isDark ? '#1e293b' : '#ffffff',
    text: isDark ? '#f8fafc' : '#111827',
    textSecondary: isDark ? '#94a3b8' : '#64748b',
    border: isDark ? '#334155' : '#e2e8f0',
    header: '#1a2d5a',
    card: isDark ? '#1e293b' : '#ffffff',
  };

  return (
    <ThemeContext.Provider value={{ mode, isDark, toggleTheme, colors }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
};
