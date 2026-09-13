import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Nexus — Your world. Your people. Your places. Your life.',
  description:
    'Nexus is a personalized digital world connecting your people, places, communities, learning and goals in one interface.',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
