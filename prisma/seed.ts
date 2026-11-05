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
    key: 'tiktok',
    title: 'Feed TikTok Official',
    order: 6,
    content: {
      username: '@masjidannuurarwana',
      accountUrl: 'https://www.tiktok.com/@masjidannuurarwana',
      title: 'Kajian singkat, dokumentasi ibadah, dan kegiatan sosial Masjid An-nuur Arwana.',
      videoId: '',
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

  const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
  if (admin) {
    const defaultArticles = [
      {
        title: 'Keutamaan Memakmurkan Masjid dan Berjalan Menuju Rumah Allah',
        slug: 'keutamaan-memakmurkan-masjid-dan-shalat-berjamaah',
        category: 'Ibadah & Masjid',
        coverImage: '/images/hero-masjid.jpg',
        status: 'PUBLISHED' as const,
        publishedAt: new Date(),
        excerpt:
          'Masjid bukan sekadar bangunan fisik tempat sujud, melainkan pusat pembinaan iman, ukhuwah Islamiyah, dan peradaban umat.',
        body: `Masjid bukan sekadar bangunan fisik tempat sujud, melainkan pusat pembinaan iman, ukhuwah Islamiyah, dan pancaran peradaban umat. Dalam Islam, memakmurkan masjid memiliki kedudukan yang sangat agung di sisi Allah Subhanahu wa Ta'ala.

### Dalil Al-Qur'an tentang Memakmurkan Masjid

Allah Subhanahu wa Ta'ala berfirman:

> **إِنَّمَا يَعْمُرُ مَسَاجِدَ اللَّهِ مَنْ آمَنَ بِاللَّهِ وَالْيَوْمِ الْآخِرِ وَأَقَامَ الصَّلَاةَ وَآتَى الزَّكَاةَ وَلَمْ يَخْشَ إِلَّا اللَّهَ ۖ فَعَسَىٰ أُولَٰئِكَ أَنْ يَكُونُوا مِنَ الْمُهْتَدِينَ**
>
> *"Sesungguhnya yang memakmurkan masjid-masjid Allah hanyalah orang-orang yang beriman kepada Allah dan hari kemudian, serta (tetap) mendirikan shalat, menunaikan zakat dan tidak takut (kepada siapa pun) selain kepada Allah, maka mudah-mudahan mereka termasuk orang-orang yang mendapat petunjuk."* (QS. At-Taubah [9]: 18)

Ayat ini menegaskan bahwa tanda kesempurnaan iman seseorang tercermin dari keterikatan hatinya terhadap rumah-rumah Allah.

---

### Dalil Hadits Shahih tentang Keutamaan Shalat Berjamaah

Rasulullah ﷺ bersabda mengenai keistimewaan shalat berjamaah:

> **صَلَاةُ الْجَمَاعَةِ تَفْضُلُ صَلَاةَ الْفَذِّ بِسَبْعٍ وَعِشْرِينَ دَرَجَةً**
>
> *"Shalat berjamaah lebih utama daripada shalat sendirian dengan selisih dua puluh tujuh derajat."* (HR. Al-Bukhari no. 645 dan Muslim no. 650)

Tidak hanya itu, setiap langkah kaki seorang hamba yang melangkah menuju masjid bernilai pahala dan penghapus kekhilafan:

> **مَنْ تَطَهَّرَ فِي بَيْتِهِ ثُمَّ مَشَى إِلَى بَيْتٍ مِنْ بُيُوتِ اللَّهِ لِيَقْضِيَ فَرِيضَةً مِنْ فَرَائِضِ اللَّهِ كَانَتْ خَطْوَتَاهُ إِحْدَاهُمَا تَحُطُّ خَطِيئَةً وَالْأُخْرَى تَرْفَعُ دَرَجَةً**
>
> *"Barangsiapa bersuci di rumahnya kemudian berjalan menuju salah satu rumah Allah untuk menunaikan salah satu kewajiban yang Allah fardhukan, maka salah satu langkahnya menghapuskan dosa dan langkah lainnya mengangkat derajat."* (HR. Muslim no. 666)

---

### Hikmah & Amalan Praktis untuk Jamaah

1. **Menghidupkan Shalat Fardhu Berjamaah**: Prioritaskan shalat berjamaah di masjid, khususnya shalat Isya dan Subuh yang sarat pahala laksana shalat semalam suntuk.
2. **Menjaga Adab Masjid**: Melangkah masuk dengan kaki kanan diiringi doa, shalat sunnah Tahiyyatul Masjid, serta menjaga kebersihan dan kesucian saf.
3. **Mengikutsertakan Keluarga**: Membiasakan putra-putri kita mencintai masjid sejak dini agar terbentengi akhlak mulianya.`,
        seoTitle: 'Keutamaan Memakmurkan Masjid dan Shalat Berjamaah - Masjid An-Nuur Arwana',
        seoDescription:
          'Ulasan mendalam keutamaan memakmurkan masjid dan shalat berjamaah bersumber dari QS. At-Taubah: 18 dan hadits shahih riwayat Bukhari-Muslim.',
        authorId: admin.id,
      },
      {
        title: 'Keberkahan Sedekah: Melipatgandakan Rezeki dan Menolak Bala',
        slug: 'keberkahan-sedekah-melipatgandakan-rezeki-dan-menolak-bala',
        category: 'Muamalah & Sosial',
        coverImage: '/images/galeri-01.jpg',
        status: 'PUBLISHED' as const,
        publishedAt: new Date(Date.now() - 3600000 * 2),
        excerpt:
          'Sedekah bukanlah sekadar mengeluarkan materi, melainkan wujud rasa syukur dan investasi akhirat yang pahalanya terus mengalir abadi.',
        body: `Sedekah bukanlah sekadar mengeluarkan materi, melainkan wujud rasa syukur atas karunia Allah dan investasi akhirat yang pahalanya terus mengalir abadi. Dalam pandangan Islam, harta yang sesungguhnya adalah apa yang kita infakkan di jalan kebaikan.

### Janji Berlipat Ganda dalam Al-Qur'an

Allah Subhanahu wa Ta'ala melukiskan keindahan infak dalam firman-Nya:

> **مَّثَلُ الَّذِينَ يُنفِقُونَ أَمْوَالَهُمْ فِي سَبِيلِ اللَّهِ كَمَثَلِ حَبَّةٍ أَنبَتَتْ سَبْعَ سَنَابِلَ فِي كُلِّ سُنبُلَةٍ مِّائَةُ حَبَّةٍ ۗ وَاللَّهُ يُضَاعِفُ لِمَن يَشَاءُ ۗ وَاللَّهُ وَاسِعٌ عَلِيمٌ**
>
> *"Perumpamaan orang yang menginfakkan hartanya di jalan Allah seperti sebutir biji yang menumbuhkan tujuh tangkai, pada setiap tangkai ada seratus biji. Allah melipatgandakan bagi siapa yang Dia kehendaki, dan Allah Mahaluas, Maha Mengetahui."* (QS. Al-Baqarah [2]: 261)

Setiap rupiah yang dikeluarkan dengan penuh keikhlasan diibaratkan satu butir benih yang menghasilkan 700 kali lipat kebaikan, bahkan tak terbatas sesuai kehendak-Nya.

---

### Hadits Shahih: Sedekah Tidak Mengurangi Harta

Rasulullah ﷺ menegaskan hakikat rezeki dalam sabda beliau:

> **مَا نَقَصَتْ صَدَقَةٌ مِنْ مَالٍ وَمَا زَادَ اللَّهُ عَبْدًا بِعَفْوٍ إِلَّا عِزًّا وَمَا تَوَاضَعَ أَحَدٌ لِلَّهِ إِلَّا رَفَعَهُ اللَّهُ**
>
> *"Sedekah itu tidak akan mengurangi harta. Dan tidaklah Allah menambah bagi seorang hamba yang pemaaf melainkan kemuliaan, serta tidaklah seseorang merendahkan hati karena Allah melainkan Allah akan mengangkat derajatnya."* (HR. Muslim no. 2588)

Selain itu, sedekah menjadi perisai dari bencana dan penutup akhir hidup yang buruk:

> **إِنَّ الصَّدَقَةَ لَتُطْفِئُ غَضَبَ الرَّبِّ وَتَدْفَعُ مِيتَةَ السُّوءِ**
>
> *"Sesungguhnya sedekah itu memadamkan kemurkaan Rabb dan menolak kematian yang buruk (su'ul khatimah)."* (HR. At-Tirmidzi no. 664)

---

### Tips Istiqamah Bersedekah

- **Sedekah Subuh Rutin**: Sisihkan sebagian rezeki di waktu fajar saat para malaikat mendoakan orang-orang yang berinfak.
- **Dukung Pembangunan & Operasional Masjid**: Menjadi donatur wakaf atau infak Jumat demi kelancaran dakwah dan kenyamanan jamaah.
- **Senyuman dan Kebaikan Non-Materi**: Rasulullah mengingatkan bahwa senyum tulus, menyingkirkan duri di jalan, dan mendamaikan sesama adalah bagian dari sedekah.`,
        seoTitle: 'Keberkahan Sedekah: Melipatgandakan Rezeki dan Menolak Bala',
        seoDescription:
          'Penjelasan keutamaan sedekah berdasarkan QS. Al-Baqarah: 261 dan hadits riwayat Imam Muslim dan At-Tirmidzi.',
        authorId: admin.id,
      },
      {
        title: 'Cahaya Ilmu: Derajat Mulia Para Penuntut Ilmu dalam Pandangan Islam',
        slug: 'cahaya-ilmu-derajat-mulia-penuntut-ilmu-dalam-islam',
        category: 'Tadabbur & Kajian',
        coverImage: '/images/berita-pengajian.jpg',
        status: 'PUBLISHED' as const,
        publishedAt: new Date(Date.now() - 3600000 * 4),
        excerpt:
          "Menuntut ilmu adalah lentera hidup yang menerangi kegelapan dan jalan tol tercepat menuju surga Allah Subhanahu wa Ta'ala.",
        body: `Menuntut ilmu adalah lentera hidup yang menerangi langkah seorang muslim. Tanpa ilmu, ibadah kehilangan arah dan amalan rentan menyimpang dari sunnah Rasulullah ﷺ.

### Al-Qur'an Memuliakan Ahli Ilmu

Allah Subhanahu wa Ta'ala berfirman:

> **يَرْفَعِ اللَّهُ الَّذِينَ آمَنُوا مِنكُمْ وَالَّذِينَ أُوتُوا الْعِلْمَ دَرَجَاتٍ ۚ وَاللَّهُ بِمَا تَعْمَلُونَ خَبِيرٌ**
>
> *"Niscaya Allah akan mengangkat (derajat) orang-orang yang beriman di antaramu dan orang-orang yang diberi ilmu beberapa derajat. Dan Allah Mahateliti terhadap apa yang kamu kerjakan."* (QS. Al-Mujadilah [58]: 11)

Ilmu syar'i memberikan ketenangan hati, hikmah dalam bersikap, dan wawasan yang lapang dalam bermasyarakat.

---

### Jalan Tol Menuju Jannah dalam Hadits Shahih

Rasulullah ﷺ memberikan kabar gembira yang luar biasa bagi siapa saja yang meluangkan waktu mempelajari agama:

> **مَنْ سَلَكَ طَرِيقًا يَلْتَمِسُ فِيهِ عِلْمًا سَهَّلَ اللَّهُ لَهُ بِهِ طَرِيقًا إِلَى الْجَنَّةِ**
>
> *"Barangsiapa menempuh suatu jalan untuk mencari ilmu, maka Allah akan memudahkan baginya jalan menuju surga."* (HR. Muslim no. 2699)

Bahkan segenap makhluk di langit dan bumi turut mendoakan ampunan bagi penuntut ilmu:

> **وَإِنَّ الْمَلَائِكَةَ لَتَضَعُ أَجْنِحَتَهَا رِضًا لِطَالِبِ الْعِلْمِ**
>
> *"Dan sesungguhnya para malaikat benar-benar membentangkan sayap-sayapnya karena ridha kepada orang yang menuntut ilmu."* (HR. Abu Dawud no. 3641 dan At-Tirmidzi no. 2682)

---

### Langkah Menggapai Keberkahan Majelis Ilmu

1. **Ikhlas karena Allah**: Niatkan semata-mata mengharap ridha-Nya dan menghapus kebodohan dari diri sendiri.
2. **Rutin Menghadiri Pengajian Masjid**: Menjadikan kajian bakda Maghrib atau kuliah Subuh sebagai santapan ruhani mingguan.
3. **Mengamalkan Apa yang Diketahui**: Ilmu yang berkah adalah ilmu yang berbuah amal shaleh dan akhlak terpuji.`,
        seoTitle: 'Cahaya Ilmu: Derajat Mulia Penuntut Ilmu dalam Islam',
        seoDescription:
          'Kupas tuntas kemuliaan menuntut ilmu menurut Al-Qur\'an Surah Al-Mujadilah: 11 dan hadits shahih Muslim no. 2699.',
        authorId: admin.id,
      },
      {
        title: 'Menghidupkan Jiwa dengan Al-Qur\'an dan Keagungan Pahala Pembacanya',
        slug: 'menghidupkan-jiwa-dengan-al-quran-dan-keutamaan-membacanya',
        category: 'Al-Qur\'an & Doa',
        coverImage: '/images/galeri-05.jpg',
        status: 'PUBLISHED' as const,
        publishedAt: new Date(Date.now() - 3600000 * 6),
        excerpt:
          'Al-Qur\'an adalah mukjizat abadi, penawar bagi hati yang gundah, dan sebaik-baik petunjuk bagi keselamatan hidup di dunia maupun akhirat.',
        body: `Al-Qur'an adalah mukjizat abadi, penawar (syifa) bagi kegelisahan jiwa, dan lentera petunjuk bagi siapa pun yang mendambakan keselamatan hidup di dunia dan akhirat.

### Perintah Melantunkan Al-Qur'an dengan Tartil

Allah Subhanahu wa Ta'ala berfirman:

> **وَرَتِّلِ الْقُرْآنَ تَرْتِيلًا**
>
> *"Dan bacalah Al-Qur'an itu dengan perlahan-lahan (tartil)."* (QS. Al-Muzzammil [73]: 4)

Membaca dengan tartil, memperhatikan tajwid dan makhraj huruf, memungkinkan makna-makna agung ayat Al-Qur'an meresap ke dalam sanubari dan menggetarkan keimanan.

---

### Pahala Berlipat Ganda pada Setiap Huruf

Dari Abdullah bin Mas'ud radhiyallahu 'anhu, Rasulullah ﷺ bersabda:

> **مَنْ قَرَأَ حَرْفًا مِنْ كِتَابِ اللَّهِ فَلَهُ بِهِ حَسَنَةٌ وَالْحَسَنَةُ بِعَشْرِ أَمْثَالِهَا لَا أَقُولُ الم حَرْفٌ وَلَكِنْ أَلِفٌ حَرْفٌ وَلَامٌ حَرْفٌ وَمِيمٌ حَرْفٌ**
>
> *"Barangsiapa membaca satu huruf dari Kitabullah (Al-Qur'an), maka baginya satu kebaikan, dan satu kebaikan itu dilipatgandakan menjadi sepuluh kebaikan semisal. Aku tidak mengatakan 'Alif Lam Mim' itu satu huruf, melainkan Alif satu huruf, Lam satu huruf, dan Mim satu huruf."* (HR. At-Tirmidzi no. 2910, dinilai shahih)

Lebih mulia lagi, orang yang senantiasa berinteraksi dengan Al-Qur'an dinobatkan sebagai insan terbaik:

> **خَيْرُكُمْ مَنْ تَعَلَّمَ الْقُرْآنَ وَعَلَّمَهُ**
>
> *"Sebaik-baik kalian adalah orang yang mempelajari Al-Qur'an dan mengajarkannya."* (HR. Al-Bukhari no. 5027)

---

### Komitmen Bersama Al-Qur'an

- **One Day One Juz / Ayat**: Membiasakan membaca Al-Qur'an setiap selesai shalat fardhu.
- **Manfaatkan Fitur Al-Qur'an Digital Masjid**: Mendengarkan murottal merdu dan mentadabburi terjemahan melalui laman Al-Qur'an Digital di website Masjid An-Nuur Arwana.
- **Mengikuti Kelas Tahsin & TPQ**: Menyempurnakan bacaan tajwid bersama guru dan asatidz di masjid.`,
        seoTitle: 'Menghidupkan Jiwa dengan Al-Qur\'an dan Keagungan Pahala Pembacanya',
        seoDescription:
          'Keutamaan membaca dan mempelajari Al-Qur\'an bersumber dari QS. Al-Muzzammil: 4 dan hadits At-Tirmidzi serta Bukhari.',
        authorId: admin.id,
      },
    ];

    for (const item of defaultArticles) {
      await prisma.article.upsert({
        where: { slug: item.slug },
        update: {},
        create: item,
      });
    }
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
