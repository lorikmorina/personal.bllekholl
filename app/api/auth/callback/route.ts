import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const productionRedirect = requestUrl.searchParams.get('production_redirect') === 'true'
  const redirectTo = requestUrl.searchParams.get('redirect') || '/dashboard'

  if (code) {
    const supabase = createRouteHandlerClient({ cookies })
    await supabase.auth.exchangeCodeForSession(code)
  }
  
  // Check if we're on a preview URL and need to redirect to production
  if (productionRedirect && request.headers.get('host')?.includes('--securevibing.netlify.app')) {
    const productionUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://securevibing.netlify.app'
    return NextResponse.redirect(`${productionUrl}${redirectTo}`)
  }

  // Normal redirect to dashboard or specified redirect path
  return NextResponse.redirect(new URL(redirectTo, request.url))
} 