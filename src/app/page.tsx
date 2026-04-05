import Link from 'next/link'
import { GraduationCap, Users, BookOpen } from 'lucide-react'

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-sky-200 via-sky-300 to-cyan-400 flex flex-col items-center justify-center p-6">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-md text-center">
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center">
            <BookOpen className="w-10 h-10 text-indigo-400" />
          </div>
        </div>

        <h1 className="text-4xl font-bold text-white mb-2 tracking-tight">
          AsistenciaEdu
        </h1>
        <p className="text-indigo-300 text-lg mb-10">
          Control de Asistencia Escolar
        </p>

        <p className="text-slate-400 text-sm mb-6 uppercase tracking-widest font-medium">
          Selecciona tu rol para ingresar
        </p>

        <div className="grid gap-4">
          {/* Docente */}
          <Link
            href="/login?role=docente"
            className="group relative flex items-center gap-4 p-5 rounded-2xl bg-white/5 border border-white/10 hover:bg-indigo-500/20 hover:border-indigo-400/40 transition-all duration-300 text-left"
          >
            <div className="w-12 h-12 rounded-xl bg-indigo-500/30 flex items-center justify-center shrink-0 group-hover:bg-indigo-500/50 transition-colors">
              <Users className="w-6 h-6 text-indigo-300" />
            </div>
            <div className="flex-1">
              <h2 className="text-white font-semibold text-lg">Ingresar como Docente</h2>
              <p className="text-slate-400 text-sm">Gestiona estudiantes y asistencia</p>
            </div>
            <div className="text-slate-500 group-hover:text-indigo-400 transition-colors">→</div>
          </Link>

          {/* Estudiante */}
          <Link
            href="/login?role=estudiante"
            className="group relative flex items-center gap-4 p-5 rounded-2xl bg-white/5 border border-white/10 hover:bg-emerald-500/20 hover:border-emerald-400/40 transition-all duration-300 text-left"
          >
            <div className="w-12 h-12 rounded-xl bg-emerald-500/30 flex items-center justify-center shrink-0 group-hover:bg-emerald-500/50 transition-colors">
              <GraduationCap className="w-6 h-6 text-emerald-300" />
            </div>
            <div className="flex-1">
              <h2 className="text-white font-semibold text-lg">Ingresar como Estudiante</h2>
              <p className="text-slate-400 text-sm">Consulta tu asistencia y QR</p>
            </div>
            <div className="text-slate-500 group-hover:text-emerald-400 transition-colors">→</div>
          </Link>
        </div>

        <p className="text-slate-600 text-xs mt-10">
          © {new Date().getFullYear()} AsistenciaEdu — Sistema de Control Escolar
        </p>
      </div>
    </main>
  )
}
