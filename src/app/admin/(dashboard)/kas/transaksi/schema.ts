import { z } from 'zod'

export const txSchema = z.object({
  type: z.enum(['MASUK', 'KELUAR'], { error: 'Jenis harus MASUK atau KELUAR' }),
  amount: z
    .number({ error: 'Nominal harus berupa angka' })
    .finite('Nominal tidak valid')
    .positive('Nominal harus lebih dari 0'),
  date: z.coerce.date({ error: 'Tanggal wajib diisi' }),
  description: z
    .string()
    .trim()
    .min(1, 'Keterangan wajib diisi')
    .max(200, 'Keterangan maksimal 200 karakter'),
  categoryId: z.string().min(1, 'Kategori wajib dipilih'),
  receiptImage: z.string().optional(),
})

/** Bentuk input `createTransaction`/`updateTransaction`. */
export type TxInput = z.input<typeof txSchema>
