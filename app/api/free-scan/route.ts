import { NextResponse } from 'next/server';
import axios from 'axios';
import { cookies } from 'next/headers';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';

// Define interfaces for type safety
interface LeakItem {
  type: string;
  preview: string;
  details: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'secure';
}

interface RlsVulnerability {
  isRlsVulnerable: boolean;
  vulnerableTables: string[];
}

interface ScanResponse {
  url: string;
  score: number;
  leaks: LeakItem[];
  rlsVulnerability?: RlsVulnerability;
  [key: string]: any; // For any other properties in the scan response
}

interface FreeScanResult {
  url: string;
  securityScore: number;
  hasCriticalIssues: boolean;
  hasMediumIssues: boolean;
  hasLowIssues: boolean;
  hasRlsVulnerability: boolean;
  criticalIssuesCount: number;
  mediumIssuesCount: number;
  lowIssuesCount: number;
  message?: string;
  rlsMessage?: string;
}

// Free version of the scanner that uses the main scanner but limits response details
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { url, turnstileToken } = body;
    
    // Require Turnstile token to prevent bot abuse
    if (!turnstileToken) {
      return NextResponse.json(
        { error: 'Security verification token is required' },
        { status: 400 }
      );
    }
    
    // Verify the Turnstile token before proceeding
    try {
      // Get the server origin from request headers
      const host = request.headers.get('host') || 'localhost:3000';
      const protocol = host.includes('localhost') ? 'http:' : 'https:';
      const origin = `${protocol}//${host}`;
      
      // Verify the token using the verify-turnstile endpoint
      const verifyResponse = await axios.post(`${origin}/api/verify-turnstile`, {
        token: turnstileToken
      });
      
      const verification = verifyResponse.data;
      
      if (!verification.success) {
        return NextResponse.json(
          { error: 'Security verification failed. Please try again.' },
          { status: 403 }
        );
      }
    } catch (error) {
      console.error('Turnstile verification error:', error);
      return NextResponse.json(
        { error: 'Could not verify security token' },
        { status: 403 }
      );
    }
    
    if (!url) {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      );
    }

    // Normalize URL format
    let targetUrl = url;
    if (!targetUrl.startsWith('http')) {
      targetUrl = `https://${targetUrl}`;
    }
    
    try {
      new URL(targetUrl);
    } catch (e) {
      return NextResponse.json(
        { error: 'Invalid URL format' },
        { status: 400 }
      );
    }

    // Get the server origin from request headers
    const host = request.headers.get('host') || 'localhost:3000';
    const protocol = host.includes('localhost') ? 'http:' : 'https:';
    const origin = `${protocol}//${host}`;

    // Create a temporary session for the internal scan
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    
    // Call the main scan API internally - this bypasses the frontend auth check
    try {
      // Use axios to call our own scan endpoint with the URL
      const scanResponse = await axios.post(`${origin}/api/scan`, {
        url: targetUrl,
        _internal_free_scan: true // Special flag to bypass subscription check
      }, {
        headers: {
          'Content-Type': 'application/json',
          // We're making an internal server-side call, so pass any necessary headers
          'Cookie': request.headers.get('cookie') || ''
        }
      });
      
      // Get the full scan results
      const fullScanResults = scanResponse.data as ScanResponse;
      
      // Filter the results to create a limited free version
      const freeScanResults: FreeScanResult = {
        url: fullScanResults.url,
        securityScore: fullScanResults.score,
        hasCriticalIssues: fullScanResults.leaks.some((leak: LeakItem) => 
          leak.severity === 'critical' || leak.severity === 'high'
        ),
        hasMediumIssues: fullScanResults.leaks.some((leak: LeakItem) => 
          leak.severity === 'medium'
        ),
        hasLowIssues: fullScanResults.leaks.some((leak: LeakItem) => 
          leak.severity === 'low'
        ),
        hasRlsVulnerability: fullScanResults.rlsVulnerability?.isRlsVulnerable || false,
        // Count totals by severity but don't include details
        criticalIssuesCount: fullScanResults.leaks.filter((l: LeakItem) => 
          l.severity === 'critical' || l.severity === 'high'
        ).length,
        mediumIssuesCount: fullScanResults.leaks.filter((l: LeakItem) => 
          l.severity === 'medium'
        ).length,
        lowIssuesCount: fullScanResults.leaks.filter((l: LeakItem) => 
          l.severity === 'low'
        ).length
      };

      // Add RLS specific message if relevant
      if (fullScanResults.rlsVulnerability?.isRlsVulnerable) {
        freeScanResults.rlsMessage = `CRITICAL: Your Supabase database has ${fullScanResults.rlsVulnerability.vulnerableTables.length} tables without proper Row Level Security (RLS)! Sign up to see which tables are at risk.`;
      }

      // Create appropriate message based on findings
      let message = "No significant issues detected. Sign up for comprehensive security monitoring.";
      
      if (freeScanResults.hasCriticalIssues) {
        message = `Critical security issues detected! ${freeScanResults.criticalIssuesCount} critical vulnerabilities found. Sign up to see details and fix them.`;
      } else if (freeScanResults.hasMediumIssues) {
        message = `Medium security risks detected. ${freeScanResults.mediumIssuesCount} issues found. Sign up to see details and fix them.`;
      } else if (freeScanResults.hasLowIssues) {
        message = `Minor security concerns found. ${freeScanResults.lowIssuesCount} issues found. Sign up to see details and fix them.`;
      }
      
      freeScanResults.message = message;
      
      return NextResponse.json(freeScanResults);
      
    } catch (error: any) {
      console.error('Error calling main scan API:', error);
      
      // If the main scanner returned a specific error, pass it through
      if (error.response?.data?.error) {
        return NextResponse.json(
          { error: error.response.data.error, message: error.response.data.message },
          { status: error.response.status || 500 }
        );
      }
      
      return NextResponse.json(
        { error: 'Failed to scan website', message: error.message },
        { status: 500 }
      );
    }

  } catch (error: any) {
    console.error('Free scan error:', error);
    return NextResponse.json(
      { error: 'An error occurred during the scan' },
      { status: 500 }
    );
  }
} 