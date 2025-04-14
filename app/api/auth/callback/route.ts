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
  const productionHost = 'securevibing.netlify.app'
  const currentHost = request.headers.get('host') || ''
  
  // If we're not on the production host and either productionRedirect flag is set
  // or we're on any Netlify preview URL (which always contains --)
  if (currentHost !== productionHost && 
      (productionRedirect || currentHost.includes('--'))) {
    const productionUrl = process.env.NEXT_PUBLIC_SITE_URL || `https://${productionHost}`
    return NextResponse.redirect(`${productionUrl}${redirectTo}`)
  }

  // Normal redirect to dashboard or specified redirect path
  return NextResponse.redirect(new URL(redirectTo, request.url))
} 