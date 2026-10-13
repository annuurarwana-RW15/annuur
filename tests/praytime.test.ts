import { describe, expect, it } from 'vitest'
import { getPrayerTimes, nextPrayer } from '@/lib/praytime'

const JAKARTA_FIXTURE = {
  imsak: '04:30',
  subuh: '05:00',
  dzuhur: '13:10',
  ashar: '15:45',
  maghrib: '18:20',
  isya: '19:40',
}

describe('getPrayerTimes', () => {
  it('returns Jakarta times by default', () => {
    const result = getPrayerTimes('Jakarta')
    expect(result).toEqual(JAKARTA_FIXTURE)
  })

  it('returns times for Bandung', () => {
    const result = getPrayerTimes('Bandung')
    expect(result.imsak).toBe('04:35')
    expect(result.subuh).toBe('05:05')
    expect(result.isya).toBe('19:42')
  })

  it('returns empty strings for unsupported city', () => {
    const result = getPrayerTimes('Bandar Lampung')
    expect(result.imsak).toBe('')
    expect(result.subuh).toBe('')
    expect(result.isya).toBe('')
  })

  it('returns fixture data', () => {
    const result = getPrayerTimes('Jakarta')
    expect(result).toEqual(JAKARTA_FIXTURE)
  })
})

describe('nextPrayer', () => {
  const jakartaTimes = {
    imsak: '04:30',
    subuh: '05:00',
    dzuhur: '13:10',
    ashar: '15:45',
    maghrib: '18:20',
    isya: '19:40',
  }

  it('returns the next prayer after current time', () => {
    const now = new Date('2026-10-27T10:00:00')
    const result = nextPrayer(jakartaTimes, now)
    expect(result.name).toBe('Dzuhur')
    expect(result.at.getHours()).toBe(13)
    expect(result.at.getMinutes()).toBe(10)
  })

  it('returns Ashar if after Dzuhur but before Maghrib', () => {
    const now = new Date('2026-10-27T15:00:00')
    const result = nextPrayer(jakartaTimes, now)
    expect(result.name).toBe('Ashar')
    expect(result.at.getHours()).toBe(15)
    expect(result.at.getMinutes()).toBe(45)
  })

  it('returns Maghrib after Ashar', () => {
    const now = new Date('2026-10-27T16:00:00')
    const result = nextPrayer(jakartaTimes, now)
    expect(result.name).toBe('Maghrib')
    expect(result.at.getHours()).toBe(18)
    expect(result.at.getMinutes()).toBe(20)
  })

  it('returns Isya after Maghrib', () => {
    const now = new Date('2026-10-27T19:00:00')
    const result = nextPrayer(jakartaTimes, now)
    expect(result.name).toBe('Isya')
    expect(result.at.getHours()).toBe(19)
    expect(result.at.getMinutes()).toBe(40)
  })

  it('returns Subuh besok if current time after Isya', () => {
    const now = new Date('2026-10-27T20:00:00')
    const result = nextPrayer(jakartaTimes, now)
    expect(result.name).toBe('Subuh')
    expect(result.at.getHours()).toBe(5)
    expect(result.at.getDate()).toBe(28)
  })

  it('returns Subuh besok if current time exactly at Isya', () => {
    const now = new Date('2026-10-27T19:40:00')
    const result = nextPrayer(jakartaTimes, now)
    expect(result.name).toBe('Subuh')
    expect(result.at.getHours()).toBe(5)
    expect(result.at.getDate()).toBe(28)
  })
})