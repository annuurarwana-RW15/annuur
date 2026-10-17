import { expect, test, type Page } from '@playwright/test'
import { readFile } from 'node:fs/promises'

const ADMIN_EMAIL = 'admin@an-nur.local'
const ADMIN_PASSWORD = 'Admin123!'

async function login(page: Page): Promise<void> {
  await page.goto('/admin/login')
  await page.fill('#email', ADMIN_EMAIL)
  await page.fill('#password', ADMIN_PASSWORD)
  await page.getByRole('button', { name: 'Masuk' }).click()
  await page.waitForURL('**/admin')
}

async function createTx(
  page: Page,
  marker: string,
  amount: string,
  jenis: 'MASUK' | 'KELUAR',
): Promise<void> {
  await page.goto('/admin/kas/transaksi')
  await page.getByRole('link', { name: '+ Transaksi baru' }).click()
  await page.waitForURL('**edit=new**')
  await page.locator('input[type="date"]').fill('2026-10-15')
  await page.locator(`input[name="type"][value="${jenis}"]`).check()
  await page.getByLabel(/Kategori/).selectOption({ index: 1 })
  await page.getByPlaceholder('Contoh: 150000').fill(amount)
  await page.getByPlaceholder('Contoh: Infak jamaah shalat Jumat').fill(marker)
  await page.getByRole('button', { name: 'Simpan transaksi' }).click()
  await page.waitForURL('**/admin/kas/transaksi')
  await expect(page.getByRole('row', { name: new RegExp(marker) })).toHaveCount(1)
}

async function deleteTx(page: Page, marker: string): Promise<void> {
  await page.goto('/admin/kas/transaksi')
  const row = page.getByRole('row', { name: new RegExp(marker) })
  page.once('dialog', (dialog) => void dialog.accept())
  await row.getByRole('button', { name: 'Hapus' }).click()
  await expect(row).toHaveCount(0)
}

/** Kartu "Saldo Akhir" di layar — locator web-first (auto-retry) + nilai tanpa format. */
function cardSaldoAkhir(page: Page) {
  return page.locator('div:has(> p:text-is("Saldo Akhir")) p.tabular-nums').first()
}

/** Angka pada baris footer `SALDO AKHIR;;;;;;;540000` di CSV hasil ekspor. */
function footerSaldoAkhir(csv: string): string {
  const line = csv.split('\n').find((row) => row.startsWith('SALDO AKHIR'))
  expect(line, 'baris footer SALDO AKHIR harus ada di CSV').toBeDefined()
  return (line as string).trim().split(';').pop() ?? ''
}

/**
 * Tunggu React selesai hydration sebelum menekan tombol. Setelah navigasi,
 * HTML-SSR sudah memuat tombolnya tapi handler onClick belum terpasang —
 * menekan terlalu awal membuat klik ditelan tanpa error apa pun.
 */
async function waitForHydration(page: Page, buttonText: string): Promise<void> {
  await page.waitForFunction(
    (label) => {
      const btn = Array.from(document.querySelectorAll('button')).find(
        (el) => el.textContent?.trim() === label,
      )
      return !!btn && Object.keys(btn).some((key) => key.startsWith('__reactProps$'))
    },
    buttonText,
  )
}

async function exportCsv(page: Page): Promise<string> {
  await waitForHydration(page, 'Ekspor CSV')
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Ekspor CSV' }).click(),
  ])
  const file = await download.path()
  expect(file, 'unduhan CSV harus menghasilkan berkas').not.toBeNull()
  return readFile(file as string, 'utf8')
}

test('ekspor jurnal: footer SALDO AKHIR = kartu, dan tetap saat filter aktif', async ({
  page,
}) => {
  const stamp = Date.now()
  const masuk = `Ekspor masuk ${stamp}`
  const keluar = `Ekspor keluar ${stamp}`

  await login(page)
  await createTx(page, masuk, '150000', 'MASUK')
  await createTx(page, keluar, '50000', 'KELUAR')

  await page.goto('/admin/kas/laporan/jurnal')
  const card = cardSaldoAkhir(page)
  const expectedText = await card.innerText()
  const expected = expectedText.replace(/\D/g, '')
  expect(expected, 'kartu Saldo Akhir harus bernilai').not.toBe('')

  // Ekspor tanpa filter — kop, header, baris, dan footer lengkap.
  const csvFull = await exportCsv(page)
  expect(csvFull).toContain('LAPORAN JURNAL KAS')
  expect(csvFull).toContain('No;Tanggal;Keterangan;Kategori;Jenis;Masuk;Keluar;Saldo')
  expect(csvFull).toContain(masuk)
  expect(csvFull).toContain(keluar)
  expect(footerSaldoAkhir(csvFull)).toBe(expected)

  // Aktifkan filter jenis KELUAR: baris menyusut, kartu tidak.
  await page.selectOption('select[name="jenis"]', 'KELUAR')
  await page.getByRole('button', { name: 'Terapkan' }).click()
  await expect(page.getByRole('row', { name: new RegExp(masuk) })).toHaveCount(0)
  await expect(page.getByRole('row', { name: new RegExp(keluar) })).toHaveCount(1)
  await expect(card).toHaveText(expectedText)

  // KUNCI: ekspor terfilter kehilangan barisnya, tapi footer tetap angka kartu
  // (bukan saldo akhir subset) — invarian harus bertahan sampai ke berkas.
  const csvFiltered = await exportCsv(page)
  expect(csvFiltered).not.toContain(masuk)
  expect(csvFiltered).toContain(keluar)
  expect(csvFiltered).toContain('Filter;jenis KELUAR')
  expect(footerSaldoAkhir(csvFiltered)).toBe(expected)

  await deleteTx(page, masuk)
  await deleteTx(page, keluar)
})
