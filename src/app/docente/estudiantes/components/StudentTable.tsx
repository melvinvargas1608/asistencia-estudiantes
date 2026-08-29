'use client'

import Badge from '@/components/ui/Badge'
import { formatSexo } from '@/lib/utils'
import type { Estudiante } from '@/lib/types'
import { Search, X, QrCode, Pencil, Trash2, Lock } from 'lucide-react'

const gradoColor: Record<string, 'indigo' | 'blue' | 'green' | 'yellow' | 'red' | 'gray'> = {
    '1°': 'indigo', '2°': 'blue', '3°': 'green', '4°': 'yellow', '5°': 'red', '6°': 'gray',
}

interface StudentTableProps {
    students: Estudiante[]
    search: string
    onSearchChange: (v: string) => void
    loading: boolean
    onViewQR: (s: Estudiante) => void
    onEdit: (s: Estudiante) => void
    onResetPassword: (s: Estudiante) => void
    onDelete: (s: Estudiante) => void
}

export default function StudentTable({ students, search, onSearchChange, loading, onViewQR, onEdit, onResetPassword, onDelete }: StudentTableProps) {
    return (
        <>
            {/* Search */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                    type="text"
                    value={search}
                    onChange={e => onSearchChange(e.target.value)}
                    placeholder="Buscar por nombre, apellido o DNI..."
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
                {search && (
                    <button onClick={() => onSearchChange('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                        <X className="w-4 h-4" />
                    </button>
                )}
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-100">
                                {['#', 'Nombre', 'Apellido', 'DNI', 'Sexo', 'Grado', 'Sección', 'Jornada', 'Acciones'].map(h => (
                                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                        {h}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {loading ? (
                                <tr><td colSpan={8} className="text-center py-12 text-slate-400">Cargando...</td></tr>
                            ) : students.length === 0 ? (
                                <tr><td colSpan={8} className="text-center py-12 text-slate-400">
                                    {search ? 'No se encontraron resultados' : 'No hay estudiantes registrados'}
                                </td></tr>
                            ) : (
                                students.map((s, i) => (
                                    <tr key={s.id} className="hover:bg-slate-50/60 transition-colors">
                                        <td className="px-4 py-3 text-slate-400 font-mono text-xs">{i + 1}</td>
                                        <td className="px-4 py-3 font-medium text-slate-800">{s.nombre}</td>
                                        <td className="px-4 py-3 text-slate-600">{s.apellido}</td>
                                        <td className="px-4 py-3 font-mono text-slate-500 text-xs">{s.numero_identidad}</td>
                                        <td className="px-4 py-3 text-slate-600">
                                            {formatSexo(s.sexo)}
                                        </td>
                                        <td className="px-4 py-3">
                                            <Badge variant={gradoColor[s.grado] || 'gray'}>{s.grado}</Badge>
                                        </td>
                                        <td className="px-4 py-3 text-slate-600">{s.seccion}</td>
                                        <td className="px-4 py-3"><Badge variant="gray">{s.jornada}</Badge></td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-1">
                                                <button
                                                    onClick={() => onViewQR(s)}
                                                    title="Ver QR"
                                                    className="p-1.5 rounded-lg text-indigo-500 hover:bg-indigo-50 transition-colors"
                                                >
                                                    <QrCode className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => onEdit(s)}
                                                    title="Editar"
                                                    className="p-1.5 rounded-lg text-amber-500 hover:bg-amber-50 transition-colors"
                                                >
                                                    <Pencil className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => onResetPassword(s)}
                                                    title="Restablecer Contraseña"
                                                    disabled={!s.auth_user_id}
                                                    className={`p-1.5 rounded-lg transition-colors ${!s.auth_user_id ? 'text-slate-300 cursor-not-allowed' : 'text-slate-500 hover:bg-slate-100'}`}
                                                >
                                                    <Lock className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => onDelete(s)}
                                                    title="Eliminar"
                                                    className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </>
    )
}
