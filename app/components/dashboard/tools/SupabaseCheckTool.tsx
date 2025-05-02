"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Loader2, Shield, ShieldCheck, Copy, ExternalLink, Database, Check, Key, Network, Fingerprint, User } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useDashboard } from "../DashboardProvider"
import PaywallModal from "../PaywallModal"

// Helper function to normalize domain names (similar to API route)
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

export default function SupabaseCheckTool() {
  const [url, setUrl] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [activeTab, setActiveTab] = useState("generate")
  const [userProfile, setUserProfile] = useState<any>(null)
  const [isPaywallOpen, setIsPaywallOpen] = useState(false)
  const [isLoadingProfile, setIsLoadingProfile] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const { user } = useDashboard()
  const supabase = createClient()

  // --- Fetch User Profile on Mount ---
  useEffect(() => {
    fetchUserProfile();
  }, [user]); // Re-run if user object changes

  const fetchUserProfile = async () => {
    if (!user || !user.id) {
      setIsLoadingProfile(false); // Not loading if no user
      console.log("SupabaseCheckTool: User not available for profile fetch.");
      return;
    }

    setIsLoadingProfile(true);
    setError(null);
    try {
      console.log("Fetching profile for user:", user.id);
      const { data, error: dbError } = await supabase
        .from('profiles')
        .select('subscription_plan, subscription_status, main_website') // Fetch required fields
        .eq('id', user.id)
        .single();

      if (dbError) {
        console.error("Error fetching user profile:", dbError);
      }

      if (data) {
        console.log("Profile data fetched:", data);
        setUserProfile(data);
        // Pre-fill the URL input if a domain exists and URL state is empty
        if (data.main_website && !url) {
          setUrl(data.main_website); // Use the stored domain
        }
      } else {
         console.log("No profile data found for user:", user.id);
         setUserProfile(null); // Ensure profile state is null if no data
      }
    } catch (fetchError: any) {
      console.error("Unexpected error fetching user profile:", fetchError);
    } finally {
      setIsLoadingProfile(false);
    }
  };
  // --- End Fetch User Profile ---

  // Validate and format URL
  const validateAndFormatUrl = (input: string): { valid: boolean; normalizedDomain: string | null; errorMessage?: string } => {
    const cleanedInput = input.trim().replace(/^https?:\/\//i, ''); // Remove protocol
    if (!cleanedInput) {
      return { valid: false, normalizedDomain: null, errorMessage: 'Please enter your website URL' };
    }

    const normalized = normalizeDomain(cleanedInput); // Use the helper

    if (!normalized) {
      return { valid: false, normalizedDomain: null, errorMessage: 'Please enter a valid domain (e.g., example.com or sub.example.co.uk)' };
    }

    // Optional: Basic TLD check - adjust as needed
    const parts = normalized.split('.');
    if (parts.length < 2 || parts[parts.length - 1].length < 2) {
       return { valid: false, normalizedDomain: null, errorMessage: 'Domain must include a valid top-level domain (e.g., .com, .org)' };
    }

    return { valid: true, normalizedDomain: normalized };
  };

  // Generate the script tag that users will install
  const generateScriptTag = () => {
    if (!user?.id) return "<!-- Error: User ID not available. Please login or wait. -->"; // Handle missing user ID

    // Include userId in the script URL
    const scriptUrl = `${window.location.origin}/api/supacheck/script?userId=${user.id}`;
    return `<script src="${scriptUrl}" async></script>`;
  }

  // Handle Saving Domain and Generating Script
  const handleSaveAndGenerate = async () => {
    if (!user || !user.id) {
      setError("User information is loading or you are not logged in.");
      return;
    }
    if (isLoadingProfile) {
      setError("Profile is loading, please wait...");
      return;
    }
    if (!userProfile) {
       setError("Could not load profile. Cannot verify plan or save domain.");
       return;
    }

    const { valid, normalizedDomain, errorMessage } = validateAndFormatUrl(url);

    if (!valid || !normalizedDomain) {
      setError(errorMessage || "Invalid URL format");
      return;
    }

    if (userProfile.subscription_plan === 'free') {
      setIsPaywallOpen(true);
      return;
    }

    setIsSaving(true); // Use isSaving state
    setError(null);

    try {
      console.log(`Saving domain '${normalizedDomain}' for user ${user.id}`);
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ main_website: normalizedDomain }) // Use the column name
        .eq('id', user.id);

      if (updateError) {
        console.error("Error updating profile:", updateError);
        throw new Error(`Failed to save your website domain (${updateError.message}). Please try again.`);
      }

      console.log("Domain saved successfully.");
      setUserProfile((prev: any) => ({ ...prev, main_website: normalizedDomain }));
      setUrl(normalizedDomain); // Update input field to normalized version
      setActiveTab("install"); // Proceed to install tab

    } catch (error: any) {
      setError(error.message || "Failed to save domain or generate script");
    } finally {
      setIsSaving(false); // Update isSaving state
    }
  }

  // Handle upgrade for premium features
  const handleUpgrade = async (plan: string) => {
    setIsSaving(true); // Show loading on upgrade button too
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ subscription_plan: plan, subscription_status: 'active' }) // Also update status
        .eq('id', user!.id)

      if (error) throw error

      await fetchUserProfile(); // Re-fetch profile to get latest status
      setIsPaywallOpen(false) // Close the paywall
    } catch (error) {
      console.error("Error updating subscription:", error)
      setError("Failed to update subscription."); // Show error in main component
    } finally {
       setIsSaving(false);
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
    setUrl(e.target.value);
    if (error) setError(null); // Clear error on input change
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Supabase Security Inspector</CardTitle>
          <CardDescription>
            Enter your main website domain, save it, and add the generated script to your site to start inspecting.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="generate">1. Configure & Save Domain</TabsTrigger>
              <TabsTrigger value="install" disabled={!userProfile?.main_website}>2. Install Script</TabsTrigger>
            </TabsList>

            <TabsContent value="generate" className="space-y-4 mt-4">
              <p className="text-sm text-muted-foreground">
                Enter the primary domain where you will use this script (e.g., `yourdomain.com` or `app.yourdomain.com`). We need this to authorize script requests.
              </p>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSaveAndGenerate(); // Use the updated handler
                }}
                className="flex flex-col sm:flex-row gap-3"
              >
                <div className="flex flex-col flex-1">
                  <div className="flex flex-1 rounded-md overflow-hidden border border-input">
                    <Input
                      type="text"
                      placeholder="yourdomain.com"
                      value={url}
                      onChange={handleUrlChange}
                      required
                      disabled={isLoadingProfile}
                      className="flex-1 focus-visible:ring-1 focus-visible:ring-offset-0"
                    />
                  </div>
                   {isLoadingProfile && <p className="text-xs text-muted-foreground mt-1">Loading profile...</p>}
                   {userProfile?.main_website && url === userProfile.main_website && (
                       <p className="text-xs text-green-600 mt-1 flex items-center">
                         <Check className="h-3 w-3 mr-1" /> Domain saved. You can update it if needed.
                       </p>
                   )}
                </div>

                <Button
                  type="submit"
                  disabled={isSaving || isLoadingProfile || !user || !url}
                  className="sm:w-auto w-full"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Key className="mr-2 h-4 w-4" />
                      {userProfile?.main_website && url === userProfile.main_website
                        ? 'Get Script Tag'
                        : userProfile?.main_website
                        ? 'Update Domain & Get Script'
                        : 'Save Domain & Get Script'}
                    </>
                  )}
                </Button>
              </form>

              {userProfile && userProfile.subscription_plan === 'free' && !isLoadingProfile && (
                 <Alert className="mt-4 bg-primary/5 border-primary/20">
                   <Shield className="h-4 w-4" />
                   <AlertTitle>Upgrade Required</AlertTitle>
                   <AlertDescription>
                     The Supabase Security Inspector requires a premium plan.
                     <Button
                       variant="link"
                       className="p-0 h-auto font-semibold ml-1"
                       onClick={() => setIsPaywallOpen(true)}
                       disabled={isSaving}
                     >
                       Upgrade to activate.
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
                    <li>Enter and save your main website domain where the script will run.</li>
                    <li>Copy the generated script tag from the 'Install Script' tab.</li>
                    <li>Add the script to your website's HTML (preferably in the &lt;head&gt;).</li>
                    <li>The script automatically scans, monitors network requests, and analyzes user data.</li>
                    <li>Results appear in an interactive widget directly on your site.</li>
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
                       Finds Supabase URLs & API keys in your site's code.
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
                       Captures Supabase requests & auth headers.
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
                       Visualizes data fetched from Supabase responses.
                     </p>
                   </CardContent>
                 </Card>
               </div>
            </TabsContent>

            <TabsContent value="install" className="space-y-4 mt-4">
                 {activeTab === 'install' && userProfile?.main_website && (
                   <>
                     <Alert className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
                       <ShieldCheck className="h-4 w-4 text-green-600 dark:text-green-400" />
                       <AlertTitle className="text-green-800 dark:text-green-400">Domain Saved & Script Ready</AlertTitle>
                       <AlertDescription className="text-green-700 dark:text-green-300">
                         Your domain (`{userProfile.main_website}`) is saved. Copy the script below and add it to your website's HTML, preferably in the &lt;head&gt; section.
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
                       <AlertTitle>Usage Instructions</AlertTitle>
                       <AlertDescription>
                         <p className="mb-2 text-sm">Once the script is added to `<span className="font-mono">{userProfile.main_website}</span>`:</p>
                         <ol className="list-decimal ml-5 space-y-2 text-sm">
                           <li>Refresh your website page.</li>
                           <li>Look for the <span className="font-semibold text-primary">SecureVibing Supacheck</span> widget (bottom-right).</li>
                           <li>Click the widget header to expand/collapse. Interact with your site to see requests.</li>
                           <li>Login with a test user on your site to check authenticated data access.</li>
                         </ol>
                       </AlertDescription>
                     </Alert>

                     <div className="flex justify-between mt-6">
                       <Button variant="outline" onClick={() => setActiveTab("generate")}>&larr; Back to Configuration</Button>
                       <Button onClick={() => window.open(`https://${userProfile.main_website}`, '_blank')} className="gap-2" disabled={!userProfile.main_website}>
                         Visit Your Website <ExternalLink className="h-4 w-4" />
                       </Button>
                     </div>
                   </>
                 )}
                 {activeTab === 'install' && !userProfile?.main_website && (
                    <Alert variant="destructive">
                      <AlertTitle>Configuration Needed</AlertTitle>
                      <AlertDescription>
                        Please configure and save your website domain on the first tab.
                        <Button variant="link" className="p-0 h-auto ml-1" onClick={() => setActiveTab("generate")}>Go back</Button>
                      </AlertDescription>
                    </Alert>
                 )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>


      <PaywallModal
        isOpen={isPaywallOpen}
        onClose={() => setIsPaywallOpen(false)}
        onUpgrade={handleUpgrade}
      />
    </div>
  )
} 