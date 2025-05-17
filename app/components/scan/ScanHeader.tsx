"use client"

import { motion } from "framer-motion"
import { Shield, Lock, Database } from "lucide-react"

export default function ScanHeader() {
  return (
    <div className="container mx-auto px-4 mb-16">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center"
      >
        <h1 className="text-4xl md:text-5xl font-bold mb-6">
          Free Security Scanner
        </h1>
        <p className="text-muted-foreground max-w-3xl mx-auto mb-10 text-lg">
          Check your website for security vulnerabilities before hackers do. Our free scanner helps you identify issues that could compromise your site.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          <div className="flex flex-col items-center p-4 rounded-xl border border-border bg-card hover:shadow-md transition-shadow">
            <div className="bg-primary/10 p-3 rounded-full mb-4">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-semibold mb-2">Identify Vulnerabilities</h3>
            <p className="text-muted-foreground text-sm text-center">
              Quickly detect common security issues and misconfigurations in your website.
            </p>
          </div>
          
          <div className="flex flex-col items-center p-4 rounded-xl border border-border bg-card hover:shadow-md transition-shadow">
            <div className="bg-primary/10 p-3 rounded-full mb-4">
              <Lock className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-semibold mb-2">Protect Your Users</h3>
            <p className="text-muted-foreground text-sm text-center">
              Ensure your users' data remains secure by addressing potential security gaps.
            </p>
          </div>
          
          <div className="flex flex-col items-center p-4 rounded-xl border border-border bg-card hover:shadow-md transition-shadow">
            <div className="bg-primary/10 p-3 rounded-full mb-4">
              <Database className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-semibold mb-2">Safeguard Your Data</h3>
            <p className="text-muted-foreground text-sm text-center">
              Prevent leaks of sensitive information and credentials with proactive scanning.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  )
} 