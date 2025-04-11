"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"
import { Loader2, Shield, ShieldAlert, ShieldCheck, Globe, Zap } from "lucide-react"
import { Badge } from "@/components/ui/badge"

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

// This matches the header info structure from the Hero component
const securityHeadersInfo: {[key: string]: {name: string, importance: string, description: string}} = {
  "strict-transport-security": {
    name: "Strict-Transport-Security",
    importance: "high",
    description: "Ensures the browser only connects via HTTPS, protecting against downgrade attacks."
  },
  "content-security-policy": {
    name: "Content-Security-Policy",
    importance: "high",
    description: "Prevents XSS attacks by specifying which domains can load content."
  },
  "x-content-type-options": {
    name: "X-Content-Type-Options",
    importance: "medium",
    description: "Prevents MIME-sniffing attacks by telling browsers to respect the declared content type."
  },
  "x-frame-options": {
    name: "X-Frame-Options",
    importance: "medium",
    description: "Prevents clickjacking attacks by controlling whether the page can be embedded in an iframe."
  },
  "referrer-policy": {
    name: "Referrer-Policy",
    importance: "medium",
    description: "Controls how much referrer information is included with requests."
  },
  "permissions-policy": {
    name: "Permissions-Policy",
    importance: "low",
    description: "Controls which browser features can be used by the page."
  }
}

export default function LightScanTool() {
  const [url, setUrl] = useState("")
  const [isScanning, setIsScanning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<ScanResult | null>(null)
  const [expandedHeaders, setExpandedHeaders] = useState<string[]>([])
  const [expandedLeaks, setExpandedLeaks] = useState<number[]>([])

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

  // Sort headers by importance
  const sortHeadersByImportance = (headers: string[]) => {
    return [...headers].sort((a, b) => {
      const importanceOrder = { high: 0, medium: 1, low: 2 };
      const aImportance = securityHeadersInfo[a]?.importance || "low";
      const bImportance = securityHeadersInfo[b]?.importance || "low";
      return importanceOrder[aImportance as keyof typeof importanceOrder] - 
             importanceOrder[bImportance as keyof typeof importanceOrder];
    });
  };

  return (
    <div className="space-y-8">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <h1 className="text-3xl font-bold mb-2">Light Website Security Scan</h1>
        <p className="text-muted-foreground mb-6">
          Quickly scan any website for security vulnerabilities, exposed API keys, and missing security headers.
        </p>
      </motion.div>

      <Card>
        <CardHeader>
          <CardTitle>Start New Scan</CardTitle>
          <CardDescription>
            Enter a website URL to begin scanning for security issues
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-4">
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
              className="sm:w-auto"
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
        </CardContent>
      </Card>

      {result && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Card className="overflow-hidden">
            <CardHeader className="bg-secondary/20">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Scan Results</CardTitle>
                  <CardDescription>
                    <span className="flex items-center mt-1">
                      <Globe className="h-4 w-4 mr-1" />
                      {result.url}
                    </span>
                  </CardDescription>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-yellow-500" />
                    <span className="text-sm text-muted-foreground">
                      {result.jsFilesScanned} files scanned
                    </span>
                  </div>
                  <div className="mt-1">
                    <Badge 
                      className={
                        result.score >= 80 
                          ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" 
                          : result.score >= 50 
                          ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                          : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                      }
                    >
                      Score: {result.score}/100
                    </Badge>
                  </div>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="p-0">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6">
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
                  <p className="text-green-500">No API keys or secrets found exposed in the scanned website! 🎉</p>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  )
} 