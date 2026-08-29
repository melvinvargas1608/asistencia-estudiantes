'use client'

import { Ban } from 'lucide-react'
import type { Suspension } from '@/lib/types'

interface AttendanceHeaderProps {
    today: string
    isWeekend: boolean
    todaySuspension: Suspension | null
    isSuspending: boolean
    onSuspend: () => void
}

export default function AttendanceHeader({ today, isWeekend, todaySuspension, isSuspending, onSuspend }: AttendanceHeaderProps) {
    return (
        <div className="flex justify-between items-end px-4 sm:px-0">
            <div>
                <h1 className="text-2xl font-black text-slate-800 tracking-tight">Registro de Asistencia</h1>
                <p className="text-slate-500 text-sm mt-0.5 font-medium capitalize">{today}</p>
            </div>
            {!isWeekend && !todaySuspension && (
                <button
                    onClick={onSuspend}
                    disabled={isSuspending}
                    className="flex items-center gap-2 px-3 py-1.5 text-[10px] font-black text-red-500 bg-red-50 border border-red-100 rounded-xl hover:bg-red-100 transition-all uppercase"
                >
                    <Ban className="w-3 h-3" />
                    Suspender Clases
                </button>
            )}
        </div>
    )
}
