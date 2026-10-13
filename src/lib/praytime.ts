type PrayerTimes = Record<
  'imsak' | 'subuh' | 'dzuhur' | 'ashar' | 'maghrib' | 'isya',
  string
>

const CITIES_FIXTURE: Record<string, PrayerTimes> = {
  Jakarta: { imsak: '04:30', subuh: '05:00', dzuhur: '13:10', ashar: '15:45', maghrib: '18:20', isya: '19:40' },
  Bandung: { imsak: '04:35', subuh: '05:05', dzuhur: '13:12', ashar: '15:48', maghrib: '18:22', isya: '19:42' },
  Surabaya: { imsak: '04:28', subuh: '04:58', dzuhur: '13:15', ashar: '15:40', maghrib: '18:18', isya: '19:38' },
}

export function getPrayerTimes(
  city: string
): PrayerTimes {
  const normalizedCity = city.trim()
  const times: PrayerTimes =
    CITIES_FIXTURE[normalizedCity] || {
      imsak: '',
      subuh: '',
      dzuhur: '',
      ashar: '',
      maghrib: '',
      isya: '',
    }
  return times
}

export function nextPrayer(
  times: Record<string, string>,
  now: Date
): { name: string; at: Date } {
  const prayerOrder = ['imsak', 'subuh', 'dzuhur', 'ashar', 'maghrib', 'isya']
  const prayerNames = ['Imsak', 'Subuh', 'Dzuhur', 'Ashar', 'Maghrib', 'Isya']

  const nowMinutes = now.getHours() * 60 + now.getMinutes()

  for (let i = 0; i < prayerOrder.length; i++) {
    const key = prayerOrder[i]
    const timeStr = times[key] || ''
    if (!timeStr) continue
    const [hourStr, minuteStr] = timeStr.split(':')
    const prayerHour = parseInt(hourStr, 10)
    const prayerMinute = parseInt(minuteStr, 10)
    const prayerMinutes = prayerHour * 60 + prayerMinute

    if (prayerMinutes > nowMinutes) {
      const at = new Date(now)
      at.setHours(prayerHour, prayerMinute, 0)
      if (at <= now) {
        at.setDate(at.getDate() + 1)
      }
      return { name: prayerNames[i], at }
    }
  }

  // After Isya → Subuh besok
  const at = new Date(now)
  at.setDate(at.getDate() + 1)
  at.setHours(5, 0, 0)
  return { name: 'Subuh', at }
}