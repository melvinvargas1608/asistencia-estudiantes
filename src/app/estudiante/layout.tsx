import SidebarLayout from '@/components/layout/SidebarLayout'

export default function EstudianteLayout({ children }: { children: React.ReactNode }) {
    return <SidebarLayout role="estudiante">{children}</SidebarLayout>
}
