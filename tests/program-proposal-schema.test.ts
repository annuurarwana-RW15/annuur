import { describe, it, expect } from 'vitest'
import {
  ProgramPeriodType,
  ProgramCategory,
  ProgramStatus,
  ProposalStatus,
} from '@prisma/client'

describe('Program and Proposal Prisma Schema Enums', () => {
  it('should expose ProgramPeriodType with PENDEK and PANJANG', () => {
    expect(ProgramPeriodType.PENDEK).toBe('PENDEK')
    expect(ProgramPeriodType.PANJANG).toBe('PANJANG')
  })

  it('should expose ProgramCategory enums', () => {
    expect(ProgramCategory.IDARAH).toBe('IDARAH')
    expect(ProgramCategory.IMARAH).toBe('IMARAH')
    expect(ProgramCategory.RIAYAH).toBe('RIAYAH')
    expect(ProgramCategory.SOSIAL).toBe('SOSIAL')
  })

  it('should expose ProgramStatus enums', () => {
    expect(ProgramStatus.DIRENCANAKAN).toBe('DIRENCANAKAN')
    expect(ProgramStatus.BERJALAN).toBe('BERJALAN')
    expect(ProgramStatus.SELESAI).toBe('SELESAI')
    expect(ProgramStatus.DITUNDA).toBe('DITUNDA')
  })

  it('should expose ProposalStatus enums', () => {
    expect(ProposalStatus.DRAFT).toBe('DRAFT')
    expect(ProposalStatus.DIBUKA).toBe('DIBUKA')
    expect(ProposalStatus.TERPENUHI).toBe('TERPENUHI')
    expect(ProposalStatus.SELESAI).toBe('SELESAI')
  })
})

