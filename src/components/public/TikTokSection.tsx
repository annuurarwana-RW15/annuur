import type { Section } from '@prisma/client'
import { readField } from '@/app/admin/(dashboard)/sections/section-content'
import { asText } from './content'
import { SectionHeading } from './SectionHeading'
import { TikTokWidget } from './TikTokWidget'

export function TikTokSection({ section }: { section: Section }) {
  const username = asText(
    readField(section.content, 'tiktok', 'username'),
    '@masjidannuurarwana',
  )
  const accountUrl = asText(
    readField(section.content, 'tiktok', 'accountUrl'),
    'https://www.tiktok.com/@masjidannuurarwana',
  )
  const description = asText(
    readField(section.content, 'tiktok', 'title'),
    'Ikuti kabar dakwah, cuplikan kegiatan, dan kajian bermanfaat melalui akun TikTok resmi Masjid An-nuur Arwana.',
  )
  const videoId = asText(readField(section.content, 'tiktok', 'videoId'), '')

  return (
    <section
      id="tiktok"
      aria-labelledby="tiktok-judul"
      className="bg-krem-tua/40 py-14"
    >
      <div className="mx-auto max-w-6xl px-4">
        <SectionHeading id="tiktok-judul">{section.title}</SectionHeading>
        <div className="mt-8">
          <TikTokWidget
            username={username}
            accountUrl={accountUrl}
            videoId={videoId}
            description={description}
          />
        </div>
      </div>
    </section>
  )
}

