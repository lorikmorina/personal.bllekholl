import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { token } = await request.json()
    
    if (!token) {
      return NextResponse.json({ success: false, error: 'Missing token' }, { status: 400 })
    }
    
    // Verify the token with Cloudflare
    const verificationResponse = await fetch(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          secret: process.env.CLOUDFLARE_TURNSTILE_SECRET_KEY,
          response: token,
        }),
      }
    )
    
    const verification = await verificationResponse.json()
    
    if (verification.success) {
      return NextResponse.json({ success: true })
    } else {
      console.error('Turnstile verification failed:', verification)
      return NextResponse.json({ 
        success: false, 
        error: 'Security verification failed' 
      }, { status: 400 })
    }
  } catch (error) {
    console.error('Error verifying Turnstile token:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 })
  }
} 