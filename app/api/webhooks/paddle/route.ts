import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    console.log('Received Paddle webhook:', payload);

    // In production, you should verify the webhook signature
    // For sandbox/development, we'll skip detailed verification
    
    // Handle transaction completion events
    if (payload.event_type === 'transaction.completed') {
      // Create Supabase client with service role to bypass RLS
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );
      
      // Extract data from the webhook payload
      const customData = payload.data.custom_data;
      if (!customData || !customData.userId || !customData.plan) {
        throw new Error('Missing custom data in webhook payload');
      }
      
      const userId = customData.userId;
      const selectedPlan = customData.plan;
      
      // Get the item from the transaction
      const item = payload.data.items[0];
      if (!item || !item.price) {
        throw new Error('Missing price information in webhook payload');
      }
      
      // Verify the price ID matches what we expect
      const priceId = item.price.id;
      let planType;
      
      // Determine the correct plan based on the price ID
      if (priceId === process.env.NEXT_PUBLIC_PADDLE_YEARLY_PRICE_ID) {
        planType = 'yearly';
      } else if (priceId === process.env.NEXT_PUBLIC_PADDLE_LIFETIME_PRICE_ID) {
        planType = 'lifetime';
      } else {
        throw new Error(`Unknown price ID: ${priceId}`);
      }
      
      // Verify the selected plan matches the price ID
      if (planType !== selectedPlan) {
        console.warn(`Plan mismatch: selected=${selectedPlan}, price=${planType}`);
      }
      
      // Update the user's subscription plan in the database
      const { error, data } = await supabase
        .from('profiles')
        .update({ 
          subscription_plan: planType,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)
        .select();
      
      if (error) {
        console.error('Error updating user subscription:', error);
        throw error;
      }
      
      console.log(`Successfully updated user ${userId} to ${planType} plan. Response:`, data);
      
      return NextResponse.json({ success: true });
    }
    
    // For any other event type, just acknowledge receipt
    return NextResponse.json({ success: true, message: 'Event acknowledged but not processed' });
    
  } catch (error: any) {
    console.error('Webhook error:', error);
    
    // Return 200 status even for errors to prevent Paddle from retrying
    // But include error details in the response
    return NextResponse.json(
      { success: false, error: error.message || 'Webhook processing failed' },
      { status: 200 }
    );
  }
} 