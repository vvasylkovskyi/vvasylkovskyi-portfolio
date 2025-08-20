'use client';

import { useEffect } from 'react';

export function ThemeScript() {
  useEffect(() => {
    // Client hydration fallback
    // const theme =
    //   localStorage.getItem('theme') ||
    //   (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    // document.documentElement.classList.add(`app-container--${theme}`);
    document.documentElement.classList.add(`app-container--light`)
  }, []);

  return null;
}
