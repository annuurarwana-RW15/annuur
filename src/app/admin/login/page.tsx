import type { Metadata } from 'next'
import { LoginForm } from './login-form'

export const metadata: Metadata = {
  title: 'Masuk — Admin Masjid An-nuur Arwana',
  robots: { index: false, follow: false },
}

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-50 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-neutral-200 bg-white p-8 shadow-sm">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#0F4C3A] text-lg font-semibold text-white">
            AN
          </div>
          <h1 className="text-xl font-semibold text-neutral-900">
            Masjid An-nuur Arwana
          </h1>
          <p className="mt-1 text-sm text-neutral-500">Masuk ke panel admin</p>
        </div>
        <LoginForm />
      </div>
    </main>
  )
}
