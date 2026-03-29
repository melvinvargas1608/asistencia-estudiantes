import QRCode from 'qrcode'

/**
 * Generate a QR code data URL for a student.
 * The payload encodes the student ID so the scanner can look them up.
 */
export async function generateStudentQR(studentId: string): Promise<string> {
    const payload = JSON.stringify({ studentId, type: 'asistencia' })
    const dataUrl = await QRCode.toDataURL(payload, {
        width: 300,
        margin: 2,
        color: {
            dark: '#1e293b',
            light: '#ffffff',
        },
        errorCorrectionLevel: 'H',
    })
    return dataUrl
}

/**
 * Parse the QR payload and extract the student ID.
 */
export function parseQRPayload(raw: string): string | null {
    try {
        const obj = JSON.parse(raw)
        if (obj?.type === 'asistencia' && obj?.studentId) {
            return obj.studentId as string
        }
        return null
    } catch {
        return null
    }
}
