"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"
import { Loader2 } from "lucide-react"
import { Separator } from "@/components/ui/separator"

const magicLinkFormSchema = z.object({
  email: z.string().email("Please enter a valid email")
})

export default function SignupForm() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  
  const form = useForm<z.infer<typeof magicLinkFormSchema>>({
    resolver: zodResolver(magicLinkFormSchema),
    defaultValues: {
      email: "",
    },
  })

  async function handleGoogleSignIn() {
    setIsSubmitting(true)
    setError(null)
    
    try {
      // In a real app, you would call an API endpoint to initialize Google OAuth
      // For demo purposes, we'll just simulate the API call
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      // Set a cookie to "authenticate" the user
      document.cookie = `auth-token=google-auth-token;path=/;max-age=86400`
      
      setSuccessMessage("Successfully signed in with Google!")
      setTimeout(() => {
        window.location.href = "/"
      }, 2000)
    } catch (err) {
      setError("Failed to sign in with Google. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  async function onSubmitMagicLink(values: z.infer<typeof magicLinkFormSchema>) {
    setIsSubmitting(true)
    setError(null)
    
    try {
      // In a real app, you would call an API endpoint to send a magic link
      // For demo purposes, we'll just simulate the API call
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      setSuccessMessage(`Magic link sent to ${values.email}! Check your inbox.`)
      form.reset()
    } catch (err) {
      setError("Failed to send magic link. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }
  
  return (
    <div className="max-w-md mx-auto p-6 bg-card rounded-lg shadow-lg border border-border">
      <h2 className="text-2xl font-bold mb-6">Create an Account</h2>
      <p className="text-muted-foreground mb-6">
        Sign up to get unlimited website security scans.
      </p>
      
      {successMessage ? (
        <Alert className="bg-green-50 text-green-800 border-green-200">
          <AlertTitle>Success!</AlertTitle>
          <AlertDescription>
            {successMessage}
          </AlertDescription>
        </Alert>
      ) : (
        <div className="space-y-6">
          <Button 
            type="button" 
            variant="outline" 
            className="w-full flex items-center justify-center gap-2 h-11"
            onClick={handleGoogleSignIn}
            disabled={isSubmitting}
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
          
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <Separator className="w-full" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
            </div>
          </div>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmitMagicLink)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="john.doe@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <Button 
                type="submit" 
                className="w-full" 
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending Magic Link...
                  </>
                ) : (
                  "Send Magic Link"
                )}
              </Button>
            </form>
          </Form>
          
          {error && (
            <Alert variant="destructive">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          <p className="text-center text-xs text-muted-foreground">
            By continuing, you agree to our{" "}
            <a href="#" className="underline underline-offset-4 hover:text-primary">Terms of Service</a>
            {" "}and{" "}
            <a href="#" className="underline underline-offset-4 hover:text-primary">Privacy Policy</a>.
          </p>
        </div>
      )}
    </div>
  )
} 