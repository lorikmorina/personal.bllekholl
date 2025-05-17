"use client"

import { useState, useRef } from "react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input" 
import { useRouter } from "next/navigation"
import { 
  Shield, Globe, Zap, Lock, Lightbulb, User,
  AlertCircle, Gauge, Heart, Repeat, MessageSquare, Share, VerifiedIcon, 
  CheckCircle, XCircle, BarChart4, ArrowRight, Info
} from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import axios from "axios"

// Add Card component
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"

// Twitter Post Marquee Component
const TwitterPostMarquee = () => {
  // Template posts - you can replace these with real content later
  const posts = [
    {
      id: 1,
      author: {
        name: "Abbas Agha",
        handle: "@uAghazadae",
        avatar: "/Xprofiles/uAghazadae.jpg",
        verified: true
      },
      content: "yesterday @lorikmor said me that i have a bug on my website.\n\nI want to say thanks to @lorikmor for catching my supabase bug and helping me fix it.\n\nAlso his app @SecureVibing is awesome to find website vulnerabilities. go check it out vibe coders",
      date: "2h"
    },
    {
      id: 2,
      author: {
        name: "Chatbit",
        handle: "@ChatbitAI",
        avatar: "/Xprofiles/ChatbitAI.jpg",
        verified: true
      },
      content: "Thanks, @lorikmor! Now I can sleep at night knowing my website isn't secretly a bug hotel. 🐞🏨",
      date: "1d"
    },
    {
      id: 3,
      author: {
        name: "jack friks",
        handle: "@jackfriks",
        avatar: "/Xprofiles/jackfriks.jpg",
        verified: true
      },
      content: "this guy could have just said nothing and let himself have free access forever too \n\n go try his tool and secure your apps!!! @SecureVibing",
      date: "1d"
    },
    {
      id: 4,
      author: {
        name: "laod",
        handle: "@laoddev",
        avatar: "/Xprofiles/laoddev.jpg",
        verified: true
      },
      content: "thanks to @SecureVibing I was able to make my app @waitlaunch much more secure.",
      date: "1d"
    }
  ];

  // Function to highlight mentions in tweet text
  const formatTweetContent = (content: string) => {
    // Replace mentions with highlighted spans
    const formattedContent = content
      .replace(/@(\w+)/g, '<span class="text-primary font-medium">@$1</span>')
      .replace(/\n/g, '<br />'); // Replace line breaks with HTML breaks
    return { __html: formattedContent };
  };

  return (
    <div className="pt-12 pb-8 border-t border-border">
      <div className="mb-8 text-center">
        <h2 className="text-2xl font-bold mb-2">What people are saying</h2>
        <p className="text-muted-foreground">Join other vibe coders securing their websites</p>
      </div>
      
      <div className="relative overflow-hidden">
        {/* Left gradient overlay */}
        <div className="absolute left-0 top-0 bottom-0 w-12 md:w-24 z-10 bg-gradient-to-r from-background to-transparent"></div>
        
        {/* Right gradient overlay */}
        <div className="absolute right-0 top-0 bottom-0 w-12 md:w-24 z-10 bg-gradient-to-l from-background to-transparent"></div>
        
        <div className="flex animate-marquee py-4">
          {posts.concat(posts).map((post, index) => (
            <div 
              key={`${post.id}-${index}`} 
              className="min-w-[300px] sm:min-w-[320px] max-w-[300px] sm:max-w-[320px] bg-card p-4 rounded-xl border border-border shadow-sm mx-3 flex flex-col hover:shadow-md transition-shadow"
            >
              <div className="flex items-start mb-3">
                <div className="w-10 h-10 rounded-full overflow-hidden bg-muted mr-3 flex-shrink-0">
                  {post.author.avatar ? (
                    <img 
                      src={post.author.avatar} 
                      alt={`${post.author.name}'s avatar`}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        // Safely handle image error
                        try {
                          const target = e.target as HTMLImageElement;
                          target.onerror = null;
                          target.style.display = 'none';
                          // Create a fallback element instead of modifying innerHTML
                          const fallbackDiv = document.createElement('div');
                          fallbackDiv.className = "bg-primary/10 w-full h-full flex items-center justify-center";
                          fallbackDiv.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-5 w-5 text-primary"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>`;
                          
                          if (target.parentElement) {
                            target.parentElement.appendChild(fallbackDiv);
                          }
                        } catch (err) {
                          console.error('Error handling image fallback:', err);
                        }
                      }}
                    />
                  ) : (
                    <div className="bg-primary/10 w-full h-full flex items-center justify-center">
                      <User className="h-5 w-5 text-primary" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center">
                    <span className="font-semibold truncate">{post.author.name}</span>
                    {post.author.verified && (
                      <svg className="w-4 h-4 ml-1 text-blue-500 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M22.5 12.5c0-1.58-.875-2.95-2.148-3.6.154-.435.238-.905.238-1.4 0-2.21-1.71-3.998-3.818-3.998-.47 0-.92.084-1.336.25C14.818 2.415 13.51 1.5 12 1.5s-2.816.917-3.437 2.25c-.415-.165-.866-.25-1.336-.25-2.11 0-3.818 1.79-3.818 4 0 .494.083.964.237 1.4-1.272.65-2.147 2.018-2.147 3.6 0 1.495.782 2.798 1.942 3.486-.02.17-.032.34-.032.514 0 2.21 1.708 4 3.818 4 .47 0 .92-.086 1.335-.25.62 1.334 1.926 2.25 3.437 2.25 1.512 0 2.818-.916 3.437-2.25.415.163.865.248 1.336.248 2.11 0 3.818-1.79 3.818-4 0-.174-.012-.344-.033-.513 1.158-.687 1.943-1.99 1.943-3.484zm-6.616-3.334l-4.334 6.5c-.145.217-.382.334-.625.334-.143 0-.288-.04-.416-.126l-.115-.094-2.415-2.415c-.293-.293-.293-.768 0-1.06s.768-.294 1.06 0l1.77 1.767 3.825-5.74c.23-.345.696-.436 1.04-.207.346.23.44.696.21 1.04z" />
                      </svg>
                    )}
                  </div>
                  <div className="text-muted-foreground text-sm truncate">{post.author.handle}</div>
                </div>
                <div className="text-muted-foreground text-xs ml-1 flex-shrink-0">{post.date}</div>
              </div>
              
              <div className="mb-0 flex-grow max-h-[150px] overflow-y-auto">
                <p 
                  className="text-sm break-words leading-relaxed" 
                  dangerouslySetInnerHTML={formatTweetContent(post.content)}
                ></p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Free security scan result component
const ScanResultCard = ({ result, isLoading, onSignup }: any) => {
  if (isLoading) {
    return (
      <Card className="w-full mt-6 mb-8 bg-card/50 backdrop-blur-sm">
        <CardContent className="pt-6 pb-4 flex flex-col items-center justify-center">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Scanning your website for security vulnerabilities...
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!result) return null;

  // Handle error case
  if (result.error) {
    return (
      <Alert variant="destructive" className="mt-6 mb-8">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{result.error}</AlertDescription>
      </Alert>
    );
  }

  const { hasCriticalIssues, hasMediumIssues, hasLowIssues, securityScore, message, rlsMessage } = result;
  
  // Determine the severity level
  let severity = 'success';
  if (hasCriticalIssues) {
    severity = 'critical';
  } else if (hasMediumIssues) {
    severity = 'warning';
  } else if (hasLowIssues) {
    severity = 'low';
  }

  return (
    <Card className={`w-full mt-6 mb-8 border-${severity === 'critical' ? 'red-500/50' : severity === 'warning' ? 'yellow-500/50' : severity === 'low' ? 'blue-500/50' : 'green-500/50'}`}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center text-lg">
          {severity === 'critical' ? (
            <><XCircle className="mr-2 h-5 w-5 text-red-500" /> Critical Security Risk</>
          ) : severity === 'warning' ? (
            <><AlertCircle className="mr-2 h-5 w-5 text-yellow-500" /> Medium Security Risk</>
          ) : severity === 'low' ? (
            <><AlertCircle className="mr-2 h-5 w-5 text-blue-500" /> Low Security Risk</>
          ) : (
            <><CheckCircle className="mr-2 h-5 w-5 text-green-500" /> Good Security</>
          )}
        </CardTitle>
        <CardDescription>
          Security Score: {securityScore}/100
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="w-full bg-muted rounded-full h-2.5">
            <div 
              className={`h-2.5 rounded-full ${
                securityScore > 80 ? 'bg-green-500' : 
                securityScore > 60 ? 'bg-blue-500' : 
                securityScore > 40 ? 'bg-yellow-500' : 'bg-red-500'
              }`} 
              style={{ width: `${securityScore}%` }}
            ></div>
          </div>
          <p className="text-sm text-muted-foreground mt-4">{message}</p>
          
          {rlsMessage && (
            <div className="mt-3 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-sm text-red-700 dark:text-red-300">
              <div className="flex">
                <AlertCircle className="h-4 w-4 mr-2 flex-shrink-0 mt-0.5 text-red-500" />
                <span>{rlsMessage}</span>
              </div>
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter>
        {(hasCriticalIssues || hasMediumIssues || hasLowIssues) && (
          <Button
            className="w-full bg-gradient-to-r from-primary to-primary/80 hover:to-primary text-white"
            onClick={onSignup}
          >
            <Shield className="mr-2 h-4 w-4" />
            Upgrade Now
          </Button>
        )}
      </CardFooter>
    </Card>
  );
};

// Add import for TurnstileWidget and useRef
import TurnstileWidget from "@/app/components/TurnstileWidget"

export default function Hero() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<any>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  // Add state for the turnstile token
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  // Add ref for turnstile widget ID
  const turnstileWidgetId = useRef<string | null>(null);

  const handleScan = async () => {
    if (!url) return;
    
    // Check for turnstile token
    if (!turnstileToken) {
      setScanError('Please complete the security verification');
      setScanResult({ error: 'Please complete the security verification' });
      return;
    }

    setIsScanning(true);
    setScanResult(null);
    setScanError(null);

    try {
      // Include the turnstile token in the request
      const response = await axios.post('/api/free-scan', { 
        url,
        turnstileToken 
      });
      setScanResult(response.data);
      // Reset the turnstile after successful scan
      if (typeof window !== 'undefined' && window.turnstile && turnstileWidgetId.current) {
        window.turnstile.reset(turnstileWidgetId.current);
      }
      setTurnstileToken(null);
    } catch (error: any) {
      console.error('Scan error:', error);
      setScanError(error.response?.data?.error || 'Failed to scan website');
      setScanResult({ error: error.response?.data?.error || 'Failed to scan website' });
      // Reset the turnstile on error too
      if (typeof window !== 'undefined' && window.turnstile && turnstileWidgetId.current) {
        window.turnstile.reset(turnstileWidgetId.current);
      }
      setTurnstileToken(null);
    } finally {
      setIsScanning(false);
    }
  };

  // Add handler for turnstile success with widget ID
  const handleTurnstileSuccess = (token: string, widgetId?: string) => {
    setTurnstileToken(token);
    if (widgetId) {
      turnstileWidgetId.current = widgetId;
    }
    if (scanError === 'Please complete the security verification') {
      setScanError(null);
      setScanResult(null);
    }
  };

  const handleSignup = () => {
    router.push('/signup');
  };

  return (
    <div className="relative isolate overflow-hidden bg-background">
      <div className="mx-auto max-w-7xl px-6 py-20 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-10 items-center">
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
              <span className="text-gradient">Save Money, Secure Your Website</span>
            </motion.h1>
            <motion.p
              className="mt-6 text-base sm:text-lg leading-7 sm:leading-8 text-muted-foreground mx-auto sm:mx-0"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              Do you use Cursor, Windsurf, Claude, ChatGPT, Grok to code? Then you need to scan your website for security issues to see if your website has vulnerabilities that can lose you big money or loyal customers.
            </motion.p>
            
            {/* CTA Button */}
            <motion.div
              className="mt-6 sm:mt-8 flex justify-center sm:justify-start"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
            >
              <Button 
                onClick={() => router.push('/signup')}
                variant="default"
                size="lg"
                className="rounded-full"
              >
                Get Secured Now
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </motion.div>
            
            {/* Free Security Scan */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="mt-8 w-full"
            >
              {/* Commented out free scanner section
              <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
                <h3 className="text-lg font-semibold mb-3 flex items-center">
                  <Shield className="mr-2 h-5 w-5 text-primary" />
                  Free Security Scanner (Beta)
                </h3>
                <div className="flex gap-2 mb-2">
                  <Input
                    placeholder="Enter your website URL (e.g., example.com)"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    className="flex-1"
                    disabled={isScanning}
                  />
                  <Button 
                    onClick={handleScan} 
                    disabled={!url || isScanning || !turnstileToken}
                    className="bg-primary text-white hover:bg-primary/90"
                  >
                    {isScanning ? (
                      <>
                        <div className="animate-spin mr-2 h-4 w-4 border-2 border-background border-b-transparent rounded-full"></div>
                        Scanning
                      </>
                    ) : (
                      <>Scan</>
                    )}
                  </Button>
                </div>
                
                <div className="my-4 flex justify-center">
                  <TurnstileWidget 
                    siteKey={process.env.NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY || ''}
                    onSuccess={handleTurnstileSuccess}
                    theme="auto"
                  />
                </div>

                <p className="text-xs text-muted-foreground">
                  Our free scanner checks for vulnerabilities without revealing details. 
                  Signup and Upgrade to complete results and fixes.
                </p>
                
                <ScanResultCard
                  result={scanResult}
                  isLoading={isScanning}
                  onSignup={handleSignup}
                />
              </div>
              */}
              
              {/* Glowing Orb */}
              <div className="flex justify-center sm:justify-start mt-4">
                <div className="flex items-center">
                  <div className="relative" style={{ width: '50px' }}>
                    <style jsx>{`
                      @keyframes pulse {
                        0% { box-shadow: 0 0 8px 2px #c1121f, inset 0 0 8px 2px #c1121f; }
                        50% { box-shadow: 0 0 12px 4px #c1121f, inset 0 0 10px 3px #c1121f; }
                        100% { box-shadow: 0 0 8px 2px #c1121f, inset 0 0 8px 2px #c1121f; }
                      }
                      .glowing-orb {
                        background-color: transparent;
                        width: 50px;
                        height: 50px;
                        border-radius: 25px;
                        box-shadow: 0 0 8px 2px #c1121f, inset 0 0 8px 2px #c1121f;
                        animation: pulse 2s linear infinite;
                      }
                    `}</style>
                    <div className="glowing-orb flex items-center justify-center">
                      <p className="text-[#c1121f] font-black text-xl" style={{ textShadow: '0 0 4px #c1121f' }}>4</p>
                    </div>
                  </div>
                  <div className="flex items-center ml-3">
                    <p className="text-muted-foreground text-xs max-w-[200px]">
                      websites in indie community currently have critical security vulnerabilities
                    </p>
                    <div className="relative inline-block ml-1.5 group">
                      <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-opacity duration-200 w-48 p-2 bg-popover text-popover-foreground text-xs rounded shadow-md border border-border z-10">
                        Our service actively scans different websites of the community for vulnerabilities, it might be your site or not!
                        <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
                          <div className="border-t border-l border-border size-2 bg-popover rotate-45"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
            </motion.div>
          </motion.div>
          
          {/* Right Column - Security Visualization */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.6 }}
          >
            <div className="w-full max-w-lg mx-auto">
              <img 
                src="/design/hero-secureviber.png"
                alt="SecureVibing Scanner"
                className="w-full h-auto rounded-2xl shadow-lg"
              />
            </div>
          </motion.div>
        </div>
        
        {/* Twitter Posts Marquee */}
        <TwitterPostMarquee />
      </div>
    </div>
  )
}

