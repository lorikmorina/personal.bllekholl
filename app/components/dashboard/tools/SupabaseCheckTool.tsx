"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Loader2, Shield, ShieldCheck, Copy, ExternalLink, Database, Check, Key, Network, Fingerprint } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useDashboard } from "../DashboardProvider"
import PaywallModal from "../PaywallModal"
import SupabaseNetworkMonitor from "./SupabaseNetworkMonitor"

export default function SupabaseCheckTool() {
  const [url, setUrl] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [activeTab, setActiveTab] = useState("generate")
  const [userProfile, setUserProfile] = useState<any>(null)
  const [isPaywallOpen, setIsPaywallOpen] = useState(false)
  const [isLoadingProfile, setIsLoadingProfile] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const { user } = useDashboard()
  const supabase = createClient()

  // Clean up URL by removing existing protocol and whitespace
  const cleanUrl = (input: string): string => {
    let cleaned = input.trim();
    
    // Remove http:// or https:// since we're displaying https:// in the UI
    cleaned = cleaned.replace(/^https?:\/\//i, '');
    
    // If the user pasted a URL with a path, extract just the domain
    if (cleaned.includes('/')) {
      cleaned = cleaned.split('/')[0];
    }
    
    // Remove any remaining whitespace
    cleaned = cleaned.trim();
    
    return cleaned;
  };

  // Validate and format URL
  const validateAndFormatUrl = (input: string): { valid: boolean; formattedUrl: string; errorMessage?: string } => {
    if (!input || input.trim() === '') {
      return { valid: false, formattedUrl: '', errorMessage: 'Please enter a website URL' };
    }

    let url = input.trim();
    
    // Remove any trailing slashes or paths for validation
    const urlForValidation = url.split('/')[0];
    
    // Check if URL has a valid domain format
    const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?)+$/;
    
    if (!domainRegex.test(urlForValidation)) {
      if (/^[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]$/.test(urlForValidation)) {
        const suggestedUrl = `${url}.com`;
        return { 
          valid: true, 
          formattedUrl: suggestedUrl,
          errorMessage: `Did you mean ${suggestedUrl}?` 
        };
      } 
      else if (urlForValidation.includes('.')) {
        if (urlForValidation.endsWith('.')) {
          const suggestedUrl = `${url}com`;
          return { 
            valid: true, 
            formattedUrl: suggestedUrl,
            errorMessage: `Did you mean ${suggestedUrl}?` 
          };
        }
        else if (urlForValidation.split('.').length >= 2 && urlForValidation.split('.')[urlForValidation.split('.').length - 1].length < 2) {
          const suggestedUrl = `${url}com`;
          return { 
            valid: true, 
            formattedUrl: suggestedUrl,
            errorMessage: `Did you mean ${suggestedUrl}?` 
          };
        }
      }
      
      return { 
        valid: false, 
        formattedUrl: url,
        errorMessage: 'Please enter a valid website domain (e.g., example.com)' 
      };
    }
    
    return { valid: true, formattedUrl: url };
  };

  // Generate the script tag that users will install
  const generateScriptTag = () => {
    // Simplified script tag that doesn't need an ID
    const scriptUrl = `${window.location.origin}/api/supacheck/script`;
    return `<script src="${scriptUrl}" async></script>`;
  }

  // Handle URL validation and script generation
  const handleGenerate = async () => {
    const { valid, formattedUrl, errorMessage } = validateAndFormatUrl(url);
    
    if (!valid) {
      setError(errorMessage || "Invalid URL format");
      return;
    }
    
    // Check if user is on free plan
    if (userProfile?.subscription_plan === 'free') {
      setIsPaywallOpen(true)
      return
    }
    
    setIsGenerating(true);
    setError(null);
    
    try {
      // Process URL to ensure it's properly formatted
      let processedUrl = formattedUrl;
      if (!processedUrl.startsWith('http://') && !processedUrl.startsWith('https://')) {
        processedUrl = `https://${processedUrl}`;
      }
      
      // No need to generate a unique script ID or save anything to the database
      setActiveTab("install");
      
    } catch (error: any) {
      setError(error.message || "Failed to generate script");
    } finally {
      setIsGenerating(false);
    }
  }

  // Handle upgrade for premium features
  const handleUpgrade = async (plan: string) => {
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

  // Copy script tag to clipboard
  const copyScriptToClipboard = () => {
    const scriptTag = generateScriptTag();
    navigator.clipboard.writeText(scriptTag);
    
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // Handle URL input change
  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const cleanedUrl = cleanUrl(e.target.value);
    setUrl(cleanedUrl);
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Supabase Security Inspector</CardTitle>
          <CardDescription>
            Add a script to your website to detect Supabase usage, monitor network requests, and identify potential security concerns.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="generate">Generate Script</TabsTrigger>
              <TabsTrigger value="install">Install &amp; Usage</TabsTrigger>
            </TabsList>
            
            <TabsContent value="generate" className="space-y-4 mt-4">
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  handleGenerate();
                }} 
                className="flex flex-col sm:flex-row gap-3"
              >
                <div className="flex flex-col flex-1">
                  <div className="flex flex-1 rounded-md overflow-hidden border border-input">
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
                </div>
                
                <Button 
                  type="submit" 
                  disabled={isGenerating || isLoadingProfile}
                  className="sm:w-auto w-full"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Key className="mr-2 h-4 w-4" />
                      Generate Script
                    </>
                  )}
                </Button>
              </form>
              
              {userProfile?.subscription_plan === 'free' && !isLoadingProfile && (
                <Alert className="mt-4 bg-primary/5 border-primary/20">
                  <Shield className="h-4 w-4" />
                  <AlertTitle>Free Plan Limitation</AlertTitle>
                  <AlertDescription>
                    Upgrade to unlock detailed Supabase security checks. Start a 7-day free trial on our monthly plan!
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
              
              <Alert className="bg-muted/50">
                <Database className="h-4 w-4" />
                <AlertTitle>How it works</AlertTitle>
                <AlertDescription>
                  <ol className="list-decimal ml-5 mt-2 space-y-1 text-sm">
                    <li>Enter your website URL and generate a verification script</li>
                    <li>Add the script to your website's HTML (preferably in the head section)</li>
                    <li>The script will automatically scan your site for Supabase usage</li>
                    <li>It monitors network requests to identify Supabase endpoints and authorization tokens</li>
                    <li>Captures and displays user information retrieved during page loads</li>
                    <li>Results appear in an interactive widget directly on your site</li>
                  </ol>
                </AlertDescription>
              </Alert>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
                <Card className="bg-muted/30">
                  <CardHeader className="py-3 px-4">
                    <CardTitle className="text-sm flex items-center">
                      <Fingerprint className="h-4 w-4 mr-2" />
                      Static Detection
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="py-2 px-4">
                    <p className="text-xs text-muted-foreground">
                      Scans your website's HTML and scripts for Supabase endpoints and API keys.
                    </p>
                  </CardContent>
                </Card>
                
                <Card className="bg-muted/30">
                  <CardHeader className="py-3 px-4">
                    <CardTitle className="text-sm flex items-center">
                      <Network className="h-4 w-4 mr-2" />
                      Network Monitoring
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="py-2 px-4">
                    <p className="text-xs text-muted-foreground">
                      Captures requests to Supabase endpoints, including authentication headers.
                    </p>
                  </CardContent>
                </Card>
                
                <Card className="bg-muted/30">
                  <CardHeader className="py-3 px-4">
                    <CardTitle className="text-sm flex items-center">
                      <User className="h-4 w-4 mr-2" />
                      User Data Analysis
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="py-2 px-4">
                    <p className="text-xs text-muted-foreground">
                      Extracts and visualizes user information retrieved from Supabase responses.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
            
            <TabsContent value="install" className="space-y-4 mt-4">
                <>
                  <Alert className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
                    <ShieldCheck className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    <AlertTitle className="text-blue-800 dark:text-blue-400">Script Generated Successfully</AlertTitle>
                    <AlertDescription className="text-blue-700 dark:text-blue-300">
                      Copy the script tag below and add it to your website's HTML. For best results, place it in the &lt;head&gt; section.
                    </AlertDescription>
                  </Alert>
                  
                  <div className="relative">
                    <pre className="p-4 bg-muted rounded-md overflow-x-auto text-sm font-mono">
                      {generateScriptTag()}
                    </pre>
                    <Button 
                      size="sm" 
                      variant="secondary" 
                      className="absolute top-2 right-2"
                      onClick={copyScriptToClipboard}
                    >
                      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      {copied ? "Copied!" : "Copy"}
                    </Button>
                  </div>
                  
                  <Alert>
                    <AlertTitle>Enhanced Security Inspector Features</AlertTitle>
                    <AlertDescription>
                      <p className="mb-2 text-sm">The security inspector provides three main functions:</p>
                      <ol className="list-decimal ml-5 space-y-2 text-sm">
                        <li>
                          <span className="font-medium">Static Detection:</span> Scans your website's code for Supabase-related scripts, endpoints, and API keys
                        </li>
                        <li>
                          <span className="font-medium">Network Monitoring:</span> Captures all requests to Supabase endpoints, including authentication tokens and headers
                        </li>
                        <li>
                          <span className="font-medium">User Data Analysis:</span> Shows what user information is being retrieved from Supabase when a page loads or during authentication
                        </li>
                      </ol>
                      <p className="mt-3 text-sm">
                        Once installed, refresh your website and interact with it as normal. The widget will appear in the bottom-right corner and expand with detailed information when clicked.
                      </p>
                    </AlertDescription>
                  </Alert>
                  
                  <div className="flex justify-between mt-6">
                    <Button variant="outline" onClick={() => setActiveTab("generate")}>
                      Back
                    </Button>
                    <Button 
                      onClick={() => window.open(`https://${url}`, '_blank')}
                      className="gap-2"
                    >
                      Visit Your Website <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                </>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      
      {/* Network Monitor Demo */}
      <SupabaseNetworkMonitor />
      
      {/* Paywall Modal */}
      <PaywallModal
        isOpen={isPaywallOpen}
        onClose={() => setIsPaywallOpen(false)}
        onUpgrade={handleUpgrade}
      />
    </div>
  )
} 