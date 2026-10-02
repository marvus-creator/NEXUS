import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'NEXUS',
    short_name: 'NEXUS',
    description: 'Your world. Your people. Your places. Your life.',
    start_url: '/home',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#0B0D10',
    theme_color: '#0B0D10',
    categories: ['social', 'education', 'productivity'],
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    shortcuts: [
      { name: 'Today', url: '/home', icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }] },
      { name: 'Messages', url: '/messages', icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }] },
      { name: 'Events', url: '/events', icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }] },
      { name: 'Map', url: '/nearby', icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }] },
    ],
  };
}
