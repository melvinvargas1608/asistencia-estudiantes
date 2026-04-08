'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { parseQRPayload } from '@/lib/qr'
import { QrCode, CheckCircle2, XCircle, RefreshCw, Camera, Users, ListFilter, UserCheck, UserMinus, FileText } from 'lucide-react'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import type { Estudiante, Justificacion } from '@/lib/types'

type ScanResult = {
    student: Estudiante
    status: 'success' | 'already' | 'error'
    message: string
}

export default function AsistenciaPage() {
    const html5QrRef = useRef<any>(null)
    const [scanning, setScanning] = useState(false)
    const [docenteId, setDocenteId] = useState<string | null>(null)
    const [activeTab, setActiveTab] = useState<'scanner' | 'summary'>('scanner')

    // States for Scanner
    const [results, setResults] = useState<ScanResult[]>([])
    const [cameras, setCameras] = useState<any[]>([])
    const [selectedCamera, setSelectedCamera] = useState<string>('')
    const [lastScan, setLastScan] = useState<string | null>(null)
    const [lastResult, setLastResult] = useState<ScanResult | null>(null)
    const [showResultOverlay, setShowResultOverlay] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // States for Summary
    const [allStudents, setAllStudents] = useState<Estudiante[]>([])
    const [todayAttendance, setTodayAttendance] = useState<Record<string, boolean>>({})
    const [todayJustifs, setTodayJustifs] = useState<Record<string, 'permiso' | 'excusa'>>({})
    const [loadingSummary, setLoadingSummary] = useState(false)

    const today = format(new Date(), "EEEE, d 'de' MMMM yyyy", { locale: es })
    const todayStr = format(new Date(), 'yyyy-MM-dd')

    // Weekend detection (0 = domingo, 6 = sábado)
    const dayOfWeek = new Date().getDay()
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6

    useEffect(() => {
        const supabase = createClient()
        supabase.auth.getUser().then(async ({ data: { user } }) => {
            if (!user) return
            const { data } = await supabase
                .from('docentes').select('id').eq('auth_user_id', user.id).single()
            if (data) {
                setDocenteId(data.id)
                if (!isWeekend) fetchDailyData(data.id)
            }
        })

        return () => {
            if (html5QrRef.current) {
                html5QrRef.current.stop().catch(() => { })
            }
        }
    }, [])

    async function fetchDailyData(dId: string) {
        setLoadingSummary(true)
        const supabase = createClient()

        const { data: students } = await supabase
            .from('estudiantes')
            .select('*')
            .eq('docente_id', dId)
            .order('apellido', { ascending: true })

        if (students) setAllStudents(students)

        const { data: records } = await supabase
            .from('asistencia')
            .select('estudiante_id, presente')
            .eq('fecha', todayStr)

        const attendanceMap: Record<string, boolean> = {}
        records?.forEach(r => {
            if (r.presente !== null) attendanceMap[r.estudiante_id] = r.presente
        })
        setTodayAttendance(attendanceMap)

        const { data: justifs } = await supabase
            .from('justificaciones')
            .select('estudiante_id, tipo')
            .eq('fecha', todayStr)

        const justifsMap: Record<string, 'permiso' | 'excusa'> = {}
        justifs?.forEach(j => { justifsMap[j.estudiante_id] = j.tipo as 'permiso' | 'excusa' })
        setTodayJustifs(justifsMap)

        setLoadingSummary(false)
    }

    async function setStudentStatus(student: Estudiante, status: 'presente' | 'ausente' | 'permiso' | 'excusa') {
        const supabase = createClient()

        await supabase.from('asistencia').delete().eq('estudiante_id', student.id).eq('fecha', todayStr)
        await supabase.from('justificaciones').delete().eq('estudiante_id', student.id).eq('fecha', todayStr)

        if (status === 'presente') {
            await supabase.from('asistencia').insert({ estudiante_id: student.id, fecha: todayStr, presente: true })
            setTodayAttendance(prev => ({ ...prev, [student.id]: true }))
            setTodayJustifs(prev => { const n = { ...prev }; delete n[student.id]; return n })
        } else if (status === 'permiso' || status === 'excusa') {
            await supabase.from('justificaciones').insert({
                estudiante_id: student.id,
                fecha: todayStr,
                tipo: status,
                estado: 'aprobada',
                motivo: 'Registrado directamente por el docente'
            })
            setTodayJustifs(prev => ({ ...prev, [student.id]: status }))
            setTodayAttendance(prev => { const n = { ...prev }; delete n[student.id]; return n })
        } else {
            await supabase.from('asistencia').insert({ estudiante_id: student.id, fecha: todayStr, presente: false })
            setTodayAttendance(prev => ({ ...prev, [student.id]: false }))
            setTodayJustifs(prev => { const n = { ...prev }; delete n[student.id]; return n })
        }

        if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(50)
    }

    async function startScanner() {
        setError(null)
        setLastScan(null)
        setShowResultOverlay(false)
        if (typeof window === 'undefined') return

        try {
            const { Html5Qrcode } = await import('html5-qrcode')

            if (html5QrRef.current) {
                try { await html5QrRef.current.stop() } catch (e) { }
                html5QrRef.current = null
            }

            if (cameras.length === 0) {
                const devices = await Html5Qrcode.getCameras()
                if (devices && devices.length > 0) {
                    setCameras(devices)
                    setSelectedCamera(devices[0].id)
                }
            }

            const scanner = new Html5Qrcode('qr-reader')
            html5QrRef.current = scanner

            const config = { fps: 15, qrbox: 260 }
            const deviceId = selectedCamera || { facingMode: { ideal: 'environment' } }

            await scanner.start(
                deviceId,
                config,
                async (decodedText: string) => {
                    if (decodedText === lastScan || showResultOverlay) return
                    setLastScan(decodedText)
                    await processQR(decodedText)
                },
                undefined
            )
            setScanning(true)
        } catch (err: any) {
            setError(`Error de hardware: ${err.message || 'No se pudo iniciar la cámara'}`)
            setScanning(false)
        }
    }

    async function stopScanner() {
        if (html5QrRef.current) {
            try { await html5QrRef.current.stop() } catch (e) { }
            html5QrRef.current = null
        }
        setScanning(false)
        setShowResultOverlay(false)
    }

    async function switchCamera(deviceId: string) {
        setSelectedCamera(deviceId)
        if (scanning) {
            await stopScanner()
            setTimeout(() => startScanner(), 500)
        }
    }

    async function processQR(rawText: string) {
        const studentId = parseQRPayload(rawText)
        if (!studentId) {
            updateResult({ student: {} as Estudiante, status: 'error', message: 'QR inválido.' })
            return
        }

        const supabase = createClient()
        const { data: student } = await supabase
            .from('estudiantes').select('*').eq('auth_user_id', studentId).single()

        if (!student) {
            updateResult({ student: {} as Estudiante, status: 'error', message: 'Estudiante no encontrado.' })
            return
        }

        const { data: existing } = await supabase
            .from('asistencia').select('id').eq('estudiante_id', student.id).eq('fecha', todayStr).single()

        if (existing) {
            updateResult({ student, status: 'already', message: 'Ya registrado hoy.' })
            return
        }

        const { error: insertError } = await supabase
            .from('asistencia').insert({ estudiante_id: student.id, fecha: todayStr, presente: true })

        if (insertError) {
            updateResult({ student, status: 'error', message: insertError.message })
        } else {
            updateResult({ student, status: 'success', message: '¡Asistencia registrada!' })
            setTodayAttendance(prev => ({ ...prev, [student.id]: true }))
        }
    }

    function updateResult(r: ScanResult) {
        setResults(prev => [r, ...prev.slice(0, 9)])
        setLastResult(r)
        setShowResultOverlay(true)
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
            navigator.vibrate(r.status === 'success' ? 200 : [100, 50, 100])
        }
        setTimeout(() => {
            setShowResultOverlay(false)
            setLastScan(null)
        }, 2200)
    }

    const presentCount = Object.values(todayAttendance).filter(v => v === true).length
    const justifiedCount = Object.keys(todayJustifs).length
    const totalCount = allStudents.length
    const absentCount = totalCount - presentCount - justifiedCount

    return (
        <div className="max-w-3xl mx-auto space-y-6 pb-20">
            {/* Header */}
            <div className="flex justify-between items-end px-4 sm:px-0">
                <div>
                    <h1 className="text-2xl font-black text-slate-800 tracking-tight">Registro de Asistencia</h1>
                    <p className="text-slate-500 text-sm mt-0.5 font-medium capitalize">{today}</p>
                </div>
            </div>

            {isWeekend ? (
                /* ── WEEKEND BLOCK ──────────────────────────────────────── */
                <div className="mx-4 sm:mx-0 bg-white sm:rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
                    <div className="flex flex-col items-center justify-center py-20 px-8 text-center gap-6">
                        <div className="w-20 h-20 rounded-3xl bg-amber-50 border-2 border-amber-100 flex items-center justify-center">
                            <span className="text-4xl">🏖️</span>
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-slate-800 mb-2">Día no lectivo</h2>
                            <p className="text-slate-500 font-medium max-w-xs">
                                El registro de asistencia solo está disponible de{' '}
                                <strong className="text-slate-700">lunes a viernes</strong>.
                            </p>
                            <p className="text-slate-400 text-sm mt-2 capitalize">{today}</p>
                        </div>
                        <div className="flex flex-wrap justify-center gap-2">
                            {['Lun', 'Mar', 'Mié', 'Jue', 'Vie'].map(d => (
                                <span key={d} className="px-3 py-1.5 bg-indigo-50 text-indigo-600 text-xs font-bold rounded-lg border border-indigo-100">{d}</span>
                            ))}
                            {['Sáb', 'Dom'].map(d => (
                                <span key={d} className="px-3 py-1.5 bg-red-50 text-red-400 text-xs font-bold rounded-lg border border-red-100 line-through">{d}</span>
                            ))}
                        </div>
                    </div>
                </div>
            ) : (
                /* ── WEEKDAY CONTENT ────────────────────────────────────── */
                <>
                    {/* Tab Navigation */}
                    <div className="flex bg-slate-100 p-1.5 rounded-2xl mx-4 sm:mx-0 shadow-inner">
                        <button
                            onClick={() => { setActiveTab('scanner'); stopScanner(); }}
                            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'scanner' ? 'bg-white text-indigo-600 shadow-md scale-[1.02]' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <QrCode className="w-4 h-4" />
                            Escáner QR
                        </button>
                        <button
                            onClick={() => { setActiveTab('summary'); stopScanner(); if (docenteId) fetchDailyData(docenteId); }}
                            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'summary' ? 'bg-white text-indigo-600 shadow-md scale-[1.02]' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <Users className="w-4 h-4" />
                            Resumen
                        </button>
                    </div>

                    {activeTab === 'scanner' ? (
                        /* SCANNER TAB */
                        <div className="bg-white sm:rounded-3xl border-y sm:border border-slate-200 shadow-xl overflow-hidden animate-in fade-in duration-300">
                            <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-indigo-600 rounded-lg shadow-lg shadow-indigo-200">
                                        <QrCode className="w-5 h-5 text-white" />
                                    </div>
                                    <h2 className="font-bold text-slate-800">Listo para escanear</h2>
                                </div>
                                <Badge variant={scanning ? 'green' : 'gray'}>
                                    {scanning ? 'ACTIVO' : 'INACTIVO'}
                                </Badge>
                            </div>

                            <div className="p-4 sm:p-8">
                                {error && !scanning && (
                                    <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-600 text-sm animate-in zoom-in-95">
                                        <XCircle className="w-5 h-5 shrink-0" />
                                        <p className="font-medium flex-1">{error}</p>
                                        <button onClick={() => setError(null)} className="p-1 hover:bg-red-100 rounded-full"><XCircle className="w-4 h-4" /></button>
                                    </div>
                                )}

                                {cameras.length > 0 && scanning && (
                                    <div className="mb-6 flex items-center gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-100">
                                        <Camera className="w-4 h-4 text-slate-400" />
                                        <select value={selectedCamera} onChange={e => switchCamera(e.target.value)} className="flex-1 text-xs bg-transparent border-none focus:ring-0 font-bold text-slate-700">
                                            {cameras.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                                        </select>
                                    </div>
                                )}

                                <div className={`relative w-full aspect-square sm:aspect-video rounded-3xl overflow-hidden bg-black shadow-2xl transition-all duration-500 ${scanning ? 'scale-100 opacity-100 ring-4 ring-indigo-50' : 'scale-95 opacity-50'}`}>
                                    <div id="qr-reader" className="w-full h-full [&_video]:object-cover" />

                                    {scanning && (
                                        <div className="absolute inset-0 z-10 pointer-events-none flex items-center justify-center">
                                            <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[1px] bg-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.8)] animate-scan" />
                                            <div className="w-64 h-64 border-2 border-dashed border-white/40 rounded-3xl relative">
                                                <div className="absolute top-1/2 left-0 w-full h-[2px] bg-indigo-500 shadow-[0_0_20px_rgba(79,70,229,1)] animate-scan" />
                                            </div>
                                        </div>
                                    )}

                                    {showResultOverlay && lastResult && (
                                        <div className={`absolute inset-0 z-50 flex flex-col items-center justify-center p-6 text-center backdrop-blur-lg animate-in fade-in zoom-in duration-300 ${lastResult.status === 'success' ? 'bg-emerald-600/90' : lastResult.status === 'already' ? 'bg-amber-500/90' : 'bg-red-600/90'}`}>
                                            <div className="bg-white rounded-full p-6 mb-4 shadow-2xl animate-bounce-short">
                                                {lastResult.status === 'success' && <CheckCircle2 className="w-16 h-16 text-emerald-600" />}
                                                {lastResult.status === 'already' && <RefreshCw className="w-16 h-16 text-amber-500" />}
                                                {lastResult.status === 'error' && <XCircle className="w-16 h-16 text-red-600" />}
                                            </div>
                                            <h3 className="text-3xl font-black text-white mb-2 tracking-tighter uppercase">
                                                {lastResult.status === 'success' ? '¡LISTO!' : lastResult.status === 'already' ? 'YA ESTÁ' : 'ERROR'}
                                            </h3>
                                            {lastResult.student?.nombre && (
                                                <p className="text-white font-bold text-xl mb-1">{lastResult.student.nombre} {lastResult.student.apellido}</p>
                                            )}
                                            <p className="text-white/90 font-medium italic">{lastResult.message}</p>
                                        </div>
                                    )}
                                </div>

                                <div className="mt-8 flex flex-col items-center gap-6">
                                    {!scanning ? (
                                        <Button className="h-14 px-12 !rounded-2xl shadow-xl shadow-indigo-100 text-base" onClick={startScanner} icon={<QrCode className="w-5 h-5" />}>
                                            Iniciar Escáner
                                        </Button>
                                    ) : (
                                        <Button variant="danger" className="h-14 px-12 !rounded-2xl shadow-xl shadow-red-100 text-base" onClick={stopScanner} icon={<XCircle className="w-5 h-5" />}>
                                            Detener Escáner
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ) : (
                        /* SUMMARY TAB */
                        <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300 mx-4 sm:mx-0">
                            <div className="grid grid-cols-3 gap-3">
                                <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-3xl flex items-center justify-between shadow-sm">
                                    <div>
                                        <p className="text-emerald-600 text-[10px] font-black uppercase tracking-widest mb-1">Presentes</p>
                                        <p className="text-2xl font-black text-emerald-800 leading-none">{presentCount}</p>
                                    </div>
                                    <div className="w-10 h-10 bg-emerald-100 rounded-2xl flex items-center justify-center">
                                        <UserCheck className="w-5 h-5 text-emerald-600" />
                                    </div>
                                </div>
                                <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-3xl flex items-center justify-between shadow-sm">
                                    <div>
                                        <p className="text-indigo-600 text-[10px] font-black uppercase tracking-widest mb-1">Justificados</p>
                                        <p className="text-2xl font-black text-indigo-800 leading-none">{loadingSummary ? '...' : justifiedCount}</p>
                                    </div>
                                    <div className="w-10 h-10 bg-indigo-100 rounded-2xl flex items-center justify-center">
                                        <FileText className="w-5 h-5 text-indigo-600" />
                                    </div>
                                </div>
                                <div className="bg-red-50 border border-red-100 p-4 rounded-3xl flex items-center justify-between shadow-sm">
                                    <div>
                                        <p className="text-red-600 text-[10px] font-black uppercase tracking-widest mb-1">Ausentes</p>
                                        <p className="text-2xl font-black text-red-800 leading-none">{loadingSummary ? '...' : absentCount}</p>
                                    </div>
                                    <div className="w-10 h-10 bg-red-100 rounded-2xl flex items-center justify-center">
                                        <UserMinus className="w-5 h-5 text-red-600" />
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
                                <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                                    <div className="flex items-center gap-2">
                                        <ListFilter className="w-4 h-4 text-slate-400" />
                                        <h2 className="font-bold text-slate-800">Lista de Estudiantes</h2>
                                    </div>
                                    <Badge variant="blue">{totalCount} Total</Badge>
                                </div>

                                <div className="divide-y divide-slate-50">
                                    {loadingSummary ? (
                                        <div className="p-20 text-center">
                                            <RefreshCw className="w-8 h-8 text-indigo-300 animate-spin mx-auto" />
                                            <p className="mt-4 text-slate-400 font-medium">Cargando lista...</p>
                                        </div>
                                    ) : allStudents.map(s => {
                                        const isPresent = todayAttendance[s.id]
                                        const justif = todayJustifs[s.id]
                                        const status = isPresent === true ? 'presente' : isPresent === false ? 'ausente' : justif ? justif : 'sin_registrar'

                                        return (
                                            <div key={s.id} className="flex flex-col sm:flex-row sm:items-center gap-4 px-5 py-4 hover:bg-slate-50/50 transition-colors">
                                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs shrink-0 ${status === 'presente' ? 'bg-emerald-100 text-emerald-600' : status === 'permiso' ? 'bg-indigo-100 text-indigo-600' : status === 'excusa' ? 'bg-orange-100 text-orange-600' : 'bg-slate-100 text-slate-400'}`}>
                                                        {s.nombre[0]}{s.apellido[0]}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-bold text-slate-800 text-sm truncate uppercase">{s.nombre} {s.apellido}</p>
                                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">ID: {s.numero_identidad}</p>
                                                    </div>
                                                </div>

                                                <div className="flex bg-slate-100/50 p-1.5 rounded-xl gap-1 shrink-0 self-start sm:self-auto overflow-x-auto w-full sm:w-auto">
                                                    <label className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-[10px] font-black cursor-pointer transition-all border-2 border-transparent ${status === 'presente' ? 'bg-emerald-500 text-white shadow-md border-emerald-500' : 'bg-white text-slate-400 hover:text-emerald-500 hover:border-emerald-100'}`}>
                                                        <input type="radio" className="hidden" checked={status === 'presente'} onChange={() => setStudentStatus(s, 'presente')} />
                                                        PRESENTE
                                                    </label>
                                                    <label className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-[10px] font-black cursor-pointer transition-all border-2 border-transparent ${status === 'ausente' ? 'bg-red-500 text-white shadow-md border-red-500' : 'bg-white text-slate-400 hover:text-red-500 hover:border-red-100'}`}>
                                                        <input type="radio" className="hidden" checked={status === 'ausente'} onChange={() => setStudentStatus(s, 'ausente')} />
                                                        AUSENTE
                                                    </label>
                                                    <label className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-[10px] font-black cursor-pointer transition-all border-2 border-transparent ${status === 'permiso' ? 'bg-indigo-500 text-white shadow-md border-indigo-500' : 'bg-white text-slate-400 hover:text-indigo-500 hover:border-indigo-100'}`}>
                                                        <input type="radio" className="hidden" checked={status === 'permiso'} onChange={() => setStudentStatus(s, 'permiso')} />
                                                        PERMISO
                                                    </label>
                                                    <label className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-[10px] font-black cursor-pointer transition-all border-2 border-transparent ${status === 'excusa' ? 'bg-orange-500 text-white shadow-md border-orange-500' : 'bg-white text-slate-400 hover:text-orange-500 hover:border-orange-100'}`}>
                                                        <input type="radio" className="hidden" checked={status === 'excusa'} onChange={() => setStudentStatus(s, 'excusa')} />
                                                        EXCUSA
                                                    </label>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'scanner' && results.length > 0 && (
                        <div className="bg-white sm:rounded-3xl border border-slate-200 shadow-xl overflow-hidden animate-in slide-in-from-bottom-4 mx-4 sm:mx-0">
                            <div className="p-5 border-b border-slate-100 flex items-center justify-between text-slate-800">
                                <h2 className="font-bold">Últimos Registros</h2>
                                <button onClick={() => setResults([])} className="text-[10px] font-black text-slate-400 uppercase hover:text-slate-600 transition-all">Limpiar</button>
                            </div>
                            <div className="divide-y divide-slate-50">
                                {results.map((r, i) => (
                                    <div key={i} className="flex items-center gap-4 px-6 py-3 hover:bg-slate-50/50">
                                        <div className={`p-1.5 rounded-lg ${r.status === 'success' ? 'bg-emerald-100' : 'bg-amber-100'}`}>
                                            {r.status === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <RefreshCw className="w-4 h-4 text-amber-600" />}
                                        </div>
                                        <div className="flex-1">
                                            <p className="font-bold text-slate-800 text-xs uppercase">{r.student.nombre} {r.student.apellido}</p>
                                            <p className="text-[10px] text-slate-400 font-medium italic">{r.message}</p>
                                        </div>
                                        <span className="text-[9px] font-bold text-slate-300 bg-slate-50 px-2 py-0.5 rounded-md">{format(new Date(), 'HH:mm')}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </>
            )}

            <style jsx global>{`
                @keyframes scan { 0% { top: 10%; } 100% { top: 90%; } }
                .animate-scan { animation: scan 2s linear infinite; }
                @keyframes bounce-short { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
                .animate-bounce-short { animation: bounce-short 1s ease-in-out infinite; }
            `}</style>
        </div>
    )
}
