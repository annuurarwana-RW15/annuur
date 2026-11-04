import surahsData from './quran-surahs.json'
import sampleSurah1 from './quran-sample.json'

export interface SurahMeta {
  nomor: number
  nama: string
  namaLatin: string
  jumlahAyat: number
  tempatTurun: string
  arti: string
  audioFull: string | Record<string, string>
}

export interface AyatItem {
  nomorAyat: number
  teksArab: string
  teksLatin: string
  teksIndonesia: string
  audio: Record<string, string>
}

export interface SurahDetail {
  nomor: number
  nama: string
  namaLatin: string
  jumlahAyat: number
  tempatTurun: string
  arti: string
  deskripsi: string
  audioFull?: string | Record<string, string>
  ayat: AyatItem[]
  suratSebelumnya: false | { nomor: number; nama: string; namaLatin: string; jumlahAyat: number }
  suratSelanjutnya: false | { nomor: number; nama: string; namaLatin: string; jumlahAyat: number }
}

export const POPULAR_SURAHS = [1, 18, 36, 55, 56, 67, 112, 113, 114]

/**
 * Mendapatkan URL audio murottal lengkap satu surah (prioritas Syaikh Misyari Rasyid Al-Afasi '05')
 */
export function getAudioFullUrl(
  audioFull: string | Record<string, string> | undefined,
  nomorSurah: number,
): string {
  if (typeof audioFull === 'string' && audioFull.startsWith('http')) {
    return audioFull
  }
  if (audioFull && typeof audioFull === 'object') {
    const qari05 = audioFull['05']
    if (typeof qari05 === 'string' && qari05.startsWith('http')) {
      return qari05
    }
    const first = Object.values(audioFull).find(
      (url) => typeof url === 'string' && url.startsWith('http'),
    )
    if (first) return first
  }

  const padded = String(nomorSurah).padStart(3, '0')
  return `https://cdn.equran.id/audio-full/Misyari-Rasyid-Al-Afasi/${padded}.mp3`
}

/**
 * URL cadangan audio full surah dari quranicaudio.com (CORS open '*')
 */
export function getBackupAudioFullUrl(nomorSurah: number): string {
  const padded = String(nomorSurah).padStart(3, '0')
  return `https://download.quranicaudio.com/quran/mishaari_raashid_al_3afaasee/${padded}.mp3`
}

/**
 * Mendapatkan URL audio murottal per ayat (prioritas Syaikh Misyari Rasyid Al-Afasi '05')
 */
export function getAyatAudioUrl(
  audio: Record<string, string> | undefined,
  nomorSurah: number,
  nomorAyat: number,
): string {
  if (audio && typeof audio === 'object') {
    const qari05 = audio['05']
    if (typeof qari05 === 'string' && qari05.startsWith('http')) {
      return qari05
    }
    const first = Object.values(audio).find(
      (url) => typeof url === 'string' && url.startsWith('http'),
    )
    if (first) return first
  }

  const sPadded = String(nomorSurah).padStart(3, '0')
  const aPadded = String(nomorAyat).padStart(3, '0')
  return `https://cdn.equran.id/audio-partial/Misyari-Rasyid-Al-Afasi/${sPadded}${aPadded}.mp3`
}

/**
 * URL cadangan audio per ayat dari everyayah.com (CORS open '*')
 */
export function getBackupAyatAudioUrl(nomorSurah: number, nomorAyat: number): string {
  const sPadded = String(nomorSurah).padStart(3, '0')
  const aPadded = String(nomorAyat).padStart(3, '0')
  return `https://everyayah.com/data/Alafasy_128kbps/${sPadded}${aPadded}.mp3`
}

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


