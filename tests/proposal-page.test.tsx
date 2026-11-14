import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { ProposalCard, type ProposalWithFunding } from '@/components/public/ProposalCard'
import { ProposalPdfModal } from '@/components/public/ProposalPdfModal'

beforeEach(() => {
  cleanup()
})

describe('ProposalCard Component', () => {
  const sampleProposal: ProposalWithFunding = {
    id: 'prop-1',
    title: 'Pengadaan Genset Otomatis Masjid',
    slug: 'pengadaan-genset-otomatis-masjid',
    summary: 'Pengadaan cadangan listrik darurat untuk operasional masjid saat pemadaman.',
    description: 'Rincian lengkap pengadaan genset 25 kVA silent type...',
    coverImage: '/images/genset.jpg',
    filePdf: '/uploads/proposal-genset.pdf',
    filePdfSize: '3.1 MB',
    targetAmount: 60000000 as any,
    collectedManual: 20000000 as any,
    categoryId: 'cat-sarana',
    category: { id: 'cat-sarana', name: 'Infaq Sarana & Pembangunan', color: '#10B981' },
    programId: 'prog-1',
    program: { id: 'prog-1', title: 'Revitalisasi Kelistrikan', slug: 'revitalisasi-kelistrikan' },
    startDate: null,
    endDate: null,
    status: 'DIBUKA',
    isFeatured: true,
    picName: 'H. Sudirman',
    picPhone: '081234567890',
    createdAt: new Date(),
    updatedAt: new Date(),
    funding: {
      targetAmount: 60000000,
      collectedManual: 20000000,
      onlineDonationsTotal: 10000000,
      collectedTotal: 30000000,
      percentage: 50,
      remaining: 30000000,
      isFulfilled: false,
      onlineDonationsCount: 8,
    },
  }

  it('renders proposal information, funding progress, and download PDF button', () => {
    render(<ProposalCard proposal={sampleProposal} />)

    expect(screen.getByText('Pengadaan Genset Otomatis Masjid')).toBeInTheDocument()
    expect(screen.getByText(/Rp 30.000.000/i)).toBeInTheDocument() // Terkumpul
    expect(screen.getByText(/Rp 60.000.000/i)).toBeInTheDocument() // Target
    expect(screen.getByText(/50%/i)).toBeInTheDocument()

    const downloadLink = screen.getByRole('link', { name: /unduh pdf/i })
    expect(downloadLink).toHaveAttribute('href', '/uploads/proposal-genset.pdf')
    expect(downloadLink).toHaveAttribute('download')
  })

  it('renders detail link leading to /proposal/[slug]', () => {
    render(<ProposalCard proposal={sampleProposal} />)

    const detailLinks = screen.getAllByRole('link', { name: /detail|selengkapnya/i })
    expect(detailLinks.some((l) => l.getAttribute('href') === '/proposal/pengadaan-genset-otomatis-masjid')).toBe(true)
  })
})

describe('ProposalPdfModal Component', () => {
  it('opens and displays PDF preview iframe and close button when triggered', () => {
    render(
      <ProposalPdfModal
        isOpen={true}
        onClose={() => {}}
        pdfUrl="/uploads/proposal-sample.pdf"
        title="Proposal Renovasi"
      />
    )

    expect(screen.getByText(/pratinjau dokumen proposal/i)).toBeInTheDocument()
    const iframe = screen.getByTitle(/pratinjau dokumen proposal/i)
    expect(iframe).toHaveAttribute('src', '/uploads/proposal-sample.pdf')
  })
})
