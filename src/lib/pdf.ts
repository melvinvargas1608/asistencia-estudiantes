import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import type { AttendanceReport } from './types'

export function exportAttendancePDF(
    records: AttendanceReport[],
    filters: { fechaInicio?: string; fechaFin?: string; grado?: string; seccion?: string }
) {
    const doc = new jsPDF({ orientation: 'landscape' })

    // Header
    doc.setFontSize(18)
    doc.setTextColor(30, 41, 59)
    doc.text('Reporte de Asistencia', 14, 18)

    doc.setFontSize(10)
    doc.setTextColor(100)
    const filterParts: string[] = []
    if (filters.fechaInicio) filterParts.push(`Desde: ${filters.fechaInicio}`)
    if (filters.fechaFin) filterParts.push(`Hasta: ${filters.fechaFin}`)
    if (filters.grado) filterParts.push(`Grado: ${filters.grado}`)
    if (filters.seccion) filterParts.push(`Sección: ${filters.seccion}`)
    if (filterParts.length) doc.text(filterParts.join('   |   '), 14, 26)

    const generatedAt = format(new Date(), "dd/MM/yyyy HH:mm", { locale: es })
    doc.text(`Generado: ${generatedAt}`, 14, 32)

    // Table
    autoTable(doc, {
        startY: 38,
        head: [['Fecha', 'Nombre', 'Apellido', 'Sexo', 'DNI', 'Grado', 'Sección', 'Jornada', 'Asistencia', 'Docente']],
        body: records.map(r => [
            r.fecha,
            r.nombre,
            r.apellido,
            (() => {
                const low = (r.sexo || '').toLowerCase().trim()
                if (['m', 'masculino', 'hombre', 'male', 'h'].includes(low)) return 'Masculino'
                if (['f', 'femenino', 'mujer', 'female'].includes(low)) return 'Femenino'
                return r.sexo
            })(),
            r.numero_identidad,
            r.grado,
            r.seccion,
            r.jornada,
            r.presente ? 'Presente' : 'Ausente',
            r.docente_nombre,
        ]),
        styles: { fontSize: 8, cellPadding: 3 },
        headStyles: { fillColor: [30, 41, 59] as [number, number, number], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [248, 250, 252] as [number, number, number] },
        didParseCell: (data) => {
            // Color the "Asistencia" column (index 8) based on value
            if (data.column.index === 8 && data.section === 'body') {
                if (data.cell.raw === 'Presente') {
                    data.cell.styles.textColor = [22, 163, 74] as [number, number, number]
                    data.cell.styles.fontStyle = 'bold'
                } else if (data.cell.raw === 'Ausente') {
                    data.cell.styles.textColor = [220, 38, 38] as [number, number, number]
                    data.cell.styles.fontStyle = 'bold'
                }
            }
        },
    })

    doc.save(`reporte-asistencia-${format(new Date(), 'yyyy-MM-dd')}.pdf`)
}
