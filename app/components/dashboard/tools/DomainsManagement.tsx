"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"
import { Checkbox } from "@/components/ui/checkbox"
import { Loader2, Globe, Shield, Check, Mail, Clock, ExternalLink } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useDashboard } from "../DashboardProvider"
import PaywallModal from "../PaywallModal"
import Link from "next/link"

// Helper function to normalize domain names
const normalizeDomain = (inputUrl: string | null): string | null => {
  if (!inputUrl) return null;
  let url = inputUrl.trim().replace(/^https?:\/\//i, ''); // Remove protocol for processing
  try {
    // Add protocol back for URL constructor if necessary
    let fullUrl = url.includes('://') ? url : `https://${url}`;
    let domain = new URL(fullUrl).hostname;
    domain = domain.replace(/^www\./, ''); // Remove www.
    return domain;
  } catch (e) {
    // Fallback for inputs that aren't full URLs but might be domains
    let domain = url.replace(/^www\./, '');
    // Remove potential paths/query params
    domain = domain.split('/')[0].split('?')[0];
    // Basic check if it looks like a domain after cleanup
    if (domain && domain.includes('.') && !domain.endsWith('.')) {
      return domain;
    }
    console.warn("Could not normalize domain:", inputUrl);
    return null; // Return null if it cannot be reliably normalized
  }
};

export default function DomainsManagement() {
  const [url, setUrl] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [userProfile, setUserProfile] = useState<any>(null)
  const [isPaywallOpen, setIsPaywallOpen] = useState(false)
  const [isLoadingProfile, setIsLoadingProfile] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [dailyScansEnabled, setDailyScansEnabled] = useState(false)
  const [termsAccepted, setTermsAccepted] = useState(false)
  const { user } = useDashboard()
  const supabase = createClient()

  // Fetch user profile on mount
  useEffect(() => {
    fetchUserProfile();
  }, [user]);

  const fetchUserProfile = async () => {
    if (!user || !user.id) {
      setIsLoadingProfile(false);
      return;
    }

    setIsLoadingProfile(true);
    setError(null);
    try {
      const { data, error: dbError } = await supabase
        .from('profiles')
        .select('subscription_plan, subscription_status, main_website, daily_scans_status')
        .eq('id', user.id)
        .single();

      if (dbError) {
        console.error("Error fetching user profile:", dbError);
      }

      if (data) {
        setUserProfile(data);
        // Pre-fill the form with existing data
        if (data.main_website) {
          setUrl(data.main_website);
        }
        if (data.daily_scans_status !== null) {
          setDailyScansEnabled(data.daily_scans_status);
        }
      } else {
        setUserProfile(null);
      }
    } catch (fetchError: any) {
      console.error("Unexpected error fetching user profile:", fetchError);
    } finally {
      setIsLoadingProfile(false);
    }
  };

  // Validate and format URL
  const validateAndFormatUrl = (input: string): { valid: boolean; normalizedDomain: string | null; errorMessage?: string } => {
    const cleanedInput = input.trim().replace(/^https?:\/\//i, '');
    if (!cleanedInput) {
      return { valid: false, normalizedDomain: null, errorMessage: 'Please enter your website URL' };
    }

    const normalized = normalizeDomain(cleanedInput);

    if (!normalized) {
      return { valid: false, normalizedDomain: null, errorMessage: 'Please enter a valid domain (e.g., example.com)' };
    }

    // Basic TLD check
    const parts = normalized.split('.');
    if (parts.length < 2 || parts[parts.length - 1].length < 2) {
       return { valid: false, normalizedDomain: null, errorMessage: 'Domain must include a valid top-level domain (e.g., .com, .org)' };
    }

    return { valid: true, normalizedDomain: normalized };
  };

  // Handle domain registration
  const handleRegisterDomain = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user || !user.id) {
      setError("User information is not available.");
      return;
    }

    if (userProfile?.subscription_plan === 'free') {
      setIsPaywallOpen(true);
      return;
    }

    if (!termsAccepted) {
      setError("Please accept the Terms of Service to continue.");
      return;
    }

    const { valid, normalizedDomain, errorMessage } = validateAndFormatUrl(url);

    if (!valid || !normalizedDomain) {
      setError(errorMessage || "Invalid URL format");
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ 
          main_website: normalizedDomain,
          daily_scans_status: dailyScansEnabled
        })
        .eq('id', user.id);

      if (updateError) {
        throw new Error(`Failed to register domain: ${updateError.message}`);
      }

      setUserProfile((prev: any) => ({ 
        ...prev, 
        main_website: normalizedDomain,
        daily_scans_status: dailyScansEnabled
      }));
      setUrl(normalizedDomain);
      setSuccess("Domain registered successfully! Daily scans will begin within 24 hours.");

    } catch (error: any) {
      setError(error.message || "Failed to register domain");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle upgrade for premium features
  const handleUpgrade = async (plan: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ subscription_plan: plan, subscription_status: 'active' })
        .eq('id', user!.id)

      if (error) throw error

      await fetchUserProfile();
      setIsPaywallOpen(false);
    } catch (error) {
      console.error("Error updating subscription:", error);
      setError("Failed to update subscription.");
    }
  };

  // Handle URL input change
  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUrl(e.target.value);
    if (error) setError(null);
    if (success) setSuccess(null);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl flex items-center">
            <Globe className="mr-3 h-6 w-6" />
            Domain Management
          </CardTitle>
          <CardDescription>
            Register your main website domain to receive automated daily security scans and email reports.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleRegisterDomain} className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="domain" className="text-sm font-medium">
                Website Domain
              </label>
              <Input
                id="domain"
                type="text"
                placeholder="yourdomain.com"
                value={url}
                onChange={handleUrlChange}
                disabled={isLoadingProfile || isLoading}
                className="w-full"
              />
              {isLoadingProfile && (
                <p className="text-xs text-muted-foreground">Loading profile...</p>
              )}
              {userProfile?.main_website && url === userProfile.main_website && (
                <p className="text-xs text-green-600 flex items-center">
                  <Check className="h-3 w-3 mr-1" /> Domain currently registered
                </p>
              )}
            </div>

            {/* Daily Scans Checkbox */}
            <div className="flex items-start space-x-3">
              <Checkbox
                id="daily-scans"
                checked={dailyScansEnabled}
                onCheckedChange={(checked) => setDailyScansEnabled(checked as boolean)}
                disabled={isLoadingProfile || isLoading}
              />
              <div className="space-y-1">
                <label 
                  htmlFor="daily-scans" 
                  className="text-sm font-medium cursor-pointer flex items-center"
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Receive daily security scans of my website
                </label>
                <p className="text-xs text-muted-foreground">
                  Get automated security reports delivered to your email every day
                </p>
              </div>
            </div>

            {/* Terms Acceptance */}
            <div className="flex items-start space-x-3">
              <Checkbox
                id="terms"
                checked={termsAccepted}
                onCheckedChange={(checked) => setTermsAccepted(checked as boolean)}
                disabled={isLoadingProfile || isLoading}
              />
              <div className="space-y-1">
                <label htmlFor="terms" className="text-xs text-muted-foreground cursor-pointer">
                  I confirm that I am authorized to scan this website and I agree to the{" "}
                  <Link 
                    href="/terms" 
                    className="text-primary hover:underline"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Terms of Service
                    <ExternalLink className="inline h-3 w-3 ml-1" />
                  </Link>
                </label>
              </div>
            </div>

            <Button
              type="submit"
              disabled={isLoading || isLoadingProfile || !user || !url.trim() || !termsAccepted}
              className="w-full"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Registering Domain...
                </>
              ) : (
                <>
                  <Shield className="mr-2 h-4 w-4" />
                  {userProfile?.main_website && url === userProfile.main_website
                    ? 'Update Settings'
                    : 'Register Domain'}
                </>
              )}
            </Button>
          </form>

          {/* Premium Plan Check */}
          {userProfile && userProfile.subscription_plan === 'free' && !isLoadingProfile && (
            <Alert className="mt-4 bg-primary/5 border-primary/20">
              <Shield className="h-4 w-4" />
              <AlertTitle>Premium Feature</AlertTitle>
              <AlertDescription>
                Daily security scans and email reports are available for premium users only.
                <Button
                  variant="link"
                  className="p-0 h-auto font-semibold ml-1"
                  onClick={() => setIsPaywallOpen(true)}
                >
                  Upgrade to activate.
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {/* Error Alert */}
          {error && (
            <Alert variant="destructive" className="mt-4">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Success Alert */}
          {success && (
            <Alert className="mt-4 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
              <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
              <AlertTitle className="text-green-800 dark:text-green-400">Success</AlertTitle>
              <AlertDescription className="text-green-700 dark:text-green-300">
                {success}
              </AlertDescription>
            </Alert>
          )}

          {/* Information Card */}
          <Card className="mt-6 bg-muted/30">
            <CardContent className="pt-6">
              <h4 className="font-semibold mb-3 flex items-center">
                <Clock className="h-4 w-4 mr-2" />
                How Daily Scans Work
              </h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start">
                  <span className="text-primary mr-2">•</span>
                  Automated security scans run every 24 hours
                </li>
                <li className="flex items-start">
                  <span className="text-primary mr-2">•</span>
                  Comprehensive analysis of security headers, exposed APIs, and vulnerabilities
                </li>
                <li className="flex items-start">
                  <span className="text-primary mr-2">•</span>
                  Detailed reports delivered directly to your email
                </li>
              </ul>
            </CardContent>
          </Card>
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