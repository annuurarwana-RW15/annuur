import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { QuranReaderClient } from '@/app/(public)/quran/[nomor]/QuranReaderClient'
import sampleSurah1 from '@/lib/quran-sample.json'
import type { SurahDetail } from '@/lib/quran'
import { stopSingletonQuranAudio } from '@/lib/quran-audio'

const pushMock = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: pushMock,
  }),
}))

describe('QuranReaderClient', () => {
  beforeEach(() => {
    class MockAudio {
      src = ''
      currentTime = 0
      duration = 100
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

    // Mock scrollIntoView
    window.HTMLElement.prototype.scrollIntoView = vi.fn()
    pushMock.mockClear()
  })

  afterEach(() => {
    stopSingletonQuranAudio()
    cleanup()
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
    delete (window as unknown as { __ANNUUR_QURAN_AUDIO__?: HTMLAudioElement }).__ANNUUR_QURAN_AUDIO__
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

    // Klik tombol daftar surah (cegah JSDOM document navigation)
    const daftarSurahLink = screen.getByRole('link', { name: /← Daftar Surah/i })
    daftarSurahLink.onclick = (e) => e.preventDefault()
    fireEvent.click(daftarSurahLink)

    // Mini player harus hilang
    expect(screen.queryByLabelText(/Pemutar Murottal Audio/i)).not.toBeInTheDocument()
  })

  it('tombol Next dan Prev pada player ayat berpindah ayat dan memicu scroll', async () => {
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

    // Tunggu scroll dipanggil
    await new Promise((r) => setTimeout(r, 100))
    expect(window.HTMLElement.prototype.scrollIntoView).toHaveBeenCalled()

    // Cari tombol Prev
    const prevBtn = screen.getByTitle(/Ayat Sebelumnya/i)
    expect(prevBtn).toBeInTheDocument()
    expect(prevBtn).not.toBeDisabled()

    // Klik Prev -> kembali ke Ayat 1
    fireEvent.click(prevBtn)
    expect(screen.getByText(/QS. Al-Fatihah : Ayat 1/i)).toBeInTheDocument()
    await new Promise((r) => setTimeout(r, 100))
  })

  it('tombol Next pada player full surah memicu navigasi ke surah berikutnya dengan autoplay=full', () => {
    // Al-Fatihah memiliki suratSelanjutnya (Al-Baqarah nomor 2)
    const surahWithNext: SurahDetail = {
      ...surah,
      suratSelanjutnya: {
        nomor: 2,
        nama: 'البقرة',
        namaLatin: 'Al-Baqarah',
        jumlahAyat: 286,
      },
    }

    render(<QuranReaderClient surah={surahWithNext} />)

    // Putar full surah
    const playFullBtn = screen.getByRole('button', { name: /Putar Murottal Surah/i })
    fireEvent.click(playFullBtn)

    // Klik tombol Next pada player
    const nextBtn = screen.getByTitle(/Surah Selanjutnya/i)
    fireEvent.click(nextBtn)

    expect(pushMock).toHaveBeenCalledWith('/quran/2?autoplay=full')
  })

  it('memulai pemutaran audio otomatis jika dibuka dengan initialAutoplay="full"', () => {
    render(<QuranReaderClient surah={surah} initialAutoplay="full" />)

    // Player langsung muncul dan tidak hide
    expect(screen.getByLabelText(/Pemutar Murottal Audio/i)).toBeInTheDocument()
    expect(screen.getByText(/Surah Al-Fatihah \(Lengkap\)/i)).toBeInTheDocument()
  })

  it('dapat mengaktifkan, mengatur kecepatan, dan mematikan toggle auto scroll membaca', () => {
    render(<QuranReaderClient surah={surah} />)

    // Awalnya status Auto Scroll OFF
    const autoScrollBtn = screen.getByRole('button', { name: /Auto Scroll: OFF/i })
    expect(autoScrollBtn).toBeInTheDocument()

    // Aktifkan auto scroll
    fireEvent.click(autoScrollBtn)

    // Muncul status aktif dan widget kontrol kecepatan mengambang
    expect(screen.getByRole('button', { name: /Auto Scroll: 1x/i })).toBeInTheDocument()
    const floatingController = screen.getByLabelText(/Kontrol Kecepatan Auto Scroll/i)
    expect(floatingController).toBeInTheDocument()

    // Ubah kecepatan ke 2x
    const speed2xBtns = screen.getAllByRole('button', { name: '2x' })
    fireEvent.click(speed2xBtns[0])
    expect(screen.getByRole('button', { name: /Auto Scroll: 2x/i })).toBeInTheDocument()

    // Matikan auto scroll via tombol OFF
    const offBtns = screen.getAllByRole('button', { name: /Matikan Auto Scroll/i })
    fireEvent.click(offBtns[0])

    // Kembali ke status OFF dan controller mengambang hilang
    expect(screen.getByRole('button', { name: /Auto Scroll: OFF/i })).toBeInTheDocument()
    expect(screen.queryByLabelText(/Kontrol Kecepatan Auto Scroll/i)).not.toBeInTheDocument()
  })

  it('memberi fill colour gradient dan memicu auto-scroll pada ayat saat murottal dimainkan', async () => {
    render(<QuranReaderClient surah={surah} />)

    // Putar murottal ayat 1
    const audioAyatBtns = screen.getAllByTitle(/Dengarkan Murottal Ayat/i)
    fireEvent.click(audioAyatBtns[0])

    // Kartu ayat 1 harus memiliki fill color gradient dan badge "Murottal Sedang Membaca"
    const ayat1Card = document.getElementById('ayat-1')
    expect(ayat1Card).toBeInTheDocument()
    expect(ayat1Card?.className).toContain('bg-gradient-to-r')
    expect(ayat1Card?.className).toContain('border-emas')
    expect(screen.getByText(/Murottal Sedang Membaca/i)).toBeInTheDocument()

    // Memicu scrollIntoView
    await new Promise((r) => setTimeout(r, 100))
    expect(window.HTMLElement.prototype.scrollIntoView).toHaveBeenCalled()
  })

  it('dapat mengatur toggle auto scroll murottal dari pemutar audio', () => {
    render(<QuranReaderClient surah={surah} />)

    // Putar murottal ayat 1
    const audioAyatBtns = screen.getAllByTitle(/Dengarkan Murottal Ayat/i)
    fireEvent.click(audioAyatBtns[0])

    // Cari tombol auto scroll di dalam pemutar audio
    const toggleScrollMurottalBtn = screen.getByRole('button', {
      name: /Toggle Auto Scroll Murottal/i,
    })
    expect(toggleScrollMurottalBtn).toBeInTheDocument()
    expect(toggleScrollMurottalBtn).toHaveTextContent(/Scroll: ON/i)

    // Klik untuk mematikan
    fireEvent.click(toggleScrollMurottalBtn)
    expect(toggleScrollMurottalBtn).toHaveTextContent(/Scroll: OFF/i)

    // Klik untuk mengaktifkan kembali
    fireEvent.click(toggleScrollMurottalBtn)
    expect(toggleScrollMurottalBtn).toHaveTextContent(/Scroll: ON/i)
  })

  it('tombol "Putar Sinkron Tiap Ayat" di header memulai mode continuous ayat 1', () => {
    render(<QuranReaderClient surah={surah} />)

    const syncAyatBtn = screen.getByRole('button', { name: /Putar Sinkron Tiap Ayat/i })
    expect(syncAyatBtn).toBeInTheDocument()

    fireEvent.click(syncAyatBtn)

    // Player aktif pada QS. Al-Fatihah : Ayat 1
    expect(screen.getByText(/QS. Al-Fatihah : Ayat 1/i)).toBeInTheDocument()
    expect(screen.getByText(/Murottal Sedang Membaca/i)).toBeInTheDocument()
  })

  it('dapat mengatur konfigurasi scroll murottal antara Otomatis dan Manual dari toolbar dan header', () => {
    render(<QuranReaderClient surah={surah} />)

    // Tombol di toolbar sticky
    const toolbarScrollBtn = screen.getByRole('button', { name: /Murottal: Auto Scroll/i })
    expect(toolbarScrollBtn).toBeInTheDocument()

    // Klik untuk beralih ke Manual
    fireEvent.click(toolbarScrollBtn)
    expect(screen.getByRole('button', { name: /Murottal: Manual/i })).toBeInTheDocument()

    // Tombol di header surah via title
    const headerManualBtn = screen.getByTitle(/Manual Scroll: Layar tetap diam/i)
    expect(headerManualBtn).toBeInTheDocument()
    const headerAutoBtn = screen.getByTitle(/Auto Scroll: Layar otomatis bergeser/i)
    expect(headerAutoBtn).toBeInTheDocument()

    // Klik Auto Scroll di header
    fireEvent.click(headerAutoBtn)
    expect(screen.getByRole('button', { name: /Murottal: Auto Scroll/i })).toBeInTheDocument()
  })
})

