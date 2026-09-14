import { NextResponse, type NextRequest } from 'next/server';

const PROTECTED = ['/home', '/discover', '/people', '/circles', '/events', '/nearby', '/learn', '/settings', '/profile', '/onboarding'];
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
    '/people/:path*',
    '/circles/:path*',
    '/events/:path*',
    '/nearby/:path*',
    '/learn/:path*',
    '/settings/:path*',
    '/profile/:path*',
    '/onboarding/:path*',
    '/sign-in',
    '/create-account',
  ],
};
