"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { ArrowRight, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function CreateAccountCTA() {
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
            <ShieldCheck className="h-12 w-12 text-primary" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-4 text-center">Start Securing Your Website</h2>
          <p className="text-muted-foreground mb-6 text-center">
            Create a free account to scan your websites for vulnerabilities and improve your security posture.
          </p>
          
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/signup" className="w-full sm:w-auto">
                <Button 
                  variant="default" 
                  size="lg"
                  className="w-full rounded-full"
                >
                  Create Free Account
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
            <p className="text-sm text-center text-muted-foreground">
              No credit card required. Upgrade anytime.
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

