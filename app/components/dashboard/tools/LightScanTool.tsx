"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"
import { Loader2, Shield, ShieldAlert, ShieldCheck, Globe, Zap, Lock } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { useDashboard } from "../DashboardProvider"
import { createClient } from "@/lib/supabase/client"
import PaywallModal from "../PaywallModal"

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
  const [userProfile, setUserProfile] = useState<any>(null)
  const [isPaywallOpen, setIsPaywallOpen] = useState(false)
  const [isLoadingProfile, setIsLoadingProfile] = useState(true)
  const [securityBlocked, setSecurityBlocked] = useState<boolean>(false)
  const { user } = useDashboard()
  const supabase = createClient()

  // Clean up URL by removing existing protocol, @ symbols, and whitespace
  const cleanUrl = (input: string): string => {
    let cleaned = input.trim();
    
    // Remove any leading @ symbol
    if (cleaned.startsWith('@')) {
      cleaned = cleaned.substring(1);
    }
    
    // Remove http:// or https:// since we're displaying https:// in the UI
    cleaned = cleaned.replace(/^https?:\/\//i, '');
    
    // Remove any remaining leading/trailing whitespace
    cleaned = cleaned.trim();
    
    return cleaned;
  };

  // Fetch user profile to check subscription status
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!user) return
      
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()
        
        if (error) throw error
        
        setUserProfile(data)
      } catch (error) {
        console.error('Error fetching user profile:', error)
      } finally {
        setIsLoadingProfile(false)
      }
    }
    
    fetchUserProfile()
  }, [user, supabase])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Check if user is on free plan
    if (userProfile?.subscription_plan === 'free') {
      setIsPaywallOpen(true)
      return
    }
    
    setIsScanning(true)
    setError(null)
    setResult(null)
    setSecurityBlocked(false)

    try {
      // Process URL to ensure it has https:// prefix
      let processedUrl = url
      if (!processedUrl.startsWith('http://') && !processedUrl.startsWith('https://')) {
        processedUrl = `https://${processedUrl}`
      }

      // Make a real API call to the scan endpoint
      const response = await fetch("/api/scan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url: processedUrl }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || "Failed to scan website")
      }

      const data = await response.json()
      
      // Check if the site blocked our scan
      if (data.error === "blocked_by_website") {
        setSecurityBlocked(true)
        setError(null)
        return
      }
      
      setResult(data)

      // Save scan result to database if user is authenticated
      if (user) {
        try {
          const { error: saveError } = await supabase
            .from('scan_reports')
            .insert({
              user_id: user.id,
              url: data.url,
              score: data.score,
              headers: data.headers,
              leaks: data.leaks,
              js_files_scanned: data.jsFilesScanned
            });
          
          if (saveError) {
            console.error('Error saving scan report:', saveError);
          }
        } catch (saveError) {
          console.error('Error saving scan report:', saveError);
          // We don't want to affect the user experience if saving fails
          // so we just log the error and don't show it to the user
        }
      }
    } catch (error: any) {
      setError(error.message || "Failed to scan website")
    } finally {
      setIsScanning(false)
    }
  }

  const toggleHeaderExpanded = (header: string) => {
    setExpandedHeaders(prev => 
      prev.includes(header) 
        ? prev.filter(h => h !== header) 
        : [...prev, header]
    )
  }

  const toggleLeakExpanded = (index: number) => {
    setExpandedLeaks(prev => 
      prev.includes(index) 
        ? prev.filter(i => i !== index) 
        : [...prev, index]
    )
  }

  const sortHeadersByImportance = (headers: string[]) => {
    return [...headers].sort((a, b) => {
      const importanceOrder = { high: 0, medium: 1, low: 2 }
      const aImportance = securityHeadersInfo[a]?.importance || 'medium'
      const bImportance = securityHeadersInfo[b]?.importance || 'medium'
      return importanceOrder[aImportance as keyof typeof importanceOrder] - 
             importanceOrder[bImportance as keyof typeof importanceOrder]
    })
  }

  const handleUpgrade = async (plan: string) => {
    // This would be replaced with your Paddle integration code
    console.log(`Upgrading to ${plan} plan`)
    
    // For demo purposes, let's update the user's plan in Supabase
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ subscription_plan: plan })
        .eq('id', user!.id)
      
      if (error) throw error
      
      // Update local state
      setUserProfile({
        ...userProfile,
        subscription_plan: plan
      })
      
      // Close the paywall
      setIsPaywallOpen(false)
    } catch (error) {
      console.error("Error updating subscription:", error)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Website Security Scan</CardTitle>
          <CardDescription>
            Quickly scan any website for security vulnerabilities, exposed API keys, and missing security headers.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
            <div className="flex flex-1 rounded-md overflow-hidden border border-input">
              <div className="flex items-center bg-muted px-3 text-muted-foreground font-medium border-r border-input">
                https://
              </div>
              <Input
                type="text"
                placeholder="example.com"
                value={url}
                onChange={(e) => setUrl(cleanUrl(e.target.value))}
                required
                className="flex-1 border-none rounded-none focus-visible:ring-0 focus-visible:ring-offset-0"
              />
            </div>
            <Button 
              type="submit" 
              disabled={isScanning || isLoadingProfile}
              className="sm:w-auto w-full"
            >
              {isScanning ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Scanning...
                </>
              ) : userProfile?.subscription_plan === 'free' ? (
                <>
                  <Lock className="mr-2 h-4 w-4" />
                  Scan Website
                </>
              ) : (
                <>
                  <Zap className="mr-2 h-4 w-4" />
                  Scan Website
                </>
              )}
            </Button>
          </form>
          
          {userProfile?.subscription_plan === 'free' && !isLoadingProfile && (
            <Alert className="mt-4 bg-primary/5 border-primary/20">
              <Shield className="h-4 w-4" />
              <AlertTitle>Free Plan Limitation</AlertTitle>
              <AlertDescription>
                Upgrade to a paid plan to access unlimited website scans and detailed security reports.
                <Button 
                  variant="link" 
                  className="p-0 h-auto font-semibold ml-1"
                  onClick={() => setIsPaywallOpen(true)}
                >
                  Upgrade now
                </Button>
              </AlertDescription>
            </Alert>
          )}
          
          {error && (
            <Alert variant="destructive" className="mt-4">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          {securityBlocked && (
            <Alert className="mt-4 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
              <ShieldCheck className="h-4 w-4 text-green-600 dark:text-green-400" />
              <AlertTitle className="text-green-800 dark:text-green-400">Advanced Security Detected</AlertTitle>
              <AlertDescription className="text-green-700 dark:text-green-300">
                This website implements robust security measures that prevent automated scanning. 
                While we can't provide a complete security report, the presence of these protective 
                measures is generally a positive security indicator.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Scan results */}
      {result && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Card>
            <CardContent className="p-0">
              <div className="flex flex-col md:flex-row items-center justify-between p-6 border-b border-border">
                <div className="flex items-center mb-4 md:mb-0">
                  <Globe className="h-5 w-5 mr-2 text-muted-foreground" />
                  <span className="font-medium">{result.url}</span>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-muted-foreground" />
                    <span>{result.jsFilesScanned} files scanned</span>
                  </div>
                  
                  <div className={`px-3 py-1 rounded-full flex items-center ${
                    result.score >= 70
                      ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300' // Good score
                      : result.score >= 40
                      ? 'bg-amber-100 dark:bg-amber-900/20 text-amber-800 dark:text-amber-300' // Moderate score
                      : 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-300'         // Poor score
                  }`}>
                    <span className="font-semibold">Score: {result.score}/100</span>
                  </div>
                </div>
              </div>
              
              <div className="grid md:grid-cols-2 gap-4 p-6 border-b border-border">
                <div>
                  <h4 className="text-lg font-semibold mb-3">
                    <ShieldCheck className="inline-block w-5 h-5 mr-2 text-green-500" />
                    Present Security Headers
                  </h4>
                  {result.headers.present.length > 0 ? (
                    <ul className="space-y-2">
                      {result.headers.present.map((header) => {
                        const headerInfo = securityHeadersInfo[header] || {
                          name: header,
                          importance: 'medium',
                          description: 'Security header'
                        };
                        
                        return (
                          <li key={header} className="border rounded-md p-2 bg-green-50 dark:bg-green-900/10 text-green-700 dark:text-green-300 flex items-center">
                            <span className="text-green-500 mr-2">✓</span>
                            <span className="capitalize font-medium">{headerInfo.name}</span>
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <p className="text-red-500">No security headers found!</p>
                  )}
                </div>
                
                <div>
                  <h4 className="text-lg font-semibold mb-3">
                    <ShieldAlert className="inline-block w-5 h-5 mr-2 text-red-500" />
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
      
      {/* Paywall Modal */}
      <PaywallModal
        isOpen={isPaywallOpen}
        onClose={() => setIsPaywallOpen(false)}
        onUpgrade={handleUpgrade}
      />
    </div>
  )
} 