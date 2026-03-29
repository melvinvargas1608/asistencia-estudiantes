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
        const { numero_identidad, password } = body

        if (!numero_identidad || !password) {
            return NextResponse.json({ error: 'DNI y contraseña son requeridos' }, { status: 400 })
        }

        const sanitizedDni = numero_identidad.replace(/[-\s]/g, '').trim()
        if (sanitizedDni.length !== 13) {
            return NextResponse.json({ error: 'El DNI debe tener 13 dígitos' }, { status: 400 })
        }

        // 1. Check if student exists in DB
        const { data: student, error: studentError } = await supabaseAdmin
            .from('estudiantes')
            .select('id, auth_user_id, nombre, apellido')
            .eq('numero_identidad', sanitizedDni)
            .single()

        if (studentError || !student) {
            return NextResponse.json({
                error: 'No estás registrado en el sistema. Por favor, solicita a tu docente que te ingrese primero.'
            }, { status: 404 })
        }

        const email = `${sanitizedDni}@asistencia.edu`

        // 2. Handle Auth Account
        if (student.auth_user_id) {
            // Already has an account (likely created by teacher with default pass)
            // We just update the password and set email_confirm to true just in case
            const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
                student.auth_user_id,
                { password, email_confirm: true }
            )
            if (updateError) return NextResponse.json({ error: updateError.message }, { status: 400 })
        } else {
            // No account linked (maybe imported/created without Auth)
            // We create one and link it
            const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
                email,
                password,
                user_metadata: { role: 'estudiante', numero_identidad: sanitizedDni },
                email_confirm: true,
            })

            if (authError) {
                if (authError.message.includes('already been registered')) {
                    // User exists in Auth but not linked to this student record?
                    // This shouldn't happen with our DNI logic, but let's handle it
                    return NextResponse.json({ error: 'Ya existe una cuenta asociada a este DNI. Intenta iniciar sesión normalmente.' }, { status: 400 })
                }
                return NextResponse.json({ error: authError.message }, { status: 400 })
            }

            const { error: linkError } = await supabaseAdmin
                .from('estudiantes')
                .update({ auth_user_id: authData.user.id })
                .eq('id', student.id)

            if (linkError) {
                // Cleanup
                await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
                return NextResponse.json({ error: linkError.message }, { status: 400 })
            }
        }

        return NextResponse.json({ success: true })
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Error interno del servidor'
        return NextResponse.json({ error: message }, { status: 500 })
    }
}
