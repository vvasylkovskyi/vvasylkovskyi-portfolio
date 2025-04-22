import type { Metadata } from 'next';
import './app.scss';
import './globals.css';
import LayoutInner from './layout-inner';
import StyledComponentsRegistry from './registry';

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
      </head>
      <body className='antialiased dark'>
        <StyledComponentsRegistry>
          <LayoutInner>{children}</LayoutInner>
        </StyledComponentsRegistry>
      </body>
    </html>
  );
}
