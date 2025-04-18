"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"
import { Loader2, Shield, ShieldAlert, ShieldCheck } from "lucide-react"

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

type SecurityHeader = {
  name: string;
  importance: 'critical' | 'high' | 'medium' | 'low';
  description: string;
}

const securityHeadersInfo: Record<string, SecurityHeader> = {
  'content-security-policy': {
    name: 'Content Security Policy',
    importance: 'critical',
    description: 'Prevents XSS attacks by controlling resource loading'
  },
  'strict-transport-security': {
    name: 'Strict Transport Security',
    importance: 'critical',
    description: 'Forces HTTPS connections and prevents downgrade attacks'
  },
  'x-frame-options': {
    name: 'X-Frame-Options',
    importance: 'high',
    description: 'Prevents clickjacking attacks by controlling iframe embedding'
  },
  'referrer-policy': {
    name: 'Referrer Policy',
    importance: 'high',
    description: 'Controls information shared when following links'
  },
  'permissions-policy': {
    name: 'Permissions Policy',
    importance: 'medium',
    description: 'Controls which browser features can be used'
  },
  'x-content-type-options': {
    name: 'X-Content-Type-Options',
    importance: 'medium',
    description: 'Prevents MIME type sniffing attacks'
  },
  'x-xss-protection': {
    name: 'X-XSS-Protection',
    importance: 'low',
    description: 'Enables browser\'s built-in XSS filters'
  }
};

const getImportanceColor = (importance: string): string => {
  switch (importance) {
    case 'critical': return 'text-red-600 bg-red-50 border-red-200';
    case 'high': return 'text-orange-600 bg-orange-50 border-orange-200';
    case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    case 'low': return 'text-blue-600 bg-blue-50 border-blue-200';
    default: return 'text-gray-600 bg-gray-50 border-gray-200';
  }
};

const getImportanceEmoji = (importance: string): string => {
  switch (importance) {
    case 'critical': return '🔴';
    case 'high': return '🟠';
    case 'medium': return '🟡';
    case 'low': return '🔵';
    default: return '⚪';
  }
};

export default function WearYourStory() {
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
        throw new Error(errorData.error || "Failed to scan website")
      }

      const data = await response.json()
      setResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unknown error occurred")
    } finally {
      setIsScanning(false)
    }
  }

  // Score color based on value
  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-500"
    if (score >= 60) return "text-yellow-500"
    return "text-red-500"
  }

  // Toggle expanded state for header descriptions
  const toggleHeaderExpanded = (header: string) => {
    if (expandedHeaders.includes(header)) {
      setExpandedHeaders(expandedHeaders.filter(h => h !== header))
    } else {
      setExpandedHeaders([...expandedHeaders, header])
    }
  }

  // Sort headers by importance (critical first, then high, medium, low)
  const sortHeadersByImportance = (headers: string[]): string[] => {
    const importancePriority = {
      'critical': 0,
      'high': 1,
      'medium': 2,
      'low': 3
    };
    
    return [...headers].sort((a, b) => {
      const headerA = securityHeadersInfo[a] || { importance: 'medium' };
      const headerB = securityHeadersInfo[b] || { importance: 'medium' };
      
      return importancePriority[headerA.importance] - importancePriority[headerB.importance];
    });
  };

  const toggleLeakExpanded = (index: number) => {
    if (expandedLeaks.includes(index)) {
      setExpandedLeaks(expandedLeaks.filter(i => i !== index));
    } else {
      setExpandedLeaks([...expandedLeaks, index]);
    }
  };

  return (
    <section className="bg-background py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center"
        >
          <h2 className="text-4xl sm:text-5xl md:text-6xl font-bold text-foreground mb-6">
            Vibe Check Your Website
          </h2>
          <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto mb-10">
            Scan your website for security issues and common vulnerabilities that could compromise your visitors' data.
          </p>
          
          <form 
            onSubmit={handleSubmit}
            className="max-w-2xl mx-auto mb-8"
          >
            <div className="flex flex-col sm:flex-row gap-4">
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
            </div>
          </form>

          {error && (
            <Alert variant="destructive" className="mt-6 max-w-2xl mx-auto">
              <ShieldAlert className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {result && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="mt-10 max-w-4xl mx-auto text-left bg-card rounded-xl shadow-lg overflow-hidden border border-border"
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
                                <span className="text-red-500 mr-2">✕</span>
                                <span className="capitalize font-medium">{headerInfo.name}</span>
                                <span className={`ml-2 text-xs px-2 py-1 rounded-full ${getImportanceColor(headerInfo.importance)}`}>
                                  {headerInfo.importance}
                                </span>
                              </div>
                              <span>{isExpanded ? '▼' : '▶'}</span>
                            </button>
                            
                            {isExpanded && (
                              <div className="p-3 bg-secondary/5 border-t">
                                <p className="text-sm">{headerInfo.description}</p>
                              </div>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <p className="text-green-500">All recommended headers are present!</p>
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
          
          <motion.div
            className="mt-10"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <a
              href="#"
              className="apple-button inline-flex items-center"
            >
              Learn More About Website Security
              <svg
                className="w-5 h-5 ml-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </a>
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}

