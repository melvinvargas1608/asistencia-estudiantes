export type UserRole = 'docente' | 'estudiante'

export interface Docente {
    id: string
    nombre: string
    apellido: string
    numero_identidad: string
    sexo: string
    grados: string[]       // grados asignados al docente
    seccion: string
    auth_user_id: string
    created_at: string
}

export interface Estudiante {
    id: string
    nombre: string
    apellido: string
    numero_identidad: string
    sexo: string
    grado: string
    seccion: string
    jornada: string
    qr_code?: string | null
    docente_id: string | null
    auth_user_id?: string | null
    created_at: string
    docentes?: Pick<Docente, 'nombre' | 'apellido'>
}

export interface Asistencia {
    id: string
    estudiante_id: string
    fecha: string
    presente: boolean
    created_at: string
    estudiantes?: Pick<Estudiante, 'nombre' | 'apellido' | 'numero_identidad' | 'grado' | 'seccion' | 'jornada'>
}

export interface Justificacion {
    id: string
    estudiante_id: string
    fecha: string // The date of the absence
    tipo: 'permiso' | 'excusa'
    motivo: string
    archivo_url?: string | null // Evidence link
    estado: 'pendiente' | 'aprobada' | 'rechazada'
    created_at: string
    estudiantes?: Pick<Estudiante, 'nombre' | 'apellido' | 'numero_identidad' | 'grado' | 'seccion'>
}

export interface AttendanceReport {
    fecha: string
    estudiante_id: string
    nombre: string
    apellido: string
    numero_identidad: string
    sexo: string
    grado: string
    seccion: string
    jornada: string
    presente: boolean
    docente_nombre: string
}

export const GRADOS = ['1°', '2°', '3°', '4°', '5°', '6°'] as const
export const SECCIONES = ['A', 'B', 'C', 'D', 'E'] as const
export const JORNADAS = ['Matutina', 'Vespertina', 'Nocturna'] as const
