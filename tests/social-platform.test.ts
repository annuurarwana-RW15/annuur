import { describe, expect, it } from 'vitest'
import { detectSocialPlatform } from '@/components/public/social-platform'

describe('detectSocialPlatform', () => {
  it('mendeteksi dari host URL lebih dulu', () => {
    expect(detectSocialPlatform('Profil', 'https://instagram.com/masjidannur')).toBe('instagram')
    expect(detectSocialPlatform('', 'https://www.facebook.com/masjidannur')).toBe('facebook')
    expect(detectSocialPlatform('', 'https://youtube.com/@masjidannur')).toBe('youtube')
    expect(detectSocialPlatform('', 'https://www.youtube.com/watch?v=x')).toBe('youtube')
    expect(detectSocialPlatform('', 'https://youtu.be/abc')).toBe('youtube')
    expect(detectSocialPlatform('', 'https://www.tiktok.com/@masjidannur')).toBe('tiktok')
    expect(detectSocialPlatform('', 'https://x.com/masjidannur')).toBe('x')
    expect(detectSocialPlatform('', 'https://twitter.com/masjidannur')).toBe('x')
    expect(detectSocialPlatform('', 'https://wa.me/6281234567890')).toBe('whatsapp')
    expect(detectSocialPlatform('', 'https://t.me/masjidannur')).toBe('telegram')
  })

  it('fallback ke label manual bila URL tidak dikenal', () => {
    expect(detectSocialPlatform('Instagram', 'https://contoh.web/id')).toBe('instagram')
    expect(detectSocialPlatform('Fanpage FB', 'https://contoh.web/fb')).toBe('facebook')
    expect(detectSocialPlatform('Kanal YouTube', '/yt')).toBe('youtube')
    expect(detectSocialPlatform('Saluran Telegram', '/chat')).toBe('telegram')
  })

  it('case-insensitive dan spasi bebas', () => {
    expect(detectSocialPlatform('INSTAGRAM', 'HTTPS://IG.PRO/x')).toBe('instagram')
    expect(detectSocialPlatform('you tube', '/kanal')).toBe('youtube')
    expect(detectSocialPlatform('whats app', '/wa')).toBe('whatsapp')
  })

  it('default website bila tidak ada petunjuk', () => {
    expect(detectSocialPlatform('', '')).toBe('website')
    expect(detectSocialPlatform('Grup Dakwah', 'https://contoh.web/grup')).toBe('website')
  })
})
