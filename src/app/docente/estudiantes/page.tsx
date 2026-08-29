'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { generateStudentQR } from '@/lib/qr'
import Button from '@/components/ui/Button'
import { Plus, Upload } from 'lucide-react'
import type { Docente, Estudiante } from '@/lib/types'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import StudentFormModal, { studentSchema, type StudentForm } from './components/StudentFormModal'
import StudentTable from './components/StudentTable'
import DeleteConfirmModal from './components/DeleteConfirmModal'
import StudentQRModal from './components/StudentQRModal'
import ImportStudentsModal from './components/ImportStudentsModal'
import ResetPasswordModal from './components/ResetPasswordModal'

export default function EstudiantesPage() {
    const [docente, setDocente] = useState<Docente | null>(null)
    const [students, setStudents] = useState<Estudiante[]>([])
    const [search, setSearch] = useState('')
    const [loading, setLoading] = useState(true)

    // Derived: grados permitidos para este docente
    const gradosPermitidos: string[] = docente?.grados ?? []

    // Modals
    const [showAdd, setShowAdd] = useState(false)
    const [showEdit, setShowEdit] = useState(false)
    const [showDelete, setShowDelete] = useState(false)
    const [showQR, setShowQR] = useState(false)
    const [showImport, setShowImport] = useState(false)
    const [showReset, setShowReset] = useState(false)
    const [selected, setSelected] = useState<Estudiante | null>(null)

    const form = useForm<StudentForm>({ resolver: zodResolver(studentSchema) })
    const editForm = useForm<StudentForm>({ resolver: zodResolver(studentSchema) })

    async function fetchStudents(docenteId: string) {
        const supabase = createClient()
        const { data } = await supabase
            .from('estudiantes')
            .select('*')
            .eq('docente_id', docenteId)
            .order('apellido', { ascending: true })
        setStudents(data || [])
        setLoading(false)
    }

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

    // Real-time search (derived from students + search)
    const filtered = useMemo(() => {
        const q = search.toLowerCase().trim()
        if (!q) return students
        return students.filter(s =>
            `${s.nombre} ${s.apellido} ${s.numero_identidad}`.toLowerCase().includes(q)
        )
    }, [search, students])

    // ── Add Student ──────────────────────────────────────────────────────────
    async function handleAdd(data: StudentForm) {
        if (!docente) return

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

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Estudiantes</h1>
                    <p className="text-slate-500 text-sm mt-0.5">
                        {docente ? `Sección ${docente.seccion}` : ''}
                        {!loading && ` • ${students.length} estudiantes`}
                    </p>
                    {gradosPermitidos.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-1.5">
                            {gradosPermitidos.map(g => (
                                <span key={g} className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-600 border border-indigo-100">
                                    {g} Grado
                                </span>
                            ))}
                        </div>
                    )}
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

            <StudentTable
                students={filtered}
                search={search}
                onSearchChange={setSearch}
                loading={loading}
                onViewQR={(s) => { setSelected(s); setShowQR(true) }}
                onEdit={openEdit}
                onResetPassword={(s) => { setSelected(s); setShowReset(true) }}
                onDelete={(s) => { setSelected(s); setShowDelete(true) }}
            />

            <StudentFormModal
                mode="add"
                isOpen={showAdd}
                onClose={() => setShowAdd(false)}
                form={form}
                gradosPermitidos={gradosPermitidos}
                onSubmit={handleAdd}
            />
            <StudentFormModal
                mode="edit"
                isOpen={showEdit}
                onClose={() => setShowEdit(false)}
                form={editForm}
                gradosPermitidos={gradosPermitidos}
                onSubmit={handleEdit}
            />
            <DeleteConfirmModal isOpen={showDelete} onClose={() => setShowDelete(false)} student={selected} onConfirm={handleDelete} />
            <StudentQRModal isOpen={showQR} onClose={() => setShowQR(false)} student={selected} />
            <ImportStudentsModal isOpen={showImport} onClose={() => setShowImport(false)} docente={docente} onImported={() => fetchStudents(docente?.id ?? '')} />
            <ResetPasswordModal isOpen={showReset} onClose={() => setShowReset(false)} student={selected} />
        </div>
    )
}
