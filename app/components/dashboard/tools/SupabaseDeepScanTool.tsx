"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Loader2, Database, Shield, ShieldAlert, ShieldCheck, AlertTriangle, Info, ExternalLink, Copy, CheckCircle, XCircle, Table, Key, Lock, Unlock, Clock } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useDashboard } from "../DashboardProvider"
import PaywallModal from "../PaywallModal"

interface TableSchema {
  name: string;
  columns: Array<{
    name: string;
    type: string;
    nullable: boolean;
    description?: string;
  }>;
  isPublic: boolean;
  rlsEnabled: boolean;
  errorMessage?: string;
}

interface ScanResults {
  supabaseUrl: string;
  projectId: string;
  tables: TableSchema[];
  summary: {
    totalTables: number;
    publicTables: number;
    protectedTables: number;
    errorTables: number;
  };
  scannedAt: string;
  scanTimeMs: number;
}

export default function SupabaseDeepScanTool() {
  const [domain, setDomain] = useState("")
  const [supabaseUrl, setSupabaseUrl] = useState("")
  const [supabaseKey, setSupabaseKey] = useState("")
  const [inputMode, setInputMode] = useState<'domain' | 'direct'>('domain')
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

  // Validate Supabase credentials
  const validateSupabaseCredentials = (): { valid: boolean; errorMessage?: string } => {
    if (!supabaseUrl.trim() || !supabaseKey.trim()) {
      return { valid: false, errorMessage: 'Please enter both Supabase URL and API key' };
    }

    if (!supabaseUrl.includes('supabase.co')) {
      return { valid: false, errorMessage: 'Please enter a valid Supabase URL' };
    }

    if (!supabaseKey.startsWith('eyJ')) {
      return { valid: false, errorMessage: 'Please enter a valid Supabase public API key (starts with eyJ)' };
    }

    return { valid: true };
  };

  // Handle scan
  const handleScan = async () => {
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

    // Check subscription
    if (userProfile.subscription_plan === 'free') {
      setIsPaywallOpen(true);
      return;
    }

    // Validate inputs based on mode
    if (inputMode === 'domain') {
      const { valid, errorMessage } = validateDomain(domain);
      if (!valid) {
        setError(errorMessage || "Invalid domain format");
        return;
      }
    } else {
      const { valid, errorMessage } = validateSupabaseCredentials();
      if (!valid) {
        setError(errorMessage || "Invalid Supabase credentials");
        return;
      }
    }

    setIsScanning(true);
    setError(null);
    setResults(null);

    try {
      const requestBody = inputMode === 'domain' 
        ? { domain } 
        : { supabaseUrl, supabaseKey };

      const response = await fetch('/api/supabase-deep-scan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.error === 'subscription_required') {
          setIsPaywallOpen(true);
          return;
        }
        throw new Error(data.message || 'Failed to scan Supabase project');
      }

      setResults(data);
    } catch (error: any) {
      setError(error.message || "Failed to scan Supabase project");
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

  // Copy table schema as JSON
  const copyTableSchema = (table: TableSchema) => {
    const tableSchema = {
      name: table.name,
      columns: table.columns,
      isPublic: table.isPublic,
      rlsEnabled: table.rlsEnabled,
      errorMessage: table.errorMessage
    };
    const jsonString = JSON.stringify(tableSchema, null, 2);
    navigator.clipboard.writeText(jsonString);
    setCopied(`table-${table.name}`);
    setTimeout(() => setCopied(""), 2000);
  };

  // Copy entire project schema as JSON
  const copyProjectSchema = () => {
    if (!results) return;
    
    const projectSchema = {
      projectId: results.projectId,
      supabaseUrl: results.supabaseUrl,
      scannedAt: results.scannedAt,
      scanTimeMs: results.scanTimeMs,
      summary: results.summary,
      tables: results.tables.map(table => ({
        name: table.name,
        columns: table.columns,
        isPublic: table.isPublic,
        rlsEnabled: table.rlsEnabled,
        errorMessage: table.errorMessage
      }))
    };
    const jsonString = JSON.stringify(projectSchema, null, 2);
    navigator.clipboard.writeText(jsonString);
    setCopied("project-schema");
    setTimeout(() => setCopied(""), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">SupabaseDeepScan</h1>
        <p className="text-muted-foreground mt-2">
          Analyze Supabase database schemas and test Row Level Security (RLS) policies for potential data exposure
        </p>
      </div>

      {/* Input Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Supabase Security Analysis
          </CardTitle>
          <CardDescription>
            Scan a website for exposed Supabase credentials or directly enter your Supabase details for analysis
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Tabs value={inputMode} onValueChange={(value) => setInputMode(value as 'domain' | 'direct')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="domain">Scan Website</TabsTrigger>
              <TabsTrigger value="direct">Direct Input</TabsTrigger>
            </TabsList>
            
            <TabsContent value="domain" className="space-y-4">
              <div className="flex gap-4">
                <Input
                  placeholder="example.com"
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  className="flex-1"
                  disabled={isScanning}
                />
                <Button 
                  onClick={handleScan}
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
                      <Shield className="mr-2 h-4 w-4" />
                      Analyze
                    </>
                  )}
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                We'll scan the website for exposed Supabase URLs and API keys in JavaScript files
              </p>
            </TabsContent>
            
            <TabsContent value="direct" className="space-y-4">
              <div className="space-y-3">
                <Input
                  placeholder="https://your-project.supabase.co"
                  value={supabaseUrl}
                  onChange={(e) => setSupabaseUrl(e.target.value)}
                  disabled={isScanning}
                />
                <Input
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                  value={supabaseKey}
                  onChange={(e) => setSupabaseKey(e.target.value)}
                  disabled={isScanning}
                  type="password"
                />
                <div className="flex gap-4">
                  <Button 
                    onClick={handleScan}
                    disabled={isScanning || !supabaseUrl.trim() || !supabaseKey.trim()}
                    className="px-6"
                  >
                    {isScanning ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Scanning...
                      </>
                    ) : (
                      <>
                        <Shield className="mr-2 h-4 w-4" />
                        Analyze
                      </>
                    )}
                  </Button>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Enter your Supabase project URL and public API key for direct analysis. No data is stored everything runs dinamically.
              </p>
            </TabsContent>
          </Tabs>

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
          {/* Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Scan Results for {results.projectId}</span>
                <div className="flex items-center gap-2">
                  {results.scanTimeMs && (
                    <Badge variant="secondary" className="ml-2">
                      <Clock className="mr-1 h-3 w-3" />
                      {(results.scanTimeMs / 1000).toFixed(1)}s
                    </Badge>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={copyProjectSchema}
                    className="ml-2"
                  >
                    {copied === "project-schema" ? (
                      <>
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="mr-2 h-4 w-4" />
                        Copy Project Schema
                      </>
                    )}
                  </Button>
                </div>
              </CardTitle>
              <CardDescription>
                Complete schema analysis of {results.summary.totalTables} tables completed in {results.scanTimeMs ? `${(results.scanTimeMs / 1000).toFixed(1)} seconds` : 'under 10 seconds'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {results.summary.totalTables}
                  </div>
                  <div className="text-sm text-muted-foreground">Total Tables</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">
                    {results.summary.publicTables}
                  </div>
                  <div className="text-sm text-muted-foreground">Public Tables</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {results.summary.protectedTables}
                  </div>
                  <div className="text-sm text-muted-foreground">Protected</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">
                    {results.summary.errorTables}
                  </div>
                  <div className="text-sm text-muted-foreground">Errors</div>
                </div>
              </div>

              {/* Security Alert */}
              {results.summary.publicTables > 0 && (
                <Alert variant="destructive" className="mb-4">
                  <ShieldAlert className="h-4 w-4" />
                  <AlertTitle>Security Warning</AlertTitle>
                  <AlertDescription>
                    {results.summary.publicTables} table(s) appear to be publicly accessible without authentication. 
                    If not done so with purpose this could expose sensitive data to unauthorized users.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Tables List */}
          {results.tables.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Database Tables ({results.tables.length})</CardTitle>
                <CardDescription>
                  Schema information and RLS policy analysis for each table
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {results.tables.map((table, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className={`border rounded-lg p-4 ${
                        table.isPublic 
                          ? 'border-yellow-300 bg-yellow-50 dark:bg-yellow-900/20' 
                          : 'border-border hover:bg-secondary/50'
                      } transition-colors`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <Table className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <h3 className="font-medium text-lg">{table.name}</h3>
                            <p className="text-sm text-muted-foreground">
                              {table.columns.length} column(s)
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex gap-2">
                          {table.isPublic ? (
                            <Badge variant="destructive" className="flex items-center gap-1">
                              <Unlock className="h-3 w-3" />
                              Public Access
                            </Badge>
                          ) : (
                            <Badge variant="default" className="flex items-center gap-1">
                              <Lock className="h-3 w-3" />
                              Protected
                            </Badge>
                          )}
                          
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => copyTableSchema(table)}
                            title="Copy table schema as JSON"
                          >
                            {copied === `table-${table.name}` ? (
                              <>
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Copied
                              </>
                            ) : (
                              <>
                                <Copy className="h-4 w-4 mr-1" />
                                Copy Schema
                              </>
                            )}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            asChild
                          >
                            <a 
                              href={`${results.supabaseUrl}/rest/v1/${table.name}?limit=1&apikey=${supabaseKey || ''}`} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              title="Open table endpoint"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          </Button>
                        </div>
                      </div>

                      {/* Warning for public tables */}
                      {table.isPublic && (
                        <Alert className="mb-3 border-yellow-300 bg-yellow-50 dark:bg-yellow-900/20">
                          <AlertTriangle className="h-4 w-4 text-yellow-600" />
                          <AlertDescription className="text-yellow-800 dark:text-yellow-200">
                            This table seems to be public. If you didn't purposefully make it public, make sure to enable RLS and have proper auth policies.
                          </AlertDescription>
                        </Alert>
                      )}

                      {/* Error message */}
                      {table.errorMessage && (
                        <Alert variant="destructive" className="mb-3">
                          <XCircle className="h-4 w-4" />
                          <AlertDescription>{table.errorMessage}</AlertDescription>
                        </Alert>
                      )}

                      {/* Columns */}
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium">Columns:</h4>
                        <div className="grid gap-2">
                          {table.columns.map((column, colIndex) => (
                            <div key={colIndex} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                              <div className="flex items-center gap-2">
                                <Key className="h-3 w-3 text-muted-foreground" />
                                <span className="font-mono text-sm">{column.name}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-xs">
                                  {column.type}
                                </Badge>
                                {!column.nullable && (
                                  <Badge variant="secondary" className="text-xs">
                                    Required
                                  </Badge>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="text-center py-8">
                <XCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No Tables Found</h3>
                <p className="text-muted-foreground">
                  No database tables were discovered in the Supabase project
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