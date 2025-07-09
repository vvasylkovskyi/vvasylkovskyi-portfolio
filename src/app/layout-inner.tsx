'use client';

import { Footer } from '@/components/footer';
import { TopBar } from '@/components/top-bar';
import { useTheme } from '@/hooks/useTheme';
import { ClerkProvider } from '@clerk/nextjs';
import { usePathname } from 'next/navigation';
import { dark } from '@clerk/themes'

export default function LayoutInner({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const { theme } = useTheme();

  const content = (
    <ClerkProvider appearance={{ baseTheme: dark }}>

      <div
        className={`app-container app-container--${theme}} p${pathname === '/' ? 'app-container--home' : ''}`}
      >
        <TopBar />
        <div className={`main-content ${pathname === '/about' ? 'main-content--about' : ''}`}>
          {children}
        </div>
        <Footer />
      </div>
    </ClerkProvider>
  );

  return content;
}
