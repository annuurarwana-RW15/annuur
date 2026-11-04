import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  createAcquisition,
  createLoan,
  deleteInventoryItem,
  recordReturn,
  saveInventoryItem,
} from '@/app/admin/(dashboard)/inventaris/actions'

const h = vi.hoisted(() => ({
  db: {
    inventoryItem: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    inventoryLoan: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    inventoryLoanItem: {
      update: vi.fn(),
    },
    inventoryAcquisition: {
      create: vi.fn(),
    },
    period: {
      findFirst: vi.fn(),
    },
    transaction: {
      create: vi.fn(),
    },
    $transaction: vi.fn(),
  },
  requireRole: vi.fn(),
}))

vi.mock('@/lib/db', () => ({ db: h.db }))
vi.mock('@/lib/rbac', () => ({ requireRole: h.requireRole }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

beforeEach(() => {
  vi.clearAllMocks()
  h.requireRole.mockResolvedValue({ id: 'u-1', name: 'Admin', role: 'ADMIN' })
  h.db.$transaction.mockImplementation(async (callback: (tx: typeof h.db) => Promise<unknown>) => {
    return callback(h.db)
  })
})

describe('Server Actions Inventaris', () => {
  describe('saveInventoryItem', () => {
    it('memvalidasi kode dan nama barang wajib diisi', async () => {
      const res = await saveInventoryItem({
        code: '',
        name: '',
        category: 'SARPRAS_UMUM',
        location: 'Gudang',
        isBorrowable: true,
        totalQty: 10,
        isWaqf: false,
      })
      expect(res.ok).toBe(false)
      if (!res.ok) {
        expect(res.error).toBeDefined()
      }
    })

    it('membuat barang baru dengan availableQty dihitung dari totalQty', async () => {
      h.db.inventoryItem.create.mockResolvedValue({ id: 'item-1' })

      const res = await saveInventoryItem({
        code: 'INV-TND-01',
        name: 'Tenda 4x6 Meter',
        category: 'SARPRAS_UMUM',
        location: 'Gudang A',
        isBorrowable: true,
        totalQty: 5,
        isWaqf: false,
      })

      expect(res.ok).toBe(true)
      expect(h.db.inventoryItem.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          code: 'INV-TND-01',
          name: 'Tenda 4x6 Meter',
          totalQty: 5,
          availableQty: 5,
        }),
      })
    })
  })

  describe('createLoan', () => {
    it('menolak peminjaman jika stok tidak mencukupi', async () => {
      h.db.inventoryItem.findMany.mockResolvedValue([
        { id: 'item-1', name: 'Tenda', availableQty: 2, isBorrowable: true },
      ])

      const res = await createLoan({
        borrowerName: 'Pak RT',
        borrowerPhone: '081234567890',
        purpose: 'Acara Warga',
        loanDate: '2026-11-04',
        expectedReturn: '2026-11-06',
        officerOut: 'Ust. Marbot',
        items: [{ itemId: 'item-1', borrowedQty: 5 }],
      })

      expect(res.ok).toBe(false)
      if (!res.ok) {
        expect(res.error).toContain('Stok tidak mencukupi')
      }
    })

    it('menolak peminjaman jika barang berstatus isBorrowable == false', async () => {
      h.db.inventoryItem.findMany.mockResolvedValue([
        { id: 'item-2', name: 'Karpet Mihrab', availableQty: 10, isBorrowable: false },
      ])

      const res = await createLoan({
        borrowerName: 'Pak RT',
        borrowerPhone: '081234567890',
        purpose: 'Acara',
        loanDate: '2026-11-04',
        expectedReturn: '2026-11-06',
        officerOut: 'Ust. Marbot',
        items: [{ itemId: 'item-2', borrowedQty: 1 }],
      })

      expect(res.ok).toBe(false)
      if (!res.ok) {
        expect(res.error).toContain('tidak boleh dipinjamkan')
      }
    })

    it('berhasil mencatat pinjaman dan memutasi stok available & borrowed secara atomik', async () => {
      h.db.inventoryItem.findMany.mockResolvedValue([
        { id: 'item-1', name: 'Kursi', availableQty: 50, borrowedQty: 0, brokenQty: 0, totalQty: 50, isBorrowable: true },
      ])
      h.db.inventoryLoan.create.mockResolvedValue({ id: 'loan-1', code: 'PINJAM-202611-1234' })

      const res = await createLoan({
        borrowerName: 'Ahmad Fauzi',
        borrowerPhone: '081234567890',
        purpose: 'Tasyakuran',
        loanDate: '2026-11-04',
        expectedReturn: '2026-11-06',
        officerOut: 'Pak Marbot',
        items: [{ itemId: 'item-1', borrowedQty: 20 }],
      })

      expect(res.ok).toBe(true)
      expect(h.db.inventoryItem.update).toHaveBeenCalledWith({
        where: { id: 'item-1' },
        data: {
          availableQty: 30,
          borrowedQty: 20,
        },
      })
    })
  })

  describe('recordReturn', () => {
    it('memutasi pengembalian barang dan memperbarui status pinjaman', async () => {
      h.db.inventoryLoan.findUnique.mockResolvedValue({
        id: 'loan-1',
        expectedReturn: new Date('2026-11-06'),
        items: [
          {
            id: 'li-1',
            itemId: 'item-1',
            borrowedQty: 20,
            returnedQty: 0,
            brokenQty: 0,
            missingQty: 0,
            item: {
              id: 'item-1',
              totalQty: 50,
              availableQty: 30,
              borrowedQty: 20,
              brokenQty: 0,
            },
          },
        ],
      })

      const res = await recordReturn({
        loanId: 'loan-1',
        officerIn: 'Pak Marbot',
        notes: 'Kembali 18 baik, 2 patah kaki',
        items: [
          {
            loanItemId: 'li-1',
            returnedGoodQty: 18,
            returnedBrokenQty: 2,
            missingQty: 0,
          },
        ],
      })

      expect(res.ok).toBe(true)
      expect(h.db.inventoryItem.update).toHaveBeenCalledWith({
        where: { id: 'item-1' },
        data: {
          availableQty: 48,
          borrowedQty: 0,
          brokenQty: 2,
        },
      })
      expect(h.db.inventoryLoan.update).toHaveBeenCalledWith({
        where: { id: 'loan-1' },
        data: expect.objectContaining({
          status: 'SELESAI',
          officerIn: 'Pak Marbot',
        }),
      })
    })
  })
})
