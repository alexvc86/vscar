import { GeistMono } from 'geist/font/mono';
import { GeistSans } from 'geist/font/sans';
import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { LabProvider } from '@/lab/lab-context';
import './globals.css';

export const metadata: Metadata = {
  title: 'VScar Motion Lab',
  description: 'Step 6e — isolated motion / WebGL lab. Not indexed.',
  robots: { index: false, follow: false },
};
export const viewport: Viewport = { themeColor: '#0B0C0E', colorScheme: 'dark' };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body>
        <LabProvider>{children}</LabProvider>
      </body>
    </html>
  );
}
