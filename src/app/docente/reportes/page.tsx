'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { exportAttendancePDF } from '@/lib/pdf'
import { FileText, Download, Filter } from 'lucide-react'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import { GRADOS, SECCIONES, type AttendanceReport, type Docente } from '@/lib/types'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

export default function ReportesPage() {
    const [docente, setDocente] = useState<Docente | null>(null)
    const [records, setRecords] = useState<AttendanceReport[]>([])
    const [loading, setLoading] = useState(false)
    const [fetched, setFetched] = useState(false)

    const [fechaInicio, setFechaInicio] = useState(format(new Date(), 'yyyy-MM-01'))
    const [fechaFin, setFechaFin] = useState(format(new Date(), 'yyyy-MM-dd'))
    const [grado, setGrado] = useState('')
    const [seccion, setSeccion] = useState('')

    useEffect(() => {
        const supabase = createClient()
        supabase.auth.getUser().then(async ({ data: { user } }) => {
            if (!user) return
            const { data } = await supabase
                .from('docentes').select('*').eq('auth_user_id', user.id).single()
            if (data) setDocente(data)
        })
    }, [])

    async function fetchReport() {
        if (!docente) return
        setLoading(true)
        const supabase = createClient()

        // Get all students of this teacher
        let studentQuery = supabase
            .from('estudiantes')
            .select('id, nombre, apellido, numero_identidad, grado, seccion, jornada')
            .eq('docente_id', docente.id)

        if (grado) studentQuery = studentQuery.eq('grado', grado)
        if (seccion) studentQuery = studentQuery.eq('seccion', seccion)

        const { data: students } = await studentQuery

        if (!students || students.length === 0) {
            setRecords([])
            setLoading(false)
            setFetched(true)
            return
        }

        // Get attendance in date range
        const { data: attendance } = await supabase
            .from('asistencia')
            .select('estudiante_id, fecha, presente')
            .in('estudiante_id', students.map(s => s.id))
            .gte('fecha', fechaInicio)
            .lte('fecha', fechaFin)
            .order('fecha', { ascending: false })

        const docenteName = `${docente.nombre} ${docente.apellido}`

        // Group by date to ensure we show all students for each date that has records
        // Or if start === end, show all students for that specific day
        const report: AttendanceReport[] = []
        const datesWithRecords = Array.from(new Set((attendance || []).map(a => a.fecha)))

        // If no records found in the whole range, at least show students for the last day
        // This ensures new students appear in the list as "Ausente" so they can be toggled.
        if (datesWithRecords.length === 0) {
            datesWithRecords.push(fechaFin)
        }

        datesWithRecords.forEach(date => {
            students.forEach(s => {
                const record = attendance?.find(a => a.estudiante_id === s.id && a.fecha === date)
                report.push({
                    fecha: date,
                    estudiante_id: s.id,
                    nombre: s.nombre,
                    apellido: s.apellido,
                    numero_identidad: s.numero_identidad,
                    grado: s.grado,
                    seccion: s.seccion,
                    jornada: s.jornada,
                    presente: record ? record.presente : false,
                    docente_nombre: docenteName,
                })
            })
        })

        // Sort by date desc then by name
        report.sort((a, b) => {
            if (a.fecha !== b.fecha) return b.fecha.localeCompare(a.fecha)
            return a.apellido.localeCompare(b.apellido)
        })

        setRecords(report)
        setLoading(false)
        setFetched(true)
    }

    async function toggleAttendance(record: AttendanceReport) {
        const supabase = createClient()
        const isPresent = record.presente

        if (isPresent) {
            // Remove
            const { error } = await supabase
                .from('asistencia')
                .delete()
                .eq('estudiante_id', record.estudiante_id)
                .eq('fecha', record.fecha)

            if (!error) {
                setRecords(prev => prev.map(r =>
                    (r.estudiante_id === record.estudiante_id && r.fecha === record.fecha)
                        ? { ...r, presente: false } : r
                ))
            }
        } else {
            // Add
            const { error } = await supabase
                .from('asistencia')
                .insert({ estudiante_id: record.estudiante_id, fecha: record.fecha, presente: true })

            if (!error) {
                setRecords(prev => prev.map(r =>
                    (r.estudiante_id === record.estudiante_id && r.fecha === record.fecha)
                        ? { ...r, presente: true } : r
                ))
                if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(100)
            }
        }
    }

    const presentCount = records.filter(r => r.presente).length
    const absentCount = records.filter(r => !r.presente).length

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-slate-800">Reportes de Asistencia</h1>
                <p className="text-slate-500 text-sm mt-0.5">Consulta y exporta el historial de asistencia</p>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                <div className="flex items-center gap-2 mb-4">
                    <Filter className="w-4 h-4 text-slate-500" />
                    <h2 className="font-semibold text-slate-700">Filtros</h2>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div>
                        <label className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1.5 block">Fecha Inicio</label>
                        <input
                            type="date"
                            value={fechaInicio}
                            onChange={e => setFechaInicio(e.target.value)}
                            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        />
                    </div>
                    <div>
                        <label className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1.5 block">Fecha Fin</label>
                        <input
                            type="date"
                            value={fechaFin}
                            onChange={e => setFechaFin(e.target.value)}
                            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        />
                    </div>
                    <div>
                        <label className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1.5 block">Grado</label>
                        <select
                            value={grado}
                            onChange={e => setGrado(e.target.value)}
                            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        >
                            <option value="">Todos</option>
                            {GRADOS.map(g => <option key={g} value={g}>{g} Grado</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1.5 block">Sección</label>
                        <select
                            value={seccion}
                            onChange={e => setSeccion(e.target.value)}
                            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        >
                            <option value="">Todas</option>
                            {SECCIONES.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                </div>
                <div className="flex items-center justify-between mt-4 flex-wrap gap-3">
                    <Button loading={loading} onClick={fetchReport} icon={<Filter className="w-4 h-4" />}>
                        Generar Reporte
                    </Button>
                    {fetched && records.length > 0 && (
                        <Button
                            variant="secondary"
                            icon={<Download className="w-4 h-4" />}
                            onClick={() => exportAttendancePDF(records, { fechaInicio, fechaFin, grado, seccion })}
                        >
                            Exportar PDF
                        </Button>
                    )}
                </div>
            </div>

            {/* Summary */}
            {fetched && (
                <div className="grid grid-cols-3 gap-4">
                    {[
                        { label: 'Total Registros', value: records.length, color: 'text-slate-800', bg: 'bg-slate-50', border: 'border-slate-200' },
                        { label: 'Presentes', value: presentCount, color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200' },
                        { label: 'Ausentes', value: absentCount, color: 'text-red-700', bg: 'bg-red-50', border: 'border-red-200' },
                    ].map(stat => (
                        <div key={stat.label} className={`${stat.bg} ${stat.border} border rounded-2xl p-4`}>
                            <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                            <p className="text-sm text-slate-500">{stat.label}</p>
                        </div>
                    ))}
                </div>
            )}

            {/* Table */}
            {fetched && (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-100">
                                    {['Fecha', 'Nombre', 'Apellido', 'DNI', 'Grado', 'Sección', 'Jornada', 'Asistencia', 'Docente'].map(h => (
                                        <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {records.length === 0 ? (
                                    <tr><td colSpan={9} className="text-center py-12 text-slate-400">No hay registros en el rango seleccionado</td></tr>
                                ) : (
                                    records.map((r, i) => (
                                        <tr key={i} className="hover:bg-slate-50/60 transition-colors">
                                            <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{r.fecha}</td>
                                            <td className="px-4 py-3 font-medium text-slate-800">{r.nombre}</td>
                                            <td className="px-4 py-3 text-slate-600">{r.apellido}</td>
                                            <td className="px-4 py-3 font-mono text-xs text-slate-500">{r.numero_identidad}</td>
                                            <td className="px-4 py-3"><Badge variant="gray">{r.grado}</Badge></td>
                                            <td className="px-4 py-3 text-slate-600">{r.seccion}</td>
                                            <td className="px-4 py-3 text-slate-600">{r.jornada}</td>
                                            <td className="px-4 py-3">
                                                <button
                                                    onClick={() => toggleAttendance(r)}
                                                    className={`px-3 py-1.5 rounded-xl text-[10px] font-black transition-all active:scale-95 border-2 ${r.presente
                                                        ? 'bg-emerald-500 border-emerald-500 text-white shadow-lg shadow-emerald-100'
                                                        : 'bg-white border-red-100 text-red-500 hover:border-red-500'
                                                        }`}
                                                >
                                                    {r.presente ? 'PRESENTE' : 'AUSENTE'}
                                                </button>
                                            </td>
                                            <td className="px-4 py-3 text-slate-500">{r.docente_nombre}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    )
}
