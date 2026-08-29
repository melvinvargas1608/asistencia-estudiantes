'use client'

import { useState } from 'react'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import { Lock } from 'lucide-react'
import type { Estudiante } from '@/lib/types'
import { getErrorMessage } from '@/lib/utils'

const inputCls = 'w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all'

interface ResetPasswordModalProps {
    isOpen: boolean
    onClose: () => void
    student: Estudiante | null
}

export default function ResetPasswordModal({ isOpen, onClose, student }: ResetPasswordModalProps) {
    const [newPassword, setNewPassword] = useState('')
    const [resetLoading, setResetLoading] = useState(false)

    async function handleResetPassword() {
        const trimmedPwd = newPassword.trim()
        if (!student || trimmedPwd.length !== 6) {
            if (trimmedPwd.length !== 6) alert('La contraseña debe tener exactamente 6 caracteres.')
            return
        }
        setResetLoading(true)
        try {
            const res = await fetch('/api/reset-student-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    auth_user_id: student.auth_user_id,
                    numero_identidad: student.numero_identidad,
                    password: newPassword.trim()
                }),
            })
            if (!res.ok) {
                const err = await res.json()
                throw new Error(err.error || 'Error al restablecer contraseña')
            }
            onClose()
            setNewPassword('')
            alert('Contraseña actualizada correctamente.')
        } catch (err: unknown) {
            alert(getErrorMessage(err, 'Error al restablecer contraseña'))
        } finally {
            setResetLoading(false)
        }
    }

    return (
        <Modal
            isOpen={isOpen}
            onClose={() => { setNewPassword(''); onClose() }}
            title="Establecer Nueva Contraseña"
            size="sm"
        >
            <div className="space-y-4">
                <div className="flex gap-3 items-start">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0">
                        <Lock className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div>
                        <p className="font-medium text-slate-800">
                            Nueva clave para {student?.nombre}
                        </p>
                        <p className="text-sm text-slate-500 mt-1">
                            Escribe la nueva contraseña que usará el estudiante para ingresar.
                        </p>
                    </div>
                </div>

                <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">
                        Nueva Contraseña
                    </label>
                    <input
                        type="text"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="••••••"
                        maxLength={6}
                        className={inputCls}
                        autoFocus
                    />
                </div>

                <div className="flex gap-3 pt-2">
                    <Button variant="secondary" className="flex-1" onClick={() => { setNewPassword(''); onClose() }}>
                        Cancelar
                    </Button>
                    <Button
                        className="flex-1"
                        loading={resetLoading}
                        onClick={handleResetPassword}
                        disabled={newPassword.trim().length !== 6}
                    >
                        Actualizar
                    </Button>
                </div>
            </div>
        </Modal>
    )
}
