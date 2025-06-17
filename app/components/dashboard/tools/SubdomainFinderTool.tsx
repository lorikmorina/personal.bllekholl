"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Loader2, Clock, Globe, Shield, ShieldCheck, ShieldX, AlertTriangle, CheckCircle, XCircle, ExternalLink, Copy, Search, Network, Wifi } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useDashboard } from "../DashboardProvider"
import PaywallModal from "../PaywallModal"

interface SubdomainResult {
  subdomain: string;
  exists: boolean;
  ip?: string;
  error?: string;
  method?: 'wordlist' | 'certificate_transparency' | 'san_analysis' | 'dns_enumeration' | 'port_scanning';
  ssl?: {
    valid: boolean;
    issuer?: string;
    validFrom?: string;
    validTo?: string;
    daysUntilExpiry?: number;
    error?: string;
  };
}

interface ScanResults {
  domain: string;
  subdomains: SubdomainResult[];
  summary: {
    totalChecked: number;
    totalFound: number;
    withSSL: number;
    withoutSSL: number;
    sslErrors: number;
    methods: {
      port_scanning: number;
      dns_enumeration: number;
      certificate_transparency: number;
      wordlist: number;
      san_analysis: number;
    };
  };
  errors: Array<{ subdomain: string; error: string }>;
  scannedAt: string;
  discoveredFrom: {
    portScanning: number;
    dnsEnumeration: number;
    certificateTransparency: number;
    wordlist: number;
    totalUnique: number;
  };
  scanTimeMs?: number;
}

export default function SubdomainFinderTool() {
  const [domain, setDomain] = useState("")
  const [isScanning, setIsScanning] = useState(false)
  const [results, setResults] = useState<ScanResults | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [userProfile, setUserProfile] = useState<any>(null)
  const [isPaywallOpen, setIsPaywallOpen] = useState(false)
  const [isLoadingProfile, setIsLoadingProfile] = useState(true)
  const [copied, setCopied] = useState("")
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
        .select('subscription_plan, subscription_status, main_website')
        .eq('id', user.id)
        .single();

      if (dbError) {
        console.error("Error fetching user profile:", dbError);
      }

      if (data) {
        setUserProfile(data);
        // Pre-fill the domain input if a website exists
        if (data.main_website && !domain) {
          setDomain(data.main_website);
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

  // Validate domain format
  const validateDomain = (input: string): { valid: boolean; errorMessage?: string } => {
    const cleanedInput = input.trim().replace(/^https?:\/\//i, '');
    if (!cleanedInput) {
      return { valid: false, errorMessage: 'Please enter a domain name' };
    }

    // Remove www and extract domain
    const domain = cleanedInput.replace(/^www\./i, '').split('/')[0].split('?')[0];
    
    if (!domain.includes('.')) {
      return { valid: false, errorMessage: 'Please enter a valid domain (e.g., example.com)' };
    }

    const parts = domain.split('.');
    if (parts.length < 2 || parts[parts.length - 1].length < 2) {
      return { valid: false, errorMessage: 'Domain must include a valid top-level domain (e.g., .com, .org)' };
    }

    return { valid: true };
  };

  // Handle subdomain search
  const handleSearch = async () => {
    if (!user || !user.id) {
      setError("User information is loading or you are not logged in.");
      return;
    }

    if (isLoadingProfile) {
      setError("Profile is loading, please wait...");
      return;
    }

    if (!userProfile) {
      setError("Could not load profile. Cannot verify subscription.");
      return;
    }

    const { valid, errorMessage } = validateDomain(domain);
    if (!valid) {
      setError(errorMessage || "Invalid domain format");
      return;
    }

    // Check subscription
    if (userProfile.subscription_plan === 'free') {
      setIsPaywallOpen(true);
      return;
    }

    setIsScanning(true);
    setError(null);
    setResults(null);

    try {
      const response = await fetch('/api/subdomain-finder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ domain }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.error === 'subscription_required') {
          setIsPaywallOpen(true);
          return;
        }
        throw new Error(data.message || 'Failed to scan for subdomains');
      }

      setResults(data);
    } catch (error: any) {
      setError(error.message || "Failed to scan for subdomains");
    } finally {
      setIsScanning(false);
    }
  };

  // Handle upgrade
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

  // Copy to clipboard
  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(""), 2000);
  };

  // Format SSL certificate info
  const formatSSLInfo = (ssl: SubdomainResult['ssl']) => {
    if (!ssl) return "No SSL info";
    if (ssl.error) return `SSL Error: ${ssl.error}`;
    
    const status = ssl.valid ? "Valid" : "Invalid";
    const expiry = ssl.daysUntilExpiry ? `${ssl.daysUntilExpiry} days` : "Unknown";
    return `${status} (${expiry} until expiry)`;
  };

  // Get SSL badge color
  const getSSLBadgeVariant = (ssl: SubdomainResult['ssl']): "default" | "secondary" | "destructive" => {
    if (!ssl || ssl.error) return "secondary";
    if (ssl.valid) {
      if (ssl.daysUntilExpiry && ssl.daysUntilExpiry < 30) return "destructive";
      return "default";
    }
    return "destructive";
  };

  // Get discovery method badge info
  const getMethodBadge = (method?: string) => {
    switch (method) {
      case 'port_scanning':
        return { 
          text: 'Port Scan', 
          variant: 'destructive' as const, 
          icon: <Wifi className="mr-1 h-3 w-3" />,
          tooltip: 'Discovered via port scanning and live host detection'
        };
      case 'dns_enumeration':
        return { 
          text: 'DNS', 
          variant: 'default' as const, 
          icon: <Network className="mr-1 h-3 w-3" />,
          tooltip: 'Discovered via DNS enumeration and brute force'
        };
      case 'certificate_transparency':
        return { 
          text: 'CT Logs', 
          variant: 'secondary' as const, 
          icon: <Shield className="mr-1 h-3 w-3" />,
          tooltip: 'Discovered via Certificate Transparency logs'
        };
      case 'san_analysis':
        return { 
          text: 'SSL/SAN', 
          variant: 'outline' as const, 
          icon: <ShieldCheck className="mr-1 h-3 w-3" />,
          tooltip: 'Found in SSL certificate Subject Alternative Names'
        };
      case 'wordlist':
        return { 
          text: 'Wordlist', 
          variant: 'outline' as const, 
          icon: <Search className="mr-1 h-3 w-3" />,
          tooltip: 'Common subdomain from wordlist'
        };
      default:
        return { 
          text: 'Unknown', 
          variant: 'secondary' as const, 
          icon: null,
          tooltip: 'Discovery method unknown'
        };
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Subdomain Finder</h1>
        <p className="text-muted-foreground mt-2">
          Fast subdomain discovery using port scanning, DNS enumeration, Certificate Transparency logs, and wordlists (optimized for speed)
        </p>
      </div>

      {/* Search Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Rapid Subdomain Discovery
          </CardTitle>
          <CardDescription>
            Lightning-fast reconnaissance using optimized port scanning, DNS enumeration, Certificate Transparency logs, and intelligent wordlists (completes in under 10 seconds)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Input
              placeholder="example.com"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              className="flex-1"
              disabled={isScanning}
            />
            <Button 
              onClick={handleSearch}
              disabled={isScanning || !domain.trim()}
              className="px-6"
            >
              {isScanning ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Scanning...
                </>
              ) : (
                <>
                  <Search className="mr-2 h-4 w-4" />
                  Quick Scan
                </>
              )}
            </Button>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Results */}
      {results && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Enhanced Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Quick Scan Results for {results.domain}</span>
                {results.scanTimeMs && (
                  <Badge variant="secondary" className="ml-2">
                    <Clock className="mr-1 h-3 w-3" />
                    {(results.scanTimeMs / 1000).toFixed(1)}s
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                High-speed scan of {results.summary.totalChecked} targets completed in {results.scanTimeMs ? `${(results.scanTimeMs / 1000).toFixed(1)} seconds` : 'under 10 seconds'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {results.summary.totalFound}
                  </div>
                  <div className="text-sm text-muted-foreground">Found Active</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {results.summary.totalChecked}
                  </div>
                  <div className="text-sm text-muted-foreground">Total Checked</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">
                    {results.summary.methods.port_scanning}
                  </div>
                  <div className="text-sm text-muted-foreground">Port Scanned</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {results.summary.methods.dns_enumeration}
                  </div>
                  <div className="text-sm text-muted-foreground">DNS Found</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">
                    {results.summary.methods.certificate_transparency}
                  </div>
                  <div className="text-sm text-muted-foreground">CT Logs</div>
                </div>
              </div>

              {/* Discovery Method Breakdown */}
              <div className="border-t pt-4">
                <h4 className="text-sm font-medium mb-3">Discovery Techniques Used:</h4>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Wifi className="h-4 w-4 text-red-500" />
                      Port Scanning
                    </span>
                    <Badge variant="destructive">{results.summary.methods.port_scanning}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Network className="h-4 w-4 text-green-500" />
                      DNS Enumeration
                    </span>
                    <Badge variant="default">{results.summary.methods.dns_enumeration}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-blue-500" />
                      Certificate Transparency
                    </span>
                    <Badge variant="secondary">{results.summary.methods.certificate_transparency}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Search className="h-4 w-4 text-orange-500" />
                      Wordlist Scanning
                    </span>
                    <Badge variant="outline">{results.summary.methods.wordlist}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-purple-500" />
                      SSL/SAN Analysis
                    </span>
                    <Badge variant="outline">{results.summary.methods.san_analysis}</Badge>
                  </div>
                </div>
              </div>

              {/* Speed Optimization Notice */}
              <div className="border-t pt-4 mt-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <Clock className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-medium text-blue-900">Speed-Optimized Scan</h4>
                      <p className="text-sm text-blue-700 mt-1">
                        This scan is optimized for speed and completes in under 10 seconds. SSL certificate validation is skipped to ensure rapid results. For detailed SSL analysis, use the full security scan(Coming Soon).
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Subdomains List */}
          {results.subdomains.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Discovered Subdomains ({results.subdomains.length})</CardTitle>
                <CardDescription>
                  Live subdomains found through rapid reconnaissance techniques
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {results.subdomains.map((subdomain, index) => {
                    const methodBadge = getMethodBadge(subdomain.method);
                    return (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-secondary/50 transition-colors"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <Globe className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{subdomain.subdomain}</span>
                            
                            {/* Active Badge */}
                            <Badge variant="default">
                              <CheckCircle className="mr-1 h-3 w-3" />
                              Active
                            </Badge>

                            {/* Discovery Method Badge */}
                            <Badge 
                              variant={methodBadge.variant}
                              title={methodBadge.tooltip}
                            >
                              {methodBadge.icon}
                              {methodBadge.text}
                            </Badge>
                          </div>
                          {subdomain.ip && (
                            <div className="text-sm text-muted-foreground mt-1 ml-7">
                              IP: {subdomain.ip}
                            </div>
                          )}
                          {subdomain.error && (
                            <div className="text-sm text-orange-600 mt-1 ml-7">
                              {subdomain.error}
                            </div>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => copyToClipboard(subdomain.subdomain, subdomain.subdomain)}
                          >
                            {copied === subdomain.subdomain ? (
                              <CheckCircle className="h-4 w-4" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            asChild
                          >
                            <a 
                              href={`https://${subdomain.subdomain}`} 
                              target="_blank" 
                              rel="noopener noreferrer"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          </Button>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="text-center py-8">
                <XCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No Active Subdomains Found</h3>
                <p className="text-muted-foreground">
                  No active subdomains were discovered for {results.domain} using rapid scanning techniques
                </p>
              </CardContent>
            </Card>
          )}
        </motion.div>
      )}

      {/* Paywall Modal */}
      {userProfile && (
        <PaywallModal
          isOpen={isPaywallOpen}
          onClose={() => setIsPaywallOpen(false)}
          onUpgrade={handleUpgrade}
        />
      )}
    </div>
  )
} 