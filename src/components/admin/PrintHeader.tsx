import { formatDateID } from '@/lib/format'

export interface PrintHeaderProps {
  title: string
  subtitle?: string
  logoUrl?: string
  meta?: string
}

export function PrintHeader({
  title,
  subtitle,
  logoUrl,
  meta,
}: PrintHeaderProps): React.JSX.Element {
  return (
    <div className="print-only mb-4 border-b-2 border-neutral-800 pb-3 text-neutral-900">
      <div className="flex items-center gap-3">
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- kop cetak, di luar alur image optimizer
          <img src={logoUrl} alt="Logo masjid" className="h-14 w-14 object-contain" />
        ) : null}
        <p className="text-base font-bold uppercase tracking-wide">Masjid An-nuur Arwana</p>
      </div>
      <h1 className="mt-2 text-xl font-semibold">{title}</h1>
      {subtitle ? <p className="text-sm">{subtitle}</p> : null}
      <p className="text-xs text-neutral-600">{`Tanggal cetak: ${formatDateID(new Date())}`}</p>
      {meta ? <p className="text-xs text-neutral-600">{meta}</p> : null}
    </div>
  )
}
