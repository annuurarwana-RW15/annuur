import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { QuranReaderClient } from '@/app/(public)/quran/[nomor]/QuranReaderClient'
import sampleSurah1 from '@/lib/quran-sample.json'
import type { SurahDetail } from '@/lib/quran'

describe('QuranReaderClient', () => {
  afterEach(cleanup)
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
})

