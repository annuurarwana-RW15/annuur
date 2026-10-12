import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { compare } from 'bcryptjs'
import type { Role } from '@prisma/client'
import { db } from '@/lib/db'
import { authConfig } from '@/lib/auth.config'

export interface SessionUser {
  id: string
  name: string
  role: Role
}

const DUMMY_HASH =
  '$2b$10$9urc.hqF9cFZ7kWzq3qs/OPh829.h6xhD99P2PtscLcWcNTDG7qzu'

export const { auth, handlers, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const email = String(credentials?.email ?? '')
          .trim()
          .toLowerCase()
        const password = String(credentials?.password ?? '')
        if (!email || !password) return null

        const user = await db.user.findUnique({ where: { email } })
        const valid = await compare(password, user?.passwordHash ?? DUMMY_HASH)
        if (!user || !valid || !user.isActive) return null

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        }
      },
    }),
  ],
})
