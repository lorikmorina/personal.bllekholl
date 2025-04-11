import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { cookies } from 'next/headers';

// In a production environment, you'd use a database
// For simplicity, we're using in-memory storage here (lost on restart)
export const ipUsageMap = new Map<string, number>();
export const authenticatedUsageMap = new Map<string, number>();

// Maximum scans allowed - set both limits to 2
export const FREE_SCAN_LIMIT = 2;
export const AUTHENTICATED_SCAN_LIMIT = 2;

export async function scanRateLimiter(request: NextRequest) {
  // Get client IP address
  const ip = request.ip || 'unknown';
  
  // Check if user is authenticated
  const cookieStore = cookies();
  const authToken = cookieStore.get('auth-token')?.value;
  const isAuthenticated = !!authToken;
  const userId = authToken || ip;
  
  // Get current usage count
  const usageCount = isAuthenticated 
    ? authenticatedUsageMap.get(userId) || 0 
    : ipUsageMap.get(ip) || 0;
  
  // Check if user has exceeded their limit
  const maxAllowedScans = isAuthenticated ? AUTHENTICATED_SCAN_LIMIT : FREE_SCAN_LIMIT;
  
  if (usageCount >= maxAllowedScans) {
    return NextResponse.json(
      { 
        error: "no_scans_remaining",
        message: "You've reached your scan limit. Please upgrade your plan for more scans."
      },
      { status: 429 }
    );
  }
  
  // Increment usage count
  if (isAuthenticated) {
    authenticatedUsageMap.set(userId, usageCount + 1);
  } else {
    ipUsageMap.set(ip, usageCount + 1);
  }
  
  // Continue with the request
  return null;
} 