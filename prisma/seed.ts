import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { hash } from 'bcryptjs';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const SECTIONS = [
  {
    key: 'hero',
    title: 'Masjid An-Nur Arwana',
    order: 0,
    content: {
      heading: 'Masjid An-Nur Arwana',
      subheading: 'Masjid yang nyaman untuk beribadah dan berkembangnya umat',
      image: null,
      ctaLabel: 'Donasi Sekarang',
      ctaHref: '/donasi',
    },
  },
  {
    key: 'profil',
    title: 'Profil Masjid',
    order: 1,
    content: {
      body: 'Masjid An-Nur Arwana merupakan masjid kelolaan DKM yang melayani kebutuhan umat di wilayah Arwana.',
    },
  },
  {
    key: 'jadwal',
    title: 'Jadwal Sholat',
    order: 2,
    content: {
      city: 'Arwana',
      method: 'MWLU',
    },
  },
  {
    key: 'pengumuman',
    title: 'Pengumuman & Kegiatan',
    order: 3,
    content: {
      limit: 3,
    },
  },
  {
    key: 'galeri',
    title: 'Galeri',
    order: 4,
    content: {
      images: [] as string[],
    },
  },
  {
    key: 'kontak',
    title: 'Kontak',
    order: 5,
    content: {
      address: '',
      phone: '',
      email: '',
      hours: '',
      mapEmbed: '',
    },
  },
  {
    key: 'footer',
    title: 'Footer',
    order: 6,
    content: {
      text: '© 2026 Masjid An-Nur Arwana. Semua hak dilindungi.',
      socialLinks: [] as { label: string; url: string }[],
    },
  },
];

const CATEGORIES = [
  { name: 'Infak', type: 'MASUK' as const },
  { name: 'Sedekah', type: 'MASUK' as const },
  { name: 'Zakat', type: 'MASUK' as const },
  { name: 'Infaq Pembangunan', type: 'MASUK' as const },
  { name: 'Sosial', type: 'KELUAR' as const },
  { name: 'Operasional', type: 'KELUAR' as const },
];

const SETTINGS: { key: string; value: unknown }[] = [
  { key: 'site.name', value: 'Masjid An-Nur Arwana' },
  { key: 'site.address', value: '' },
  { key: 'site.phone', value: '' },
  { key: 'site.city', value: 'Arwana' },
  { key: 'donasi.rekening', value: [] },
  { key: 'seo.title', value: 'Masjid An-Nur Arwana' },
  { key: 'seo.description', value: 'Website resmi Masjid An-Nur Arwana' },
  {
    key: 'kas.publicCategories',
    value: ['Infak', 'Sedekah', 'Zakat', 'Infaq Pembangunan'],
  },
];

async function main() {
  const passwordHash = await hash('Admin123!', 10);

  await prisma.user.upsert({
    where: { email: 'admin@an-nur.local' },
    update: {},
    create: {
      name: 'Admin',
      email: 'admin@an-nur.local',
      passwordHash,
      role: 'ADMIN',
    },
  });

  for (const section of SECTIONS) {
    await prisma.section.upsert({
      where: { key: section.key },
      update: {},
      create: {
        key: section.key,
        title: section.title,
        content: section.content,
        isVisible: true,
        order: section.order,
      },
    });
  }

  for (const category of CATEGORIES) {
    const existing = await prisma.category.findFirst({
      where: { name: category.name },
    });
    if (!existing) {
      await prisma.category.create({ data: category });
    }
  }

  await prisma.period.upsert({
    where: { name: '2026' },
    update: {},
    create: {
      name: '2026',
      startDate: new Date('2026-01-01T00:00:00.000Z'),
      endDate: new Date('2026-12-31T23:59:59.999Z'),
      status: 'AKTIF',
    },
  });

  for (const setting of SETTINGS) {
    await prisma.setting.upsert({
      where: { key: setting.key },
      update: {},
      create: { key: setting.key, value: setting.value as object },
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
