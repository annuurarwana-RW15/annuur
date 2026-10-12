import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CredentialsSignin } from 'next-auth'

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
  beforeEach(() => {
    signInMock.mockReset()
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
  })

  it('redirect ke /admin saat login berhasil', async () => {
    signInMock.mockResolvedValue('/admin')

    const error = await captureError(login({}, formData('admin@an-nur.local', 'Admin123!')))

    expect(String((error as Error).digest)).toContain('NEXT_REDIRECT')
    expect(String((error as Error).digest)).toContain('/admin')
  })

  it('menolak input kosong tanpa memanggil signIn', async () => {
    const state = await login({}, formData('', ''))

    expect(state.error).toBeTruthy()
    expect(signInMock).not.toHaveBeenCalled()
  })
})
