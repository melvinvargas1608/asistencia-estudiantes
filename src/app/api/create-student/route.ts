import { NextRequest, NextResponse } from 'next/server'
import { generateStudentQR } from '@/lib/qr'

export async function POST(req: NextRequest) {
    try {
        // Import Supabase admin client inside handler to avoid build-time instantiation
        const { createClient } = await import('@supabase/supabase-js')
        const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
            { auth: { autoRefreshToken: false, persistSession: false } }
        )

        const body = await req.json()
        const { nombre, apellido, numero_identidad, grado, seccion, jornada, docente_id, email, password } = body

        // Create auth user for student
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            user_metadata: { role: 'estudiante', numero_identidad },
            email_confirm: true,
        })

        if (authError && !authError.message.includes('already registered')) {
            return NextResponse.json({ error: authError.message }, { status: 400 })
        }

        const authUserId = authData?.user?.id

        // Generate QR code with the student auth id
        const finalId = authUserId || crypto.randomUUID()
        const qr_code = await generateStudentQR(finalId)

        // Insert into estudiantes table
        const { data, error } = await supabaseAdmin
            .from('estudiantes')
            .insert({
                nombre,
                apellido,
                numero_identidad,
                grado,
                seccion,
                jornada,
                docente_id,
                auth_user_id: authUserId || null,
                qr_code,
            })
            .select()
            .single()

        if (error) {
            if (authUserId) await supabaseAdmin.auth.admin.deleteUser(authUserId)
            return NextResponse.json({ error: error.message }, { status: 400 })
        }

        return NextResponse.json({ success: true, student: data })
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Error interno del servidor'
        return NextResponse.json({ error: message }, { status: 500 })
    }
}
