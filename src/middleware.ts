import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
    let supabaseResponse = NextResponse.next({ request })

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value }) =>
                        request.cookies.set(name, value)
                    )
                    supabaseResponse = NextResponse.next({
                        request: { headers: request.headers },
                    })
                    cookiesToSet.forEach(({ name, value, options }) =>
                        supabaseResponse.cookies.set(name, value, {
                            ...options,
                            // Ensure secure is false if not using https (for mobile testing over local IP)
                            secure: request.url.startsWith('https://'),
                        })
                    )
                },
            },
        }
    )

    const { data: { user } } = await supabase.auth.getUser()
    const pathname = request.nextUrl.pathname

    // Redirect unauthenticated users to login
    if (!user && (pathname.startsWith('/docente') || pathname.startsWith('/estudiante'))) {
        return NextResponse.redirect(new URL('/login', request.url))
    }

    // Redirect authenticated users away from login
    if (user && pathname === '/login') {
        // Check role from metadata
        const role = user.user_metadata?.role
        if (role === 'docente') {
            return NextResponse.redirect(new URL('/docente/dashboard', request.url))
        }
        if (role === 'estudiante') {
            return NextResponse.redirect(new URL('/estudiante/dashboard', request.url))
        }
    }

    // Guard docente routes for non-docentes
    if (user && pathname.startsWith('/docente')) {
        const role = user.user_metadata?.role
        if (role !== 'docente') {
            return NextResponse.redirect(new URL('/login', request.url))
        }
    }

    // Guard estudiante routes for non-estudiantes
    if (user && pathname.startsWith('/estudiante')) {
        const role = user.user_metadata?.role
        if (role !== 'estudiante') {
            return NextResponse.redirect(new URL('/login', request.url))
        }
    }

    return supabaseResponse
}

export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}
