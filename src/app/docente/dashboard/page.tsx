'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Users, QrCode, FileText, CheckCircle, XCircle, TrendingUp } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import type { Docente } from '@/lib/types'

interface Stats {
    totalStudents: number
    presentToday: number
    absentToday: number
    attendanceRate: number
}

export default function DocenteDashboard() {
    const [docente, setDocente] = useState<Docente | null>(null)
    const [stats, setStats] = useState<Stats>({ totalStudents: 0, presentToday: 0, absentToday: 0, attendanceRate: 0 })
    const [loading, setLoading] = useState(true)
    const today = format(new Date(), "EEEE, d 'de' MMMM yyyy", { locale: es })

    useEffect(() => {
        const supabase = createClient()
        async function load() {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            const { data: doc } = await supabase
                .from('docentes')
                .select('*')
                .eq('auth_user_id', user.id)
                .single()

            if (!doc) return
            setDocente(doc)

            // Load statistics
            const { data: students } = await supabase
                .from('estudiantes')
                .select('id')
                .eq('docente_id', doc.id)

            const total = students?.length || 0

            const todayStr = format(new Date(), 'yyyy-MM-dd')
            const { data: attendance } = await supabase
                .from('asistencia')
                .select('presente')
                .in('estudiante_id', (students || []).map(s => s.id))
                .eq('fecha', todayStr)

            const present = (attendance || []).filter(a => a.presente).length
            const absent = total - present

            setStats({
                totalStudents: total,
                presentToday: present,
                absentToday: absent,
                attendanceRate: total > 0 ? Math.round((present / total) * 100) : 0,
            })
            setLoading(false)
        }
        load()
    }, [])

    const cards = [
        { label: 'Total Estudiantes', value: stats.totalStudents, icon: Users, color: 'indigo', bg: 'bg-indigo-50', iconColor: 'text-indigo-600', border: 'border-indigo-100' },
        { label: 'Presentes Hoy', value: stats.presentToday, icon: CheckCircle, color: 'emerald', bg: 'bg-emerald-50', iconColor: 'text-emerald-600', border: 'border-emerald-100' },
        { label: 'Ausentes Hoy', value: stats.absentToday, icon: XCircle, color: 'red', bg: 'bg-red-50', iconColor: 'text-red-600', border: 'border-red-100' },
        { label: 'Tasa de Asistencia', value: `${stats.attendanceRate}%`, icon: TrendingUp, color: 'amber', bg: 'bg-amber-50', iconColor: 'text-amber-600', border: 'border-amber-100' },
    ]

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-slate-800">
                    {loading ? 'Cargando...' : `¡Bienvenido(a), ${docente?.nombre} ${docente?.apellido}!`}
                </h1>
                <p className="text-slate-500 mt-0.5 capitalize">{today}</p>
                {docente && (
                    <p className="text-sm text-slate-400 mt-1">
                        {docente.grado} Grado • Sección {docente.seccion}
                    </p>
                )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {cards.map(card => (
                    <div key={card.label} className={`${card.bg} ${card.border} border rounded-2xl p-5 flex flex-col gap-3`}>
                        <div className={`w-10 h-10 rounded-xl bg-white flex items-center justify-center`}>
                            <card.icon className={`w-5 h-5 ${card.iconColor}`} />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-slate-800">{loading ? '—' : card.value}</p>
                            <p className="text-sm text-slate-500">{card.label}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Quick actions */}
            <div>
                <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">Acciones Rápidas</h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <a href="/docente/estudiantes" className="flex items-center gap-4 p-4 bg-white rounded-2xl border border-slate-200 hover:border-indigo-300 hover:shadow-sm transition-all group">
                        <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center">
                            <Users className="w-5 h-5 text-indigo-600" />
                        </div>
                        <div>
                            <p className="font-medium text-slate-700 group-hover:text-indigo-700 transition-colors">Gestionar Estudiantes</p>
                            <p className="text-xs text-slate-400">Ver, editar y agregar</p>
                        </div>
                    </a>
                    <a href="/docente/asistencia" className="flex items-center gap-4 p-4 bg-white rounded-2xl border border-slate-200 hover:border-emerald-300 hover:shadow-sm transition-all group">
                        <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                            <QrCode className="w-5 h-5 text-emerald-600" />
                        </div>
                        <div>
                            <p className="font-medium text-slate-700 group-hover:text-emerald-700 transition-colors">Tomar Asistencia</p>
                            <p className="text-xs text-slate-400">Escanear código QR</p>
                        </div>
                    </a>
                    <a href="/docente/reportes" className="flex items-center gap-4 p-4 bg-white rounded-2xl border border-slate-200 hover:border-amber-300 hover:shadow-sm transition-all group">
                        <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
                            <FileText className="w-5 h-5 text-amber-600" />
                        </div>
                        <div>
                            <p className="font-medium text-slate-700 group-hover:text-amber-700 transition-colors">Ver Reportes</p>
                            <p className="text-xs text-slate-400">Exportar PDF</p>
                        </div>
                    </a>
                </div>
            </div>
        </div>
    )
}
