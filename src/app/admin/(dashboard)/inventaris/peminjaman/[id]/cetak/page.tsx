import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { getSetting } from '@/lib/settings'
import { formatDateID } from '@/lib/format'
import { requireRole } from '@/lib/rbac'
import { PrintTrigger } from './PrintTrigger'

export const metadata: Metadata = {
  title: 'Cetak Bukti Peminjaman — Admin Masjid An-nuur Arwana',
  robots: { index: false, follow: false },
}

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function CetakPeminjamanPage({ params }: PageProps) {
  await requireRole('ADMIN', 'BENDAHARA')

  const { id } = await params
  const [loan, siteName, siteAddress] = await Promise.all([
    db.inventoryLoan.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            item: true,
          },
        },
      },
    }),
    getSetting('site.name', 'Masjid An-Nuur Arwana'),
    getSetting('site.address', 'Jl. Arwana RW 15'),
  ])

  if (!loan) notFound()

  return (
    <div className="mx-auto max-w-3xl">
      <PrintTrigger />

      {/* Lembar Cetak Dokumen Resmi */}
      <div className="rounded-xl border border-neutral-300 bg-white p-8 text-neutral-900 shadow-sm print:border-none print:p-0 print:shadow-none">
        {/* KOP Surat */}
        <div className="border-b-2 border-neutral-900 pb-4 text-center">
          <h1 className="text-xl font-bold uppercase tracking-wider text-green-950">
            {String(siteName)}
          </h1>
          <p className="text-xs text-neutral-600 mt-0.5">{String(siteAddress)}</p>
          <div className="mt-3 inline-block rounded bg-neutral-100 px-3 py-1 font-mono text-xs font-bold uppercase text-neutral-800">
            SURAT BUKTI SERAH TERIMA PEMINJAMAN PERALATAN
          </div>
          <p className="mt-1 text-xs text-neutral-500 font-mono">
            No: {loan.code}
          </p>
        </div>

        {/* Informasi Peminjam */}
        <div className="mt-6 grid grid-cols-2 gap-4 text-xs">
          <div className="space-y-1.5">
            <div>
              <span className="text-neutral-500 block">Nama Peminjam / Penanggung Jawab:</span>
              <span className="font-semibold text-neutral-900 text-sm">
                {loan.borrowerName}
              </span>
            </div>
            <div>
              <span className="text-neutral-500 block">No. Telepon / WhatsApp:</span>
              <span className="font-medium text-neutral-900">
                {loan.borrowerPhone}
              </span>
            </div>
            <div>
              <span className="text-neutral-500 block">Alamat / Lingkungan:</span>
              <span className="font-medium text-neutral-900">
                {loan.borrowerAddress || '-'}
              </span>
            </div>
          </div>

          <div className="space-y-1.5">
            <div>
              <span className="text-neutral-500 block">Keperluan / Acara:</span>
              <span className="font-medium text-neutral-900">
                {loan.purpose}
              </span>
            </div>
            <div>
              <span className="text-neutral-500 block">Tanggal Pinjam:</span>
              <span className="font-medium text-neutral-900">
                {formatDateID(loan.loanDate)}
              </span>
            </div>
            <div>
              <span className="text-neutral-500 block">Batas Waktu Pengembalian:</span>
              <span className="font-bold text-neutral-900">
                {formatDateID(loan.expectedReturn)}
              </span>
            </div>
          </div>
        </div>

        {/* Tabel Rincian Barang */}
        <div className="mt-6">
          <p className="text-xs font-bold uppercase tracking-wider text-neutral-700 mb-2">
            Rincian Barang yang Diserahterimakan:
          </p>
          <table className="w-full text-left text-xs border border-neutral-300">
            <thead className="bg-neutral-100 border-b border-neutral-300 font-bold uppercase">
              <tr>
                <th className="p-2 border-r border-neutral-300 w-10 text-center">No</th>
                <th className="p-2 border-r border-neutral-300">Kode</th>
                <th className="p-2 border-r border-neutral-300">Nama Barang</th>
                <th className="p-2 border-r border-neutral-300 text-center w-20">Jumlah</th>
                <th className="p-2">Kondisi Awal / Catatan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {loan.items.map((item, idx) => (
                <tr key={item.id}>
                  <td className="p-2 border-r border-neutral-200 text-center">{idx + 1}</td>
                  <td className="p-2 border-r border-neutral-200 font-mono font-semibold">
                    {item.item.code}
                  </td>
                  <td className="p-2 border-r border-neutral-200 font-medium">
                    {item.item.name}
                  </td>
                  <td className="p-2 border-r border-neutral-200 text-center font-bold">
                    {item.borrowedQty} unit
                  </td>
                  <td className="p-2 text-neutral-600">
                    Baik & Lengkap
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {loan.notes && (
          <div className="mt-4 rounded bg-neutral-50 p-2.5 text-xs text-neutral-600 border border-neutral-200">
            <strong className="text-neutral-800">Catatan Tambahan:</strong> {loan.notes}
          </div>
        )}

        {/* Syarat & Ketentuan */}
        <div className="mt-6 border-t border-neutral-200 pt-3 text-[11px] text-neutral-500 space-y-1">
          <p className="font-semibold text-neutral-700">Ketentuan Peminjaman:</p>
          <ol className="list-decimal list-inside space-y-0.5">
            <li>Barang inventaris masjid adalah amanah umat, wajib dijaga kebersihan dan keutuhannya.</li>
            <li>Pengembalian barang wajib tepat waktu sesuai batas tanggal yang disepakati.</li>
            <li>Peminjam bersedia bertanggung jawab apabila terjadi kerusakan berat atau kehilangan.</li>
          </ol>
        </div>

        {/* Kolom Tanda Tangan */}
        <div className="mt-10 grid grid-cols-2 gap-8 text-center text-xs">
          <div>
            <p className="text-neutral-600">Pihak Peminjam,</p>
            <div className="h-20" />
            <p className="font-bold underline text-neutral-900">{loan.borrowerName}</p>
            <p className="text-[10px] text-neutral-500">Warga / Penanggung Jawab</p>
          </div>

          <div>
            <p className="text-neutral-600">Petugas DKM yang Menyerahkan,</p>
            <div className="h-20" />
            <p className="font-bold underline text-neutral-900">{loan.officerOut}</p>
            <p className="text-[10px] text-neutral-500">Seksi Sarpras / Marbot</p>
          </div>
        </div>
      </div>
    </div>
  )
}

