import surahsData from './quran-surahs.json'
import sampleSurah1 from './quran-sample.json'

export interface SurahMeta {
  nomor: number
  nama: string
  namaLatin: string
  jumlahAyat: number
  tempatTurun: string
  arti: string
  audioFull: string
}

export interface AyatItem {
  nomorAyat: number
  teksArab: string
  teksLatin: string
  teksIndonesia: string
  audio: Record<string, string>
}

export interface SurahDetail extends SurahMeta {
  deskripsi: string
  ayat: AyatItem[]
  suratSebelumnya: false | { nomor: number; nama: string; namaLatin: string; jumlahAyat: number }
  suratSelanjutnya: false | { nomor: number; nama: string; namaLatin: string; jumlahAyat: number }
}

export const POPULAR_SURAHS = [1, 18, 36, 55, 56, 67, 112, 113, 114]

export function getAllSurahs(): SurahMeta[] {
  return surahsData as SurahMeta[]
}

export function getSurahMeta(nomor: number): SurahMeta | undefined {
  return (surahsData as SurahMeta[]).find((s) => s.nomor === nomor)
}

export async function getSurahDetail(nomor: number): Promise<SurahDetail | null> {
  if (nomor < 1 || nomor > 114) return null

  try {
    const res = await fetch(`https://equran.id/api/v2/surat/${nomor}`, {
      next: { revalidate: 86400 }, // Cache 24 jam di Next.js
    })
    if (!res.ok) {
      if (nomor === 1) return sampleSurah1 as unknown as SurahDetail
      return null
    }
    const json = (await res.json()) as { code: number; data?: SurahDetail }
    if (json.code === 200 && json.data) {
      return json.data
    }
  } catch (error) {
    console.error(`[quran] Gagal mengambil surah ${nomor} dari API:`, error)
    if (nomor === 1) return sampleSurah1 as unknown as SurahDetail
  }
  return null
}

