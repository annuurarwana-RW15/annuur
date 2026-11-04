import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { PeminjamanTable, type LoanWithDetails } from '@/app/admin/(dashboard)/inventaris/peminjaman/PeminjamanTable'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}))

vi.mock('@/app/admin/(dashboard)/inventaris/actions', () => ({
  recordReturn: vi.fn().mockResolvedValue({ ok: true }),
}))

describe('PeminjamanTable', () => {
  const dummyLoans: LoanWithDetails[] = [
    {
      id: 'l-1',
      code: 'PINJAM-202611-0001',
      borrowerName: 'Pak RT 04 (Ahmad)',
      borrowerPhone: '0812345678',
      borrowerAddress: 'Blok B No. 4',
      purpose: 'Pengajian Rutin',
      loanDate: new Date('2026-11-04'),
      expectedReturn: new Date('2026-11-06'),
      actualReturn: null,
      status: 'DIPINJAM',
      officerOut: 'Ust. Marbot',
      officerIn: null,
      notes: null,
      items: [
        {
          id: 'li-1',
          borrowedQty: 20,
          returnedQty: 0,
          brokenQty: 0,
          missingQty: 0,
          item: { id: 'i-1', code: 'INV-KRS-01', name: 'Kursi Lipat' },
        },
      ],
    },
  ]

  it('merender daftar peminjaman aktif beserta data peminjam dan tombol aksi', () => {
    render(<PeminjamanTable loans={dummyLoans} />)

    expect(screen.getByText('PINJAM-202611-0001')).toBeInTheDocument()
    expect(screen.getByText('Pak RT 04 (Ahmad)')).toBeInTheDocument()
    expect(screen.getByText('Kursi Lipat:')).toBeInTheDocument()
    expect(screen.getByText('Dipinjam')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Cetak Slip/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Pengembalian/i })).toBeInTheDocument()
  })
})

