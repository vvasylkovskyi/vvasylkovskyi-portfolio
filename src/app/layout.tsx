import type { Metadata } from 'next';
import { Analytics } from './analytics-client';
import 'plyr-react/plyr.css';
import './app.scss';
import './globals.css';
import LayoutInner from './layout-inner';
import StyledComponentsRegistry from './registry';
import { ThemeScript } from './theme-script';

export const metadata: Metadata = {
  title: 'Viktor Vasylkovskyi',
  description: 'Full stack',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang='en'>
      <head>
        <link rel='icon' href='/logo-simbol-moon.svg' type='image/svg+xml' />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  const theme = localStorage.getItem('theme') || 
                    (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
                  document.documentElement.classList.add('app-container--' + theme);
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className='antialiased'>
        <StyledComponentsRegistry>
          <ThemeScript />
          <Analytics />
          <LayoutInner>{children}</LayoutInner>
        </StyledComponentsRegistry>
      </body>
    </html>
  );
}
