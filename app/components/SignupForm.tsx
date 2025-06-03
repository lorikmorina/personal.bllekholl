"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"
import { Loader2, Mail, Lock, Eye, EyeOff } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import TurnstileWidget from "@/app/components/TurnstileWidget"
import { Separator } from "@/components/ui/separator"

type AuthMode = 'login' | 'signup' | 'confirmation_sent' | 'email_not_confirmed'

export default function SignupForm() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null)
  const [authMode, setAuthMode] = useState<AuthMode>('login')
  const [needsSignup, setNeedsSignup] = useState(false)
  const supabase = createClient()
  
  async function handleEmailAuth() {
    setIsSubmitting(true)
    setError(null)
    setSuccess(null)
    
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

      // Basic validation
      if (!email || !password) {
        throw new Error("Please enter both email and password")
      }

      if (password.length < 6) {
        throw new Error("Password must be at least 6 characters")
      }

      // If we're in signup mode and passwords don't match
      if (needsSignup && password !== confirmPassword) {
        throw new Error("Passwords do not match")
      }

      if (needsSignup) {
        // Sign up new user
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/api/auth/callback?redirect=/dashboard`
          }
        })
        
        if (error) {
          // If user already exists but email not confirmed
          if (error.message.includes('already registered')) {
            setAuthMode('email_not_confirmed')
            setSuccess("This email is already registered but not confirmed. Please check your email for the confirmation link, or try logging in.")
            return
          }
          throw error
        }
        
        if (data.user && !data.session) {
          // Email confirmation required
          setAuthMode('confirmation_sent')
          setSuccess(`Confirmation email sent to ${email}. Please check your email and click the confirmation link to complete your registration.`)
        } else if (data.session) {
          // Auto-logged in (email confirmation disabled)
          window.location.href = '/dashboard'
        }
      } else {
        // Attempt to sign in
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password
        })
        
        if (error) {
          // If invalid credentials, user might not exist - switch to signup mode
          if (error.message.includes('Invalid login credentials') || error.message.includes('Invalid email or password')) {
            setNeedsSignup(true)
            setError("No account found with this email. Please create a new account below.")
            return
          }
          
          // If email not confirmed
          if (error.message.includes('Email not confirmed')) {
            setAuthMode('email_not_confirmed')
            setError("Your email address is not confirmed. Please check your email for a confirmation link.")
            return
          }
          
          throw error
        }
        
        if (data.session) {
          // Successful login
          window.location.href = '/dashboard'
        }
      }
      
    } catch (err) {
      console.error("Auth error:", err)
      setError(err instanceof Error ? err.message : "Authentication failed. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  async function resendConfirmation() {
    if (!email) {
      setError("Please enter your email address")
      return
    }
    
    try {
      setIsSubmitting(true)
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
        options: {
          emailRedirectTo: `${window.location.origin}/api/auth/callback?redirect=/dashboard`
        }
      })
      
      if (error) throw error
      
      setSuccess("Confirmation email resent. Please check your email.")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to resend confirmation email")
    } finally {
      setIsSubmitting(false)
    }
  }
  
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

  // Reset form when switching between login/signup
  const resetForm = () => {
    setEmail("")
    setPassword("")
    setConfirmPassword("")
    setError(null)
    setSuccess(null)
    setNeedsSignup(false)
    setAuthMode('login')
  }

  if (authMode === 'confirmation_sent') {
    return (
      <div className="max-w-md mx-auto p-6 bg-card rounded-lg shadow-lg border border-border">
        <div className="text-center">
          <Mail className="h-16 w-16 mx-auto text-primary mb-4" />
          <h2 className="text-2xl font-bold mb-4">Check your email</h2>
          <p className="text-muted-foreground mb-6">
            We've sent you a confirmation link at <strong>{email}</strong>
          </p>
          {success && (
            <Alert className="mb-4">
              <AlertTitle>Success</AlertTitle>
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}
          <div className="space-y-4">
            <Button 
              variant="outline" 
              onClick={resendConfirmation}
              disabled={isSubmitting}
              className="w-full"
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Resend confirmation email
            </Button>
            <Button variant="ghost" onClick={resetForm} className="w-full">
              Back to login
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (authMode === 'email_not_confirmed') {
    return (
      <div className="max-w-md mx-auto p-6 bg-card rounded-lg shadow-lg border border-border">
        <div className="text-center">
          <Mail className="h-16 w-16 mx-auto text-yellow-500 mb-4" />
          <h2 className="text-2xl font-bold mb-4">Email not confirmed</h2>
          <p className="text-muted-foreground mb-6">
            Your account exists but your email address <strong>{email}</strong> has not been confirmed yet.
          </p>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertTitle>Notice</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {success && (
            <Alert className="mb-4">
              <AlertTitle>Success</AlertTitle>
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}
          <div className="space-y-4">
            <Button 
              onClick={resendConfirmation}
              disabled={isSubmitting}
              className="w-full"
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Resend confirmation email
            </Button>
            <Button variant="ghost" onClick={resetForm} className="w-full">
              Back to login
            </Button>
          </div>
        </div>
      </div>
    )
  }
  
  return (
    <div className="max-w-md mx-auto p-6 bg-card rounded-lg shadow-lg border border-border">
      <h2 className="text-2xl font-bold mb-2">
        {needsSignup ? 'Create Account' : 'Log In'}
      </h2>
      <p className="text-muted-foreground mb-6">
        {needsSignup 
          ? 'Sign up to get unlimited website security scans.' 
          : 'Welcome back! Please sign in to your account.'
        }
      </p>
      
      <div className="space-y-6">
        {/* Turnstile Widget */}
        <div className="w-full flex justify-center mb-4">
          <TurnstileWidget
            siteKey={process.env.NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY || ''}
            onSuccess={handleTurnstileSuccess}
          />
        </div>

        {/* Email/Password Form */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10"
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10 pr-10"
                disabled={isSubmitting}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {needsSignup && (
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirm your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="pl-10 pr-10"
                  disabled={isSubmitting}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          )}

          <Button 
            onClick={handleEmailAuth}
            disabled={isSubmitting || !turnstileToken}
            className="w-full"
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : null}
            {needsSignup ? 'Create Account' : 'Log In'}
          </Button>

          {needsSignup && (
            <Button 
              variant="ghost" 
              onClick={() => setNeedsSignup(false)}
              className="w-full"
            >
              Already have an account? Log in
            </Button>
          )}
        </div>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <Separator className="w-full" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
          </div>
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

        {success && (
          <Alert>
            <AlertTitle>Success</AlertTitle>
            <AlertDescription>{success}</AlertDescription>
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