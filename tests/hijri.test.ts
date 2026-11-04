import { describe, expect, it } from 'vitest'
import {
  formatFullIndonesianDateTime,
  getHijriMonthGrid,
  getHijriParts,
  HIJRI_MONTHS_ID,
  ISLAMIC_EVENTS,
} from '@/lib/hijri'

describe('hijri library', () => {
  it('getHijriParts mengembalikan komponen hari, bulan, dan tahun valid', () => {
    const fixedDate = new Date('2026-11-04T12:00:00Z')
    const parts = getHijriParts(fixedDate)

    expect(parts.year).toBeGreaterThanOrEqual(1447)
    expect(parts.month).toBeGreaterThanOrEqual(1)
    expect(parts.month).toBeLessThanOrEqual(12)
    expect(parts.day).toBeGreaterThanOrEqual(1)
    expect(parts.day).toBeLessThanOrEqual(30)
  })

  it('formatFullIndonesianDateTime menghasilkan teks lengkap berbahasa Indonesia', () => {
    const fixedDate = new Date('2026-11-04T12:00:00Z')
    const res = formatFullIndonesianDateTime(fixedDate)

    expect(res.dayName).toMatch(/Rabu|Wednesday/i)
    expect(res.dateMasehi).toContain('2026')
    expect(res.timeWib).toContain('WIB')
    expect(res.hijriText).toMatch(/\d+\s+(Muharram|Safar|Rabiul|Jumadil|Rajab|Sya'ban|Ramadhan|Syawal|Dzulqa'dah|Dzulhijjah).*\s+144\d\s+H/i)
  })

  it('getHijriMonthGrid menghasilkan jumlah hari 29 atau 30 hari untuk satu bulan Hijriah', () => {
    const today = new Date('2026-11-04T12:00:00Z')
    const currentH = getHijriParts(today)

    const grid = getHijriMonthGrid(currentH.year, currentH.month, today)
    expect(grid.length).toBeGreaterThanOrEqual(29)
    expect(grid.length).toBeLessThanOrEqual(30)

    // Memverifikasi penandaan hari Jumat
    const fridays = grid.filter((d) => d.isJumat)
    expect(fridays.length).toBeGreaterThanOrEqual(4)
    fridays.forEach((f) => expect(f.dayOfWeek).toBe(5))

    // Memverifikasi penandaan hari ini
    const todayCell = grid.find((d) => d.isToday)
    expect(todayCell).toBeDefined()
    expect(todayCell?.hDay).toBe(currentH.day)

    // Memverifikasi penandaan puasa sunnah Ayyamul Bidh (13, 14, 15)
    const ayyamulBidh = grid.filter((d) => d.fastType === 'Ayyamul Bidh')
    expect(ayyamulBidh.map((d) => d.hDay)).toEqual([13, 14, 15])
  })

  it('ISLAMIC_EVENTS memuat momentum penting umat Islam', () => {
    expect(ISLAMIC_EVENTS.length).toBeGreaterThan(5)
    expect(ISLAMIC_EVENTS.some((ev) => ev.name.includes('Tahun Baru Islam'))).toBe(true)
    expect(ISLAMIC_EVENTS.some((ev) => ev.name.includes('Idul Fitri'))).toBe(true)
    expect(ISLAMIC_EVENTS.some((ev) => ev.name.includes('Idul Adha'))).toBe(true)
  })

  it('HIJRI_MONTHS_ID memuat 12 nama bulan Hijriah baku', () => {
    expect(HIJRI_MONTHS_ID).toHaveLength(12)
    expect(HIJRI_MONTHS_ID[0]).toBe('Muharram')
    expect(HIJRI_MONTHS_ID[8]).toBe('Ramadhan')
    expect(HIJRI_MONTHS_ID[11]).toBe('Dzulhijjah')
  })
})

