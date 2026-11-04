import { describe, expect, it } from 'vitest'
import {
  calculateStockBalance,
  deriveLoanStatus,
  formatCategoryName,
  formatLoanStatus,
  generateLoanCode,
} from '@/lib/inventaris'

describe('inventaris invariants & helpers', () => {
  describe('calculateStockBalance', () => {
    it('menghitung availableQty = totalQty - borrowedQty - brokenQty', () => {
      expect(calculateStockBalance(100, 20, 5)).toBe(75)
      expect(calculateStockBalance(50, 50, 0)).toBe(0)
      expect(calculateStockBalance(10, 0, 0)).toBe(10)
    })

    it('tidak menghasilkan nilai negatif saat input tidak lazim', () => {
      expect(calculateStockBalance(10, 15, 0)).toBe(0)
    })
  })

  describe('deriveLoanStatus', () => {
    const today = new Date('2026-11-04T10:00:00Z')
    const past = new Date('2026-11-01T10:00:00Z')
    const future = new Date('2026-11-10T10:00:00Z')

    it('mengembalikan DIPINJAM saat belum ada barang kembali dan belum lewat tenggat', () => {
      const items = [{ borrowedQty: 10, returnedQty: 0, brokenQty: 0, missingQty: 0 }]
      expect(deriveLoanStatus(items, future, today)).toBe('DIPINJAM')
    })

    it('mengembalikan TERLAMBAT saat belum kembali penuh dan sudah melewati expectedReturn', () => {
      const items = [{ borrowedQty: 10, returnedQty: 0, brokenQty: 0, missingQty: 0 }]
      expect(deriveLoanStatus(items, past, today)).toBe('TERLAMBAT')
    })

    it('mengembalikan KEMBALI_SEBAGIAN saat baru sebagian barang dikembalikan', () => {
      const items = [
        { borrowedQty: 10, returnedQty: 5, brokenQty: 0, missingQty: 0 },
        { borrowedQty: 2, returnedQty: 0, brokenQty: 0, missingQty: 0 },
      ]
      expect(deriveLoanStatus(items, future, today)).toBe('KEMBALI_SEBAGIAN')
    })

    it('mengembalikan SELESAI saat seluruh barang telah kembali (termasuk yang dicatat rusak/hilang)', () => {
      const items = [
        { borrowedQty: 10, returnedQty: 8, brokenQty: 2, missingQty: 0 },
        { borrowedQty: 2, returnedQty: 2, brokenQty: 0, missingQty: 0 },
      ]
      expect(deriveLoanStatus(items, past, today)).toBe('SELESAI')
    })
  })

  describe('generateLoanCode', () => {
    it('menghasilkan kode pinjam dengan format PINJAM-YYYYMM-XXXX', () => {
      const code = generateLoanCode(new Date('2026-11-04'))
      expect(code).toMatch(/^PINJAM-202611-[A-Z0-9]{4}$/)
    })
  })

  describe('formatCategoryName & formatLoanStatus', () => {
    it('memformat enum kategori ke nama yang ramah pengguna', () => {
      expect(formatCategoryName('SARPRAS_UMUM')).toContain('Sarpras')
      expect(formatCategoryName('ELEKTRONIK_AUDIO')).toContain('Elektronik')
    })

    it('memberikan label dan warna badge untuk status pinjaman', () => {
      const dipinjam = formatLoanStatus('DIPINJAM')
      expect(dipinjam.label).toBe('Dipinjam')

      const terlambat = formatLoanStatus('TERLAMBAT')
      expect(terlambat.label).toBe('Terlambat')

      const selesai = formatLoanStatus('SELESAI')
      expect(selesai.label).toBe('Selesai')
    })
  })
})
