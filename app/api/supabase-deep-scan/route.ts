import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import axios from 'axios';

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

// Function to extract domain from URL
const extractDomain = (url: string): string => {
  try {
    let domain = url.replace(/^https?:\/\//i, '');
    domain = domain.replace(/^www\./i, '');
    domain = domain.split('/')[0].split('?')[0];
    return domain;
  } catch (error) {
    return url;
  }
};

// Function to find Supabase credentials in website
const findSupabaseCredentials = async (domain: string): Promise<{url: string, key: string} | null> => {
  try {
    console.log(`Scanning ${domain} for Supabase credentials...`);
    
    // First try to get the main page
    const response = await axios.get(`https://${domain}`, {
      timeout: 5000,
      maxRedirects: 3,
      validateStatus: () => true,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    if (response.status !== 200) {
      throw new Error(`Website returned status ${response.status}`);
    }

    const html = response.data;
    
    // Extract all JavaScript file URLs
    const jsUrls = extractJsUrls(html, `https://${domain}`);
    console.log(`Found ${jsUrls.length} JavaScript files to scan`);
    
    // Also check inline scripts
    const inlineScripts = extractInlineScripts(html);
    
    // Combine all content to search
    const allContent = [html, ...inlineScripts];
    
    // Download and search JS files (limit to prevent timeout)
    const maxFiles = 15;
    const jsFiles = jsUrls.slice(0, maxFiles);
    
    for (const jsUrl of jsFiles) {
      try {
        const jsResponse = await axios.get(jsUrl, {
          timeout: 3000,
          validateStatus: () => true,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        });
        
        if (jsResponse.status === 200) {
          allContent.push(jsResponse.data);
        }
      } catch (error) {
        console.log(`Failed to fetch JS file: ${jsUrl}`);
      }
    }
    
    // Search for Supabase credentials in all content
    for (const content of allContent) {
      const credentials = extractSupabaseCredentials(content);
      if (credentials) {
        console.log(`Found Supabase credentials: ${credentials.url}`);
        return credentials;
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error scanning for Supabase credentials:', error);
    throw new Error(`Failed to scan website: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

// Function to extract JavaScript URLs from HTML
const extractJsUrls = (html: string, baseUrl: string): string[] => {
  const jsUrls: string[] = [];
  const scriptRegex = /<script[^>]*src=["']([^"']+)["'][^>]*>/gi;
  let match;
  
  while ((match = scriptRegex.exec(html)) !== null) {
    let url = match[1];
    
    // Convert relative URLs to absolute
    if (url.startsWith('//')) {
      url = 'https:' + url;
    } else if (url.startsWith('/')) {
      url = baseUrl + url;
    } else if (!url.startsWith('http')) {
      url = baseUrl + '/' + url;
    }
    
    // Only include JS files, skip external CDNs we don't need
    if (url.includes('.js') && !url.includes('analytics') && !url.includes('gtag')) {
      jsUrls.push(url);
    }
  }
  
  return jsUrls;
};

// Function to extract inline scripts
const extractInlineScripts = (html: string): string[] => {
  const scripts: string[] = [];
  const scriptRegex = /<script[^>]*>([\s\S]*?)<\/script>/gi;
  let match;
  
  while ((match = scriptRegex.exec(html)) !== null) {
    const scriptContent = match[1];
    if (scriptContent && scriptContent.trim()) {
      scripts.push(scriptContent);
    }
  }
  
  return scripts;
};

// Function to extract Supabase credentials from content
const extractSupabaseCredentials = (content: string): {url: string, key: string} | null => {
  try {
    // Look for Supabase URL pattern
    const urlPattern = /https:\/\/([a-zA-Z0-9]+)\.supabase\.co/g;
    const urlMatch = urlPattern.exec(content);
    
    if (!urlMatch) return null;
    
    const supabaseUrl = urlMatch[0];
    
    // Look for API key pattern (JWT starting with eyJ)
    const keyPattern = /["']?(eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+)["']?/g;
    const keyMatch = keyPattern.exec(content);
    
    if (!keyMatch) return null;
    
    return {
      url: supabaseUrl,
      key: keyMatch[1]
    };
  } catch (error) {
    return null;
  }
};

// Function to fetch Supabase OpenAPI schema
const fetchSupabaseSchema = async (supabaseUrl: string, apiKey: string): Promise<any> => {
  try {
    console.log(`Fetching OpenAPI schema from ${supabaseUrl}`);
    
    const response = await axios.get(`${supabaseUrl}/rest/v1/`, {
      timeout: 8000,
      headers: {
        'apikey': apiKey,
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'application/openapi+json'
      }
    });
    
    if (response.status !== 200) {
      throw new Error(`Failed to fetch schema: ${response.status}`);
    }
    
    return response.data;
  } catch (error) {
    console.error('Error fetching Supabase schema:', error);
    throw new Error(`Failed to fetch Supabase schema: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

// Function to parse tables from OpenAPI schema
const parseTablesFromSchema = (schema: any): Array<{name: string, columns: any[]}> => {
  const tables: Array<{name: string, columns: any[]}> = [];
  
  try {
    if (!schema.paths) return tables;
    
    // Extract table names from paths
    const tableNames = new Set<string>();
    
    for (const path in schema.paths) {
      // Path format is usually "/{tableName}"
      const pathParts = path.split('/').filter(part => part);
      if (pathParts.length === 1 && !pathParts[0].startsWith('rpc')) {
        tableNames.add(pathParts[0]);
      }
    }
    
    // Get column information from parameters
    for (const tableName of tableNames) {
      const columns: any[] = [];
      const tablePath = `/${tableName}`;
      
      if (schema.paths[tablePath] && schema.paths[tablePath].get) {
        const getParams = schema.paths[tablePath].get.parameters || [];
        
        for (const param of getParams) {
          if (param.$ref && param.$ref.includes(`rowFilter.${tableName}.`)) {
            const columnName = param.$ref.split('.').pop();
            if (columnName) {
              // Try to get more info from definitions/parameters
              let columnType = 'unknown';
              let nullable = true;
              
              if (schema.parameters && schema.parameters[param.$ref.split('/').pop()]) {
                const paramDef = schema.parameters[param.$ref.split('/').pop()];
                columnType = paramDef.type || paramDef.schema?.type || 'unknown';
                nullable = !paramDef.required;
              }
              
              columns.push({
                name: columnName,
                type: columnType,
                nullable,
                description: ''
              });
            }
          }
        }
      }
      
      // If no columns found from parameters, add basic info
      if (columns.length === 0) {
        columns.push({
          name: 'id',
          type: 'unknown',
          nullable: false,
          description: 'Schema details not available'
        });
      }
      
      tables.push({
        name: tableName,
        columns
      });
    }
    
    console.log(`Parsed ${tables.length} tables from schema`);
    return tables;
  } catch (error) {
    console.error('Error parsing schema:', error);
    return tables;
  }
};

// Function to test if table has RLS enabled (is protected)
const testTableRLS = async (supabaseUrl: string, apiKey: string, tableName: string): Promise<{isPublic: boolean, errorMessage?: string}> => {
  try {
    console.log(`Testing RLS for table: ${tableName}`);
    
    // Try to fetch data from the table with just the public key
    const response = await axios.get(`${supabaseUrl}/rest/v1/${tableName}?limit=1`, {
      timeout: 3000,
      validateStatus: () => true, // Don't throw on 4xx/5xx
      headers: {
        'apikey': apiKey,
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'application/json'
      }
    });
    
    // If we get data back (200), the table is public
    if (response.status === 200) {
      const data = response.data;
      // Check if we actually got data
      if (Array.isArray(data) && data.length > 0) {
        return { isPublic: true };
      } else if (Array.isArray(data) && data.length === 0) {
        // Empty array could mean RLS is working or table is just empty
        // We'll consider this protected since no data was exposed
        return { isPublic: false };
      }
    }
    
    // 401 Unauthorized usually means RLS is working
    if (response.status === 401) {
      return { isPublic: false };
    }
    
    // 403 Forbidden also means RLS is working
    if (response.status === 403) {
      return { isPublic: false };
    }
    
    // Other errors
    if (response.status >= 400) {
      return { 
        isPublic: false, 
        errorMessage: `HTTP ${response.status}: ${response.data?.message || 'Unknown error'}` 
      };
    }
    
    // Default to protected if unclear
    return { isPublic: false };
    
  } catch (error) {
    console.error(`Error testing RLS for ${tableName}:`, error);
    return { 
      isPublic: false, 
      errorMessage: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { domain, supabaseUrl: directUrl, supabaseKey: directKey } = body;

    // Authentication checks
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.user) {
      return NextResponse.json({
        error: "unauthorized",
        message: "Authentication required to use SupabaseDeepScan",
        redirectTo: "/signup"
      }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('subscription_plan')
      .eq('id', session.user.id)
      .single();

    if (profileError) {
      return NextResponse.json({
        error: "profile_error",
        message: "Error checking subscription status",
      }, { status: 500 });
    }

    if (!profile || profile.subscription_plan === 'free') {
      return NextResponse.json({
        error: "subscription_required",
        message: "A paid subscription is required to use SupabaseDeepScan",
        redirectTo: "/pricing"
      }, { status: 403 });
    }

    const startTime = Date.now();
    
    let supabaseUrl: string;
    let supabaseKey: string;

    // Get Supabase credentials either from direct input or by scanning website
    if (directUrl && directKey) {
      supabaseUrl = directUrl;
      supabaseKey = directKey;
      console.log('Using direct Supabase credentials');
    } else if (domain) {
      const cleanDomain = extractDomain(domain);
      console.log(`Scanning ${cleanDomain} for Supabase credentials...`);
      
      const credentials = await findSupabaseCredentials(cleanDomain);
      if (!credentials) {
        return NextResponse.json({
          error: "credentials_not_found",
          message: "No Supabase credentials found on the website"
        }, { status: 404 });
      }
      
      supabaseUrl = credentials.url;
      supabaseKey = credentials.key;
    } else {
      return NextResponse.json({
        error: "invalid_input",
        message: "Please provide either a domain to scan or direct Supabase credentials"
      }, { status: 400 });
    }

    // Extract project ID from URL
    const projectIdMatch = supabaseUrl.match(/https:\/\/([a-zA-Z0-9]+)\.supabase\.co/);
    if (!projectIdMatch) {
      return NextResponse.json({
        error: "invalid_url",
        message: "Invalid Supabase URL format"
      }, { status: 400 });
    }
    const projectId = projectIdMatch[1];

    console.log(`Analyzing Supabase project: ${projectId}`);

    // Fetch the OpenAPI schema
    const schema = await fetchSupabaseSchema(supabaseUrl, supabaseKey);
    
    // Parse tables from schema
    const parsedTables = parseTablesFromSchema(schema);
    
    if (parsedTables.length === 0) {
      return NextResponse.json({
        error: "no_tables",
        message: "No tables found in the Supabase project"
      }, { status: 404 });
    }

    // Test RLS for each table (with batching to prevent timeout)
    const tables: TableSchema[] = [];
    const batchSize = 5;
    
    for (let i = 0; i < parsedTables.length; i += batchSize) {
      const batch = parsedTables.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (table) => {
        const rlsTest = await testTableRLS(supabaseUrl, supabaseKey, table.name);
        
        return {
          name: table.name,
          columns: table.columns,
          isPublic: rlsTest.isPublic,
          rlsEnabled: !rlsTest.isPublic,
          errorMessage: rlsTest.errorMessage
        };
      });
      
      const batchResults = await Promise.allSettled(batchPromises);
      
      batchResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          tables.push(result.value);
        } else {
          // Handle failed table analysis
          const failedTable = batch[index];
          tables.push({
            name: failedTable.name,
            columns: failedTable.columns,
            isPublic: false,
            rlsEnabled: false,
            errorMessage: `Analysis failed: ${result.reason}`
          });
        }
      });
      
      // Small delay between batches
      if (i + batchSize < parsedTables.length) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }

    const scanTimeMs = Date.now() - startTime;

    // Calculate summary
    const summary = {
      totalTables: tables.length,
      publicTables: tables.filter(t => t.isPublic).length,
      protectedTables: tables.filter(t => !t.isPublic && !t.errorMessage).length,
      errorTables: tables.filter(t => t.errorMessage).length
    };

    const results: ScanResults = {
      supabaseUrl,
      projectId,
      tables,
      summary,
      scannedAt: new Date().toISOString(),
      scanTimeMs
    };

    console.log(`SupabaseDeepScan completed in ${scanTimeMs}ms. Found ${tables.length} tables, ${summary.publicTables} public.`);

    return NextResponse.json(results);

  } catch (error) {
    console.error('Error in SupabaseDeepScan:', error);
    return NextResponse.json({
      error: "scan_failed",
      message: error instanceof Error ? error.message : "An unknown error occurred"
    }, { status: 500 });
  }
} 