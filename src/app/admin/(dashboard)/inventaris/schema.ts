import { z } from 'zod'

export const itemSchema = z.object({
  id: z.string().optional(),
  code: z
    .string()
    .trim()
    .min(2, 'Kode barang minimal 2 karakter')
    .max(50, 'Kode barang maksimal 50 karakter')
    .toUpperCase(),
  name: z.string().trim().min(2, 'Nama barang minimal 2 karakter').max(100),
  category: z.enum([
    'SARPRAS_UMUM',
    'ELEKTRONIK_AUDIO',
    'IBADAH_PENGAJIAN',
    'RUKUN_KEMATIAN',
    'KEBERSIHAN_DAPUR',
  ]),
  location: z.string().trim().min(2, 'Lokasi penyimpanan minimal 2 karakter'),
  isBorrowable: z.boolean().default(true),
  totalQty: z.number().int().min(0, 'Kuantitas minimal 0'),
  isWaqf: z.boolean().default(false),
  waqfDonor: z.string().trim().optional().nullable(),
  priceEstimate: z.number().min(0).optional().nullable(),
  notes: z.string().trim().optional().nullable(),
  image: z.string().trim().optional().nullable(),
})

export type ItemInput = z.infer<typeof itemSchema>

export const createLoanSchema = z.object({
  borrowerName: z.string().trim().min(2, 'Nama peminjam minimal 2 karakter'),
  borrowerPhone: z.string().trim().min(6, 'Nomor telepon minimal 6 digit'),
  borrowerAddress: z.string().trim().optional().nullable(),
  purpose: z.string().trim().min(2, 'Keperluan pinjam minimal 2 karakter'),
  loanDate: z.string().min(1, 'Tanggal pinjam wajib diisi'),
  expectedReturn: z.string().min(1, 'Estimasi pengembalian wajib diisi'),
  officerOut: z.string().trim().min(2, 'Nama petugas penyerah minimal 2 karakter'),
  notes: z.string().trim().optional().nullable(),
  items: z
    .array(
      z.object({
        itemId: z.string().min(1),
        borrowedQty: z.number().int().min(1, 'Kuantitas pinjam minimal 1'),
      }),
    )
    .min(1, 'Pilih minimal 1 barang untuk dipinjam'),
})

export type CreateLoanInput = z.infer<typeof createLoanSchema>

export const recordReturnSchema = z.object({
  loanId: z.string().min(1),
  officerIn: z.string().trim().min(2, 'Nama petugas penerima minimal 2 karakter'),
  notes: z.string().trim().optional().nullable(),
  items: z
    .array(
      z.object({
        loanItemId: z.string().min(1),
        returnedGoodQty: z.number().int().min(0),
        returnedBrokenQty: z.number().int().min(0),
        missingQty: z.number().int().min(0),
      }),
    )
    .min(1, 'Minimal 1 barang dikembalikan'),
})

export type RecordReturnInput = z.infer<typeof recordReturnSchema>

export const acquisitionSchema = z.object({
  itemId: z.string().min(1, 'Pilih barang yang ditambah'),
  quantity: z.number().int().min(1, 'Kuantitas minimal 1'),
  source: z.enum(['PEMBELIAN_KAS', 'WAKAF_HIBAH']),
  unitPrice: z.number().min(0).optional().nullable(),
  donorName: z.string().trim().optional().nullable(),
  officer: z.string().trim().min(2, 'Nama petugas penerima minimal 2 karakter'),
  date: z.string().min(1, 'Tanggal pengadaan wajib diisi'),
  notes: z.string().trim().optional().nullable(),
  recordToCash: z.boolean().default(false),
  cashCategoryId: z.string().optional().nullable(),
})

export type AcquisitionInput = z.infer<typeof acquisitionSchema>

