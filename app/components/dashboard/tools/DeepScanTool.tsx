"use client"

import { useState, useEffect, useRef } from "react"
import { motion } from "framer-motion"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"
import { Loader2, Zap, Info, SearchCheck, ListChecks, FileText, Clock, CheckCircle, Target, Download, CreditCard, AlertCircle, Shield, Database, AlertTriangle } from "lucide-react"
import { useDashboard } from "../DashboardProvider"
import { createClient } from "@/lib/supabase/client"
import { Badge } from "@/components/ui/badge"
import Script from "next/script"
import { useToast } from "@/hooks/use-toast"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"

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
  status: 'pending_payment' | 'processing' | 'completed' | 'failed' | 'ready';
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
  const [isDeepScanLoading, setIsDeepScanLoading] = useState(false)
  const [deepScanMessage, setDeepScanMessage] = useState<{type: 'success' | 'error'; text: string} | null>(null)
  const [deepScanUrlValidation, setDeepScanUrlValidation] = useState<{valid: boolean; message?: string} | null>(null)
  const [paddleLoaded, setPaddleLoaded] = useState(false)
  
  const [userRequests, setUserRequests] = useState<DeepScanRequest[]>([])
  const [isLoadingRequests, setIsLoadingRequests] = useState(true)
  const [selectedRequest, setSelectedRequest] = useState<DeepScanRequest | null>(null)
  const [showReportModal, setShowReportModal] = useState(false)

  const { user } = useDashboard()
  const supabase = createClient()
  const { toast } = useToast()
  
  // State to track if this component initiated the checkout
  const checkoutInitiated = useRef(false);
  const userRef = useRef<any>(null);

  // Initialize Paddle and set up event listener
  useEffect(() => {
    // Debug environment variables
    console.log('🔧 Paddle Environment Variables:');
    console.log('NEXT_PUBLIC_PADDLE_CLIENT_TOKEN:', !!process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN);
    console.log('NEXT_PUBLIC_PADDLE_DEEP_SCAN_PRICE_ID:', process.env.NEXT_PUBLIC_PADDLE_DEEP_SCAN_PRICE_ID);
    console.log('NEXT_PUBLIC_PADDLE_SANDBOX_MODE:', process.env.NEXT_PUBLIC_PADDLE_SANDBOX_MODE);
    
    const initializePaddle = () => {
      if (window.Paddle && !paddleLoaded) {
        try {
          console.log('Initializing Paddle...');
          
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
          
          console.log('Paddle initialized successfully');
          setPaddleLoaded(true);
        } catch (error) {
          console.error('Error initializing Paddle:', error);
        }
      }
    };

    // Try to initialize immediately if Paddle is available
    if (window.Paddle) {
      initializePaddle();
    } else {
      // If Paddle script isn't loaded yet, wait for it
      const checkPaddle = setInterval(() => {
        if (window.Paddle) {
          clearInterval(checkPaddle);
          initializePaddle();
        }
      }, 100);

      // Clean up interval after 10 seconds if Paddle never loads
      setTimeout(() => {
        clearInterval(checkPaddle);
        if (!paddleLoaded) {
          console.warn('Paddle script failed to load after 10 seconds');
        }
      }, 10000);
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

  // Cleanup effect to reset loading states when component unmounts
  useEffect(() => {
    return () => {
      setIsDeepScanLoading(false);
      checkoutInitiated.current = false;
      userRef.current = null;
    };
  }, []);

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

    console.log('🚀 Deep scan submit initiated');
    console.log('User:', !!user, 'Email:', user?.email);
    console.log('Paddle loaded:', paddleLoaded);
    console.log('Window.Paddle available:', !!window.Paddle);

    if (!user || !user.email) {
      setDeepScanMessage({ type: 'error', text: "You must be logged in to request a deep scan." });
      return;
    }

    if (!paddleLoaded || !window.Paddle) {
      setDeepScanMessage({ type: 'error', text: "Payment system is not ready. Please refresh the page and try again." });
      return;
    }

    const deepScanPriceId = getDeepScanPriceId();
    console.log('Deep scan price ID:', deepScanPriceId);
    
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
      console.log('💾 Saving request to database...');
      
      // Step 1: Save the request to Supabase FIRST
      const { data: insertedRequest, error: insertError } = await supabase
        .from('deep_scan_requests')
        .insert({
          user_id: user.id,
          user_email: user.email,
          url: fullUrl,
          domain: finalUrl,
          status: 'pending_payment',
          payment_status: 'pending'
        })
        .select()
        .single();

      if (insertError) {
        throw insertError;
      }
      
      const requestId = insertedRequest.id;
      console.log('✅ Request saved with ID:', requestId);
      
      userRef.current = user;
      checkoutInitiated.current = true;

      console.log('🎯 Opening Paddle checkout...');
      console.log('Checkout config:', {
        priceId: deepScanPriceId,
        email: user.email,
        requestId: requestId
      });

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
          console.log("🚪 Paddle checkout closed manually");
          if (checkoutInitiated.current) { 
            checkoutInitiated.current = false;
            userRef.current = null;
            setIsDeepScanLoading(false);
          }
        }
      });

      console.log('✅ Paddle checkout opened successfully');

    } catch (error: any) {
      console.error('❌ Error during deep scan submission process:', error);
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
      case 'ready':
        return <Badge variant="outline" className="text-green-600 border-green-600">Ready to Scan</Badge>;
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
    if (request.status === 'completed' && request.scan_results) {
      return (
        <div className="flex gap-2">
          <Button 
            size="sm" 
            onClick={() => {
              setSelectedRequest(request)
              setShowReportModal(true)
            }}
          >
            <FileText className="w-4 h-4 mr-1" />
            View Report
          </Button>
          {request.pdf_url && (
            <Button size="sm" variant="outline" asChild>
              <a href={request.pdf_url} download>
                <Download className="w-4 h-4 mr-1" />
                Download PDF
              </a>
            </Button>
          )}
        </div>
      );
    }
    
    // NEW: Start Scan button for ready requests
    if (request.status === 'ready' && request.payment_status === 'completed') {
      return (
        <Button 
          size="sm" 
          onClick={() => handleStartScan(request.id)}
          disabled={isDeepScanLoading}
        >
          {isDeepScanLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              Scanning...
            </>
          ) : (
            <>
              <Zap className="w-4 h-4 mr-1" />
              Start Scan
            </>
          )}
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

  // NEW: Function to handle manual scan start
  const handleStartScan = async (requestId: string) => {
    setIsDeepScanLoading(true);
    setDeepScanMessage(null);

    try {
      // Update status to processing with error handling
      console.log('🔄 Updating status to processing...');
      const { error: statusError } = await supabase
        .from('deep_scan_requests')
        .update({ status: 'processing' })
        .eq('id', requestId);

      if (statusError) {
        console.error('Error updating status to processing:', statusError);
        throw new Error(`Failed to update status: ${statusError.message}`);
      }

      // Get the request details
      const { data: scanRequest, error: fetchError } = await supabase
        .from('deep_scan_requests')
        .select('*')
        .eq('id', requestId)
        .single();

      if (fetchError || !scanRequest) {
        console.error('Error fetching scan request:', fetchError);
        throw new Error('Scan request not found');
      }

      console.log('🚀 Starting manual deep scan for:', scanRequest.url);

      // Step 1: Light Scan
      console.log('Step 1: Light scan analysis...');
      const lightScanResults = await performLightScan(scanRequest.url, requestId);
      
      // Step 2: Supabase Analysis
      console.log('Step 2: Supabase analysis...');
      const supabaseResults = await performSupabaseAnalysis(scanRequest.url, requestId);
      
      // Step 3: Subdomain Analysis
      console.log('Step 3: Subdomain analysis...');
      const subdomainResults = await performSubdomainAnalysis(scanRequest.url, requestId);
      
      // Step 4: Authenticated Analysis (if JWT provided)
      let authenticatedResults = null;

      // Combine all results
      const finalResults: any = {
        scan_metadata: {
          started_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
          url: scanRequest.url,
          scan_version: '3.0.0',
          scan_type: 'user_initiated'
        },
        security_headers: lightScanResults?.security_headers,
        api_keys_and_leaks: lightScanResults?.api_keys_and_leaks,
        supabase_analysis: supabaseResults,
        subdomain_analysis: subdomainResults,
        authenticated_analysis: authenticatedResults,
        overall_score: calculateOverallScore(lightScanResults, supabaseResults)
      };

      console.log('🤖 Generating AI security recommendations...');
      const aiRecommendations = await generateAIRecommendations(finalResults);
      if (aiRecommendations) {
        finalResults.ai_recommendations = aiRecommendations;
      }

      console.log('💾 Saving final results to database...');
      console.log('Final results object:', finalResults);

      // Update database with final results - with detailed error handling
      const { error: updateError } = await supabase
        .from('deep_scan_requests')
        .update({
          status: 'completed',
          scan_results: finalResults,
          completed_at: new Date().toISOString()
        })
        .eq('id', requestId);

      if (updateError) {
        console.error('❌ Database update error:', updateError);
        throw new Error(`Failed to save results: ${updateError.message}`);
      }

      console.log('✅ Results saved successfully!');

      // Refresh the requests list
      await fetchUserRequests();

      toast({
        title: "Scan Completed!",
        description: "Your deep security scan has finished successfully.",
      });

    } catch (error: any) {
      console.error('❌ Scan failed:', error);
      
      // Update status to failed with error handling
      const { error: failError } = await supabase
        .from('deep_scan_requests')
        .update({
          status: 'failed',
          error_message: error.message
        })
        .eq('id', requestId);

      if (failError) {
        console.error('Error updating failed status:', failError);
      }

      setDeepScanMessage({ 
        type: 'error', 
        text: `Scan failed: ${error.message}` 
      });
    } finally {
      setIsDeepScanLoading(false);
    }
  };

  // Helper functions for individual scans
  const performLightScan = async (url: string, requestId: string) => {
    const response = await fetch('/api/scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, deepScanRequest: true, deep_scan_request_id: requestId })
    });
    if (!response.ok) throw new Error('Light scan failed');
    return await response.json();
  };

  const performSupabaseAnalysis = async (url: string, requestId: string) => {
    try {
      const domain = new URL(url).hostname;
      const response = await fetch('/api/supabase-deep-scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain, deepScanRequest: true, deep_scan_request_id: requestId })
      });
      if (!response.ok) {
        const errorData = await response.json();
        if (errorData.error === 'credentials_not_found') {
          return { supabase_detected: false };
        }
        throw new Error('Supabase scan failed');
      }
      return await response.json();
    } catch (error) {
      return { error: 'Supabase analysis failed', supabase_detected: false };
    }
  };

  const performSubdomainAnalysis = async (url: string, requestId: string) => {
    try {
      const domain = new URL(url).hostname.replace(/^www\./, '');
      const response = await fetch('/api/subdomain-finder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain, deepScanRequest: true, deep_scan_request_id: requestId })
      });
      if (!response.ok) throw new Error('Subdomain scan failed');
      return await response.json();
    } catch (error) {
      return { error: 'Subdomain analysis failed', subdomains_found: [] };
    }
  };

  const calculateOverallScore = (lightScan: any, supabaseScan: any) => {
    // Simple scoring logic
    let score = 100;
    if (lightScan?.leaks?.length > 0) score -= lightScan.leaks.length * 10;
    if (supabaseScan?.summary?.publicTables > 0) score -= supabaseScan.summary.publicTables * 15;
    return Math.max(0, score);
  };

  // AI Analysis function
  const generateAIRecommendations = async (scanResults: any) => {
    try {
      const response = await fetch('/api/ai-security-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ scanResults }),
      });

      if (!response.ok) {
        throw new Error('AI analysis failed');
      }

      const data = await response.json();
      return data.recommendations;
    } catch (error) {
      console.error('Error generating AI recommendations:', error);
      return null;
    }
  };

  // Helper function to format and display scan results
  const formatScanResults = (results: any) => {
    if (!results) return "No scan results available";

    const {
      scan_metadata,
      security_headers,
      api_keys_and_leaks,
      supabase_analysis,
      subdomain_analysis,
      authenticated_analysis,
      overall_score,
      risk_summary,
      ai_recommendations
    } = results;

    return (
      <div className="space-y-6">
        {/* AI Security Recommendations - Show first if available */}
        {ai_recommendations && (
          <div className={`p-6 rounded-lg border-2 ${
            ai_recommendations.severity === 'critical' ? 'bg-red-50 border-red-300' :
            ai_recommendations.severity === 'high' ? 'bg-orange-50 border-orange-300' :
            ai_recommendations.severity === 'medium' ? 'bg-yellow-50 border-yellow-300' :
            'bg-green-50 border-green-300'
          }`}>
            <h3 className="text-xl font-bold mb-4 flex items-center">
              🤖 AI Security Analysis
              <span className={`ml-3 px-3 py-1 text-sm rounded-full font-medium ${
                ai_recommendations.severity === 'critical' ? 'bg-red-200 text-red-800' :
                ai_recommendations.severity === 'high' ? 'bg-orange-200 text-orange-800' :
                ai_recommendations.severity === 'medium' ? 'bg-yellow-200 text-yellow-800' :
                'bg-green-200 text-green-800'
              }`}>
                {ai_recommendations.severity.toUpperCase()}
              </span>
            </h3>
            
            <div className="mb-4">
              <p className="text-lg font-medium text-gray-800">{ai_recommendations.summary}</p>
            </div>

            {ai_recommendations.key_findings && ai_recommendations.key_findings.length > 0 && (
              <div className="mb-4">
                <h4 className="font-semibold text-gray-700 mb-2">🔍 Key Findings:</h4>
                <ul className="space-y-1">
                  {ai_recommendations.key_findings.map((finding: string, index: number) => (
                    <li key={index} className="flex items-start">
                      <span className="text-gray-600 mr-2">•</span>
                      <span className="text-gray-700">{finding}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {ai_recommendations.recommendations && ai_recommendations.recommendations.length > 0 && (
              <div>
                <h4 className="font-semibold text-gray-700 mb-3">💡 Recommended Actions:</h4>
                <div className="space-y-3">
                  {ai_recommendations.recommendations.map((rec: any, index: number) => (
                    <div key={index} className={`p-4 rounded-lg border-l-4 ${
                      rec.priority === 'high' ? 'bg-red-50 border-red-400' :
                      rec.priority === 'medium' ? 'bg-yellow-50 border-yellow-400' :
                      'bg-blue-50 border-blue-400'
                    }`}>
                      <div className="flex items-start justify-between mb-2">
                        <h5 className="font-medium text-gray-800">{rec.issue}</h5>
                        <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                          rec.priority === 'high' ? 'bg-red-200 text-red-800' :
                          rec.priority === 'medium' ? 'bg-yellow-200 text-yellow-800' :
                          'bg-blue-200 text-blue-800'
                        }`}>
                          {rec.priority.toUpperCase()} PRIORITY
                        </span>
                      </div>
                      <p className="text-gray-700 text-sm">{rec.solution}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Scan Overview */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg border border-blue-200">
          <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
            🚀 Deep Security Scan Overview
            {scan_metadata?.scan_type === 'user_initiated' && (
              <span className="ml-2 px-2 py-1 text-xs bg-purple-100 text-purple-800 rounded-full">
                v{scan_metadata?.scan_version || '3.0'}
              </span>
            )}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="text-center">
              <div className="text-lg font-semibold text-gray-800">
                {scan_metadata?.started_at ? new Date(scan_metadata.started_at).toLocaleDateString() : 'N/A'}
              </div>
              <div className="text-sm text-gray-600">Scan Date</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-gray-800">
                {scan_metadata?.url || 'N/A'}
              </div>
              <div className="text-sm text-gray-600">Target URL</div>
            </div>
          </div>
          
          {/* Risk Summary */}
          {risk_summary && (
            <div className="mt-4 grid grid-cols-4 gap-2">
              <div className="bg-red-100 p-2 rounded text-center">
                <div className="text-lg font-bold text-red-800">{risk_summary.critical || 0}</div>
                <div className="text-xs text-red-600">Critical</div>
              </div>
              <div className="bg-orange-100 p-2 rounded text-center">
                <div className="text-lg font-bold text-orange-800">{risk_summary.high || 0}</div>
                <div className="text-xs text-orange-600">High</div>
              </div>
              <div className="bg-yellow-100 p-2 rounded text-center">
                <div className="text-lg font-bold text-yellow-800">{risk_summary.medium || 0}</div>
                <div className="text-xs text-yellow-600">Medium</div>
              </div>
              <div className="bg-blue-100 p-2 rounded text-center">
                <div className="text-lg font-bold text-blue-800">{risk_summary.low || 0}</div>
                <div className="text-xs text-blue-600">Low</div>
              </div>
            </div>
          )}
        </div>

        {/* Security Headers Analysis */}
        {security_headers && !security_headers.error && (
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              🛡️ Security Headers Analysis
            </h3>
            
            {security_headers.present && security_headers.present.length > 0 && (
              <div className="mb-4">
                <h4 className="font-medium text-green-800 mb-2">✅ Present Headers ({security_headers.present.length})</h4>
                <div className="space-y-1">
                  {security_headers.present.map((header: any, index: number) => (
                    <div key={index} className="text-sm bg-green-50 p-2 rounded border-l-4 border-green-400">
                      <span className="font-medium">{header.name || header.header || header}</span>
                      {(header.value || header.val) && <span className="text-gray-600 ml-2">: {header.value || header.val}</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {security_headers.missing && security_headers.missing.length > 0 && (
              <div className="mb-4">
                <h4 className="font-medium text-red-800 mb-2">❌ Missing Headers ({security_headers.missing.length})</h4>
                <div className="space-y-1">
                  {security_headers.missing.map((header: any, index: number) => (
                    <div key={index} className="text-sm bg-red-50 p-2 rounded border-l-4 border-red-400">
                      <span className="font-medium">{header.name || header.header || header}</span>
                      {(header.recommendation || header.desc) && (
                        <div className="text-xs text-gray-600 mt-1">{header.recommendation || header.desc}</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {security_headers.recommendations && security_headers.recommendations.length > 0 && (
              <div className="bg-blue-50 p-3 rounded">
                <h4 className="font-medium text-blue-800 mb-2">💡 Recommendations</h4>
                <ul className="text-sm space-y-1">
                  {security_headers.recommendations.map((rec: string, index: number) => (
                    <li key={index} className="text-blue-700">• {rec}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* API Keys and Leaks Analysis */}
        {api_keys_and_leaks && !api_keys_and_leaks.error && (
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              🔑 API Keys & Security Leaks
              {(api_keys_and_leaks.js_files_scanned || api_keys_and_leaks.total_js_files || api_keys_and_leaks.files_analyzed) && (
                <span className="ml-2 px-2 py-1 text-xs bg-purple-100 text-purple-800 rounded-full">
                  {api_keys_and_leaks.js_files_scanned || api_keys_and_leaks.total_js_files || api_keys_and_leaks.files_analyzed} files scanned
                </span>
              )}
            </h3>
            
            {api_keys_and_leaks.enhanced_analysis && (
              <div className="mb-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-red-50 p-3 rounded text-center">
                  <div className="text-xl font-bold text-red-700">
                    {api_keys_and_leaks.enhanced_analysis.critical_leaks || 0}
                  </div>
                  <div className="text-xs text-red-600">Critical Leaks</div>
                </div>
                <div className="bg-orange-50 p-3 rounded text-center">
                  <div className="text-xl font-bold text-orange-700">
                    {api_keys_and_leaks.enhanced_analysis.high_leaks || 0}
                  </div>
                  <div className="text-xs text-orange-600">High Risk</div>
                </div>
                <div className="bg-yellow-50 p-3 rounded text-center">
                  <div className="text-xl font-bold text-yellow-700">
                    {api_keys_and_leaks.enhanced_analysis.medium_leaks || 0}
                  </div>
                  <div className="text-xs text-yellow-600">Medium Risk</div>
                </div>
                <div className="bg-blue-50 p-3 rounded text-center">
                  <div className="text-xl font-bold text-blue-700">
                    {api_keys_and_leaks.enhanced_analysis.total_leaks || api_keys_and_leaks.leaks_found?.length || 0}
                  </div>
                  <div className="text-xs text-blue-600">Total Leaks</div>
                </div>
              </div>
            )}
            
            {api_keys_and_leaks.leaks_found && api_keys_and_leaks.leaks_found.length > 0 ? (
              <div className="space-y-2">
                <h4 className="font-medium text-red-800">🚨 Security Issues Found:</h4>
                {api_keys_and_leaks.leaks_found.slice(0, 10).map((leak: any, index: number) => (
                  <div key={index} className={`p-3 rounded border-l-4 ${
                    leak.severity === 'critical' ? 'bg-red-50 border-red-500' :
                    leak.severity === 'warning' || leak.severity === 'high' ? 'bg-orange-50 border-orange-500' :
                    leak.severity === 'medium' ? 'bg-yellow-50 border-yellow-500' :
                    'bg-blue-50 border-blue-500'
                  }`}>
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="font-medium">{leak.type || 'Security Issue'}</span>
                        <div className="text-sm text-gray-600">{leak.description || leak.message}</div>
                        {leak.location && (
                          <div className="text-xs text-gray-500 mt-1">Found in: {leak.location}</div>
                        )}
                      </div>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        leak.severity === 'critical' ? 'bg-red-200 text-red-800' :
                        leak.severity === 'warning' || leak.severity === 'high' ? 'bg-orange-200 text-orange-800' :
                        leak.severity === 'medium' ? 'bg-yellow-200 text-yellow-800' :
                        'bg-blue-200 text-blue-800'
                      }`}>
                        {leak.severity || 'info'}
                      </span>
                    </div>
                  </div>
                ))}
                {api_keys_and_leaks.leaks_found.length > 10 && (
                  <div className="text-sm text-gray-600 italic">
                    ... and {api_keys_and_leaks.leaks_found.length - 10} more issues
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-green-50 p-3 rounded border-l-4 border-green-400">
                <span className="text-green-800 font-medium">✅ No security leaks detected!</span>
              </div>
            )}
            
            {/* Additional scan statistics */}
            {(api_keys_and_leaks.scan_stats || api_keys_and_leaks.files_scanned) && (
              <div className="mt-4 p-3 bg-gray-50 rounded">
                <h5 className="font-medium text-gray-700 mb-2">Scan Statistics:</h5>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                  {api_keys_and_leaks.scan_stats?.js_files && (
                    <div className="text-center">
                      <div className="font-bold text-blue-600">{api_keys_and_leaks.scan_stats.js_files}</div>
                      <div className="text-gray-600">JS Files</div>
                    </div>
                  )}
                  {api_keys_and_leaks.scan_stats?.css_files && (
                    <div className="text-center">
                      <div className="font-bold text-green-600">{api_keys_and_leaks.scan_stats.css_files}</div>
                      <div className="text-gray-600">CSS Files</div>
                    </div>
                  )}
                  {api_keys_and_leaks.scan_stats?.html_files && (
                    <div className="text-center">
                      <div className="font-bold text-purple-600">{api_keys_and_leaks.scan_stats.html_files}</div>
                      <div className="text-gray-600">HTML Files</div>
                    </div>
                  )}
                  {api_keys_and_leaks.scan_stats?.total_size && (
                    <div className="text-center">
                      <div className="font-bold text-orange-600">{api_keys_and_leaks.scan_stats.total_size}</div>
                      <div className="text-gray-600">Total Size</div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Subdomain Analysis */}
        {subdomain_analysis && !subdomain_analysis.error && (
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              🌐 Subdomain Discovery
              <span className="ml-2 px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
                {subdomain_analysis.summary?.totalFound || subdomain_analysis.subdomains?.length || 0} found
              </span>
            </h3>
            
            <div className="mb-4 grid grid-cols-3 gap-4">
              <div className="text-center p-3 bg-blue-50 rounded">
                <div className="text-xl font-bold text-blue-700">
                  {subdomain_analysis.summary?.totalFound || subdomain_analysis.subdomains?.length || 0}
                </div>
                <div className="text-xs text-blue-600">Total Found</div>
              </div>
              <div className="text-center p-3 bg-green-50 rounded">
                <div className="text-xl font-bold text-green-700">
                  {subdomain_analysis.subdomains?.filter((sub: any) => sub.exists).length || 0}
                </div>
                <div className="text-xs text-green-600">Accessible</div>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded">
                <div className="text-sm font-medium text-gray-700">
                  {subdomain_analysis.mode || 'Multi-method'}
                </div>
                <div className="text-xs text-gray-600">Scan Mode</div>
              </div>
            </div>
            
            {subdomain_analysis.subdomains && subdomain_analysis.subdomains.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium text-gray-800">🔍 Discovered Subdomains:</h4>
                {subdomain_analysis.subdomains.map((sub: any, index: number) => (
                  <div key={index} className={`p-3 rounded border-l-4 ${
                    sub.exists ? 'bg-green-50 border-green-400' : 'bg-gray-50 border-gray-400'
                  }`}>
                    <div className="flex justify-between items-center">
                      <span className="font-medium">{sub.subdomain}</span>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs text-gray-600">
                          {sub.method || 'unknown'}
                        </span>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          sub.exists ? 'bg-green-200 text-green-800' : 'bg-gray-200 text-gray-800'
                        }`}>
                          {sub.exists ? 'Active' : 'Inactive'}
                        </span>
                        <span className={`w-2 h-2 rounded-full ${
                          sub.exists ? 'bg-green-500' : 'bg-gray-400'
                        }`}></span>
                      </div>
                    </div>
                    {sub.ip && (
                      <div className="text-xs text-gray-600 mt-1">IP: {sub.ip}</div>
                    )}
                    {sub.error && (
                      <div className="text-xs text-red-600 mt-1">Error: {sub.error}</div>
                    )}
                  </div>
                ))}
              </div>
            )}
            
            {/* Scan Methods Summary */}
            {subdomain_analysis.summary?.methods && (
              <div className="mt-4 p-3 bg-gray-50 rounded">
                <h5 className="font-medium text-gray-700 mb-2">Discovery Methods Used:</h5>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-xs">
                  <div className="text-center">
                    <div className="font-bold text-blue-600">{subdomain_analysis.summary.methods.certificate_transparency || 0}</div>
                    <div className="text-gray-600">Cert Transparency</div>
                  </div>
                  <div className="text-center">
                    <div className="font-bold text-green-600">{subdomain_analysis.summary.methods.dns_enumeration || 0}</div>
                    <div className="text-gray-600">DNS Enum</div>
                  </div>
                  <div className="text-center">
                    <div className="font-bold text-purple-600">{subdomain_analysis.summary.methods.port_scanning || 0}</div>
                    <div className="text-gray-600">Port Scan</div>
                  </div>
                  <div className="text-center">
                    <div className="font-bold text-orange-600">{subdomain_analysis.summary.methods.san_analysis || 0}</div>
                    <div className="text-gray-600">SAN Analysis</div>
                  </div>
                  <div className="text-center">
                    <div className="font-bold text-red-600">{subdomain_analysis.summary.methods.wordlist || 0}</div>
                    <div className="text-gray-600">Wordlist</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Enhanced Supabase Analysis */}
        {supabase_analysis && supabase_analysis.tables && !supabase_analysis.error && (
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              🗄️ Supabase Database Analysis
              <span className="ml-2 px-2 py-1 text-xs bg-indigo-100 text-indigo-800 rounded-full">
                Project: {supabase_analysis.projectId}
              </span>
            </h3>
            
            {/* Project Info */}
            <div className="mb-4 p-3 bg-gray-50 rounded">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Supabase URL:</span> 
                  <span className="ml-2 text-blue-600">{supabase_analysis.supabaseUrl}</span>
                </div>
                <div>
                  <span className="font-medium">Scan Time:</span> 
                  <span className="ml-2">{supabase_analysis.scanTimeMs}ms</span>
                </div>
              </div>
            </div>
            
            {/* Summary Stats */}
            {supabase_analysis.summary && (
              <div className="mb-6 grid grid-cols-4 gap-4">
                <div className="text-center p-3 bg-blue-50 rounded">
                  <div className="text-xl font-bold text-blue-700">{supabase_analysis.summary.totalTables || 0}</div>
                  <div className="text-xs text-blue-600">Total Tables</div>
                </div>
                <div className="text-center p-3 bg-red-50 rounded">
                  <div className="text-xl font-bold text-red-700">{supabase_analysis.summary.publicTables || 0}</div>
                  <div className="text-xs text-red-600">Public Tables</div>
                </div>
                <div className="text-center p-3 bg-green-50 rounded">
                  <div className="text-xl font-bold text-green-700">{supabase_analysis.summary.protectedTables || 0}</div>
                  <div className="text-xs text-green-600">Protected</div>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded">
                  <div className="text-xl font-bold text-gray-700">{supabase_analysis.summary.errorTables || 0}</div>
                  <div className="text-xs text-gray-600">Errors</div>
                </div>
              </div>
            )}
            
            {/* Database Schema - Collapsible Tables */}
            {supabase_analysis.tables && supabase_analysis.tables.length > 0 && (
              <div className="space-y-3">
                <h4 className="font-medium text-gray-800 text-lg">📋 Database Schema ({supabase_analysis.tables.length} tables)</h4>
                {supabase_analysis.tables.map((table: any, index: number) => (
                  <details key={index} className={`border rounded-lg overflow-hidden ${
                    table.isPublic ? 'bg-yellow-50 border-yellow-300' : 'bg-white border-gray-200'
                  }`}>
                    <summary className={`cursor-pointer p-4 font-medium hover:bg-opacity-50 ${
                      table.isPublic ? 'bg-yellow-100 text-yellow-900' : 'bg-gray-50 text-gray-900'
                    }`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <span className="font-semibold">{table.name}</span>
                          {table.isPublic && (
                            <span className="px-2 py-1 text-xs bg-yellow-200 text-yellow-800 rounded-full font-medium">
                              ⚠️ PUBLIC ACCESS
                            </span>
                          )}
                          <span className="text-sm text-gray-600">
                            {table.columns?.length || 0} columns
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            table.rlsEnabled ? 'bg-blue-200 text-blue-800' : 'bg-red-200 text-red-800'
                          }`}>
                            RLS: {table.rlsEnabled ? 'Enabled' : 'Disabled'}
                          </span>
                          <span className="text-gray-400">▼</span>
                        </div>
                      </div>
                    </summary>
                    
                    <div className="p-4 border-t bg-white">
                      <div className="space-y-2">
                        <h5 className="font-medium text-gray-700 mb-3">Table Columns:</h5>
                        <div className="grid gap-2">
                          {table.columns && table.columns.map((column: any, colIndex: number) => (
                            <div key={colIndex} className="flex items-center justify-between p-2 bg-gray-50 rounded border">
                              <div className="flex items-center space-x-2">
                                <span className="font-medium text-gray-900">{column.name}</span>
                                <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                                  {column.type}
                                </span>
                                {!column.nullable && (
                                  <span className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded">
                                    NOT NULL
                                  </span>
                                )}
                              </div>
                              {column.description && (
                                <span className="text-xs text-gray-600 italic">
                                  {column.description}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                        
                        {/* Security Analysis for this table */}
                        <div className="mt-4 p-3 bg-gray-50 rounded">
                          <h6 className="font-medium text-gray-700 mb-2">Security Analysis:</h6>
                          <div className="space-y-1 text-sm">
                            <div className={`flex items-center ${table.isPublic ? 'text-red-600' : 'text-green-600'}`}>
                              {table.isPublic ? '🔓' : '🔒'} 
                              <span className="ml-2">
                                {table.isPublic ? 'Publicly accessible without authentication' : 'Protected by authentication'}
                              </span>
                            </div>
                            <div className={`flex items-center ${table.rlsEnabled ? 'text-green-600' : 'text-yellow-600'}`}>
                              {table.rlsEnabled ? '✅' : '⚠️'} 
                              <span className="ml-2">
                                Row Level Security is {table.rlsEnabled ? 'enabled' : 'disabled'}
                              </span>
                            </div>
                            {table.errorMessage && (
                              <div className="flex items-center text-red-600">
                                ❌ <span className="ml-2">{table.errorMessage}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </details>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Authenticated Analysis */}
        {authenticated_analysis && authenticated_analysis.jwt_token_valid && (
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              🔐 Authenticated Access Analysis
              <span className="ml-2 px-2 py-1 text-xs bg-purple-100 text-purple-800 rounded-full">
                JWT Valid
              </span>
            </h3>
            
            <div className="mb-4 grid grid-cols-2 gap-4">
              <div className="text-center p-3 bg-blue-50 rounded">
                <div className="text-xl font-bold text-blue-700">{authenticated_analysis.tested_endpoints?.length || 0}</div>
                <div className="text-xs text-blue-600">Endpoints Tested</div>
              </div>
              <div className="text-center p-3 bg-green-50 rounded">
                <div className="text-xl font-bold text-green-700">{authenticated_analysis.accessible_endpoints || 0}</div>
                <div className="text-xs text-green-600">Accessible</div>
              </div>
            </div>
            
            {authenticated_analysis.permission_findings && authenticated_analysis.permission_findings.length > 0 && (
              <div className="mb-4 space-y-2">
                <h4 className="font-medium text-orange-800">⚠️ Permission Findings:</h4>
                {authenticated_analysis.permission_findings.map((finding: any, index: number) => (
                  <div key={index} className={`p-3 rounded border-l-4 ${
                    finding.severity === 'high' ? 'bg-red-50 border-red-400' :
                    finding.severity === 'medium' ? 'bg-yellow-50 border-yellow-400' :
                    'bg-blue-50 border-blue-400'
                  }`}>
                    <div className="flex justify-between items-start">
                      <span className="text-sm">{finding.message}</span>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        finding.severity === 'high' ? 'bg-red-200 text-red-800' :
                        finding.severity === 'medium' ? 'bg-yellow-200 text-yellow-800' :
                        'bg-blue-200 text-blue-800'
                      }`}>
                        {finding.severity}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {authenticated_analysis.tested_endpoints && authenticated_analysis.tested_endpoints.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium text-gray-800">🎯 Endpoint Test Results:</h4>
                {authenticated_analysis.tested_endpoints.map((endpoint: any, index: number) => (
                  <div key={index} className={`p-3 rounded border-l-4 ${
                    endpoint.accessible ? 'bg-green-50 border-green-400' : 'bg-gray-50 border-gray-400'
                  }`}>
                    <div className="flex justify-between items-center">
                      <span className="font-medium">{endpoint.endpoint}</span>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs text-gray-600">{endpoint.response_size}</span>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          endpoint.accessible ? 'bg-green-200 text-green-800' : 'bg-gray-200 text-gray-800'
                        }`}>
                          {endpoint.status}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Error states for individual scans */}
        {(security_headers?.error || api_keys_and_leaks?.error || supabase_analysis?.error || subdomain_analysis?.error) && (
          <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
            <h3 className="text-lg font-semibold text-yellow-800 mb-2">⚠️ Partial Scan Results</h3>
            <div className="space-y-1 text-sm">
              {security_headers?.error && <div>• Security Headers: {security_headers.error}</div>}
              {api_keys_and_leaks?.error && <div>• API Scan: {api_keys_and_leaks.error}</div>}
              {supabase_analysis?.error && <div>• Supabase: {supabase_analysis.error}</div>}
              {subdomain_analysis?.error && <div>• Subdomains: {subdomain_analysis.error}</div>}
            </div>
          </div>
        )}

        {/* Raw Data (for debugging) */}
        <details className="mt-6">
          <summary className="cursor-pointer text-sm text-gray-600 hover:text-gray-800">
            🔍 View Raw Scan Data (Advanced)
          </summary>
          <pre className="mt-2 text-xs bg-gray-100 p-4 rounded overflow-auto max-h-96">
            {JSON.stringify(results, null, 2)}
          </pre>
        </details>
      </div>
    );
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
                    <span className="font-semibold text-foreground">Comprehensive Analysis:</span> Advanced automated scanning for API keys, database misconfigurations, security headers, and subdomain discovery.
                </div>
              </li>
              <li className="flex items-start">
                  <Target className="w-5 h-5 mr-3 mt-0.5 text-blue-500 flex-shrink-0" />
                <div>
                    <span className="font-semibold text-foreground">Multi-Layer Security Testing:</span> Tests multiple attack vectors including exposed APIs, database configurations, and security header analysis.
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

            {/* Compute button disabled state */}
            {(() => {
              const hasUser = !!user;
              const hasUrl = !!deepScanUrl.trim();
              const urlIsValid = deepScanUrlValidation?.valid !== false; // Allow null/undefined as valid
              const notLoading = !isDeepScanLoading;
              
              const isButtonEnabled = hasUser && hasUrl && urlIsValid && notLoading && paddleLoaded;
              
              return (
                <>
                  <Button 
                    type="submit" 
                    disabled={!isButtonEnabled}
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
                </>
              );
            })()}
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

      {/* Report Modal */}
      {showReportModal && selectedRequest && (
        <Dialog open={showReportModal} onOpenChange={setShowReportModal}>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle className="flex items-center">
                <FileText className="w-5 h-5 mr-2" />
                Deep Scan Report - {selectedRequest.url}
              </DialogTitle>
              <DialogDescription>
                Comprehensive security analysis completed on {new Date(selectedRequest.completed_at!).toLocaleString()}
              </DialogDescription>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto p-2">
              {formatScanResults(selectedRequest.scan_results)}
            </div>
            <div className="flex justify-end gap-2 pt-4 border-t">
              {selectedRequest.pdf_url && (
                <Button variant="outline" asChild>
                  <a href={selectedRequest.pdf_url} download>
                    <Download className="w-4 h-4 mr-2" />
                    Download PDF
                  </a>
                </Button>
              )}
              <Button onClick={() => setShowReportModal(false)}>
                Close
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  )
} 