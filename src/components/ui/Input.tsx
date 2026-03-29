import { cn } from '@/lib/utils'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string
    error?: string
    icon?: React.ReactNode
}

export default function Input({ label, error, icon, className, id, ...props }: InputProps) {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-')
    return (
        <div className="flex flex-col gap-1.5">
            {label && (
                <label htmlFor={inputId} className="text-sm font-medium text-slate-700">
                    {label}
                </label>
            )}
            <div className="relative">
                {icon && (
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                        {icon}
                    </div>
                )}
                <input
                    id={inputId}
                    className={cn(
                        'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-400',
                        'focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all',
                        'disabled:bg-slate-50 disabled:cursor-not-allowed',
                        error && 'border-red-400 focus:ring-red-400',
                        icon && 'pl-10',
                        className
                    )}
                    {...props}
                />
            </div>
            {error && <p className="text-xs text-red-600">{error}</p>}
        </div>
    )
}
