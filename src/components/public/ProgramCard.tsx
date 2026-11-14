import Link from 'next/link'
import type {
  ProgramPeriodType,
  ProgramCategory,
  ProgramStatus,
} from '@prisma/client'
import { formatRupiah } from '@/lib/format'
import { formatWhatsAppLink } from '@/lib/whatsapp'

export interface ProgramWithRelations {
  id: string
  title: string
  slug: string
  description: string
  periodType: ProgramPeriodType
  category: ProgramCategory
  status: ProgramStatus
  progress: number
  targetDate: Date | string | null
  budgetEstimate: any
  picName: string | null
  picPhone: string | null
  order: number
  isFeatured: boolean
  createdAt: Date | string
  updatedAt: Date | string
  proposals?: Array<{
    id: string
    title: string
    slug: string
    status: string
    targetAmount: any
  }>
}

const CATEGORY_MAP: Record<
  ProgramCategory,
  { label: string; badgeClass: string }
> = {
  IMARAH: {
    label: 'Imarah (Kemakmuran)',
    badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  },
  RIAYAH: {
    label: 'Riayah (Sarana/Fisik)',
    badgeClass: 'bg-amber-100 text-amber-800 border-amber-200',
  },
  IDARAH: {
    label: 'Idarah (Manajemen)',
    badgeClass: 'bg-blue-100 text-blue-800 border-blue-200',
  },
  SOSIAL: {
    label: 'Sosial (Pelayanan Umat)',
    badgeClass: 'bg-purple-100 text-purple-800 border-purple-200',
  },
}

const STATUS_MAP: Record<ProgramStatus, { label: string; dotClass: string }> = {
  DIRENCANAKAN: { label: 'Direncanakan', dotClass: 'bg-gray-400' },
  BERJALAN: { label: 'Sedang Berjalan', dotClass: 'bg-blue-500' },
  SELESAI: { label: 'Selesai', dotClass: 'bg-emerald-500' },
  DITUNDA: { label: 'Ditunda', dotClass: 'bg-rose-500' },
}

export function ProgramCard({ program }: { program: ProgramWithRelations }) {
  const cat = CATEGORY_MAP[program.category] || CATEGORY_MAP.IMARAH
  const stat = STATUS_MAP[program.status] || STATUS_MAP.DIRENCANAKAN
  const isPanjang = program.periodType === 'PANJANG'
  const activeProposal = program.proposals && program.proposals.length > 0 ? program.proposals[0] : null

  return (
    <article className="flex h-full flex-col justify-between rounded-2xl border border-emas/20 bg-white p-5 shadow-xs transition hover:shadow-md">
      <div>
        {/* Top Badges */}
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${cat.badgeClass}`}
          >
            {cat.label}
          </span>
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
              isPanjang
                ? 'bg-purple-50 text-purple-700 ring-1 ring-purple-200'
                : 'bg-teal-50 text-teal-700 ring-1 ring-teal-200'
            }`}
          >
            {isPanjang ? 'Jangka Panjang' : 'Jangka Pendek'}
          </span>
          <span className="ml-auto inline-flex items-center gap-1.5 text-xs font-medium text-slate-600">
            <span className={`h-2 w-2 rounded-full ${stat.dotClass}`} />
            {stat.label}
          </span>
        </div>

        {/* Title & Description */}
        <h3 className="mt-3 font-display text-lg font-bold text-hijau-tua">
          {program.title}
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-slate-600 line-clamp-3">
          {program.description}
        </p>

        {/* Progress Bar */}
        <div className="mt-4 rounded-xl bg-slate-50 p-3 ring-1 ring-slate-100">
          <div className="flex items-center justify-between text-xs font-medium">
            <span className="text-slate-600">Capaian Pelaksanaan</span>
            <span className="font-bold text-hijau">{program.progress}%</span>
          </div>
          <div
            className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-200"
            role="progressbar"
            aria-valuenow={program.progress}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                program.progress === 100
                  ? 'bg-emerald-500'
                  : program.progress >= 50
                  ? 'bg-hijau'
                  : 'bg-emas'
              }`}
              style={{ width: `${program.progress}%` }}
            />
          </div>
        </div>

        {/* Info Grid (Budget & Target) */}
        <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-600">
          {program.budgetEstimate && Number(program.budgetEstimate) > 0 ? (
            <div>
              <span className="block text-[11px] text-slate-600">Estimasi Anggaran:</span>
              <span className="font-semibold text-slate-800">
                {formatRupiah(Number(program.budgetEstimate))}
              </span>
            </div>
          ) : null}

          {program.targetDate ? (
            <div>
              <span className="block text-[11px] text-slate-600">Target Rampung:</span>
              <span className="font-semibold text-slate-800">
                {new Date(program.targetDate).toLocaleDateString('id-ID', {
                  month: 'short',
                  year: 'numeric',
                })}
              </span>
            </div>
          ) : null}
        </div>
      </div>

      {/* Footer Info & Action */}
      <div className="mt-5 border-t border-slate-100 pt-3">
        {program.picName && (
          <div className="flex items-center justify-between text-xs text-slate-600">
            <span>
              PIC: <strong className="text-slate-700">{program.picName}</strong>
            </span>
            {program.picPhone && (
              <a
                href={formatWhatsAppLink(
                  program.picPhone,
                  `Assalamu'alaikum, saya ingin bertanya perihal program: ${program.title}`,
                )}
                target="_blank"
                rel="noreferrer"
                className="text-hijau hover:underline font-medium"
              >
                Hubungi PIC
              </a>
            )}
          </div>
        )}

        {activeProposal && (
          <div className="mt-3">
            <Link
              href={`/proposal/${activeProposal.slug}`}
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-hijau/10 px-3 py-2 text-xs font-semibold text-hijau transition hover:bg-hijau hover:text-white"
            >
              <span>Proposal Terkait: {activeProposal.title}</span>
              <svg
                viewBox="0 0 20 20"
                fill="currentColor"
                className="h-3.5 w-3.5"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M3 10a.75.75 0 0 1 .75-.75h10.638L10.23 5.29a.75.75 0 1 1 1.04-1.08l5.5 5.25a.75.75 0 0 1 0 1.08l-5.5 5.25a.75.75 0 1 1-1.04-1.08l4.158-3.96H3.75A.75.75 0 0 1 3 10Z"
                  clipRule="evenodd"
                />
              </svg>
            </Link>
          </div>
        )}
      </div>
    </article>
  )
}
