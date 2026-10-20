import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { hash } from 'bcryptjs';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const SECTIONS = [
  {
    key: 'hero',
    title: 'Masjid An-nuur Arwana',
    order: 0,
    content: {
      heading: 'Masjid An-nuur Arwana',
      subheading: 'Masjid yang nyaman untuk beribadah dan berkembangnya umat',
      image: '/images/hero-masjid.jpg',
      ctaLabel: 'Donasi Sekarang',
      ctaHref: '/donasi',
    },
  },
  {
    key: 'profil',
    title: 'Profil Masjid',
    order: 1,
    content: {
      body: 'Masjid An-nuur Arwana merupakan masjid kelolaan DKM yang melayani kebutuhan umat di wilayah Arwana.',
    },
  },
  {
    key: 'jadwal',
    title: 'Jadwal Sholat',
    order: 2,
    content: {
      city: 'Karawang',
      method: 'MWLU',
    },
  },
  {
    key: 'jumat',
    title: 'Jadwal Khotib Sholat Jumat',
    order: 3,
    content: {
      items: [
        { tanggal: '2026-10-16', khatib: 'Ust. Ahmad Fauzi', imam: 'Ust. Abdul Rahman' },
        { tanggal: '2026-10-23', khatib: 'Ust. Muhammad Siddiq', imam: 'Ust. Ibrahim Hakim' },
        { tanggal: '2026-10-30', khatib: 'Dr. H. Hasan Basri, M.A.', imam: 'Ust. Yusuf Maulana' },
        { tanggal: '2026-11-06', khatib: 'Ust. Fatullah Ansari', imam: 'Ust. Ahmad Fauzi' },
      ] as { tanggal: string; khatib: string; imam: string }[],
    },
  },
  {
    key: 'pengumuman',
    title: 'Pengumuman & Kegiatan',
    order: 4,
    content: {
      limit: 3,
    },
  },
  {
    key: 'galeri',
    title: 'Galeri',
    order: 5,
    content: {
      images: [
        { url: '/images/galeri-01.jpg', caption: 'Senja di atas kubah masjid' },
        { url: '/images/galeri-02.jpg', caption: 'Ornamen bintang delapan (girih)' },
        { url: '/images/galeri-03.jpg', caption: 'Lengkung mihrab berlapis' },
        { url: '/images/galeri-04.jpg', caption: 'Lampu gantung masjid' },
        { url: '/images/galeri-05.jpg', caption: 'Pintu lattice mashrabiya' },
        { url: '/images/galeri-06.jpg', caption: 'Medali ornamen klasik' },
        { url: '/images/galeri-07.jpg', caption: 'Skyline menara menjelang maghrib' },
        { url: '/images/galeri-08.jpg', caption: 'Bulan sabit di malam yang tenang' },
      ] as { url: string; caption: string }[],
    },
  },
  {
    key: 'testimoni',
    title: 'Apa Kata Jamaah',
    order: 9,
    content: {
      items: [
        {
          nama: 'Budi Santoso',
          peran: 'Jamaah rutin',
          teks: 'Sejak pindah ke Arwana, Masjid An-nuur Arwana jadi rumah kedua keluarga kami. Suasananya tenang, jamaahnya ramah, dan pengurusnya sigap.',
          rating: 5,
        },
        {
          nama: 'Siti Aminah',
          peran: 'Donatur',
          teks: 'Donasi lewat website mudah sekali. Transfer, unggah bukti, dan konfirmasinya cepat. Laporan kasnya juga transparan.',
          rating: 5,
        },
        {
          nama: 'Ust. Abdul Rahman',
          peran: 'Guru TPQ',
          teks: 'Alhamdulillah program TPQ di masjid ini makin terorganisir. Anak-anak betah belajar dan orang tua mudah memantau kegiatan.',
          rating: 5,
        },
        {
          nama: 'H. M. Ridwan',
          peran: 'Jamaah Jumat',
          teks: 'Khutbah Jumat di sini selalu menyentuh dan aplikatif. Jadwal khotibnya jelas, jamaahnya pun tertib.',
          rating: 4,
        },
        {
          nama: 'Dewi Lestari',
          peran: 'Warga sekitar',
          teks: 'Masjidnya bersih dan terawat. Jadwal sholat akurat membuat kami tidak pernah ketinggalan waktu sholat.',
          rating: 5,
        },
      ] as { nama: string; peran: string; teks: string; rating: number }[],
    },
  },
  {
    key: 'kontak',
    title: 'Kontak',
    order: 7,
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
    order: 8,
    content: {
      text: '© 2026 Masjid An-nuur Arwana. Semua hak dilindungi.',
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
  { key: 'site.name', value: 'Masjid An-nuur Arwana' },
  { key: 'site.address', value: '' },
  { key: 'site.phone', value: '' },
  { key: 'site.city', value: 'Karawang' },
  { key: 'donasi.rekening', value: [] },
  { key: 'seo.title', value: 'Masjid An-nuur Arwana' },
  { key: 'seo.description', value: 'Website resmi Masjid An-nuur Arwana' },
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
