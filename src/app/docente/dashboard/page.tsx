'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Users, QrCode, FileText } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import Badge from '@/components/ui/Badge'
import type { Docente } from '@/lib/types'

interface GradeStats {
    grado: string
    totalM: number
    totalF: number
    presentM: number
    presentF: number
    justifiedM: number
    justifiedF: number
    pctM: number
    pctF: number
    total: number
    present: number
    justified: number
    pct: number
}

const GRADO_COLORS: Record<string, { bg: string; border: string; badge: string; bar: string }> = {
    '1°': { bg: 'bg-violet-50', border: 'border-violet-100', badge: 'bg-violet-100 text-violet-700', bar: 'bg-violet-500' },
    '2°': { bg: 'bg-blue-50', border: 'border-blue-100', badge: 'bg-blue-100 text-blue-700', bar: 'bg-blue-500' },
    '3°': { bg: 'bg-emerald-50', border: 'border-emerald-100', badge: 'bg-emerald-100 text-emerald-700', bar: 'bg-emerald-500' },
    '4°': { bg: 'bg-amber-50', border: 'border-amber-100', badge: 'bg-amber-100 text-amber-700', bar: 'bg-amber-500' },
    '5°': { bg: 'bg-rose-50', border: 'border-rose-100', badge: 'bg-rose-100 text-rose-700', bar: 'bg-rose-500' },
    '6°': { bg: 'bg-slate-50', border: 'border-slate-200', badge: 'bg-slate-100 text-slate-700', bar: 'bg-slate-500' },
}

export default function DocenteDashboard() {
    const [docente, setDocente] = useState<Docente | null>(null)
    const [gradeStats, setGradeStats] = useState<GradeStats[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const supabase = createClient()
        async function load() {
            const now = new Date()
            const todayStr = format(now, 'yyyy-MM-dd')
            const dayOfWeek = now.getDay()
            const isWeekEnd = dayOfWeek === 0 || dayOfWeek === 6

            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            const { data: doc } = await supabase
                .from('docentes')
                .select('*')
                .eq('auth_user_id', user.id)
                .single()

            if (!doc) return
            setDocente(doc)

            if (isWeekEnd) {
                setLoading(false)
                return
            }

            // Fetch all students for this teacher
            const { data: students } = await supabase
                .from('estudiantes')
                .select('id, sexo, grado')
                .eq('docente_id', doc.id)

            if (!students || students.length === 0) {
                setGradeStats([])
                setLoading(false)
                return
            }

            // Fetch today's attendance
            const studentIds = students.map(s => s.id)
            const { data: attendance } = await supabase
                .from('asistencia')
                .select('estudiante_id, presente')
                .in('estudiante_id', studentIds)
                .eq('fecha', todayStr)

            const { data: justifs } = await supabase
                .from('justificaciones')
                .select('estudiante_id')
                .in('estudiante_id', studentIds)
                .eq('fecha', todayStr)

            const presentSet = new Set(
                (attendance || []).filter(a => a.presente).map(a => a.estudiante_id)
            )

            const justifiedSet = new Set(
                (justifs || []).map(j => j.estudiante_id)
            )

            // Build stats per grade
            const statsMap: Record<string, GradeStats> = {}
            for (const g of grados) {
                statsMap[g] = { grado: g, totalM: 0, totalF: 0, presentM: 0, presentF: 0, justifiedM: 0, justifiedF: 0, pctM: 0, pctF: 0, total: 0, present: 0, justified: 0, pct: 0 }
            }

            for (const s of students) {
                if (!statsMap[s.grado]) continue
                const sexo = (s.sexo || '').toLowerCase().trim()
                const isM = ['m', 'masculino', 'hombre', 'male', 'h'].includes(sexo)
                const isF = ['f', 'femenino', 'mujer', 'female'].includes(sexo)
                const isPresent = presentSet.has(s.id)
                const isJustified = justifiedSet.has(s.id)

                statsMap[s.grado].total++
                if (isM) {
                    statsMap[s.grado].totalM++
                    if (isPresent) statsMap[s.grado].presentM++
                    if (isJustified) statsMap[s.grado].justifiedM++
                }
                else if (isF) {
                    statsMap[s.grado].totalF++
                    if (isPresent) statsMap[s.grado].presentF++
                    if (isJustified) statsMap[s.grado].justifiedF++
                }
                
                if (isPresent) statsMap[s.grado].present++
                if (isJustified) statsMap[s.grado].justified++
            }

            // Compute percentages
            const result = grados.map(g => {
                const st = statsMap[g]
                return {
                    ...st,
                    pctM: (st.totalM - st.justifiedM) > 0 ? Math.round((st.presentM / (st.totalM - st.justifiedM)) * 100) : 0,
                    pctF: (st.totalF - st.justifiedF) > 0 ? Math.round((st.presentF / (st.totalF - st.justifiedF)) * 100) : 0,
                    pct: (st.total - st.justified) > 0 ? Math.round((st.present / (st.total - st.justified)) * 100) : 0,
                }
            })

            setGradeStats(result)
            setLoading(false)
        }
        load()
    }, [])

    const saludo = () => {
        if (loading) return 'Cargando...'
        if (docente?.sexo === 'F') return `¡Bienvenida, Profesora ${docente?.nombre} ${docente?.apellido}!`
        return `¡Bienvenido, Profesor ${docente?.nombre} ${docente?.apellido}!`
    }

    const now = new Date()
    const today = format(now, "EEEE, d 'de' MMMM yyyy", { locale: es })
    const dayOfWeek = now.getDay()
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
    const grados = docente?.grados ?? []


    return (
        <div className="max-w-5xl mx-auto space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-slate-800">
                    {saludo()}
                </h1>
                <p className="text-slate-500 mt-0.5 capitalize">{today}</p>
                {docente && (
                    <div className="flex flex-wrap gap-2 mt-2">
                        {grados.map(g => (
                            <span key={g} className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${GRADO_COLORS[g]?.badge || 'bg-slate-100 text-slate-700'}`}>
                                {g} Grado
                            </span>
                        ))}
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-500">
                            Sección {docente.seccion}
                        </span>
                    </div>
                )}
            </div>

            {/* Stats per grade */}
            <div>
                <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">Asistencia por Grado — Hoy</h2>

                {loading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-52 bg-slate-100 rounded-3xl animate-pulse" />
                        ))}
                    </div>
                ) : isWeekend ? (
                    <div className="bg-white border border-slate-200 rounded-3xl p-10 text-center shadow-sm">
                        <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                            <span className="text-3xl">☕</span>
                        </div>
                        <h3 className="text-lg font-bold text-slate-800">Día de Descanso</h3>
                        <p className="text-slate-500 mt-1 max-w-sm mx-auto">
                            Hoy es fin de semana. No se registran asistencias ni inasistencias en días no lectivos.
                        </p>
                    </div>
                ) : gradeStats.length === 0 ? (
                    <div className="bg-slate-50 border border-slate-200 rounded-3xl p-10 text-center">
                        <Users className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                        <p className="text-slate-500 font-medium">No hay estudiantes registrados aún.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {gradeStats.map(gs => {
                            const colors = GRADO_COLORS[gs.grado] || GRADO_COLORS['6°']
                            return (
                                <div key={gs.grado} className={`${colors.bg} ${colors.border} border rounded-3xl p-5 flex flex-col gap-4 shadow-sm hover:shadow-md transition-shadow`}>
                                    {/* Grade header */}
                                    <div className="flex items-center justify-between">
                                        <span className={`text-xs font-black px-3 py-1 rounded-full ${colors.badge}`}>
                                            {gs.grado} GRADO
                                        </span>
                                        <span className="text-xs font-semibold text-slate-500">{gs.total} estudiantes</span>
                                    </div>

                                    {/* Overall attendance */}
                                    <div className="flex items-end justify-between">
                                        <div>
                                            <p className="text-4xl font-black text-slate-800 leading-none">{gs.pct}%</p>
                                            <p className="text-xs text-slate-500 font-medium mt-1">Asistencia general</p>
                                        </div>
                                        <div className="text-right flex flex-col items-end">
                                            <p className="text-lg font-black text-slate-700">{gs.present}/{gs.total - gs.justified}</p>
                                            <p className="text-[10px] text-slate-400 font-medium uppercase tracking-tighter">asistencia neta</p>
                                            {gs.justified > 0 && (
                                                <Badge variant="blue" className="mt-1 transition-all animate-in fade-in zoom-in">
                                                    {gs.justified} JUSTIFICADOS
                                                </Badge>
                                            )}
                                        </div>
                                    </div>

                                    {/* Overall bar */}
                                    <div className="w-full bg-white/60 rounded-full h-2 overflow-hidden">
                                        <div
                                            className={`h-full ${colors.bar} rounded-full transition-all duration-700`}
                                            style={{ width: `${gs.pct}%` }}
                                        />
                                    </div>

                                    {/* Sex breakdown */}
                                    <div className="grid grid-cols-2 gap-3 pt-1 border-t border-black/5">
                                        {/* Femenino */}
                                        <div className="space-y-1.5">
                                            <div className="flex items-center gap-1.5">
                                                <div className="w-5 h-5 rounded-md bg-rose-100 flex items-center justify-center">
                                                    <span className="text-[9px] font-black text-rose-600">F</span>
                                                </div>
                                                <span className="text-[10px] font-semibold text-slate-600">Femenino</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <div className="flex-1 bg-white/60 rounded-full h-1.5 overflow-hidden">
                                                    <div
                                                        className="h-full bg-rose-400 rounded-full transition-all duration-700"
                                                        style={{ width: `${gs.pctF}%` }}
                                                    />
                                                </div>
                                                <span className="text-xs font-black text-rose-600 w-8 text-right">{gs.pctF}%</span>
                                            </div>
                                            <p className="text-[9px] text-slate-400 font-medium">{gs.presentF}/{gs.totalF} presentes</p>
                                        </div>
                                        {/* Masculino */}
                                        <div className="space-y-1.5">
                                            <div className="flex items-center gap-1.5">
                                                <div className="w-5 h-5 rounded-md bg-sky-100 flex items-center justify-center">
                                                    <span className="text-[9px] font-black text-sky-600">M</span>
                                                </div>
                                                <span className="text-[10px] font-semibold text-slate-600">Masculino</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <div className="flex-1 bg-white/60 rounded-full h-1.5 overflow-hidden">
                                                    <div
                                                        className="h-full bg-sky-400 rounded-full transition-all duration-700"
                                                        style={{ width: `${gs.pctM}%` }}
                                                    />
                                                </div>
                                                <span className="text-xs font-black text-sky-600 w-8 text-right">{gs.pctM}%</span>
                                            </div>
                                            <p className="text-[9px] text-slate-400 font-medium">{gs.presentM}/{gs.totalM} presentes</p>
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
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
