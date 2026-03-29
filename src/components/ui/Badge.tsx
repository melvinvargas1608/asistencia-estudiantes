import { cn } from '@/lib/utils'

interface BadgeProps {
    children: React.ReactNode
    variant?: 'green' | 'red' | 'blue' | 'yellow' | 'gray' | 'indigo'
    className?: string
}

const variants = {
    green: 'bg-emerald-100 text-emerald-700',
    red: 'bg-red-100 text-red-700',
    blue: 'bg-blue-100 text-blue-700',
    yellow: 'bg-amber-100 text-amber-700',
    gray: 'bg-slate-100 text-slate-600',
    indigo: 'bg-indigo-100 text-indigo-700',
}

export default function Badge({ children, variant = 'gray', className }: BadgeProps) {
    return (
        <span className={cn(
            'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
            variants[variant],
            className
        )}>
            {children}
        </span>
    )
}
