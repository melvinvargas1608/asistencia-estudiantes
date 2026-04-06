import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
    try {
        const { createClient } = await import('@supabase/supabase-js')
        const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
            { auth: { autoRefreshToken: false, persistSession: false } }
        )

        const body = await req.json()
        const { student_id, auth_user_id, numero_identidad } = body

        if (!auth_user_id || !numero_identidad) {
            return NextResponse.json({ error: 'Faltan datos requeridos (auth_id, DNI)' }, { status: 400 })
        }

        // Reset password to their DNI
        const { error: resetError } = await supabaseAdmin.auth.admin.updateUserById(
            auth_user_id,
            { password: numero_identidad }
        )

        if (resetError) {
            return NextResponse.json({ error: resetError.message }, { status: 400 })
        }

        return NextResponse.json({ success: true, message: 'Contraseña restablecida al DNI correctamente' })
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Error interno del servidor'
        return NextResponse.json({ error: message }, { status: 500 })
    }
}
