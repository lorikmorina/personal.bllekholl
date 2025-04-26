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
          subscription_status: 'active',
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
    
    return NextResponse.json(
      { success: false, error: error.message || 'Webhook processing failed' },
      { status: 500 }
    );
  }
} 