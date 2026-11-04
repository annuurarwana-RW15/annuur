import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { PrintTrigger } from '@/app/admin/(dashboard)/inventaris/peminjaman/[id]/cetak/PrintTrigger'

describe('PrintTrigger', () => {
  it('merender tombol cetak dan memanggil window.print saat diklik', () => {
    const printSpy = vi.spyOn(window, 'print').mockImplementation(() => {})

    render(<PrintTrigger />)

    expect(screen.getByText(/Lembar Bukti Serah Terima Siap Dicetak/i)).toBeInTheDocument()
    const printBtn = screen.getByRole('button', { name: /Cetak Dokumen/i })
    expect(printBtn).toBeInTheDocument()

    fireEvent.click(printBtn)
    expect(printSpy).toHaveBeenCalledTimes(1)

    printSpy.mockRestore()
  })
})

