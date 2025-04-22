'use client';

import { useEffect, useState } from 'react';

export type Theme = 'light' | 'dark';

const THEME_KEY = 'theme';

export function useTheme() {
  const [theme, setTheme] = useState<Theme>('light'); // default to light

  useEffect(() => {
    const stored = localStorage.getItem(THEME_KEY) as Theme | null;
    const resolved =
      stored ?? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');

    setTheme(resolved);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('app-container--light', 'app-container--dark');
    root.classList.add(`app-container--${theme}`);

    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  return { theme, toggleTheme };
}
