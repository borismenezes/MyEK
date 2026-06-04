import React, { createContext, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import type { Theme } from '@/types';
import { darkTheme, lightTheme } from './tokens';
import { useThemeStore } from '@store/useThemeStore';

const ThemeContext = createContext<Theme>(lightTheme);

/**
 * Provides the active Theme based on the user's stored preference,
 * falling back to the OS color scheme when set to 'system'.
 */
export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const systemScheme = useColorScheme();
  const mode = useThemeStore(s => s.mode);

  const theme = useMemo<Theme>(() => {
    if (mode === 'dark') return darkTheme;
    if (mode === 'light') return lightTheme;
    return systemScheme === 'dark' ? darkTheme : lightTheme;
  }, [mode, systemScheme]);

  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
};

/** Hook for components to read the active theme. */
export const useTheme = () => useContext(ThemeContext);
