export type PengurusKategori = 'PIMPINAN' | 'BIDANG' | 'OPERASIONAL' | 'PENASEHAT'

export interface PengurusItem {
  id: string
  nama: string
  jabatan: string
  kategori: PengurusKategori
  tugas: string
  telepon?: string
  foto?: string
  isKhotib?: boolean
  isImam?: boolean
  urutan: number
  isActive: boolean
}

export const KATEGORI_LABELS: Record<PengurusKategori, string> = {
  PENASEHAT: 'Dewan Penasehat & Pembina',
  PIMPINAN: 'Pengurus Inti / Pimpinan',
  BIDANG: 'Ketua & Koordinator Bidang',
  OPERASIONAL: 'Pelaksana Operasional & Marbot',
}

export const DEFAULT_PENGURUS_LIST: PengurusItem[] = [
  {
    id: 'p-01',
    nama: 'H. Rahmat Hidayat',
    jabatan: 'Ketua Dewan Penasehat',
    kategori: 'PENASEHAT',
    tugas: 'Memberikan bimbingan, pertimbangan, dan pengawasan umum terhadap seluruh kebijakan strategis DKM Masjid An-nuur.',
    telepon: '081234567801',
    isKhotib: false,
    isImam: false,
    urutan: 1,
    isActive: true,
  },
  {
    id: 'p-02',
    nama: 'H. Ahmad Subagio, M.Pd.',
    jabatan: 'Ketua DKM',
    kategori: 'PIMPINAN',
    tugas: 'Memimpin dan mengkoordinasikan seluruh program kerja, kegiatan peribadahan, kemakmuran, dan legalitas Masjid An-nuur Arwana.',
    telepon: '081234567802',
    isKhotib: true,
    isImam: true,
    urutan: 2,
    isActive: true,
  },
  {
    id: 'p-03',
    nama: 'Ust. M. Ridwan, S.Ag.',
    jabatan: 'Wakil Ketua DKM',
    kategori: 'PIMPINAN',
    tugas: 'Mendampingi Ketua DKM serta mengawal pelaksanaan program teknis dakwah dan hubungan antar lembaga keagamaan.',
    telepon: '081234567803',
    isKhotib: true,
    isImam: true,
    urutan: 3,
    isActive: true,
  },
  {
    id: 'p-04',
    nama: 'Bambang Irawan, S.Kom.',
    jabatan: 'Sekretaris DKM',
    kategori: 'PIMPINAN',
    tugas: 'Mengelola tata administrasi surat-menyurat, pengarsipan dokumen, pendataan jamaah, notulensi musyawarah, dan penyusunan proposal.',
    telepon: '081234567804',
    isKhotib: false,
    isImam: false,
    urutan: 4,
    isActive: true,
  },
  {
    id: 'p-05',
    nama: 'Habib Ikhsan, S.E.',
    jabatan: 'Bendahara DKM',
    kategori: 'PIMPINAN',
    tugas: 'Mengelola pencatatan arus kas masuk dan keluar, menyusun laporan keuangan transparan mingguan dan bulanan, serta pengawasan rekening donasi.',
    telepon: '08144454545',
    isKhotib: false,
    isImam: false,
    urutan: 5,
    isActive: true,
  },
  {
    id: 'p-06',
    nama: 'Ust. Abdul Ghofur, Lc.',
    jabatan: 'Ketua Bidang Imarah (Ibadah & Dakwah)',
    kategori: 'BIDANG',
    tugas: 'Menyusun jadwal imam dan khotib Jumat, kajian rutin jamaah, pelatihan keagamaan, dan peringatan hari besar Islam (PHBI).',
    telepon: '081234567806',
    isKhotib: true,
    isImam: true,
    urutan: 6,
    isActive: true,
  },
  {
    id: 'p-07',
    nama: 'Ir. Hendra Saputra',
    jabatan: 'Ketua Bidang Riayah (Sarana & Prasarana)',
    kategori: 'BIDANG',
    tugas: 'Pemeliharaan fisik bangunan masjid, sound system, kebersihan tempat wudhu, inventaris aset, dan kelayakan fasilitas ibadah.',
    telepon: '081234567807',
    isKhotib: false,
    isImam: false,
    urutan: 7,
    isActive: true,
  },
  {
    id: 'p-08',
    nama: 'Agus Wahyudi',
    jabatan: 'Koordinator Bidang Sosial & Kemasyarakatan',
    kategori: 'BIDANG',
    tugas: 'Menjalin silaturahmi dengan warga RW 15, pengelolaan santunan dhuafa & anak yatim, serta pelayanan rukun kematian.',
    telepon: '081234567808',
    isKhotib: false,
    isImam: false,
    urutan: 8,
    isActive: true,
  },
  {
    id: 'p-09',
    nama: 'Syahrul Ramadhan',
    jabatan: 'Marbot Masjid & Teknisi Audio',
    kategori: 'OPERASIONAL',
    tugas: 'Menjaga kebersihan harian ruang sholat utama, adzan rawatib, pengoperasian sound system, dan kenyamanan lingkungan masjid.',
    telepon: '081234567809',
    isKhotib: false,
    isImam: true,
    urutan: 9,
    isActive: true,
  },
]

export function normalizePengurusList(raw: unknown): PengurusItem[] {
  if (!Array.isArray(raw)) return []

  const result: PengurusItem[] = []

  for (const [index, item] of raw.entries()) {
    if (!item || typeof item !== 'object') continue
    const record = item as Record<string, unknown>

    const nama = typeof record.nama === 'string' ? record.nama.trim() : ''
    const jabatan = typeof record.jabatan === 'string' ? record.jabatan.trim() : ''
    if (!nama || !jabatan) continue

    const validKategori: PengurusKategori[] = ['PENASEHAT', 'PIMPINAN', 'BIDANG', 'OPERASIONAL']
    const rawKategori = typeof record.kategori === 'string' ? record.kategori.toUpperCase() : 'BIDANG'
    const kategori: PengurusKategori = validKategori.includes(rawKategori as PengurusKategori)
      ? (rawKategori as PengurusKategori)
      : 'BIDANG'

    const tugas = typeof record.tugas === 'string' ? record.tugas.trim() : ''
    const telepon = typeof record.telepon === 'string' ? record.telepon.trim() : undefined
    const foto = typeof record.foto === 'string' ? record.foto.trim() : undefined
    const isKhotib = Boolean(record.isKhotib)
    const isImam = Boolean(record.isImam)
    const isActive = record.isActive !== undefined ? Boolean(record.isActive) : true
    const id = typeof record.id === 'string' && record.id.trim() ? record.id.trim() : `p-${Date.now()}-${index}`
    const urutan = typeof record.urutan === 'number' && !Number.isNaN(record.urutan) ? record.urutan : index + 1

    result.push({
      id,
      nama,
      jabatan,
      kategori,
      tugas,
      telepon,
      foto,
      isKhotib,
      isImam,
      urutan,
      isActive,
    })
  }

  return result.sort((a, b) => a.urutan - b.urutan)
}
