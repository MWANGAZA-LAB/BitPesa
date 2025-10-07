import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { ThemeProvider } from '@/components/theme-provider';
import { QueryProvider } from '@/components/query-provider';
import { Toaster } from 'react-hot-toast';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'BitPesa Bridge - Lightning M-Pesa Payments',
  description: 'Seamlessly spend Bitcoin anywhere in Kenya with M-Pesa integration',
  keywords: ['Bitcoin', 'Lightning Network', 'M-Pesa', 'Kenya', 'Payments', 'Cryptocurrency'],
  authors: [{ name: 'BitPesa Bridge Team' }],
  creator: 'BitPesa Bridge',
  publisher: 'BitPesa Bridge',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL('https://bitpesa.com'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'en_KE',
    url: 'https://bitpesa.com',
    title: 'BitPesa Bridge - Lightning M-Pesa Payments',
    description: 'Seamlessly spend Bitcoin anywhere in Kenya with M-Pesa integration',
    siteName: 'BitPesa Bridge',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'BitPesa Bridge - Lightning M-Pesa Payments',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'BitPesa Bridge - Lightning M-Pesa Payments',
    description: 'Seamlessly spend Bitcoin anywhere in Kenya with M-Pesa integration',
    images: ['/og-image.png'],
    creator: '@bitpesa',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: 'your-google-verification-code',
  },
  category: 'technology',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        <link rel="manifest" href="/site.webmanifest" />
        <meta name="theme-color" content="#f7931a" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="BitPesa Bridge" />
        <meta name="application-name" content="BitPesa Bridge" />
        <meta name="msapplication-TileColor" content="#f7931a" />
        <meta name="msapplication-config" content="/browserconfig.xml" />
      </head>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <QueryProvider>
            {children}
            <Toaster
              position="top-right"
              toastOptions={{
                duration: 4000,
                style: {
                  background: 'hsl(var(--card))',
                  color: 'hsl(var(--card-foreground))',
                  border: '1px solid hsl(var(--border))',
                },
                success: {
                  iconTheme: {
                    primary: 'hsl(var(--primary))',
                    secondary: 'hsl(var(--primary-foreground))',
                  },
                },
                error: {
                  iconTheme: {
                    primary: 'hsl(var(--destructive))',
                    secondary: 'hsl(var(--destructive-foreground))',
                  },
                },
              }}
            />
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
