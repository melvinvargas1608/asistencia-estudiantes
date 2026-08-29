'use client'

interface WeekendBlockProps {
    today: string
}

export default function WeekendBlock({ today }: WeekendBlockProps) {
    return (
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
    )
}
