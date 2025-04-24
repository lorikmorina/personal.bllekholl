"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"
import { 
  Loader2, Shield, ShieldAlert, ShieldCheck, User, 
  Globe, Zap, Lock, Info, Lightbulb, AlertTriangle
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
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
    severity?: 'critical' | 'warning' | 'info' | 'secure'
  }>
  jsFilesScanned: number
  score: number
}

// Security headers information (copy from WearYourStory component)
const securityHeadersInfo: Record<string, { name: string; importance: string; description: string }> = {
  'strict-transport-security': {
    name: 'Strict-Transport-Security',
    importance: 'high',
    description: 'Ensures the browser only connects via HTTPS, protecting against downgrade attacks.'
  },
  'content-security-policy': {
    name: 'Content-Security-Policy',
    importance: 'high',
    description: 'Prevents XSS attacks by specifying which domains can load content.'
  },
  'x-content-type-options': {
    name: 'X-Content-Type-Options',
    importance: 'medium',
    description: 'Prevents MIME-sniffing attacks by telling browsers to respect the declared content type.'
  },
  'x-frame-options': {
    name: 'X-Frame-Options',
    importance: 'medium',
    description: 'Prevents clickjacking attacks by controlling whether the page can be embedded in an iframe.'
  },
  'referrer-policy': {
    name: 'Referrer-Policy',
    importance: 'medium',
    description: 'Controls how much referrer information is included with requests.'
  },
  'permissions-policy': {
    name: 'Permissions-Policy',
    importance: 'low',
    description: 'Controls which browser features can be used by the page.'
  }
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
  const [easterEggMessage, setEasterEggMessage] = useState<string | null>(null)
  const [result, setResult] = useState<ScanResult | null>(null)
  const [expandedHeaders, setExpandedHeaders] = useState<string[]>([])
  const [expandedLeaks, setExpandedLeaks] = useState<number[]>([])
  const [isPresentHeadersExpanded, setIsPresentHeadersExpanded] = useState(false)
  const [isRecommendedHeadersExpanded, setIsRecommendedHeadersExpanded] = useState(false)
  const [isLeaksExpanded, setIsLeaksExpanded] = useState(false)
  const [securityBlocked, setSecurityBlocked] = useState<boolean>(false)
  const router = useRouter()

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setEasterEggMessage(null)
    setSecurityBlocked(false)
    
    // Process URL to ensure it has https:// prefix
    let processedUrl = url
    if (!processedUrl.startsWith('http://') && !processedUrl.startsWith('https://')) {
      processedUrl = `https://${processedUrl}`
    }
    
    // Easter egg for scanning our own website
    if (processedUrl.toLowerCase().includes("securevibing.com")) {
      setEasterEggMessage("Really, you are wasting your scan on us, so generous of you but I will give your free scan back, use it wisely this time 😉")
      return
    }
    
    setIsScanning(true)
    setError(null)
    setResult(null)
    // Reset expansion states for new results
    setIsPresentHeadersExpanded(false)
    setIsRecommendedHeadersExpanded(false)
    setIsLeaksExpanded(false)
    setExpandedHeaders([]) // Also reset individual header expansions
    setExpandedLeaks([])   // Also reset individual leak expansions

    try {
      const response = await fetch("/api/scan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url: processedUrl }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        
        // Check for no scans remaining error
        if (errorData.error === "no_scans_remaining") {
          // Use the redirect URL if provided, otherwise default to /signup
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
      
      // Check if the site blocked our scan
      if (data.error === "blocked_by_website") {
        setSecurityBlocked(true)
        setError(null)
        return
      }
      
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
              Ready to Launch? Wait, first Scan your website for security issues to see if your website passes the security vibe check. Find leaked API keys, 
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
                <div className="flex flex-grow rounded-md overflow-hidden border border-input">
                  <div className="flex items-center bg-muted px-3 text-muted-foreground font-medium border-r border-input">
                    https://
                  </div>
                  <Input
                    type="text"
                    placeholder="example.com"
                    value={url}
                    onChange={(e) => setUrl(cleanUrl(e.target.value))}
                    required
                    className="flex-grow border-none rounded-none focus-visible:ring-0 focus-visible:ring-offset-0"
                  />
                </div>
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
              
              <p className="mt-2 text-xs text-muted-foreground italic">
                Disclaimer: The app is in beta and may produce false positives and doesn't guarantee complete website security. You have 2 free scans.
              </p>
              
              {error && (
                <Alert variant="destructive" className="mt-6">
                  <ShieldAlert className="h-4 w-4" />
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {securityBlocked && (
                <Alert variant="default" className="mt-6 border-2 border-green-600 bg-green-50 dark:bg-green-900/20 dark:border-green-800">
                  <ShieldCheck className="h-4 w-4 text-green-600 dark:text-green-400" />
                  <AlertTitle className="text-green-700 dark:text-green-400">Advanced Security Detected!</AlertTitle>
                  <AlertDescription className="text-green-600 dark:text-green-300">
                    This website has robust security measures that prevent automated scanning. While we can't provide a complete security report, the presence of these protective measures is generally a positive security indicator.
                  </AlertDescription>
                </Alert>
              )}

              {easterEggMessage && (
                <Alert variant="default" className="mt-6 border-2 border-primary bg-primary/10">
                  <User className="h-4 w-4 text-primary" />
                  <AlertTitle className="text-primary">Hey there! 👋</AlertTitle>
                  <AlertDescription className="text-primary/90">{easterEggMessage}</AlertDescription>
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
                  alt="SecureVibing Scanner"
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
                  <div className={`px-4 py-2 rounded-lg flex flex-col items-center ${ 
                    result.score >= 70
                      ? 'bg-green-100 dark:bg-green-900/20'
                      : result.score >= 40
                      ? 'bg-amber-100 dark:bg-amber-900/20'
                      : 'bg-red-100 dark:bg-red-900/20'
                  }`}>
                    <div className={`text-3xl font-bold ${ 
                      result.score >= 70
                        ? 'text-green-800 dark:text-green-300'
                        : result.score >= 40
                        ? 'text-amber-800 dark:text-amber-300'
                        : 'text-red-800 dark:text-red-300'
                    }`}>                 
                      {result.score}/100
                    </div>
                    <p className={`text-sm font-medium ${ 
                      result.score >= 70
                        ? 'text-green-700 dark:text-green-400'
                        : result.score >= 40
                        ? 'text-amber-700 dark:text-amber-400'
                        : 'text-red-700 dark:text-red-400'
                    }`}>Security Score</p>
                  </div>
                </div>

                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-lg font-semibold mb-3 flex items-center">
                      <ShieldCheck className="mr-2 h-5 w-5 text-green-500" />
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
                  <p className="text-xs text-muted-foreground mt-4">
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

