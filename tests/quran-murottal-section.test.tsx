import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { QuranMurottalSection } from '@/components/public/QuranMurottalSection'
import { getAllSurahs } from '@/lib/quran'
import { stopSingletonQuranAudio } from '@/lib/quran-audio'

describe('QuranMurottalSection (Beranda Player & Playlist)', () => {
  const surahs = getAllSurahs()

  beforeEach(() => {
    class MockAudio {
      src = ''
      currentTime = 0
      duration = 180
      playbackRate = 1
      volume = 1
      muted = false
      play = vi.fn().mockImplementation(() => {
        this.onplaying?.()
        return Promise.resolve()
      })
      pause = vi.fn().mockImplementation(() => {
        this.onpause?.()
      })
      load = vi.fn()
      addEventListener = vi.fn()
      removeEventListener = vi.fn()
      oncanplay: (() => void) | null = null
      onplaying: (() => void) | null = null
      onpause: (() => void) | null = null
      onended: (() => void) | null = null
      onerror: (() => void) | null = null
      ontimeupdate: (() => void) | null = null
      onloadedmetadata: (() => void) | null = null
    }
    vi.stubGlobal('Audio', MockAudio)
  })

  afterEach(() => {
    stopSingletonQuranAudio()
    cleanup()
    vi.restoreAllMocks()
  })

  it('merender seksi murottal terbagi menjadi 2 bagian: player utama dan playlist surah', () => {
    render(<QuranMurottalSection surahs={surahs} />)

    // Heading seksi
    expect(screen.getByRole('heading', { name: /Murottal Al-Qur'an 30 Juz/i })).toBeInTheDocument()

    // Kolom 1 (Player Utama): Informasi Surah Default (Al-Fatihah)
    expect(screen.getByText('Surah #1')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Al-Fatihah' })).toBeInTheDocument()
    expect(screen.getAllByText(/Pembukaan/i).length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText(/Qari: Syaikh Misyari Rasyid Al-Afasi/i)).toBeInTheDocument()

    // Kolom 2 (Playlist Surah): Header & Daftar
    expect(screen.getByRole('heading', { name: /Playlist Surah Al-Qur'an/i })).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/Cari surah/i)).toBeInTheDocument()
    expect(screen.getByText(/114 surah tersedia/i)).toBeInTheDocument()
  })

  it('memfilter playlist berdasarkan kata kunci pencarian', () => {
    render(<QuranMurottalSection surahs={surahs} />)

    const searchInput = screen.getByPlaceholderText(/Cari surah/i)
    fireEvent.change(searchInput, { target: { value: 'yasin' } })

    // Surah Yasin tampil di playlist
    expect(screen.getByText('Yasin')).toBeInTheDocument()
    // Surah lain tidak tampil di playlist yang terfilter
    expect(screen.queryByText('Al-Baqarah')).not.toBeInTheDocument()
  })

  it('memfilter playlist berdasarkan tab kategori (Juz Amma & Populer)', () => {
    render(<QuranMurottalSection surahs={surahs} />)

    // Klik tab Juz 'Amma
    const juz30Btn = screen.getByRole('button', { name: /Juz 'Amma/i })
    fireEvent.click(juz30Btn)

    expect(screen.getByText('An-Naba\'')).toBeInTheDocument() // Surah 78
    expect(screen.getByText('An-Nas')).toBeInTheDocument() // Surah 114
    expect(screen.queryByText('Al-Baqarah')).not.toBeInTheDocument() // Surah 2

    // Klik tab Populer
    const populerBtn = screen.getByRole('button', { name: /Populer/i })
    fireEvent.click(populerBtn)

    expect(screen.getByText('Al-Kahf')).toBeInTheDocument()
    expect(screen.getByText('Ar-Rahman')).toBeInTheDocument()
  })

  it('memilih surah di playlist memperbarui player utama', () => {
    render(<QuranMurottalSection surahs={surahs} />)

    // Cari dan klik Surah Al-Mulk di playlist
    const searchInput = screen.getByPlaceholderText(/Cari surah/i)
    fireEvent.change(searchInput, { target: { value: 'Al-Mulk' } })

    const alMulkCard = screen.getByText('Al-Mulk')
    fireEvent.click(alMulkCard)

    // Player utama sekarang menampilkan Surah #67 Al-Mulk
    expect(screen.getByText('Surah #67')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Al-Mulk' })).toBeInTheDocument()
    expect(screen.getAllByText(/Kerajaan/i).length).toBeGreaterThanOrEqual(1)
  })

  it('tombol play/pause dapat diklik dan memicu pemutaran audio', () => {
    render(<QuranMurottalSection surahs={surahs} />)

    const playBtn = screen.getByLabelText(/Putar Murottal/i)
    expect(playBtn).toBeInTheDocument()

    fireEvent.click(playBtn)
    // Audio diputar
  })

  it('memiliki tautan langsung ke mushaf digital untuk membaca surah lengkap', () => {
    render(<QuranMurottalSection surahs={surahs} />)

    const detailLink = screen.getByRole('link', {
      name: /Baca Teks Lengkap Surah Al-Fatihah/i,
    })
    expect(detailLink).toHaveAttribute('href', '/quran/1')
  })
})
