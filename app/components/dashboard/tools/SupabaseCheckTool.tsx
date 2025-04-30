"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Loader2, Shield, ShieldCheck, Copy, ExternalLink, Database, Check, Key } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useDashboard } from "../DashboardProvider"
import PaywallModal from "../PaywallModal"

export default function SupabaseCheckTool() {
  const [url, setUrl] = useState("")
  const [generatedScriptId, setGeneratedScriptId] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [verificationStatus, setVerificationStatus] = useState<'idle' | 'pending' | 'verified' | 'failed'>('idle')
  const [verificationResults, setVerificationResults] = useState<any>(null)
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null)
  const [activeTab, setActiveTab] = useState("generate")
  const [userProfile, setUserProfile] = useState<any>(null)
  const [isPaywallOpen, setIsPaywallOpen] = useState(false)
  const [isLoadingProfile, setIsLoadingProfile] = useState(true)
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

  // Generate a unique script ID for the user
  const generateUniqueScriptId = async () => {
    // Simple random ID generation - in production you might want something more robust
    const randomId = `supacheck_${Math.random().toString(36).substring(2, 15)}_${Date.now().toString(36)}`;
    return randomId;
  }

  // Generate the script tag that users will install
  const generateScriptTag = (scriptId: string) => {
    const scriptUrl = `${window.location.origin}/api/supacheck/script/${scriptId}`;
    return `<script src="${scriptUrl}" id="${scriptId}" async></script>`;
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
      
      // Generate a unique script ID
      const scriptId = await generateUniqueScriptId();
      
      // In a real implementation, you would save this script ID and URL association to your database
      // For example:
      // await supabase.from('supacheck_scripts').insert({
      //   user_id: user.id,
      //   script_id: scriptId,
      //   url: processedUrl,
      //   created_at: new Date()
      // });
      
      setGeneratedScriptId(scriptId);
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
    if (!generatedScriptId) return;
    
    const scriptTag = generateScriptTag(generatedScriptId);
    navigator.clipboard.writeText(scriptTag);
    
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // Handle URL input change
  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const cleanedUrl = cleanUrl(e.target.value);
    setUrl(cleanedUrl);
  }

  // Add polling logic to check verification status
  useEffect(() => {
    // Only start polling if we've generated a script ID
    if (generatedScriptId && activeTab === "install") {
      setVerificationStatus('pending');
      
      // Start polling for verification status
      const interval = setInterval(async () => {
        try {
          const response = await fetch(`/api/supacheck/verify?scriptId=${generatedScriptId}`);
          const data = await response.json();
          
          if (data.status === 'verified') {
            setVerificationStatus('verified');
            setVerificationResults(data.results);
            clearInterval(interval);
            setPollingInterval(null);
            
            // Move to the results tab
            setActiveTab('verify');
          }
        } catch (error) {
          console.error('Error checking verification status:', error);
        }
      }, 5000); // Check every 5 seconds
      
      setPollingInterval(interval);
      
      // Clean up interval when component unmounts or when tab changes
      return () => {
        clearInterval(interval);
        setPollingInterval(null);
      };
    }
  }, [generatedScriptId, activeTab]);

  // Clear polling when leaving the component
  useEffect(() => {
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, [pollingInterval]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Supabase Security Checker</CardTitle>
          <CardDescription>
            Verify ownership of your website and analyze its Supabase configuration for security vulnerabilities.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="generate">Generate Script</TabsTrigger>
              <TabsTrigger value="install" disabled={!generatedScriptId}>Install</TabsTrigger>
              <TabsTrigger value="verify" disabled={!generatedScriptId || verificationStatus !== 'verified'}>Results</TabsTrigger>
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
                    <li>Once verified, our tool will display a small widget on your site's left side</li>
                    <li>The widget will scan your site for Supabase security issues</li>
                    <li>View detailed results and fix recommendations</li>
                  </ol>
                </AlertDescription>
              </Alert>
            </TabsContent>
            
            <TabsContent value="install" className="space-y-4 mt-4">
              {generatedScriptId && (
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
                      {generateScriptTag(generatedScriptId)}
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
                    <AlertTitle>Next Steps</AlertTitle>
                    <AlertDescription>
                      <ol className="list-decimal ml-5 mt-2 space-y-2 text-sm">
                        <li>Add the script to your website's HTML</li>
                        <li>Visit your website to activate the verification</li>
                        <li>The verification process will start automatically</li>
                        <li>A small widget will appear on the left side of your page</li>
                        <li>Return here after verification to see detailed results</li>
                      </ol>
                    </AlertDescription>
                  </Alert>
                  
                  {/* Add verification status indicator */}
                  {verificationStatus === 'pending' && (
                    <Alert className="bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800">
                      <Loader2 className="h-4 w-4 text-amber-600 dark:text-amber-400 animate-spin" />
                      <AlertTitle className="text-amber-800 dark:text-amber-400">Waiting for Verification</AlertTitle>
                      <AlertDescription className="text-amber-700 dark:text-amber-300">
                        Please add the script to your website and interact with the widget. We're checking for verification every 5 seconds.
                      </AlertDescription>
                    </Alert>
                  )}
                  
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
              )}
            </TabsContent>
            
            <TabsContent value="verify" className="space-y-4 mt-4">
              {/* This tab will show results after verification is complete */}
              <Alert className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
                <ShieldCheck className="h-4 w-4 text-green-600 dark:text-green-400" />
                <AlertTitle className="text-green-800 dark:text-green-400">Website Verified</AlertTitle>
                <AlertDescription className="text-green-700 dark:text-green-300">
                  Your website has been successfully verified. View the Supabase security scan results below.
                </AlertDescription>
              </Alert>
              
              {/* Display actual scan results */}
              <Card>
                <CardHeader>
                  <CardTitle>Supabase Security Results</CardTitle>
                  <CardDescription>
                    The widget is now active on your website and continuously monitoring Supabase security.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {verificationResults ? (
                    <div className="space-y-6">
                      {/* Supabase Detection Result */}
                      <div className="p-4 rounded-lg border bg-card">
                        <h3 className="text-lg font-semibold mb-2 flex items-center">
                          <Database className="h-5 w-5 mr-2 text-primary" />
                          Detection Results
                        </h3>
                        
                        <div className="space-y-3">
                          <div className="flex items-center text-sm">
                            <div className={`h-2 w-2 rounded-full mr-2 ${
                              verificationResults.supabaseDetected ? 'bg-green-500' : 'bg-amber-500'
                            }`} />
                            <span className="font-medium">
                              {verificationResults.supabaseDetected 
                                ? 'Supabase configuration detected' 
                                : 'No Supabase configuration automatically detected'}
                            </span>
                          </div>
                          
                          {verificationResults.matchedUrls && verificationResults.matchedUrls.length > 0 && (
                            <div className="mt-2 border-t pt-2">
                              <p className="text-sm font-medium mb-1">Detected Supabase URLs:</p>
                              <ul className="list-disc pl-5 text-sm space-y-1 text-muted-foreground">
                                {verificationResults.matchedUrls.map((url: string, index: number) => (
                                  <li key={index}>{url}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                          
                          {/* Manual Confirmation Section */}
                          {!verificationResults.supabaseDetected && (
                            <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-md border border-amber-200 dark:border-amber-800">
                              <h4 className="text-sm font-medium text-amber-800 dark:text-amber-300 mb-1">
                                Manual Confirmation Required
                              </h4>
                              <p className="text-xs text-amber-700 dark:text-amber-400 mb-2">
                                You mentioned Supabase is used on this page but our automatic detection couldn't find it. This could be because:
                              </p>
                              <ul className="list-disc pl-4 text-xs space-y-1 text-amber-700 dark:text-amber-400">
                                <li>The Supabase client is initialized in a way we couldn't detect</li>
                                <li>The Supabase URL is dynamically loaded or obfuscated</li>
                                <li>The Supabase connection happens only on the server side</li>
                              </ul>
                              
                              <div className="mt-3">
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  className="text-xs border-amber-300 text-amber-700 hover:bg-amber-100"
                                  onClick={() => {
                                    // Update the results to manually confirm Supabase usage
                                    setVerificationResults({
                                      ...verificationResults,
                                      supabaseDetected: true,
                                      manuallyConfirmed: true
                                    });
                                  }}
                                >
                                  Confirm Supabase Usage
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Security Recommendations */}
                      {(verificationResults.supabaseDetected || verificationResults.manuallyConfirmed) && (
                        <div className="p-4 rounded-lg border bg-card">
                          <h3 className="text-lg font-semibold mb-2 flex items-center">
                            <Shield className="h-5 w-5 mr-2 text-primary" />
                            Security Recommendations
                          </h3>
                          
                          <div className="space-y-4">
                            {/* RLS Recommendation */}
                            <div className="p-3 bg-blue-50 dark:bg-blue-900/10 rounded-md">
                              <h4 className="text-sm font-medium text-blue-800 dark:text-blue-300 flex items-center">
                                <ShieldCheck className="h-4 w-4 mr-1.5 text-blue-500" />
                                Enable Row Level Security (RLS)
                              </h4>
                              <p className="text-xs text-blue-700 dark:text-blue-400 mt-1">
                                Ensure Row Level Security is enabled for all tables accessed through client-side code. 
                                RLS is Supabase's primary security mechanism for controlling data access.
                              </p>
                            </div>
                            
                            {/* Anonymous Key Recommendation */}
                            <div className="p-3 bg-amber-50 dark:bg-amber-900/10 rounded-md">
                              <h4 className="text-sm font-medium text-amber-800 dark:text-amber-300 flex items-center">
                                <Key className="h-4 w-4 mr-1.5 text-amber-500" />
                                Protect API Keys
                              </h4>
                              <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
                                While anonymous keys are designed for client-side use, ensure they only have the 
                                minimum permissions needed. Never expose service role keys in frontend code.
                              </p>
                            </div>
                            
                            {/* Additional Resources */}
                            <div className="mt-2">
                              <h4 className="text-sm font-medium mb-2">Additional Resources:</h4>
                              <ul className="list-disc pl-5 text-xs space-y-1.5 text-muted-foreground">
                                <li>
                                  <a 
                                    href="https://supabase.com/docs/guides/auth/row-level-security" 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-primary hover:underline flex items-center"
                                  >
                                    Supabase RLS Documentation
                                    <ExternalLink className="h-3 w-3 ml-1" />
                                  </a>
                                </li>
                                <li>
                                  <a 
                                    href="https://supabase.com/docs/guides/auth/auth-helpers" 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-primary hover:underline flex items-center"
                                  >
                                    Supabase Auth Helpers
                                    <ExternalLink className="h-3 w-3 ml-1" />
                                  </a>
                                </li>
                              </ul>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-8">
                      <Loader2 className="h-8 w-8 text-primary animate-spin mb-4" />
                      <p className="text-muted-foreground text-center">
                        Loading verification results...
                      </p>
                    </div>
                  )}
                  
                  <div className="mt-4">
                    <Button 
                      onClick={() => window.open(`https://${url}`, '_blank')}
                      className="gap-2"
                    >
                      View Active Widget <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      
      {/* Paywall Modal */}
      <PaywallModal
        isOpen={isPaywallOpen}
        onClose={() => setIsPaywallOpen(false)}
        onUpgrade={handleUpgrade}
      />
    </div>
  )
} 