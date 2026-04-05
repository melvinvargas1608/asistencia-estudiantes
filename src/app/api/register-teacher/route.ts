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
        const { nombre, apellido, numero_identidad, sexo, grados, seccion, password } = body

        if (!nombre || !apellido || !numero_identidad || !sexo || !grados || !seccion || !password) {
            return NextResponse.json({ error: 'Todos los campos son obligatorios' }, { status: 400 })
        }

        if (!Array.isArray(grados) || grados.length === 0) {
            return NextResponse.json({ error: 'Debes seleccionar al menos un grado' }, { status: 400 })
        }

        const sanitizedDni = numero_identidad.replace(/[-\s]/g, '').trim()
        if (sanitizedDni.length !== 13) {
            return NextResponse.json({ error: 'El DNI debe tener exactamente 13 dígitos' }, { status: 400 })
        }

        const email = `${sanitizedDni}@docente.edu`

        // 1. Create Auth User
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            user_metadata: { role: 'docente', numero_identidad: sanitizedDni },
            email_confirm: true,
        })

        if (authError) {
            if (authError.message.includes('already been registered')) {
                return NextResponse.json({ error: 'Ya existe un docente registrado con ese número de DNI.' }, { status: 400 })
            }
            return NextResponse.json({ error: authError.message }, { status: 400 })
        }

        const authUserId = authData.user.id

        // 2. Insert into docentes table
        const { error: dbError } = await supabaseAdmin
            .from('docentes')
            .insert({
                nombre,
                apellido,
                numero_identidad: sanitizedDni,
                sexo,
                grados,
                seccion,
                auth_user_id: authUserId
            })


        if (dbError) {
            // Rollback auth user if DB insert fails
            await supabaseAdmin.auth.admin.deleteUser(authUserId)
            return NextResponse.json({ error: dbError.message }, { status: 400 })
        }

        return NextResponse.json({ success: true })
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Error interno del servidor'
        return NextResponse.json({ error: message }, { status: 500 })
    }
}
