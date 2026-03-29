-- ============================================================
-- Sistema de Control de Asistencia de Estudiantes
-- Migration 001: Initial Schema
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- Table: docentes
-- ============================================================
CREATE TABLE IF NOT EXISTS public.docentes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  apellido TEXT NOT NULL,
  numero_identidad TEXT UNIQUE NOT NULL,
  grado TEXT NOT NULL,
  seccion TEXT NOT NULL,
  auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.docentes ENABLE ROW LEVEL SECURITY;

-- Docentes can only see/edit their own record
CREATE POLICY "Docentes: read own record" ON public.docentes
  FOR SELECT USING (auth.uid() = auth_user_id);

CREATE POLICY "Docentes: update own record" ON public.docentes
  FOR UPDATE USING (auth.uid() = auth_user_id);

-- ============================================================
-- Table: estudiantes
-- ============================================================
CREATE TABLE IF NOT EXISTS public.estudiantes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  apellido TEXT NOT NULL,
  numero_identidad TEXT UNIQUE NOT NULL,
  grado TEXT NOT NULL,
  seccion TEXT NOT NULL,
  jornada TEXT NOT NULL,
  qr_code TEXT,
  docente_id UUID REFERENCES public.docentes(id) ON DELETE SET NULL,
  auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.estudiantes ENABLE ROW LEVEL SECURITY;

-- Docentes can manage their own students
CREATE POLICY "Docentes: read own students" ON public.estudiantes
  FOR SELECT USING (
    docente_id IN (
      SELECT id FROM public.docentes WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Docentes: insert own students" ON public.estudiantes
  FOR INSERT WITH CHECK (
    docente_id IN (
      SELECT id FROM public.docentes WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Docentes: update own students" ON public.estudiantes
  FOR UPDATE USING (
    docente_id IN (
      SELECT id FROM public.docentes WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Docentes: delete own students" ON public.estudiantes
  FOR DELETE USING (
    docente_id IN (
      SELECT id FROM public.docentes WHERE auth_user_id = auth.uid()
    )
  );

-- Estudiantes can only see their own record
CREATE POLICY "Estudiantes: read own record" ON public.estudiantes
  FOR SELECT USING (auth_user_id = auth.uid());

-- ============================================================
-- Table: asistencia
-- ============================================================
CREATE TABLE IF NOT EXISTS public.asistencia (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  estudiante_id UUID NOT NULL REFERENCES public.estudiantes(id) ON DELETE CASCADE,
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  presente BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (estudiante_id, fecha)
);

ALTER TABLE public.asistencia ENABLE ROW LEVEL SECURITY;

-- Docentes can manage attendance for their students
CREATE POLICY "Docentes: manage attendance" ON public.asistencia
  FOR ALL USING (
    estudiante_id IN (
      SELECT e.id FROM public.estudiantes e
      JOIN public.docentes d ON e.docente_id = d.id
      WHERE d.auth_user_id = auth.uid()
    )
  );

-- Estudiantes can read their own attendance
CREATE POLICY "Estudiantes: read own attendance" ON public.asistencia
  FOR SELECT USING (
    estudiante_id IN (
      SELECT id FROM public.estudiantes WHERE auth_user_id = auth.uid()
    )
  );

-- ============================================================
-- Indexes for performance
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_estudiantes_docente_id ON public.estudiantes(docente_id);
CREATE INDEX IF NOT EXISTS idx_estudiantes_numero_identidad ON public.estudiantes(numero_identidad);
CREATE INDEX IF NOT EXISTS idx_asistencia_estudiante_fecha ON public.asistencia(estudiante_id, fecha);
CREATE INDEX IF NOT EXISTS idx_asistencia_fecha ON public.asistencia(fecha);
