"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"
import { Loader2, Shield, ShieldAlert, ShieldCheck, User } from "lucide-react"
import { useRouter } from "next/navigation"

type ScanResult = {
  url: string
  headers: {
    present: string[]
    missing: string[]
  }
  leaks: Array<{
    type: string
    preview: string
    details: string
  }>
  jsFilesScanned: number
  score: number
}

// Security headers information (copy from WearYourStory component)
const securityHeadersInfo: Record<string, { name: string; importance: string; description: string }> = {
  'strict-transport-security': {
    name: 'Strict Transport Security (HSTS)',
    importance: 'high',
    description: 'Forces browsers to use HTTPS for future visits'
  },
  'content-security-policy': {
    name: 'Content Security Policy (CSP)',
    importance: 'high',
    description: 'Prevents XSS attacks by specifying which resources can be loaded'
  },
  // Add other headers from WearYourStory component
};

// Helper function to sort headers (copy from WearYourStory component)
const sortHeadersByImportance = (headers: string[]) => {
  return [...headers].sort((a, b) => {
    const importanceA = securityHeadersInfo[a]?.importance || 'medium';
    const importanceB = securityHeadersInfo[b]?.importance || 'medium';
    
    const importanceValues = { high: 0, medium: 1, low: 2 };
    return importanceValues[importanceA as keyof typeof importanceValues] - 
           importanceValues[importanceB as keyof typeof importanceValues];
  });
};

export default function Hero() {
  const [url, setUrl] = useState("")
  const [isScanning, setIsScanning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<ScanResult | null>(null)
  const [expandedHeaders, setExpandedHeaders] = useState<string[]>([])
  const [expandedLeaks, setExpandedLeaks] = useState<number[]>([])
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsScanning(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch("/api/scan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        
        // Check for no scans remaining error
        if (errorData.error === "no_scans_remaining") {
          // Use the redirect URL if provided, otherwise default to /pricing
          if (errorData.redirectTo) {
            router.push(errorData.redirectTo)
          } else {
            router.push("/signup")
          }
          return
        }
        
        throw new Error(errorData.message || "Failed to scan website")
      }

      const data = await response.json()
      setResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unknown error occurred")
    } finally {
      setIsScanning(false)
    }
  }

  // Toggle expanded state for header descriptions
  const toggleHeaderExpanded = (header: string) => {
    if (expandedHeaders.includes(header)) {
      setExpandedHeaders(expandedHeaders.filter(h => h !== header))
    } else {
      setExpandedHeaders([...expandedHeaders, header])
    }
  }

  // Toggle expanded state for leak details
  const toggleLeakExpanded = (index: number) => {
    if (expandedLeaks.includes(index)) {
      setExpandedLeaks(expandedLeaks.filter(i => i !== index))
    } else {
      setExpandedLeaks([...expandedLeaks, index])
    }
  }

  // Score color based on value
  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-500"
    if (score >= 60) return "text-yellow-500"
    return "text-red-500"
  }

  return (
    <div className="relative isolate overflow-hidden bg-background">
      <div className="mx-auto max-w-7xl px-6 py-20 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-10 items-start">
          {/* Left Column - Hero Text */}
          <motion.div
            className="flex flex-col text-center sm:text-left"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <motion.h1
              className="text-4xl font-bold tracking-tight text-foreground sm:text-6xl mx-auto sm:mx-0"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              <span className="text-gradient">Pass the Security Vibe Check</span>
            </motion.h1>
            <motion.p
              className="mt-6 text-base sm:text-lg leading-7 sm:leading-8 text-muted-foreground mx-auto sm:mx-0"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              Scan your website for security issues to see if your website passes the security vibe check. Find leaked API keys, 
              missing security headers, and other common vulnerabilities.
            </motion.p>
            
            {/* Scan Input Form */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="mt-8 w-full"
            >
              <form 
                onSubmit={handleSubmit}
                className="flex flex-col sm:flex-row gap-4 mx-auto sm:mx-0"
              >
                <Input
                  type="url"
                  placeholder="https://example.com"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  required
                  className="flex-grow"
                />
                <Button 
                  type="submit" 
                  disabled={isScanning || !url}
                  className="w-full sm:w-auto"
                >
                  {isScanning ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Scanning...
                    </>
                  ) : (
                    <>
                      <Shield className="mr-2 h-4 w-4" />
                      Scan Website
                    </>
                  )}
                </Button>
              </form>
              
              {error && (
                <Alert variant="destructive" className="mt-6">
                  <ShieldAlert className="h-4 w-4" />
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
            </motion.div>
            
           
          </motion.div>
          
          {/* Right Column - Scanner UI and Results */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.6 }}
          >
            {!result ? (
              <div className="w-full max-w-lg mx-auto">
                <img 
                  src="/design/hero-secureviber.png"
                  alt="SecureViber Scanner"
                  className="w-full h-auto rounded-2xl shadow-lg"
                />
              </div>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="bg-card rounded-xl shadow-lg overflow-hidden border border-border"
              >
                <div className="p-6 flex items-center justify-between border-b border-border">
                  <div>
                    <h3 className="text-2xl font-bold">Security Report</h3>
                    <p className="text-muted-foreground">URL: {result.url}</p>
                  </div>
                  <div className="text-right">
                    <div className={`text-3xl font-bold ${getScoreColor(result.score)}`}>
                      {result.score}/100
                    </div>
                    <p className="text-sm text-muted-foreground">Security Score</p>
                  </div>
                </div>

                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-lg font-semibold mb-3 flex items-center">
                      <ShieldCheck className="mr-2 h-5 w-5 text-green-500" />
                      Present Security Headers
                    </h4>
                    {result.headers.present.length > 0 ? (
                      <ul className="space-y-2">
                        {result.headers.present.map((header) => {
                          const headerInfo = securityHeadersInfo[header] || {
                            name: header.replace(/-/g, ' '),
                            importance: 'medium',
                            description: 'Security header'
                          };
                          
                          return (
                            <li key={header} className="flex items-start">
                              <span className="text-green-500 mr-2">✓</span>
                              <span className="capitalize font-medium">{headerInfo.name}</span>
                            </li>
                          );
                        })}
                      </ul>
                    ) : (
                      <p className="text-yellow-500">No security headers found!</p>
                    )}
                  </div>
                  
                  <div>
                    <h4 className="text-lg font-semibold mb-3 flex items-center">
                      <ShieldAlert className="mr-2 h-5 w-5 text-red-500" />
                      Missing Security Headers
                    </h4>
                    {result.headers.missing.length > 0 ? (
                      <ul className="space-y-2">
                        {sortHeadersByImportance(result.headers.missing).map((header) => {
                          const headerInfo = securityHeadersInfo[header] || {
                            name: header.replace(/-/g, ' '),
                            importance: 'medium',
                            description: 'Security header'
                          };
                          const isExpanded = expandedHeaders.includes(header);
                          
                          return (
                            <li key={header} className="border rounded-md overflow-hidden">
                              <button
                                onClick={() => toggleHeaderExpanded(header)}
                                className="w-full text-left p-2 flex items-center justify-between hover:bg-secondary/10"
                              >
                                <div className="flex items-start">
                                  <span className="text-red-500 mr-2">✗</span>
                                  <span className="capitalize font-medium">{headerInfo.name}</span>
                                </div>
                                <span>{isExpanded ? '▼' : '▶'}</span>
                              </button>
                              
                              {isExpanded && (
                                <div className="p-2 bg-secondary/5 border-t">
                                  <p className="text-sm text-muted-foreground">{headerInfo.description}</p>
                                </div>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    ) : (
                      <p className="text-green-500">All important security headers are present!</p>
                    )}
                  </div>
                </div>

                <div className="p-6 border-t border-border">
                  <h4 className="text-lg font-semibold mb-3">
                    🔍 Potential Security Issues
                  </h4>
                  {result.leaks.length > 0 ? (
                    <ul className="space-y-3">
                      {result.leaks.map((leak, index) => {
                        const isExpanded = expandedLeaks.includes(index);
                        return (
                          <li key={index} className="border rounded-md overflow-hidden">
                            <button
                              onClick={() => toggleLeakExpanded(index)}
                              className="w-full text-left p-3 flex items-center justify-between hover:bg-secondary/10"
                            >
                              <div className="flex items-start">
                                <span className="text-yellow-500 mr-2">⚠️</span>
                                <span>Potential {leak.type} found: {leak.preview}</span>
                              </div>
                              <span>{isExpanded ? '▼' : '▶'}</span>
                            </button>
                            
                            {isExpanded && (
                              <div className="p-3 bg-secondary/5 border-t">
                                <div className="font-mono text-sm overflow-x-auto p-2 bg-black/5 rounded">
                                  <code>{leak.details}</code>
                                </div>
                                <p className="text-sm mt-2 text-muted-foreground">
                                  <span className="font-semibold">Security Risk:</span> Exposing {leak.type.toLowerCase()} in your code could allow attackers to access your services, make API calls on your behalf, or access sensitive data.
                                </p>
                              </div>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <p className="text-green-500">No obvious security leaks detected!</p>
                  )}
                  <p className="text-sm text-muted-foreground mt-4">
                    Scanned {result.jsFilesScanned} JavaScript files for potential API keys and sensitive information.
                  </p>
                </div>
              </motion.div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  )
}

