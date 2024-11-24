import { ClerkProvider } from '@clerk/nextjs';
import './globals.css';
import Navigation from '@/components/Navigation';
import { Montserrat } from 'next/font/google';
import { Toaster } from '@/components/ui/toaster';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Split',
  description: 'Split your expenses with your friends',
};

const montserrat = Montserrat({ subsets: ['latin'] });

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <html lang="en">
        <head>
          <link rel="manifest" href="/manifest.json" />
        </head>
        <body className={montserrat.className}>
          <Navigation />
          {children}
          <Toaster />
        </body>
      </html>
    </ClerkProvider>
  );
}
