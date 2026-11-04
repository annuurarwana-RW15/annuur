'use server'

import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import {
  calculateStockBalance,
  deriveLoanStatus,
  generateLoanCode,
} from '@/lib/inventaris'
import { requireRole } from '@/lib/rbac'
import {
  acquisitionSchema,
  createLoanSchema,
  itemSchema,
  recordReturnSchema,
  type AcquisitionInput,
  type CreateLoanInput,
  type ItemInput,
  type RecordReturnInput,
} from './schema'

export type ActionResult<T = unknown> =
  | { ok: true; data?: T }
  | { ok: false; error: string }

const INVENTARIS_PATHS = [
  '/admin/inventaris',
  '/admin/inventaris/peminjaman',
  '/admin/inventaris/pengadaan',
  '/admin',
] as const

function revalidateInventaris(): void {
  for (const path of INVENTARIS_PATHS) revalidatePath(path)
}

/**
 * Menyimpan barang inventaris (Baru atau Edit)
 */
export async function saveInventoryItem(
  input: ItemInput,
): Promise<ActionResult<{ id: string }>> {
  await requireRole('ADMIN', 'BENDAHARA')

  const parsed = itemSchema.safeParse(input)
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? 'Data barang tidak valid',
    }
  }

  const {
    id,
    code,
    name,
    category,
    location,
    isBorrowable,
    totalQty,
    isWaqf,
    waqfDonor,
    priceEstimate,
    notes,
    image,
  } = parsed.data

  try {
    if (id) {
      const existing = await db.inventoryItem.findUnique({ where: { id } })
      if (!existing) return { ok: false, error: 'Barang tidak ditemukan' }

      // Hitung stok baru dengan menjaga borrowedQty & brokenQty
      const availableQty = calculateStockBalance(
        totalQty,
        existing.borrowedQty,
        existing.brokenQty,
      )

      await db.inventoryItem.update({
        where: { id },
        data: {
          code,
          name,
          category,
          location,
          isBorrowable,
          totalQty,
          availableQty,
          isWaqf,
          waqfDonor: isWaqf ? waqfDonor : null,
          priceEstimate: priceEstimate ?? null,
          notes: notes ?? null,
          image: image ?? null,
        },
      })
      revalidateInventaris()
      return { ok: true, data: { id } }
    } else {
      // Periksa keunikan kode barang
      const duplicateCode = await db.inventoryItem.findUnique({ where: { code } })
      if (duplicateCode) {
        return { ok: false, error: `Kode inventaris "${code}" sudah digunakan` }
      }

      const availableQty = totalQty
      const created = await db.inventoryItem.create({
        data: {
          code,
          name,
          category,
          location,
          isBorrowable,
          totalQty,
          availableQty,
          borrowedQty: 0,
          brokenQty: 0,
          isWaqf,
          waqfDonor: isWaqf ? waqfDonor : null,
          priceEstimate: priceEstimate ?? null,
          notes: notes ?? null,
          image: image ?? null,
        },
      })
      revalidateInventaris()
      return { ok: true, data: { id: created.id } }
    }
  } catch (error) {
    console.error('[saveInventoryItem error]', error)
    return { ok: false, error: 'Gagal menyimpan barang inventaris' }
  }
}

/**
 * Menghapus barang inventaris jika tidak sedang dipinjam
 */
export async function deleteInventoryItem(id: string): Promise<ActionResult> {
  await requireRole('ADMIN', 'BENDAHARA')

  const existing = await db.inventoryItem.findUnique({
    where: { id },
    include: {
      loanItems: {
        where: {
          loan: {
            status: { in: ['DIPINJAM', 'KEMBALI_SEBAGIAN', 'TERLAMBAT'] },
          },
        },
      },
    },
  })

  if (!existing) return { ok: false, error: 'Barang tidak ditemukan' }
  if (existing.loanItems.length > 0 || existing.borrowedQty > 0) {
    return {
      ok: false,
      error: 'Barang tidak dapat dihapus karena masih tercatat sedang dipinjam',
    }
  }

  try {
    await db.inventoryItem.delete({ where: { id } })
    revalidateInventaris()
    return { ok: true }
  } catch (error) {
    console.error('[deleteInventoryItem error]', error)
    return { ok: false, error: 'Gagal menghapus barang inventaris' }
  }
}

/**
 * Membuat transaksi peminjaman baru & memutasi stok barang secara atomik
 */
export async function createLoan(
  input: CreateLoanInput,
): Promise<ActionResult<{ loanId: string }>> {
  await requireRole('ADMIN', 'BENDAHARA')

  const parsed = createLoanSchema.safeParse(input)
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? 'Data peminjaman tidak valid',
    }
  }

  const {
    borrowerName,
    borrowerPhone,
    borrowerAddress,
    purpose,
    loanDate,
    expectedReturn,
    officerOut,
    notes,
    items,
  } = parsed.data

  const loanDateObj = new Date(loanDate)
  const expectedReturnObj = new Date(expectedReturn)

  if (expectedReturnObj < loanDateObj) {
    return {
      ok: false,
      error: 'Estimasi pengembalian tidak boleh sebelum tanggal pinjam',
    }
  }

  const itemIds = items.map((i) => i.itemId)
  const existingItems = await db.inventoryItem.findMany({
    where: { id: { in: itemIds } },
  })

  // Validasi ketersediaan dan status boleh pinjam
  for (const requested of items) {
    const found = existingItems.find((i) => i.id === requested.itemId)
    if (!found) {
      return { ok: false, error: 'Salah satu barang tidak ditemukan' }
    }
    if (!found.isBorrowable) {
      return {
        ok: false,
        error: `Barang "${found.name}" tidak boleh dipinjamkan ke luar masjid`,
      }
    }
    if (found.availableQty < requested.borrowedQty) {
      return {
        ok: false,
        error: `Stok tidak mencukupi untuk "${found.name}". Tersedia: ${found.availableQty}, diminta: ${requested.borrowedQty}`,
      }
    }
  }

  try {
    const result = await db.$transaction(async (tx) => {
      // 1. Buat peminjaman
      const loan = await tx.inventoryLoan.create({
        data: {
          code: generateLoanCode(loanDateObj),
          borrowerName,
          borrowerPhone,
          borrowerAddress: borrowerAddress ?? null,
          purpose,
          loanDate: loanDateObj,
          expectedReturn: expectedReturnObj,
          status: 'DIPINJAM',
          officerOut,
          notes: notes ?? null,
          items: {
            create: items.map((i) => ({
              itemId: i.itemId,
              borrowedQty: i.borrowedQty,
              returnedQty: 0,
              brokenQty: 0,
              missingQty: 0,
            })),
          },
        },
      })

      // 2. Mutasi stok setiap barang secara atomik
      for (const requested of items) {
        const item = existingItems.find((i) => i.id === requested.itemId)!
        const newAvailable = item.availableQty - requested.borrowedQty
        const newBorrowed = item.borrowedQty + requested.borrowedQty

        await tx.inventoryItem.update({
          where: { id: item.id },
          data: {
            availableQty: newAvailable,
            borrowedQty: newBorrowed,
          },
        })
      }

      return loan
    })

    revalidateInventaris()
    return { ok: true, data: { loanId: result.id } }
  } catch (error) {
    console.error('[createLoan error]', error)
    return { ok: false, error: 'Gagal mencatat peminjaman barang' }
  }
}

/**
 * Mencatat pengembalian barang (parsial / penuh / dengan kerusakan)
 */
export async function recordReturn(
  input: RecordReturnInput,
): Promise<ActionResult> {
  await requireRole('ADMIN', 'BENDAHARA')

  const parsed = recordReturnSchema.safeParse(input)
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? 'Data pengembalian tidak valid',
    }
  }

  const { loanId, officerIn, notes, items } = parsed.data

  const loan = await db.inventoryLoan.findUnique({
    where: { id: loanId },
    include: {
      items: {
        include: { item: true },
      },
    },
  })

  if (!loan) return { ok: false, error: 'Data peminjaman tidak ditemukan' }
  if (loan.status === 'SELESAI') {
    return { ok: false, error: 'Peminjaman ini sudah selesai dikembalikan' }
  }

  try {
    await db.$transaction(async (tx) => {
      const updatedItemStatusList: {
        borrowedQty: number
        returnedQty: number
        brokenQty: number
        missingQty: number
      }[] = []

      for (const returnInput of items) {
        const loanItem = loan.items.find((li) => li.id === returnInput.loanItemId)
        if (!loanItem) continue

        const additionalGood = returnInput.returnedGoodQty
        const additionalBroken = returnInput.returnedBrokenQty
        const additionalMissing = returnInput.missingQty
        const totalReturningNow = additionalGood + additionalBroken + additionalMissing

        if (totalReturningNow <= 0) continue

        const remainingToReturn =
          loanItem.borrowedQty -
          (loanItem.returnedQty + loanItem.brokenQty + loanItem.missingQty)

        if (totalReturningNow > remainingToReturn) {
          throw new Error(
            `Kuantitas kembali melebihi sisa pinjaman untuk barang "${loanItem.item.name}"`,
          )
        }

        const newReturnedQty = loanItem.returnedQty + additionalGood
        const newBrokenQty = loanItem.brokenQty + additionalBroken
        const newMissingQty = loanItem.missingQty + additionalMissing

        // 1. Update baris item peminjaman
        await tx.inventoryLoanItem.update({
          where: { id: loanItem.id },
          data: {
            returnedQty: newReturnedQty,
            brokenQty: newBrokenQty,
            missingQty: newMissingQty,
          },
        })

        // 2. Update stok master barang
        const currentItem = loanItem.item
        const newAvailable = currentItem.availableQty + additionalGood
        const newBorrowed = Math.max(0, currentItem.borrowedQty - totalReturningNow)
        const newBroken = currentItem.brokenQty + additionalBroken

        await tx.inventoryItem.update({
          where: { id: currentItem.id },
          data: {
            availableQty: newAvailable,
            borrowedQty: newBorrowed,
            brokenQty: newBroken,
          },
        })

        updatedItemStatusList.push({
          borrowedQty: loanItem.borrowedQty,
          returnedQty: newReturnedQty,
          brokenQty: newBrokenQty,
          missingQty: newMissingQty,
        })
      }

      // 3. Evaluasi status akhir peminjaman
      const currentAllLoanItems = loan.items.map((li) => {
        const updated = updatedItemStatusList.find(
          (u) => u.borrowedQty === li.borrowedQty,
        )
        return updated ?? li
      })

      const newLoanStatus = deriveLoanStatus(
        currentAllLoanItems,
        loan.expectedReturn,
      )

      await tx.inventoryLoan.update({
        where: { id: loanId },
        data: {
          status: newLoanStatus,
          officerIn,
          actualReturn: newLoanStatus === 'SELESAI' ? new Date() : null,
          notes: notes ? `${loan.notes ? `${loan.notes}\n` : ''}${notes}` : loan.notes,
        },
      })
    })

    revalidateInventaris()
    return { ok: true }
  } catch (error) {
    console.error('[recordReturn error]', error)
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Gagal mencatat pengembalian',
    }
  }
}

/**
 * Mencatat pengadaan barang baru (Penambahan stok / wakaf / beli kas)
 */
export async function createAcquisition(
  input: AcquisitionInput,
): Promise<ActionResult> {
  const sessionUser = await requireRole('ADMIN', 'BENDAHARA')

  const parsed = acquisitionSchema.safeParse(input)
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? 'Data pengadaan tidak valid',
    }
  }

  const {
    itemId,
    quantity,
    source,
    unitPrice,
    donorName,
    officer,
    date,
    notes,
    recordToCash,
    cashCategoryId,
  } = parsed.data

  const dateObj = new Date(date)
  const item = await db.inventoryItem.findUnique({ where: { id: itemId } })
  if (!item) return { ok: false, error: 'Barang tidak ditemukan' }

  try {
    await db.$transaction(async (tx) => {
      let createdTransactionId: string | null = null

      // Jika beli via kas dan opsi catat kas dipilih
      if (source === 'PEMBELIAN_KAS' && recordToCash) {
        if (!unitPrice || unitPrice <= 0) {
          throw new Error('Harga satuan wajib diisi bila dicatat ke Buku Kas')
        }
        if (!cashCategoryId) {
          throw new Error('Kategori kas wajib dipilih untuk pengeluaran kas')
        }

        const activePeriod = await tx.period.findFirst({
          where: { status: 'AKTIF' },
        })
        if (!activePeriod) {
          throw new Error('Tidak ada periode buku kas yang aktif untuk mencatat pengeluaran')
        }

        const totalCost = unitPrice * quantity
        const cashTx = await tx.transaction.create({
          data: {
            type: 'KELUAR',
            amount: totalCost,
            date: dateObj,
            description: `Pengadaan ${quantity} unit ${item.name} (${item.code})`,
            categoryId: cashCategoryId,
            periodId: activePeriod.id,
            createdBy: sessionUser.id,
          },
        })
        createdTransactionId = cashTx.id
      }

      // 1. Buat log pengadaan
      await tx.inventoryAcquisition.create({
        data: {
          itemId,
          quantity,
          source,
          unitPrice: unitPrice ?? null,
          donorName: source === 'WAKAF_HIBAH' ? donorName : null,
          officer,
          date: dateObj,
          notes: notes ?? null,
          transactionId: createdTransactionId,
        },
      })

      // 2. Tambahkan kuantitas stok barang
      const newTotal = item.totalQty + quantity
      const newAvailable = item.availableQty + quantity

      await tx.inventoryItem.update({
        where: { id: itemId },
        data: {
          totalQty: newTotal,
          availableQty: newAvailable,
        },
      })
    })

    revalidateInventaris()
    revalidatePath('/admin/kas/transaksi')
    revalidatePath('/laporan-kas')
    return { ok: true }
  } catch (error) {
    console.error('[createAcquisition error]', error)
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Gagal mencatat pengadaan barang',
    }
  }
}

