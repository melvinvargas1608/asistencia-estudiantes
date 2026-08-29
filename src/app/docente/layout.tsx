import SidebarLayout from '@/components/layout/SidebarLayout'

export default function DocenteLayout({ children }: { children: React.ReactNode }) {
    return <SidebarLayout role="docente">{children}</SidebarLayout>
}
