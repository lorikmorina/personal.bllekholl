import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { ipUsageMap, authenticatedUsageMap, FREE_SCAN_LIMIT, AUTHENTICATED_SCAN_LIMIT } from '../middleware';

export async function GET(request: Request) {
  // Extract IP address from headers
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown';
  
  const cookieStore = cookies();
  const authToken = cookieStore.get('auth-token')?.value;
  const isAuthenticated = !!authToken;
  const userId = authToken || ip;
  
  const usageCount = isAuthenticated 
    ? authenticatedUsageMap.get(userId) || 0 
    : ipUsageMap.get(ip) || 0;
  
  const maxAllowedScans = isAuthenticated ? AUTHENTICATED_SCAN_LIMIT : FREE_SCAN_LIMIT;
  const scansRemaining = Math.max(0, maxAllowedScans - usageCount);
  
  return NextResponse.json({
    scansRemaining,
    isAuthenticated,
    totalAllowedScans: maxAllowedScans,
    usedScans: usageCount
  });
} 