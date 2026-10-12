import type { NextAuthConfig } from 'next-auth'

export const authConfig = {
  session: { strategy: 'jwt' },
  pages: { signIn: '/admin/login' },
  providers: [],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id ?? token.sub ?? ''
        token.name = user.name ?? token.name
        token.role = user.role
      }
      return token
    },
    session({ session, token }) {
      session.user.id = token.id
      session.user.name = typeof token.name === 'string' ? token.name : ''
      session.user.role = token.role
      return session
    },
  },
} satisfies NextAuthConfig
