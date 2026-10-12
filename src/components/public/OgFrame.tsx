const HIJAU = '#0f4c3a'
const EMAS = '#c9a227'
const EMAS_MUDA = '#e8d48b'
const KREM = '#faf7f0'

/**
 * Frame Open Graph (inline style — dipakai `next/og`/satori, bukan Tailwind).
 * Warna mengikuti token global: hijau tua, aksen emas, teks krem.
 */
export function OgFrame({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow?: string
  title: string
  subtitle?: string
}) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        height: '100%',
        backgroundColor: HIJAU,
        padding: '72px 96px',
        position: 'relative',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: -140,
          right: -90,
          width: 380,
          height: 380,
          borderRadius: 190,
          border: `3px solid ${EMAS}`,
          opacity: 0.35,
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: -160,
          left: -70,
          width: 440,
          height: 440,
          borderRadius: 220,
          border: `3px solid ${EMAS}`,
          opacity: 0.22,
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: 56,
          left: 72,
          width: 16,
          height: 16,
          backgroundColor: EMAS,
          transform: 'rotate(45deg)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: 56,
          right: 72,
          width: 16,
          height: 16,
          backgroundColor: EMAS,
          transform: 'rotate(45deg)',
        }}
      />

      {eyebrow && (
        <div
          style={{
            color: EMAS,
            fontSize: 26,
            letterSpacing: 10,
            textTransform: 'uppercase',
          }}
        >
          {eyebrow}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', margin: '32px 0' }}>
        <div style={{ width: 140, height: 3, backgroundColor: EMAS }} />
        <div
          style={{
            width: 14,
            height: 14,
            margin: '0 18px',
            backgroundColor: EMAS,
            transform: 'rotate(45deg)',
          }}
        />
        <div style={{ width: 140, height: 3, backgroundColor: EMAS }} />
      </div>

      <div
        style={{
          color: KREM,
          fontSize: 64,
          lineHeight: 1.2,
          textAlign: 'center',
          maxWidth: 940,
        }}
      >
        {title}
      </div>

      {subtitle && (
        <div
          style={{
            color: EMAS_MUDA,
            fontSize: 32,
            marginTop: 28,
            textAlign: 'center',
          }}
        >
          {subtitle}
        </div>
      )}
    </div>
  )
}
