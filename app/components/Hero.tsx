"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"
import { 
  Loader2, Shield, ShieldAlert, ShieldCheck, User, 
  Globe, Zap, Lock, Info, Lightbulb, AlertTriangle,
  AlertCircle, Gauge
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
    severity?: 'critical' | 'high' | 'medium' | 'low' | 'secure'
  }>
  jsFilesScanned: number
  score: number
  rlsVulnerability?: {
    isRlsVulnerable: boolean
    vulnerableTables: string[]
  }
  authPages?: {
    found: string[]
    protected: string[]
    unprotected: string[]
  }
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

// Loading Scanner Component
const ScannerLoading = () => {
  const [progressWidth, setProgressWidth] = useState(0);
  const [scanningState, setScanningState] = useState("Initializing scan...");
  const [currentStep, setCurrentStep] = useState(0);
  
  useEffect(() => {
    // Simulate the scanning process with multiple steps
    const states = [
      { message: "Initializing scan...", progress: 10 },
      { message: "Fetching website content...", progress: 25 },
      { message: "Analyzing security headers...", progress: 40 },
      { message: "Scanning JavaScript files...", progress: 60 },
      { message: "Checking for API keys...", progress: 75 },
      { message: "Testing Supabase RLS configuration...", progress: 85 },
      { message: "Identifying authentication pages...", progress: 90 },
      { message: "Calculating security score...", progress: 95 }
    ];
    
    // Start with a small delay
    const initialDelay = setTimeout(() => {
      setProgressWidth(states[0].progress);
      setScanningState(states[0].message);
      setCurrentStep(0);
    }, 300);
    
    // Transition between states
    let currentIndex = 0;
    const interval = setInterval(() => {
      if (currentIndex < states.length - 1) {
        currentIndex++;
        setCurrentStep(currentIndex);
        setScanningState(states[currentIndex].message);
        
        // Animate progress smoothly
        const targetProgress = states[currentIndex].progress;
        const startProgress = progressWidth;
        const duration = 700; // ms
        const startTime = Date.now();
        
        const progressInterval = setInterval(() => {
          const elapsed = Date.now() - startTime;
          if (elapsed >= duration) {
            setProgressWidth(targetProgress);
            clearInterval(progressInterval);
          } else {
            const progress = startProgress + ((targetProgress - startProgress) * elapsed / duration);
            setProgressWidth(progress);
          }
        }, 16);
      } else {
        // At the last step, complete to 99% (not 100% to maintain loading feel)
        setProgressWidth(99);
        clearInterval(interval);
      }
    }, 1200); // Slightly longer interval for a more realistic feel
    
    return () => {
      clearTimeout(initialDelay);
      clearInterval(interval);
    };
  }, []);
  
  return (
    <div className="w-full max-w-lg mx-auto bg-card rounded-xl shadow-lg overflow-hidden border border-border">
      <div className="p-6">
        <h3 className="text-xl font-semibold mb-4 flex items-center">
          <Shield className="mr-2 h-5 w-5 text-primary" />
          Security Scan in Progress
        </h3>
        
        <div className="mb-6">
          <div className="flex justify-between mb-2">
            <span className="text-sm text-muted-foreground">{scanningState}</span>
            <span className="text-sm font-medium">{Math.round(progressWidth)}%</span>
          </div>
          <div className="h-3 w-full bg-secondary rounded-full overflow-hidden">
            <motion.div 
              className="h-full bg-gradient-to-r from-blue-400 via-primary to-blue-600 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progressWidth}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>
        
        <div className="flex flex-col items-center justify-center py-4 mb-2">
          <motion.div
            animate={{ 
              scale: [1, 1.05, 1],
              rotate: [0, 5, 0, -5, 0],
              opacity: [0.8, 1, 0.8]
            }}
            transition={{ 
              repeat: Infinity, 
              duration: 2,
              ease: "easeInOut"
            }}
            className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-4 relative"
          >
            <Loader2 className="h-10 w-10 text-primary animate-spin" />
            
            {/* Animated scanning effect */}
            <motion.div 
              className="absolute inset-0 rounded-full border-2 border-primary"
              animate={{
                opacity: [0, 0.8, 0],
                scale: [0.8, 1.2, 1.4],
              }}
              transition={{
                repeat: Infinity,
                duration: 2,
                ease: "easeOut",
              }}
            />
          </motion.div>
          
          <p className="text-muted-foreground text-sm text-center max-w-md">
            We're thoroughly analyzing your website's security. This may take a moment as we check for various vulnerabilities.
          </p>
        </div>
      </div>
      
      <div className="px-6 pb-6">
        <div className="grid grid-cols-4 gap-2">
          {[
            { icon: <Shield className="w-3 h-3" />, label: "Headers", step: 2 },
            { icon: <Lock className="w-3 h-3" />, label: "API Keys", step: 4 },
            { icon: <AlertCircle className="w-3 h-3" />, label: "Database", step: 5 },
            { icon: <User className="w-3 h-3" />, label: "Auth Pages", step: 6 }
          ].map((item, index) => (
            <div 
              key={item.label} 
              className={`flex flex-col items-center text-xs px-2 py-1.5 rounded-md transition-colors duration-300 ${
                currentStep >= item.step 
                  ? "bg-primary/10 text-primary" 
                  : "bg-secondary/50 text-muted-foreground"
              }`}
            >
              <div className="flex items-center gap-1 mb-1">
                {item.icon}
                <span>{item.label}</span>
              </div>
              <div className="w-full h-1 bg-secondary/50 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-primary rounded-full"
                  initial={{ width: 0 }}
                  animate={{ 
                    width: currentStep >= item.step ? "100%" : 
                           currentStep + 1 === item.step ? "20%" : "0%"
                  }}
                  transition={{ duration: 0.5 }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Speedometer Component for Security Score (simplified to just show score)
const SecuritySpeedometer = ({ score }: { score: number }) => {
  // Text to display based on score
  const getRiskText = () => {
    if (score >= 80) return "Low Risk";
    if (score >= 60) return "Moderate Risk";
    if (score >= 40) return "High Risk";
    return "Critical Risk";
  };

  return (
    <div className={`px-5 py-3 rounded-lg flex flex-col items-center ${ 
      score >= 70
        ? 'bg-green-100 dark:bg-green-900/20'
        : score >= 40
        ? 'bg-amber-100 dark:bg-amber-900/20'
        : 'bg-red-100 dark:bg-red-900/20'
    }`}>
      <div className={`text-4xl font-bold ${ 
        score >= 70
          ? 'text-green-800 dark:text-green-300'
          : score >= 40
          ? 'text-amber-800 dark:text-amber-300'
          : 'text-red-800 dark:text-red-300'
      }`}>                 
        {score}
      </div>
      <div className={`text-sm font-medium ${ 
        score >= 70
          ? 'text-green-700 dark:text-green-400'
          : score >= 40
          ? 'text-amber-700 dark:text-amber-400'
          : 'text-red-700 dark:text-red-400'
      }`}>
        {getRiskText()}
      </div>
    </div>
  );
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
  
  // State for risk categories expansion
  const [isCriticalRiskExpanded, setIsCriticalRiskExpanded] = useState(false)
  const [isHighRiskExpanded, setIsHighRiskExpanded] = useState(false)
  const [isMediumRiskExpanded, setIsMediumRiskExpanded] = useState(false)
  const [isLowRiskExpanded, setIsLowRiskExpanded] = useState(false)
  
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

  // Helper function to categorize leaks by severity
  const categorizeLeaks = (leaks: ScanResult['leaks']) => {
    const critical: typeof leaks = [];
    const high: typeof leaks = [];
    const medium: typeof leaks = [];
    const low: typeof leaks = [];
    
    // Add missing security headers as low risk items
    const missingHeaders = result?.headers?.missing || [];
    if (missingHeaders.length > 0) {
      missingHeaders.forEach(header => {
        const headerInfo = securityHeadersInfo[header] || {
          name: header.replace(/-/g, ' '),
          importance: 'medium',
          description: 'Security header'
        };
        
        low.push({
          type: 'Missing Security Header',
          preview: headerInfo.name,
          details: `The ${headerInfo.name} security header is missing. ${headerInfo.description}`,
          severity: 'low'
        });
      });
    }
    
    // Filter out Supabase links with properly configured RLS
    const filteredLeaks = leaks.filter(leak => 
      !(leak.type.includes('Supabase') && leak.severity === 'secure')
    );
    
    filteredLeaks.forEach(leak => {
      // Skip missing security headers (we've already added them above)
      if (leak.type.includes('Missing Security Header')) {
        return;
      }
      
      // Categorize by severity (with default fallbacks)
      switch(leak.severity) {
        case 'critical':
          critical.push(leak);
          break;
        case 'high':
          high.push(leak);
          break;
        case 'medium':
          medium.push(leak);
          break;
        case 'low':
          low.push(leak);
          break;
        default:
          // Default categorization based on leak type
          if (leak.type.includes('API Key') && !leak.type.toLowerCase().includes('captcha')) {
            critical.push({...leak, severity: 'critical'});
          } else if (leak.type.includes('Supabase') && result?.rlsVulnerability?.isRlsVulnerable) {
            high.push({...leak, severity: 'high'});
          } else if (leak.type.includes('Unprotected Auth Page')) {
            medium.push({...leak, severity: 'medium'});
          } else if (leak.type.toLowerCase().includes('captcha')) {
            low.push({...leak, severity: 'low'});
          } else {
            medium.push({...leak, severity: 'medium'});
          }
      }
    });
    
    return { critical, high, medium, low };
  };

  // Helper to render a risk category section
  const renderRiskCategory = (
    title: string, 
    icon: JSX.Element, 
    leaks: ScanResult['leaks'], 
    isExpanded: boolean, 
    setExpanded: React.Dispatch<React.SetStateAction<boolean>>,
    bgColor: string,
    textColor: string,
    expandedLeaks: number[],
    toggleLeakExpanded: (index: number) => void
  ) => {
    if (leaks.length === 0) return null;
    
    return (
      <div className="mb-6">
        <h4 className="text-lg font-semibold mb-3 flex items-center">
          {icon}
          {title} <span className="ml-2 text-sm font-normal">({leaks.length})</span>
        </h4>
        <button 
          onClick={() => setExpanded(!isExpanded)}
          className={`w-full flex items-center justify-between text-left p-3 rounded-md ${bgColor} mb-2`}
        >
          <div className="flex items-center">
            {icon}
            <span className={`font-medium ${textColor}`}>{leaks.length} {title}</span>
          </div>
          <span className={`transform transition-transform duration-200 ${textColor} ${isExpanded ? 'rotate-90' : ''}`}>▶</span>
        </button>
        {isExpanded && (
          <ul className="space-y-3 pl-1">
            {leaks.map((leak, idx) => {
              // We need a unique key for each leak item that doesn't conflict with other categories
              const uniqueKey = `${title.toLowerCase().replace(/\s+/g, '-')}-${idx}`;
              const isItemExpanded = expandedLeaks.includes(idx);
              
              // Get appropriate fix text based on leak type
              const getFixText = () => {
                if (leak.type.toLowerCase().includes('api key')) {
                  return "Remove the API key from your frontend code. Access the API through a backend proxy or serverless function to protect the key.";
                } 
                
                if (leak.type.toLowerCase().includes('supabase')) {
                  if (leak.severity === 'high' || (result?.rlsVulnerability?.isRlsVulnerable)) {
                    return "Supabase key found with accessible tables! Immediately review and enforce Row Level Security (RLS) policies on all publicly exposed tables in your Supabase project.";
                  }
                  return "Ensure Row Level Security (RLS) is enabled and properly configured for all tables accessed by the anonymous key.";
                }
                
                if (leak.type.toLowerCase().includes('auth page')) {
                  return "Add CAPTCHA or Turnstile protection to your authentication forms to prevent brute force attacks.";
                }
                
                if (leak.type.toLowerCase().includes('security header')) {
                  return "Configure this security header in your web server (e.g., Nginx, Apache) or CDN settings. This can typically be done through configuration files or through your hosting provider's security settings.";
                }
                
                return "Remove sensitive information from frontend code. Use environment variables on the backend and access data via secure API endpoints.";
              };
              
              return (
                <li key={uniqueKey} className={`border rounded-md overflow-hidden ${bgColor}`}>
                  <button
                    onClick={() => toggleLeakExpanded(idx)}
                    className={`w-full text-left p-3 flex items-center justify-between hover:bg-opacity-80 dark:hover:bg-opacity-80`}
                  >
                    <div className="flex items-start">
                      {icon}
                      <span className={`${textColor}`}>
                        {leak.type}: <code className="text-xs bg-black/10 dark:bg-white/10 px-1 py-0.5 rounded">{leak.preview}</code>
                      </span>
                    </div>
                    <span className={`transform transition-transform duration-200 ${isItemExpanded ? 'rotate-90' : ''}`}>▶</span>
                  </button>
                  
                  {isItemExpanded && (
                    <div className="p-3 bg-background/50 border-t border-border/50">
                      <p className="text-sm font-semibold mb-1 text-foreground">Details:</p>
                      <div className="font-mono text-xs overflow-x-auto p-2 bg-muted rounded mb-3">
                        <code>{leak.details}</code>
                      </div>
                      
                      <p className="text-sm mb-3 text-muted-foreground">
                        <span className="font-semibold text-foreground">Potential Risk:</span> {
                          leak.type.toLowerCase().includes('security header')
                            ? "Missing security headers can make your site more vulnerable to various types of attacks."
                            : `Exposing ${leak.type.toLowerCase()} could allow unauthorized access to services or sensitive data.`
                        }
                      </p>

                      <div className="mt-2 pt-2 border-t border-dashed border-border/30">
                        <p className="text-xs font-semibold mb-1 text-foreground">How to Fix:</p>
                        <p className="text-xs text-muted-foreground">
                          {getFixText()}
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
    );
  };

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
              isScanning ? (
                <ScannerLoading />
              ) : (
                <div className="w-full max-w-lg mx-auto">
                  <img 
                    src="/design/hero-secureviber.png"
                    alt="SecureVibing Scanner"
                    className="w-full h-auto rounded-2xl shadow-lg"
                  />
                </div>
              )
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="bg-card rounded-xl shadow-lg overflow-hidden border border-border"
              >
                <div className="p-6 flex flex-col sm:flex-row items-center justify-between border-b border-border gap-4">
                  <div>
                    <h3 className="text-2xl font-bold">Security Report</h3>
                    <p className="text-muted-foreground">URL: {result.url}</p>
                  </div>
                  <SecuritySpeedometer score={result.score} />
                </div>

                <div className="p-6">
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

                <div className="px-6 pb-6">
                  {/* Risk Categories */}
                  {result.leaks.length > 0 && (
                    <div>
                      <h3 className="text-xl font-bold mb-4">Security Findings by Risk Level</h3>
                      
                      {/* Group leaks by severity */}
                      {(() => {
                        const { critical, high, medium, low } = categorizeLeaks(result.leaks);
                        
                        return (
                          <>
                            {renderRiskCategory(
                              "Critical Risk Issues", 
                              <ShieldAlert className="w-5 h-5 mr-2 text-red-500 flex-shrink-0" />, 
                              critical, 
                              isCriticalRiskExpanded, 
                              setIsCriticalRiskExpanded,
                              "bg-red-50 dark:bg-red-900/10 hover:bg-red-100 dark:hover:bg-red-900/20",
                              "text-red-700 dark:text-red-300",
                              expandedLeaks,
                              toggleLeakExpanded
                            )}
                            
                            {renderRiskCategory(
                              "High Risk Issues", 
                              <AlertCircle className="w-5 h-5 mr-2 text-orange-500 flex-shrink-0" />, 
                              high, 
                              isHighRiskExpanded, 
                              setIsHighRiskExpanded,
                              "bg-orange-50 dark:bg-orange-900/10 hover:bg-orange-100 dark:hover:bg-orange-900/20",
                              "text-orange-700 dark:text-orange-300",
                              expandedLeaks,
                              toggleLeakExpanded
                            )}
                            
                            {renderRiskCategory(
                              "Medium Risk Issues", 
                              <AlertTriangle className="w-5 h-5 mr-2 text-amber-500 flex-shrink-0" />, 
                              medium, 
                              isMediumRiskExpanded, 
                              setIsMediumRiskExpanded,
                              "bg-amber-50 dark:bg-amber-900/10 hover:bg-amber-100 dark:hover:bg-amber-900/20",
                              "text-amber-700 dark:text-amber-300",
                              expandedLeaks,
                              toggleLeakExpanded
                            )}
                            
                            {renderRiskCategory(
                              "Low Risk & Recommendations", 
                              <Info className="w-5 h-5 mr-2 text-blue-500 flex-shrink-0" />, 
                              low, 
                              isLowRiskExpanded, 
                              setIsLowRiskExpanded,
                              "bg-blue-50 dark:bg-blue-900/10 hover:bg-blue-100 dark:hover:bg-blue-900/20",
                              "text-blue-700 dark:text-blue-300",
                              expandedLeaks,
                              toggleLeakExpanded
                            )}
                          </>
                        );
                      })()}
                      
                      {/* If RLS is properly configured, show note about Supabase being checked */}
                      {result.rlsVulnerability && !result.rlsVulnerability.isRlsVulnerable && (
                        <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/10 text-green-700 dark:text-green-300 rounded-md border border-green-200 dark:border-green-800">
                          <div className="flex items-center mb-1">
                            <ShieldCheck className="w-4 h-4 mr-2 text-green-500" />
                            <span className="font-medium">Supabase Security Check Passed</span>
                          </div>
                          <p className="text-sm ml-6">
                            Supabase connection details were detected, but Row Level Security (RLS) appears to be properly configured. No tables were accessible without proper authentication.
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* If no security issues found */}
                  {result.leaks.length === 0 && (
                    <div className="bg-green-50 dark:bg-green-900/10 p-4 rounded-md mt-4 border border-green-200 dark:border-green-800">
                      <div className="flex items-center mb-2">
                        <ShieldCheck className="w-5 h-5 mr-2 text-green-500" />
                        <span className="font-semibold text-green-700 dark:text-green-300">No Security Issues Detected</span>
                      </div>
                      <p className="text-sm text-green-600 dark:text-green-400 pl-7">
                        Great job! We didn't find any potential security issues in the {result.jsFilesScanned} JavaScript files scanned.
                      </p>
                    </div>
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

