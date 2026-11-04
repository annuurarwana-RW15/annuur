import { describe, expect, it } from 'vitest'
import { getAllSurahs, getSurahDetail, getSurahMeta, POPULAR_SURAHS } from '@/lib/quran'

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
})

