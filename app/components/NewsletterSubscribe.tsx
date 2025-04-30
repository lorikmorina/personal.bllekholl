"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { ArrowRight, ShieldCheck, Scan } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Session } from '@supabase/supabase-js'

export default function CreateAccountCTA() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClientComponentClient()
  
  useEffect(() => {
    async function getSession() {
      const { data: { session } } = await supabase.auth.getSession()
      setSession(session)
      setLoading(false)
    }
    
    getSession()
  }, [supabase])

  if (loading) {
    return (
      <section className="bg-background py-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-gradient-to-br from-primary/10 to-secondary/10 rounded-3xl p-8 shadow-lg">
            <p className="text-center">Loading...</p>
          </div>
        </div>
      </section>
    )
  }
  
  return (
    <section className="bg-background py-20">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="bg-gradient-to-br from-primary/10 to-secondary/10 rounded-3xl p-8 shadow-lg"
        >
          <div className="flex justify-center mb-4">
            {session ? (
              <Scan className="h-12 w-12 text-primary" />
            ) : (
              <ShieldCheck className="h-12 w-12 text-primary" />
            )}
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-4 text-center">
            {session ? "Ready to Scan Your Website?" : "Start Securing Your Website"}
          </h2>
          <p className="text-muted-foreground mb-6 text-center">
            {session 
              ? "Use our dashboard to scan your website for security vulnerabilities and get actionable insights."
              : "Create a free account to scan your websites for vulnerabilities and improve your security posture."}
          </p>
          
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              {session ? (
                <Link href="/dashboard" className="w-full sm:w-auto">
                  <Button 
                    variant="default" 
                    size="lg"
                    className="w-full rounded-full"
                  >
                    Go to Dashboard
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              ) : (
                <Link href="/signup" className="w-full sm:w-auto">
                  <Button 
                    variant="default" 
                    size="lg"
                    className="w-full rounded-full"
                  >
                    Scan Your Website
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              )}
            </div>
            {!session && (
              <p className="text-sm text-center text-muted-foreground">
                Unlimited scans
              </p>
            )}
          </div>
        </motion.div>
      </div>
    </section>
  )
}

