import { expect, test, type Page } from '@playwright/test'

const ADMIN_EMAIL = 'admin@an-nur.local'
const ADMIN_PASSWORD = 'Admin123!'

const REFERENCE_RE = /DON-[A-Z0-9]{8}/

function esc(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function acceptNextDialog(page: Page): void {
  page.once('dialog', (dialog) => void dialog.accept())
}

async function submitPublicDonation(page: Page, donorName: string): Promise<void> {
  await page.goto('/donasi')
  await page.getByPlaceholder('Contoh: Ahmad Fauzi').fill(donorName)
  await page.getByPlaceholder('Contoh: 150000').fill('54321')
  await page.getByRole('button', { name: 'Kirim donasi' }).click()
  await expect(page.getByRole('status')).toContainText(REFERENCE_RE)
}

test.describe('publik', () => {
  test('beranda → klik Berita → artikel pertama tampil h1', async ({ page }) => {
    await page.goto('/')
    const nav = page.getByRole('navigation', { name: 'Navigasi utama' })
    await nav.getByRole('link', { name: 'Berita' }).click()
    await expect(page).toHaveURL(/\/berita(\?|$)/)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

    await page.locator('main a[href^="/berita/"]').first().click()
    await expect(page).toHaveURL(/\/berita\/[^/?#]+/)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  })

  test('/donasi form valid → sukses + referensi tampil', async ({ page }) => {
    await submitPublicDonation(page, `E2E Donatur ${Date.now()}`)
  })
})

test.describe('admin', () => {
  test('login → dashboard → sections toggle → kas transaksi → donasi konfirmasi', async ({
    page,
  }) => {
    await page.goto('/admin/login')
    await page.fill('#email', ADMIN_EMAIL)
    await page.fill('#password', ADMIN_PASSWORD)
    await page.getByRole('button', { name: 'Masuk' }).click()
    await page.waitForURL('**/admin')
    await expect(page.getByRole('heading', { level: 1, name: 'Dashboard' })).toBeVisible()

    await page.goto('/admin/sections')
    const toggle = page.getByRole('switch').last()
    const before = await toggle.getAttribute('aria-checked')
    expect(before).not.toBeNull()
    await toggle.click()
    await expect(toggle).toHaveAttribute('aria-checked', before === 'true' ? 'false' : 'true')
    await toggle.click()
    await expect(toggle).toHaveAttribute('aria-checked', before as string)

    const marker = `E2E smoke transaksi ${Date.now()}`
    await page.goto('/admin/kas/transaksi')
    await page.getByRole('link', { name: '+ Transaksi baru' }).click()
    await expect(page).toHaveURL(/edit=new/)
    await page.locator('input[type="date"]').fill('2026-10-14')
    await page.locator('input[name="type"][value="MASUK"]').check()
    await page.getByLabel(/Kategori/).selectOption({ index: 1 })
    await page.getByPlaceholder('Contoh: 150000').fill('123456')
    await page.getByPlaceholder('Contoh: Infak jamaah shalat Jumat').fill(marker)
    await page.getByRole('button', { name: 'Simpan transaksi' }).click()
    await page.waitForURL('**/admin/kas/transaksi')

    const txRow = page.getByRole('row', { name: new RegExp(esc(marker)) })
    await expect(txRow).toHaveCount(1)

    const donorName = `E2E Donatur ${Date.now()}`
    await submitPublicDonation(page, donorName)

    await page.goto('/admin/donasi')
    const donationRow = page.getByRole('row', { name: new RegExp(esc(donorName)) })
    await expect(donationRow).toHaveCount(1)
    acceptNextDialog(page)
    await donationRow.getByRole('button', { name: 'Konfirmasi' }).click()
    // Halaman default menyaring antrian MENUNGGU → baris hilang setelah sukses.
    await expect(donationRow).toHaveCount(0)
    await page.goto('/admin/donasi?status=DIKONFIRMASI')
    const confirmedRow = page.getByRole('row', { name: new RegExp(esc(donorName)) })
    await expect(confirmedRow).toContainText('DIKONFIRMASI')

    await page.goto('/admin/kas/transaksi')
    const donasiTxRow = page.getByRole('row', { name: new RegExp(esc(donorName)) })
    await expect(donasiTxRow).toHaveCount(1)
    acceptNextDialog(page)
    await donasiTxRow.getByRole('button', { name: 'Hapus' }).click()
    await expect(donasiTxRow).toHaveCount(0)

    acceptNextDialog(page)
    await txRow.getByRole('button', { name: 'Hapus' }).click()
    await expect(txRow).toHaveCount(0)
  })
})
