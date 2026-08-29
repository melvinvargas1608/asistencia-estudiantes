'use client'

import Modal from '@/components/ui/Modal'
import Badge from '@/components/ui/Badge'
import { Download } from 'lucide-react'
import type { Estudiante } from '@/lib/types'

interface StudentQRModalProps {
    isOpen: boolean
    onClose: () => void
    student: Estudiante | null
}

export default function StudentQRModal({ isOpen, onClose, student }: StudentQRModalProps) {
    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Código QR del Estudiante" size="sm">
            {student && (
                <div className="flex flex-col items-center gap-4">
                    <div className="text-center">
                        <p className="font-semibold text-slate-800">{student.nombre} {student.apellido}</p>
                        <p className="text-sm text-slate-500">DNI: {student.numero_identidad}</p>
                        <Badge variant="gray" className="mt-1">{student.grado} • Sección {student.seccion}</Badge>
                    </div>
                    {student.qr_code ? (
                        <div className="border-4 border-slate-100 rounded-2xl overflow-hidden">
                            {/* QR is a base64 data URL; next/image does not optimize data URLs */}
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={student.qr_code} alt="QR Code" className="w-56 h-56" />
                        </div>
                    ) : (
                        <div className="w-56 h-56 bg-slate-100 rounded-2xl flex items-center justify-center">
                            <p className="text-slate-400 text-sm text-center px-4">QR no generado aún</p>
                        </div>
                    )}
                    {student.qr_code && (
                        <a
                            href={student.qr_code}
                            download={`qr-${student.numero_identidad}.png`}
                            className="flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                        >
                            <Download className="w-4 h-4" /> Descargar QR
                        </a>
                    )}
                </div>
            )}
        </Modal>
    )
}
