import { z } from 'zod'

/** Batas jumlah donasi: Rp 1 triliun (Decimal(18,2) muat, tapi tetap dibatasi). */
export const MAX_DONATION_AMOUNT = 1e12

/** Bentuk URL bukti donasi: hasil upload `/api/upload-public` (http/https). */
const proofImageSchema = z
  .string()
  .trim()
  .refine((value) => /^https?:\/\//i.test(value), {
    error: 'Bukti transfer harus berupa URL http(s)',
  })

export const donationSchema = z.object({
  donorName: z
    .string()
    .trim()
    .min(2, 'Nama minimal 2 karakter')
    .max(80, 'Nama maksimal 80 karakter'),
  amount: z
    .number({ error: 'Jumlah harus berupa angka' })
    .finite('Jumlah tidak valid')
    .positive('Jumlah harus lebih dari 0')
    .max(MAX_DONATION_AMOUNT, 'Jumlah terlalu besar'),
  categoryId: z.string().trim().min(1).optional(),
  message: z.string().trim().max(500, 'Pesan maksimal 500 karakter').optional(),
  proofImage: proofImageSchema.optional(),
})

/** Bentuk input `POST /api/donasi`. */
export type DonationInput = z.input<typeof donationSchema>
