import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { can } from '@/lib/rbac'
import { ADMIN_NAV } from '@/components/admin/nav'
import { Sidebar } from '@/components/admin/Sidebar'

export const metadata: Metadata = {
  title: 'Admin — Masjid An-Nur Arwana',
  robots: { index: false, follow: false },
}

export default async function AdminDashboardLayout({
  children,
}: {
  children: ReactNode
}) {
  const session = await auth()
  const user = session?.user
  if (!user?.id) redirect('/admin/login')

  const items = ADMIN_NAV.filter((item) => !item.action || can(user.role, item.action))

  return (
    <div className="min-h-screen bg-[#FAF7F0] md:flex">
      <Sidebar
        items={items}
        user={{ name: user.name || user.email || 'Pengguna', role: user.role }}
      />
      <main className="min-w-0 flex-1 p-6">{children}</main>
    </div>
  )
}
