'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { parseQRPayload } from '@/lib/qr'
import { QrCode, CheckCircle2, XCircle, RefreshCw, Camera, Image as ImageIcon } from 'lucide-react'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import type { Estudiante } from '@/lib/types'

type ScanResult = {
    student: Estudiante
    status: 'success' | 'already' | 'error'
    message: string
}

export default function AsistenciaPage() {
    const html5QrRef = useRef<any>(null)
    const [scanning, setScanning] = useState(false)
    const [docenteId, setDocenteId] = useState<string | null>(null)
    const [results, setResults] = useState<ScanResult[]>([])
    const [cameras, setCameras] = useState<any[]>([])
    const [selectedCamera, setSelectedCamera] = useState<string>('')
    const [lastScan, setLastScan] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)
    const fileRef = useRef<HTMLInputElement>(null)
    const today = format(new Date(), "EEEE, d 'de' MMMM yyyy", { locale: es })
    const todayStr = format(new Date(), 'yyyy-MM-dd')

    useEffect(() => {
        const supabase = createClient()
        supabase.auth.getUser().then(async ({ data: { user } }) => {
            if (!user) return
            const { data } = await supabase
                .from('docentes').select('id').eq('auth_user_id', user.id).single()
            if (data) setDocenteId(data.id)
        })

        return () => {
            if (html5QrRef.current) {
                html5QrRef.current.stop().catch(() => { })
            }
        }
    }, [])

    async function startScanner() {
        setError(null)
        setLastScan(null)
        if (typeof window === 'undefined') return

        try {
            const { Html5Qrcode } = await import('html5-qrcode')

            // Get cameras if needed
            if (cameras.length === 0) {
                const devices = await Html5Qrcode.getCameras()
                if (devices && devices.length > 0) {
                    setCameras(devices)
                    setSelectedCamera(devices[0].id)
                }
            }

            const scanner = new Html5Qrcode('qr-reader')
            html5QrRef.current = scanner

            const config = {
                fps: 20,
                qrbox: 350
            }

            // Start library scanner
            await scanner.start(
                selectedCamera || { facingMode: 'user' },
                config,
                async (decodedText) => {
                    if (decodedText === lastScan) return
                    setLastScan(decodedText)
                    setTimeout(() => setLastScan(null), 3000)
                    await processQR(decodedText)
                },
                undefined
            )
            setScanning(true)
        } catch (err: any) {
            console.error('Scanner Error:', err)
            setError(`No se pudo cargar la imagen: ${err.message || 'Error de hardware'}. Intenta con "Subir Imagen".`)
            setScanning(false)
        }
    }

    async function stopScanner() {
        if (html5QrRef.current) {
            try {
                await html5QrRef.current.stop()
            } catch (e) { }
            html5QrRef.current = null
        }
        setScanning(false)
    }

    async function switchCamera(deviceId: string) {
        setSelectedCamera(deviceId)
        if (scanning) {
            await stopScanner()
            setTimeout(() => startScanner(), 300)
        }
    }

    async function handleFileScan(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0]
        if (!file) return
        setError(null)

        try {
            const { Html5Qrcode } = await import('html5-qrcode')
            const tempReader = new Html5Qrcode('qr-reader-temp')
            const decodedText = await tempReader.scanFile(file, true)
            await processQR(decodedText)
            tempReader.clear()
        } catch (err: any) {
            setError('No se encontró un código QR en la imagen.')
        }
    }

    async function processQR(rawText: string) {
        const studentId = parseQRPayload(rawText)
        if (!studentId) {
            addResult({ student: {} as Estudiante, status: 'error', message: 'QR inválido: no corresponde a un estudiante.' })
            return
        }

        const supabase = createClient()
        const { data: student } = await supabase
            .from('estudiantes')
            .select('*')
            .eq('auth_user_id', studentId)
            .single()

        if (!student) {
            addResult({ student: {} as Estudiante, status: 'error', message: `No se encontró estudiante en la base de datos.` })
            return
        }

        const { data: existing } = await supabase
            .from('asistencia')
            .select('id')
            .eq('estudiante_id', student.id)
            .eq('fecha', todayStr)
            .single()

        if (existing) {
            addResult({ student, status: 'already', message: 'Asistencia ya registrada hoy.' })
            return
        }

        const { error: insertError } = await supabase
            .from('asistencia')
            .insert({ estudiante_id: student.id, fecha: todayStr, presente: true })

        if (insertError) {
            addResult({ student, status: 'error', message: insertError.message })
        } else {
            addResult({ student, status: 'success', message: '¡Asistencia registrada exitosamente!' })
        }
    }

    function addResult(r: ScanResult) {
        setResults(prev => [r, ...prev.slice(0, 9)])
    }

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Tomar Asistencia</h1>
                    <p className="text-slate-500 text-sm mt-0.5 capitalize">{today}</p>
                </div>
            </div>

            <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
                <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-indigo-600 rounded-lg">
                                <QrCode className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h2 className="font-bold text-slate-800">Escáner QR</h2>
                                <p className="text-[10px] text-slate-400">Escanea el código del estudiante</p>
                            </div>
                        </div>
                        <Badge variant={scanning ? 'green' : 'gray'}>
                            {scanning ? 'Escaneando...' : 'Inactivo'}
                        </Badge>
                    </div>
                </div>

                <div className="p-8">
                    {error && (
                        <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-600 text-sm animate-in fade-in slide-in-from-top-2">
                            <XCircle className="w-5 h-5 shrink-0" />
                            <p className="font-medium">{error}</p>
                        </div>
                    )}

                    {cameras.length > 1 && (
                        <div className="mb-6 flex items-center gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-100">
                            <Camera className="w-4 h-4 text-slate-400" />
                            <span className="text-xs font-semibold text-slate-500">Origen:</span>
                            <select
                                value={selectedCamera}
                                onChange={(e) => switchCamera(e.target.value)}
                                className="flex-1 text-xs bg-transparent border-none focus:ring-0 font-medium text-slate-700 cursor-pointer"
                            >
                                {cameras.map(c => (
                                    <option key={c.id} value={c.id}>{c.label || `Cámara ${c.id.slice(0, 8)}`}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div className={`relative w-full aspect-video rounded-3xl overflow-hidden bg-black shadow-2xl transition-all duration-500 ${scanning ? 'scale-100 opacity-100' : 'scale-95 opacity-50'}`}>
                        <div id="qr-reader" className="w-full h-full [&_video]:object-cover" />
                        <div id="qr-reader-temp" className="hidden" />

                        {scanning && (
                            <div className="absolute inset-0 z-10 pointer-events-none flex items-center justify-center">
                                <div className="absolute inset-0 bg-indigo-500/5" />
                                <div className="w-80 h-80 border-4 border-indigo-400/50 rounded-3xl opacity-60 shadow-[0_0_50px_rgba(79,70,229,0.3)] relative">
                                    <div className="absolute top-1/2 left-0 w-full h-1 bg-indigo-500 shadow-[0_0_20px_rgba(79,70,229,0.8)] animate-scan" />
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="mt-8 flex flex-col items-center gap-6">
                        {!scanning ? (
                            <div className="flex flex-col sm:flex-row gap-4 w-full max-w-sm">
                                <Button className="flex-1 h-12 !rounded-2xl shadow-lg shadow-indigo-200" icon={<QrCode className="w-5 h-5" />} onClick={startScanner}>
                                    Usar Cámara
                                </Button>
                                <Button variant="secondary" className="flex-1 h-12 !rounded-2xl" icon={<ImageIcon className="w-5 h-5" />} onClick={() => fileRef.current?.click()}>
                                    Subir Imagen
                                </Button>
                                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileScan} />
                            </div>
                        ) : (
                            <div className="flex flex-col items-center gap-3">
                                <Button variant="danger" className="h-12 px-10 !rounded-2xl shadow-lg shadow-red-200" icon={<XCircle className="w-5 h-5" />} onClick={stopScanner}>
                                    Detener Escáner
                                </Button>
                                <p className="text-xs text-slate-400 italic">Si ves la pantalla negra, intenta cambiar de cámara o usar "Subir Imagen"</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {results.length > 0 && (
                <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden animate-in slide-in-from-bottom-4 duration-500">
                    <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
                        <div className="flex items-center gap-2">
                            <h2 className="font-bold text-slate-800">Registros Recientes</h2>
                            <Badge variant="blue">{results.length}</Badge>
                        </div>
                        <button onClick={() => setResults([])} className="text-slate-400 hover:text-slate-600 text-xs font-semibold hover:underline transition-all">
                            Limpiar todo
                        </button>
                    </div>
                    <div className="divide-y divide-slate-50">
                        {results.map((r, i) => (
                            <div key={i} className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50/50 transition-colors">
                                <div className={`p-2 rounded-xl ${r.status === 'success' ? 'bg-emerald-100' : r.status === 'already' ? 'bg-amber-100' : 'bg-red-100'}`}>
                                    {r.status === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-600" />}
                                    {r.status === 'already' && <RefreshCw className="w-5 h-5 text-amber-600" />}
                                    {r.status === 'error' && <XCircle className="w-5 h-5 text-red-600" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                    {r.student?.nombre ? (
                                        <p className="font-bold text-slate-800 text-sm">
                                            {r.student.nombre} {r.student.apellido}
                                            <span className="text-slate-400 font-normal ml-2 text-xs">{r.student.grado} - {r.student.seccion}</span>
                                        </p>
                                    ) : null}
                                    <p className={`text-xs mt-0.5 font-medium ${r.status === 'success' ? 'text-emerald-600' : r.status === 'already' ? 'text-amber-600' : 'text-red-600'}`}>
                                        {r.message}
                                    </p>
                                </div>
                                <span className="text-[10px] font-bold text-slate-300 bg-slate-50 px-2 py-1 rounded-md">{format(new Date(), 'HH:mm')}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <style jsx global>{`
                @keyframes scan {
                    0% { top: 0%; opacity: 0; }
                    20% { opacity: 0.5; }
                    80% { opacity: 0.5; }
                    100% { top: 100%; opacity: 0; }
                }
                .animate-scan {
                    animation: scan 3s linear infinite;
                }
            `}</style>
        </div>
    )
}
