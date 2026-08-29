'use client'

import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import { AlertTriangle } from 'lucide-react'
import type { Estudiante } from '@/lib/types'

interface DeleteConfirmModalProps {
    isOpen: boolean
    onClose: () => void
    student: Estudiante | null
    onConfirm: () => void
}

export default function DeleteConfirmModal({ isOpen, onClose, student, onConfirm }: DeleteConfirmModalProps) {
    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Eliminar Estudiante" size="sm">
            <div className="space-y-4">
                <div className="flex gap-3 items-start">
                    <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
                        <AlertTriangle className="w-5 h-5 text-red-600" />
                    </div>
                    <div>
                        <p className="font-medium text-slate-800">
                            ¿Eliminar a {student?.nombre} {student?.apellido}?
                        </p>
                        <p className="text-sm text-slate-500 mt-1">
                            Esta acción no se puede deshacer. Se eliminará su historial de asistencia.
                        </p>
                    </div>
                </div>
                <div className="flex gap-3">
                    <Button variant="secondary" className="flex-1" onClick={onClose}>
                        Cancelar
                    </Button>
                    <Button variant="danger" className="flex-1" onClick={onConfirm}>
                        Eliminar
                    </Button>
                </div>
            </div>
        </Modal>
    )
}
