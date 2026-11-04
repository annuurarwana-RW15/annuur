import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { QuranIndexClient } from '@/app/(public)/quran/QuranIndexClient'
import { getAllSurahs } from '@/lib/quran'

describe('QuranIndexClient', () => {
  afterEach(cleanup)
  const surahs = getAllSurahs()

  it('merender daftar surah dan kotak pencarian', () => {
    render(<QuranIndexClient surahs={surahs} />)

    expect(screen.getByPlaceholderText(/Cari nama surah, nomor, atau arti/i)).toBeInTheDocument()
    expect(screen.getByText('Al-Fatihah')).toBeInTheDocument()
    expect(screen.getByText('Al-Baqarah')).toBeInTheDocument()
    expect(screen.getByText('An-Nas')).toBeInTheDocument()
  })

  it('memfilter surah saat pengguna mengetik kata kunci pencarian', () => {
    render(<QuranIndexClient surahs={surahs} />)

    const searchInput = screen.getByPlaceholderText(/Cari nama surah, nomor, atau arti/i)
    fireEvent.change(searchInput, { target: { value: 'yasin' } })

    expect(screen.getByText('Yasin')).toBeInTheDocument()
    expect(screen.queryByText('Al-Baqarah')).not.toBeInTheDocument()
  })

  it('memfilter berdasarkan kategori Makkiyah dan Madaniyah', () => {
    render(<QuranIndexClient surahs={surahs} />)

    const madaniyahBtn = screen.getByRole('button', { name: /^Madaniyah$/i })
    fireEvent.click(madaniyahBtn)

    expect(screen.getByText('Al-Baqarah')).toBeInTheDocument() // Madaniyah
    expect(screen.queryByText('Al-Fatihah')).not.toBeInTheDocument() // Mekah
  })
})

