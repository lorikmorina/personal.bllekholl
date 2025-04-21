import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Tables to test - common table names in Supabase applications
const TABLES_TO_TEST = ['profiles', 'users', 'accounts', 'auth', 'customers', 'orders', 'posts', 'comments'];

export async function POST(request: Request) {
  try {
    const { supabaseUrl, supabaseKey } = await request.json();
    
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ 
        error: "missing_parameters", 
        message: "Both supabaseUrl and supabaseKey are required" 
      }, { status: 400 });
    }
    
    // Initialize Supabase client with provided credentials
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Test each table to see if we can retrieve data
    const vulnerableTables = [];
    
    for (const table of TABLES_TO_TEST) {
      try {
        // Try to fetch up to 10 rows from each table
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .limit(10);
        
        // If we get data (and no error), the table might be vulnerable
        if (data && data.length > 0 && !error) {
          vulnerableTables.push({
            table,
            rowCount: data.length,
          });
        }
      } catch (err) {
        // Ignore errors - table might not exist or access might be properly restricted
      }
    }
    
    return NextResponse.json({
      vulnerableTables,
      isRlsVulnerable: vulnerableTables.length > 0,
      message: vulnerableTables.length > 0 
        ? `Found ${vulnerableTables.length} tables without proper RLS protection` 
        : "No RLS vulnerabilities detected"
    });
    
  } catch (error) {
    console.error('Error testing RLS:', error);
    return NextResponse.json({ 
      error: "test_failed", 
      message: error instanceof Error ? error.message : "An unknown error occurred" 
    }, { status: 500 });
  }
} 