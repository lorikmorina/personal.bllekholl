import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Helper function to interact with Paddle API
async function cancelPaddleSubscription(subscriptionId: string) {
  const paddleApiKey = process.env.PADDLE_API_KEY;
  if (!paddleApiKey) {
    throw new Error('Paddle API key is not configured.');
  }

  const isSandbox = process.env.NEXT_PUBLIC_PADDLE_SANDBOX_MODE === 'true';
  const apiUrl = isSandbox
    ? `https://sandbox-api.paddle.com/subscriptions/${subscriptionId}/cancel`
    : `https://api.paddle.com/subscriptions/${subscriptionId}/cancel`;

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${paddleApiKey}`,
      'Content-Type': 'application/json',
    },
    // Body can be empty to cancel at end of billing period, 
    // or { "effective_from": "immediately" } to cancel now.
    body: JSON.stringify({}), // Cancel at end of billing period by default
  });

  if (!response.ok) {
    const errorData = await response.json();
    console.error('Paddle API Error:', errorData);
    throw new Error(errorData.error?.detail || 'Failed to cancel subscription with Paddle');
  }

  console.log(`Paddle subscription ${subscriptionId} cancellation initiated.`);
  return await response.json();
}

export async function POST(request: Request) {
  try {
    const { userId } = await request.json();
    
    if (!userId) {
      return NextResponse.json(
        { success: false, message: 'User ID is required' },
        { status: 400 }
      );
    }

    // Create Supabase admin client to bypass RLS
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    // 1. Get user's profile including paddle_subscription_id
    const { data: userProfile, error: profileError } = await supabase
      .from('profiles')
      .select('subscription_plan, paddle_subscription_id') // Select the paddle ID
      .eq('id', userId)
      .single();
    
    if (profileError || !userProfile) {
      console.error('Error fetching user profile:', profileError);
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }
    
    // 2. Check if user has a subscription and a Paddle ID
    if (userProfile.subscription_plan !== 'yearly' && userProfile.subscription_plan !== 'monthly') {
      return NextResponse.json(
        { success: false, message: 'No active subscription found to cancel' },
        { status: 400 }
      );
    }
    
    if (!userProfile.paddle_subscription_id) {
      console.warn(`User ${userId} has a paid plan but no paddle_subscription_id.`);
      // Decide how to handle this: error out, or just update DB?
      // For now, let's error out as cancellation requires the ID.
      return NextResponse.json(
        { success: false, message: 'Paddle subscription ID not found. Cannot cancel with provider.' },
        { status: 400 }
      );
    }
    
    // 3. Call Paddle API to cancel the subscription
    try {
      await cancelPaddleSubscription(userProfile.paddle_subscription_id);
    } catch (paddleError: any) {
      console.error('Error cancelling subscription via Paddle API:', paddleError);
      return NextResponse.json(
        { success: false, message: paddleError.message || 'Failed to cancel subscription with Paddle.' },
        { status: 500 } // Internal Server Error or specific Paddle error?
      );
    }
    
    // 4. If Paddle cancellation is successful, update Supabase profile
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        subscription_plan: 'free',
        // Optionally clear paddle_subscription_id or set a status like 'cancelling'
        // paddle_subscription_id: null, 
        subscription_status: 'cancelled', // Add status tracking
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);
    
    if (updateError) {
      console.error('Error updating user profile after Paddle cancellation:', updateError);
      // Even if DB update fails, Paddle cancellation was initiated.
      // Consider logging this for manual review.
      return NextResponse.json(
        { success: false, message: 'Subscription cancelled with Paddle, but failed to update local status.' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: 'Subscription cancellation initiated successfully. Access will be removed at the end of the billing period.'
    });
    
  } catch (error: any) {
    console.error('Error in subscription cancellation endpoint:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
} 