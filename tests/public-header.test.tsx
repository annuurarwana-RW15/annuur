import { beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { PublicHeader } from '@/components/public/PublicHeader'

const h = vi.hoisted(() => ({
  signOutMock: vi.fn(),
}))

vi.mock('next-auth/react', () => ({
  signOut: h.signOutMock,
}))

vi.mock('next/link', () => ({
  __esModule: true,
  default: ({
    href,
    children,
    onClick,
    ...rest
  }: {
    href: string
    children: React.ReactNode
    onClick?: () => void
    [key: string]: unknown
  }) => (
    <a href={href} onClick={onClick} {...rest}>
      {children}
    </a>
  ),
}))

beforeEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('PublicHeader Auth Menu', () => {
  it('saat belum login: menampilkan tombol Masuk (menuju /admin/login) dan tidak menampilkan Dashboard/Keluar', () => {
    render(<PublicHeader siteName="Masjid An-Nuur" user={null} />)

    const loginLinks = screen.getAllByRole('link', { name: /masuk/i })
    expect(loginLinks.length).toBeGreaterThan(0)
    for (const link of loginLinks) {
      expect(link).toHaveAttribute('href', '/admin/login')
    }

    expect(screen.queryByRole('link', { name: /dashboard/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /keluar/i })).not.toBeInTheDocument()
  })

  it('saat sudah login: menampilkan tombol Dashboard dan Keluar, tidak menampilkan Masuk', () => {
    const user = { name: 'Ahmad Fauzi', role: 'ADMIN' }
    render(<PublicHeader siteName="Masjid An-Nuur" user={user} />)

    expect(screen.queryByRole('link', { name: /^masuk$/i })).not.toBeInTheDocument()

    const dashboardLinks = screen.getAllByRole('link', { name: /dashboard/i })
    expect(dashboardLinks.length).toBeGreaterThan(0)
    for (const link of dashboardLinks) {
      expect(link).toHaveAttribute('href', '/admin')
    }

    const logoutButtons = screen.getAllByRole('button', { name: /keluar/i })
    expect(logoutButtons.length).toBeGreaterThan(0)
  })

  it('mengeklik tombol Keluar memanggil signOut dengan callbackUrl "/"', () => {
    const user = { name: 'Bendahara Masjid', role: 'BENDAHARA' }
    render(<PublicHeader siteName="Masjid An-Nuur" user={user} />)

    const logoutButtons = screen.getAllByRole('button', { name: /keluar/i })
    fireEvent.click(logoutButtons[0])

    expect(h.signOutMock).toHaveBeenCalledWith({ callbackUrl: '/' })
  })

  it('saat nomor WhatsApp diberikan: menampilkan tombol Kontak WA dengan tautan wa.me', () => {
    render(<PublicHeader siteName="Masjid An-Nuur" user={null} whatsapp="081234567890" />)

    const waLinks = screen.getAllByRole('link', { name: /kontak wa/i })
    expect(waLinks.length).toBeGreaterThan(0)
    for (const link of waLinks) {
      expect(link.getAttribute('href')).toContain('wa.me/6281234567890')
    }
  })
})

