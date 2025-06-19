import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createHmac } from 'crypto';

// Function to verify webhook signature
function verifyPaddleWebhook(rawBody: string, signature: string): boolean {
  try {
    // Get the webhook secret from environment variables
    const webhookSecret = process.env.PADDLE_WEBHOOK_SECRET_KEY;
    
    if (!webhookSecret) {
      console.error('PADDLE_WEBHOOK_SECRET_KEY is not set in environment variables');
      return false;
    }
    
    // Parse the signature header
    const parts = signature.split(';');
    
    if (parts.length < 2) {
      console.error('Invalid signature format');
      return false;
    }
    
    // Extract timestamp and signature hash
    const tsString = parts[0];
    const h1String = parts[1];
    
    if (!tsString.startsWith('ts=') || !h1String.startsWith('h1=')) {
      console.error('Invalid signature components');
      return false;
    }
    
    const timestamp = tsString.substring(3);
    const receivedSignature = h1String.substring(3);
    
    // Build the signed payload (timestamp + ':' + rawBody)
    const signedPayload = `${timestamp}:${rawBody}`;
    
    // Compute HMAC using SHA-256
    const computedSignature = createHmac('sha256', webhookSecret)
      .update(signedPayload)
      .digest('hex');
    
    // Compare signatures
    const isValid = computedSignature === receivedSignature;
    
    if (!isValid) {
      console.error('Signature verification failed');
      console.error('Received:', receivedSignature);
      console.error('Computed:', computedSignature);
    }
    
    return isValid;
  } catch (error) {
    console.error('Error verifying webhook signature:', error);
    return false;
  }
}

export async function POST(request: Request) {
  try {
    // Clone the request to get the raw body as text for signature verification
    const clonedRequest = request.clone();
    const rawBody = await clonedRequest.text();
    
    // Get the Paddle-Signature header
    const paddleSignature = request.headers.get('paddle-signature');
    
    if (!paddleSignature) {
      console.error('No Paddle-Signature header present');
      return NextResponse.json({ success: false, error: 'Missing signature header' }, { status: 401 });
    }
    
    // Verify the webhook signature
    const isValid = verifyPaddleWebhook(rawBody, paddleSignature);
    
    if (!isValid) {
      console.error('Invalid webhook signature');
      return NextResponse.json({ success: false, error: 'Invalid signature' }, { status: 401 });
    }
    
    // Signature is valid, now parse the body as JSON
    const payload = JSON.parse(rawBody);
    console.log('Received Paddle webhook:', payload);

    // Create Supabase client with service role to bypass RLS
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Handle transaction completion events
    if (payload.event_type === 'transaction.completed') {
      // Get the item from the transaction
      const item = payload.data.items[0];
      if (!item || !item.price) {
        throw new Error('Missing price information in webhook payload');
      }
      
      const priceId = item.price.id;
      const transactionId = payload.data.id;
      
      // Check if this is a deep scan payment
      if (priceId === process.env.NEXT_PUBLIC_PADDLE_DEEP_SCAN_PRICE_ID) {
        console.log('Processing deep scan payment:', payload);
        
        // Extract custom data containing deep scan request ID
        const customData = payload.data.custom_data;
        if (!customData || !customData.deep_scan_request_id) {
          throw new Error('Missing deep_scan_request_id in webhook payload');
        }
        
        const requestId = customData.deep_scan_request_id;
        
        // Update the deep scan request payment status ONLY
        // Don't trigger scan automatically - user will start it manually
        const { data: updatedRequest, error: updateError } = await supabase
          .from('deep_scan_requests')
          .update({ 
            payment_status: 'completed',
            status: 'ready',  // Changed from 'processing' to 'ready'
            paddle_transaction_id: transactionId
          })
          .eq('id', requestId)
          .select()
          .single();

        if (updateError) {
          console.error('Error updating deep scan request:', updateError);
          return NextResponse.json({ 
            error: 'Failed to update scan request',
            details: updateError.message 
          }, { status: 500 });
        }

        console.log(`✅ Deep scan request ${requestId} payment completed - status set to 'ready'`);

        // Remove the orchestrator trigger - user will start scan manually
        // No automatic scan initiation
        
        return NextResponse.json({ success: true });
      }
      
      // Handle subscription payments (existing logic)
      const customData = payload.data.custom_data;
      if (!customData || !customData.userId || !customData.plan) {
        throw new Error('Missing custom data in webhook payload');
      }
      
      const userId = customData.userId;
      const selectedPlan = customData.plan;
      
      let planType;
      
      // Determine the correct plan based on the price ID
      if (priceId === process.env.NEXT_PUBLIC_PADDLE_YEARLY_PRICE_ID) {
        planType = 'yearly';
      } else if (priceId === process.env.NEXT_PUBLIC_PADDLE_MONTHLY_PRICE_ID) {
        planType = 'monthly';
      } else {
        throw new Error(`Unknown price ID: ${priceId}`);
      }
      
      // Verify the selected plan matches the price ID
      if (planType !== selectedPlan) {
        console.warn(`Plan mismatch: selected=${selectedPlan}, price=${planType}`);
      }
      
      // Extract the subscription ID (if available)
      const subscriptionId = payload.data.subscription_id || null;
      console.log(`Extracted subscription ID: ${subscriptionId} for user ${userId}`);
      
      // Update the user's subscription plan and Paddle ID in the database
      const { error, data } = await supabase
        .from('profiles')
        .update({ 
          subscription_plan: planType,
          paddle_subscription_id: subscriptionId,
          subscription_status: 'active'
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

    // Handle subscription cancellation events (when subscription actually ends)
    if (payload.event_type === 'subscription.canceled') {
      console.log('Processing subscription.canceled event:', payload);
      
      // Extract subscription ID from the payload
      const subscriptionId = payload.data.id;
      if (!subscriptionId) {
        throw new Error('Missing subscription ID in cancellation webhook payload');
      }
      
      // Find the user by their paddle_subscription_id
      const { data: userProfile, error: profileError } = await supabase
        .from('profiles')
        .select('id, subscription_plan, subscription_status')
        .eq('paddle_subscription_id', subscriptionId)
        .single();
      
      if (profileError || !userProfile) {
        console.error('Error finding user profile for cancelled subscription:', profileError);
        throw new Error(`User not found for subscription ID: ${subscriptionId}`);
      }
      
      // Update the user's subscription to free plan
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          subscription_plan: 'free',
          subscription_status: 'canceled'
          // Keep paddle_subscription_id for record keeping
        })
        .eq('id', userProfile.id);
      
      if (updateError) {
        console.error('Error updating user profile after subscription cancellation:', updateError);
        throw updateError;
      }
      
      console.log(`Successfully updated user ${userProfile.id} to free plan after subscription cancellation`);
      
      return NextResponse.json({ success: true });
    }
    
    // For any other event type, just acknowledge receipt
    return NextResponse.json({ success: true, message: 'Event acknowledged but not processed' });
    
  } catch (error: any) {
    console.error('Webhook error:', error);
    
    return NextResponse.json(
      { success: false, error: error.message || 'Webhook processing failed' },
      { status: 500 }
    );
  }
} 