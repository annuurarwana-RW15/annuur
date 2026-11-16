// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { ProposalAdminClient, type AdminProposalItem } from '@/app/admin/(dashboard)/proposal/ProposalAdminClient'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
}))

const MOCK_PROPOSALS: AdminProposalItem[] = [
  {
    id: 'prop-1',
    title: 'Pengadaan Karpet Masjid',
    slug: 'pengadaan-karpet-masjid',
    summary: 'Penggantian karpet sholat utama',
    description: 'Rincian spesifikasi karpet turki tebal 14mm',
    coverImage: null,
    filePdf: '/uploads/proposal-karpet.pdf',
    filePdfSize: '1.2 MB',
    targetAmount: 37550000,
    collectedManual: 5250000,
    categoryId: null,
    category: null,
    programId: null,
    program: null,
    startDate: null,
    endDate: null,
    status: 'DIBUKA',
    isFeatured: true,
    picName: 'H. Sudirman',
    picPhone: '08123456789',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    funding: {
      targetAmount: 37550000,
      collectedManual: 5250000,
      onlineDonationsTotal: 0,
      collectedTotal: 5250000,
      percentage: 14,
      isFulfilled: false,
      remaining: 32300000,
      onlineDonationsCount: 0,
    },
  },
]

beforeEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('ProposalAdminClient — Format Currency Indonesia & Tanpa Pembulatan', () => {
  it('input target anggaran menggunakan format currency bertitik ribuan dan tidak meminta pembulatan step', () => {
    render(<ProposalAdminClient initialProposals={MOCK_PROPOSALS} categories={[]} programs={[]} />)

    // Buka modal buat proposal baru
    const createBtn = screen.getByRole('button', { name: /Buat Proposal Baru/i })
    fireEvent.click(createBtn)

    // Ambil input target anggaran
    const targetInput = screen.getByPlaceholderText('Contoh: 50.000.000') as HTMLInputElement
    expect(targetInput).toBeInTheDocument()
    expect(targetInput.type).toBe('text')
    expect(targetInput.getAttribute('inputmode')).toBe('numeric')
    expect(targetInput.getAttribute('step')).toBeNull()

    // Ketik angka acak/non-kelipatan 100.000 (misal: 15.750.250)
    fireEvent.change(targetInput, { target: { value: '15750250' } })

    // Input otomatis terformat dengan titik ribuan gaya Indonesia
    expect(targetInput.value).toBe('15.750.250')

    // Indikator nilai tercatat menampilkan format Rupiah lengkap
    expect(screen.getByText('Rp 15.750.250')).toBeInTheDocument()
  })

  it('input donasi manual juga memformat penulisan angka dengan titik desimal ribuan Indonesia', () => {
    render(<ProposalAdminClient initialProposals={MOCK_PROPOSALS} categories={[]} programs={[]} />)

    const createBtn = screen.getByRole('button', { name: /Buat Proposal Baru/i })
    fireEvent.click(createBtn)

    const manualInput = screen.getByPlaceholderText('Contoh: 15.000.000') as HTMLInputElement
    expect(manualInput).toBeInTheDocument()
    expect(manualInput.type).toBe('text')
    expect(manualInput.getAttribute('step')).toBeNull()

    fireEvent.change(manualInput, { target: { value: '3250500' } })
    expect(manualInput.value).toBe('3.250.500')
    expect(screen.getByText('Rp 3.250.500')).toBeInTheDocument()
  })

  it('saat edit proposal, angka target terisi otomatis dalam format ribuan bertitik', () => {
    render(<ProposalAdminClient initialProposals={MOCK_PROPOSALS} categories={[]} programs={[]} />)

    // Klik tombol edit pada proposal karpet (target 37.550.000)
    const editBtn = screen.getByRole('button', { name: /Edit/i })
    fireEvent.click(editBtn)

    const targetInput = screen.getByPlaceholderText('Contoh: 50.000.000') as HTMLInputElement
    expect(targetInput.value).toBe('37.550.000')

    const manualInput = screen.getByPlaceholderText('Contoh: 15.000.000') as HTMLInputElement
    expect(manualInput.value).toBe('5.250.000')
  })

  it('menekan Enter di input anggaran tidak memicu error atau submit prematur', () => {
    render(<ProposalAdminClient initialProposals={MOCK_PROPOSALS} categories={[]} programs={[]} />)

    const createBtn = screen.getByRole('button', { name: /Buat Proposal Baru/i })
    fireEvent.click(createBtn)

    const targetInput = screen.getByPlaceholderText('Contoh: 50.000.000') as HTMLInputElement
    fireEvent.change(targetInput, { target: { value: '25000000' } })
    expect(targetInput.value).toBe('25.000.000')

    // Tekan Enter
    const enterEvent = new KeyboardEvent('keydown', { key: 'Enter', cancelable: true, bubbles: true })
    const wasDefaultPrevented = !targetInput.dispatchEvent(enterEvent)
    expect(wasDefaultPrevented).toBe(true)
  })
})
