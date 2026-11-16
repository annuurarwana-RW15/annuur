import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import type { Section } from '@prisma/client'
import { ProfilProse, ProfilSection, profilText } from '@/components/public/ProfilSection'

afterEach(cleanup)

function makeSection(content: Record<string, unknown>): Section {
  return {
    id: 'sec-profil',
    key: 'profil',
    title: 'Profil Masjid',
    isVisible: true,
    order: 1,
    content: content as unknown as Section['content'],
    updatedAt: new Date(),
  }
}

describe('ProfilProse', () => {
  it('merender HTML kaya jika input adalah rich HTML', () => {
    const html = '<p>Masjid An-Nuur Arwana berdiri megah.</p><p>Melayani jamaah dengan ikhlas.</p>'
    render(<ProfilProse text={html} />)

    expect(screen.getByText('Masjid An-Nuur Arwana berdiri megah.')).toBeInTheDocument()
    expect(screen.getByText('Melayani jamaah dengan ikhlas.')).toBeInTheDocument()
  })

  it('merender paragraf teks biasa jika input bukan HTML', () => {
    const text = 'Paragraf satu plain.\n\nParagraf dua plain.'
    render(<ProfilProse text={text} />)

    expect(screen.getByText('Paragraf satu plain.')).toBeInTheDocument()
    expect(screen.getByText('Paragraf dua plain.')).toBeInTheDocument()
  })
})

describe('ProfilSection', () => {
  it('menampilkan preview profil dan link selengkapnya', () => {
    const content = {
      text: '<p>Cuplikan profil awal.</p><hr data-readmore="true" class="readmore-marker" /><p>Bagian lanjutan yang tersembunyi di beranda.</p>',
    }
    const section = makeSection(content)
    render(<ProfilSection section={section} />)

    expect(screen.getByText('Cuplikan profil awal.')).toBeInTheDocument()
    expect(screen.queryByText('Bagian lanjutan yang tersembunyi di beranda.')).not.toBeInTheDocument()

    const link = screen.getByRole('link', { name: /Selengkapnya tentang masjid/i })
    expect(link).toHaveAttribute('href', '/profil')
  })

  it('ekstraksi profilText bekerja dengan format section content', () => {
    const section = makeSection({ text: 'Teks Profil' })
    expect(profilText(section)).toBe('Teks Profil')
  })
})
