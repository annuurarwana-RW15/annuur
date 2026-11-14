import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { FeaturedProgramSection } from '@/components/public/FeaturedProgramSection'
import type { ProgramWithRelations } from '@/components/public/ProgramCard'

describe('FeaturedProgramSection', () => {
  it('merender null jika daftar program kosong', () => {
    const { container } = render(<FeaturedProgramSection programs={[]} />)
    expect(container.firstChild).toBeNull()
  })

  it('merender judul section, deskripsi, dan kartu program', () => {
    const samplePrograms: ProgramWithRelations[] = [
      {
        id: 'prog-1',
        title: 'Renovasi Kanopi dan Area Wudhu Jamaah',
        slug: 'renovasi-kanopi-dan-area-wudhu-jamaah',
        description: 'Peremajaan kanopi parkir dan perluasan sarana tempat wudhu jamaah pria dan wanita.',
        periodType: 'PENDEK',
        category: 'RIAYAH',
        status: 'BERJALAN',
        progress: 65,
        targetDate: new Date('2026-12-31'),
        budgetEstimate: 45000000,
        picName: 'H. Bambang',
        picPhone: '08123456789',
        order: 1,
        isFeatured: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        proposals: [
          {
            id: 'prop-1',
            title: 'Proposal Kanopi',
            slug: 'proposal-kanopi',
            status: 'DIBUKA',
            targetAmount: 45000000,
          },
        ],
      },
    ]

    render(<FeaturedProgramSection programs={samplePrograms} />)

    expect(screen.getByText('Program Kerja Strategis')).toBeInTheDocument()
    expect(screen.getByText('Renovasi Kanopi dan Area Wudhu Jamaah')).toBeInTheDocument()
    expect(screen.getByText('65%')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /lihat semua program kerja/i })).toHaveAttribute(
      'href',
      '/program',
    )
  })

  it('merender null jika section.isVisible bernilai false', () => {
    const samplePrograms: ProgramWithRelations[] = [
      {
        id: 'prog-1',
        title: 'Program 1',
        slug: 'program-1',
        description: 'Deskripsi 1',
        periodType: 'PENDEK',
        category: 'IMARAH',
        status: 'BERJALAN',
        progress: 50,
        targetDate: null,
        budgetEstimate: null,
        picName: null,
        picPhone: null,
        order: 1,
        isFeatured: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]

    const { container } = render(
      <FeaturedProgramSection
        programs={samplePrograms}
        section={{
          id: 'sec-1',
          key: 'program',
          title: 'Program Kerja',
          order: 1,
          isVisible: false,
          content: {},
          updatedAt: new Date(),
        }}
      />,
    )
    expect(container.firstChild).toBeNull()
  })

  it('menggunakan judul dan subjudul kustom dari section DB', () => {
    const samplePrograms: ProgramWithRelations[] = [
      {
        id: 'prog-1',
        title: 'Program 1',
        slug: 'program-1',
        description: 'Deskripsi 1',
        periodType: 'PENDEK',
        category: 'IMARAH',
        status: 'BERJALAN',
        progress: 50,
        targetDate: null,
        budgetEstimate: null,
        picName: null,
        picPhone: null,
        order: 1,
        isFeatured: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]

    render(
      <FeaturedProgramSection
        programs={samplePrograms}
        section={{
          id: 'sec-1',
          key: 'program',
          title: 'Agenda Unggulan DKM',
          order: 1,
          isVisible: true,
          content: {
            subjudul: 'Visi Bersama',
            text: 'Deskripsi pengantar kustom dari admin.',
          },
          updatedAt: new Date(),
        }}
      />,
    )

    expect(screen.getByText('Agenda Unggulan DKM')).toBeInTheDocument()
    expect(screen.getByText('Visi Bersama')).toBeInTheDocument()
    expect(screen.getByText('Deskripsi pengantar kustom dari admin.')).toBeInTheDocument()
  })
})

