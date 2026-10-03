import { ThemeProvider, themeScript } from '@nexus/ui';
import type { Metadata, Viewport } from 'next';
import { Bricolage_Grotesque, Geist, Geist_Mono } from 'next/font/google';
import { ServiceWorker } from '@/components/app/service-worker';
import './globals.css';
import { I18nProvider } from '@/i18n/client';
import { getLocale } from '@/i18n/server';

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] });
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] });
const bricolage = Bricolage_Grotesque({
  variable: '--font-bricolage',
  subsets: ['latin'],
  weight: ['500', '600', '700', '800'],
});

export const metadata: Metadata = {
  title: {
    default: 'NEXUS — Your world. Your people. Your places. Your life.',
    template: '%s · NEXUS',
  },
  description:
    'Nexus is a personalized digital world connecting your people, places, communities, events, learning and goals in one interface.',
  applicationName: 'NEXUS',
  appleWebApp: { capable: true, title: 'NEXUS', statusBarStyle: 'black-translucent' },
  icons: {
    icon: [
      { url: '/icons/favicon-64.png', sizes: '64x64', type: 'image/png' },
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: '/icons/apple-touch-icon.png',
  },
};

export const viewport: Viewport = {
  themeColor: '#0b0d10',
};

export default async function RootLayout({ children }: LayoutProps<'/'>) {
  const locale = await getLocale();

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} ${bricolage.variable} font-sans antialiased`}>
        <ThemeProvider>
          <I18nProvider locale={locale}>{children}</I18nProvider>
        </ThemeProvider>
        <ServiceWorker />
      </body>
    </html>
  );
}
