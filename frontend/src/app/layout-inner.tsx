'use client';

import { Footer } from '@/components/footer';
import { TopBar } from '@/components/top-bar';
import { useTheme } from '@/hooks/useTheme';
import { usePathname } from 'next/navigation';

export default function LayoutInner({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();

  const content = (
    <div
      className={`app-container app-container--${theme}} p${pathname === '/' ? 'app-container--home' : ''}`}
    >
      <TopBar />
      <div className={`main-content ${pathname === '/about' ? 'main-content--about' : ''}`}>
        {children}
      </div>
      <Footer />
    </div>
  );

  // if (pathname === '/about') {
  //   return (
  //     <SpotlightCursor className='rounded-xl bg-neutral-900 text-white'>{content}</SpotlightCursor>
  //   );
  // }

  return content;
}
