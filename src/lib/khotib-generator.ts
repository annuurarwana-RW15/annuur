import type { JumatRow } from '@/app/admin/(dashboard)/sections/jumat-items'

export interface GenerateKhotibOptions {
  startDate?: string // format YYYY-MM-DD
  countWeeks: number // misal 4, 8, 12, 24
  khotibList: string[]
  imamList?: string[]
}

/**
 * Mencari tanggal hari Jumat terdekat.
 * Jika `baseDate` sudah hari Jumat, mengembalikan tanggal tersebut.
 * Jika bukan, memajukan hari hingga menemukan Jumat berikutnya.
 */
export function findNextFriday(baseDate?: Date | string): Date {
  const date = baseDate
    ? typeof baseDate === 'string'
      ? new Date(`${baseDate}T00:00:00`)
      : new Date(baseDate)
    : new Date()

  // Pastikan waktu lokal dinetralkan ke jam 00:00:00
  date.setHours(0, 0, 0, 0)

  // Hari dalam JS: 0 = Minggu, 1 = Senin, ..., 5 = Jumat, 6 = Sabtu
  const day = date.getDay()
  const diff = (5 - day + 7) % 7 // selisih hari menuju Jumat

  date.setDate(date.getDate() + diff)
  return date
}

export function formatIsoDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function generateJumatSchedule(options: GenerateKhotibOptions): JumatRow[] {
  const count = Math.max(1, Math.min(52, options.countWeeks || 4))
  const khotibs = options.khotibList.map((s) => s.trim()).filter(Boolean)
  const imams = (options.imamList ?? []).map((s) => s.trim()).filter(Boolean)

  if (khotibs.length === 0) {
    throw new Error('Daftar nama khotib minimal harus ada 1 orang')
  }

  const startDate = findNextFriday(options.startDate)
  const rows: JumatRow[] = []

  const currentDate = new Date(startDate)

  for (let i = 0; i < count; i++) {
    const tanggal = formatIsoDate(currentDate)
    const khatib = khotibs[i % khotibs.length]
    // Jika daftar imam ada, rotasi. Jika tidak ada, imam disamakan dengan khotib atau kosong
    const imam = imams.length > 0 ? imams[i % imams.length] : khatib

    rows.push({
      tanggal,
      khatib,
      imam,
    })

    // Tambah 7 hari untuk Jumat berikutnya
    currentDate.setDate(currentDate.getDate() + 7)
  }

  return rows
}
