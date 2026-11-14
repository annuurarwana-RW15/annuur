'use client'

import { useState } from 'react'
import type { Section } from '@prisma/client'
import { readField } from '@/app/admin/(dashboard)/sections/section-content'
import { asText } from './content'
import { GoogleMapEmbed, MapLink } from './MapEmbed'
import { SectionHeading } from './SectionHeading'

export interface ContactFallbacks {
  alamat?: string
  telp?: string
  email?: string
  whatsapp?: string
}

interface ContactSectionProps {
  section: Section
  /** Nilai Setting (`site.address` / `site.phone`) bila field section kosong. */
  fallbacks?: ContactFallbacks
  /** Level judul section — `h1` bila komponen dipakai sebagai halaman standalone. */
  headingAs?: 'h1' | 'h2'
}

function formatWhatsAppLink(phone: string, text = "Assalamu'alaikum Pengurus DKM Masjid An-nuur Arwana"): string {
  const digits = phone.replace(/\D/g, '')
  if (!digits) return ''
  const normalized = digits.startsWith('0') ? '62' + digits.slice(1) : digits
  return `https://wa.me/${normalized}?text=${encodeURIComponent(text)}`
}

export function ContactSection({
  section,
  fallbacks,
  headingAs = 'h2',
}: ContactSectionProps) {
  const [copiedAlamat, setCopiedAlamat] = useState(false)

  const alamat =
    asText(readField(section.content, 'kontak', 'alamat')) ||
    asText(fallbacks?.alamat)
  const telp =
    asText(readField(section.content, 'kontak', 'telp')) ||
    asText(fallbacks?.telp)
  const whatsapp =
    asText(readField(section.content, 'kontak', 'whatsapp')) ||
    asText(readField(section.content, 'kontak', 'wa')) ||
    asText(fallbacks?.whatsapp)
  const email =
    asText(readField(section.content, 'kontak', 'email')) ||
    asText(fallbacks?.email)
  const jam = asText(readField(section.content, 'kontak', 'jam'))
  const mapQuery = asText(readField(section.content, 'kontak', 'mapQuery'))
  const mapUrl = asText(readField(section.content, 'kontak', 'mapUrl'))

  // Tentukan nomor WhatsApp (gunakan whatsapp eksplisit atau telp jika berformat nomor seluler)
  const waNumber = whatsapp || (telp && /^(08|628|\+628)/.test(telp.replace(/\s+/g, '')) ? telp : '')
  const waHref = waNumber ? formatWhatsAppLink(waNumber) : ''

  function copyAlamatToClipboard() {
    if (!alamat) return
    navigator.clipboard.writeText(alamat).then(() => {
      setCopiedAlamat(true)
      setTimeout(() => setCopiedAlamat(false), 2500)
    })
  }

  const hasAnyContact = Boolean(alamat || telp || email || jam || waNumber)

  return (
    <section id="kontak" aria-labelledby="kontak-judul" className="bg-krem py-12 sm:py-16">
      <div className="mx-auto max-w-6xl px-4">
        <div className="text-center sm:text-left">
          <span className="inline-block rounded-full bg-emas/20 px-3.5 py-1 text-xs font-bold text-emas-tua border border-emas/30 uppercase tracking-wider">
            Hubungi &amp; Kunjungi Kami
          </span>
          <div className="mt-2">
            <SectionHeading as={headingAs} id="kontak-judul">
              {section.title || 'Kontak & Lokasi'}
            </SectionHeading>
          </div>
          <p className="mt-2 text-sm text-hijau-tua/75 max-w-2xl leading-relaxed">
            Silakan hubungi sekretariat DKM untuk informasi ibadah, konfirmasi donasi, kegiatan keumatan, atau kunjungi lokasi masjid kami secara langsung.
          </p>
        </div>

        <div className="mt-8 grid gap-6 lg:gap-8 lg:grid-cols-12 items-start">
          {/* Kolom Kiri: Kartu Informasi Kontak Lengkap */}
          <div className="lg:col-span-5 rounded-2xl border border-emas/30 bg-white p-5 sm:p-7 shadow-sm flex flex-col justify-between">
            <div>
              <h3 className="font-display text-lg sm:text-xl font-bold text-hijau-tua border-b border-black/5 pb-2.5 sm:pb-3">
                Informasi Kontak
              </h3>

              {!hasAnyContact ? (
                <p className="mt-4 text-sm text-hijau-tua/70 leading-relaxed">
                  Informasi kontak sedang disiapkan oleh pengurus DKM.
                </p>
              ) : (
                <div className="mt-5 space-y-5">
                  {/* Alamat */}
                  {alamat && (
                    <div className="flex items-start gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                        📍
                      </div>
                      <div className="min-w-0 flex-1">
                        <dt className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
                          Alamat Masjid
                        </dt>
                        <dd className="mt-0.5 text-sm font-medium leading-relaxed text-hijau-tua">
                          {alamat}
                        </dd>
                        <button
                          type="button"
                          onClick={copyAlamatToClipboard}
                          className="mt-1.5 inline-flex items-center gap-1 rounded-md bg-neutral-100 px-2 py-0.5 text-[11px] font-semibold text-neutral-700 hover:bg-neutral-200 transition"
                          title="Salin alamat lengkap"
                        >
                          <span>{copiedAlamat ? '✓' : '📋'}</span>
                          <span>{copiedAlamat ? 'Alamat Tersalin' : 'Salin Alamat'}</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Telepon */}
                  {telp && (
                    <div className="flex items-start gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                        📞
                      </div>
                      <div className="min-w-0 flex-1">
                        <dt className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
                          Telepon Sekretariat
                        </dt>
                        <dd className="mt-0.5 text-sm font-semibold text-hijau-tua">
                          <a
                            href={`tel:${telp.replace(/[^\d+]/g, '')}`}
                            className="hover:text-green-700 hover:underline transition"
                          >
                            {telp}
                          </a>
                        </dd>
                      </div>
                    </div>
                  )}

                  {/* WhatsApp */}
                  {waHref && (
                    <div className="flex items-start gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-green-50 text-green-700 border border-green-200">
                        💬
                      </div>
                      <div className="min-w-0 flex-1">
                        <dt className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
                          WhatsApp Official
                        </dt>
                        <dd className="mt-0.5 text-sm font-semibold text-hijau-tua">
                          <span>{waNumber}</span>
                        </dd>
                        <a
                          href={waHref}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-1.5 inline-flex items-center gap-1.5 rounded-full bg-[#25D366] px-3 py-1 text-xs font-bold text-white shadow-xs hover:bg-[#20ba59] transition"
                        >
                          <span>💬</span>
                          <span>Chat WhatsApp DKM</span>
                        </a>
                      </div>
                    </div>
                  )}

                  {/* Email */}
                  {email && (
                    <div className="flex items-start gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                        ✉️
                      </div>
                      <div className="min-w-0 flex-1">
                        <dt className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
                          Email Resmi
                        </dt>
                        <dd className="mt-0.5 text-sm font-medium text-hijau-tua">
                          <a
                            href={`mailto:${email}`}
                            className="hover:text-green-700 hover:underline transition"
                          >
                            {email}
                          </a>
                        </dd>
                      </div>
                    </div>
                  )}

                  {/* Jam Layanan */}
                  {jam && (
                    <div className="flex items-start gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                        🕒
                      </div>
                      <div className="min-w-0 flex-1">
                        <dt className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
                          Jam Layanan &amp; Kunjungan
                        </dt>
                        <dd className="mt-0.5 text-sm leading-relaxed text-hijau-tua">
                          {jam}
                        </dd>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Catatan Kunjungan */}
            <div className="mt-6 rounded-xl bg-neutral-50 p-3.5 border border-black/5 text-xs text-neutral-600 leading-relaxed">
              💡 <strong>Tips:</strong> Untuk konsultasi keagamaan atau permohonan penggunaan fasilitas masjid, silakan hubungi pengurus DKM terlebih dahulu melalui WhatsApp atau telepon.
            </div>
          </div>

          {/* Kolom Kanan: Peta Google Maps Interaktif */}
          <div className="lg:col-span-7">
            <div className="mb-2.5 sm:mb-3 flex items-center justify-between gap-2">
              <h3 className="font-display text-lg sm:text-xl font-bold text-hijau-tua flex items-center gap-2">
                <span>🗺️</span>
                <span>Peta Lokasi Google Maps</span>
              </h3>
              {alamat && (
                <MapLink
                  query={mapQuery || alamat}
                  directUrl={mapUrl}
                  className="text-xs font-semibold text-green-900 hover:underline shrink-0"
                >
                  Buka Peta Penuh ↗
                </MapLink>
              )}
            </div>

            <GoogleMapEmbed
              mapQuery={mapQuery}
              mapUrl={mapUrl}
              alamat={alamat}
              title={`Peta Lokasi ${section.title || 'Masjid An-nuur Arwana'}`}
            />
          </div>
        </div>
      </div>
    </section>
  )
}
