import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { getSetting } from '@/lib/settings'
import { asText } from '@/components/public/content'
import {
  PROFIL_FALLBACK,
  ProfilProse,
  profilText,
} from '@/components/public/ProfilSection'
import { SectionHeading } from '@/components/public/SectionHeading'
import { ShareButton } from '@/components/public/ShareButton'
import { KATEGORI_LABELS, type PengurusKategori } from '@/lib/pengurus'
import { getPengurusList } from '@/lib/pengurus-server'

export const revalidate = 60

export const metadata: Metadata = {
  title: 'Profil & Kepengurusan',
  description: 'Sejarah, visi misi, identitas masjid, dan struktur kepengurusan DKM Masjid An-nuur Arwana.',
}

const KATEGORI_ORDER: PengurusKategori[] = ['PENASEHAT', 'PIMPINAN', 'BIDANG', 'OPERASIONAL']

export default async function ProfilPage() {
  const section = await db.section.findFirst({
    where: { key: 'profil', isVisible: true },
  })
  if (!section) notFound()

  const [address, phone, city, pengurusList] = await Promise.all([
    getSetting('site.address', ''),
    getSetting('site.phone', ''),
    getSetting('site.city', ''),
    getPengurusList(),
  ])

  const tel = asText(phone)
  const facts = [
    { label: 'Alamat', value: asText(address), href: '' },
    {
      label: 'Telepon',
      value: tel,
      href: tel ? `tel:${tel.replace(/[^\d+]/g, '')}` : '',
    },
    { label: 'Kota', value: asText(city), href: '' },
  ].filter((fact) => fact.value)

  const activePengurus = pengurusList.filter((p) => p.isActive)

  return (
    <div className="bg-krem min-h-screen">
      {/* 1. Profil & Visi Misi */}
      <section className="relative overflow-hidden bg-krem">
        {/* Background foto masjid yang ter-blend halus */}
        <div
          className="pointer-events-none absolute inset-0 select-none overflow-hidden"
          aria-hidden="true"
        >
          <Image
            src="/images/profil-masjid.jpg"
            alt=""
            role="presentation"
            fill
            sizes="100vw"
            className="object-cover object-[80%_center] opacity-35 md:opacity-50 filter saturate-[1.1]"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-krem/70 via-krem/90 to-krem" />
          <div className="absolute inset-0 bg-gradient-to-r from-krem via-krem/90 via-35% to-transparent" />
        </div>

        <div className="relative z-10 mx-auto max-w-6xl px-4 py-10 sm:py-14">
          {/* Breadcrumb navigasi */}
          <nav aria-label="Breadcrumb" className="text-sm text-hijau-tua/70 mb-6">
            <ol className="flex flex-wrap items-center gap-2">
              <li>
                <Link href="/" className="transition hover:text-hijau hover:underline">
                  Beranda
                </Link>
              </li>
              <li aria-hidden="true">›</li>
              <li aria-current="page" className="font-medium text-hijau-tua">
                Profil &amp; Kepengurusan
              </li>
            </ol>
          </nav>

          <header className="mb-8">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emas/40 bg-krem-tua px-3 py-1 text-xs font-semibold uppercase tracking-[0.15em] text-emas-tua">
              <span>🕌</span> Tentang Masjid Kami
            </span>
            <SectionHeading as="h1" className="mt-3">
              {section.title || 'Profil Masjid'}
            </SectionHeading>
          </header>

          {/* Banner foto gedung Masjid An-Nuur */}
          <div className="relative mb-8 h-64 sm:h-80 md:h-96 w-full overflow-hidden rounded-3xl border border-emas/30 shadow-md">
            <Image
              src="/images/profil-masjid.jpg"
              alt="Masjid An-Nuur Arwana"
              fill
              priority
              className="object-cover object-[center_35%]"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
            <div className="absolute bottom-5 left-5 sm:bottom-7 sm:left-7 text-white">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emas/90 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-hijau-tua">
                Masjid An-Nuur Arwana
              </span>
              <p className="mt-2 text-sm sm:text-base text-white/90 font-medium">
                Pusat Peribadahan, Ukhuwah, dan Pembinaan Jamaah
              </p>
            </div>
          </div>

          {/* Card utama konten profil dengan tata letak tipografi rapi */}
          <div className="rounded-3xl border border-emas/20 bg-white/95 p-6 sm:p-10 lg:p-12 shadow-xs backdrop-blur-xs">
            <ProfilProse
              text={profilText(section) || PROFIL_FALLBACK}
              className="max-w-none"
            />

            <div className="mt-8 border-t border-emas/15 pt-5">
              <ShareButton
                title="Profil & Struktur Kepengurusan DKM Masjid An-Nuur Arwana"
                text="Mengenal lebih dekat visi, misi, sejarah, dan struktur kepengurusan DKM Masjid An-Nuur Arwana."
                url="/profil"
                variant="inline"
                label="Bagikan Profil Masjid"
              />
            </div>
          </div>

        {/* Informasi Kontak & Lokasi Masjid */}
        {facts.length > 0 && (
          <div className="ornament mt-8 rounded-3xl bg-hijau p-6 text-krem sm:p-8 shadow-sm">
            <h2 className="font-display text-2xl font-bold">Informasi Masjid</h2>
            <dl className="mt-4 grid gap-5 sm:grid-cols-3">
              {facts.map((fact) => (
                <div key={fact.label} className="rounded-xl bg-white/5 p-4 border border-white/10">
                  <dt className="text-xs font-semibold uppercase tracking-[0.15em] text-emas">
                    {fact.label}
                  </dt>
                  <dd className="mt-1 leading-relaxed text-krem/90">
                    {fact.href ? (
                      <a
                        href={fact.href}
                        className="font-medium transition hover:text-emas-muda hover:underline"
                      >
                        {fact.value}
                      </a>
                    ) : (
                      fact.value
                    )}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        )}
        </div>
      </section>

      {/* 2. Struktur Kepengurusan DKM */}
      <section className="border-t border-emas/20 bg-white/70 py-16">
        <div className="mx-auto max-w-6xl px-4">
          <div className="max-w-3xl">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-emas-tua">
              Amanah &amp; Pelayanan Jamaah
            </p>
            <h2 className="mt-1 font-display text-3xl font-bold text-hijau sm:text-4xl">
              Struktur Kepengurusan DKM
            </h2>
            <p className="mt-3 text-base leading-relaxed text-hijau-tua/80">
              Jajaran pengurus Dewan Kemakmuran Masjid (DKM) An-nuur Arwana yang mengemban amanah
              dalam mengelola kegiatan peribadahan, kemakmuran, dakwah, dan pemeliharaan fasilitas masjid.
            </p>
          </div>

          <div className="mt-12 space-y-12">
            {KATEGORI_ORDER.map((kategori) => {
              const items = activePengurus.filter((p) => p.kategori === kategori)
              if (items.length === 0) return null

              return (
                <div key={kategori} className="space-y-6">
                  <div className="flex items-center gap-3 border-b border-emas/25 pb-3">
                    <span className="h-2 w-2 rounded-full bg-emas" />
                    <h3 className="font-display text-xl font-bold text-hijau-tua">
                      {KATEGORI_LABELS[kategori]}
                    </h3>
                    <span className="rounded-full bg-emas/15 px-2.5 py-0.5 text-xs font-semibold text-hijau-tua">
                      {items.length} Personel
                    </span>
                  </div>

                  <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {items.map((person) => (
                      <div
                        key={person.id}
                        className="flex flex-col justify-between rounded-2xl border border-emas/20 bg-white p-6 shadow-xs transition duration-200 hover:border-emas/50 hover:shadow-md"
                      >
                        <div>
                          <div className="flex items-start gap-4">
                            {person.foto ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={person.foto}
                                alt={person.nama}
                                className="h-14 w-14 shrink-0 rounded-full object-cover border-2 border-emas/30"
                              />
                            ) : (
                              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-hijau/10 font-bold text-hijau text-lg">
                                {person.nama
                                  .split(' ')
                                  .slice(0, 2)
                                  .map((n) => n[0])
                                  .join('')}
                              </div>
                            )}

                            <div className="min-w-0 flex-1">
                              <h4 className="font-bold text-neutral-900 leading-snug">
                                {person.nama}
                              </h4>
                              <p className="mt-0.5 text-xs font-semibold text-emas-tua">
                                {person.jabatan}
                              </p>
                            </div>
                          </div>

                          <div className="mt-4 rounded-xl bg-krem/60 p-3.5 text-xs leading-relaxed text-hijau-tua/85">
                            <p className="font-semibold text-hijau-tua mb-1">Tugas &amp; Tanggung Jawab:</p>
                            <p>{person.tugas || 'Menjalankan tugas amanah kepengurusan DKM.'}</p>
                          </div>

                          <div className="mt-4 flex flex-wrap items-center gap-2">
                            {person.isKhotib && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800 border border-emerald-200">
                                <span>🕌</span> Khotib Jumat
                              </span>
                            )}
                            {person.isImam && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-[11px] font-semibold text-blue-800 border border-blue-200">
                                <span>📖</span> Imam Sholat
                              </span>
                            )}
                          </div>
                        </div>

                        {person.telepon && (
                          <div className="mt-5 border-t border-neutral-100 pt-3">
                            <a
                              href={`https://wa.me/${person.telepon.replace(/\D/g, '').replace(/^0/, '62')}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 hover:text-emerald-900 transition hover:underline"
                            >
                              <span>💬 Hubungi Pengurus (WhatsApp)</span>
                            </a>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>
    </div>
  )
}
