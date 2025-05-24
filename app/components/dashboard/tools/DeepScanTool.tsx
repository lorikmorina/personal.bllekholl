"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"
import { Loader2, Zap, Info, SearchCheck, ListChecks, FileText, Clock, CheckCircle, Users, FileSearch, Target } from "lucide-react"
import { useDashboard } from "../DashboardProvider"
import { createClient } from "@/lib/supabase/client"

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
  domain: string;
  codebase_provided: boolean;
  status: string;
  user_email: string; // Added for completeness, though not displayed by default
}

export default function DeepScanTool() {
  const [deepScanDomain, setDeepScanDomain] = useState("")
  const [deepScanCodebaseProvided, setDeepScanCodebaseProvided] = useState(false)
  const [isDeepScanLoading, setIsDeepScanLoading] = useState(false)
  const [deepScanMessage, setDeepScanMessage] = useState<{type: 'success' | 'error'; text: string} | null>(null)
  const [deepScanUrlValidation, setDeepScanUrlValidation] = useState<{valid: boolean; message?: string} | null>(null)
  
  const [userRequests, setUserRequests] = useState<DeepScanRequest[]>([])
  const [isLoadingRequests, setIsLoadingRequests] = useState(true)

  const { user } = useDashboard()
  const supabase = createClient()

  // Fetch user's deep scan requests
  useEffect(() => {
    const fetchUserRequests = async () => {
      if (!user) {
        setIsLoadingRequests(false);
        setUserRequests([]); // Clear requests if user logs out
        return;
      }
      setIsLoadingRequests(true);
      try {
        const { data, error } = await supabase
          .from('deep_scan_requests')
          .select('id, created_at, domain, codebase_provided, status, user_email')
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

    fetchUserRequests();
  }, [user, supabase]);

  const handleDeepScanUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const cleanedUrl = cleanUrl(e.target.value);
    setDeepScanDomain(cleanedUrl);
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
        message: `Will use domain: ${formattedUrl}`
      });
    } else {
      setDeepScanUrlValidation({ valid: true });
    }
  };

  const handleDeepScanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setDeepScanMessage(null);

    if (!user || !user.email) {
      setDeepScanMessage({ type: 'error', text: "You must be logged in to request a deep scan." });
      return;
    }

    const validation = validateAndFormatUrl(deepScanDomain);
    if (!validation.valid) {
      setDeepScanMessage({ type: 'error', text: validation.errorMessage || "Invalid domain format for Deep Scan." });
      return;
    }
    const finalDomain = validation.formattedUrl;

    setIsDeepScanLoading(true);

    try {
      // Step 1: Save the request to Supabase FIRST
      const { data: insertedRequest, error: insertError } = await supabase
        .from('deep_scan_requests')
        .insert({
          user_id: user.id,
          user_email: user.email,
          domain: finalDomain,
          codebase_provided: deepScanCodebaseProvided,
          status: 'pending_payment' // Explicitly set status, or rely on default 'pending'
        })
        .select(); // Optionally select the inserted row if needed later

      if (insertError) {
        throw insertError;
      }
      
      // If you need the ID of the inserted row for the payment process:
      // const requestId = insertedRequest?.[0]?.id;

      // Step 2: Redirect to Dodo Payments
      setDeepScanMessage({ type: 'success', text: `Request for ${finalDomain} saved! Redirecting to payment...` });
      
      // Construct the Dodo Payments URL
      const dodoPaymentUrl = "https://checkout.dodopayments.com/buy/pdt_wl57MHMBp1kXObktvV7YK?quantity=1&redirect_url=https://securevibing.com%2Fdeep-scan-success&addressLine=%2F&city=%2F&zipCode=%2F&state=%2F&disableAddressLine=true&disableState=true&disableCity=true&disableZipCode=true";
      
      // Perform the redirection
      window.location.href = dodoPaymentUrl;

      // The code below this point (paymentSuccessful check, etc.) will not be reached 
      // if the redirection is successful, as the user will navigate away from the page.
      // This is okay, as DodoPayments will handle the success/failure and redirect to your /deep-scan-success page.
      // You would typically handle post-payment logic (like updating DB status) via webhooks from DodoPayments or on the success page.

      /* 
      // Old simulated payment logic - will be removed by redirection
      await new Promise(resolve => setTimeout(resolve, 2500)); 
      const paymentSuccessful = true; 

      if (paymentSuccessful) {
        setDeepScanMessage({ type: 'success', text: `Payment successful! Deep scan request for ${finalDomain} is now being processed. If you opted to provide your codebase, please send the zip file to lorik@securevibing.com.` });
        setDeepScanDomain("");
        setDeepScanCodebaseProvided(false);
        setDeepScanUrlValidation(null);
      } else {
        setDeepScanMessage({ type: 'error', text: "Your request was saved, but payment failed. Please try completing the payment or contact support." });
      }
      */

    } catch (error: any) {
      console.error('Error during deep scan submission process:', error);
      setDeepScanMessage({ type: 'error', text: `An error occurred: ${error.message}` });
    } finally {
      setIsDeepScanLoading(false);
    }

    // After a successful submission, refresh the list of requests
    if (user) { // Re-fetch only if user is available
      try {
        const { data, error } = await supabase
          .from('deep_scan_requests')
          .select('id, created_at, domain, codebase_provided, status, user_email')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
        if (error) throw error;
        setUserRequests(data || []);
      } catch (fetchError) {
        console.error("Error re-fetching user requests after submission:", fetchError);
        // Optionally set a message, but the main submission message might be enough
      }
    }
  };

  return (
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
            Deep Security Scan & Manual Review
          </CardTitle>
          <CardDescription className="pt-1">
            A comprehensive, human-assisted AI security audit of your website or web application. Get actionable insights to fortify your digital presence.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Added informational list */}
          <div className="mb-6 space-y-4 text-sm">
            <h3 className="text-lg font-semibold text-foreground mb-3">How Our Deep Scan Works & Who It's For:</h3>
            <ul className="space-y-3">
              <li className="flex items-start">
                <CheckCircle className="w-5 h-5 mr-3 mt-0.5 text-green-500 flex-shrink-0" />
                <div>
                  <span className="font-semibold text-foreground">Hybrid Intelligence:</span> Our powerful AI scanning tools identify a broad range of vulnerabilities, which are then meticulously verified and analyzed by human security experts to eliminate false positives and provide contextual insights.
                </div>
              </li>
              <li className="flex items-start">
                <Users className="w-5 h-5 mr-3 mt-0.5 text-blue-500 flex-shrink-0" /> {/* Assuming Users icon is available or add it to lucide imports */}
                <div>
                  <span className="font-semibold text-foreground">Ideal for Pre & Post-Launch:</span> Highly recommended for applications nearing launch, recently launched, or before undergoing significant updates to ensure a secure foundation.
                </div>
              </li>
              <li className="flex items-start">
                <FileSearch className="w-5 h-5 mr-3 mt-0.5 text-purple-500 flex-shrink-0" /> {/* Assuming FileSearch icon is available or add it to lucide imports */}
                <div>
                  <span className="font-semibold text-foreground">Codebase Analysis (Optional but Recommended):</span> Providing your codebase (emailed securely) allows for thorough white-box testing, uncovering deeper vulnerabilities that black-box scanning might miss. This is the gold standard for comprehensive security assessments.
                </div>
              </li>
              <li className="flex items-start">
                <Target className="w-5 h-5 mr-3 mt-0.5 text-red-500 flex-shrink-0" /> {/* Assuming Target icon is available or add it to lucide imports */}
                <div>
                  <span className="font-semibold text-foreground">Actionable Reporting:</span> You receive a detailed report outlining found vulnerabilities, their potential impact, and clear, prioritized recommendations for remediation.
                </div>
              </li>
            </ul>
          </div>

          <form onSubmit={handleDeepScanSubmit} className="space-y-4">
            <div>
              <label htmlFor="deepScanDomain" className="block text-sm font-medium text-foreground mb-1">
                Website Domain
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
                  id="deepScanDomain"
                  placeholder="example.com"
                  value={deepScanDomain}
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

            <div className="flex items-start">
              <div className="flex items-center h-5">
                <Input
                  id="deepScanCodebase"
                  type="checkbox"
                  checked={deepScanCodebaseProvided}
                  onChange={(e) => setDeepScanCodebaseProvided(e.target.checked)}
                  className="focus:ring-primary h-4 w-4 text-primary border-gray-300 rounded"
                />
              </div>
              <div className="ml-3 text-sm">
                <label htmlFor="deepScanCodebase" className="font-medium text-foreground">
                  I will provide my codebase (optional)
                </label>
                <p className="text-xs text-muted-foreground">
                  If you choose to provide your codebase for a more thorough scan, please send a zip file to <strong className="text-foreground">lorik@securevibing.com</strong> after submitting this request.
                </p>
              </div>
            </div>

            <Alert className="bg-primary/5 border-primary/20">
              <Info className="h-4 w-4 text-primary" />
              <AlertTitle className="font-semibold text-primary">One-Time Payment: $49</AlertTitle>
              <AlertDescription>
                This is a one-time payment for a comprehensive deep scan of the specified domain. 
                Payment will be processed via DodoPayments (our secure payment partner).
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
              disabled={isDeepScanLoading || !user || deepScanUrlValidation?.valid === false}
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
                  Request Deep Scan ($49)
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
A summary of your past and current deep scan requests.
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
                    <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-2">
                      <h3 className="text-lg font-semibold text-primary break-all">{request.domain}</h3>
                    </div>
                    <div className="text-sm text-muted-foreground space-y-1 sm:space-y-0 sm:flex sm:space-x-4">
                      <div className="flex items-center">
                        <Clock className="w-4 h-4 mr-1.5 text-muted-foreground/70" />
                        Requested: {new Date(request.created_at).toLocaleDateString()} {new Date(request.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                      <div className="flex items-center">
                        <FileText className="w-4 h-4 mr-1.5 text-muted-foreground/70" />
                        Codebase Provided: {request.codebase_provided ? 'Yes' : 'No'}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      )}
    </motion.div>
  )
} 