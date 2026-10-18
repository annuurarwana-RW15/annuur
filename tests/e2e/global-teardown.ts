import { config } from 'dotenv'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'

/**
 * Bersihkan baris yang dibuat test E2E setelah seluruh run selesai.
 *
 * Test donasi memanggil endpoint publik sehingga tidak punya akses ke tombol
 * "Hapus" di admin — tanpa pembersihan ini setiap run menambah donasi dan
 * transaksi yatim di database lokal (terbukti: 4 transaksi + 17 donasi
 * menumpuk dari run-run sebelumnya).
 *
 * **Konvensi: setiap baris yang dibuat test E2E wajib memuat teks "E2E"** —
 * test baru harus mengikuti ini, kalau tidak barisnya akan bocor ke database.
 *
 * Ditebak lewat pola penamaan khas test:
 * - donatur `E2E Donatur *`
 * - marker transaksi `E2E smoke transaksi *`, `E2E ekspor masuk/keluar *`
 * - transaksi hasil konfirmasi donasi (deskripsinya ikut memuat nama donatur)
 */
export default async function globalTeardown(): Promise<void> {
  config({ path: '.env' })

  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error(
      'DATABASE_URL tidak terbaca — pembersihan sisa E2E gagal, database akan kotor.',
    )
  }

  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString }) })

  try {
    // Urutan penting: transaksi dulu, baru donasi (FK donationId → Donation).
    const transactions = await db.transaction.deleteMany({
      where: { description: { contains: 'E2E' } },
    })
    const donations = await db.donation.deleteMany({
      where: { donorName: { startsWith: 'E2E Donatur' } },
    })

    if (transactions.count > 0 || donations.count > 0) {
      console.log(
        `[e2e] sisa dibersihkan: ${transactions.count} transaksi, ${donations.count} donasi`,
      )
    }
  } finally {
    await db.$disconnect()
  }
}
