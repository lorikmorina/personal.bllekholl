"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"
import { Loader2, Shield, ShieldAlert, ShieldCheck, Globe, Zap, Lock, Info, Lightbulb, AlertTriangle, AlertCircle, User } from "lucide-react"
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
      { message: "Testing database configuration...", progress: 85 },
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
          severity: 'info'
        });
      });
    }
    
    // Filter out database keys with properly configured security
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
        case 'warning':
          high.push(leak);
          break;
        case 'info':
          medium.push(leak);
          break;
        case 'secure':
          low.push(leak);
          break;
        default:
          // Default categorization based on leak type
          if (leak.type.includes('API Key') && !leak.type.toLowerCase().includes('captcha')) {
            critical.push({...leak, severity: 'critical'});
          } else if (leak.type.includes('Supabase') && leak.details?.includes('RLS')) {
            high.push({...leak, severity: 'warning'});
          } else if (leak.type.includes('Unprotected Auth Page')) {
            medium.push({...leak, severity: 'info'});
          } else if (leak.type.toLowerCase().includes('captcha')) {
            low.push({...leak, severity: 'info'});
          } else {
            medium.push({...leak, severity: 'info'});
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
                  if (leak.severity === 'warning') {
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
                Upgrade to unlock unlimited scans and detailed reports. Start using all tools with our monthly plan!
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

      {/* Show scanner loading animation when scanning */}
      {isScanning && !result && !error && !securityBlocked && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <ScannerLoading />
        </motion.div>
      )}

      {/* Scan results */}
      {result && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Card>
            <CardContent className="p-0">
              <div className="p-6 flex flex-col sm:flex-row items-center justify-between border-b border-border gap-4">
                <div>
                  <h3 className="text-2xl font-bold">Security Report</h3>
                  <p className="text-muted-foreground">URL: {result.url}</p>
                </div>
                <SecuritySpeedometer score={result.score} />
              </div>

              <div className="p-6 border-b border-border">
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
                            isLeaksExpanded, 
                            setIsLeaksExpanded,
                            "bg-red-50 dark:bg-red-900/10 hover:bg-red-100 dark:hover:bg-red-900/20",
                            "text-red-700 dark:text-red-300",
                            expandedLeaks,
                            toggleLeakExpanded
                          )}
                          
                          {renderRiskCategory(
                            "High Risk Issues", 
                            <AlertCircle className="w-5 h-5 mr-2 text-orange-500 flex-shrink-0" />, 
                            high, 
                            isLeaksExpanded, 
                            setIsLeaksExpanded,
                            "bg-orange-50 dark:bg-orange-900/10 hover:bg-orange-100 dark:hover:bg-orange-900/20",
                            "text-orange-700 dark:text-orange-300",
                            expandedLeaks,
                            toggleLeakExpanded
                          )}
                          
                          {renderRiskCategory(
                            "Medium Risk Issues", 
                            <AlertTriangle className="w-5 h-5 mr-2 text-amber-500 flex-shrink-0" />, 
                            medium, 
                            isLeaksExpanded, 
                            setIsLeaksExpanded,
                            "bg-amber-50 dark:bg-amber-900/10 hover:bg-amber-100 dark:hover:bg-amber-900/20",
                            "text-amber-700 dark:text-amber-300",
                            expandedLeaks,
                            toggleLeakExpanded
                          )}
                          
                          {renderRiskCategory(
                            "Low Risk & Recommendations", 
                            <Info className="w-5 h-5 mr-2 text-blue-500 flex-shrink-0" />, 
                            low, 
                            isLeaksExpanded, 
                            setIsLeaksExpanded,
                            "bg-blue-50 dark:bg-blue-900/10 hover:bg-blue-100 dark:hover:bg-blue-900/20",
                            "text-blue-700 dark:text-blue-300",
                            expandedLeaks,
                            toggleLeakExpanded
                          )}
                        </>
                      );
                    })()}
                    
                    {/* If RLS is properly configured, show note about Supabase being checked */}
                    {result.leaks.some(leak => 
                        leak.type.includes('Supabase') && 
                        leak.severity === 'secure' && 
                        leak.details?.includes('RLS appears to be properly configured')
                    ) && (
                      <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/10 text-green-700 dark:text-green-300 rounded-md border border-green-200 dark:border-green-800">
                        <div className="flex items-center mb-1">
                          <ShieldCheck className="w-4 h-4 mr-2 text-green-500" />
                          <span className="font-medium">Database Security Check Passed</span>
                        </div>
                        <p className="text-sm ml-6">
                          Database connection details were detected, but Row Level Security (RLS) appears to be properly configured. No tables were accessible without proper authentication.
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