'use client'

import { AlertTriangle } from 'lucide-react'
import Button from '@/components/ui/Button'
import type { Suspension } from '@/lib/types'

interface SuspensionBlockProps {
    todaySuspension: Suspension
    isSuspending: boolean
    onReactivate: () => void
}

export default function SuspensionBlock({ todaySuspension, isSuspending, onReactivate }: SuspensionBlockProps) {
    return (
        <div className="mx-4 sm:mx-0 bg-white sm:rounded-3xl border-2 border-amber-100 shadow-xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="flex flex-col items-center justify-center py-20 px-8 text-center gap-6">
                <div className="w-20 h-20 rounded-3xl bg-amber-50 border-2 border-amber-100 flex items-center justify-center text-amber-500">
                    <AlertTriangle className="w-10 h-10" />
                </div>
                <div>
                    <h2 className="text-xl font-black text-slate-800 mb-2 uppercase tracking-tight italic">Clases Suspendidas</h2>
                    <div className="px-6 py-4 bg-amber-50 rounded-2xl border border-amber-100 mb-4">
                        <p className="text-amber-800 font-bold text-sm">Motivo: {todaySuspension.motivo}</p>
                    </div>
                    <p className="text-slate-500 font-medium max-w-sm mx-auto text-sm">
                        Los registros de asistencia están deshabilitados. Este día no afectará el récord de los estudiantes.
                    </p>
                </div>
                <Button
                    variant="primary"
                    className="bg-slate-800 hover:bg-slate-900 !rounded-2xl px-8"
                    onClick={onReactivate}
                    disabled={isSuspending}
                >
                    Reactivar Clases para Hoy
                </Button>
            </div>
        </div>
    )
}
