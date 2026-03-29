import { cn } from '@/lib/utils'

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
    label?: string
    error?: string
    options: { value: string; label: string }[]
    placeholder?: string
}

export default function Select({ label, error, options, placeholder, className, id, ...props }: SelectProps) {
    const selectId = id || label?.toLowerCase().replace(/\s+/g, '-')
    return (
        <div className="flex flex-col gap-1.5">
            {label && (
                <label htmlFor={selectId} className="text-sm font-medium text-slate-700">
                    {label}
                </label>
            )}
            <select
                id={selectId}
                className={cn(
                    'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800',
                    'focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all',
                    'disabled:bg-slate-50 disabled:cursor-not-allowed',
                    error && 'border-red-400 focus:ring-red-400',
                    className
                )}
                {...props}
            >
                {placeholder && <option value="">{placeholder}</option>}
                {options.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
            </select>
            {error && <p className="text-xs text-red-600">{error}</p>}
        </div>
    )
}
