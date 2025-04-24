"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"
import { Loader2, Shield, ShieldAlert, ShieldCheck, Globe, Zap, Lock, Info, Lightbulb, AlertTriangle } from "lucide-react"
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
    severity?: 'critical' | 'warning' | 'info' | 'secure'
  }>
  jsFilesScanned: number
  score: number
  is_blocked?: boolean
  status?: number
  scan_message?: string
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
  const [isPresentHeadersExpanded, setIsPresentHeadersExpanded] = useState(false)
  const [isRecommendedHeadersExpanded, setIsRecommendedHeadersExpanded] = useState(false)
  const [isLeaksExpanded, setIsLeaksExpanded] = useState(false)
  const [userProfile, setUserProfile] = useState<any>(null)
  const [isPaywallOpen, setIsPaywallOpen] = useState(false)
  const [isLoadingProfile, setIsLoadingProfile] = useState(true)
  const [securityBlocked, setSecurityBlocked] = useState<boolean>(false)
  const [urlValidation, setUrlValidation] = useState<{valid: boolean; message?: string} | null>(null)
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
    
    // If the user pasted a URL with a path, extract just the domain
    // e.g., "example.com/path/to/resource" -> "example.com"
    if (cleaned.includes('/')) {
      cleaned = cleaned.split('/')[0];
    }
    
    // Remove any remaining leading/trailing whitespace
    cleaned = cleaned.trim();
    
    return cleaned;
  };

  // Validate and format URL to ensure it's properly formatted for scanning
  const validateAndFormatUrl = (input: string): { valid: boolean; formattedUrl: string; errorMessage?: string } => {
    // If empty, return invalid state
    if (!input || input.trim() === '') {
      return { valid: false, formattedUrl: '', errorMessage: 'Please enter a website URL' };
    }

    let url = input.trim();
    
    // Remove any trailing slashes or paths for validation
    const urlForValidation = url.split('/')[0];
    
    // Check if URL has a valid domain format (at least something.something)
    const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?)+$/;
    
    // If it doesn't match the domain format, it might be incomplete
    if (!domainRegex.test(urlForValidation)) {
      // Case 1: Single word without TLD - likely needs .com or similar
      if (/^[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]$/.test(urlForValidation)) {
        // Append .com as it's likely they intended a .com domain
        const suggestedUrl = `${url}.com`;
        return { 
          valid: true, 
          formattedUrl: suggestedUrl,
          errorMessage: `Did you mean ${suggestedUrl}?` 
        };
      } 
      // Case 2: Contains dots but in wrong format (like "example.") 
      else if (urlForValidation.includes('.')) {
        const parts = urlForValidation.split('.');
        // If it ends with a dot
        if (urlForValidation.endsWith('.')) {
          const suggestedUrl = `${url}com`;
          return { 
            valid: true, 
            formattedUrl: suggestedUrl,
            errorMessage: `Did you mean ${suggestedUrl}?` 
          };
        }
        // If there's a subdomain but TLD is missing
        else if (parts.length >= 2 && parts[parts.length - 1].length < 2) {
          const suggestedUrl = `${url}com`;
          return { 
            valid: true, 
            formattedUrl: suggestedUrl,
            errorMessage: `Did you mean ${suggestedUrl}?` 
          };
        }
      }
      
      // If we can't auto-correct, let the user know it might not be a valid URL
      return { 
        valid: false, 
        formattedUrl: url,
        errorMessage: 'Please enter a valid website domain (e.g., example.com)' 
      };
    }
    
    // Handle URLs with www. prefix explicitly
    if (url.startsWith('www.')) {
      return { valid: true, formattedUrl: url };
    }
    
    // If it's a valid domain but would benefit from www. prefix
    if (domainRegex.test(url) && !url.includes('www.') && url.split('.').length === 2) {
      // Don't force this, just return the valid URL as is
      return { valid: true, formattedUrl: url };
    }

    return { valid: true, formattedUrl: url };
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

  // Validate URL as user types
  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const cleanedUrl = cleanUrl(e.target.value);
    setUrl(cleanedUrl);
    
    // Clear validation state when emptying the field
    if (!cleanedUrl) {
      setUrlValidation(null);
      return;
    }
    
    // Provide real-time validation feedback
    const { valid, formattedUrl, errorMessage } = validateAndFormatUrl(cleanedUrl);
    
    if (!valid) {
      setUrlValidation({ valid: false, message: errorMessage });
    } else if (formattedUrl !== cleanedUrl) {
      // If we had to modify the URL to make it valid, show helpful message
      setUrlValidation({ 
        valid: true, 
        message: `Will scan as: ${formattedUrl}` 
      });
    } else {
      setUrlValidation({ valid: true });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Check if user is on free plan
    if (userProfile?.subscription_plan === 'free') {
      setIsPaywallOpen(true)
      return
    }
    
    // Validate the URL first
    const { valid, formattedUrl, errorMessage } = validateAndFormatUrl(url);
    
    if (!valid) {
      setError(errorMessage || "Invalid URL format");
      return;
    }
    
    setIsScanning(true)
    setError(null)
    setResult(null)
    setSecurityBlocked(false)
    // Reset expansion states for new results
    setIsPresentHeadersExpanded(false)
    setIsRecommendedHeadersExpanded(false)
    setIsLeaksExpanded(false)
    setExpandedHeaders([]) // Also reset individual header expansions
    setExpandedLeaks([])   // Also reset individual leak expansions

    try {
      // Process URL to ensure it has https:// prefix
      let processedUrl = formattedUrl
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

      // Handle domain not found response from API
      if (response.status === 404) {
        const errorData = await response.json()
        if (errorData.error === "domain_not_found") {
          setError("This website doesn't seem to exist. Please check the URL and try again.")
          return
        }
      }

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || "Failed to scan website")
      }

      const data = await response.json()
      
      // Check if the site blocked our scan
      if (data.error === "blocked_by_website") {
        setSecurityBlocked(true)
        setError(null)
        
        // Save blocked scan result to database if user is authenticated
        if (user) {
          try {
            const { error: saveError } = await supabase
              .from('scan_reports')
              .insert({
                user_id: user.id,
                url: processedUrl,
                is_blocked: true,
                status: data.status || 403,
                score: 100, // Give a perfect score for sites with advanced security
                headers: { present: [], missing: [] },
                leaks: [],
                js_files_scanned: 0,
                scan_message: "Advanced Security Detected: This website implements robust security measures that prevent automated scanning."
              });
            
            if (saveError) {
              console.error('Error saving blocked scan report:', saveError);
            }
          } catch (saveError) {
            console.error('Error saving blocked scan report:', saveError);
          }
        }
        
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
              js_files_scanned: data.jsFilesScanned,
              is_blocked: false,
              status: 200,
              scan_message: null
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
      // Check for DNS lookup failures (ENOTFOUND errors)
      if (error.message && (
        error.message.includes('ENOTFOUND') || 
        error.message.includes('getaddrinfo') ||
        error.message.includes('DNS lookup failed')
      )) {
        setError("This website doesn't seem to exist. Please check the URL and try again.");
      } else {
        setError(error.message || "Failed to scan website");
      }
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
            <div className="flex flex-col flex-1">
              <div className={`flex flex-1 rounded-md overflow-hidden border ${
                urlValidation?.valid === false 
                  ? 'border-red-400 dark:border-red-700' 
                  : urlValidation?.valid === true 
                    ? 'border-green-400 dark:border-green-700' 
                    : 'border-input'
              }`}>
                <div className="flex items-center bg-muted px-3 text-muted-foreground font-medium border-r border-input">
                  https://
                </div>
                <Input
                  type="text"
                  placeholder="example.com"
                  value={url}
                  onChange={handleUrlChange}
                  required
                  className="flex-1 border-none rounded-none focus-visible:ring-0 focus-visible:ring-offset-0"
                />
              </div>
              
              {urlValidation && (
                <div className={`text-xs mt-1 ${
                  urlValidation.valid 
                    ? 'text-green-600 dark:text-green-400' 
                    : 'text-red-600 dark:text-red-400'
                }`}>
                  {urlValidation.message}
                </div>
              )}
            </div>
            
            <Button 
              type="submit" 
              disabled={isScanning || isLoadingProfile || urlValidation?.valid === false}
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
            <Alert variant={error.includes("This website doesn't seem to exist") ? "default" : "destructive"} className={`mt-4 ${error.includes("This website doesn't seem to exist") ? "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800" : ""}`}>
              <AlertTitle>{error.includes("This website doesn't seem to exist") ? "Website Not Found" : "Error"}</AlertTitle>
              <AlertDescription>
                {error}
                {error.includes("This website doesn't seem to exist") && (
                  <ul className="mt-2 list-disc pl-5 text-sm">
                    <li>Check for spelling mistakes in the domain name</li>
                    <li>Verify that the website is publicly accessible</li>
                    <li>Try adding 'www.' before the domain name</li>
                  </ul>
                )}
              </AlertDescription>
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
                  
                  <div className={`px-3 py-1 rounded-full flex items-center text-sm font-semibold ${ 
                    result.score >= 70
                      ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300' // Good score
                      : result.score >= 40
                      ? 'bg-amber-100 dark:bg-amber-900/20 text-amber-800 dark:text-amber-300' // Moderate score
                      : 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-300'         // Poor score
                  }`}>
                    Score: {result.score}/100
                  </div>
                </div>
              </div>
              
              <div className="grid md:grid-cols-2 gap-6 p-6 border-b border-border">
                <div>
                  <h4 className="text-lg font-semibold mb-3">
                    <ShieldCheck className="inline-block w-5 h-5 mr-2 text-green-500" />
                    Present Security Headers
                  </h4>
                  {result.headers.present.length > 0 ? (
                    <div>
                      <button 
                        onClick={() => setIsPresentHeadersExpanded(!isPresentHeadersExpanded)}
                        className="w-full flex items-center justify-between text-left p-3 rounded-md bg-green-50 dark:bg-green-900/10 hover:bg-green-100 dark:hover:bg-green-900/20 mb-2"
                      >
                        <div className="flex items-center">
                          <span className="text-green-500 mr-2">✓</span>
                          <span className="font-medium text-green-700 dark:text-green-300">{result.headers.present.length} Present Security Header{result.headers.present.length !== 1 ? 's' : ''}</span>
                        </div>
                        <span className={`transform transition-transform duration-200 text-green-600 dark:text-green-400 ${isPresentHeadersExpanded ? 'rotate-90' : ''}`}>▶</span>
                      </button>
                      {isPresentHeadersExpanded && (
                        <ul className="space-y-2 pl-2 border-l-2 border-green-200 dark:border-green-800 ml-2">
                          {result.headers.present.map((header) => {
                            const headerInfo = securityHeadersInfo[header] || {
                              name: header.replace(/-/g, ' '),
                              importance: 'medium',
                              description: 'Security header'
                            };
                            
                            return (
                              <li key={header} className="text-sm text-green-700 dark:text-green-300 flex items-center">
                                <span className="text-green-500 mr-1.5">-</span>
                                <span className="capitalize font-medium">{headerInfo.name}</span>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No present security headers found.</p>
                  )}
                </div>
                
                <div>
                  <h4 className="text-lg font-semibold mb-3 flex items-center">
                    <Lightbulb className="w-5 h-5 mr-2 text-blue-500" />
                    Recommended Security Headers
                  </h4>
                  {result.headers.missing.length > 0 ? (
                    <div>
                      <button 
                        onClick={() => setIsRecommendedHeadersExpanded(!isRecommendedHeadersExpanded)}
                        className="w-full flex items-center justify-between text-left p-3 rounded-md bg-blue-50 dark:bg-blue-900/10 hover:bg-blue-100 dark:hover:bg-blue-900/20 mb-2"
                      >
                        <div className="flex items-center">
                          <Info size={16} className="mr-2 text-blue-500 flex-shrink-0" />
                          <span className="font-medium text-blue-700 dark:text-blue-300">{result.headers.missing.length} Recommended Security Header{result.headers.missing.length !== 1 ? 's' : ''}</span>
                        </div>
                        <span className={`transform transition-transform duration-200 text-blue-600 dark:text-blue-400 ${isRecommendedHeadersExpanded ? 'rotate-90' : ''}`}>▶</span>
                      </button>
                      {isRecommendedHeadersExpanded && (
                        <ul className="space-y-2 pl-1"> 
                          {sortHeadersByImportance(result.headers.missing).map((header) => {
                            const headerInfo = securityHeadersInfo[header] || {
                              name: header.replace(/-/g, ' '),
                              importance: 'medium',
                              description: 'A useful security header.'
                            };
                            // This expanded state is for the *individual* header item, not the group
                            const isItemExpanded = expandedHeaders.includes(header); 
                            
                            return (
                              <li key={header} className="border rounded-md overflow-hidden bg-secondary/30 dark:bg-secondary/10">
                                <button
                                  onClick={() => toggleHeaderExpanded(header)} // Use the existing toggle for individual items
                                  className="w-full text-left p-3 flex items-center justify-between hover:bg-secondary/50 dark:hover:bg-secondary/20"
                                >
                                  <div className="flex items-start">
                                    <Info size={16} className="mr-2 mt-0.5 text-blue-500 flex-shrink-0" />
                                    <span className="capitalize font-medium">{headerInfo.name}</span>
                                    <Badge variant="outline" className="ml-2 text-xs">{headerInfo.importance}</Badge>
                                  </div>
                                  {/* Use isItemExpanded for the individual item arrow */}
                                  <span className={`transform transition-transform duration-200 ${isItemExpanded ? 'rotate-90' : ''}`}>▶</span>
                                </button>
                                
                                {/* Use isItemExpanded to show/hide details */}
                                {isItemExpanded && (
                                  <div className="p-3 bg-background/50 border-t border-border/50">
                                    <p className="text-sm text-muted-foreground mb-2">{headerInfo.description}</p>
                                    <div className="mt-2 pt-2 border-t border-dashed border-border/30">
                                      <p className="text-xs font-semibold mb-1 text-foreground">How to Fix:</p>
                                      <p className="text-xs text-muted-foreground">
                                        Configure this header in your web server (e.g., Nginx, Apache) or CDN settings. Refer to documentation for specific instructions.
                                      </p>
                                    </div>
                                  </div>
                                )}
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-green-600 dark:text-green-400 flex items-center">
                      <ShieldCheck size={16} className="mr-1.5"/> 
                      All recommended security headers are present!
                    </p>
                  )}
                </div>
              </div>

              <div className="p-6 border-t border-border">
                <h4 className="text-lg font-semibold mb-3 flex items-center">
                  <AlertTriangle className="w-5 h-5 mr-2 text-amber-500" />
                  Potential Information Exposure
                </h4>
                {result.leaks.length > 0 ? (
                  <div>
                    <button 
                      onClick={() => setIsLeaksExpanded(!isLeaksExpanded)}
                      className="w-full flex items-center justify-between text-left p-3 rounded-md bg-amber-50 dark:bg-amber-900/10 hover:bg-amber-100 dark:hover:bg-amber-900/20 mb-2"
                    >
                      <div className="flex items-center">
                        <AlertTriangle size={16} className="mr-2 text-amber-500 flex-shrink-0" />
                        <span className="font-medium text-amber-700 dark:text-amber-300">{result.leaks.length} Potential Information Exposure{result.leaks.length !== 1 ? 's' : ''}</span>
                      </div>
                      <span className={`transform transition-transform duration-200 text-amber-600 dark:text-amber-400 ${isLeaksExpanded ? 'rotate-90' : ''}`}>▶</span>
                    </button>
                    {isLeaksExpanded && (
                      <ul className="space-y-3 pl-1">
                        {result.leaks.map((leak, index) => {
                          // isExpanded is for the *individual* leak item
                          const isExpanded = expandedLeaks.includes(index); 
                          
                          // Determine severity styling (defaulting to 'warning')
                          // TODO: Update this logic when backend provides leak.severity
                          const severity = leak.severity || 'warning'; 
                          let IconComponent = AlertTriangle;
                          let iconColor = 'text-amber-500';
                          let bgColor = 'bg-amber-50 dark:bg-amber-900/10';
                          let textColor = 'text-amber-700 dark:text-amber-300';
                          
                          if (severity === 'critical') {
                            IconComponent = ShieldAlert;
                            iconColor = 'text-red-500';
                            bgColor = 'bg-red-50 dark:bg-red-900/10';
                            textColor = 'text-red-700 dark:text-red-300';
                          } else if (severity === 'secure') {
                            IconComponent = ShieldCheck;
                            iconColor = 'text-green-500';
                            bgColor = 'bg-green-50 dark:bg-green-900/10';
                            textColor = 'text-green-700 dark:text-green-300';
                          } else if (severity === 'info') {
                            IconComponent = Info;
                            iconColor = 'text-blue-500';
                            bgColor = 'bg-blue-50 dark:bg-blue-900/10';
                            textColor = 'text-blue-700 dark:text-blue-300';
                          }

                          // Determine "How to Fix" text based on leak type (basic examples)
                          let fixText = "Remove sensitive information from frontend code. Use environment variables on the backend and access data via secure API endpoints.";
                          if (leak.type.toLowerCase().includes('api key')) {
                            fixText = "Remove the API key from your frontend code. Access the API through a backend proxy or serverless function to protect the key."
                          } else if (leak.type.toLowerCase().includes('supabase')) {
                              // TODO: Refine this based on backend providing RLS status
                              if (severity === 'secure') {
                                fixText = "Supabase public URL and anonymous key detected. RLS appears to be properly configured for security based on our checks. No immediate action needed regarding this key, but ensure RLS policies remain strict."
                              } else if (severity === 'critical') {
                                fixText = "Supabase key found with potentially accessible tables! Immediately review and enforce Row Level Security (RLS) policies on all publicly exposed tables in your Supabase project. Consider rotating the key if compromise is suspected."
                              } else { // Default 'warning' for Supabase
                                fixText = "Supabase URL or key detected. Ensure Row Level Security (RLS) is enabled and properly configured for all tables accessed by the anonymous key. Verify that only intended data is publicly accessible."
                              }
                          }

                          return (
                            <li key={index} className={`border rounded-md overflow-hidden ${bgColor}`}>
                              <button
                                onClick={() => toggleLeakExpanded(index)}
                                className={`w-full text-left p-3 flex items-center justify-between hover:bg-opacity-80 dark:hover:bg-opacity-80 ${bgColor.replace('bg-', 'hover:bg-')}`}
                              >
                                <div className="flex items-start">
                                  <IconComponent size={16} className={`mr-2 mt-0.5 ${iconColor} flex-shrink-0`} />
                                  <span className={`${textColor}`}>Potential {leak.type} found: <code className="text-xs bg-black/10 dark:bg-white/10 px-1 py-0.5 rounded">{leak.preview}</code></span>
                                </div>
                                <span className={`transform transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}>▶</span>
                              </button>
                              
                              {isExpanded && (
                                <div className="p-3 bg-background/50 border-t border-border/50">
                                  <p className="text-sm font-semibold mb-1 text-foreground">Details:</p>
                                  <div className="font-mono text-xs overflow-x-auto p-2 bg-muted rounded mb-3">
                                    <code>{leak.details}</code>
                                  </div>
                                  
                                  {severity !== 'secure' && (
                                    <p className="text-sm mb-3 text-muted-foreground">
                                      <span className="font-semibold text-foreground">Potential Risk:</span> Exposing {leak.type.toLowerCase()} could allow unauthorized access to services or sensitive data.
                                    </p>
                                  )}
                                  {severity === 'secure' && (
                                    <p className="text-sm mb-3 text-muted-foreground">
                                      <span className="font-semibold text-foreground">Note:</span> While this {leak.type.toLowerCase()} is exposed, our checks indicate it's currently configured securely (e.g., RLS enabled for Supabase). Regularly review security configurations.
                                    </p>
                                  )}

                                  <div className="mt-2 pt-2 border-t border-dashed border-border/30">
                                    <p className="text-xs font-semibold mb-1 text-foreground">How to Fix:</p>
                                    <p className="text-xs text-muted-foreground">
                                      {fixText}
                                    </p>
                                  </div>
                                </div>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-green-600 dark:text-green-400 flex items-center">
                     <ShieldCheck size={16} className="mr-1.5"/> 
                     No potential information exposure found in the scanned files! 🎉
                  </p>
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