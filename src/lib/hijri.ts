export interface HijriDayInfo {
  hDay: number
  hMonth: number
  hYear: number
  gDate: Date
  dayOfWeek: number // 0 = Ahad, 1 = Senin, ..., 6 = Sabtu
  isToday: boolean
  isJumat: boolean
  isSunnahFast: boolean
  fastType?: 'Senin' | 'Kamis' | 'Ayyamul Bidh' | 'Ramadhan' | 'Asyura' | 'Arafah'
}

export const HIJRI_MONTHS_ID = [
  'Muharram',
  'Safar',
  'Rabiul Awwal',
  'Rabiul Akhir',
  'Jumadil Awwal',
  'Jumadil Akhir',
  'Rajab',
  "Sya'ban",
  'Ramadhan',
  'Syawal',
  "Dzulqa'dah",
  'Dzulhijjah',
] as const

export interface IslamicEvent {
  day: number
  month: number // 1-12
  name: string
  description: string
}

export const ISLAMIC_EVENTS: IslamicEvent[] = [
  {
    day: 1,
    month: 1,
    name: 'Tahun Baru Islam',
    description: '1 Muharram — Awal tahun baru penanggalan Hijriah.',
  },
  {
    day: 9,
    month: 1,
    name: 'Puasa Tasu\x27a',
    description: '9 Muharram — Puasa sunnah sehari sebelum Asyura.',
  },
  {
    day: 10,
    month: 1,
    name: 'Hari Asyura',
    description: '10 Muharram — Hari bersejarah diselamatkannya Nabi Musa AS & puasa Asyura.',
  },
  {
    day: 12,
    month: 3,
    name: 'Maulid Nabi Muhammad SAW',
    description: '12 Rabiul Awwal — Kelahiran Rasulullah SAW pembawa risalah Islam.',
  },
  {
    day: 27,
    month: 7,
    name: 'Isra Mi\x27raj',
    description: '27 Rajab — Peristiwa agung diperjalankannya Nabi SAW dan perintah sholat 5 waktu.',
  },
  {
    day: 15,
    month: 8,
    name: 'Malam Nisfu Sya\x27ban',
    description: '15 Sya\x27ban — Malam penuh ampunan dan persiapan menyambut bulan suci Ramadhan.',
  },
  {
    day: 1,
    month: 9,
    name: 'Awal Puasa Ramadhan',
    description: '1 Ramadhan — Dimulainya kewajiban berpuasa satu bulan penuh bagi umat Islam.',
  },
  {
    day: 17,
    month: 9,
    name: 'Nuzulul Qur\x27an',
    description: '17 Ramadhan — Peringatan turunnya permulaan ayat-ayat suci Al-Qur\x27an.',
  },
  {
    day: 21,
    month: 9,
    name: 'Malam Lailatul Qadar (10 Malam Terakhir)',
    description: 'Malam kemuliaan yang lebih baik daripada seribu bulan.',
  },
  {
    day: 1,
    month: 10,
    name: 'Hari Raya Idul Fitri',
    description: '1 Syawal — Hari kemenangan setelah menunaikan ibadah puasa Ramadhan.',
  },
  {
    day: 1,
    month: 12,
    name: 'Awal 10 Hari Dzulhijjah',
    description: 'Hari-hari utama yang sangat dicintai Allah untuk beramal sholeh.',
  },
  {
    day: 9,
    month: 12,
    name: 'Hari Arafah & Puasa Arafah',
    description: '9 Dzulhijjah — Jamaah haji wukuf di Arafah & puasa penggugur dosa bagi yang tidak berhaji.',
  },
  {
    day: 10,
    month: 12,
    name: 'Hari Raya Idul Adha',
    description: '10 Dzulhijjah — Hari raya kurban memperingati keteladanan Nabi Ibrahim AS.',
  },
  {
    day: 11,
    month: 12,
    name: 'Hari Tasyrik ke-1',
    description: '11 Dzulhijjah — Hari makan & minum serta berdzikir, dilarang berpuasa.',
  },
  {
    day: 12,
    month: 12,
    name: 'Hari Tasyrik ke-2',
    description: '12 Dzulhijjah — Hari tasyrik (penyembelihan hewan kurban).',
  },
  {
    day: 13,
    month: 12,
    name: 'Hari Tasyrik ke-3',
    description: '13 Dzulhijjah — Hari penutup tasyrik.',
  },
]

export function getHijriParts(date: Date): { day: number; month: number; year: number } {
  try {
    const parts = new Intl.DateTimeFormat('en-US-u-ca-islamic-umalqura', {
      day: 'numeric',
      month: 'numeric',
      year: 'numeric',
    }).formatToParts(date)

    const dayStr = parts.find((p) => p.type === 'day')?.value ?? '1'
    const monthStr = parts.find((p) => p.type === 'month')?.value ?? '1'
    const yearStr = parts.find((p) => p.type === 'year')?.value ?? '1448'

    return {
      day: parseInt(dayStr, 10),
      month: parseInt(monthStr, 10),
      year: parseInt(yearStr, 10),
    }
  } catch {
    return { day: 1, month: 1, year: 1448 }
  }
}

/**
 * Format teks waktu lengkap berbahasa Indonesia (Masehi + Hijriah + Jam).
 */
export function formatFullIndonesianDateTime(now: Date): {
  dayName: string
  dateMasehi: string
  timeWib: string
  hijriText: string
} {
  const dayName = new Intl.DateTimeFormat('id-ID', { weekday: 'long' }).format(now)
  const dateMasehi = new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(now)

  const timeWib =
    now
      .toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      })
      .replace(/\./g, ':') + ' WIB'

  const { day, month, year } = getHijriParts(now)
  const monthName = HIJRI_MONTHS_ID[month - 1] || 'Jumadil Awwal'
  const hijriText = `${day} ${monthName} ${year} H`

  return { dayName, dateMasehi, timeWib, hijriText }
}

/**
 * Mengambil daftar hari untuk satu bulan Hijriah tertentu secara deterministik.
 */
export function getHijriMonthGrid(
  targetHYear: number,
  targetHMonth: number,
  today: Date = new Date(),
): HijriDayInfo[] {
  const todayH = getHijriParts(today)
  const mDiff = (targetHYear - todayH.year) * 12 + (targetHMonth - todayH.month)

  // Estimasi tanggal pertengahan bulan
  const midEst = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate() + Math.round(mDiff * 29.53),
    12,
    0,
    0,
  )

  const days: HijriDayInfo[] = []
  const start = new Date(
    midEst.getFullYear(),
    midEst.getMonth(),
    midEst.getDate() - 25,
    12,
    0,
    0,
  )

  for (let i = 0; i < 55; i++) {
    const cur = new Date(
      start.getFullYear(),
      start.getMonth(),
      start.getDate() + i,
      12,
      0,
      0,
    )
    const h = getHijriParts(cur)
    if (h.year === targetHYear && h.month === targetHMonth) {
      const dayOfWeek = cur.getDay() // 0=Ahad, 1=Senin, ..., 6=Sabtu
      const isToday =
        cur.getFullYear() === today.getFullYear() &&
        cur.getMonth() === today.getMonth() &&
        cur.getDate() === today.getDate()

      let isSunnahFast = false
      let fastType: HijriDayInfo['fastType'] = undefined

      if (h.month === 9) {
        isSunnahFast = true
        fastType = 'Ramadhan'
      } else if (h.month === 1 && h.day === 10) {
        isSunnahFast = true
        fastType = 'Asyura'
      } else if (h.month === 12 && h.day === 9) {
        isSunnahFast = true
        fastType = 'Arafah'
      } else if (h.day === 13 || h.day === 14 || h.day === 15) {
        isSunnahFast = true
        fastType = 'Ayyamul Bidh'
      } else if (dayOfWeek === 1) {
        isSunnahFast = true
        fastType = 'Senin'
      } else if (dayOfWeek === 4) {
        isSunnahFast = true
        fastType = 'Kamis'
      }

      days.push({
        hDay: h.day,
        hMonth: h.month,
        hYear: h.year,
        gDate: cur,
        dayOfWeek,
        isToday,
        isJumat: dayOfWeek === 5,
        isSunnahFast,
        fastType,
      })
    }
  }

  days.sort((a, b) => a.hDay - b.hDay)
  return days
}

