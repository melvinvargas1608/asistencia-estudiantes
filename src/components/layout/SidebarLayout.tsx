'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { BookOpen, LayoutDashboard, Users, QrCode, FileText, LogOut, MenuIcon, X } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export type Role = 'docente' | 'estudiante'

interface NavItem {
    href: string
    icon: LucideIcon
    label: string
}

interface Theme {
    aside: string
    logoBox: string
    logoIcon: string
    avatar: string
    roleLabel: string
    roleText: string
    activeNav: string
    inactiveNav: string
    mobileLogo: string
}

const THEMES: Record<Role, Theme> = {
    docente: {
        aside: 'bg-indigo-950',
        logoBox: 'bg-indigo-500/30',
        logoIcon: 'text-indigo-300',
        avatar: 'bg-indigo-600',
        roleLabel: 'Docente',
        roleText: 'text-indigo-300',
        activeNav: 'bg-indigo-600 text-white',
        inactiveNav: 'text-indigo-300 hover:bg-white/5 hover:text-white',
        mobileLogo: 'text-indigo-600',
    },
    estudiante: {
        aside: 'bg-emerald-950',
        logoBox: 'bg-emerald-500/30',
        logoIcon: 'text-emerald-300',
        avatar: 'bg-emerald-600',
        roleLabel: 'Estudiante',
        roleText: 'text-emerald-300',
        activeNav: 'bg-emerald-600 text-white',
        inactiveNav: 'text-emerald-300 hover:bg-white/5 hover:text-white',
        mobileLogo: 'text-emerald-600',
    },
}

const TABLES: Record<Role, 'docentes' | 'estudiantes'> = {
    docente: 'docentes',
    estudiante: 'estudiantes',
}

const NAV_ITEMS: Record<Role, NavItem[]> = {
    docente: [
        { href: '/docente/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
        { href: '/docente/estudiantes', icon: Users, label: 'Estudiantes' },
        { href: '/docente/asistencia', icon: QrCode, label: 'Escanear QR' },
        { href: '/docente/reportes', icon: FileText, label: 'Reportes' },
    ],
    estudiante: [
        { href: '/estudiante/dashboard', icon: LayoutDashboard, label: 'Mi Asistencia' },
        { href: '/estudiante/mi-qr', icon: QrCode, label: 'Mi Código QR' },
    ],
}

interface SidebarProps {
    theme: Theme
    navItems: NavItem[]
    pathname: string
    userName: string
    mobile?: boolean
    onLogout: () => void
    onNavigate: () => void
}

function Sidebar({ theme, navItems, pathname, userName, mobile = false, onLogout, onNavigate }: SidebarProps) {
    return (
        <aside className={`${mobile ? 'flex' : 'hidden md:flex'} flex-col w-64 min-h-screen ${theme.aside} text-white`}>
            <div className="flex items-center gap-3 px-6 py-5 border-b border-white/10">
                <div className={`w-9 h-9 rounded-lg ${theme.logoBox} flex items-center justify-center`}>
                    <BookOpen className={`w-5 h-5 ${theme.logoIcon}`} />
                </div>
                <span className="font-bold text-lg">AsistenciaEdu</span>
            </div>

            <div className="px-6 py-4 border-b border-white/10">
                <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-full ${theme.avatar} flex items-center justify-center text-sm font-bold`}>
                        {userName.charAt(0)}
                    </div>
                    <div>
                        <p className={`text-xs ${theme.roleText}`}>{theme.roleLabel}</p>
                        <p className="text-sm font-medium truncate max-w-[140px]">{userName || 'Cargando...'}</p>
                    </div>
                </div>
            </div>

            <nav className="flex-1 px-3 py-4 space-y-1">
                {navItems.map(item => {
                    const active = pathname === item.href
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            onClick={onNavigate}
                            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${active ? theme.activeNav : theme.inactiveNav}`}
                        >
                            <item.icon className="w-4 h-4 shrink-0" />
                            {item.label}
                        </Link>
                    )
                })}
            </nav>

            <div className="px-3 py-4 border-t border-white/10">
                <button
                    onClick={onLogout}
                    className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-all"
                >
                    <LogOut className="w-4 h-4" />
                    Cerrar Sesión
                </button>
            </div>
        </aside>
    )
}

interface SidebarLayoutProps {
    role: Role
    children: React.ReactNode
}

export default function SidebarLayout({ role, children }: SidebarLayoutProps) {
    const theme = THEMES[role]
    const table = TABLES[role]
    const navItems = NAV_ITEMS[role]

    const pathname = usePathname()
    const router = useRouter()
    const [mobileOpen, setMobileOpen] = useState(false)
    const [userName, setUserName] = useState('')

    useEffect(() => {
        const supabase = createClient()
        supabase.auth.getUser().then(async ({ data: { user } }) => {
            if (!user) { router.push('/login'); return }
            const { data } = await supabase
                .from(table)
                .select('nombre, apellido')
                .eq('auth_user_id', user.id)
                .single()
            if (data) setUserName(`${data.nombre} ${data.apellido}`)
        })
    }, [router, table])

    async function handleLogout() {
        const supabase = createClient()
        await supabase.auth.signOut()
        router.push('/login')
    }

    return (
        <div className="flex min-h-screen bg-slate-50">
            <Sidebar theme={theme} navItems={navItems} pathname={pathname} userName={userName} onLogout={handleLogout} onNavigate={() => setMobileOpen(false)} />

            {mobileOpen && (
                <div className="fixed inset-0 z-40 md:hidden">
                    <div className="absolute inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
                    <div className="absolute left-0 top-0 bottom-0 w-64 z-50">
                        <div className="relative h-full">
                            <Sidebar mobile theme={theme} navItems={navItems} pathname={pathname} userName={userName} onLogout={handleLogout} onNavigate={() => setMobileOpen(false)} />
                            <button onClick={() => setMobileOpen(false)} className="absolute top-4 right-4 text-white/60 hover:text-white">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="flex-1 flex flex-col">
                <header className="md:hidden flex items-center gap-3 px-4 py-3 bg-white border-b border-slate-200">
                    <button onClick={() => setMobileOpen(true)} className="text-slate-600">
                        <MenuIcon className="w-6 h-6" />
                    </button>
                    <div className="flex items-center gap-2">
                        <BookOpen className={`w-5 h-5 ${theme.mobileLogo}`} />
                        <span className="font-bold text-slate-800">AsistenciaEdu</span>
                    </div>
                </header>
                <main className="flex-1 p-6">{children}</main>
            </div>
        </div>
    )
}
