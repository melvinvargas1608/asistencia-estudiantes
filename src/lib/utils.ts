import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

export type Sexo = 'M' | 'F'

const MASCULINO = ['m', 'masculino', 'hombre', 'male', 'h']
const FEMENINO = ['f', 'femenino', 'mujer', 'female']

/**
 * Classify a raw sex value into the canonical code 'M' | 'F', or null if unknown.
 */
export function normalizeSexo(val: string | null | undefined): Sexo | null {
    const low = (val ?? '').toLowerCase().trim()
    if (MASCULINO.includes(low)) return 'M'
    if (FEMENINO.includes(low)) return 'F'
    return null
}

/**
 * Human-readable label: 'Masculino' | 'Femenino', or the raw value when unknown.
 */
export function formatSexo(val: string | null | undefined): string {
    const s = normalizeSexo(val)
    if (s === 'M') return 'Masculino'
    if (s === 'F') return 'Femenino'
    return val ?? ''
}

/**
 * Extract a safe message from an unknown thrown value.
 */
export function getErrorMessage(err: unknown, fallback = 'Error desconocido'): string {
    return err instanceof Error && err.message ? err.message : fallback
}
