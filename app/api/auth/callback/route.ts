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
  const productionHost = 'securevibing.com'
  const currentHost = request.headers.get('host') || ''
  
  // Always redirect to production domain if we're on any kind of preview URL
  if (currentHost !== productionHost) {
    const productionUrl = process.env.NEXT_PUBLIC_SITE_URL || `https://${productionHost}`
    
    // Add a state parameter to prevent circular redirects
    const redirectPath = redirectTo || '/dashboard'
    const finalUrl = `${productionUrl}${redirectPath}`
    
    // Redirect directly without preserving query params that might cause loops
    return NextResponse.redirect(finalUrl)
  }

  // Normal redirect to dashboard or specified redirect path
  return NextResponse.redirect(new URL(redirectTo, request.url))
} 