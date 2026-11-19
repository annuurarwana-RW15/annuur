const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const CAPTURES_DIR = path.join(__dirname, '../public/docs-captures');
const PDF_OUTPUT = path.join(__dirname, '../DOKUMEN_FITUR_DAN_RILIS_WEBSITE_MASJID_AN-NUUR.pdf');

async function captureScreenshots(browser) {
  console.log('Mengambil tangkapan layar fitur tambahan...');
  const page = await browser.newPage({
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 2,
  });

  const BASE_URL = 'https://masjidannuurarwana.web.id';

  // Kunjungi beranda
  await page.goto(BASE_URL, { waitUntil: 'load', timeout: 60000 });
  await page.waitForTimeout(3000);

  // 1. Keuangan
  const keuangan = await page.$('#laporan-keuangan');
  if (keuangan) {
    console.log('Capture #laporan-keuangan...');
    await keuangan.screenshot({ path: path.join(CAPTURES_DIR, '04-keuangan-kas.png') });
  }

  // 2. Murottal
  const murottal = await page.$('#murottal');
  if (murottal) {
    console.log('Capture #murottal...');
    await murottal.screenshot({ path: path.join(CAPTURES_DIR, '05-murottal-quran.png') });
  }

  // 3. Sholat Jumat
  const jumat = await page.$('#jumat');
  if (jumat) {
    console.log('Capture #jumat...');
    await jumat.screenshot({ path: path.join(CAPTURES_DIR, '06-jumat-khotib.png') });
  }

  // 4. Donasi
  const donasi = await page.$('#donasi');
  if (donasi) {
    console.log('Capture #donasi...');
    await donasi.screenshot({ path: path.join(CAPTURES_DIR, '07-donasi-qris.png') });
  }

  // 5. Admin Login
  console.log('Capture /admin/login...');
  await page.goto(`${BASE_URL}/admin/login`, { waitUntil: 'load', timeout: 60000 });
  await page.waitForTimeout(2000);
  await page.screenshot({
    path: path.join(CAPTURES_DIR, '11-admin-login.png'),
    clip: { x: 300, y: 100, width: 680, height: 600 }
  });

  // 6. Mobile View (Jadwal & Kalender Hijriyah)
  console.log('Capture tampilan mobile (Jadwal & Kalender Hijriyah)...');
  const mobilePage = await browser.newPage({
    viewport: { width: 414, height: 896 },
    deviceScaleFactor: 2,
  });
  await mobilePage.goto(`${BASE_URL}/#jadwal`, { waitUntil: 'load', timeout: 60000 });
  await mobilePage.waitForTimeout(2500);
  await mobilePage.screenshot({
    path: path.join(CAPTURES_DIR, '12-mobile-view.png'),
    clip: { x: 0, y: 0, width: 414, height: 750 }
  });
  await mobilePage.close();

  await page.close();
  console.log('Semua tangkapan layar selesai diambil.');
}

function imageToBase64(filename) {
  const filePath = path.join(CAPTURES_DIR, filename);
  if (fs.existsSync(filePath)) {
    const data = fs.readFileSync(filePath);
    return `data:image/png;base64,${data.toString('base64')}`;
  }
  return '';
}

async function generatePdf(browser) {
  console.log('Menyusun dokumen HTML laporan serah terima DKM...');

  const imgHero = imageToBase64('01-hero-navbar.png');
  const imgProfil = imageToBase64('02-section-profil.png');
  const imgJadwal = imageToBase64('03-jadwal-sholat.png');
  const imgKeuangan = imageToBase64('04-keuangan-kas.png');
  const imgMurottal = imageToBase64('05-murottal-quran.png');
  const imgJumat = imageToBase64('06-jumat-khotib.png');
  const imgDonasi = imageToBase64('07-donasi-qris.png');
  const imgHalamanProfil = imageToBase64('08-halaman-profil.png');
  const imgQuran = imageToBase64('09-halaman-quran.png');
  const imgProposal = imageToBase64('10-halaman-proposal.png');
  const imgAdminLogin = imageToBase64('11-admin-login.png');
  const imgMobile = imageToBase64('12-mobile-view.png');

  const htmlContent = `
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <title>Dokumen Fitur & Rilis Website Masjid An-Nuur Arwana</title>
  <style>
    @page {
      size: A4;
      margin: 18mm 16mm 20mm 16mm;
      @bottom-right {
        content: counter(page);
        font-family: 'Helvetica Neue', Arial, sans-serif;
        font-size: 8pt;
        color: #718096;
      }
      @bottom-left {
        content: "Dokumen Resmi DKM Masjid An-Nuur Arwana | masjidannuurarwana.web.id";
        font-family: 'Helvetica Neue', Arial, sans-serif;
        font-size: 8pt;
        color: #718096;
      }
    }

    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      color: #1a202c;
      background: #ffffff;
      line-height: 1.55;
      font-size: 9.5pt;
      margin: 0;
      padding: 0;
    }

    .page-break {
      page-break-after: always;
      break-after: page;
    }

    .avoid-break {
      page-break-inside: avoid;
      break-inside: avoid;
    }

    /* Cover Page */
    .cover {
      height: 960px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      border: 3px double #c59b27;
      padding: 45px 35px;
      background: linear-gradient(180deg, #fbfaf6 0%, #ffffff 40%, #f7f5ed 100%);
      border-radius: 8px;
    }

    .cover-header {
      text-align: center;
      border-bottom: 2px solid #0b4619;
      padding-bottom: 20px;
    }

    .cover-logo {
      font-size: 40pt;
      margin-bottom: 5px;
    }

    .cover-org {
      font-size: 13pt;
      font-weight: 700;
      letter-spacing: 0.15em;
      text-transform: uppercase;
      color: #0b4619;
      margin: 0;
    }

    .cover-suborg {
      font-size: 10pt;
      color: #685b37;
      margin-top: 4px;
      font-weight: 600;
    }

    .cover-body {
      text-align: center;
      margin: 50px 0;
    }

    .badge-release {
      display: inline-block;
      background: #0b4619;
      color: #ffffff;
      padding: 6px 18px;
      border-radius: 20px;
      font-size: 9pt;
      font-weight: 700;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      margin-bottom: 20px;
      border: 1px solid #c59b27;
    }

    .cover-title {
      font-size: 24pt;
      font-weight: 800;
      color: #0b4619;
      line-height: 1.25;
      margin: 0 0 15px 0;
    }

    .cover-subtitle {
      font-size: 11.5pt;
      color: #4a5568;
      max-width: 520px;
      margin: 0 auto;
      line-height: 1.5;
    }

    .cover-meta {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-left: 5px solid #c59b27;
      padding: 16px 20px;
      border-radius: 6px;
      text-align: left;
      font-size: 9.5pt;
      margin-top: 30px;
    }

    .cover-meta table {
      width: 100%;
      border-collapse: collapse;
    }

    .cover-meta td {
      padding: 4px 8px;
      vertical-align: top;
    }

    .cover-meta td.label {
      font-weight: 700;
      color: #0b4619;
      width: 160px;
    }

    .cover-footer {
      text-align: center;
      border-top: 1px solid #e2e8f0;
      padding-top: 15px;
      font-size: 8.5pt;
      color: #718096;
    }

    /* Content Styling */
    h1.sec-title {
      font-size: 16pt;
      color: #0b4619;
      border-bottom: 2px solid #c59b27;
      padding-bottom: 6px;
      margin-top: 0;
      margin-bottom: 14px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    h2.sub-title {
      font-size: 12pt;
      color: #0b4619;
      margin-top: 18px;
      margin-bottom: 8px;
      border-left: 4px solid #c59b27;
      padding-left: 8px;
    }

    h3.item-title {
      font-size: 10.5pt;
      color: #2d3748;
      margin-top: 12px;
      margin-bottom: 4px;
      font-weight: 700;
    }

    p {
      margin-top: 0;
      margin-bottom: 8px;
      text-align: justify;
    }

    .highlight-box {
      background: #f7f9f6;
      border: 1px solid #c8d9c5;
      border-left: 4px solid #0b4619;
      padding: 10px 14px;
      border-radius: 4px;
      margin: 12px 0;
      font-size: 9pt;
    }

    .feature-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 12px 14px;
      margin-bottom: 16px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.03);
    }

    .feature-card-title {
      font-size: 11pt;
      font-weight: 700;
      color: #0b4619;
      margin-bottom: 6px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .badge-tag {
      font-size: 7.5pt;
      font-weight: 700;
      padding: 2px 8px;
      border-radius: 10px;
      background: #fef3c7;
      color: #92400e;
      border: 1px solid #fde68a;
    }

    .badge-tag.online {
      background: #dcfce7;
      color: #166534;
      border-color: #bbf7d0;
    }

    .img-container {
      margin: 10px 0;
      text-align: center;
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 6px;
    }

    .img-container img {
      max-width: 100%;
      height: auto;
      border-radius: 4px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.06);
    }

    .img-caption {
      font-size: 8pt;
      color: #64748b;
      margin-top: 5px;
      font-style: italic;
    }

    table.data-table {
      width: 100%;
      border-collapse: collapse;
      margin: 12px 0;
      font-size: 8.5pt;
    }

    table.data-table th, table.data-table td {
      border: 1px solid #cbd5e1;
      padding: 6px 10px;
      text-align: left;
    }

    table.data-table th {
      background: #0b4619;
      color: #ffffff;
      font-weight: 700;
    }

    table.data-table tr:nth-child(even) {
      background: #f8fafc;
    }

    .signature-grid {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 20px;
      margin-top: 40px;
      text-align: center;
    }

    .sig-box {
      border-top: 1px dashed #cbd5e1;
      padding-top: 8px;
      font-size: 8.5pt;
    }

    .sig-name {
      margin-top: 55px;
      font-weight: 700;
      text-decoration: underline;
      color: #0b4619;
    }

    .sig-role {
      color: #64748b;
      font-size: 8pt;
    }
  </style>
</head>
<body>

  <!-- ==================== HALAMAN 1: COVER ==================== -->
  <div class="cover page-break">
    <div class="cover-header">
      <div class="cover-logo">🕌</div>
      <p class="cover-org">DEWAN KEMAKMURAN MASJID (DKM) AN-NUUR ARWANA</p>
      <p class="cover-suborg">Rukun Warga 15, Perumahan Arwana | Karawang, Jawa Barat</p>
    </div>

    <div class="cover-body">
      <div class="badge-release">Dokumen Rilis Resmi • Versi 1.0 (Produksi)</div>
      <h1 class="cover-title">DOKUMEN SERAH TERIMA &amp; PANDUAN FITUR SISTEM WEBSITE MASJID</h1>
      <p class="cover-subtitle">
        Laporan Pelaksanaan Digitalisasi, Katalog Seluruh Fitur Publik &amp; Panel Pengelolaan, Serta Panduan Operasional Pengurus DKM Masjid An-Nuur Arwana.
      </p>

      <div class="cover-meta">
        <table>
          <tr>
            <td class="label">Nama Sistem</td>
            <td>: Portal Web &amp; Sistem Informasi Masjid An-Nuur Arwana</td>
          </tr>
          <tr>
            <td class="label">Alamat Domain</td>
            <td>: <strong>https://masjidannuurarwana.web.id</strong></td>
          </tr>
          <tr>
            <td class="label">Status Penerbitan</td>
            <td>: <strong>LIVE &amp; FULL OPERATIONAL (100% Siap Digunakan)</strong></td>
          </tr>
          <tr>
            <td class="label">Target Pengguna</td>
            <td>: Jamaah Muslimin, Donatur, Warga RW 15, dan Jajaran Pengurus DKM</td>
          </tr>
          <tr>
            <td class="label">Tanggal Rilis</td>
            <td>: November 2026</td>
          </tr>
        </table>
      </div>
    </div>

    <div class="cover-footer">
      Dokumen ini sah dan diperuntukkan bagi jajaran Pengurus DKM Masjid An-Nuur Arwana sebagai pegangan pemeliharaan, transparansi keumatan, dan panduan fitur digital.
    </div>
  </div>

  <!-- ==================== HALAMAN 2: RINGKASAN EKSEKUTIF & ARSITEKTUR ==================== -->
  <div class="page-break">
    <h1 class="sec-title">1. Ringkasan Eksekutif &amp; Arsitektur Sistem</h1>
    
    <p>
      Puji syukur kehadirat Allah Subhanahu wa Ta'ala atas selesainya pembangunan dan peluncuran website resmi <strong>Masjid An-Nuur Arwana</strong>. Website ini dirancang sebagai pusat media informasi, dakwah, pelayanan jamaah, dan keterbukaan keuangan demi mewujudkan masjid yang makmur, transparan, dan berdaya guna bagi umat di lingkungan Perumahan Arwana (RW 15) dan sekitarnya.
    </p>

    <div class="highlight-box">
      <strong>Visi Digitalisasi:</strong> "Mewujudkan tata kelola masjid yang modern, akuntabel, dan melayani jamaah dengan kemudahan akses jadwal ibadah, kajian, transparansi kas, serta kemudahan berinfaq berbasis teknologi informasi."
    </div>

    <h2 class="sub-title">Arsitektur &amp; Standar Teknologi</h2>
    <p>Website dibangun di atas pondasi teknologi modern kelas industri yang menjamin kecepatan, keandalan, keamanan tingkat tinggi, dan kemudahan pemeliharaan jangka panjang:</p>

    <table class="data-table">
      <thead>
        <tr>
          <th>Komponen</th>
          <th>Teknologi Terpasang</th>
          <th>Keunggulan untuk Masjid</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>Framework Inti</strong></td>
          <td>Next.js 15 (React 19, TypeScript)</td>
          <td>Kecepatan render instan (Server-Side Rendering &amp; Static Generation), SEO optimal, minim konsumsi kuota jamaah.</td>
        </tr>
        <tr>
          <td><strong>Basis Data &amp; ORM</strong></td>
          <td>PostgreSQL + Prisma ORM</td>
          <td>Penyimpanan data keuangan, kegiatan, dan kepengurusan terstruktur, aman, dan konsisten (ACID compliant).</td>
        </tr>
        <tr>
          <td><strong>Keamanan &amp; Akses</strong></td>
          <td>NextAuth.js v5 + Bcrypt Hash</td>
          <td>Proteksi login dashboard admin berstandar perbankan, terenkripsi anti-bruteforce, proteksi CSRF, sanitasi HTML.</td>
        </tr>
        <tr>
          <td><strong>Infrastruktur Hosting</strong></td>
          <td>Vercel Global Edge Network</td>
          <td>Uptime 99.9%, sertifikat SSL HTTPS otomatis, CDN global terdistribusi cepat diakses dari HP maupun laptop.</td>
        </tr>
        <tr>
          <td><strong>Desain &amp; Responsif</strong></td>
          <td>Tailwind CSS + Spring Animation</td>
          <td>Tampilan islami khas (Hijau Tua, Emas, Krem), adaptif sempurna di layar HP Android/iPhone, tablet, dan PC.</td>
        </tr>
      </tbody>
    </table>

    <h2 class="sub-title">Rekapitulasi Fitur Unggulan</h2>
    <p>Fitur-fitur utama yang telah selesai diuji dan aktif berjalan penuh:</p>
    <ul>
      <li><strong>Identitas &amp; Profil Interaktif:</strong> Desain artistik latar belakang gedung masjid blended natural, card teks nyaman dibaca, dan halaman profil sejarah &amp; visi-misi lengkap.</li>
      <li><strong>Jadwal Sholat &amp; Kalender Hijriyah:</strong> Sinkronisasi waktu adzan/iqomah otomatis sesuai koordinat daerah setempat dengan animasi kalender hijriyah smooth di perangkat mobile.</li>
      <li><strong>Akuntabilitas Kas Keuangan:</strong> Grafik mutasi harian, transparansi penerimaan infaq/sedekah, dan saldo berjalan realtime.</li>
      <li><strong>Al-Qur'an 30 Juz &amp; Murottal:</strong> Pemutar audio 114 surah interaktif di beranda dan mushaf Al-Qur'an digital lengkap dengan terjemahan bahasa Indonesia.</li>
      <li><strong>Proposal Terbuka &amp; Program Kerja:</strong> Format mata uang Rupiah ribuan (Rp), indikator target pendanaan, serta tombol unduh berkas PDF proposal resmi.</li>
      <li><strong>Multi-Platform Share:</strong> Tombol berbagi informasi ke WhatsApp, Facebook, X (Twitter), Telegram, LinkedIn, dan Salin Link pada Beranda, Artikel, Kegiatan, dan Proposal.</li>
    </ul>
  </div>

  <!-- ==================== HALAMAN 3: FITUR BERANDA & PROFIL ==================== -->
  <div class="page-break">
    <h1 class="sec-title">2. Fitur Publik: Beranda &amp; Profil Masjid</h1>

    <div class="feature-card avoid-break">
      <div class="feature-card-title">
        <span>A. Hero Section &amp; Navigasi Menu Terpadu</span>
        <span class="badge-tag online">LIVE</span>
      </div>
      <p>
        Bagian teratas beranda menyajikan identitas visual kemegahan Masjid An-Nuur Arwana, headline sambutan selamat datang, tautan cepat donasi, serta tombol navigasi pintar dengan menu dropdown: <em>Beranda, Al-Qur'an, Kegiatan &amp; Program (Agenda, Program Kerja, Proposal), Berita &amp; Artikel, Donasi &amp; Kas,</em> serta <em>Hubungi (Profil, Galeri, Kontak)</em>.
      </p>
      ${imgHero ? `
      <div class="img-container">
        <img src="${imgHero}" alt="Hero & Navbar Website Masjid An-Nuur">
        <div class="img-caption">Gambar 1: Tampilan Hero Section, Navbar Menu Bertingkat, dan Tombol Quick Action WhatsApp</div>
      </div>` : ''}
    </div>

    <div class="feature-card avoid-break">
      <div class="feature-card-title">
        <span>B. Section Profil dengan Background Masjid Blended &amp; Keterbacaan Maksimal</span>
        <span class="badge-tag online">BARU DIRILIS</span>
      </div>
      <p>
        Section profil dirancang khusus menggunakan foto asli bangunan Masjid An-Nuur Arwana sebagai latar belakang artistik. Foto di-blend secara bertingkat dengan gradasi warna krem masjid di sisi kiri dan atas-bawah sehingga foto menyatu tanpa garis kaku. Teks profil dilindungi oleh card semi-transparan dengan border emas sehingga teks hijau tua tetap sangat kontras, tajam, dan mudah dibaca di segala perangkat. Dilengkapi link "Selengkapnya tentang masjid" menuju halaman profil lengkap.
      </p>
      ${imgProfil ? `
      <div class="img-container">
        <img src="${imgProfil}" alt="Section Profil dengan Background Blended">
        <div class="img-caption">Gambar 2: Tampilan Section Profil Beranda dengan Foto Masjid Blended dan Card Teks Ultra-Readable</div>
      </div>` : ''}
    </div>
  </div>

  <!-- ==================== HALAMAN 4: JADWAL SHOLAT, JUMAT & KEUANGAN ==================== -->
  <div class="page-break">
    <h1 class="sec-title">3. Fitur Ibadah &amp; Transparansi Keuangan</h1>

    <div class="feature-card avoid-break">
      <div class="feature-card-title">
        <span>A. Jadwal Sholat Wajib &amp; Kalender Hijriyah Interaktif</span>
        <span class="badge-tag online">OTOMATIS</span>
      </div>
      <p>
        Menghitung waktu sholat 5 waktu (Subuh, Dzuhur, Ashar, Maghrib, Isya) plus waktu Terbit/Syuruq secara otomatis berdasarkan perhitungan akurat hisab rukyat wilayah Karawang/Jawa Barat. Dilengkapi penanda waktu sholat berikutnya yang sedang berjalan (countdown timer). Pada tampilan smartphone (mobile), kalender hijriyah dilengkapi animasi perpindahan bulan geser halus (smooth gesture sheet).
      </p>
      ${imgJadwal ? `
      <div class="img-container">
        <img src="${imgJadwal}" alt="Jadwal Sholat & Waktu Ibadah">
        <div class="img-caption">Gambar 3: Modul Jadwal Sholat 5 Waktu Otomatis & Tanggal Kalender Hijriyah</div>
      </div>` : ''}
    </div>

    <div class="feature-card avoid-break">
      <div class="feature-card-title">
        <span>B. Transparansi Kas Keuangan &amp; Laporan Infaq Real-Time</span>
        <span class="badge-tag online">TERBUKA</span>
      </div>
      <p>
        Menampilkan laporan keuangan kas operasional masjid secara terbuka kepada seluruh jamaah. Dilengkapi kartu saldo kas periode berjalan, grafik tren penerimaan dan pengeluaran harian, serta rincian mutasi kas masuk/keluar yang dapat dipantau langsung oleh para donatur dan masyarakat.
      </p>
      ${imgKeuangan ? `
      <div class="img-container">
        <img src="${imgKeuangan}" alt="Laporan Keuangan Kas Masjid">
        <div class="img-caption">Gambar 4: Dashboard Transparansi Kas Masjid, Grafik Fluktuasi Harian, dan Rincian Saldo</div>
      </div>` : ''}
    </div>

    ${imgJumat ? `
    <div class="feature-card avoid-break">
      <div class="feature-card-title">
        <span>C. Jadwal Petugas Khotib &amp; Imam Sholat Jumat</span>
        <span class="badge-tag online">ROUTINE</span>
      </div>
      <p>
        Memberikan kepastian informasi kepada jamaah mengenai nama Khotib, Imam, Muadzin, dan tanggal pelaksanaan Sholat Jumat setiap pekannya dalam satu bulan berjalan.
      </p>
      <div class="img-container">
        <img src="${imgJumat}" alt="Jadwal Khotib Sholat Jumat">
        <div class="img-caption">Gambar 5: Tabel Jadwal Khotib dan Petugas Sholat Jumat Mingguan</div>
      </div>
    </div>` : ''}
  </div>

  <!-- ==================== HALAMAN 5: AL-QUR'AN, PROPOSAL & DONASI ==================== -->
  <div class="page-break">
    <h1 class="sec-title">4. Al-Qur'an Digital, Proposal &amp; Donasi QRIS</h1>

    <div class="feature-card avoid-break">
      <div class="feature-card-title">
        <span>A. Murottal 30 Juz &amp; Mushaf Digital Al-Qur'an</span>
        <span class="badge-tag online">AUDIO &amp; TEKS</span>
      </div>
      <p>
        Website dilengkapi pemutar murottal Al-Qur'an 30 Juz (114 Surah) bersuara jernih yang dilantunkan oleh Syaikh Misyari Rasyid Al-Afasi. Jamaah dapat memutar surah langsung dari beranda, memilih daftar playlist, serta membuka halaman mushaf digital lengkap dengan ayat berbahasa Arab, transliterasi latin, dan terjemahan resmi bahasa Indonesia.
      </p>
      ${imgMurottal ? `
      <div class="img-container">
        <img src="${imgMurottal}" alt="Pemutar Audio Murottal Al-Qur'an">
        <div class="img-caption">Gambar 6: Pemutar Audio Murottal 30 Juz Interaktif dengan Kontrol Player Lengkap</div>
      </div>` : ''}
    </div>

    <div class="feature-card avoid-break">
      <div class="feature-card-title">
        <span>B. Proposal Terbuka, Program Kerja &amp; Unduh Berkas PDF</span>
        <span class="badge-tag online">FORMAT RUPIAH</span>
      </div>
      <p>
        Menampilkan program prioritas pembangunan dan pengadaan sarana ibadah. Anggaran proposal kini menggunakan format mata uang Indonesia yang baku (contoh: <code>Rp 25.000.000</code> dengan titik desimal ribuan). Dilengkapi tombol **Unduh Proposal (PDF)** langsung dari file PDF yang diunggah pengurus di admin, serta tombol donasi cepat.
      </p>
      ${imgProposal ? `
      <div class="img-container">
        <img src="${imgProposal}" alt="Halaman Proposal Terbuka">
        <div class="img-caption">Gambar 7: Halaman Proposal Terbuka dengan Indikator Progress Pendanaan dan Link Download PDF</div>
      </div>` : ''}
    </div>

    ${imgDonasi ? `
    <div class="feature-card avoid-break">
      <div class="feature-card-title">
        <span>C. Kanal Donasi Digital &amp; QRIS Resmi DKM</span>
        <span class="badge-tag online">QRIS &amp; TRANSFER</span>
      </div>
      <p>
        Memudahkan jamaah berinfaq dari mana saja menggunakan Scan QRIS (GoPay, OVO, Dana, ShopeePay, BCA Mobile, Livin, dll.) serta transfer bank resmi DKM dengan salin nomor rekening instan dan konfirmasi otomatis ke WhatsApp pengurus.
      </p>
      <div class="img-container">
        <img src="${imgDonasi}" alt="Modul Donasi dan QRIS">
        <div class="img-caption">Gambar 8: Modul Donasi Infaq/Sedekah dengan QRIS Standar Bank Indonesia dan Daftar Rekening Bank</div>
      </div>
    </div>` : ''}
  </div>

  <!-- ==================== HALAMAN 6: HALAMAN PROFIL PENUH & FITUR SHARE ==================== -->
  <div class="page-break">
    <h1 class="sec-title">5. Halaman Profil Lengkap &amp; Berbagi Multi-Platform</h1>

    <div class="feature-card avoid-break">
      <div class="feature-card-title">
        <span>A. Halaman Profil Khusus (/profil) &amp; Susunan Kepengurusan DKM</span>
        <span class="badge-tag online">LENGKAP</span>
      </div>
      <p>
        Halaman khusus <code>/profil</code> menyajikan informasi komprehensif mengenai sejarah berdirinya masjid, visi, misi, nilai-nilai kemakmuran masjid, banner megah foto gedung masjid, kontak sekretariat, serta susunan pengurus DKM (Penasehat, Pimpinan/Ketua, Ketua Bidang, dan Operasional).
      </p>
      ${imgHalamanProfil ? `
      <div class="img-container">
        <img src="${imgHalamanProfil}" alt="Halaman Profil Lengkap Masjid">
        <div class="img-caption">Gambar 9: Halaman Profil Khusus dengan Banner Foto Gedung Utama dan Struktur Kepengurusan</div>
      </div>` : ''}
    </div>

    <div class="feature-card avoid-break">
      <div class="feature-card-title">
        <span>B. Fitur Berbagi Multi-Platform (Social Share Universal)</span>
        <span class="badge-tag online">MULTI-PLATFORM</span>
      </div>
      <p>
        Setiap halaman dan konten dakwah (Beranda, Profil, Artikel/Berita, Agenda Kegiatan, dan Proposal) kini dilengkapi tombol **"Bagikan"** cerdas yang mendukung integrasi langsung ke berbagai platform:
      </p>
      <table class="data-table">
        <thead>
          <tr>
            <th>Platform</th>
            <th>Mekanisme Berbagi</th>
            <th>Tujuan Penggunaan</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>WhatsApp</strong></td>
            <td>Tautan langsung ke obrolan/grup WA dengan pesan terformat rapi.</td>
            <td>Penyebaran tercepat di grup jamaah RT/RW 15.</td>
          </tr>
          <tr>
            <td><strong>Facebook</strong></td>
            <td>Dialog Share resmi FB dengan preview gambar dan judul berita.</td>
            <td>Menjangkau jamaah yang aktif di media sosial keluarga.</td>
          </tr>
          <tr>
            <td><strong>X (Twitter)</strong></td>
            <td>Tweet generator otomatis dengan tautan resmi masjid.</td>
            <td>Publikasi kegiatan dan dakwah ke publik luas.</td>
          </tr>
          <tr>
            <td><strong>Telegram &amp; LinkedIn</strong></td>
            <td>Share link langsung ke channel Telegram dan jaringan profesional.</td>
            <td>Penggalangan proposal program dan donasi korporat.</td>
          </tr>
          <tr>
            <td><strong>Salin Tautan</strong></td>
            <td>Clipboard copy instan dengan konfirmasi visual "✓ Tersalin!".</td>
            <td>Fleksibilitas dibagikan ke platform perpesanan lainnya.</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>

  <!-- ==================== HALAMAN 7: DASHBOARD ADMIN & PENGELOLAAN ==================== -->
  <div class="page-break">
    <h1 class="sec-title">6. Panel Pengelolaan DKM (Dashboard Admin)</h1>

    <p>
      Untuk memastikan website selalu mutakhir, pengurus DKM dibekali **Dashboard Admin** yang aman, mudah dipahami, dan dapat dioperasikan langsung dari smartphone maupun laptop pengurus melalui alamat <code>https://masjidannuurarwana.web.id/admin</code>.
    </p>

    <div class="feature-card avoid-break">
      <div class="feature-card-title">
        <span>A. Sistem Keamanan Login Pengurus DKM</span>
        <span class="badge-tag online">TERENKRIPSI</span>
      </div>
      <p>
        Akses admin dilindungi oleh autentikasi aman dengan session cookies terenkripsi. Hanya akun pengurus terdaftar yang berhak masuk dan melakukan perubahan data.
      </p>
      ${imgAdminLogin ? `
      <div class="img-container">
        <img src="${imgAdminLogin}" alt="Halaman Login Admin Pengurus DKM">
        <div class="img-caption">Gambar 10: Antarmuka Login Aman Pengurus DKM Masjid An-Nuur Arwana</div>
      </div>` : ''}
    </div>

    <h2 class="sub-title">Daftar Modul Pengelolaan Admin</h2>
    <table class="data-table">
      <thead>
        <tr>
          <th>Nama Modul</th>
          <th>Fungsi Utama Pengurus</th>
          <th>Hak Akses</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>Kelola Section Beranda</strong></td>
          <td>Mengubah urutan, menyembunyikan/menampilkan section, mengedit teks profil dengan Rich Text Editor, pembatas "Selengkapnya (Readmore)", dan foto.</td>
          <td>Admin &amp; Editor</td>
        </tr>
        <tr>
          <td><strong>Pengaturan Identitas &amp; Logo</strong></td>
          <td>Mengunggah Favicon dan Logo resmi Masjid An-Nuur yang akan tampil di navbar, header, dan dokumen cetak.</td>
          <td>Super Admin</td>
        </tr>
        <tr>
          <td><strong>Kas &amp; Keuangan</strong></td>
          <td>Pencatatan transaksi kas masuk (infaq tromol, transfer, zakat) dan kas keluar operasional dengan pelaporan otomatis.</td>
          <td>Bendahara DKM</td>
        </tr>
        <tr>
          <td><strong>Proposal Terbuka</strong></td>
          <td>Membuat proposal renovasi/sarana, memasukkan target dana dalam format Rupiah ribuan (Rp), dan mengunggah berkas PDF proposal.</td>
          <td>Admin &amp; Pimpinan</td>
        </tr>
        <tr>
          <td><strong>Program Kerja DKM</strong></td>
          <td>Menyusun program kerja jangka pendek, menengah, dan tahunan beserta penanggung jawab bidang.</td>
          <td>Sekretaris &amp; Bidang</td>
        </tr>
        <tr>
          <td><strong>Agenda &amp; Sholat Jumat</strong></td>
          <td>Memperbarui jadwal kajian rutin, tabligh akbar, serta rotasi nama Khotib dan Imam Sholat Jumat mingguan.</td>
          <td>Bidang Dakwah</td>
        </tr>
        <tr>
          <td><strong>Berita &amp; Artikel</strong></td>
          <td>Mempublikasikan laporan kegiatan, dokumentasi foto, dan artikel keislaman untuk jamaah.</td>
          <td>Humas &amp; Media</td>
        </tr>
      </tbody>
    </table>
  </div>

  <!-- ==================== HALAMAN 8: LEMBAR SERAH TERIMA & PENGESAHAN ==================== -->
  <div>
    <h1 class="sec-title">7. Berita Acara Serah Terima &amp; Pengesahan</h1>

    <p>
      Dengan diterbitkannya dokumen ini, sistem website resmi <strong>Masjid An-Nuur Arwana</strong> dengan alamat domain <strong>https://masjidannuurarwana.web.id</strong> dinyatakan telah selesai dibangun, diuji, dan diserahterimakan kepada Dewan Kemakmuran Masjid (DKM) An-Nuur Arwana untuk dimanfaatkan sebesar-besarnya bagi kemakmuran masjid dan pelayanan umat.
    </p>

    <div class="highlight-box">
      <strong>Pernyataan Kesiapan Sistem:</strong><br>
      "Seluruh modul front-end publik, modul ibadah otomatis, modul transparansi keuangan, modul proposal terbuka berformat rupiah, modul mushaf Al-Qur'an 30 juz, fitur share multi-platform, serta panel admin pengurus telah melewati masa pengujian fungsionalitas (100% lulus uji) dan beroperasi penuh secara online."
    </div>

    <p style="margin-top: 25px; font-weight: 700; text-align: center;">
      Ditetapkan di Karawang, Jawa Barat<br>
      Pada tanggal: 19 November 2026
    </p>

    <div class="signature-grid">
      <div>
        <p class="sig-box">Diserahkan Oleh:</p>
        <div class="sig-name">Tim Pengembang Sistem</div>
        <div class="sig-role">Digital Development &amp; Media</div>
      </div>
      <div>
        <p class="sig-box">Mengetahui &amp; Menyetujui:</p>
        <div class="sig-name">Ketua DKM An-Nuur</div>
        <div class="sig-role">Dewan Kemakmuran Masjid</div>
      </div>
      <div>
        <p class="sig-box">Diterima Pengelola:</p>
        <div class="sig-name">Sekretaris / Pengurus DKM</div>
        <div class="sig-role">Pengelola Harian Website</div>
      </div>
    </div>

    <div style="margin-top: 50px; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 15px; font-size: 8pt; color: #94a3b8;">
      Masjid An-Nuur Arwana | Rukun Warga 15, Perumahan Arwana, Karawang, Jawa Barat<br>
      Portal Resmi: https://masjidannuurarwana.web.id • Email: dkm@masjidannuurarwana.web.id
    </div>
  </div>

</body>
</html>
  `;

  console.log('Merender HTML ke format PDF resmi via Google Chrome...');
  const printPage = await browser.newPage();
  await printPage.setContent(htmlContent, { waitUntil: 'load' });
  await printPage.waitForTimeout(2000);

  await printPage.pdf({
    path: PDF_OUTPUT,
    format: 'A4',
    printBackground: true,
    margin: {
      top: '14mm',
      bottom: '16mm',
      left: '14mm',
      right: '14mm',
    },
    displayHeaderFooter: true,
    headerTemplate: '<div></div>',
    footerTemplate: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, Arial, sans-serif; font-size: 7.5pt; width: 100%; display: flex; justify-content: space-between; padding: 0 16mm; color: #718096; border-top: 1px solid #edf2f7; padding-top: 4px;">
        <span>Masjid An-Nuur Arwana — Dokumen Resmi Rilis &amp; Fitur Website (masjidannuurarwana.web.id)</span>
        <span>Halaman <span class="pageNumber"></span> dari <span class="totalPages"></span></span>
      </div>
    `,
  });

  await printPage.close();
  console.log('Dokumen PDF berhasil dibuat di:', PDF_OUTPUT);
}

async function run() {
  const browser = await chromium.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: true,
  });

  try {
    await captureScreenshots(browser);
    await generatePdf(browser);
  } finally {
    await browser.close();
  }
}

run().catch(console.error);
