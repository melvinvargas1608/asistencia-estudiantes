'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
    BookOpen, LayoutDashboard, Users, QrCode,
    FileText, LogOut, MenuIcon, X, GraduationCap
} from 'lucide-react'

const navItems = [
    { href: '/docente/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { href: '/docente/estudiantes', icon: Users, label: 'Estudiantes' },
    { href: '/docente/asistencia', icon: QrCode, label: 'Escanear QR' },
    { href: '/docente/reportes', icon: FileText, label: 'Reportes' },
]

export default function DocenteLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname()
    const router = useRouter()
    const [mobileOpen, setMobileOpen] = useState(false)
    const [docenteName, setDocenteName] = useState('')

    useEffect(() => {
        const supabase = createClient()
        supabase.auth.getUser().then(async ({ data: { user } }) => {
            if (!user) { router.push('/login'); return }
            const { data } = await supabase
                .from('docentes')
                .select('nombre, apellido')
                .eq('auth_user_id', user.id)
                .single()
            if (data) setDocenteName(`${data.nombre} ${data.apellido}`)
        })
    }, [router])

    async function handleLogout() {
        const supabase = createClient()
        await supabase.auth.signOut()
        router.push('/login')
    }

    const Sidebar = ({ mobile = false }: { mobile?: boolean }) => (
        <aside className={`${mobile ? 'flex' : 'hidden md:flex'} flex-col w-64 min-h-screen bg-indigo-950 text-white`}>
            {/* Logo */}
            <div className="flex items-center gap-3 px-6 py-5 border-b border-white/10">
                <div className="w-9 h-9 rounded-lg bg-indigo-500/30 flex items-center justify-center">
                    <BookOpen className="w-5 h-5 text-indigo-300" />
                </div>
                <span className="font-bold text-lg">AsistenciaEdu</span>
            </div>

            {/* User info */}
            <div className="px-6 py-4 border-b border-white/10">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-indigo-600 flex items-center justify-center text-sm font-bold">
                        {docenteName.charAt(0)}
                    </div>
                    <div>
                        <p className="text-xs text-indigo-300">Docente</p>
                        <p className="text-sm font-medium truncate max-w-[140px]">{docenteName || 'Cargando...'}</p>
                    </div>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-3 py-4 space-y-1">
                {navItems.map(item => {
                    const active = pathname === item.href
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => setMobileOpen(false)}
                            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${active
                                    ? 'bg-indigo-600 text-white'
                                    : 'text-indigo-300 hover:bg-white/5 hover:text-white'
                                }`}
                        >
                            <item.icon className="w-4 h-4 shrink-0" />
                            {item.label}
                        </Link>
                    )
                })}
            </nav>

            {/* Logout */}
            <div className="px-3 py-4 border-t border-white/10">
                <button
                    onClick={handleLogout}
                    className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-all"
                >
                    <LogOut className="w-4 h-4" />
                    Cerrar Sesión
                </button>
            </div>
        </aside>
    )

    return (
        <div className="flex min-h-screen bg-slate-50">
            {/* Desktop sidebar */}
            <Sidebar />

            {/* Mobile drawer */}
            {mobileOpen && (
                <div className="fixed inset-0 z-40 md:hidden">
                    <div className="absolute inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
                    <div className="absolute left-0 top-0 bottom-0 w-64 z-50">
                        <div className="relative h-full">
                            <Sidebar mobile />
                            <button
                                onClick={() => setMobileOpen(false)}
                                className="absolute top-4 right-4 text-white/60 hover:text-white"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Main content */}
            <div className="flex-1 flex flex-col">
                {/* Mobile header */}
                <header className="md:hidden flex items-center gap-3 px-4 py-3 bg-white border-b border-slate-200">
                    <button onClick={() => setMobileOpen(true)} className="text-slate-600">
                        <MenuIcon className="w-6 h-6" />
                    </button>
                    <div className="flex items-center gap-2">
                        <BookOpen className="w-5 h-5 text-indigo-600" />
                        <span className="font-bold text-slate-800">AsistenciaEdu</span>
                    </div>
                </header>

                <main className="flex-1 p-6">
                    {children}
                </main>
            </div>
        </div>
    )
}
