import NextAuth from 'next-auth'
import { NextResponse } from 'next/server'
import { authConfig } from '@/lib/auth.config'

const { auth } = NextAuth(authConfig)

export default auth((req) => {
  const { pathname, search } = req.nextUrl

  if (pathname === '/admin/login') return

  if (!req.auth) {
    const url = new URL('/admin/login', req.nextUrl.origin)
    url.searchParams.set('callbackUrl', `${pathname}${search}`)
    return NextResponse.redirect(url)
  }
})

export const config = {
  matcher: ['/admin/:path*'],
}
