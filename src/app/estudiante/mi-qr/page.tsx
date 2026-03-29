'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Download, QrCode } from 'lucide-react'
import Badge from '@/components/ui/Badge'
import type { Estudiante } from '@/lib/types'

export default function MiQRPage() {
    const [student, setStudent] = useState<Estudiante | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const supabase = createClient()
        supabase.auth.getUser().then(async ({ data: { user } }) => {
            if (!user) return
            const { data } = await supabase
                .from('estudiantes').select('*').eq('auth_user_id', user.id).single()
            if (data) setStudent(data)
            setLoading(false)
        })
    }, [])

    return (
        <div className="max-w-md mx-auto space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-slate-800">Mi Código QR</h1>
                <p className="text-slate-500 text-sm mt-0.5">Presenta este código al docente para registrar tu asistencia</p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-6 flex flex-col items-center gap-4">
                    {loading ? (
                        <div className="w-64 h-64 bg-slate-100 rounded-2xl animate-pulse" />
                    ) : student?.qr_code ? (
                        <>
                            <div className="border-4 border-slate-100 rounded-2xl overflow-hidden">
                                <img src={student.qr_code} alt="Mi Código QR" className="w-64 h-64" />
                            </div>

                            <div className="text-center">
                                <p className="font-bold text-slate-800 text-lg">{student.nombre} {student.apellido}</p>
                                <p className="text-slate-500 text-sm">DNI: {student.numero_identidad}</p>
                                <div className="flex items-center justify-center gap-2 mt-2 flex-wrap">
                                    <Badge variant="gray">{student.grado} Grado</Badge>
                                    <Badge variant="gray">Sección {student.seccion}</Badge>
                                    <Badge variant="indigo">{student.jornada}</Badge>
                                </div>
                            </div>

                            <a
                                href={student.qr_code}
                                download={`mi-qr-${student.numero_identidad}.png`}
                                className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-xl text-sm font-medium hover:bg-emerald-100 transition-colors"
                            >
                                <Download className="w-4 h-4" />
                                Descargar QR
                            </a>
                        </>
                    ) : (
                        <div className="flex flex-col items-center gap-3 py-8">
                            <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center">
                                <QrCode className="w-8 h-8 text-slate-300" />
                            </div>
                            <p className="text-slate-500 text-sm text-center">
                                Tu código QR aún no ha sido generado.<br />Contacta a tu docente.
                            </p>
                        </div>
                    )}
                </div>
            </div>

            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4">
                <p className="text-sm text-emerald-700 flex items-start gap-2">
                    <QrCode className="w-4 h-4 mt-0.5 shrink-0" />
                    <span>Muestra este código QR a tu docente al inicio de la clase para que registre tu asistencia. También puedes descargarlo e imprimirlo.</span>
                </p>
            </div>
        </div>
    )
}
