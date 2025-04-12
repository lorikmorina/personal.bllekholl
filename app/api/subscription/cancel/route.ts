import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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
    
    // 1. Get user's subscription plan
    const { data: userProfile, error: profileError } = await supabase
      .from('profiles')
      .select('subscription_plan')
      .eq('id', userId)
      .single();
    
    if (profileError || !userProfile) {
      console.error('Error fetching user profile:', profileError);
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }
    
    // Check if user has a yearly subscription to cancel
    if (userProfile.subscription_plan !== 'yearly') {
      return NextResponse.json(
        { success: false, message: 'No yearly subscription found' },
        { status: 400 }
      );
    }
    
    // Simply update the subscription_plan to free
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        subscription_plan: 'free',
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);
    
    if (updateError) {
      console.error('Error updating user profile:', updateError);
      return NextResponse.json(
        { success: false, message: 'Failed to update subscription status' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'Subscription cancelled successfully. Plan downgraded to free.'
    });
    
  } catch (error) {
    console.error('Error in subscription cancellation:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
} 