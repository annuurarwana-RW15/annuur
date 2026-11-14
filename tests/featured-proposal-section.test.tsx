import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { FeaturedProposalSection } from '@/components/public/FeaturedProposalSection'
import type { ProposalWithFunding } from '@/components/public/ProposalCard'

beforeEach(() => {
  cleanup()
})

describe('FeaturedProposalSection Component', () => {
  const sampleFeatured: ProposalWithFunding[] = [
    {
      id: 'prop-1',
      title: 'Pembangunan Kanopi Parkir Jamaah',
      slug: 'pembangunan-kanopi-parkir-jamaah',
      summary: 'Pemasangan kanopi pelindung panas dan hujan untuk kendaraan jamaah.',
      description: 'Detail pengadaan rangka baja ringan dan atap spandek...',
      coverImage: null,
      filePdf: '/uploads/kanopi.pdf',
      filePdfSize: '1.8 MB',
      targetAmount: 35000000 as any,
      collectedManual: 15000000 as any,
      categoryId: null,
      programId: null,
      startDate: null,
      endDate: null,
      status: 'DIBUKA',
      isFeatured: true,
      picName: 'Pak Wahyu',
      picPhone: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      funding: {
        targetAmount: 35000000,
        collectedManual: 15000000,
        onlineDonationsTotal: 0,
        collectedTotal: 15000000,
        percentage: 43,
        remaining: 20000000,
        isFulfilled: false,
        onlineDonationsCount: 0,
      },
    },
  ]

  it('renders section title, proposal cards, and link to view all proposals', () => {
    render(<FeaturedProposalSection proposals={sampleFeatured} />)

    expect(screen.getByText(/peluang amal jariyah/i)).toBeInTheDocument()
    expect(screen.getByText('Pembangunan Kanopi Parkir Jamaah')).toBeInTheDocument()

    const viewAllLink = screen.getByRole('link', { name: /lihat semua proposal/i })
    expect(viewAllLink).toHaveAttribute('href', '/proposal')
  })

  it('returns null when proposals array is empty', () => {
    const { container } = render(<FeaturedProposalSection proposals={[]} />)
    expect(container.firstChild).toBeNull()
  })
})
