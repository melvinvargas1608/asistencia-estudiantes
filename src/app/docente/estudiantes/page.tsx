'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { generateStudentQR } from '@/lib/qr'
import { parseStudentFile } from '@/lib/import'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import {
    Search, Plus, Upload, Pencil, Trash2, QrCode, X,
    AlertTriangle, Download, ChevronDown
} from 'lucide-react'
import type { Docente, Estudiante } from '@/lib/types'
import { GRADOS, JORNADAS, SECCIONES } from '@/lib/types'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

// ─── Schema ─────────────────────────────────────────────────────────────────
const studentSchema = z.object({
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

type StudentForm = z.infer<typeof studentSchema>

// ─── Component ───────────────────────────────────────────────────────────────
export default function EstudiantesPage() {
    const [docente, setDocente] = useState<Docente | null>(null)
    const [students, setStudents] = useState<Estudiante[]>([])
    const [filtered, setFiltered] = useState<Estudiante[]>([])
    const [search, setSearch] = useState('')
    const [loading, setLoading] = useState(true)

    // Modals
    const [showAdd, setShowAdd] = useState(false)
    const [showEdit, setShowEdit] = useState(false)
    const [showDelete, setShowDelete] = useState(false)
    const [showQR, setShowQR] = useState(false)
    const [showImport, setShowImport] = useState(false)
    const [selected, setSelected] = useState<Estudiante | null>(null)

    // Import
    const [importFile, setImportFile] = useState<File | null>(null)
    const [importError, setImportError] = useState<string | null>(null)
    const [importLoading, setImportLoading] = useState(false)
    const fileRef = useRef<HTMLInputElement>(null)

    const form = useForm<StudentForm>({ resolver: zodResolver(studentSchema) })
    const editForm = useForm<StudentForm>({ resolver: zodResolver(studentSchema) })

    // Load docente + students
    useEffect(() => {
        const supabase = createClient()
        async function load() {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return
            const { data: doc } = await supabase
                .from('docentes').select('*').eq('auth_user_id', user.id).single()
            if (!doc) return
            setDocente(doc)
            await fetchStudents(doc.id)
        }
        load()
    }, [])

    async function fetchStudents(docenteId: string) {
        const supabase = createClient()
        const { data } = await supabase
            .from('estudiantes')
            .select('*')
            .eq('docente_id', docenteId)
            .order('apellido', { ascending: true })
        setStudents(data || [])
        setFiltered(data || [])
        setLoading(false)
    }

    // Real-time search
    useEffect(() => {
        const q = search.toLowerCase().trim()
        if (!q) { setFiltered(students); return }
        setFiltered(students.filter(s =>
            `${s.nombre} ${s.apellido} ${s.numero_identidad}`.toLowerCase().includes(q)
        ))
    }, [search, students])

    // ── Add Student ──────────────────────────────────────────────────────────
    async function handleAdd(data: StudentForm) {
        if (!docente) return
        const supabase = createClient()

        // Generate QR
        const tempId = crypto.randomUUID()
        const qr = await generateStudentQR(tempId)

        // Sanitize DNI
        const sanitizedDni = data.numero_identidad.replace(/[-\s]/g, '').trim()

        // Create auth user for student using sanitized DNI
        const email = `${sanitizedDni}@asistencia.edu`
        const password = sanitizedDni // Default password = sanitized DNI

        const res = await fetch('/api/create-student', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...data, docente_id: docente.id, email, password, qr_code: qr }),
        })
        const result = await res.json()
        if (!res.ok) {
            form.setError('root', { message: result.error || 'Error al crear estudiante' })
            return
        }

        setShowAdd(false)
        form.reset()
        await fetchStudents(docente.id)
    }

    // ── Edit Student ─────────────────────────────────────────────────────────
    function openEdit(student: Estudiante) {
        setSelected(student)
        editForm.reset({
            nombre: student.nombre,
            apellido: student.apellido,
            numero_identidad: student.numero_identidad,
            sexo: student.sexo,
            grado: student.grado,
            seccion: student.seccion,
            jornada: student.jornada,
        })
        setShowEdit(true)
    }

    async function handleEdit(data: StudentForm) {
        if (!selected || !docente) return
        const supabase = createClient()
        const { error } = await supabase
            .from('estudiantes')
            .update(data)
            .eq('id', selected.id)
        if (error) {
            editForm.setError('root', { message: error.message })
            return
        }
        setShowEdit(false)
        await fetchStudents(docente.id)
    }

    // ── Delete Student ───────────────────────────────────────────────────────
    async function handleDelete() {
        if (!selected || !docente) return
        const supabase = createClient()
        await supabase.from('estudiantes').delete().eq('id', selected.id)
        setShowDelete(false)
        setSelected(null)
        await fetchStudents(docente.id)
    }

    // ── Import ───────────────────────────────────────────────────────────────
    async function handleImport() {
        if (!importFile || !docente) return
        setImportError(null)
        setImportLoading(true)
        try {
            const rows = await parseStudentFile(importFile)
            for (const row of rows) {
                const sanitizedDni = row.numero_identidad.replace(/[-\s]/g, '').trim()
                const email = `${sanitizedDni}@asistencia.edu`
                const password = sanitizedDni
                const qr = await generateStudentQR(crypto.randomUUID())
                await fetch('/api/create-student', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ...row, docente_id: docente.id, email, password, qr_code: qr }),
                })
            }
            setShowImport(false)
            setImportFile(null)
            await fetchStudents(docente.id)
        } catch (err: any) {
            setImportError(err.message || 'Error al importar')
        } finally {
            setImportLoading(false)
        }
    }

    const gradoColor: Record<string, 'indigo' | 'blue' | 'green' | 'yellow' | 'red' | 'gray'> = {
        '1°': 'indigo', '2°': 'blue', '3°': 'green', '4°': 'yellow', '5°': 'red', '6°': 'gray',
    }

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Estudiantes</h1>
                    <p className="text-slate-500 text-sm mt-0.5">
                        {docente ? `${docente.grado} Grado • Sección ${docente.seccion}` : ''}
                        {!loading && ` • ${students.length} estudiantes`}
                    </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                    <Button
                        variant="secondary"
                        icon={<Upload className="w-4 h-4" />}
                        onClick={() => setShowImport(true)}
                    >
                        Importar
                    </Button>
                    <Button
                        icon={<Plus className="w-4 h-4" />}
                        onClick={() => { setShowAdd(true); form.reset() }}
                    >
                        Nuevo Estudiante
                    </Button>
                </div>
            </div>

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                    type="text"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Buscar por nombre, apellido o DNI..."
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
                {search && (
                    <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
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
                            ) : filtered.length === 0 ? (
                                <tr><td colSpan={8} className="text-center py-12 text-slate-400">
                                    {search ? 'No se encontraron resultados' : 'No hay estudiantes registrados'}
                                </td></tr>
                            ) : (
                                filtered.map((s, i) => (
                                    <tr key={s.id} className="hover:bg-slate-50/60 transition-colors">
                                        <td className="px-4 py-3 text-slate-400 font-mono text-xs">{i + 1}</td>
                                        <td className="px-4 py-3 font-medium text-slate-800">{s.nombre}</td>
                                        <td className="px-4 py-3 text-slate-600">{s.apellido}</td>
                                        <td className="px-4 py-3 font-mono text-slate-500 text-xs">{s.numero_identidad}</td>
                                        <td className="px-4 py-3 text-slate-600">{s.sexo === 'M' ? 'Masculino' : s.sexo === 'F' ? 'Femenino' : s.sexo}</td>
                                        <td className="px-4 py-3">
                                            <Badge variant={gradoColor[s.grado] as any || 'gray'}>{s.grado}</Badge>
                                        </td>
                                        <td className="px-4 py-3 text-slate-600">{s.seccion}</td>
                                        <td className="px-4 py-3"><Badge variant="gray">{s.jornada}</Badge></td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-1">
                                                <button
                                                    onClick={() => { setSelected(s); setShowQR(true) }}
                                                    title="Ver QR"
                                                    className="p-1.5 rounded-lg text-indigo-500 hover:bg-indigo-50 transition-colors"
                                                >
                                                    <QrCode className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => openEdit(s)}
                                                    title="Editar"
                                                    className="p-1.5 rounded-lg text-amber-500 hover:bg-amber-50 transition-colors"
                                                >
                                                    <Pencil className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => { setSelected(s); setShowDelete(true) }}
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

            {/* ── Add Modal ──────────────────────────────────────────────────────── */}
            <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} title="Nuevo Estudiante" size="lg">
                <form onSubmit={form.handleSubmit(handleAdd)} className="space-y-4">
                    {form.formState.errors.root && (
                        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600">
                            {form.formState.errors.root.message}
                        </div>
                    )}
                    <div className="grid grid-cols-2 gap-4">
                        <Field label="Nombre" error={form.formState.errors.nombre?.message}>
                            <input {...form.register('nombre')} placeholder="Juan" className={inputCls} />
                        </Field>
                        <Field label="Apellido" error={form.formState.errors.apellido?.message}>
                            <input {...form.register('apellido')} placeholder="Pérez" className={inputCls} />
                        </Field>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <Field label="Número de Identidad (13 dígitos)" error={form.formState.errors.numero_identidad?.message}>
                            <input
                                {...form.register('numero_identidad')}
                                placeholder="Ej: 0801199012345"
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
                                {GRADOS.map(g => <option key={g} value={g}>{g} Grado</option>)}
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
                    <p className="text-xs text-slate-500 bg-slate-50 rounded-lg p-3">
                        💡 La contraseña inicial del estudiante será su número de identidad. Podrá cambiarla después.
                    </p>
                    <div className="flex gap-3 pt-1">
                        <Button type="button" variant="secondary" className="flex-1" onClick={() => setShowAdd(false)}>
                            Cancelar
                        </Button>
                        <Button type="submit" loading={form.formState.isSubmitting} className="flex-1">
                            Crear Estudiante
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* ── Edit Modal ─────────────────────────────────────────────────────── */}
            <Modal isOpen={showEdit} onClose={() => setShowEdit(false)} title="Editar Estudiante" size="lg">
                <form onSubmit={editForm.handleSubmit(handleEdit)} className="space-y-4">
                    {editForm.formState.errors.root && (
                        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600">
                            {editForm.formState.errors.root.message}
                        </div>
                    )}
                    <div className="grid grid-cols-2 gap-4">
                        <Field label="Nombre" error={editForm.formState.errors.nombre?.message}>
                            <input {...editForm.register('nombre')} className={inputCls} />
                        </Field>
                        <Field label="Apellido" error={editForm.formState.errors.apellido?.message}>
                            <input {...editForm.register('apellido')} className={inputCls} />
                        </Field>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <Field label="Número de Identidad (13 dígitos)" error={editForm.formState.errors.numero_identidad?.message}>
                            <input
                                {...editForm.register('numero_identidad')}
                                maxLength={13}
                                className={inputCls}
                            />
                        </Field>
                        <Field label="Sexo" error={editForm.formState.errors.sexo?.message}>
                            <select {...editForm.register('sexo')} className={selectCls}>
                                <option value="">Seleccionar</option>
                                <option value="M">Masculino</option>
                                <option value="F">Femenino</option>
                            </select>
                        </Field>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                        <Field label="Grado" error={editForm.formState.errors.grado?.message}>
                            <select {...editForm.register('grado')} className={selectCls}>
                                <option value="">—</option>
                                {GRADOS.map(g => <option key={g} value={g}>{g} Grado</option>)}
                            </select>
                        </Field>
                        <Field label="Sección" error={editForm.formState.errors.seccion?.message}>
                            <select {...editForm.register('seccion')} className={selectCls}>
                                <option value="">—</option>
                                {SECCIONES.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </Field>
                        <Field label="Jornada" error={editForm.formState.errors.jornada?.message}>
                            <select {...editForm.register('jornada')} className={selectCls}>
                                <option value="">—</option>
                                {JORNADAS.map(j => <option key={j} value={j}>{j}</option>)}
                            </select>
                        </Field>
                    </div>
                    <div className="flex gap-3 pt-1">
                        <Button type="button" variant="secondary" className="flex-1" onClick={() => setShowEdit(false)}>
                            Cancelar
                        </Button>
                        <Button type="submit" loading={editForm.formState.isSubmitting} className="flex-1">
                            Guardar Cambios
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* ── Delete Confirm Modal ───────────────────────────────────────────── */}
            <Modal isOpen={showDelete} onClose={() => setShowDelete(false)} title="Eliminar Estudiante" size="sm">
                <div className="space-y-4">
                    <div className="flex gap-3 items-start">
                        <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
                            <AlertTriangle className="w-5 h-5 text-red-600" />
                        </div>
                        <div>
                            <p className="font-medium text-slate-800">
                                ¿Eliminar a {selected?.nombre} {selected?.apellido}?
                            </p>
                            <p className="text-sm text-slate-500 mt-1">
                                Esta acción no se puede deshacer. Se eliminará su historial de asistencia.
                            </p>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <Button variant="secondary" className="flex-1" onClick={() => setShowDelete(false)}>
                            Cancelar
                        </Button>
                        <Button variant="danger" className="flex-1" onClick={handleDelete}>
                            Eliminar
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* ── QR Modal ──────────────────────────────────────────────────────── */}
            <Modal isOpen={showQR} onClose={() => setShowQR(false)} title="Código QR del Estudiante" size="sm">
                {selected && (
                    <div className="flex flex-col items-center gap-4">
                        <div className="text-center">
                            <p className="font-semibold text-slate-800">{selected.nombre} {selected.apellido}</p>
                            <p className="text-sm text-slate-500">DNI: {selected.numero_identidad}</p>
                            <Badge variant="gray" className="mt-1">{selected.grado} • Sección {selected.seccion}</Badge>
                        </div>
                        {selected.qr_code ? (
                            <div className="border-4 border-slate-100 rounded-2xl overflow-hidden">
                                <img src={selected.qr_code} alt="QR Code" className="w-56 h-56" />
                            </div>
                        ) : (
                            <div className="w-56 h-56 bg-slate-100 rounded-2xl flex items-center justify-center">
                                <p className="text-slate-400 text-sm text-center px-4">QR no generado aún</p>
                            </div>
                        )}
                        {selected.qr_code && (
                            <a
                                href={selected.qr_code}
                                download={`qr-${selected.numero_identidad}.png`}
                                className="flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                            >
                                <Download className="w-4 h-4" /> Descargar QR
                            </a>
                        )}
                    </div>
                )}
            </Modal>

            {/* ── Import Modal ───────────────────────────────────────────────────── */}
            <Modal isOpen={showImport} onClose={() => { setShowImport(false); setImportFile(null); setImportError(null) }} title="Importar Estudiantes" size="md">
                <div className="space-y-4">
                    <p className="text-sm text-slate-600">
                        Sube un archivo CSV o Excel con las columnas: <strong>nombre, apellido, numero_identidad, sexo, grado, seccion, jornada</strong>
                    </p>

                    {importError && (
                        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600">
                            {importError}
                        </div>
                    )}

                    <div
                        className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/30 transition-all"
                        onClick={() => fileRef.current?.click()}
                    >
                        <Upload className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                        {importFile ? (
                            <div>
                                <p className="font-medium text-slate-700">{importFile.name}</p>
                                <p className="text-sm text-slate-400">{(importFile.size / 1024).toFixed(1)} KB</p>
                            </div>
                        ) : (
                            <>
                                <p className="text-slate-500 font-medium">Haz clic para seleccionar</p>
                                <p className="text-xs text-slate-400 mt-1">.CSV, .XLS, .XLSX</p>
                            </>
                        )}
                        <input
                            ref={fileRef}
                            type="file"
                            accept=".csv,.xls,.xlsx"
                            className="hidden"
                            onChange={e => {
                                setImportFile(e.target.files?.[0] || null)
                                setImportError(null)
                            }}
                        />
                    </div>

                    <div className="flex gap-3">
                        <Button variant="secondary" className="flex-1" onClick={() => { setShowImport(false); setImportFile(null) }}>
                            Cancelar
                        </Button>
                        <Button className="flex-1" loading={importLoading} onClick={handleImport} disabled={!importFile}>
                            Importar
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    )
}

// ── Helper components ─────────────────────────────────────────────────────────
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
