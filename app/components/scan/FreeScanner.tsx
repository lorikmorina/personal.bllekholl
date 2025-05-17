"use client"

import { useState, useRef } from "react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input" 
import { Shield, AlertCircle } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import axios from "axios"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import TurnstileWidget from "@/app/components/TurnstileWidget"
import { useRouter } from "next/navigation"

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
            <><AlertCircle className="mr-2 h-5 w-5 text-red-500" /> Critical Security Risk</>
          ) : severity === 'warning' ? (
            <><AlertCircle className="mr-2 h-5 w-5 text-yellow-500" /> Medium Security Risk</>
          ) : severity === 'low' ? (
            <><AlertCircle className="mr-2 h-5 w-5 text-blue-500" /> Low Security Risk</>
          ) : (
            <><AlertCircle className="mr-2 h-5 w-5 text-green-500" /> Good Security</>
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

export default function FreeScanner() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<any>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
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
    <div className="container mx-auto px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="max-w-3xl mx-auto"
      >
        <h2 className="text-3xl font-bold text-center mb-8">Free Security Scanner</h2>
        <p className="text-muted-foreground text-center mb-10">
          Check your website for common security vulnerabilities. Our free scanner will help you identify potential issues before they become problems.
        </p>
        
        <div className="rounded-lg border border-border bg-card p-6 shadow-md">
          <h3 className="text-xl font-semibold mb-4 flex items-center">
            <Shield className="mr-2 h-6 w-6 text-primary" />
            Security Scanner (Beta)
          </h3>
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
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
          
          <div className="my-6 flex justify-center">
            <TurnstileWidget 
              siteKey={process.env.NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY || ''}
              onSuccess={handleTurnstileSuccess}
              theme="auto"
            />
          </div>

          <p className="text-sm text-muted-foreground mb-4">
            Our free scanner checks for basic vulnerabilities without revealing all details. 
            Sign up for a full account to get complete results and remediation recommendations.
          </p>
          
          <ScanResultCard
            result={scanResult}
            isLoading={isScanning}
            onSignup={handleSignup}
          />
        </div>
      </motion.div>
    </div>
  );
} 