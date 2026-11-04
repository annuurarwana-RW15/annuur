import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { QuranReaderClient } from '@/app/(public)/quran/[nomor]/QuranReaderClient'
import sampleSurah1 from '@/lib/quran-sample.json'
import type { SurahDetail } from '@/lib/quran'

const pushMock = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: pushMock,
  }),
}))

describe('QuranReaderClient', () => {
  beforeEach(() => {
    // Mock HTMLMediaElement untuk Audio di JSDOM
    vi.spyOn(window.HTMLMediaElement.prototype, 'play').mockImplementation(() => Promise.resolve())
    vi.spyOn(window.HTMLMediaElement.prototype, 'pause').mockImplementation(() => {})
    vi.spyOn(window.HTMLMediaElement.prototype, 'load').mockImplementation(() => {})
    // Mock scrollIntoView
    window.HTMLElement.prototype.scrollIntoView = vi.fn()
    pushMock.mockClear()
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  const surah = sampleSurah1 as unknown as SurahDetail

  it('merender judul surah, teks Arab, transliterasi Latin, dan terjemahan', () => {
    render(<QuranReaderClient surah={surah} />)

    expect(screen.getByText('Al-Fatihah')).toBeInTheDocument()
    expect(screen.getByText('الفاتحة')).toBeInTheDocument()
    expect(screen.getByText(/Dengan nama Allah Yang Maha Pengasih lagi Maha Penyayang/i)).toBeInTheDocument()
    expect(screen.getByText(/Bismillāhir-raḥmānir-raḥīm/i)).toBeInTheDocument()
  })

  it('dapat menyembunyikan dan menampilkan transliterasi Latin', () => {
    render(<QuranReaderClient surah={surah} />)

    const latinToggle = screen.getByRole('button', { name: /Latin/i })
    expect(screen.getByText(/Bismillāhir-raḥmānir-raḥīm/i)).toBeInTheDocument()

    // Sembunyikan Latin
    fireEvent.click(latinToggle)
    expect(screen.queryByText(/Bismillāhir-raḥmānir-raḥīm/i)).not.toBeInTheDocument()

    // Tampilkan kembali
    fireEvent.click(latinToggle)
    expect(screen.getByText(/Bismillāhir-raḥmānir-raḥīm/i)).toBeInTheDocument()
  })

  it('dapat mengubah ukuran font Arab', () => {
    render(<QuranReaderClient surah={surah} />)

    const fontBigBtn = screen.getByRole('button', { name: /A\+\+/i })
    fireEvent.click(fontBigBtn)
  })

  it('dapat memutar murottal full surah saat tombol putar diklik', () => {
    render(<QuranReaderClient surah={surah} />)

    const playFullBtn = screen.getByRole('button', { name: /Putar Murottal Surah/i })
    expect(playFullBtn).toBeInTheDocument()

    fireEvent.click(playFullBtn)

    // Memunculkan mini player mengambang
    const miniPlayer = screen.getByLabelText(/Pemutar Murottal Audio/i)
    expect(miniPlayer).toBeInTheDocument()
    expect(screen.getByText(/Surah Al-Fatihah \(Lengkap\)/i)).toBeInTheDocument()
  })

  it('dapat memutar audio per ayat dan menandai ayat terakhir dibaca', () => {
    render(<QuranReaderClient surah={surah} />)

    // Tombol audio ayat 1
    const audioAyatBtns = screen.getAllByTitle(/Dengarkan Murottal Ayat/i)
    expect(audioAyatBtns.length).toBeGreaterThan(0)
    fireEvent.click(audioAyatBtns[0])

    // Memunculkan mini player dengan judul ayat
    expect(screen.getByText(/QS. Al-Fatihah : Ayat 1/i)).toBeInTheDocument()

    // Tandai ayat 1
    const bookmarkBtns = screen.getAllByTitle(/Tandai Terakhir Dibaca/i)
    fireEvent.click(bookmarkBtns[0])
    expect(screen.getByText(/Terakhir Dibaca/i)).toBeInTheDocument()
  })

  it('menghentikan pemutar audio ketika surah berganti (rerender dengan surah baru)', () => {
    const { rerender } = render(<QuranReaderClient surah={surah} />)

    // Putar murottal
    const playFullBtn = screen.getByRole('button', { name: /Putar Murottal Surah/i })
    fireEvent.click(playFullBtn)
    expect(screen.getByLabelText(/Pemutar Murottal Audio/i)).toBeInTheDocument()

    // Simulasi ganti surah ke Al-Baqarah (nomor 2)
    const surahBaqarah: SurahDetail = {
      ...surah,
      nomor: 2,
      nama: 'البقرة',
      namaLatin: 'Al-Baqarah',
      jumlahAyat: 286,
      arti: 'Sapi Betina',
    }

    rerender(<QuranReaderClient surah={surahBaqarah} />)

    // Pemutar audio harus otomatis dihentikan dan ditutup
    expect(screen.queryByLabelText(/Pemutar Murottal Audio/i)).not.toBeInTheDocument()
  })

  it('menghentikan pemutar audio ketika tautan navigasi surah diklik', () => {
    render(<QuranReaderClient surah={surah} />)

    // Putar murottal
    const playFullBtn = screen.getByRole('button', { name: /Putar Murottal Surah/i })
    fireEvent.click(playFullBtn)
    expect(screen.getByLabelText(/Pemutar Murottal Audio/i)).toBeInTheDocument()

    // Klik tombol daftar surah
    const daftarSurahLink = screen.getByRole('link', { name: /← Daftar Surah/i })
    fireEvent.click(daftarSurahLink)

    // Mini player harus hilang
    expect(screen.queryByLabelText(/Pemutar Murottal Audio/i)).not.toBeInTheDocument()
  })

  it('tombol Next dan Prev pada player ayat berpindah ayat dan memicu scroll', () => {
    vi.useFakeTimers()
    render(<QuranReaderClient surah={surah} />)

    // Putar ayat 1
    const audioAyatBtns = screen.getAllByTitle(/Dengarkan Murottal Ayat/i)
    fireEvent.click(audioAyatBtns[0])

    expect(screen.getByText(/QS. Al-Fatihah : Ayat 1/i)).toBeInTheDocument()

    // Cari tombol Next
    const nextBtn = screen.getByTitle(/Ayat Selanjutnya/i)
    expect(nextBtn).toBeInTheDocument()
    expect(nextBtn).not.toBeDisabled()

    // Klik Next -> beralih ke Ayat 2
    fireEvent.click(nextBtn)
    expect(screen.getByText(/QS. Al-Fatihah : Ayat 2/i)).toBeInTheDocument()

    // Timer scroll dijalankan
    vi.runAllTimers()
    expect(window.HTMLElement.prototype.scrollIntoView).toHaveBeenCalled()

    // Cari tombol Prev
    const prevBtn = screen.getByTitle(/Ayat Sebelumnya/i)
    expect(prevBtn).toBeInTheDocument()
    expect(prevBtn).not.toBeDisabled()

    // Klik Prev -> kembali ke Ayat 1
    fireEvent.click(prevBtn)
    expect(screen.getByText(/QS. Al-Fatihah : Ayat 1/i)).toBeInTheDocument()

    vi.runAllTimers()
    vi.useRealTimers()
  })
})

