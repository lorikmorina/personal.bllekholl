import OpenAI from 'openai';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    // Security: Verify authentication
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error('Unauthorized AI analysis request');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { scanResults } = await request.json();

    if (!scanResults) {
      return NextResponse.json({ error: 'No scan results provided' }, { status: 400 });
    }

    // Security: Validate scan results structure
    if (typeof scanResults !== 'object' || Array.isArray(scanResults)) {
      return NextResponse.json({ error: 'Invalid scan results format' }, { status: 400 });
    }

    // Check if OpenAI API key is available
    if (!process.env.OPENAI_API_KEY) {
      console.error('OPENAI_API_KEY not configured');
      return NextResponse.json({ error: 'AI analysis not available' }, { status: 503 });
    }

    // Prepare the scan results summary for AI analysis (sanitized)
    const scanSummary = {
      security_headers: scanResults.security_headers,
      api_keys_and_leaks: scanResults.api_keys_and_leaks,
      supabase_analysis: scanResults.supabase_analysis,
      subdomain_analysis: scanResults.subdomain_analysis,
      overall_score: scanResults.overall_score
    };

    const prompt = `
You are a cybersecurity expert analyzing website security scan results. Based on the following scan data, provide a concise security assessment and actionable recommendations.

Scan Results:
${JSON.stringify(scanSummary, null, 2)}

IMPORTANT: Respond with ONLY valid JSON. Do not wrap your response in markdown code blocks or add any other text.

Please provide your analysis in the following JSON format:

{
  "severity": "low" | "medium" | "high" | "critical",
  "summary": "Brief overall security status (1-2 sentences)",
  "key_findings": [
    "Finding 1",
    "Finding 2"
  ],
  "recommendations": [
    {
      "priority": "high" | "medium" | "low",
      "issue": "Description of the issue",
      "solution": "How to fix it (2-3 steps max)"
    }
  ]
}

Guidelines:
- If no major security issues are found, set severity to "low" and summary should say "No major security vulnerabilities detected"
- Focus on the most critical issues first
- Keep recommendations practical and actionable
- Limit to maximum 5 recommendations
- For each recommendation, provide specific steps to fix the issue
- Consider API key leaks, database exposures, missing security headers, and subdomain vulnerabilities
- Return ONLY the JSON object, no other text or formatting
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a cybersecurity expert providing concise, actionable security recommendations. Always respond with valid JSON only - no markdown code blocks, no additional text, just the pure JSON object."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 1500,
    });

    const aiResponse = completion.choices[0]?.message?.content;
    
    if (!aiResponse) {
      throw new Error('No response from AI');
    }

    // Parse the AI response as JSON
    let recommendations;
    try {
      // Clean the response - remove markdown code blocks if present
      let cleanedResponse = aiResponse.trim();
      
      // Remove ```json and ``` if present
      if (cleanedResponse.startsWith('```json')) {
        cleanedResponse = cleanedResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (cleanedResponse.startsWith('```')) {
        cleanedResponse = cleanedResponse.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }
      
      recommendations = JSON.parse(cleanedResponse);
      
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON');
      
      // Fallback response
      recommendations = {
        severity: "medium",
        summary: "Security analysis completed. Please review the scan results manually.",
        key_findings: ["AI analysis temporarily unavailable"],
        recommendations: [{
          priority: "medium",
          issue: "Manual review required",
          solution: "Please review the detailed scan results for security issues"
        }]
      };
    }

    return NextResponse.json({ recommendations });

  } catch (error: any) {
    console.error('Error in AI security analysis:', error);
    return NextResponse.json(
      { error: 'Failed to generate AI recommendations' },
      { status: 500 }
    );
  }
} 