import { NextResponse, type NextRequest } from 'next/server';

const PROTECTED = [
  '/home',
  '/discover',
  '/feed',
  '/people',
  '/tasks',
  '/goals',
  '/calendar',
  '/notifications',
  '/circles',
  '/messages',
  '/events',
  '/nearby',
  '/learn',
  '/progress',
  '/ai',
  '/market',
  '/wallet',
  '/admin',
  '/settings',
  '/profile',
  '/onboarding',
];
const AUTH_ROUTES = ['/sign-in', '/create-account'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const signedIn = request.cookies.has('nexus_access');

  if (!signedIn && PROTECTED.some((route) => pathname.startsWith(route))) {
    const url = request.nextUrl.clone();
    url.pathname = '/sign-in';
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }

  if (signedIn && AUTH_ROUTES.some((route) => pathname.startsWith(route))) {
    const url = request.nextUrl.clone();
    url.pathname = '/home';
    url.search = '';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/home/:path*',
    '/discover/:path*',
    '/feed/:path*',
    '/people/:path*',
    '/tasks/:path*',
    '/goals/:path*',
    '/calendar/:path*',
    '/notifications/:path*',
    '/circles/:path*',
    '/messages/:path*',
    '/events/:path*',
    '/nearby/:path*',
    '/learn/:path*',
    '/progress/:path*',
    '/ai/:path*',
    '/market/:path*',
    '/wallet/:path*',
    '/admin/:path*',
    '/settings/:path*',
    '/profile/:path*',
    '/onboarding/:path*',
    '/sign-in',
    '/create-account',
  ],
};
