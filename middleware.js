import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function middleware(req) {
  const res = NextResponse.next()
  
  const token = req.cookies.get('sb-access-token')?.value || 
                req.cookies.get('sb-zynnnyxmwbgzbatphpjh-auth-token')?.value

  if (!token && req.nextUrl.pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  return res
}

export const config = {
  matcher: ['/dashboard/:path*']
}
```