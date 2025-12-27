import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options });
          response = NextResponse.next({
            request: { headers: request.headers },
          });
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: '', ...options });
          response = NextResponse.next({
            request: { headers: request.headers },
          });
          response.cookies.set({ name, value: '', ...options });
        },
      },
    }
  );

  // Session'ı yenile - bu önemli! Cookie'leri otomatik günceller
  // getUser() kullan, getSession() değil - daha güvenli
  try {
    const { data: { user }, error } = await supabase.auth.getUser();

    // Protected routes
    const protectedPaths = ['/dashboard', '/admin'];
    const isProtectedPath = protectedPaths.some(path => 
      request.nextUrl.pathname.startsWith(path)
    );

    // Eğer korumalı bir sayfa ve kullanıcı yoksa login'e yönlendir
    if (isProtectedPath && (!user || error)) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', request.nextUrl.pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Login sayfasındaysa ve zaten giriş yapmışsa dashboard'a yönlendir
    if (request.nextUrl.pathname === '/login' && user && !error) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  } catch (e) {
    // Auth hatası durumunda devam et, login'e yönlendirme yapma
    // Bu sonsuz loop'u önler
    console.error('[Middleware] Auth error:', e);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - images - .svg, .png, .jpg, .jpeg, .gif, .webp
     * - api routes (they handle their own auth)
     */
    '/((?!_next/static|_next/image|favicon.ico|api|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};

