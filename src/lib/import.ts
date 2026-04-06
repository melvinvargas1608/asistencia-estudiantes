import * as XLSX from 'xlsx'

export interface ImportedStudent {
    nombre: string
    apellido: string
    numero_identidad: string
    sexo: string
    grado: string
    seccion: string
    jornada: string
}

/**
 * Parse a CSV or Excel file and return an array of student objects.
 * Expected columns (case-insensitive): nombre, apellido, numero_identidad / dni, grado, seccion, jornada
 */
export async function parseStudentFile(file: File): Promise<ImportedStudent[]> {
    const buffer = await file.arrayBuffer()
    const workbook = XLSX.read(buffer, { type: 'array' })
    const sheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[sheetName]
    const rows: Record<string, string>[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' })

    return rows.map((row, index) => {
        const get = (keys: string[]): string => {
            for (const k of keys) {
                const found = Object.keys(row).find(rk => rk.toLowerCase().trim() === k.toLowerCase())
                if (found && row[found]) return String(row[found]).trim()
            }
            return ''
        }

        const normalizeSexo = (val: string): string => {
            const low = val.toLowerCase().trim()
            if (['m', 'masculino', 'hombre', 'male', 'h'].includes(low)) return 'M'
            if (['f', 'femenino', 'mujer', 'female'].includes(low)) return 'F'
            return val.toUpperCase() // Fallback
        }

        const student: ImportedStudent = {
            nombre: get(['nombre', 'first_name', 'firstname']),
            apellido: get(['apellido', 'apellidos', 'last_name', 'lastname']),
            numero_identidad: get(['numero_identidad', 'dni', 'identidad', 'cedula', 'id']),
            sexo: normalizeSexo(get(['sexo', 'genero', 'gender'])),
            grado: get(['grado', 'grade']),
            seccion: get(['seccion', 'sección', 'section']),
            jornada: get(['jornada', 'turno', 'shift']),
        }

        if (!student.nombre) throw new Error(`Fila ${index + 2}: campo "nombre" es requerido`)
        if (!student.apellido) throw new Error(`Fila ${index + 2}: campo "apellido" es requerido`)
        if (!student.numero_identidad) throw new Error(`Fila ${index + 2}: campo "numero_identidad" es requerido`)
        if (!student.sexo) throw new Error(`Fila ${index + 2}: campo "sexo" es requerido`)

        return student
    })
}
