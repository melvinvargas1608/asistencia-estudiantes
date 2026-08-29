'use client'

import { useRef, useState } from 'react'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import { generateStudentQR } from '@/lib/qr'
import { parseStudentFile } from '@/lib/import'
import { getErrorMessage } from '@/lib/utils'
import type { Docente } from '@/lib/types'
import { Upload } from 'lucide-react'

interface ImportStudentsModalProps {
    isOpen: boolean
    onClose: () => void
    docente: Docente | null
    onImported: () => void
}

export default function ImportStudentsModal({ isOpen, onClose, docente, onImported }: ImportStudentsModalProps) {
    const [importFile, setImportFile] = useState<File | null>(null)
    const [importError, setImportError] = useState<string | null>(null)
    const [importLoading, setImportLoading] = useState(false)
    const fileRef = useRef<HTMLInputElement>(null)

    const gradosPermitidos: string[] = docente?.grados ?? []

    async function handleImport() {
        if (!importFile || !docente) return
        setImportError(null)
        setImportLoading(true)
        try {
            const rows = await parseStudentFile(importFile)
            const grados = docente.grados ?? []
            const invalid = rows.filter(r => !grados.includes(r.grado))
            if (invalid.length > 0) {
                const nombres = invalid.map(r => `${r.nombre} ${r.apellido} (${r.grado})`).join(', ')
                throw new Error(`Estudiantes con grado no permitido: ${nombres}. Solo puedes importar grados: ${grados.join(', ')}`)
            }
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
            onClose()
            setImportFile(null)
            onImported()
        } catch (err: unknown) {
            setImportError(getErrorMessage(err, 'Error al importar'))
        } finally {
            setImportLoading(false)
        }
    }

    return (
        <Modal isOpen={isOpen} onClose={() => { setImportFile(null); setImportError(null); onClose() }} title="Importar Estudiantes" size="md">
            <div className="space-y-4">
                <p className="text-sm text-slate-600">
                    Sube un archivo CSV o Excel con las columnas: <strong>nombre, apellido, numero_identidad, sexo, grado, seccion, jornada</strong>
                </p>
                {gradosPermitidos.length > 0 && (
                    <div className="bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-3 text-xs text-indigo-700 font-medium">
                        ℹ️ Solo se aceptarán estudiantes con grado: <strong>{gradosPermitidos.join(', ')}</strong>
                    </div>
                )}

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
                    <Button variant="secondary" className="flex-1" onClick={() => { setImportFile(null); onClose() }}>
                        Cancelar
                    </Button>
                    <Button className="flex-1" loading={importLoading} onClick={handleImport} disabled={!importFile}>
                        Importar
                    </Button>
                </div>
            </div>
        </Modal>
    )
}
