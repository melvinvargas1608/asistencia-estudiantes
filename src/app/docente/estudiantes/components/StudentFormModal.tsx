'use client'

import { z } from 'zod'
import type { UseFormReturn } from 'react-hook-form'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import { GRADOS, SECCIONES, JORNADAS } from '@/lib/types'

export const studentSchema = z.object({
    nombre: z.string().min(2, 'Mínimo 2 caracteres'),
    apellido: z.string().min(2, 'Mínimo 2 caracteres'),
    numero_identidad: z.string()
        .regex(/^\d{13}$/, 'Debe ser exactamente 13 dígitos numéricos')
        .transform(val => val.trim()),
    sexo: z.string().min(1, 'Selecciona el sexo'),
    grado: z.string().min(1, 'Selecciona un grado'),
    seccion: z.string().min(1, 'Selecciona una sección'),
    jornada: z.string().min(1, 'Selecciona una jornada'),
})

export type StudentForm = z.infer<typeof studentSchema>

interface StudentFormModalProps {
    mode: 'add' | 'edit'
    isOpen: boolean
    onClose: () => void
    form: UseFormReturn<StudentForm>
    gradosPermitidos: string[]
    onSubmit: (data: StudentForm) => void
}

const inputCls = 'w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all'
const selectCls = 'w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all'

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
    return (
        <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-700">{label}</label>
            {children}
            {error && <p className="text-xs text-red-600">{error}</p>}
        </div>
    )
}

export default function StudentFormModal({ mode, isOpen, onClose, form, gradosPermitidos, onSubmit }: StudentFormModalProps) {
    const isAdd = mode === 'add'

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={isAdd ? 'Nuevo Estudiante' : 'Editar Estudiante'} size="lg">
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                {form.formState.errors.root && (
                    <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600">
                        {form.formState.errors.root.message}
                    </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                    <Field label="Nombre" error={form.formState.errors.nombre?.message}>
                        <input {...form.register('nombre')} placeholder={isAdd ? 'Juan' : undefined} className={inputCls} />
                    </Field>
                    <Field label="Apellido" error={form.formState.errors.apellido?.message}>
                        <input {...form.register('apellido')} placeholder={isAdd ? 'Pérez' : undefined} className={inputCls} />
                    </Field>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <Field label="Número de Identidad (13 dígitos)" error={form.formState.errors.numero_identidad?.message}>
                        <input
                            {...form.register('numero_identidad')}
                            placeholder={isAdd ? 'Ej: 0801199012345' : undefined}
                            maxLength={13}
                            className={inputCls}
                        />
                    </Field>
                    <Field label="Sexo" error={form.formState.errors.sexo?.message}>
                        <select {...form.register('sexo')} className={selectCls}>
                            <option value="">Seleccionar</option>
                            <option value="M">Masculino</option>
                            <option value="F">Femenino</option>
                        </select>
                    </Field>
                </div>
                <div className="grid grid-cols-3 gap-4">
                    <Field label="Grado" error={form.formState.errors.grado?.message}>
                        <select {...form.register('grado')} className={selectCls}>
                            <option value="">—</option>
                            {(gradosPermitidos.length > 0 ? gradosPermitidos : GRADOS).map(g => <option key={g} value={g}>{g} Grado</option>)}
                        </select>
                    </Field>
                    <Field label="Sección" error={form.formState.errors.seccion?.message}>
                        <select {...form.register('seccion')} className={selectCls}>
                            <option value="">—</option>
                            {SECCIONES.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </Field>
                    <Field label="Jornada" error={form.formState.errors.jornada?.message}>
                        <select {...form.register('jornada')} className={selectCls}>
                            <option value="">—</option>
                            {JORNADAS.map(j => <option key={j} value={j}>{j}</option>)}
                        </select>
                    </Field>
                </div>
                {isAdd && (
                    <p className="text-xs text-slate-500 bg-slate-50 rounded-lg p-3">
                        💡 La contraseña inicial del estudiante será su número de identidad. Podrá cambiarla después.
                    </p>
                )}
                <div className="flex gap-3 pt-1">
                    <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>
                        Cancelar
                    </Button>
                    <Button type="submit" loading={form.formState.isSubmitting} className="flex-1">
                        {isAdd ? 'Crear Estudiante' : 'Guardar Cambios'}
                    </Button>
                </div>
            </form>
        </Modal>
    )
}
