'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { LogIn, UserCircle, ShieldCheck, AlertCircle, Eye, EyeOff, UserPlus, ArrowLeft, GraduationCap, School } from 'lucide-react'
import Button from '@/components/ui/Button'
import { GRADOS, SECCIONES } from '@/lib/types'

function LoginForm() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const [view, setView] = useState<'login' | 'register'>('login')

    // Login States
    const [role, setRole] = useState<'docente' | 'estudiante'>('docente')
    const [dni, setDni] = useState('')
    const [password, setPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Register States
    const [regNombre, setRegNombre] = useState('')
    const [regApellido, setRegApellido] = useState('')
    const [regDni, setRegDni] = useState('')
    const [regGrado, setRegGrado] = useState('')
    const [regSeccion, setRegSeccion] = useState('')
    const [regPassword, setRegPassword] = useState('')

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)
        setLoading(true)

        try {
            const sanitizedDni = dni.replace(/[-\s]/g, '').trim()
            if (sanitizedDni.length !== 13) {
                throw new Error('El DNI debe tener 13 dígitos exactos.')
            }

            const email = role === 'docente'
                ? `${sanitizedDni}@docente.edu`
                : `${sanitizedDni}@asistencia.edu`

            const supabase = createClient()
            const { error: signInError } = await supabase.auth.signInWithPassword({
                email,
                password,
            })

            if (signInError) {
                if (signInError.message.includes('Invalid login credentials')) {
                    throw new Error('DNI o contraseña incorrectos.')
                }
                throw signInError
            }

            const next = searchParams.get('next')
            window.location.href = next || (role === 'docente' ? '/docente/dashboard' : '/estudiante/dashboard')
        } catch (err: any) {
            setError(err.message || 'Error al iniciar sesión')
            setLoading(false)
        }
    }

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)

        const sanitizedDni = regDni.replace(/[-\s]/g, '').trim()
        if (sanitizedDni.length !== 13) {
            setError('El DNI debe tener 13 dígitos.')
            return
        }

        setLoading(true)
        try {
            const res = await fetch('/api/register-teacher', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    nombre: regNombre,
                    apellido: regApellido,
                    numero_identidad: sanitizedDni,
                    grado: regGrado,
                    seccion: regSeccion,
                    password: regPassword
                })
            })

            const data = await res.json()
            if (!res.ok) throw new Error(data.error)

            // Auto-login after register
            const supabase = createClient()
            await supabase.auth.signInWithPassword({
                email: `${sanitizedDni}@docente.edu`,
                password: regPassword
            })

            window.location.href = '/docente/dashboard'
        } catch (err: any) {
            setError(err.message)
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans">
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <div className="flex justify-center">
                    <div className="bg-indigo-600 p-3 rounded-2xl shadow-xl shadow-indigo-100">
                        <ShieldCheck className="w-10 h-10 text-white" />
                    </div>
                </div>
                <h2 className="mt-6 text-center text-3xl font-black text-slate-900 tracking-tight">
                    {view === 'login' ? 'Bienvenido de nuevo' : 'Registro de Docente'}
                </h2>
                <p className="mt-2 text-center text-sm text-slate-500 font-medium">
                    {view === 'login'
                        ? 'Sistema de Control de Asistencia Escolar'
                        : 'Crea tu perfil para empezar a gestionar la asistencia'}
                </p>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
                <div className="bg-white py-8 px-4 shadow-2xl shadow-slate-200 border border-slate-100 sm:rounded-3xl sm:px-10">

                    {view === 'login' ? (
                        /* LOGIN VIEW */
                        <form className="space-y-6" onSubmit={handleLogin}>
                            {/* Role Selector */}
                            <div className="flex bg-slate-100 p-1 rounded-2xl">
                                <button
                                    type="button"
                                    onClick={() => setRole('docente')}
                                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-bold transition-all ${role === 'docente' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                                        }`}
                                >
                                    <UserCircle className="w-4 h-4" />
                                    Docente
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setRole('estudiante')}
                                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-bold transition-all ${role === 'estudiante' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                                        }`}
                                >
                                    <GraduationCap className="w-4 h-4" />
                                    Estudiante
                                </button>
                            </div>

                            {error && (
                                <div className="bg-red-50 border border-red-100 p-4 rounded-2xl flex items-start gap-3 text-red-600 text-sm animate-in shake duration-300">
                                    <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                                    <p className="font-bold">{error}</p>
                                </div>
                            )}

                            <div>
                                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest ml-1 mb-2">
                                    Número de Identidad (DNI)
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={dni}
                                    maxLength={13}
                                    onChange={(e) => setDni(e.target.value)}
                                    className="block w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-indigo-50 focus:border-indigo-500 transition-all font-medium"
                                    placeholder="0801200000000"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest ml-1 mb-2">
                                    Contraseña
                                </label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        required
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="block w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-indigo-50 focus:border-indigo-500 transition-all font-medium"
                                        placeholder="••••••••"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                    >
                                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                    </button>
                                </div>
                            </div>

                            <Button type="submit" loading={loading} className="w-full h-14 !rounded-2xl text-base shadow-lg shadow-indigo-100" icon={<LogIn className="w-5 h-5" />}>
                                Ingresar al Portal
                            </Button>

                            <div className="pt-4 border-t border-slate-100 text-center">
                                <button
                                    type="button"
                                    onClick={() => { setView('register'); setError(null); }}
                                    className="text-sm font-bold text-indigo-600 hover:text-indigo-700 flex items-center justify-center gap-2 mx-auto"
                                >
                                    <UserPlus className="w-4 h-4" />
                                    ¿No tienes cuenta? Regístrate como Docente
                                </button>
                            </div>
                        </form>
                    ) : (
                        /* REGISTER VIEW */
                        <form className="space-y-5" onSubmit={handleRegister}>
                            <button
                                type="button"
                                onClick={() => setView('login')}
                                className="flex items-center gap-2 text-slate-400 hover:text-slate-600 text-xs font-bold uppercase mb-2"
                            >
                                <ArrowLeft className="w-4 h-4" /> Volver al login
                            </button>

                            {error && (
                                <div className="bg-red-50 border border-red-100 p-4 rounded-2xl flex items-start gap-3 text-red-600 text-sm">
                                    <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                                    <p className="font-bold">{error}</p>
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-black text-slate-500 uppercase tracking-widest ml-1 mb-1.5">Nombre</label>
                                    <input type="text" required value={regNombre} onChange={e => setRegNombre(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm" placeholder="Ej: Gabriel" />
                                </div>
                                <div>
                                    <label className="block text-xs font-black text-slate-500 uppercase tracking-widest ml-1 mb-1.5">Apellido</label>
                                    <input type="text" required value={regApellido} onChange={e => setRegApellido(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm" placeholder="Ej: Santos" />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest ml-1 mb-1.5">DNI (13 dígitos)</label>
                                <input type="text" required value={regDni} maxLength={13} onChange={e => setRegDni(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm" placeholder="0801200000000" />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-black text-slate-500 uppercase tracking-widest ml-1 mb-1.5">Grado</label>
                                    <select required value={regGrado} onChange={e => setRegGrado(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm">
                                        <option value="">Seleccionar</option>
                                        {GRADOS.map(g => <option key={g} value={g}>{g} Grado</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-black text-slate-500 uppercase tracking-widest ml-1 mb-1.5">Sección</label>
                                    <select required value={regSeccion} onChange={e => setRegSeccion(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm">
                                        <option value="">Seleccionar</option>
                                        {SECCIONES.map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest ml-1 mb-1.5">Crea tu contraseña</label>
                                <input type="password" required value={regPassword} onChange={e => setRegPassword(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm" placeholder="Mínimo 6 caracteres" />
                            </div>

                            <Button type="submit" loading={loading} className="w-full h-14 !rounded-2xl text-base shadow-lg shadow-indigo-100" icon={<UserPlus className="w-5 h-5" />}>
                                Crear Cuenta e Ingresar
                            </Button>
                        </form>
                    )}

                </div>
            </div>

            <div className="mt-8 text-center sm:mx-auto sm:w-full sm:max-w-md">
                <div className="flex items-center justify-center gap-4 text-slate-400">
                    <div className="p-2 bg-white rounded-lg border border-slate-100">
                        <School className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-bold uppercase tracking-widest">Portal Educativo Nacional</span>
                </div>
            </div>

            <style jsx global>{`
                @keyframes shake {
                    0%, 100% { transform: translateX(0); }
                    10%, 30%, 50%, 70%, 90% { transform: translateX(-4px); }
                    20%, 40%, 60%, 80% { transform: translateX(4px); }
                }
                .shake { animation: shake 0.6s cubic-bezier(.36,.07,.19,.97) both; }
            `}</style>
        </div>
    )
}

export default function LoginPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-slate-50"><RefreshCw className="w-8 h-8 text-indigo-600 animate-spin" /></div>}>
            <LoginForm />
        </Suspense>
    )
}

function RefreshCw(props: any) {
    return <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" ><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" /><path d="M21 3v5h-5" /><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" /><path d="M3 21v-5h5" /></svg>
}
