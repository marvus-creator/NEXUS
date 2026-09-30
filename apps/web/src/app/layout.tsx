import { ThemeProvider, themeScript } from '@nexus/ui';
import type { Metadata, Viewport } from 'next';
import { Bricolage_Grotesque, Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

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
};

export const viewport: Viewport = {
  themeColor: '#0b0d10',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} ${bricolage.variable} font-sans antialiased`}>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
