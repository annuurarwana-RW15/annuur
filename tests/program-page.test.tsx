import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { ProgramCard, type ProgramWithRelations } from '@/components/public/ProgramCard'
import { ProgramListClient } from '@/components/public/ProgramListClient'

beforeEach(() => {
  cleanup()
})

describe('ProgramCard Component', () => {
  const sampleProgram: ProgramWithRelations = {
    id: 'p1',
    title: 'Pengadaan Karpet Masjid',
    slug: 'pengadaan-karpet-masjid',
    description: 'Penggantian karpet shalat ruang utama',
    periodType: 'PENDEK',
    category: 'RIAYAH',
    status: 'BERJALAN',
    progress: 65,
    targetDate: new Date('2026-12-31'),
    budgetEstimate: 50000000,
    picName: 'H. Ruslan',
    picPhone: '081234567890',
    order: 1,
    isFeatured: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    proposals: [
      {
        id: 'prop-1',
        title: 'Proposal Karpet',
        slug: 'proposal-karpet',
        status: 'DIBUKA',
        targetAmount: 50000000,
      },
    ],
  }

  it('renders program title, progress, category, and PIC details', () => {
    render(<ProgramCard program={sampleProgram} />)

    expect(screen.getByText('Pengadaan Karpet Masjid')).toBeInTheDocument()
    expect(screen.getByText('65%')).toBeInTheDocument()
    expect(screen.getByText(/riayah/i)).toBeInTheDocument()
    expect(screen.getByText(/jangka pendek/i)).toBeInTheDocument()
    expect(screen.getByText('H. Ruslan')).toBeInTheDocument()
  })

  it('renders link to proposal when available', () => {
    render(<ProgramCard program={sampleProgram} />)

    const link = screen.getByRole('link', { name: /proposal terkait/i })
    expect(link).toHaveAttribute('href', '/proposal/proposal-karpet')
  })
})

describe('ProgramListClient Filter', () => {
  const samplePrograms: ProgramWithRelations[] = [
    {
      id: 'p1',
      title: 'Kajian Rutin Subuh',
      slug: 'kajian-rutin-subuh',
      description: 'Kajian kitab hadits setiap ahad subuh',
      periodType: 'PENDEK',
      category: 'IMARAH',
      status: 'BERJALAN',
      progress: 80,
      targetDate: null,
      budgetEstimate: null,
      picName: 'Ust. Zulkifli',
      picPhone: null,
      order: 1,
      isFeatured: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      proposals: [],
    },
    {
      id: 'p2',
      title: 'Pembangunan Menara Masjid',
      slug: 'pembangunan-menara-masjid',
      description: 'Konstruksi fisik menara setinggi 20m',
      periodType: 'PANJANG',
      category: 'RIAYAH',
      status: 'DIRENCANAKAN',
      progress: 10,
      targetDate: null,
      budgetEstimate: null,
      picName: 'Ir. Hendra',
      picPhone: null,
      order: 2,
      isFeatured: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      proposals: [],
    },
  ]

  it('filters programs by period type when tab clicked', () => {
    render(<ProgramListClient initialPrograms={samplePrograms} />)

    expect(screen.getByText('Kajian Rutin Subuh')).toBeInTheDocument()
    expect(screen.getByText('Pembangunan Menara Masjid')).toBeInTheDocument()

    // Klik tab Jangka Panjang
    const panjangTab = screen.getByRole('button', { name: /jangka panjang/i })
    fireEvent.click(panjangTab)

    expect(screen.queryByText('Kajian Rutin Subuh')).not.toBeInTheDocument()
    expect(screen.getByText('Pembangunan Menara Masjid')).toBeInTheDocument()
  })

  it('filters programs by search input', () => {
    render(<ProgramListClient initialPrograms={samplePrograms} />)

    const searchInput = screen.getByPlaceholderText(/cari program/i)
    fireEvent.change(searchInput, { target: { value: 'Kajian' } })

    expect(screen.getByText('Kajian Rutin Subuh')).toBeInTheDocument()
    expect(screen.queryByText('Pembangunan Menara Masjid')).not.toBeInTheDocument()
  })
})
