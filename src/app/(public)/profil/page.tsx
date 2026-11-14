import type { Metadata } from 'next'
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
    <div className="bg-krem">
      {/* 1. Profil & Visi Misi */}
      <section className="mx-auto max-w-6xl px-4 py-14">
        <SectionHeading as="h1">{section.title || 'Profil Masjid'}</SectionHeading>

        <ProfilProse
          text={profilText(section) || PROFIL_FALLBACK}
          className="mt-6 max-w-3xl"
        />

        {facts.length > 0 && (
          <div className="ornament mt-10 rounded-2xl bg-hijau p-6 text-krem sm:p-8">
            <h2 className="font-display text-2xl font-bold">Informasi Masjid</h2>
            <dl className="mt-4 grid gap-5 sm:grid-cols-3">
              {facts.map((fact) => (
                <div key={fact.label}>
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
