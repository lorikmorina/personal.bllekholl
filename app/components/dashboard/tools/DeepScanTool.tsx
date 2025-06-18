"use client"

import { useState, useEffect, useRef } from "react"
import { motion } from "framer-motion"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"
import { Loader2, Zap, Info, SearchCheck, ListChecks, FileText, Clock, CheckCircle, Target, Download, CreditCard, AlertCircle, Key } from "lucide-react"
import { useDashboard } from "../DashboardProvider"
import { createClient } from "@/lib/supabase/client"
import { Badge } from "@/components/ui/badge"
import Script from "next/script"
import { useToast } from "@/hooks/use-toast"

declare global {
  interface Window {
    Paddle: any;
  }
}

// Helper function to clean URL
const cleanUrl = (input: string): string => {
  let cleaned = input.trim();
  if (cleaned.startsWith('@')) {
    cleaned = cleaned.substring(1);
  }
  cleaned = cleaned.replace(/^https?:\/\//i, '');
  if (cleaned.includes('/')) {
    cleaned = cleaned.split('/')[0];
  }
  cleaned = cleaned.trim();
  return cleaned;
};

// Helper function to validate and format URL
const validateAndFormatUrl = (input: string): { valid: boolean; formattedUrl: string; errorMessage?: string } => {
  if (!input || input.trim() === '') {
    return { valid: false, formattedUrl: '', errorMessage: 'Please enter a website URL' };
  }
  let url = input.trim();
  const urlForValidation = url.split('/')[0];
  const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?)+$/;

  if (!domainRegex.test(urlForValidation)) {
    if (/^[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]$/.test(urlForValidation)) {
      const suggestedUrl = `${url}.com`;
      return { valid: true, formattedUrl: suggestedUrl, errorMessage: `Did you mean ${suggestedUrl}?` };
    } else if (urlForValidation.includes('.')) {
      if (urlForValidation.endsWith('.')) {
        const suggestedUrl = `${url}com`;
        return { valid: true, formattedUrl: suggestedUrl, errorMessage: `Did you mean ${suggestedUrl}?` };
      }
      const parts = urlForValidation.split('.');
      if (parts.length >= 2 && parts[parts.length - 1].length < 2) {
        const suggestedUrl = `${url}com`;
        return { valid: true, formattedUrl: suggestedUrl, errorMessage: `Did you mean ${suggestedUrl}?` };
      }
    }
    return { valid: false, formattedUrl: url, errorMessage: 'Please enter a valid website domain (e.g., example.com)' };
  }
  if (url.startsWith('www.')) {
    return { valid: true, formattedUrl: url };
  }
  return { valid: true, formattedUrl: url };
};

interface DeepScanRequest {
  id: string;
  created_at: string;
  url: string;
  domain: string;
  jwt_token?: string;
  status: 'pending_payment' | 'processing' | 'completed' | 'failed';
  payment_status: 'pending' | 'completed' | 'failed';
  user_email: string;
  paddle_transaction_id?: string;
  scan_results?: any;
  pdf_url?: string;
  completed_at?: string;
  error_message?: string;
}

export default function DeepScanTool() {
  const [deepScanUrl, setDeepScanUrl] = useState("")
  const [jwtToken, setJwtToken] = useState("")
  const [isDeepScanLoading, setIsDeepScanLoading] = useState(false)
  const [deepScanMessage, setDeepScanMessage] = useState<{type: 'success' | 'error'; text: string} | null>(null)
  const [deepScanUrlValidation, setDeepScanUrlValidation] = useState<{valid: boolean; message?: string} | null>(null)
  const [paddleLoaded, setPaddleLoaded] = useState(false)
  
  const [userRequests, setUserRequests] = useState<DeepScanRequest[]>([])
  const [isLoadingRequests, setIsLoadingRequests] = useState(true)

  const { user } = useDashboard()
  const supabase = createClient()
  const { toast } = useToast()
  
  // State to track if this component initiated the checkout
  const checkoutInitiated = useRef(false);
  const userRef = useRef<any>(null);

  // Initialize Paddle and set up event listener
  useEffect(() => {
    if (window.Paddle && !paddleLoaded) {
      // Set environment if in sandbox mode
      if (process.env.NEXT_PUBLIC_PADDLE_SANDBOX_MODE === 'true') {
        window.Paddle.Environment.set("sandbox");
      }
      
      // Initialize Paddle with client-side token AND event callback
      window.Paddle.Initialize({ 
        token: process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN,
        eventCallback: async (eventData: any) => {
          console.log('Paddle Event: ', eventData);
          
          // Check if checkout was completed AND initiated by this component
          if (eventData.name === "checkout.completed" && checkoutInitiated.current) {
            console.log("Checkout completed event received for Deep Scan", eventData);
            
            try {
              // Show success toast
              toast({
                title: "Payment Successful!",
                description: "Your deep security scan is now processing. You'll receive results shortly.",
                duration: 5000,
              });
              
              // Reset form
              setDeepScanUrl("")
              setJwtToken("")
              setDeepScanMessage({ type: 'success', text: "Payment completed! Your scan is now processing." });
              
              // Refresh user requests
              await fetchUserRequests();

            } catch (error) {
              console.error("Error processing checkout.completed event:", error);
              toast({
                title: "Payment Processed",
                description: "Your payment went through, but there was an issue updating the view. Please refresh the page.",
                variant: "destructive",
                duration: 5000,
              });
            } finally {
              checkoutInitiated.current = false;
              userRef.current = null;
              setIsDeepScanLoading(false);
            }
          }
        }
      });
      
      setPaddleLoaded(true);
    }

    return () => {
      checkoutInitiated.current = false;
      userRef.current = null;
    };
  }, [paddleLoaded, supabase, toast]);

  // Fetch user's deep scan requests
  const fetchUserRequests = async () => {
    if (!user) {
      setIsLoadingRequests(false);
      setUserRequests([]);
      return;
    }
    setIsLoadingRequests(true);
    try {
      const { data, error } = await supabase
        .from('deep_scan_requests')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUserRequests(data || []);
    } catch (error: any) {
      console.error("Error fetching user's deep scan requests:", error);
      setDeepScanMessage({ type: 'error', text: "Could not load your past requests." });
      setUserRequests([]);
    } finally {
      setIsLoadingRequests(false);
    }
  };

  useEffect(() => {
    fetchUserRequests();
  }, [user]);

  const handleDeepScanUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const cleanedUrl = cleanUrl(e.target.value);
    setDeepScanUrl(cleanedUrl);
    setDeepScanMessage(null); 

    if (!cleanedUrl) {
      setDeepScanUrlValidation(null);
      return;
    }

    const { valid, formattedUrl, errorMessage } = validateAndFormatUrl(cleanedUrl);

    if (!valid) {
      setDeepScanUrlValidation({ valid: false, message: errorMessage });
    } else if (formattedUrl !== cleanedUrl) {
      setDeepScanUrlValidation({
        valid: true,
        message: `Will scan: ${formattedUrl}`
      });
    } else {
      setDeepScanUrlValidation({ valid: true });
    }
  };

  const getDeepScanPriceId = () => {
    return process.env.NEXT_PUBLIC_PADDLE_DEEP_SCAN_PRICE_ID;
  };

  const handleDeepScanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setDeepScanMessage(null);

    if (!user || !user.email) {
      setDeepScanMessage({ type: 'error', text: "You must be logged in to request a deep scan." });
      return;
    }

    if (!paddleLoaded) {
      setDeepScanMessage({ type: 'error', text: "Payment system is loading. Please try again in a moment." });
      return;
    }

    const deepScanPriceId = getDeepScanPriceId();
    if (!deepScanPriceId) {
      setDeepScanMessage({ type: 'error', text: "Deep scan pricing not configured. Please contact support." });
      return;
    }

    const validation = validateAndFormatUrl(deepScanUrl);
    if (!validation.valid) {
      setDeepScanMessage({ type: 'error', text: validation.errorMessage || "Invalid domain format for Deep Scan." });
      return;
    }
    const finalUrl = validation.formattedUrl;
    
    // Add https:// if not present
    const fullUrl = finalUrl.startsWith('http') ? finalUrl : `https://${finalUrl}`;

    setIsDeepScanLoading(true);
    checkoutInitiated.current = false;
    userRef.current = null;

    try {
      // Step 1: Save the request to Supabase FIRST
      const { data: insertedRequest, error: insertError } = await supabase
        .from('deep_scan_requests')
        .insert({
          user_id: user.id,
          user_email: user.email,
          url: fullUrl,
          jwt_token: jwtToken.trim() || null,
          status: 'pending_payment',
          payment_status: 'pending'
        })
        .select()
        .single();

      if (insertError) {
        throw insertError;
      }
      
      const requestId = insertedRequest.id;
      userRef.current = user;
      checkoutInitiated.current = true;

      // Step 2: Open Paddle checkout overlay
      window.Paddle.Checkout.open({
        items: [
          {
            priceId: deepScanPriceId,
            quantity: 1
          }
        ],
        customer: {
          email: user.email
        },
        customData: {
          deep_scan_request_id: requestId,
          userId: user.id,
          _afficoneRef: (window as any).Afficone?.referral
        },
        closeCallback: () => {
          if (checkoutInitiated.current) { 
            console.log("Paddle checkout closed manually before completion.");
            checkoutInitiated.current = false;
            userRef.current = null;
            setIsDeepScanLoading(false);
          }
        }
      });

    } catch (error: any) {
      console.error('Error during deep scan submission process:', error);
      setDeepScanMessage({ type: 'error', text: `An error occurred: ${error.message}` });
      checkoutInitiated.current = false;
      userRef.current = null;
      setIsDeepScanLoading(false);
    }
  };

  // Function to get status badge
  const getStatusBadge = (request: DeepScanRequest) => {
    if (request.payment_status === 'pending') {
      return <Badge variant="outline" className="text-yellow-600 border-yellow-600">Payment Pending</Badge>;
    }
    
    switch (request.status) {
      case 'pending_payment':
        return <Badge variant="outline" className="text-yellow-600 border-yellow-600">Payment Pending</Badge>;
      case 'processing':
        return <Badge variant="outline" className="text-blue-600 border-blue-600">Processing</Badge>;
      case 'completed':
        return <Badge variant="outline" className="text-green-600 border-green-600">Completed</Badge>;
      case 'failed':
        return <Badge variant="outline" className="text-red-600 border-red-600">Failed</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  // Function to get available actions for each request
  const getRequestActions = (request: DeepScanRequest) => {
    if (request.status === 'completed' && request.pdf_url) {
      return (
        <Button size="sm" asChild>
          <a href={request.pdf_url} download>
            <Download className="w-4 h-4 mr-1" />
            Download Report
          </a>
        </Button>
      );
    }
    
    if (request.payment_status === 'pending' || request.status === 'pending_payment') {
      const deepScanPriceId = getDeepScanPriceId();
      
      return (
        <Button 
          size="sm" 
          variant="outline"
          onClick={() => {
            if (!paddleLoaded) {
              toast({
                title: "Payment system loading",
                description: "Please wait a moment and try again.",
                variant: "destructive",
              });
              return;
            }
            
            if (!deepScanPriceId) {
              toast({
                title: "Configuration Error",
                description: "Deep scan pricing not configured. Please contact support.",
                variant: "destructive",
              });
              return;
            }
            
            // Open Paddle checkout for existing request
            window.Paddle.Checkout.open({
              items: [
                {
                  priceId: deepScanPriceId,
                  quantity: 1
                }
              ],
              customer: {
                email: user?.email
              },
              customData: {
                deep_scan_request_id: request.id,
                userId: user?.id,
                _afficoneRef: (window as any).Afficone?.referral
              }
            });
          }}
        >
          <CreditCard className="w-4 h-4 mr-1" />
          Complete Payment
        </Button>
      );
    }
    
    return null;
  };

  return (
    <>
      {/* Load Paddle JS SDK */}
      <Script
        src="https://cdn.paddle.com/paddle/v2/paddle.js"
        strategy="lazyOnload"
      />
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="space-y-6"
      >
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl flex items-center">
              <SearchCheck className="mr-2 h-6 w-6 text-primary" />
              Deep Security Scan
            </CardTitle>
            <CardDescription className="pt-1">
              Comprehensive automated security analysis of your website. Get detailed insights about vulnerabilities, API exposures, and security misconfigurations.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Enhanced informational list */}
            <div className="mb-6 space-y-4 text-sm">
              <h3 className="text-lg font-semibold text-foreground mb-3">What You Get:</h3>
              <ul className="space-y-3">
                <li className="flex items-start">
                  <CheckCircle className="w-5 h-5 mr-3 mt-0.5 text-green-500 flex-shrink-0" />
                  <div>
                    <span className="font-semibold text-foreground">Comprehensive Analysis:</span> Advanced automated scanning for API keys, database misconfigurations, authentication bypasses, and security headers.
                  </div>
                </li>
                <li className="flex items-start">
                  <Target className="w-5 h-5 mr-3 mt-0.5 text-blue-500 flex-shrink-0" />
                  <div>
                    <span className="font-semibold text-foreground">JWT Token Testing:</span> Optional authenticated scanning with your JWT token to test user-specific endpoints and permissions.
                  </div>
                </li>
                <li className="flex items-start">
                  <FileText className="w-5 h-5 mr-3 mt-0.5 text-purple-500 flex-shrink-0" />
                  <div>
                    <span className="font-semibold text-foreground">Detailed Reporting:</span> Receive a comprehensive security report with findings, risk levels, and actionable remediation recommendations.
                  </div>
                </li>
                <li className="flex items-start">
                  <Zap className="w-5 h-5 mr-3 mt-0.5 text-yellow-500 flex-shrink-0" />
                  <div>
                    <span className="font-semibold text-foreground">Fast Results:</span> Automated analysis typically completes within minutes, with results available in your dashboard.
                  </div>
                </li>
              </ul>
            </div>

            <form onSubmit={handleDeepScanSubmit} className="space-y-4">
              <div>
                <label htmlFor="deepScanUrl" className="block text-sm font-medium text-foreground mb-1">
                  Website URL
                </label>
                <div className={`flex flex-1 rounded-md overflow-hidden border ${
                  deepScanUrlValidation?.valid === false 
                    ? 'border-red-400 dark:border-red-700' 
                    : deepScanUrlValidation?.valid === true 
                      ? 'border-green-400 dark:border-green-700' 
                      : 'border-input'
                }`}>
                  <div className="flex items-center bg-muted px-3 text-muted-foreground font-medium border-r border-input">
                    https://
                  </div>
                  <Input
                    type="text"
                    id="deepScanUrl"
                    placeholder="example.com"
                    value={deepScanUrl}
                    onChange={handleDeepScanUrlChange}
                    required
                    className="flex-1 border-none rounded-none focus-visible:ring-0 focus-visible:ring-offset-0"
                  />
                </div>
                {deepScanUrlValidation && (
                  <div className={`text-xs mt-1 ${
                    deepScanUrlValidation.valid 
                      ? 'text-green-600 dark:text-green-400' 
                      : 'text-red-600 dark:text-red-400'
                  }`}>
                    {deepScanUrlValidation.message}
                  </div>
                )}
              </div>

              <div>
                <label htmlFor="jwtToken" className="block text-sm font-medium text-foreground mb-1">
                  JWT Token (Optional)
                </label>
                <div className="relative">
                  <Key className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="text"
                    id="jwtToken"
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                    value={jwtToken}
                    onChange={(e) => setJwtToken(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Provide a JWT token to test authenticated endpoints and user permissions (optional but recommended for logged-in user testing)
                </p>
              </div>

              <Alert className="bg-primary/5 border-primary/20">
                <Info className="h-4 w-4 text-primary" />
                <AlertTitle className="font-semibold text-primary">One-Time Payment: $4</AlertTitle>
                <AlertDescription>
                  This is a one-time payment for a comprehensive deep scan of the specified domain. 
                  Payment will be processed securely via Paddle.
                </AlertDescription>
              </Alert>

              {deepScanMessage && (
                <Alert variant={deepScanMessage.type === 'error' ? 'destructive' : 'default'} className={`${deepScanMessage.type === 'success' ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300' : ''}`}>
                  <AlertTitle>{deepScanMessage.type === 'success' ? 'Success' : 'Error'}</AlertTitle>
                  <AlertDescription>{deepScanMessage.text}</AlertDescription>
                </Alert>
              )}

              <Button 
                type="submit" 
                disabled={isDeepScanLoading || !user || deepScanUrlValidation?.valid === false || !paddleLoaded}
                className="w-full sm:w-auto"
              >
                {isDeepScanLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing Request...
                  </>
                ) : (
                  <>
                    <Zap className="mr-2 h-4 w-4" />
                    Request Deep Scan ($4)
                  </>
                )}
              </Button>
              {!user && (
                   <p className="text-xs text-red-600 dark:text-red-400 mt-2">Please log in to request a deep scan.</p>
              )}
            </form>
          </CardContent>
        </Card>

        {/* Your Deep Scan Requests Section */}
        {user && (
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl flex items-center">
                <ListChecks className="mr-2 h-6 w-6 text-primary" />
                Your Deep Scan Requests
              </CardTitle>
              <CardDescription>
                Track the status of your deep security scan requests and download completed reports.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingRequests ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="ml-3 text-muted-foreground">Loading your requests...</p>
                </div>
              ) : userRequests.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="mx-auto h-12 w-12 text-muted-foreground/50 mb-3" />
                  <p className="text-muted-foreground">You haven't made any deep scan requests yet.</p>
                </div>
              ) : (
                <ul className="space-y-4">
                  {userRequests.map((request) => (
                    <li key={request.id} className="p-4 border rounded-lg bg-card hover:shadow-md transition-shadow">
                      <div className="flex flex-col sm:flex-row justify-between sm:items-start mb-3">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-primary break-all mb-1">{request.url}</h3>
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            {getStatusBadge(request)}
                            {request.jwt_token && (
                              <Badge variant="secondary" className="text-xs">
                                <Key className="w-3 h-3 mr-1" />
                                JWT Provided
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 mt-2 sm:mt-0">
                          {getRequestActions(request)}
                        </div>
                      </div>
                      
                      <div className="text-sm text-muted-foreground space-y-1">
                        <div className="flex items-center">
                          <Clock className="w-4 h-4 mr-1.5 text-muted-foreground/70" />
                          Requested: {new Date(request.created_at).toLocaleDateString()} {new Date(request.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                        {request.completed_at && (
                          <div className="flex items-center">
                            <CheckCircle className="w-4 h-4 mr-1.5 text-green-500" />
                            Completed: {new Date(request.completed_at).toLocaleDateString()} {new Date(request.completed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        )}
                        {request.error_message && (
                          <div className="flex items-start">
                            <AlertCircle className="w-4 h-4 mr-1.5 text-red-500 mt-0.5 flex-shrink-0" />
                            <span className="text-red-600 dark:text-red-400 text-xs">{request.error_message}</span>
                          </div>
                        )}
                        {request.scan_results && request.scan_results.overall_score && (
                          <div className="flex items-center">
                            <Target className="w-4 h-4 mr-1.5 text-primary" />
                            Security Score: {request.scan_results.overall_score}/100
                          </div>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        )}
      </motion.div>
    </>
  )
}