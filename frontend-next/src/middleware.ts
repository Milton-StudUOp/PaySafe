import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
    const token = request.cookies.get('token')?.value
    // Normalize user role to handle potential case inconsistencies
    const rawRole = request.cookies.get('user_role')?.value
    const userRole = rawRole ? rawRole.toUpperCase() : undefined

    const { pathname } = request.nextUrl

    console.log(`[Middleware] Processing ${pathname} | Token: ${!!token} | Role: ${userRole}`)

    // 1. Public Paths (Login, etc.)
    if (pathname.startsWith('/login') || pathname.startsWith('/merchant/login') || pathname.startsWith('/_next') || pathname.startsWith('/favicon.ico')) {
        // If user is already logged in, redirect to their dashboard
        if (token && userRole) {
            if (pathname === '/login' || pathname === '/merchant/login') {
                if (userRole === 'COMERCIANTE' || userRole === 'MERCHANT') {
                    return NextResponse.redirect(new URL('/merchant/dashboard', request.url))
                } else {
                    return NextResponse.redirect(new URL('/dashboard', request.url))
                }
            }
        }
        return NextResponse.next()
    }

    // 2. Protected Routes - Check Auth
    if (!token) {
        // Unified Login Redirect
        // Even if trying to access merchant area, go to main login
        return NextResponse.redirect(new URL('/login', request.url))
    }

    // 3. Role Based Access Control (RBAC)

    // A. MERCHANT / COMERCIANTE STRICT LOCKDOWN
    // Security by Design: Allowlist (Whitelist) strategy.
    // If you are a merchant, you can ONLY go to /merchant/* paths.
    // Everything else is forbidden.
    if (userRole === 'COMERCIANTE' || userRole === 'MERCHANT') {
        // STRICT CHECK: Must be /merchant/ (portal) or exactly /merchant
        // Previously (!startsWith('/merchant')) allowed '/merchants' (Management) -> VULNERABILITY FIXED
        if (!pathname.startsWith('/merchant/') && pathname !== '/merchant') {
            console.warn(`[Middleware] Blocking Merchant from accessing ${pathname}`)
            return NextResponse.redirect(new URL('/merchant/dashboard', request.url))
        }
    }

    // B. NON-MERCHANT (Admin, Staff, etc.) PROTECTION
    if (userRole !== 'COMERCIANTE' && userRole !== 'MERCHANT') {

        // 1. Merchant Portal is OFF LIMITS
        // Note: We use a regex or strict check to avoid blocking '/merchants' (Management)
        // Blocking '/merchant' AND '/merchant/*'
        if (pathname === '/merchant' || pathname.startsWith('/merchant/')) {
            return NextResponse.redirect(new URL('/dashboard', request.url))
        }

        // 2. SUPERVISOR & FUNCIONARIO
        // Allowed: /dashboard, /merchants, /agents, /markets, /pos, /transactions
        if (userRole === 'SUPERVISOR' || userRole === 'FUNCIONARIO') {
            const isAllowed =
                pathname.startsWith('/dashboard') ||
                pathname.startsWith('/merchants') ||
                pathname.startsWith('/agents') ||
                pathname.startsWith('/markets') ||
                pathname.startsWith('/pos') ||
                pathname.startsWith('/approvals') ||
                pathname.startsWith('/transactions');

            if (!isAllowed) {
                console.warn(`[Middleware] Blocking ${userRole} from ${pathname}`);
                return NextResponse.redirect(new URL('/dashboard', request.url));
            }
        }

        // 3. AUDITOR
        // Allowed: /dashboard, /transactions, /audit, /reports
        if (userRole === 'AUDITOR') {
            const isAllowed =
                pathname.startsWith('/dashboard') ||
                pathname.startsWith('/transactions') ||
                pathname.startsWith('/audit') ||
                pathname.startsWith('/reports');

            if (!isAllowed) {
                console.warn(`[Middleware] Blocking AUDITOR from ${pathname}`);
                return NextResponse.redirect(new URL('/dashboard', request.url));
            }
        }

        // ADMIN falls through (Allowed everything else)
    }

    // C. STATUS CHECK (Optional Improvement)
    // If we had user_status cookie, we could block SUSPENSO users here.

    return NextResponse.next()
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - api (API routes)
         * - _next (static files, image optimization, data fetches)
         * - favicon.ico (favicon file)
         */
        '/((?!api|_next|favicon.ico).*)',
    ],
}
