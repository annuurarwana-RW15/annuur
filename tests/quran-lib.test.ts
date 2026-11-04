import { describe, expect, it } from 'vitest'
import {
  getAllSurahs,
  getAudioFullUrl,
  getBackupAudioFullUrl,
  getAyatAudioUrl,
  getBackupAyatAudioUrl,
  getSurahDetail,
  getSurahMeta,
  POPULAR_SURAHS,
} from '@/lib/quran'

describe('quran library', () => {
  it('getAllSurahs mengembalikan seluruh 114 surah lengkap', () => {
    const surahs = getAllSurahs()
    expect(surahs).toHaveLength(114)
    expect(surahs[0].nomor).toBe(1)
    expect(surahs[0].namaLatin).toBe('Al-Fatihah')
    expect(surahs[113].nomor).toBe(114)
    expect(surahs[113].namaLatin).toBe('An-Nas')
  })

  it('getSurahMeta mencari metadata surah berdasarkan nomor', () => {
    const yasin = getSurahMeta(36)
    expect(yasin).toBeDefined()
    expect(yasin?.namaLatin).toBe('Yasin')
    expect(yasin?.jumlahAyat).toBe(83)
    expect(yasin?.tempatTurun).toBe('Mekah')

    const invalid = getSurahMeta(999)
    expect(invalid).toBeUndefined()
  })

  it('getSurahDetail mengambil detail surah dan ayat (termasuk fallback lokal Al-Fatihah)', async () => {
    const fatihah = await getSurahDetail(1)
    expect(fatihah).toBeDefined()
    expect(fatihah?.nomor).toBe(1)
    expect(fatihah?.namaLatin).toBe('Al-Fatihah')
    expect(fatihah?.ayat).toHaveLength(7)
    expect(fatihah?.ayat[0].nomorAyat).toBe(1)
    expect(fatihah?.ayat[0].teksArab).toContain('بِسْمِ اللّٰهِ الرَّحْمٰنِ الرَّحِيْمِ')
  })

  it('getSurahDetail mengembalikan null jika nomor surah di luar batas 1–114', async () => {
    expect(await getSurahDetail(0)).toBeNull()
    expect(await getSurahDetail(115)).toBeNull()
  })

  it('POPULAR_SURAHS memuat surah-surah utama yang lazim dibaca jamaah', () => {
    expect(POPULAR_SURAHS).toContain(1) // Al-Fatihah
    expect(POPULAR_SURAHS).toContain(18) // Al-Kahf
    expect(POPULAR_SURAHS).toContain(36) // Yasin
    expect(POPULAR_SURAHS).toContain(67) // Al-Mulk
  })

  it('getAudioFullUrl dan getBackupAudioFullUrl menangani string dan object dictionary audio', () => {
    // Kasus object dictionary dari API equran.id v2
    const audioObj = {
      '01': 'https://cdn.equran.id/audio-full/Abdullah-Al-Juhany/001.mp3',
      '05': 'https://cdn.equran.id/audio-full/Misyari-Rasyid-Al-Afasi/001.mp3',
    }
    const resolvedObj = getAudioFullUrl(audioObj, 1)
    expect(resolvedObj).toBe('https://cdn.equran.id/audio-full/Misyari-Rasyid-Al-Afasi/001.mp3')

    // Kasus string direct URL
    const resolvedStr = getAudioFullUrl('https://example.com/audio.mp3', 2)
    expect(resolvedStr).toBe('https://example.com/audio.mp3')

    // Kasus undefined
    const resolvedUndef = getAudioFullUrl(undefined, 36)
    expect(resolvedUndef).toBe('https://cdn.equran.id/audio-full/Misyari-Rasyid-Al-Afasi/036.mp3')

    // Cadangan backup quranicaudio.com
    expect(getBackupAudioFullUrl(1)).toContain('001.mp3')
    expect(getBackupAudioFullUrl(114)).toContain('114.mp3')
  })

  it('getAyatAudioUrl dan getBackupAyatAudioUrl menghasilkan URL ayat yang valid', () => {
    const ayatAudio = {
      '05': 'https://cdn.equran.id/audio-partial/Misyari-Rasyid-Al-Afasi/001001.mp3',
    }
    expect(getAyatAudioUrl(ayatAudio, 1, 1)).toBe(
      'https://cdn.equran.id/audio-partial/Misyari-Rasyid-Al-Afasi/001001.mp3',
    )
    expect(getBackupAyatAudioUrl(1, 1)).toContain('everyayah.com')
  })
})

