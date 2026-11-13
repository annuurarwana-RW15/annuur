'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { QrisInfo } from '@/lib/qris'
import { formatWhatsAppLink } from '@/lib/whatsapp'
import { SectionHeading } from './SectionHeading'

export interface RekeningDisplayItem {
  bank: string
  no: string
  atasNama: string
  link?: string | null
}

export interface DonationSectionProps {
  qris: QrisInfo | null
  rekening?: readonly RekeningDisplayItem[]
  whatsapp?: string
}

function QrCodeIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <path d="M14 14h3v3h-3z" />
      <path d="M20 14v3h-3" />
      <path d="M14 20h6" />
    </svg>
  )
}

function CopyIcon({ className = 'h-3.5 w-3.5' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  )
}

function CheckIcon({ className = 'h-3.5 w-3.5' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

function ZoomInIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
      <line x1="11" y1="8" x2="11" y2="14" />
      <line x1="8" y1="11" x2="14" y2="11" />
    </svg>
  )
}

function DownloadIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  )
}

function CloseIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  )
}

export function DonationSection({
  qris,
  rekening = [],
  whatsapp,
}: DonationSectionProps) {
  const [copiedAccount, setCopiedAccount] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)

  const copyToClipboard = (accountNo: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(accountNo).then(() => {
        setCopiedAccount(accountNo)
        setTimeout(() => setCopiedAccount(null), 2500)
      })
    }
  }

  const waHref = whatsapp ? formatWhatsAppLink(whatsapp, "Assalamu'alaikum, saya ingin konfirmasi donasi / infaq untuk Masjid An-nuur Arwana") : ''

  return (
    <section
      id="donasi"
      aria-labelledby="donasi-judul"
      className="relative isolate overflow-hidden bg-gradient-to-b from-hijau-tua via-hijau to-hijau-tua text-krem py-14 sm:py-20"
    >
      {/* Ornamen latar bernuansa Islami */}
      <div
        aria-hidden="true"
        className="ornament absolute inset-0 opacity-40 pointer-events-none"
      />
      <div
        aria-hidden="true"
        className="absolute -top-24 -right-24 h-96 w-96 rounded-full bg-emas/10 blur-3xl pointer-events-none"
      />
      <div
        aria-hidden="true"
        className="absolute -bottom-24 -left-24 h-96 w-96 rounded-full bg-emas/10 blur-3xl pointer-events-none"
      />

      <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
        {/* Header Section */}
        <div className="text-center max-w-3xl mx-auto">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emas/40 bg-emas/15 px-3.5 py-1 text-xs font-semibold uppercase tracking-wider text-emas shadow-xs">
            <span className="h-1.5 w-1.5 rounded-full bg-emas animate-pulse" />
            Infaq, Sedekah &amp; Wakaf
          </span>
          <div className="mt-3">
            <SectionHeading id="donasi-judul" light>
              Salurkan Infaq &amp; Sedekah Terbaik Anda
            </SectionHeading>
          </div>
          <p className="mt-2 text-sm text-krem/80 sm:text-base leading-relaxed">
            Menjadi ladang amal jariyah yang pahalanya terus mengalir untuk kelancaran ibadah, santunan keumatan, serta pemeliharaan sarana Masjid An-nuur Arwana.
          </p>
        </div>

        {/* Grid Konten Kompak 2 Kolom */}
        <div className="mt-10 grid gap-8 lg:grid-cols-12 lg:items-start">
          {/* Kolom Kiri: Hadits Ajakan Sedekah & Tindakan Cepat */}
          <div className="lg:col-span-7 flex flex-col gap-5">
            {/* Kartu Hadits 1: HR. Muslim */}
            <div className="rounded-2xl border border-emas/30 bg-black/25 p-5 sm:p-6 backdrop-blur-md shadow-lg ring-1 ring-white/10">
              <div className="flex items-center justify-between border-b border-emas/20 pb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-emas">
                  Mutiara Hadits
                </span>
                <span className="rounded-full bg-emas/20 px-2.5 py-0.5 text-[11px] font-semibold text-emas">
                  HR. Muslim No. 2588
                </span>
              </div>
              <p
                lang="ar"
                dir="rtl"
                className="mt-4 font-arabic text-xl sm:text-2xl text-emas leading-relaxed tracking-wide text-right"
              >
                «مَا نَقَصَتْ صَدَقَةٌ مِنْ مَالٍ»
              </p>
              <p className="mt-3 text-sm italic text-krem/90 leading-relaxed">
                &ldquo;Sedekah itu tidak akan pernah mengurangi harta...&rdquo;
              </p>
              <p className="mt-2 text-xs text-krem/60">
                Rasulullah ﷺ menegaskan bahwa harta yang disedekahkan dengan ikhlas di jalan Allah akan senantiasa diberkahi, dilipatgandakan pahalanya, dan dilapangkan rezeki pemiliknya.
              </p>
            </div>

            {/* Kartu Hadits 2: Amal Jariyah */}
            <div className="rounded-2xl border border-white/15 bg-white/5 p-4 sm:p-5 backdrop-blur-xs">
              <div className="flex items-center gap-2 text-emas">
                <span className="text-sm font-bold">✨ Keutamaan Amal Jariyah</span>
                <span className="text-xs text-krem/60">· HR. Muslim No. 1631</span>
              </div>
              <p className="mt-2 text-xs text-krem/80 leading-relaxed">
                &ldquo;Jika seorang insan meninggal dunia, terputuslah amalnya kecuali tiga perkara: <strong>sedekah jariyah</strong>, ilmu yang bermanfaat, atau anak shalih yang mendoakannya.&rdquo;
              </p>
            </div>

            {/* Rekening Transfer Bank Resmi */}
            {rekening.length > 0 && (
              <div className="rounded-2xl border border-emas/30 bg-black/20 p-5 backdrop-blur-sm shadow-md">
                <h3 className="text-xs font-bold uppercase tracking-wider text-emas">
                  Rekening Transfer Resmi DKM
                </h3>
                <div className="mt-3 flex flex-col gap-2.5">
                  {rekening.map((item) => {
                    const isCopied = copiedAccount === item.no

                    return (
                      <div
                        key={`${item.bank}-${item.no}`}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 transition hover:border-emas/40 hover:bg-white/10"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="rounded bg-emas px-2 py-0.5 text-[11px] font-bold text-hijau uppercase">
                              {item.bank}
                            </span>
                            <span className="font-mono text-sm sm:text-base font-bold text-white tracking-wider">
                              {item.no}
                            </span>
                          </div>
                          <p className="mt-0.5 text-xs text-krem/70">
                            a.n. <strong className="text-krem">{item.atasNama || 'Masjid An-nuur Arwana'}</strong>
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(item.no)}
                          className={`inline-flex shrink-0 items-center justify-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                            isCopied
                              ? 'bg-emerald-600 text-white'
                              : 'border border-emas/50 bg-emas/15 text-emas hover:bg-emas hover:text-hijau'
                          }`}
                        >
                          {isCopied ? (
                            <>
                              <CheckIcon className="h-3.5 w-3.5" />
                              <span>Tersalin!</span>
                            </>
                          ) : (
                            <>
                              <CopyIcon className="h-3.5 w-3.5" />
                              <span>Salin Rekening</span>
                            </>
                          )}
                        </button>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Shortcut Aksi Navigasi */}
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <Link
                href="/donasi"
                className="inline-flex items-center gap-2 rounded-full bg-emas px-5 py-2.5 text-xs sm:text-sm font-semibold text-hijau shadow-sm transition hover:bg-emas-muda"
              >
                <span>Konfirmasi Bukti Transfer</span>
                <span aria-hidden="true">→</span>
              </Link>
              <Link
                href="/donasi/status"
                className="inline-flex items-center gap-1.5 rounded-full border border-krem/30 px-4 py-2 text-xs sm:text-sm font-medium text-krem transition hover:bg-white/10 hover:text-white"
              >
                <span>Cek Status Donasi</span>
              </Link>
              <Link
                href="/laporan-kas"
                className="inline-flex items-center gap-1.5 rounded-full border border-emas/40 bg-emas/10 px-4 py-2 text-xs sm:text-sm font-medium text-emas transition hover:bg-emas/20"
              >
                <span>Transparansi Kas</span>
              </Link>
            </div>
          </div>

          {/* Kolom Kanan: Area Tampilan & Unduh QRIS */}
          <div className="lg:col-span-5 flex flex-col">
            <div className="rounded-3xl border border-emas/40 bg-hijau-tua/90 p-5 sm:p-6 backdrop-blur-xl shadow-2xl ring-1 ring-white/10">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <span className="grid h-7 w-7 place-items-center rounded-lg bg-emas text-hijau shadow-xs">
                    <QrCodeIcon className="h-4 w-4" />
                  </span>
                  <div>
                    <h3 className="text-sm font-bold text-white">QRIS Donasi Masjid</h3>
                    <p className="text-[11px] text-krem/70">Pindai &amp; bayar via aplikasi apa saja</p>
                  </div>
                </div>
                <span className="rounded-full border border-emerald-500/40 bg-emerald-500/20 px-2.5 py-0.5 text-[10px] font-bold text-emerald-300">
                  Resmi DKM
                </span>
              </div>

              {/* Area Gambar QRIS / Placeholder */}
              {qris && qris.image ? (
                <div className="mt-4 flex flex-col items-center">
                  <div className="relative group overflow-hidden rounded-2xl bg-white p-3 shadow-md ring-4 ring-emas/30 transition hover:ring-emas/60">
                    {/* eslint-disable-next-line @next/next/no-img-element -- Gambar upload dinamis R2/lokal admin */}
                    <img
                      src={qris.image}
                      alt="Kode QRIS Donasi Masjid An-nuur Arwana"
                      width={280}
                      height={280}
                      loading="lazy"
                      className="h-64 w-64 max-w-full object-contain cursor-pointer transition duration-200 group-hover:scale-102"
                      onClick={() => setShowModal(true)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowModal(true)}
                      className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-xs text-white text-xs font-semibold gap-1.5"
                    >
                      <ZoomInIcon className="h-4 w-4" />
                      <span>Klik untuk Memperbesar</span>
                    </button>
                  </div>

                  {qris.caption && (
                    <p className="mt-3 text-center text-xs font-semibold text-emas">
                      {qris.caption}
                    </p>
                  )}

                  {/* Tombol Interaktif QRIS */}
                  <div className="mt-4 flex w-full gap-2">
                    <button
                      type="button"
                      onClick={() => setShowModal(true)}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-white/20"
                    >
                      <ZoomInIcon className="h-3.5 w-3.5" />
                      <span>Perbesar</span>
                    </button>
                    <a
                      href={qris.image}
                      download="QRIS-Masjid-An-nuur-Arwana.png"
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-emas px-3 py-2 text-xs font-semibold text-hijau shadow-xs transition hover:bg-emas-muda"
                    >
                      <DownloadIcon className="h-3.5 w-3.5" />
                      <span>Unduh QRIS</span>
                    </a>
                  </div>

                  {/* Badge Dukungan Pembayaran */}
                  <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-3 text-center w-full">
                    <p className="text-[10px] uppercase tracking-wider text-krem/60 font-medium">
                      Menerima Pembayaran dari
                    </p>
                    <p className="mt-1 text-[11px] font-semibold text-krem/90">
                      BCA · Mandiri · BRI · BNI · BSI · GoPay · OVO · DANA · ShopeePay · LinkAja
                    </p>
                  </div>
                </div>
              ) : (
                /* Area Placeholder saat QRIS belum di-upload */
                <div className="mt-4 flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-emas/30 bg-white/5 p-8 text-center">
                  <div className="grid h-12 w-12 place-items-center rounded-full bg-emas/15 text-emas">
                    <QrCodeIcon className="h-6 w-6" />
                  </div>
                  <h4 className="mt-3 text-sm font-bold text-white">
                    Kode QRIS Sedang Disiapkan
                  </h4>
                  <p className="mt-1 text-xs text-krem/70 max-w-xs leading-relaxed">
                    Kode QRIS resmi sedang dalam proses verifikasi perbankan oleh pengurus DKM. Silakan salurkan infaq melalui transfer rekening resmi di samping.
                  </p>
                  <Link
                    href="/admin/pengaturan#qris"
                    className="mt-4 inline-flex items-center gap-1 rounded-full border border-emas/50 bg-emas/10 px-3 py-1 text-[11px] font-medium text-emas hover:bg-emas hover:text-hijau transition"
                  >
                    <span>Atur &amp; Upload QRIS di Dashboard</span>
                    <span aria-hidden="true">↗</span>
                  </Link>
                </div>
              )}

              {/* Bantuan WhatsApp */}
              {waHref && (
                <div className="mt-4 border-t border-white/10 pt-3 text-center">
                  <a
                    href={waHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-krem/75 hover:text-emas transition underline-offset-2 hover:underline"
                  >
                    <span>Ada pertanyaan mengenai donasi? Hubungi Kami via WhatsApp</span>
                    <span aria-hidden="true">→</span>
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal Lightbox Perbesar QRIS */}
      {showModal && qris?.image && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-qris-judul"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in-0"
          onClick={() => setShowModal(false)}
        >
          <div
            className="relative max-w-md w-full rounded-3xl bg-white p-6 shadow-2xl text-neutral-900 animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <div>
                <h3 id="modal-qris-judul" className="font-bold text-base text-hijau">
                  QRIS Donasi Masjid
                </h3>
                <p className="text-xs text-neutral-500">
                  {qris.caption || 'Masjid An-nuur Arwana'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="rounded-full p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 transition"
                aria-label="Tutup jendela"
              >
                <CloseIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="my-4 flex justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qris.image}
                alt="Kode QRIS Donasi Fullsize"
                width={360}
                height={360}
                className="h-auto max-h-[60vh] w-auto max-w-full rounded-xl object-contain shadow-xs"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <a
                href={qris.image}
                download="QRIS-Masjid-An-nuur-Arwana.png"
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-emas px-4 py-2.5 text-xs font-semibold text-hijau shadow-xs transition hover:bg-emas-muda"
              >
                <DownloadIcon className="h-4 w-4" />
                <span>Simpan Gambar</span>
              </a>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="rounded-xl border border-neutral-200 px-4 py-2.5 text-xs font-semibold text-neutral-600 hover:bg-neutral-50 transition"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
