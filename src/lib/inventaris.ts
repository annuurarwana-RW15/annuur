import type { InventoryCategoryType, LoanStatus } from '@prisma/client'

/**
 * Menghitung stok yang tersedia berdasarkan invarian:
 * availableQty = totalQty - borrowedQty - brokenQty
 */
export function calculateStockBalance(
  totalQty: number,
  borrowedQty: number,
  brokenQty: number,
): number {
  return Math.max(0, totalQty - borrowedQty - brokenQty)
}

/**
 * Menentukan status terkini dari peminjaman berdasarkan kuantitas barang
 * yang telah dikembalikan dan tanggal rencana kembali.
 */
export function deriveLoanStatus(
  items: {
    borrowedQty: number
    returnedQty: number
    brokenQty: number
    missingQty: number
  }[],
  expectedReturn: Date,
  now: Date = new Date(),
): LoanStatus {
  if (items.length === 0) return 'SELESAI'

  // Periksa apakah seluruh item sudah kembali penuh
  const allCompleted = items.every(
    (item) => item.returnedQty + item.brokenQty + item.missingQty >= item.borrowedQty,
  )
  if (allCompleted) return 'SELESAI'

  // Periksa apakah ada sebagian yang sudah diproses kembali
  const anyReturned = items.some(
    (item) => item.returnedQty + item.brokenQty + item.missingQty > 0,
  )
  if (anyReturned) {
    if (now > expectedReturn) return 'TERLAMBAT'
    return 'KEMBALI_SEBAGIAN'
  }

  // Jika belum ada yang kembali, periksa apakah sudah lewat batas waktu
  if (now > expectedReturn) return 'TERLAMBAT'

  return 'DIPINJAM'
}

/**
 * Membuat nomor referensi peminjaman unik: PINJAM-YYYYMM-XXXX
 */
export function generateLoanCode(date: Date = new Date()): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let random = ''
  for (let i = 0; i < 4; i++) {
    random += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return `PINJAM-${year}${month}-${random}`
}

/**
 * Mengubah enum kategori ke label bahasa Indonesia yang ramah pengguna.
 */
export function formatCategoryName(category: InventoryCategoryType): string {
  const map: Record<InventoryCategoryType, string> = {
    SARPRAS_UMUM: 'Sarpras Umum (Tenda & Kursi)',
    ELEKTRONIK_AUDIO: 'Elektronik & Audio',
    IBADAH_PENGAJIAN: 'Ibadah & Pengajian',
    RUKUN_KEMATIAN: 'Rukun Kematian (Jenazah)',
    KEBERSIHAN_DAPUR: 'Kebersihan & Dapur',
  }
  return map[category] ?? category
}

/**
 * Mengubah enum status peminjaman ke label dan gaya visual Tailwind.
 */
export function formatLoanStatus(status: LoanStatus): {
  label: string
  color: string
} {
  switch (status) {
    case 'DIPINJAM':
      return {
        label: 'Dipinjam',
        color: 'bg-blue-100 text-blue-800 border-blue-200',
      }
    case 'KEMBALI_SEBAGIAN':
      return {
        label: 'Kembali Sebagian',
        color: 'bg-amber-100 text-amber-800 border-amber-200',
      }
    case 'TERLAMBAT':
      return {
        label: 'Terlambat',
        color: 'bg-rose-100 text-rose-800 border-rose-200',
      }
    case 'SELESAI':
      return {
        label: 'Selesai',
        color: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      }
    default:
      return {
        label: status,
        color: 'bg-neutral-100 text-neutral-800 border-neutral-200',
      }
  }
}

