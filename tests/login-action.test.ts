import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthError, CredentialsSignin } from 'next-auth'

const { signInMock } = vi.hoisted(() => ({ signInMock: vi.fn() }))

vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
  handlers: {},
  signIn: signInMock,
  signOut: vi.fn(),
}))

import { login } from '@/app/admin/login/actions'

function formData(email: string, password: string): FormData {
  const data = new FormData()
  data.set('email', email)
  data.set('password', password)
  return data
}

async function captureError(promise: Promise<unknown>): Promise<unknown> {
  try {
    await promise
    return null
  } catch (error) {
    return error
  }
}

describe('login server action', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    signInMock.mockReset()
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    consoleErrorSpy.mockRestore()
  })

  it('mengembalikan error umum saat kredensial salah', async () => {
    signInMock.mockRejectedValue(new CredentialsSignin())

    const state = await login({}, formData('admin@an-nur.local', 'salah'))

    expect(state).toEqual({ error: 'Email atau password salah' })
    expect(signInMock).toHaveBeenCalledWith('credentials', {
      email: 'admin@an-nur.local',
      password: 'salah',
      redirect: false,
    })
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      '[auth] login error',
      expect.any(CredentialsSignin),
    )
  })

  it('mencatat AuthError non-kredensial (mis. infra) tanpa membocorkan detail ke pengguna', async () => {
    const infraError = new AuthError('Callback route error')
    signInMock.mockRejectedValue(infraError)

    const state = await login({}, formData('admin@an-nur.local', 'Admin123!'))

    expect(state).toEqual({ error: 'Email atau password salah' })
    expect(consoleErrorSpy).toHaveBeenCalledWith('[auth] login error', infraError)
  })

  it('melempar ulang error non-AuthError', async () => {
    const error = new Error('gagal total')
    signInMock.mockRejectedValue(error)

    await expect(
      login({}, formData('admin@an-nur.local', 'Admin123!')),
    ).rejects.toThrow('gagal total')
  })

  it('redirect ke /admin saat login berhasil', async () => {
    signInMock.mockResolvedValue('/admin')

    const error = await captureError(login({}, formData('admin@an-nur.local', 'Admin123!')))

    const digest = (error as Error & { digest?: string }).digest ?? ''
    expect(String(digest)).toContain('NEXT_REDIRECT')
    expect(String(digest)).toContain('/admin')
  })

  it('menolak input kosong tanpa memanggil signIn', async () => {
    const state = await login({}, formData('', ''))

    expect(state.error).toBeTruthy()
    expect(signInMock).not.toHaveBeenCalled()
  })
})
