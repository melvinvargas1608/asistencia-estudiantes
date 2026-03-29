'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Calendar, CheckCircle2, XCircle, TrendingUp } from 'lucide-react'
import Badge from '@/components/ui/Badge'
import type { Estudiante, Asistencia } from '@/lib/types'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

export default function EstudianteDashboard() {
    const [student, setStudent] = useState<Estudiante | null>(null)
    const [attendance, setAttendance] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const supabase = createClient()
        async function load() {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            const { data: s } = await supabase
                .from('estudiantes').select('*').eq('auth_user_id', user.id).single()
            if (!s) return
            setStudent(s)

            const { data: att } = await supabase
                .from('asistencia')
                .select('*')
                .eq('estudiante_id', s.id)
                .order('fecha', { ascending: false })
                .limit(30)

            const { data: justs } = await supabase
                .from('justificaciones')
                .select('*')
                .eq('estudiante_id', s.id)
                .order('fecha', { ascending: false })
                .limit(30)

            const combined: any[] = []
            att?.forEach(a => combined.push({ id: `att-${a.id}`, fecha: a.fecha, estado: 'presente' }))
            justs?.forEach(j => combined.push({ id: `jus-${j.id}`, fecha: j.fecha, estado: j.tipo }))

            combined.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())

            setAttendance(combined.slice(0, 30))
            setLoading(false)
        }
        load()
    }, [])

    const total = attendance.length
    const present = attendance.filter(a => a.estado === 'presente').length
    const rate = total > 0 ? Math.round((present / total) * 100) : 0

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-slate-800">
                    {loading ? 'Cargando...' : `Hola, ${student?.nombre}!`}
                </h1>
                <p className="text-slate-500 text-sm mt-0.5 capitalize">
                    {format(new Date(), "EEEE, d 'de' MMMM yyyy", { locale: es })}
                </p>
                {student && (
                    <p className="text-sm text-slate-400 mt-1">
                        {student.grado} Grado • Sección {student.seccion} • {student.jornada}
                    </p>
                )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
                {[
                    { label: 'Días registrados', value: total, icon: Calendar, color: 'text-indigo-600', bg: 'bg-indigo-50' },
                    { label: 'Días presente', value: present, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                    { label: 'Tasa de asistencia', value: `${rate}%`, icon: TrendingUp, color: 'text-amber-600', bg: 'bg-amber-50' },
                ].map(stat => (
                    <div key={stat.label} className="bg-white rounded-2xl border border-slate-200 p-5">
                        <div className={`w-10 h-10 ${stat.bg} rounded-xl flex items-center justify-center mb-3`}>
                            <stat.icon className={`w-5 h-5 ${stat.color}`} />
                        </div>
                        <p className="text-2xl font-bold text-slate-800">{loading ? '—' : stat.value}</p>
                        <p className="text-sm text-slate-500">{stat.label}</p>
                    </div>
                ))}
            </div>

            {/* Attendance history */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100">
                    <h2 className="font-semibold text-slate-800">Historial de Asistencia</h2>
                    <p className="text-xs text-slate-400 mt-0.5">Últimos 30 registros</p>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-100">
                                {['Fecha', 'Día', 'Estado'].map(h => (
                                    <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {loading ? (
                                <tr><td colSpan={3} className="text-center py-8 text-slate-400">Cargando...</td></tr>
                            ) : attendance.length === 0 ? (
                                <tr><td colSpan={3} className="text-center py-8 text-slate-400">No hay registros de asistencia</td></tr>
                            ) : (
                                attendance.map(a => (
                                    <tr key={a.id} className="hover:bg-slate-50/60">
                                        <td className="px-5 py-3 font-mono text-slate-600 text-xs">{a.fecha}</td>
                                        <td className="px-5 py-3 text-slate-600 capitalize">
                                            {format(new Date(a.fecha + 'T12:00:00'), 'EEEE', { locale: es })}
                                        </td>
                                        <td className="px-5 py-3">
                                            <div className="flex items-center gap-2">
                                                {a.estado === 'presente' && <><CheckCircle2 className="w-4 h-4 text-emerald-500" /><Badge variant="green">Presente</Badge></>}
                                                {a.estado === 'permiso' && <><Calendar className="w-4 h-4 text-indigo-500" /><Badge variant="blue">Permiso</Badge></>}
                                                {a.estado === 'excusa' && <><XCircle className="w-4 h-4 text-orange-500" /><Badge variant="yellow" className="!bg-orange-100 !text-orange-700">Excusa</Badge></>}
                                                {a.estado === 'ausente' && <><XCircle className="w-4 h-4 text-red-500" /><Badge variant="red">Ausente</Badge></>}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}
