"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"
import { Loader2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import TurnstileWidget from "@/app/components/TurnstileWidget"

export default function SignupForm() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null)
  const supabase = createClient()
  
  async function handleGoogleSignIn() {
    setIsSubmitting(true)
    setError(null)
    
    try {
      // Validate Turnstile token first
      if (!turnstileToken) {
        throw new Error("Please complete the security check")
      }
      
      // Verify the turnstile token server-side
      const verifyResponse = await fetch('/api/verify-turnstile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token: turnstileToken }),
        credentials: 'same-origin'
      })
      
      const verification = await verifyResponse.json()
      
      if (!verification.success) {
        throw new Error("Security verification failed. Please try again.")
      }
      
      // Proceed with Google sign-in
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/api/auth/callback?redirect=/dashboard`
        }
      })
      
      if (error) throw error
      
      // Success case handled by redirect, no message needed
    } catch (err) {
      console.error("Sign in error:", err)
      setError(err instanceof Error ? err.message : "Failed to sign in. Please try again.")
      setIsSubmitting(false)
    }
  }
  
  // Handle successful Turnstile verification
  const handleTurnstileSuccess = (token: string) => {
    setTurnstileToken(token)
    setError(null) // Clear any previous errors
  }
  
  return (
    <div className="max-w-md mx-auto p-6 bg-card rounded-lg shadow-lg border border-border">
      <h2 className="text-2xl font-bold mb-6">Log In or Create an Account</h2>
      <p className="text-muted-foreground mb-6">
        Sign up to get unlimited website security scans.
      </p>
      
      <div className="space-y-6">
        {/* Turnstile Widget */}
        <div className="w-full flex justify-center mb-4">
          <TurnstileWidget
            siteKey={process.env.NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY || ''}
            onSuccess={handleTurnstileSuccess}
          />
        </div>
        
        <Button 
          type="button" 
          variant="outline" 
          className="w-full flex items-center justify-center gap-2 h-11"
          onClick={handleGoogleSignIn}
          disabled={isSubmitting || !turnstileToken}
        >
          {isSubmitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <svg viewBox="0 0 24 24" width="16" height="16" xmlns="http://www.w3.org/2000/svg">
              <g transform="matrix(1, 0, 0, 1, 27.009001, -39.238998)">
                <path fill="#4285F4" d="M -3.264 51.509 C -3.264 50.719 -3.334 49.969 -3.454 49.239 L -14.754 49.239 L -14.754 53.749 L -8.284 53.749 C -8.574 55.229 -9.424 56.479 -10.684 57.329 L -10.684 60.329 L -6.824 60.329 C -4.564 58.239 -3.264 55.159 -3.264 51.509 Z"/>
                <path fill="#34A853" d="M -14.754 63.239 C -11.514 63.239 -8.804 62.159 -6.824 60.329 L -10.684 57.329 C -11.764 58.049 -13.134 58.489 -14.754 58.489 C -17.884 58.489 -20.534 56.379 -21.484 53.529 L -25.464 53.529 L -25.464 56.619 C -23.494 60.539 -19.444 63.239 -14.754 63.239 Z"/>
                <path fill="#FBBC05" d="M -21.484 53.529 C -21.734 52.809 -21.864 52.039 -21.864 51.239 C -21.864 50.439 -21.724 49.669 -21.484 48.949 L -21.484 45.859 L -25.464 45.859 C -26.284 47.479 -26.754 49.299 -26.754 51.239 C -26.754 53.179 -26.284 54.999 -25.464 56.619 L -21.484 53.529 Z"/>
                <path fill="#EA4335" d="M -14.754 43.989 C -12.984 43.989 -11.404 44.599 -10.154 45.789 L -6.734 42.369 C -8.804 40.429 -11.514 39.239 -14.754 39.239 C -19.444 39.239 -23.494 41.939 -25.464 45.859 L -21.484 48.949 C -20.534 46.099 -17.884 43.989 -14.754 43.989 Z"/>
              </g>
            </svg>
          )}
          <span>Continue with Google</span>
        </Button>
        
        {error && (
          <Alert variant="destructive">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        <p className="text-center text-xs text-muted-foreground">
          By continuing, you agree to our{" "}
          <a href="terms" className="underline underline-offset-4 hover:text-primary">Terms of Service</a>
          {" "}and{" "}
          <a href="privacy" className="underline underline-offset-4 hover:text-primary">Privacy Policy</a>.
        </p>
      </div>
    </div>
  )
} 