'use client';

// import { useEffect, useState } from 'react';

// export type Theme = 'light' | 'dark';

// const THEME_KEY = 'theme';

export function useTheme() {
  // const [theme, setTheme] = useState<Theme | null>("light"); // Start as null to prevent mismatch

  // useEffect(() => {
  //   const stored = localStorage.getItem(THEME_KEY) as Theme | null;
  //   const resolved =
  //     stored ?? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');

  //   setTheme(resolved);
  // }, []);

  // useEffect(() => {
  //   if (!theme) return;

  //   const root = document.documentElement;
  //   root.classList.remove('app-container--light', 'app-container--dark');
  //   root.classList.add(`app-container--${theme}`);

  //   localStorage.setItem(THEME_KEY, theme);

  //   // Update Giscus iframe if present
  //   // Props update doesn't work on Giscus script
  //   const iframe = document.querySelector<HTMLIFrameElement>('iframe.giscus-frame');
  //   if (iframe) {
  //     iframe.contentWindow?.postMessage(
  //       {
  //         giscus: {
  //           setConfig: {
  //             theme,
  //           },
  //         },
  //       },
  //       'https://giscus.app'
  //     );
  //   }
  // }, [theme]);

  // const toggleTheme = () => {
  //   setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  // };

  // return { theme, toggleTheme, isResolved: !!theme };
  return { theme: "light" }
}