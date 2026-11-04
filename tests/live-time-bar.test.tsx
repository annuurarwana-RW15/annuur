import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { LiveTimeBar } from '@/components/public/LiveTimeBar'

describe('LiveTimeBar', () => {
  it('merender teks waktu, penanggalan Masehi, dan penanggalan Hijriah', () => {
    render(<LiveTimeBar />)

    // Memverifikasi teks WIB
    expect(screen.getByText(/WIB/i)).toBeInTheDocument()

    // Memverifikasi adanya penanggalan Hijriah (H)
    const hijriElements = screen.getAllByText(/144\d\s+H/i)
    expect(hijriElements.length).toBeGreaterThan(0)
  })
})

