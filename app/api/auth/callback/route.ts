import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  // We get the intended final path from the 'redirect' query param from SignupForm
  const finalRedirectPath = requestUrl.searchParams.get('redirect') || '/dashboard'

  // Always exchange the code for a session regardless of domain
  if (code) {
    const supabase = createRouteHandlerClient({ cookies })
    await supabase.auth.exchangeCodeForSession(code)
  }

  // Define production host and base URL explicitly
  const productionHost = 'securevibing.com'
  const productionBaseUrl = 'https://securevibing.com'
  const currentHost = request.headers.get('host') || ''

  // If we somehow landed on the callback via a non-production host,
  // force redirect to the production dashboard (clean URL).
  if (currentHost !== productionHost) {
    // This case should be less likely now but acts as a safeguard
    return NextResponse.redirect(`${productionBaseUrl}/dashboard`)
  }

  // If we are on the production host, redirect to the intended path,
  // ensuring we use the production base URL.
  return NextResponse.redirect(`${productionBaseUrl}${finalRedirectPath}`)
} 