declare global {
  interface Window {
    __ANNUUR_QURAN_AUDIO__?: HTMLAudioElement
  }
}

/**
 * Mendapatkan satu-satunya instance HTMLAudioElement untuk pemutar Al-Qur'an (Singleton).
 * Menjamin secara mutlak tidak pernah terjadi double audio di browser
 * karena seluruh pemutaran (header, ayat, navigasi prev/next surah) menggunakan 1 audio fisik yang sama.
 */
export function getSingletonQuranAudio(): HTMLAudioElement | null {
  if (typeof window === 'undefined') return null

  if (!window.__ANNUUR_QURAN_AUDIO__) {
    const audio = new Audio()
    audio.preload = 'auto'
    window.__ANNUUR_QURAN_AUDIO__ = audio
  }

  return window.__ANNUUR_QURAN_AUDIO__
}

/**
 * Hentikan audio pemutar Al-Qur'an dan pastikan seluruh objek audio dihentikan bersih.
 */
export function stopSingletonQuranAudio(): void {
  if (typeof window === 'undefined') return

  if (window.__ANNUUR_QURAN_AUDIO__) {
    const audio = window.__ANNUUR_QURAN_AUDIO__
    audio.oncanplay = null
    audio.onplaying = null
    audio.onpause = null
    audio.onended = null
    audio.onerror = null
    audio.ontimeupdate = null
    audio.onloadedmetadata = null
    try {
      audio.pause()
      audio.currentTime = 0
      audio.src = ''
    } catch {}
  }

  try {
    document.querySelectorAll('audio').forEach((el) => {
      try {
        el.pause()
        el.currentTime = 0
        el.src = ''
      } catch {}
    })
  } catch {}
}
