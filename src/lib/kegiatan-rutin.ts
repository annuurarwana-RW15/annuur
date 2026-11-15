export type HariKegiatan =
  | 'SENIN'
  | 'SELASA'
  | 'RABU'
  | 'KAMIS'
  | 'JUMAT'
  | 'SABTU'
  | 'AHAD'
  | 'HARIAN'
  | 'BULANAN'

export type KategoriKegiatanRutin =
  | 'KAJIAN_UMUM'
  | 'MUSLIMAH'
  | 'ANAK_TPQ'
  | 'REMAJA'
  | 'SOSIAL'

export interface KegiatanRutinItem {
  id: string
  nama: string
  hari: HariKegiatan
  waktu: string
  pemateri: string
  kategori: KategoriKegiatanRutin
  lokasi: string
  deskripsi: string
  urutan: number
  isActive: boolean
}

export const HARI_LABELS: Record<HariKegiatan, string> = {
  SENIN: 'Senin',
  SELASA: 'Selasa',
  RABU: 'Rabu',
  KAMIS: 'Kamis',
  JUMAT: 'Jumat',
  SABTU: 'Sabtu',
  AHAD: 'Ahad',
  HARIAN: 'Setiap Hari',
  BULANAN: 'Bulanan',
}

export const KATEGORI_KEGIATAN_LABELS: Record<KategoriKegiatanRutin, string> = {
  KAJIAN_UMUM: 'Kajian Umum',
  MUSLIMAH: 'Majelis Muslimah',
  ANAK_TPQ: 'TPQ & Anak-Anak',
  REMAJA: 'Remaja Masjid (RISMA)',
  SOSIAL: 'Sosial & Kemasyarakatan',
}

export const DEFAULT_KEGIATAN_RUTIN: KegiatanRutinItem[] = [
  {
    id: 'kr-01',
    nama: 'Kajian Subuh Ahad & Sarapan Bersama',
    hari: 'AHAD',
    waktu: "Ba'da Subuh - 06:30 WIB",
    pemateri: 'Ust. Abdul Ghofur, Lc.',
    kategori: 'KAJIAN_UMUM',
    lokasi: 'Ruang Sholat Utama',
    deskripsi: 'Tadabbur Al-Qur\'an dan kajian kitab Riyadhus Shalihin dilanjutkan sarapan bersama jamaah.',
    urutan: 1,
    isActive: true,
  },
  {
    id: 'kr-02',
    nama: 'Majelis Taklim Muslimah & Ibu-Ibu',
    hari: 'SELASA',
    waktu: '09:00 - 11:00 WIB',
    pemateri: 'Ustadzah Hj. Fatimah Azzahra',
    kategori: 'MUSLIMAH',
    lokasi: 'Ruang Sholat Utama',
    deskripsi: 'Fiqih wanita, parenting islami, dan tadarus Al-Qur\'an bersama ibu-ibu warga RW 15.',
    urutan: 2,
    isActive: true,
  },
  {
    id: 'kr-03',
    nama: 'Bimbingan Tahsin & Tahfidz Al-Qur\'an (TPQ)',
    hari: 'HARIAN',
    waktu: 'Senin s/d Kamis, 16:00 - 17:30 WIB',
    pemateri: 'Tim Asatidz TPQ An-Nuur',
    kategori: 'ANAK_TPQ',
    lokasi: 'Aula & Serambi TPQ Masjid',
    deskripsi: 'Pembelajaran makharijul huruf, tajwid praktis, dan hafalan juz 30 untuk anak usia 5-15 tahun.',
    urutan: 3,
    isActive: true,
  },
  {
    id: 'kr-04',
    nama: 'Pengajian Malam Jumat (Yasin & Thaharah)',
    hari: 'KAMIS',
    waktu: "Ba'da Maghrib - Isya",
    pemateri: 'Ust. M. Ridwan, S.Ag.',
    kategori: 'KAJIAN_UMUM',
    lokasi: 'Ruang Sholat Utama',
    deskripsi: 'Pembacaan Surah Yasin, dzikir bersama, dan tanya jawab praktis fiqih ibadah sehari-hari.',
    urutan: 4,
    isActive: true,
  },
  {
    id: 'kr-05',
    nama: 'Kajian Pemuda & Remaja Islam (RISMA)',
    hari: 'SABTU',
    waktu: '16:00 - 17:30 WIB',
    pemateri: 'Ust. Habib Ikhsan & Pembina Remaja',
    kategori: 'REMAJA',
    lokasi: 'Lantai 2 Masjid',
    deskripsi: 'Kajian akhlak, kepemimpinan pemuda muslim, dan pembekalan media dakwah digital.',
    urutan: 5,
    isActive: true,
  },
  {
    id: 'kr-06',
    nama: 'Santunan Yatim & Pemeriksaan Kesehatan Gratis',
    hari: 'BULANAN',
    waktu: 'Ahad Pekan ke-1, 08:00 - 11:30 WIB',
    pemateri: 'Bidang Sosial DKM & Dokter Sukarelawan',
    kategori: 'SOSIAL',
    lokasi: 'Pelataran & Aula Masjid',
    deskripsi: 'Penyaluran sembako dhuafa, santunan anak yatim RW 15, dan cek tensi serta gula darah gratis.',
    urutan: 6,
    isActive: true,
  },
]

export function normalizeKegiatanRutinList(raw: unknown): KegiatanRutinItem[] {
  if (!Array.isArray(raw)) return []

  const result: KegiatanRutinItem[] = []

  const validHari: HariKegiatan[] = [
    'SENIN',
    'SELASA',
    'RABU',
    'KAMIS',
    'JUMAT',
    'SABTU',
    'AHAD',
    'HARIAN',
    'BULANAN',
  ]

  const validKategori: KategoriKegiatanRutin[] = [
    'KAJIAN_UMUM',
    'MUSLIMAH',
    'ANAK_TPQ',
    'REMAJA',
    'SOSIAL',
  ]

  for (const [index, item] of raw.entries()) {
    if (!item || typeof item !== 'object') continue
    const record = item as Record<string, unknown>

    const nama = typeof record.nama === 'string' ? record.nama.trim() : ''
    if (!nama) continue

    const rawHari = typeof record.hari === 'string' ? record.hari.toUpperCase() : 'AHAD'
    const hari: HariKegiatan = validHari.includes(rawHari as HariKegiatan)
      ? (rawHari as HariKegiatan)
      : 'AHAD'

    const rawKategori =
      typeof record.kategori === 'string' ? record.kategori.toUpperCase() : 'KAJIAN_UMUM'
    const kategori: KategoriKegiatanRutin = validKategori.includes(
      rawKategori as KategoriKegiatanRutin,
    )
      ? (rawKategori as KategoriKegiatanRutin)
      : 'KAJIAN_UMUM'

    const waktu = typeof record.waktu === 'string' ? record.waktu.trim() : 'Waktu belum diatur'
    const pemateri = typeof record.pemateri === 'string' ? record.pemateri.trim() : ''
    const lokasi =
      typeof record.lokasi === 'string' && record.lokasi.trim()
        ? record.lokasi.trim()
        : 'Ruang Sholat Utama'
    const deskripsi = typeof record.deskripsi === 'string' ? record.deskripsi.trim() : ''
    const urutan =
      typeof record.urutan === 'number' && !Number.isNaN(record.urutan) ? record.urutan : index + 1
    const isActive = record.isActive !== undefined ? Boolean(record.isActive) : true
    const id =
      typeof record.id === 'string' && record.id.trim() ? record.id.trim() : `kr-${Date.now()}-${index}`

    result.push({
      id,
      nama,
      hari,
      waktu,
      pemateri,
      kategori,
      lokasi,
      deskripsi,
      urutan,
      isActive,
    })
  }

  return result.sort((a, b) => a.urutan - b.urutan)
}

