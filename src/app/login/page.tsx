'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { BookOpen, Eye, EyeOff, GraduationCap, Users } from 'lucide-react'
import Button from '@/components/ui/Button'
import Link from 'next/link'

type Role = 'docente' | 'estudiante'

function LoginContent() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const roleParam = searchParams.get('role') as Role | null

    const [role, setRole] = useState<Role>(roleParam || 'docente')
    const [numeroIdentidad, setNumeroIdentidad] = useState('')
    const [password, setPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (roleParam === 'docente' || roleParam === 'estudiante') {
            setRole(roleParam)
        }
    }, [roleParam])

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setError(null)
        setLoading(true)

        const supabase = createClient()

        try {
            const sanitizedId = numeroIdentidad.replace(/[-\s]/g, '').trim()

            if (sanitizedId.length !== 13) {
                setError('El número de identidad debe tener exactamente 13 dígitos.')
                setLoading(false)
                return
            }

            const email = `${sanitizedId}@asistencia.edu`

            const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
                email,
                password,
            })

            if (signInError) {
                if (signInError.message.includes('Invalid login credentials')) {
                    setError('Número de identidad o contraseña incorrectos.')
                } else {
                    setError('Error al iniciar sesión: ' + signInError.message)
                }
                setLoading(false)
                return
            }

            const table = role === 'docente' ? 'docentes' : 'estudiantes'
            const { data: profile } = await supabase
                .from(table)
                .select('id')
                .eq('auth_user_id', authData.user?.id)
                .single()

            if (!profile) {
                await supabase.auth.signOut()
                setError(`Este número de identidad no está registrado como ${role === 'docente' ? 'Docente' : 'Estudiante'}.`)
                setLoading(false)
                return
            }

            if (role === 'docente') {
                router.push('/docente/dashboard')
            } else {
                router.push('/estudiante/dashboard')
            }
        } catch {
            setError('Error inesperado. Intente de nuevo.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <main className="min-h-screen bg-gradient-to-br from-indigo-950 via-indigo-900 to-slate-900 flex items-center justify-center p-6">
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-40 -right-40 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl" />
                <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
            </div>

            <div className="relative z-10 w-full max-w-md">
                <div className="text-center mb-8">
                    <Link href="/" className="inline-flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center">
                            <BookOpen className="w-6 h-6 text-indigo-400" />
                        </div>
                        <span className="text-2xl font-bold text-white">AsistenciaEdu</span>
                    </Link>
                    <h1 className="text-xl font-semibold text-white">Iniciar Sesión</h1>
                </div>

                <div className="flex gap-2 mb-6 p-1 bg-white/5 rounded-xl border border-white/10">
                    <button
                        type="button"
                        onClick={() => { setRole('docente'); setError(null) }}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${role === 'docente'
                            ? 'bg-indigo-600 text-white shadow-sm'
                            : 'text-slate-400 hover:text-white'
                            }`}
                    >
                        <Users className="w-4 h-4" /> Docente
                    </button>
                    <button
                        type="button"
                        onClick={() => { setRole('estudiante'); setError(null) }}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${role === 'estudiante'
                            ? 'bg-emerald-600 text-white shadow-sm'
                            : 'text-slate-400 hover:text-white'
                            }`}
                    >
                        <GraduationCap className="w-4 h-4" /> Estudiante
                    </button>
                </div>

                <form
                    onSubmit={handleSubmit}
                    className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 space-y-4"
                >
                    {error && (
                        <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-sm text-red-400">
                            {error}
                        </div>
                    )}

                    <div className="space-y-1.5">
                        <label className="text-sm font-medium text-slate-300">Número de Identidad</label>
                        <input
                            type="text"
                            value={numeroIdentidad}
                            onChange={e => setNumeroIdentidad(e.target.value)}
                            placeholder="Ej: 0801199012345"
                            maxLength={13}
                            required
                            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-sm font-medium text-slate-300">Contraseña</label>
                        <div className="relative">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                placeholder="Tu contraseña"
                                required
                                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 pr-12 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(v => !v)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                            >
                                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>

                    <Button
                        type="submit"
                        loading={loading}
                        className={`w-full mt-2 ${role === 'estudiante' ? '!bg-emerald-600 hover:!bg-emerald-700 !shadow-emerald-900/20' : ''}`}
                    >
                        Ingresar
                    </Button>
                </form>

                <div className="text-center mt-6">
                    <Link href="/" className="text-slate-500 text-sm hover:text-slate-300 transition-colors">
                        ← Volver al inicio
                    </Link>
                </div>
            </div>
        </main>
    )
}

export default function LoginPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-indigo-950 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
            </div>
        }>
            <LoginContent />
        </Suspense>
    )
}
