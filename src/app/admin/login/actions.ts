'use server'

import { AuthError } from 'next-auth'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { signIn } from '@/lib/auth'
import {
  isLoginRateLimited,
  LOGIN_RATE_MESSAGE,
} from '@/lib/login-rate-limit'
import { ipFromHeaders } from '@/lib/rate-limit'

export interface LoginState {
  error?: string
}

export async function login(
  _prevState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get('email') ?? '')
    .trim()
    .toLowerCase()
  const password = String(formData.get('password') ?? '')

  if (!email || !password) {
    return { error: 'Email dan password wajib diisi' }
  }

  // Cek awal: authorize menegakkan limit yang sama sebagai choke point, di sini
  // hanya agar pengguna melihat pesan jelas, bukan "Email atau password salah".
  if (isLoginRateLimited(ipFromHeaders(await headers()))) {
    return { error: LOGIN_RATE_MESSAGE }
  }

  try {
    await signIn('credentials', { email, password, redirect: false })
  } catch (error) {
    if (error instanceof AuthError) {
      console.error('[auth] login error', error)
      return { error: 'Email atau password salah' }
    }
    throw error
  }

  redirect('/admin')
}
